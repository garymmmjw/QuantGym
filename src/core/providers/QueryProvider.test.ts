import { describe, expect, it } from "vitest";

import { ApiError } from "../../shared/api/errors";
import { shouldRetryQuery } from "./queryRetry";

const apiError = (status: number, retryable = false) => new ApiError({
  code: "TEST_ERROR",
  message: "Test error",
  requestId: "req-query-provider",
  retryable,
  status,
});

describe("shouldRetryQuery", () => {
  it("does not retry authentication, permission, or stale-version failures", () => {
    expect(shouldRetryQuery(0, apiError(401))).toBe(false);
    expect(shouldRetryQuery(0, apiError(403))).toBe(false);
    expect(shouldRetryQuery(0, apiError(409))).toBe(false);
  });

  it("retries transient failures at most twice", () => {
    expect(shouldRetryQuery(0, apiError(503, true))).toBe(true);
    expect(shouldRetryQuery(1, apiError(500))).toBe(true);
    expect(shouldRetryQuery(2, apiError(503, true))).toBe(false);
  });

  it("does not retry terminal client errors", () => {
    expect(shouldRetryQuery(0, apiError(422))).toBe(false);
  });
});
