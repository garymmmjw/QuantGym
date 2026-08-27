import { createOwnerScopedBrowserNotification } from "../../shared/lib/ownerScopedBrowserNotification";

export const TRAINING_RECONNECT_REPLAYED_EVENT = "qg-v2-training-reconnect-replayed";
export const TRAINING_DRAFT_CHANGED_EVENT = "qg-v2-training-draft-changed";

const TRAINING_DRAFT_CHANNEL = "qg-v2-training-drafts";
const TRAINING_DRAFT_CHANGED_MESSAGE = "training-draft-changed";

const trainingDraftNotifications = createOwnerScopedBrowserNotification({
  channelName: TRAINING_DRAFT_CHANNEL,
  eventName: TRAINING_DRAFT_CHANGED_EVENT,
  messageType: TRAINING_DRAFT_CHANGED_MESSAGE,
});

export const publishTrainingDraftChanged = trainingDraftNotifications.publish;

export const subscribeTrainingDraftChanges = (
  ownerScope: string,
  listener: () => void,
): (() => void) => trainingDraftNotifications.subscribe(ownerScope, listener);
