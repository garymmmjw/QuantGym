import { useMutation } from "@tanstack/react-query";
import { ZodError, type ZodType } from "zod";

import { apiRequest } from "../../../shared/api/client";
import { forgetCsrfToken } from "../../../shared/api/csrf";
import { ApiError } from "../../../shared/api/errors";
import {
  forgotPasswordSchema,
  loginSchema,
  registerSchema,
  resetPasswordSchema,
} from "./auth.schema";
import type {
  AuthResponse,
  ForgotPasswordInput,
  LoginInput,
  RegisterInput,
  ResetPasswordInput,
  StatusResponse,
} from "./auth.schema";
import { issuePreAuthCsrf } from "./auth.queries";

export type AuthMutationErrorKind =
  | "offline"
  | "permission"
  | "conflict"
  | "rate"
  | "retryable"
  | "invalid";

export type AuthRecoveryAction =
  | "retry"
  | "refresh-permission"
  | "reload-current"
  | "wait"
  | "correct-input";

type AuthMutationErrorOptions = Readonly<{
  cause: unknown;
  code: string;
  fieldErrors?: Readonly<Record<string, readonly string[]>>;
  kind: AuthMutationErrorKind;
  message: string;
  requestId?: string | null;
  retryable?: boolean;
  status?: number;
}>;

const recoveryActionFor = (kind: AuthMutationErrorKind): AuthRecoveryAction => {
  switch (kind) {
    case "offline":
    case "retryable":
      return "retry";
    case "permission":
      return "refresh-permission";
    case "conflict":
      return "reload-current";
    case "rate":
      return "wait";
    case "invalid":
      return "correct-input";
  }
};

export class AuthMutationError extends Error {
  public readonly code: string;

  public readonly fieldErrors: Readonly<Record<string, readonly string[]>>;

  public readonly isRecoverable: boolean;

  public readonly kind: AuthMutationErrorKind;

  public readonly preserveDraft: boolean;

  public readonly recoveryAction: AuthRecoveryAction;

  public readonly requestId: string | null;

  public readonly retryable: boolean;

  public readonly status: number;

  public constructor(options: AuthMutationErrorOptions) {
    super(options.message, { cause: options.cause });
    this.name = "AuthMutationError";
    this.code = options.code;
    this.fieldErrors = options.fieldErrors ?? {};
    this.kind = options.kind;
    this.isRecoverable = options.kind !== "invalid";
    this.preserveDraft = options.kind === "offline";
    this.recoveryAction = recoveryActionFor(options.kind);
    this.requestId = options.requestId ?? null;
    this.retryable = options.retryable ?? ["offline", "rate", "retryable"].includes(options.kind);
    this.status = options.status ?? 0;
  }
}

const zodFieldErrors = (error: ZodError): Readonly<Record<string, readonly string[]>> => {
  const fieldErrors: Record<string, string[]> = {};
  for (const issue of error.issues) {
    const firstPathSegment = issue.path[0];
    const field = typeof firstPathSegment === "string" ? firstPathSegment : "request";
    (fieldErrors[field] ??= []).push(issue.message);
  }
  return fieldErrors;
};

const kindForApiError = (error: ApiError): AuthMutationErrorKind => {
  if (error.status === 403) return "permission";
  if (error.status === 409) return "conflict";
  if (error.status === 429) return "rate";
  if (error.retryable || error.status >= 500) return "retryable";
  return "invalid";
};

const isOfflineFailure = (error: unknown) => {
  if (!(error instanceof TypeError)) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /fetch|network|load failed/i.test(error.message);
};

export const classifyAuthError = (error: unknown): AuthMutationError => {
  if (error instanceof AuthMutationError) return error;

  if (error instanceof ZodError) {
    return new AuthMutationError({
      cause: error,
      code: "FORM_VALIDATION_ERROR",
      fieldErrors: zodFieldErrors(error),
      kind: "invalid",
      message: "请检查表单中的信息。",
    });
  }

  if (error instanceof ApiError) {
    const kind = kindForApiError(error);
    return new AuthMutationError({
      cause: error,
      code: error.code,
      fieldErrors: error.fieldErrors,
      kind,
      message: error.message,
      requestId: error.requestId,
      retryable: error.retryable || kind === "rate" || kind === "retryable",
      status: error.status,
    });
  }

  if (isOfflineFailure(error)) {
    return new AuthMutationError({
      cause: error,
      code: "NETWORK_OFFLINE",
      kind: "offline",
      message: "网络连接已中断。你的输入仍保留在当前页面，可以联网后重试。",
      retryable: true,
    });
  }

  return new AuthMutationError({
    cause: error,
    code: "AUTH_REQUEST_INVALID",
    kind: "invalid",
    message: "当前操作无法完成，请检查输入后重试。",
  });
};

const runPreAuthMutation = async <Input, ResponseBody>(
  schema: ZodType<Input>,
  path: string,
  input: Input,
): Promise<ResponseBody> => {
  try {
    const body = schema.parse(input);
    await issuePreAuthCsrf();
    try {
      return await apiRequest<ResponseBody>(path, { method: "POST", body });
    } finally {
      // The fallback is process memory only, and belongs to exactly this
      // explicit attempt. A user retry always starts by issuing a new token.
      forgetCsrfToken();
    }
  } catch (error) {
    throw classifyAuthError(error);
  }
};

export const loginAccount = (input: LoginInput) => runPreAuthMutation<LoginInput, AuthResponse>(
  loginSchema,
  "/auth/login",
  input,
);

export const registerAccount = (input: RegisterInput) => runPreAuthMutation<RegisterInput, AuthResponse>(
  registerSchema,
  "/auth/register",
  input,
);

export const requestPasswordReset = (input: ForgotPasswordInput) => (
  runPreAuthMutation<ForgotPasswordInput, StatusResponse>(
    forgotPasswordSchema,
    "/auth/password/forgot",
    input,
  )
);

export const resetPassword = (input: ResetPasswordInput) => runPreAuthMutation<ResetPasswordInput, StatusResponse>(
  resetPasswordSchema,
  "/auth/password/reset",
  input,
);

export const useLoginMutation = () => {
  return useMutation<AuthResponse, AuthMutationError, LoginInput>({
    mutationFn: loginAccount,
    retry: false,
  });
};

export const useRegisterMutation = () => {
  return useMutation<AuthResponse, AuthMutationError, RegisterInput>({
    mutationFn: registerAccount,
    retry: false,
  });
};

export const useForgotPasswordMutation = () => useMutation<
  StatusResponse,
  AuthMutationError,
  ForgotPasswordInput
>({
  mutationFn: requestPasswordReset,
  retry: false,
});

export const useResetPasswordMutation = () => useMutation<
  StatusResponse,
  AuthMutationError,
  ResetPasswordInput
>({
  mutationFn: resetPassword,
  retry: false,
});
