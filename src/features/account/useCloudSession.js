import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppServicesContext, useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { getCloudSessionStatus, subscribeCloudSessionStatus, verifyCloudSession } from "../../state/cloudSessionStatus.js";
import { beginCloudReauthentication } from "../../state/cloudReauthentication.js";

export function useCloudSession() {
  const services = useAppServicesContext();
  const user = useAuthStore(state => state.currentUser);
  const config = useAppStore(state => state.cloudConfig || {});
  const active = user?.id === config.userId ? config : {};
  const getSnapshot = useCallback(() => getCloudSessionStatus(active), [user?.id, config.endpoint, config.userId, config.token]);
  const status = useSyncExternalStore(subscribeCloudSessionStatus, getSnapshot, getSnapshot);
  const navigate = useNavigate();
  const location = useLocation();
  const en = services.getLanguage?.() === "en";
  useEffect(() => {
    if (!user?.id || user.id !== config.userId) return undefined;
    const wake = () => { if (document.visibilityState !== "hidden") verifyCloudSession(config); };
    wake();
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    return () => { window.removeEventListener("focus", wake); window.removeEventListener("online", wake); };
  }, [user?.id, config.endpoint, config.userId, config.token]);

  const reconnect = () => {
    if (!user || !services.pageApi?.account?.logout) return;
    beginCloudReauthentication({ ownerId: user.id, email: user.email, returnTo: location.pathname + location.search + location.hash });
    services.services?.rebindElements?.();
    // The existing logout only releases the active session. Per-account
    // training records and drafts remain in their original local stores.
    services.pageApi.account.logout();
    navigate("/login", { replace: true, state: { from: location } });
  };
  const label = ({
    local: en ? "Saved on this device" : "本机账户",
    unknown: en ? "Checking cloud session" : "正在验证云端登录",
    connected: en ? "Cloud connected" : "云端已连接",
    expired: en ? "Sign in to reconnect" : "云端登录待恢复",
    restricted: en ? "Cloud access restricted" : "云端访问受限",
    offline: en ? "Cloud unavailable" : "云端暂未连接",
  })[status.phase];
  return { ...status, label, reconnect, en };
}
