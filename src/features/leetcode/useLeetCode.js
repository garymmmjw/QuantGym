import { useEffect, useMemo, useSyncExternalStore } from "react";
import { useAppServicesContext, useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { createLeetCodeClient } from "./leetcodeClient.js";
import { EMPTY_LEETCODE } from "./leetcodeModel.js";

const clients = new Map();
const disabledSnapshot = { data: EMPTY_LEETCODE, phase: "local", error: null };
const noSubscribe = () => () => {};
const getDisabled = () => disabledSnapshot;

export function useLeetCode({ enabled: requestedEnabled = true } = {}) {
  const services = useAppServicesContext();
  const user = useAuthStore((state) => state.currentUser);
  const config = useAppStore((state) => state.cloudConfig || services.appState?.cloudConfig || {});
  const enabled = Boolean(requestedEnabled && user?.id && config.endpoint && config.token && config.userId === user.id);
  const client = useMemo(() => {
    if (!enabled) return null;
    const key = JSON.stringify([user.id, config.endpoint, config.token]);
    if (!clients.has(key)) clients.set(key, createLeetCodeClient(config));
    return clients.get(key);
  }, [enabled, user?.id, config.endpoint, config.token]);
  const snapshot = useSyncExternalStore(client?.subscribe || noSubscribe, client?.getSnapshot || getDisabled, getDisabled);
  useEffect(() => client?.retain(), [client]);
  return { ...snapshot, enabled, ownerId: user?.id, language: services.getLanguage?.() || "zh", busy: ["loading", "connecting", "syncing", "disconnecting", "importing", "reviewing", "backpacking"].includes(snapshot.phase),
    reload: client?.reload, retry: client?.retry, connect: client?.connect, sync: client?.sync, disconnect: client?.disconnect, importRecords: client?.importRecords, recordReview: client?.recordReview, addReviewCard: client?.addReviewCard };
}
