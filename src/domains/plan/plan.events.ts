import { createOwnerScopedBrowserNotification } from "../../shared/lib/ownerScopedBrowserNotification";

export const PLAN_RECONNECT_REPLAYED_EVENT = "qg-v2-plan-reconnect-replayed";
export const PLAN_DRAFT_CHANGED_EVENT = "qg-v2-plan-draft-changed";

const PLAN_DRAFT_CHANNEL = "qg-v2-plan-drafts";
const PLAN_DRAFT_CHANGED_MESSAGE = "plan-draft-changed";

const planDraftNotifications = createOwnerScopedBrowserNotification({
  channelName: PLAN_DRAFT_CHANNEL,
  eventName: PLAN_DRAFT_CHANGED_EVENT,
  messageType: PLAN_DRAFT_CHANGED_MESSAGE,
});

export const publishPlanDraftChanged = planDraftNotifications.publish;

export const subscribePlanDraftChanges = (
  ownerScope: string,
  listener: () => void,
): (() => void) => planDraftNotifications.subscribe(ownerScope, listener);
