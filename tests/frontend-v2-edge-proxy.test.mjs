import { readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { describe, expect, it, vi } from "vitest";

import {
  EDGE_PROXY_CONFIG,
  onRequest,
  proxyV2Request,
} from "../functions/api/v2/[[path]].ts";
import {
  applyEdgeResponsePolicy,
  EDGE_SECURITY_HEADERS,
  getSetCookieValues,
  onRequest as securityMiddleware,
} from "../functions/api/v2/_middleware.ts";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const previewOrigin = "https://quantgym-v2-preview.pages.dev";
const edgeSecret = "phase-1-preview-edge-secret-000000000000000000000000";
const env = { QUANTGYM_EDGE_SHARED_SECRET: edgeSecret };

const json = async (response) => response.json();
const errorCode = async (response) => (await json(response)).error.code;
const request = (pathAndQuery = "/api/v2/health", init) => (
  new Request(`${previewOrigin}${pathAndQuery}`, init)
);
const okFetch = vi.fn(async () => new Response('{"ok":true}', {
  headers: { "content-type": "application/json" },
}));

const callProxy = (input, fetchImpl = okFetch, runtimeEnv = env) => (
  proxyV2Request(input, runtimeEnv, fetchImpl)
);

const rawUrlRequest = (input, rawUrl) => new Proxy(input, {
  get(target, property) {
    if (property === "url") return rawUrl;
    const value = Reflect.get(target, property, target);
    return typeof value === "function" ? value.bind(target) : value;
  },
});

const streamRequest = (pathAndQuery, body, contentLength) => request(pathAndQuery, {
  method: "POST",
  headers: contentLength === undefined ? {} : { "content-length": String(contentLength) },
  body,
  duplex: "half",
});

const staticHeadersForPath = (source, pathname) => {
  const applied = new Map();
  let activePattern = null;
  for (const line of source.split(/\r?\n/)) {
    if (line.trim() === "") continue;
    if (!/^\s/.test(line)) {
      activePattern = line.trim();
      continue;
    }
    if (activePattern === null) continue;
    const matches = activePattern.endsWith("*")
      ? pathname.startsWith(activePattern.slice(0, -1))
      : pathname === activePattern;
    if (!matches) continue;

    const directive = line.trim();
    if (directive.startsWith("! ")) {
      applied.delete(directive.slice(2).toLowerCase());
      continue;
    }
    const separator = directive.indexOf(":");
    if (separator < 1) continue;
    const name = directive.slice(0, separator).trim().toLowerCase();
    const value = directive.slice(separator + 1).trim();
    applied.set(name, applied.has(name) ? `${applied.get(name)}, ${value}` : value);
  }
  return applied;
};

describe("Phase 1 Pages routing", () => {
  it("invokes Functions only for the exact /api/v2 surface", async () => {
    const routes = JSON.parse(await readFile(path.join(root, "public-v2/_routes.json"), "utf8"));

    expect(routes).toEqual({
      version: 1,
      include: ["/api/v2", "/api/v2/*"],
      exclude: [],
    });
    expect(routes.include).not.toContain("/*");
    expect(routes.include.some((pattern) => pattern.startsWith("/assets"))).toBe(false);
  });

  it("keeps the SPA fallback and static security policy outside the Function graph", async () => {
    const redirects = await readFile(path.join(root, "public-v2/_redirects"), "utf8");
    const headers = await readFile(path.join(root, "public-v2/_headers"), "utf8");

    expect(redirects.trim()).toBe("/* /index.html 200");
    expect(headers).toContain("/*");
    for (const [name, value] of Object.entries(EDGE_SECURITY_HEADERS)) {
      expect(headers.toLowerCase()).toContain(`${name}: ${value}`.toLowerCase());
    }
    expect(headers).toContain("/asset-integrity.json");
    expect(headers).not.toContain("/integrity-manifest.json");

    const documentHeaders = staticHeadersForPath(headers, "/index.html");
    const assetHeaders = staticHeadersForPath(headers, "/assets/app.123.js");
    expect(documentHeaders.get("cache-control")).toBe("no-cache");
    expect(assetHeaders.get("cache-control")).toBe(
      "public, max-age=31536000, immutable",
    );
    expect(assetHeaders.get("content-security-policy")).toBe(
      EDGE_SECURITY_HEADERS["content-security-policy"],
    );
  });
});

describe("Phase 1 edge request boundary", () => {
  it("pins the only upstream and forwards the normalized path and query", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok"));
    const response = await callProxy(request("/api/v2/me?tab=profile&next=%2Fhome"), fetchImpl);

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
    const [target, init] = fetchImpl.mock.calls[0];
    expect(String(target)).toBe(
      "https://quantgym-v2-preview-api.onrender.com/api/v2/me?tab=profile&next=%2Fhome",
    );
    expect(init.redirect).toBe("manual");
    expect(EDGE_PROXY_CONFIG.upstreamOrigin).toBe(
      "https://quantgym-v2-preview-api.onrender.com",
    );
  });

  it.each([
    ["outside the API", "/assets/app.js", "EDGE_ROUTE_NOT_ALLOWED", 404],
    ["prefix collision", "/api/v20/me", "EDGE_ROUTE_NOT_ALLOWED", 404],
    ["suffix collision", "/api/v2evil", "EDGE_ROUTE_NOT_ALLOWED", 404],
    ["repeated slash", "/api/v2//me", "EDGE_PATH_INVALID", 400],
    ["encoded slash", "/api/v2/users%2Fadmin", "EDGE_PATH_INVALID", 400],
    ["double-encoded slash", "/api/v2/users%252Fadmin", "EDGE_PATH_INVALID", 400],
    ["encoded backslash", "/api/v2/users%5Cadmin", "EDGE_PATH_INVALID", 400],
    ["double-encoded traversal", "/api/v2/%252e%252e/admin", "EDGE_PATH_INVALID", 400],
    ["bad percent escape", "/api/v2/%25zz", "EDGE_PATH_INVALID", 400],
    ["encoded control", "/api/v2/users%00admin", "EDGE_PATH_INVALID", 400],
  ])("rejects %s with a stable code", async (_label, candidate, code, status) => {
    const fetchImpl = vi.fn();
    const response = await callProxy(request(candidate), fetchImpl);

    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("rejects an unnormalized raw backslash before constructing the upstream URL", async () => {
    const fetchImpl = vi.fn();
    const ordinary = request("/api/v2/users");
    const response = await callProxy(
      rawUrlRequest(ordinary, `${previewOrigin}/api/v2\\users`),
      fetchImpl,
    );

    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("EDGE_PATH_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it.each([
    ["another host", "https://evil.example/api/v2/me"],
    ["non-default port", `${previewOrigin}:8443/api/v2/me`],
    ["embedded credentials", `https://user:password@quantgym-v2-preview.pages.dev/api/v2/me`],
  ])("rejects %s before calling the fixed upstream", async (_label, rawUrl) => {
    const fetchImpl = vi.fn(async () => new Response("must not be reached"));
    const input = rawUrlRequest(request("/api/v2/me"), rawUrl);
    const response = await callProxy(input, fetchImpl);

    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("EDGE_ORIGIN_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("removes client proof, forwarding, bearer, hop-by-hop, and unrelated cookie headers", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok"));
    const input = request("/api/v2/me", {
      headers: {
        authorization: "Bearer browser-secret",
        "cache-control": "public, max-age=3600",
        "cf-connecting-ip": "203.0.113.17",
        connection: "keep-alive, x-remove-me",
        cookie: [
          "analytics=drop-me",
          "__Host-qg_session=session-value",
          "theme=drop-me-too",
          "__Host-qg_csrf=csrf-value",
        ].join("; "),
        forwarded: "for=evil;host=evil.invalid;proto=http",
        "x-forwarded-for": "198.51.100.99",
        "x-forwarded-host": "evil.invalid",
        "x-forwarded-proto": "http",
        "x-quantgym-edge-token": "client-controlled",
        "x-remove-me": "connection-token-value",
      },
    });

    await callProxy(input, fetchImpl);
    const [, init] = fetchImpl.mock.calls[0];
    const headers = init.headers;

    expect(headers.get("x-quantgym-edge-token")).toBe(edgeSecret);
    expect(headers.get("x-forwarded-for")).toBe("203.0.113.17");
    expect(headers.get("x-forwarded-host")).toBe("quantgym-v2-preview.pages.dev");
    expect(headers.get("x-forwarded-proto")).toBe("https");
    expect(headers.get("cookie")).toBe(
      "__Host-qg_session=session-value; __Host-qg_csrf=csrf-value",
    );
    expect(headers.get("authorization")).toBeNull();
    expect(headers.get("cf-connecting-ip")).toBeNull();
    expect(headers.get("connection")).toBeNull();
    expect(headers.get("forwarded")).toBeNull();
    expect(headers.get("x-remove-me")).toBeNull();
    expect(headers.get("cache-control")).toBe("no-store");
  });

  it("omits Cookie when neither approved host cookie is present", async () => {
    const fetchImpl = vi.fn(async () => new Response("ok"));
    await callProxy(request("/api/v2/me", { headers: { cookie: "theme=dark; a=b" } }), fetchImpl);

    expect(fetchImpl.mock.calls[0][1].headers.has("cookie")).toBe(false);
  });

  it("rejects duplicate approved cookies instead of creating ambiguous authentication", async () => {
    const fetchImpl = vi.fn();
    const response = await callProxy(request("/api/v2/me", {
      headers: { cookie: "__Host-qg_session=one; __Host-qg_session=two" },
    }), fetchImpl);

    expect(response.status).toBe(400);
    expect(await errorCode(response)).toBe("EDGE_COOKIE_INVALID");
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("fails closed when the Pages edge secret is missing or malformed", async () => {
    for (const runtimeEnv of [
      {},
      { QUANTGYM_EDGE_SHARED_SECRET: "too-short" },
      { QUANTGYM_EDGE_SHARED_SECRET: `${"x".repeat(31)}\n` },
    ]) {
      const fetchImpl = vi.fn();
      const response = await callProxy(request(), fetchImpl, runtimeEnv);
      expect(response.status).toBe(503);
      expect(await errorCode(response)).toBe("EDGE_CONFIG_INVALID");
      expect(fetchImpl).not.toHaveBeenCalled();
    }
  });
});

describe("Phase 1 edge method and streaming body limits", () => {
  it("allows only the explicit HTTP method set", async () => {
    const response = await callProxy(request("/api/v2/me", { method: "PROPFIND" }), vi.fn());

    expect(response.status).toBe(405);
    expect(response.headers.get("allow")).toBe("GET, HEAD, OPTIONS, POST, PUT, PATCH, DELETE");
    expect(await errorCode(response)).toBe("EDGE_METHOD_NOT_ALLOWED");
  });

  it("requires a trustworthy Content-Length for a streamed request body", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); } });
    const response = await callProxy(streamRequest("/api/v2/todos", body), vi.fn());

    expect(response.status).toBe(411);
    expect(await errorCode(response)).toBe("EDGE_LENGTH_REQUIRED");
  });

  it("normalizes Cloudflare's zero-length POST stream as a bodyless request", async () => {
    const body = new ReadableStream({ start(controller) { controller.close(); } });
    const input = streamRequest("/api/v2/auth/logout", body, 0);
    const fetchImpl = vi.fn(async (_target, init) => {
      expect(init.body).toBeUndefined();
      expect(init.headers.get("content-length")).toBe("0");
      return new Response('{"status":"ok"}', {
        headers: { "content-type": "application/json" },
      });
    });

    const response = await callProxy(input, fetchImpl);

    expect(response.status).toBe(200);
    expect(fetchImpl).toHaveBeenCalledOnce();
  });

  it.each([
    ["nonnumeric", "1, 2", 400, "EDGE_CONTENT_LENGTH_INVALID"],
    ["too large", String(EDGE_PROXY_CONFIG.maxRequestBodyBytes + 1), 413, "EDGE_BODY_TOO_LARGE"],
  ])("rejects a %s Content-Length", async (_label, contentLength, status, code) => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); } });
    const input = streamRequest("/api/v2/todos", body, 1);
    input.headers.set("content-length", contentLength);
    const response = await callProxy(input, vi.fn());

    expect(response.status).toBe(status);
    expect(await errorCode(response)).toBe(code);
  });

  it("rejects encoded bodies because their expanded size cannot be proven at the edge", async () => {
    const body = new ReadableStream({ start(controller) { controller.enqueue(new Uint8Array([1])); } });
    const input = streamRequest("/api/v2/todos", body, 1);
    input.headers.set("content-encoding", "gzip");
    const response = await callProxy(input, vi.fn());

    expect(response.status).toBe(415);
    expect(await errorCode(response)).toBe("EDGE_CONTENT_ENCODING_UNSUPPORTED");
  });

  it("passes the original request stream to fetch without reading or buffering it", async () => {
    const body = new ReadableStream({
      pull(controller) {
        controller.enqueue(new TextEncoder().encode("payload"));
        controller.close();
      },
    });
    const input = streamRequest("/api/v2/todos", body, 7);
    const originalBody = input.body;
    const arrayBufferSpy = vi.spyOn(input, "arrayBuffer");
    const blobSpy = vi.spyOn(input, "blob");
    const formDataSpy = vi.spyOn(input, "formData");
    const jsonSpy = vi.spyOn(input, "json");
    const textSpy = vi.spyOn(input, "text");
    const fetchImpl = vi.fn(async (_target, init) => {
      expect(init.body).toBe(originalBody);
      return new Response("ok");
    });

    const response = await callProxy(input, fetchImpl);
    expect(response.status).toBe(200);
    expect(arrayBufferSpy).not.toHaveBeenCalled();
    expect(blobSpy).not.toHaveBeenCalled();
    expect(formDataSpy).not.toHaveBeenCalled();
    expect(jsonSpy).not.toHaveBeenCalled();
    expect(textSpy).not.toHaveBeenCalled();
  });
});

describe("Phase 1 edge response boundary", () => {
  it("streams the upstream response and applies no-store plus the security policy", async () => {
    let responsePulls = 0;
    const upstreamBody = new ReadableStream({
      pull(controller) {
        responsePulls += 1;
        controller.enqueue(new TextEncoder().encode(["stream", "e", "d"][responsePulls - 1]));
        if (responsePulls === 3) controller.close();
      },
    });
    const fetchImpl = vi.fn(async () => new Response(upstreamBody, {
      headers: {
        connection: "keep-alive, x-upstream-hop",
        "x-upstream-hop": "remove",
        "x-powered-by": "Render",
      },
    }));

    const response = await callProxy(request(), fetchImpl);
    expect(responsePulls).toBeLessThan(3);
    expect(response.headers.get("connection")).toBeNull();
    expect(response.headers.get("x-upstream-hop")).toBeNull();
    expect(response.headers.get("x-powered-by")).toBeNull();
    expect(response.headers.get("cache-control")).toBe("no-store");
    for (const [name, value] of Object.entries(EDGE_SECURITY_HEADERS)) {
      expect(response.headers.get(name)).toBe(value);
    }
    expect(await response.text()).toBe("streamed");
    expect(responsePulls).toBe(3);
  });

  it("preserves the callback's stronger no-referrer policy", async () => {
    const response = await callProxy(
      request("/api/v2/auth/google/callback?code=secret&state=secret"),
      vi.fn(async () => new Response("failure", {
        status: 400,
        headers: { "referrer-policy": "no-referrer" },
      })),
    );

    expect(response.status).toBe(400);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each([
    [
      "upstream failure",
      vi.fn(async () => { throw new Error("provider unavailable"); }),
      "EDGE_UPSTREAM_UNAVAILABLE",
    ],
    [
      "rejected redirect",
      vi.fn(async () => new Response(null, {
        status: 302,
        headers: { location: "https://evil.example/callback" },
      })),
      "EDGE_UPSTREAM_REDIRECT_REJECTED",
    ],
    [
      "rejected cookie",
      vi.fn(async () => new Response("invalid cookie", {
        headers: { "set-cookie": "other=value; Path=/; Secure; SameSite=Lax" },
      })),
      "EDGE_UPSTREAM_COOKIE_INVALID",
    ],
  ])("forces no-referrer on callback %s", async (_label, fetchImpl, expectedCode) => {
    const response = await callProxy(
      request("/api/v2/auth/google/callback?code=secret&state=secret"),
      fetchImpl,
    );

    expect(await errorCode(response)).toBe(expectedCode);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it("preserves two valid Set-Cookie fields separately and in order", async () => {
    const upstreamHeaders = new Headers();
    const session = "__Host-qg_session=s1; Path=/; Secure; HttpOnly; SameSite=Lax; Max-Age=3600";
    const csrf = "__Host-qg_csrf=c1; Path=/; Secure; SameSite=Lax; Max-Age=3600";
    upstreamHeaders.append("set-cookie", session);
    upstreamHeaders.append("set-cookie", csrf);
    const response = await callProxy(
      request("/api/v2/auth/login"),
      vi.fn(async () => new Response("ok", { headers: upstreamHeaders })),
    );

    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie()).toEqual([session, csrf]);
    expect(response.headers.getSetCookie()).toEqual(
      applyEdgeResponsePolicy(response).headers.getSetCookie(),
    );
  });

  it("preserves multiple cookies on the legacy Cloudflare Headers.getAll surface", () => {
    const session = "__Host-qg_session=s1; Path=/; Secure; HttpOnly; SameSite=Lax";
    const csrf = "__Host-qg_csrf=c1; Path=/; Secure; SameSite=Lax";
    const legacyCloudflareHeaders = new Headers();
    Object.defineProperty(legacyCloudflareHeaders, "getSetCookie", { value: undefined });
    Object.defineProperty(legacyCloudflareHeaders, "getAll", {
      value: vi.fn(() => [session, csrf]),
    });

    expect(getSetCookieValues(legacyCloudflareHeaders)).toEqual([session, csrf]);
  });

  it.each([
    ["unknown cookie", "other=value; Path=/; Secure; SameSite=Lax"],
    ["Domain", "__Host-qg_session=s; Path=/; Domain=example.com; Secure; HttpOnly; SameSite=Lax"],
    ["wrong Path", "__Host-qg_session=s; Path=/api; Secure; HttpOnly; SameSite=Lax"],
    ["missing Secure", "__Host-qg_session=s; Path=/; HttpOnly; SameSite=Lax"],
    ["wrong SameSite", "__Host-qg_session=s; Path=/; Secure; HttpOnly; SameSite=None"],
    ["session missing HttpOnly", "__Host-qg_session=s; Path=/; Secure; SameSite=Lax"],
    ["csrf is HttpOnly", "__Host-qg_csrf=c; Path=/; Secure; HttpOnly; SameSite=Lax"],
    ["csrf has valued HttpOnly", "__Host-qg_csrf=c; Path=/; Secure; HttpOnly=false; SameSite=Lax"],
  ])("rejects an upstream cookie with %s", async (_label, setCookie) => {
    const response = await callProxy(
      request(),
      vi.fn(async () => new Response("upstream body must not leak", {
        headers: { "set-cookie": setCookie },
      })),
    );

    expect(response.status).toBe(502);
    expect(await errorCode(response)).toBe("EDGE_UPSTREAM_COOKIE_INVALID");
    expect(response.headers.get("set-cookie")).toBeNull();
  });

  it.each([
    ["safe application path", "/settings?from=login"],
    ["branded OAuth recovery path", "/login?authError=GOOGLE_OAUTH_FAILED"],
    [
      "exact Google authorization endpoint",
      "https://accounts.google.com/o/oauth2/v2/auth?client_id=preview&response_type=code",
    ],
  ])("passes a %s redirect with manual redirect mode", async (_label, location) => {
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 302,
      headers: { location },
    }));
    const response = await callProxy(request("/api/v2/auth/google/start"), fetchImpl);

    expect(fetchImpl.mock.calls[0][1].redirect).toBe("manual");
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe(location);
  });

  it("preserves the fixed Google callback recovery redirect and referrer policy", async () => {
    const location = "/login?authError=AUTH_SERVICE_UNAVAILABLE";
    const fetchImpl = vi.fn(async () => new Response(null, {
      status: 303,
      headers: {
        location,
        "referrer-policy": "no-referrer",
      },
    }));
    const response = await callProxy(
      request("/api/v2/auth/google/callback?code=secret&state=secret"),
      fetchImpl,
    );

    expect(response.status).toBe(303);
    expect(response.headers.get("location")).toBe(location);
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });

  it.each([
    ["Render", "https://quantgym-v2-preview-api.onrender.com/api/v2/me"],
    ["protocol-relative", "//evil.example/path"],
    ["other external", "https://evil.example/path"],
    ["wrong Google path", "https://accounts.google.com/signin"],
    ["Google URL with fragment", "https://accounts.google.com/o/oauth2/v2/auth#token"],
    ["absolute Pages URL", `${previewOrigin}/settings`],
    ["relative traversal", "/api/v2/%252e%252e/admin"],
  ])("rejects a %s redirect", async (_label, location) => {
    const response = await callProxy(
      request(),
      vi.fn(async () => new Response(null, { status: 302, headers: { location } })),
    );

    expect(response.status).toBe(502);
    expect(await errorCode(response)).toBe("EDGE_UPSTREAM_REDIRECT_REJECTED");
    expect(response.headers.get("location")).toBeNull();
  });

  it("returns a stable secret-safe failure when the upstream fetch fails", async () => {
    const response = await callProxy(
      request(),
      vi.fn(async () => { throw new Error("upstream secret https://internal.invalid/token"); }),
    );

    expect(response.status).toBe(502);
    const body = await response.text();
    expect(JSON.parse(body).error.code).toBe("EDGE_UPSTREAM_UNAVAILABLE");
    expect(body).not.toContain("internal.invalid");
    expect(body).not.toContain("upstream secret");
  });
});

describe("Pages Function exports", () => {
  it("routes the catch-all handler through the tested proxy", async () => {
    const response = await onRequest({
      request: request(),
      env,
      fetch: vi.fn(async () => new Response("ok")),
    });
    expect(response.status).toBe(200);
  });

  it("turns an unexpected downstream exception into a stable hardened response", async () => {
    const response = await securityMiddleware({
      request: request(),
      env,
      next: vi.fn(async () => { throw new Error("do not expose me"); }),
    });

    expect(response.status).toBe(500);
    expect(await errorCode(response)).toBe("EDGE_INTERNAL_FAILURE");
    expect(response.headers.get("cache-control")).toBe("no-store");
  });

  it("forces no-referrer when callback middleware handles an unexpected exception", async () => {
    const response = await securityMiddleware({
      request: request("/api/v2/auth/google/callback?code=secret&state=secret"),
      env,
      next: vi.fn(async () => { throw new Error("do not expose me"); }),
    });

    expect(response.status).toBe(500);
    expect(await errorCode(response)).toBe("EDGE_INTERNAL_FAILURE");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
  });
});
