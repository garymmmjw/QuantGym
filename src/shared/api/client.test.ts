import { afterEach, describe, expect, it, vi } from "vitest";

import { API_REQUEST_TIMEOUT_MS, apiRequest } from "./client";
import { forgetCsrfToken, readCsrfToken, rememberCsrfToken } from "./csrf";
import type { ApiError } from "./errors";

afterEach(() => {
  forgetCsrfToken();
  vi.useRealTimers();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

describe("apiRequest", () => {
  it("uses the fixed same-origin V2 base with credentialed no-store requests", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: "ok" }),
      { status: 200, headers: { "content-type": "application/json" } },
    ));
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest<{ status: string }>("/health?detail=1")).resolves.toEqual({ status: "ok" });
    expect(fetchMock).toHaveBeenCalledOnce();
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("/api/v2/health?detail=1");
    expect(init.credentials).toBe("include");
    expect(init.cache).toBe("no-store");
    expect(init.redirect).toBe("manual");
  });

  it("aborts a pending API request with a fixed timeout error", async () => {
    vi.useFakeTimers();
    const captured: { signal?: AbortSignal } = {};
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!(signal instanceof AbortSignal)) {
          reject(new Error("TEST_REQUEST_SIGNAL_REQUIRED"));
          return;
        }
        captured.signal = signal;
        const rejectAborted = () => reject(signal.reason);
        if (signal.aborted) rejectAborted();
        else signal.addEventListener("abort", rejectAborted, { once: true });
      })
    )));

    const request = apiRequest("/health");
    const assertion = expect(request).rejects.toMatchObject({
      message: "API request timed out.",
      name: "TimeoutError",
    });
    await vi.advanceTimersByTimeAsync(API_REQUEST_TIMEOUT_MS);
    await assertion;

    expect(captured.signal).toMatchObject({ aborted: true });
    expect(captured.signal?.reason).toMatchObject({
      message: "API request timed out.",
      name: "TimeoutError",
    });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("forwards an earlier caller abort reason through the internal signal", async () => {
    vi.useFakeTimers();
    const caller = new AbortController();
    const callerReason = new DOMException("Caller stopped the request.", "AbortError");
    caller.abort(callerReason);
    const captured: { signal?: AbortSignal } = {};
    vi.stubGlobal("fetch", vi.fn((_input: RequestInfo | URL, init?: RequestInit) => (
      new Promise<Response>((_resolve, reject) => {
        const signal = init?.signal;
        if (!(signal instanceof AbortSignal)) {
          reject(new Error("TEST_REQUEST_SIGNAL_REQUIRED"));
          return;
        }
        captured.signal = signal;
        if (signal.aborted) reject(signal.reason);
        else signal.addEventListener("abort", () => reject(signal.reason), { once: true });
      })
    )));

    await expect(apiRequest("/health", { signal: caller.signal })).rejects.toBe(callerReason);
    expect(captured.signal?.reason).toBe(callerReason);
    expect(vi.getTimerCount()).toBe(0);
  });

  it("clears the timeout after a successful response", async () => {
    vi.useFakeTimers();
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(
      JSON.stringify({ status: "ok" }),
      { status: 200, headers: { "content-type": "application/json" } },
    )));

    await expect(apiRequest<{ status: string }>("/health"))
      .resolves.toEqual({ status: "ok" });
    expect(vi.getTimerCount()).toBe(0);
  });

  it("overwrites CSRF and removes caller-supplied secret and forwarding headers", async () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      "__Host-qg_session=do-not-read; __Host-qg_csrf=0123456789abcdef0123456789abcdef",
    );
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest<null>("/preferences", {
      method: "PATCH",
      body: { theme: "dark" },
      headers: {
        Authorization: "Bearer forbidden",
        Cookie: "forbidden=1",
        Forwarded: "for=attacker",
        "X-CSRF-Token": "attacker",
        "X-Forwarded-For": "203.0.113.1",
        "X-QuantGym-Edge-Token": "attacker",
      },
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    const headers = new Headers(init.headers);
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("cookie")).toBeNull();
    expect(headers.get("forwarded")).toBeNull();
    expect(headers.get("x-forwarded-for")).toBeNull();
    expect(headers.get("x-quantgym-edge-token")).toBeNull();
    expect(headers.get("x-csrf-token")).toBe("0123456789abcdef0123456789abcdef");
    expect(headers.get("content-type")).toBe("application/json");
    expect(init.body).toBe(JSON.stringify({ theme: "dark" }));
  });

  it("keeps a captured session proof when the live CSRF cookie changes later", async () => {
    let cookieHeader = "__Host-qg_csrf=old-session-proof-0123456789abcdef";
    vi.spyOn(document, "cookie", "get").mockImplementation(() => cookieHeader);
    const capturedProof = readCsrfToken();
    cookieHeader = "__Host-qg_csrf=new-session-proof-0123456789abcdef";
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 204 }));
    vi.stubGlobal("fetch", fetchMock);

    await apiRequest<null>("/preferences", {
      body: { theme: "dark" },
      csrfProof: capturedProof,
      method: "PATCH",
    });

    const [, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(new Headers(init.headers).get("x-csrf-token"))
      .toBe("old-session-proof-0123456789abcdef");
  });

  it("fails closed when a mutation has no exact CSRF cookie", async () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue("__Host-qg_session=session-only");
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/preferences", {
      method: "PATCH",
      headers: { "X-CSRF-Token": "caller-controlled-token" },
    })).rejects.toThrow("CSRF_TOKEN_REQUIRED");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects an invalid controlled CSRF proof before network access", async () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest("/preferences", {
      csrfProof: "invalid proof",
      method: "PATCH",
    })).rejects.toThrow("CSRF_TOKEN_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it.each([
    "__Host-qg_csrf=short",
    "__Host-qg_csrf=0123456789abcdef; __Host-qg_csrf=duplicated012345",
    "__Host-qg_csrf=%E0%A4%A",
    "__Host-qg_csrf=0123456789abcdef%0A",
    "__Host-qg_csrf=01234567%20abcdef",
    "__Host-qg_csrf=0123456789abcdef%3Bbad",
    "__Host-qg_csrf=0123456789abcde%C3%A9",
  ])("rejects an invalid exact CSRF cookie: %s", (cookieHeader) => {
    vi.spyOn(document, "cookie", "get").mockReturnValue(cookieHeader);
    expect(() => readCsrfToken()).toThrow("CSRF_COOKIE_INVALID");
  });

  it("uses only explicit in-memory fallback when no document exists", () => {
    rememberCsrfToken("fallback0123456789abcdef");
    vi.stubGlobal("document", undefined);
    expect(readCsrfToken()).toBe("fallback0123456789abcdef");
    expect(() => rememberCsrfToken(" fallback0123456789abcdef")).toThrow("CSRF_TOKEN_INVALID");
  });

  it.each([
    "https://example.com/api/v2/me",
    "//example.com/api/v2/me",
    "/users//me",
    "/users/../admin",
    "/users/%2e%2e/admin",
    "/users/%2fadmin",
    "/users\\admin",
    "/users#admin",
    "/users\nadmin",
  ])("rejects an unsafe API path before network access: %s", async (unsafePath) => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiRequest(unsafePath)).rejects.toThrow("API_PATH_INVALID");
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("normalizes API failures into the fixed error type", async () => {
    vi.spyOn(document, "cookie", "get").mockReturnValue(
      "__Host-qg_csrf=0123456789abcdef0123456789abcdef",
    );
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(JSON.stringify({
      code: "PREFERENCE_CONFLICT",
      message: "设置已在其他设备更新。",
      fieldErrors: { version: ["版本已过期"] },
      requestId: "req_123",
      retryable: false,
    }), {
      status: 409,
      headers: { "content-type": "application/json" },
    })));

    const request = apiRequest("/preferences", { method: "PATCH", body: { theme: "dark" } });
    await expect(request).rejects.toMatchObject({
      name: "ApiError",
      code: "PREFERENCE_CONFLICT",
      fieldErrors: { version: ["版本已过期"] },
      requestId: "req_123",
      retryable: false,
      status: 409,
    } satisfies Partial<ApiError>);
  });

  it.each([200, 502])(
    "normalizes malformed JSON responses with status %i without leaking parser errors",
    async (status) => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{bad json", {
      status,
      headers: {
        "content-type": "application/json",
        "x-request-id": "req_invalid_json",
      },
    })));

    const request = apiRequest("/health");
    await expect(request).rejects.toMatchObject({
      name: "ApiError",
      code: "API_RESPONSE_INVALID",
      requestId: "req_invalid_json",
      status,
    } satisfies Partial<ApiError>);
    await expect(request).rejects.not.toBeInstanceOf(SyntaxError);
    },
  );
});
