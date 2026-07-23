import { ApiError } from "../../../shared/api/errors";

export type NotificationRecoveryState =
  | "recoverable-error"
  | "non-recoverable-error"
  | "offline-draft"
  | "permission-denied"
  | "stale-version-conflict";

export type NotificationRecovery = Readonly<{
  requestId: string | null;
  state: NotificationRecoveryState;
}>;

const isOfflineFailure = (error: unknown) => {
  if (!(error instanceof TypeError)) return false;
  if (typeof navigator !== "undefined" && navigator.onLine === false) return true;
  return /fetch|network|load failed|offline/i.test(error.message);
};

export const notificationRecoveryFor = (error: unknown): NotificationRecovery => {
  if (error instanceof ApiError) {
    if (error.status === 401 || error.status === 403) {
      return { requestId: error.requestId, state: "permission-denied" };
    }
    if (error.status === 409) {
      return { requestId: error.requestId, state: "stale-version-conflict" };
    }
    if (error.retryable || error.status === 429 || error.status >= 500) {
      return { requestId: error.requestId, state: "recoverable-error" };
    }
    return { requestId: error.requestId, state: "non-recoverable-error" };
  }

  if (isOfflineFailure(error)) {
    return { requestId: null, state: "offline-draft" };
  }

  return { requestId: null, state: "non-recoverable-error" };
};
