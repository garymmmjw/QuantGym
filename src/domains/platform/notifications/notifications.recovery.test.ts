import { ApiError } from "../../../shared/api/errors";
import { notificationRecoveryFor } from "./notifications.recovery";

const apiError = (
  status: number,
  retryable = false,
) => new ApiError({
  code: `ERROR_${status}`,
  message: "request failed",
  requestId: `request-${status}`,
  retryable,
  status,
});

describe("notificationRecoveryFor", () => {
  it.each([
    [401, "permission-denied"],
    [403, "permission-denied"],
    [409, "stale-version-conflict"],
    [422, "non-recoverable-error"],
    [429, "recoverable-error"],
    [503, "recoverable-error"],
  ] as const)("maps HTTP %s to %s and preserves its request ID", (status, state) => {
    expect(notificationRecoveryFor(apiError(status))).toEqual({
      requestId: `request-${status}`,
      state,
    });
  });

  it("honors an explicitly retryable API response", () => {
    expect(notificationRecoveryFor(apiError(400, true)).state).toBe("recoverable-error");
  });

  it("classifies an offline fetch failure as a retained read-state draft", () => {
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    expect(notificationRecoveryFor(new TypeError("Failed to fetch"))).toEqual({
      requestId: null,
      state: "offline-draft",
    });
  });

  it("does not claim an unknown programming error is retryable", () => {
    expect(notificationRecoveryFor(new Error("unexpected"))).toEqual({
      requestId: null,
      state: "non-recoverable-error",
    });
  });
});
