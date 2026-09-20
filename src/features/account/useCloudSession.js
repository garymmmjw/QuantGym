import { useCallback, useEffect, useSyncExternalStore } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAppServicesContext, useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { describeAccountSession, getCloudSessionStatus, subscribeCloudSessionStatus, verifyCloudSession } from "../../state/cloudSessionStatus.js";
import { beginCloudReauthentication, clearCloudReauthentication } from "../../state/cloudReauthentication.js";

export function useCloudSession() {
  const services = useAppServicesContext();
  const user = useAuthStore(state => state.currentUser);
  const config = useAppStore(state => state.cloudConfig || {});
  const active = user?.id === config.userId ? config : {};
  const getSnapshot = useCallback(() => getCloudSessionStatus(active, user || null), [user?.id, user?.cloudLinked, config.endpoint, config.userId, config.token]);
  const status = useSyncExternalStore(subscribeCloudSessionStatus, getSnapshot, getSnapshot);
  const subscribeOnline = useCallback(listener => {
    window.addEventListener("online", listener);
    window.addEventListener("offline", listener);
    return () => { window.removeEventListener("online", listener); window.removeEventListener("offline", listener); };
  }, []);
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine !== false, () => true);
  const navigate = useNavigate();
  const location = useLocation();
  const en = services.getLanguage?.() === "en";
  useEffect(() => {
    if (!user?.id || user.id !== config.userId) return undefined;
    const wake = event => { if (document.visibilityState !== "hidden" && navigator.onLine !== false) verifyCloudSession(config, { force: event?.type === "online" }); };
    wake();
    window.addEventListener("focus", wake);
    window.addEventListener("online", wake);
    return () => { window.removeEventListener("focus", wake); window.removeEventListener("online", wake); };
  }, [user?.id, config.endpoint, config.userId, config.token]);

  const reconnect = () => {
    if (!user || !services.pageApi?.account?.logout) return;
    const needsVerification = describeAccountSession(user, active, status).needsVerification;
    if (needsVerification) clearCloudReauthentication();
    else beginCloudReauthentication({ ownerId: user.id, email: user.email, returnTo: location.pathname + location.search + location.hash });
    services.services?.rebindElements?.();
    // The existing logout only releases the active session. Per-account
    // training records and drafts remain in their original local stores.
    services.pageApi.account.logout();
    navigate("/login", { replace: true, state: { from: location, email: user.email, needsVerification } });
  };
  return { ...describeAccountSession(user, active, status, { en, online }), reconnect, en };
}
