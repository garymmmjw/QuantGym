import { ApiError } from "../../shared/api/errors";

export const shouldRetryQuery = (failureCount: number, error: unknown) => {
  if (failureCount >= 2) return false;
  if (!(error instanceof ApiError)) return true;
  if (error.status === 401 || error.status === 403 || error.status === 409) return false;
  return error.retryable || error.status >= 500;
};
