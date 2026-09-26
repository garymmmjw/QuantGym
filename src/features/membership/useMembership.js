import { useCallback, useEffect, useRef, useState } from "react";
import { useAppServicesContext, useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { MEMBERSHIP_CHANGED_EVENT, membershipConnection, membershipRequest } from "./membershipApi.js";

/** Only a fresh server response can grant access, including to administrators. */
export function useMembership() {
  const services = useAppServicesContext();
  const userId = useAuthStore(state => state.currentUser?.id || "");
  const config = useAppStore(state => state.cloudConfig || {});
  const { connected, token, baseUrl } = membershipConnection(config, userId);
  const sessionKey = `${userId}\n${baseUrl}\n${token}`;
  const currentKey = useRef(sessionKey);
  currentKey.current = sessionKey;
  const controllerRef = useRef(null);
  const grantedKey = useRef("");
  const [state, setState] = useState({ key: "", isMember: false, loading: false, error: "" });
  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    if (!connected) {
      grantedKey.current = "";
      setState({ key: sessionKey, isMember: false, loading: false, error: "" });
      return false;
    }
    const controller = new AbortController();
    controllerRef.current = controller;
    setState(previous => ({ key: sessionKey, isMember: previous.key === sessionKey && previous.isMember, loading: true, error: "" }));
    try {
      const payload = await membershipRequest("/membership", { token, baseUrl, signal: controller.signal });
      if (controller.signal.aborted || currentKey.current !== sessionKey) return false;
      const isMember = payload.isMember === true;
      if (isMember && grantedKey.current !== sessionKey) {
        const catalog = await services.refreshProblemCatalog?.(true);
        if (controller.signal.aborted || currentKey.current !== sessionKey) return false;
        if (catalog?.error) throw new Error("题库加载失败，请重新检查权限重试。 / The question bank could not load. Check access again to retry.");
        grantedKey.current = sessionKey;
      }
      if (!isMember) grantedKey.current = "";
      setState({ key: sessionKey, isMember, loading: false, error: "" });
      return isMember;
    } catch (error) {
      if (!controller.signal.aborted && currentKey.current === sessionKey) {
        setState({ key: sessionKey, isMember: false, loading: false, error: error.message });
      }
      return false;
    }
  }, [connected, token, baseUrl, sessionKey, services]);
  useEffect(() => {
    refresh();
    const onVisible = () => { if (document.visibilityState === "visible") refresh(); };
    window.addEventListener("focus", refresh);
    window.addEventListener(MEMBERSHIP_CHANGED_EVENT, refresh);
    document.addEventListener("visibilitychange", onVisible);
    const interval = setInterval(onVisible, 30000);
    return () => {
      controllerRef.current?.abort();
      clearInterval(interval);
      window.removeEventListener("focus", refresh);
      window.removeEventListener(MEMBERSHIP_CHANGED_EVENT, refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);
  const current = state.key === sessionKey;
  return { isMember: connected && current && state.isMember, loading: connected && (!current || state.loading),
    error: current ? state.error : "", connected, refresh };
}
