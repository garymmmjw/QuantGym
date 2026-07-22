import { forgetCsrfToken, readCsrfToken } from "../../../shared/api/csrf";
import { ApiError } from "../../../shared/api/errors";
import { authQueryKeys, getCurrentUser, issuePreAuthCsrf } from "./auth.queries";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

afterEach(() => {
  forgetCsrfToken();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

describe("auth queries", () => {
  it("exposes a stable current-user key and generated response type", async () => {
    const user = {
      displayName: "Gary",
      email: "gary@example.com",
      emailVerified: true,
      preferences: { language: "zh-CN", theme: "dark", version: 1 },
    } as const;
    apiRequestMock.mockResolvedValueOnce(user);

    await expect(getCurrentUser()).resolves.toEqual(user);
    expect(authQueryKeys.me).toEqual(["auth", "me"]);
    expect(apiRequestMock).toHaveBeenCalledWith("/me", { signal: expect.anything() });
  });

  it("models an absent session as signed out instead of a failed query", async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError({
      code: "AUTH_SESSION_REQUIRED",
      message: "请先登录。",
      requestId: "req_signed_out",
      status: 401,
    }));

    await expect(getCurrentUser()).resolves.toBeNull();
  });

  it("keeps unexpected authorization failures visible to the recovery layer", async () => {
    const error = new ApiError({
      code: "AUTH_ACCOUNT_LOCKED",
      message: "账户暂时不可用。",
      requestId: "req_locked",
      status: 401,
    });
    apiRequestMock.mockRejectedValueOnce(error);

    await expect(getCurrentUser()).rejects.toBe(error);
  });

  it("forwards query cancellation to the current-user request", async () => {
    const controller = new AbortController();
    let requestSignal: AbortSignal | undefined;
    apiRequestMock.mockImplementationOnce((_path, options: { signal: AbortSignal }) => {
      requestSignal = options.signal;
      return new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      });
    });

    const request = getCurrentUser(controller.signal);
    controller.abort(new DOMException("cancelled", "AbortError"));

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
    expect(requestSignal?.aborted).toBe(true);
  });

  it("times out a half-open current-user request so authentication remains available", async () => {
    vi.useFakeTimers();
    apiRequestMock.mockImplementationOnce((_path, options: { signal: AbortSignal }) => (
      new Promise((_resolve, reject) => {
        options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
      })
    ));

    const request = getCurrentUser();
    const rejected = expect(request).rejects.toMatchObject({ name: "TimeoutError" });
    await vi.advanceTimersByTimeAsync(7_000);

    await rejected;
  });

  it("remembers only the freshly issued pre-auth CSRF value in memory", async () => {
    apiRequestMock.mockResolvedValueOnce({ csrfToken: "c".repeat(43) });
    vi.stubGlobal("document", undefined);

    await expect(issuePreAuthCsrf()).resolves.toEqual({ csrfToken: "c".repeat(43) });
    expect(apiRequestMock).toHaveBeenCalledWith("/auth/csrf");
    expect(readCsrfToken()).toBe("c".repeat(43));
  });
});
