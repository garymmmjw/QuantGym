import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import { forgetCsrfToken, rememberCsrfToken } from "../../../shared/api/csrf";
import { ApiError } from "../../../shared/api/errors";
import type { CsrfResponse, MeResponse } from "./auth.schema";

export const authQueryKeys = {
  me: ["auth", "me"] as const,
} as const;

const CURRENT_USER_TIMEOUT_MS = 7_000;

export const getCurrentUser = async (parentSignal?: AbortSignal) => {
  const controller = new AbortController();
  const abortFromParent = () => controller.abort(parentSignal?.reason);
  if (parentSignal?.aborted === true) abortFromParent();
  else parentSignal?.addEventListener("abort", abortFromParent, { once: true });
  const timeout = globalThis.setTimeout(() => {
    controller.abort(new DOMException("Current-user request timed out", "TimeoutError"));
  }, CURRENT_USER_TIMEOUT_MS);

  try {
    return await apiRequest<MeResponse>("/me", { signal: controller.signal });
  } catch (error) {
    if (
      error instanceof ApiError
      && error.status === 401
      && error.code === "AUTH_SESSION_REQUIRED"
    ) {
      return null;
    }
    throw error;
  } finally {
    globalThis.clearTimeout(timeout);
    parentSignal?.removeEventListener("abort", abortFromParent);
  }
};

export const issuePreAuthCsrf = async (): Promise<CsrfResponse> => {
  // A failed challenge request must never leave a previous attempt's token as
  // an eligible in-memory fallback.
  forgetCsrfToken();
  const response = await apiRequest<CsrfResponse>("/auth/csrf");
  rememberCsrfToken(response.csrfToken);
  return response;
};

export const currentUserQueryOptions = () => queryOptions({
  queryFn: ({ signal }): Promise<MeResponse | null> => getCurrentUser(signal),
  queryKey: authQueryKeys.me,
  retry: false,
});

export const useCurrentUserQuery = () => useQuery(currentUserQueryOptions());
