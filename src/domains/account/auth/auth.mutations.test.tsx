import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook } from "@testing-library/react";
import type { ReactNode } from "react";

import { ApiError } from "../../../shared/api/errors";
import { forgetCsrfToken } from "../../../shared/api/csrf";
import {
  AuthMutationError,
  classifyAuthError,
  useForgotPasswordMutation,
  useLoginMutation,
  useLogoutMutation,
  useRegisterMutation,
  useResetPasswordMutation,
} from "./auth.mutations";
import { authQueryKeys } from "./auth.queries";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

const csrfResponse = { csrfToken: "c".repeat(43) } as const;
const user = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: { language: "zh-CN", theme: "light", version: 1 },
} as const;
const authResponse = { user } as const;
const statusResponse = { status: "ok" } as const;
const sessionCsrfProof = "session-proof-0123456789abcdef";

const createHarness = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
  return { queryClient, wrapper };
};

const expectCsrfThenPost = (path: string, body: unknown) => {
  expect(apiRequestMock).toHaveBeenCalledTimes(2);
  expect(apiRequestMock).toHaveBeenNthCalledWith(1, "/auth/csrf");
  expect(apiRequestMock).toHaveBeenNthCalledWith(2, path, { method: "POST", body });
};

afterEach(() => {
  forgetCsrfToken();
  vi.restoreAllMocks();
});

describe("auth mutations", () => {
  it("issues one CSRF challenge before login without preempting the page success state", async () => {
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    apiRequestMock.mockResolvedValueOnce(csrfResponse).mockResolvedValueOnce(authResponse);
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(() => useLoginMutation(), { wrapper });
    const input = { email: "gary@example.com", password: "secret" };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toEqual(authResponse);
    });

    expectCsrfThenPost("/auth/login", input);
    expect(queryClient.getQueryData(authQueryKeys.me)).toBeUndefined();
    expect(storageWrite).not.toHaveBeenCalled();
  });

  it("issues one CSRF challenge before registration without preempting page orchestration", async () => {
    apiRequestMock.mockResolvedValueOnce(csrfResponse).mockResolvedValueOnce(authResponse);
    const { queryClient, wrapper } = createHarness();
    const { result } = renderHook(() => useRegisterMutation(), { wrapper });
    const input = {
      displayName: "Gary",
      email: "gary@example.com",
      password: "long-password",
    };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toEqual(authResponse);
    });

    expectCsrfThenPost("/auth/register", input);
    expect(queryClient.getQueryData(authQueryKeys.me)).toBeUndefined();
  });

  it("issues one CSRF challenge before requesting password recovery", async () => {
    apiRequestMock.mockResolvedValueOnce(csrfResponse).mockResolvedValueOnce(statusResponse);
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useForgotPasswordMutation(), { wrapper });
    const input = { email: "gary@example.com" };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toEqual(statusResponse);
    });

    expectCsrfThenPost("/auth/password/forgot", input);
  });

  it("issues one CSRF challenge before consuming a password-reset token", async () => {
    apiRequestMock.mockResolvedValueOnce(csrfResponse).mockResolvedValueOnce(statusResponse);
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useResetPasswordMutation(), { wrapper });
    const input = { token: "t".repeat(32), password: "long-password" };

    await act(async () => {
      await expect(result.current.mutateAsync(input)).resolves.toEqual(statusResponse);
    });

    expectCsrfThenPost("/auth/password/reset", input);
  });

  it("never automatically replays a side-effecting request", async () => {
    apiRequestMock
      .mockResolvedValueOnce(csrfResponse)
      .mockRejectedValueOnce(new ApiError({
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "暂时不可用",
        requestId: "req_503",
        retryable: true,
        status: 503,
      }));
    const { wrapper } = createHarness();
    const { result } = renderHook(() => useLoginMutation(), { wrapper });

    await act(async () => {
      await expect(result.current.mutateAsync({
        email: "gary@example.com",
        password: "secret",
      })).rejects.toMatchObject({ kind: "retryable" });
    });

    expect(apiRequestMock).toHaveBeenCalledTimes(2);
  });

  it("revokes the authenticated session without issuing a pre-auth challenge", async () => {
    apiRequestMock.mockResolvedValueOnce(statusResponse);
    const { wrapper } = createHarness();
    const { result } = renderHook(
      () => useLogoutMutation(sessionCsrfProof),
      { wrapper },
    );

    await act(async () => {
      await expect(result.current.mutateAsync()).resolves.toEqual(statusResponse);
    });

    expect(apiRequestMock).toHaveBeenCalledTimes(1);
    expect(apiRequestMock).toHaveBeenCalledWith("/auth/logout", {
      csrfProof: sessionCsrfProof,
      method: "POST",
    });
  });
});

describe("classifyAuthError", () => {
  const phase1AuthRecoveryGates = [
    "auth.sign-in",
    "auth.register",
    "auth.reset-password",
    "auth.google-sign-in",
  ].flatMap((operation) => [
    {
      error: new ApiError({
        code: "AUTH_SERVICE_UNAVAILABLE",
        message: "请求失败",
        requestId: "req_recoverable",
        retryable: true,
        status: 503,
      }),
      expectedKind: "retryable",
      expectedAction: "retry",
      gateId: `mutation:${operation}:recoverable-error`,
    },
    {
      error: new ApiError({
        code: "AUTH_REQUEST_INVALID",
        message: "请求失败",
        requestId: "req_invalid",
        status: 422,
      }),
      expectedKind: "invalid",
      expectedAction: "correct-input",
      gateId: `mutation:${operation}:non-recoverable-error`,
    },
    {
      error: new TypeError("Failed to fetch"),
      expectedKind: "offline",
      expectedAction: "retry",
      gateId: `mutation:${operation}:offline-draft`,
    },
    {
      error: new ApiError({
        code: "CSRF_ORIGIN_INVALID",
        message: "请求失败",
        requestId: "req_permission",
        status: 403,
      }),
      expectedKind: "permission",
      expectedAction: "refresh-permission",
      gateId: `mutation:${operation}:permission-denied`,
    },
    {
      error: new ApiError({
        code: "STALE_VERSION",
        message: "请求失败",
        requestId: "req_conflict",
        status: 409,
      }),
      expectedKind: "conflict",
      expectedAction: "reload-current",
      gateId: `mutation:${operation}:stale-version-conflict`,
    },
    {
      error: new ApiError({
        code: "AUTH_RETRY_REQUIRED",
        message: "请求失败",
        requestId: "req_retry",
        retryable: true,
        status: 503,
      }),
      expectedKind: "retryable",
      expectedAction: "retry",
      gateId: `mutation:${operation}:retry`,
    },
  ]);

  it.each(phase1AuthRecoveryGates)(
    "$gateId maps to the approved recovery action",
    ({ error, expectedAction, expectedKind }) => {
      expect(classifyAuthError(error)).toMatchObject({
        kind: expectedKind,
        recoveryAction: expectedAction,
      });
    },
  );

  it("preserves programmatic field errors as a non-recoverable invalid result", () => {
    const result = classifyAuthError(new ApiError({
      code: "VALIDATION_ERROR",
      fieldErrors: { email: ["请输入有效邮箱"] },
      message: "请求参数无效",
      requestId: "req_fields",
      status: 422,
    }));

    expect(result).toBeInstanceOf(AuthMutationError);
    expect(result).toMatchObject({
      kind: "invalid",
      fieldErrors: { email: ["请输入有效邮箱"] },
      isRecoverable: false,
      preserveDraft: false,
    });
  });

  it.each([
    [403, "CSRF_ORIGIN_INVALID", false, "permission"],
    [409, "STALE_VERSION", false, "conflict"],
    [429, "AUTH_RATE_LIMITED", true, "rate"],
    [503, "AUTH_SERVICE_UNAVAILABLE", false, "retryable"],
  ] as const)("maps HTTP %i to %s recovery", (status, code, retryable, kind) => {
    expect(classifyAuthError(new ApiError({
      code,
      message: "请求失败",
      requestId: `req_${status}`,
      retryable,
      status,
    }))).toMatchObject({ kind, isRecoverable: true });
  });

  it("keeps an offline form draft in memory and makes the attempt retryable", () => {
    expect(classifyAuthError(new TypeError("Failed to fetch"))).toMatchObject({
      kind: "offline",
      isRecoverable: true,
      preserveDraft: true,
      retryable: true,
    });
  });
});
