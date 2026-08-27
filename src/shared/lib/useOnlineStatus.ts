import { useSyncExternalStore } from "react";

const readOnlineStatus = () => (
  typeof navigator === "undefined" ? true : navigator.onLine
);

const subscribeToOnlineStatus = (onStatusChange: () => void) => {
  if (typeof window === "undefined") return () => undefined;

  window.addEventListener("online", onStatusChange);
  window.addEventListener("offline", onStatusChange);
  return () => {
    window.removeEventListener("online", onStatusChange);
    window.removeEventListener("offline", onStatusChange);
  };
};

export const useOnlineStatus = () => useSyncExternalStore(
  subscribeToOnlineStatus,
  readOnlineStatus,
  () => true,
);
