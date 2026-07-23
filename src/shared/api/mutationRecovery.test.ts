import { ApiError } from "./errors";
import {
  classifyMutationFailure,
  createIdempotencyKey,
} from "./mutationRecovery";

describe("classifyMutationFailure", () => {
  it.each([
    [401, "permission-denied"],
    [403, "permission-denied"],
    [409, "stale-version-conflict"],
    [422, "non-recoverable-error"],
    [429, "recoverable-error"],
    [503, "recoverable-error"],
  ] as const)("maps HTTP %s to %s", (status, state) => {
    const result = classifyMutationFailure(new ApiError({
      code: "TEST_FAILURE",
      message: "failed",
      requestId: "request-1",
      retryable: status === 429,
      status,
    }));

    expect(result).toMatchObject({
      requestId: "request-1",
      retryable: ["recoverable-error"].includes(state),
      state,
    });
  });

  it("preserves offline work as a draft", () => {
    const result = classifyMutationFailure(new TypeError("Failed to fetch"), false);

    expect(result).toMatchObject({
      preserveDraft: true,
      retryable: true,
      state: "offline-draft",
    });
  });

  it("treats a missing session CSRF token as a permission recovery", () => {
    expect(classifyMutationFailure(new Error("CSRF_TOKEN_REQUIRED"))).toMatchObject({
      state: "permission-denied",
    });
  });
});

describe("createIdempotencyKey", () => {
  it("creates a stable URL-safe value for one user intent", () => {
    const key = createIdempotencyKey();

    expect(key).toMatch(/^[A-Za-z0-9_-]{16,128}$/);
  });
});
