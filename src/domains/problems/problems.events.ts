import { createOwnerScopedBrowserNotification } from "../../shared/lib/ownerScopedBrowserNotification";

export const PROBLEM_RECONNECT_REPLAYED_EVENT = "qg-v2-problem-reconnect-replayed";
export const PROBLEM_DRAFT_CHANGED_EVENT = "qg-v2-problem-draft-changed";

const problemDraftNotifications = createOwnerScopedBrowserNotification({
  channelName: "qg-v2-problem-drafts",
  eventName: PROBLEM_DRAFT_CHANGED_EVENT,
  messageType: "problem-draft-changed",
});

export const publishProblemDraftChanged = problemDraftNotifications.publish;

export const subscribeProblemDraftChanges = (
  ownerScope: string,
  listener: () => void,
): (() => void) => problemDraftNotifications.subscribe(ownerScope, listener);
