import type { Query, QueryClient } from "@tanstack/react-query";

import { createAccountScope } from "../lib/accountScope";
import { apiRequest } from "./client";
import { readCsrfToken } from "./csrf";
import { ApiError } from "./errors";

const belongsToOwner = (query: Query, ownerScope: string): boolean => (
  query.queryKey[1] === ownerScope
);

/**
 * Cancel first so an old account request cannot repopulate its cache after the
 * account boundary has removed it. Auth queries have no owner at key index 1
 * and deliberately remain outside this cleanup.
 */
export const cancelAndRemoveOwnerQueries = async (
  queryClient: QueryClient,
  ownerScope: string,
): Promise<void> => {
  const predicate = (query: Query) => belongsToOwner(query, ownerScope);
  await queryClient.cancelQueries({ predicate });
  queryClient.removeQueries({ predicate });
};

const ownerScopeFromCurrentUser = (value: unknown): string => {
  if (
    typeof value !== "object"
    || value === null
    || !("email" in value)
    || typeof value.email !== "string"
    || value.email.trim().length === 0
  ) {
    throw new ApiError({
      code: "AUTH_SESSION_RESPONSE_INVALID",
      message: "当前账号信息无法验证，请重新登录。",
      requestId: null,
      status: 401,
    });
  }
  return createAccountScope(value.email);
};

const sessionBoundaryFailure = (
  code: "AUTH_SESSION_BOUNDARY_CHANGED" | "SESSION_PROOF_REQUIRED",
  message: string,
) => new ApiError({
  code,
  message,
  requestId: null,
  status: 401,
});

const captureSessionBoundary = (): string => {
  let proof: string | null;
  try {
    proof = readCsrfToken();
  } catch {
    throw sessionBoundaryFailure(
      "SESSION_PROOF_REQUIRED",
      "当前会话凭据无法验证，请重新登录。",
    );
  }
  if (proof === null) {
    throw sessionBoundaryFailure(
      "SESSION_PROOF_REQUIRED",
      "当前会话需要重新验证后才能继续。",
    );
  }
  return proof;
};

const assertSessionBoundary = (expectedProof: string): void => {
  let currentProof: string;
  try {
    currentProof = captureSessionBoundary();
  } catch {
    throw sessionBoundaryFailure(
      "AUTH_SESSION_BOUNDARY_CHANGED",
      "当前浏览器会话已发生变化，请确认账号后重试。",
    );
  }
  if (currentProof !== expectedProof) {
    throw sessionBoundaryFailure(
      "AUTH_SESSION_BOUNDARY_CHANGED",
      "当前浏览器会话已发生变化，请确认账号后重试。",
    );
  }
};

export const verifyCurrentSessionOwner = async (
  expectedOwnerScope: string,
  signal?: AbortSignal,
): Promise<void> => {
  const currentUser = await apiRequest<unknown>("/me", {
    ...(signal === undefined ? {} : { signal }),
  });
  if (ownerScopeFromCurrentUser(currentUser) !== expectedOwnerScope) {
    throw new ApiError({
      code: "AUTH_SESSION_OWNER_CHANGED",
      message: "当前浏览器会话的账号已发生变化，请确认账号后重试。",
      requestId: null,
      status: 401,
    });
  }
};

/**
 * Verify after the domain response and before returning it to TanStack Query.
 * A cookie switched by another tab can therefore never commit account B data
 * beneath account A's query key, even if both requests raced on window focus.
 */
export const runOwnerScopedQuery = async <Result>(
  ownerScope: string,
  request: () => Promise<Result>,
  signal?: AbortSignal,
): Promise<Result> => {
  const sessionBoundary = captureSessionBoundary();
  const result = await request();
  await verifyCurrentSessionOwner(ownerScope, signal);
  assertSessionBoundary(sessionBoundary);
  return result;
};

/**
 * Mutations need both boundaries: the first check prevents sending an old
 * account intent through a newly switched cookie, while the second prevents a
 * raced response from updating the old account's local read models.
 */
export const runOwnerVerifiedOperation = async <Result>(
  verifyOwner: () => Promise<void>,
  request: () => Promise<Result>,
): Promise<Result> => {
  const sessionBoundary = captureSessionBoundary();
  await verifyOwner();
  assertSessionBoundary(sessionBoundary);
  const result = await request();
  await verifyOwner();
  assertSessionBoundary(sessionBoundary);
  return result;
};
