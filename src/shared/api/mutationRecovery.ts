import { ApiError } from "./errors";

export type MutationRecoveryState =
  | "recoverable-error"
  | "non-recoverable-error"
  | "offline-draft"
  | "permission-denied"
  | "stale-version-conflict"
  | "retry";

export type MutationFailure = Readonly<{
  code: string;
  message: string;
  preserveDraft: boolean;
  requestId: string | null;
  retryable: boolean;
  state: Exclude<MutationRecoveryState, "retry">;
}>;

const isNetworkFailure = (error: unknown, online: boolean) => (
  !online
  || (error instanceof TypeError && /fetch|network|load failed/i.test(error.message))
);

export const classifyMutationFailure = (
  error: unknown,
  online = typeof navigator === "undefined" || navigator.onLine !== false,
): MutationFailure => {
  if (isNetworkFailure(error, online)) {
    return {
      code: "NETWORK_OFFLINE",
      message: "网络连接已中断，当前更改已保留为待同步草稿。",
      preserveDraft: true,
      requestId: null,
      retryable: true,
      state: "offline-draft",
    };
  }

  if (error instanceof Error && error.message === "CSRF_TOKEN_REQUIRED") {
    return {
      code: "SESSION_PROOF_REQUIRED",
      message: "当前会话需要重新验证后才能继续。",
      preserveDraft: true,
      requestId: null,
      retryable: false,
      state: "permission-denied",
    };
  }

  if (error instanceof ApiError) {
    const state = error.status === 401 || error.status === 403
      ? "permission-denied"
      : error.retryable || error.status === 429 || error.status >= 500
          ? "recoverable-error"
          : error.status === 409
            ? "stale-version-conflict"
            : "non-recoverable-error";
    return {
      code: error.code,
      message: error.message,
      preserveDraft: state !== "non-recoverable-error",
      requestId: error.requestId,
      retryable: state === "recoverable-error",
      state,
    };
  }

  return {
    code: "MUTATION_FAILED",
    message: "当前操作无法完成，请检查内容后重试。",
    preserveDraft: false,
    requestId: null,
    retryable: false,
    state: "non-recoverable-error",
  };
};

export const createIdempotencyKey = (): string => {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(24);
  if (typeof crypto !== "undefined" && typeof crypto.getRandomValues === "function") {
    crypto.getRandomValues(bytes);
  } else {
    for (let index = 0; index < bytes.length; index += 1) {
      bytes[index] = Math.floor(Math.random() * 256);
    }
  }
  return [...bytes]
    .map((value) => value.toString(16).padStart(2, "0"))
    .join("");
};
