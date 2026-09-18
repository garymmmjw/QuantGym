import { useCloudSession } from "./useCloudSession.js";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useAppStore, useAuthStore, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { getLevelInfo, getStreak } from "../../modules/skills/data.js";
import { getEffectiveTotalXp } from "../../modules/economy/index.js";

export function useAccountPageModel() {
  const services = useAppServices();
  const cloudSession = useCloudSession();
  const api = usePageApi("account");
  const user = useAuthStore(state => state.currentUser);
  const state = useUserStateStore(store => store.value);
  const language = useAppStore(store => store.appPrefs?.language || "zh");
  const cloud = useAppStore(store => store.cloudConfig || {});
  const [status, setStatus] = useState({});
  const [busy, setBusy] = useState("");
  const busyRef = useRef(false);
  const userRef = useRef(user?.id);
  userRef.current = user?.id;
  const connected = Boolean(user?.id && cloud.token && cloud.userId === user.id);
  const zh = language !== "en";
  const copy = (cn, en) => zh ? cn : en;
  const run = useCallback(async (section, action) => {
    if (busyRef.current) return { ok: false };
    busyRef.current = true;
    setBusy(section);
    setStatus(previous => ({ ...previous, [section]: null }));
    const id = userRef.current;
    try {
      const result = await action();
      if (userRef.current === id) setStatus(previous => ({ ...previous, [section]: result || { ok: false, message: "操作未完成。 / Action did not complete." } }));
      return result;
    } catch (error) {
      const result = { ok: false, message: error.message || "操作失败，请重试。 / Please try again." };
      if (userRef.current === id) setStatus(previous => ({ ...previous, [section]: result }));
      return result;
    } finally { busyRef.current = false; setBusy(""); }
  }, []);
  const stats = useMemo(() => {
    const xp = getEffectiveTotalXp(state || {});
    return { xp, level: getLevelInfo(xp).level, streak: getStreak(state?.entries || [], state?.checkIns || [], new Date(), state?.economy?.frozenDays || []) };
  }, [state]);
  const [adminOverview, setAdminOverview] = useState({ status: "idle" });
  const admin = Boolean(user?.isAdmin || user?.subscriptionTier === "admin");
  useEffect(() => { setStatus({}); setAdminOverview({ status: "idle" }); }, [user?.id]);
  const refreshAdminOverview = useCallback(async () => {
    if (!admin || !connected) return;
    const ownerId = userRef.current;
    const result = await api.fetchAdminOverview();
    if (userRef.current === ownerId) setAdminOverview(result.ok ? { status: "ready", ...result } : { status: "hidden" });
  }, [admin, connected, api]);
  useEffect(() => { refreshAdminOverview(); }, [refreshAdminOverview]);
  return { services, api, user, state, cloud, connected, cloudSession, zh, copy, stats, status, busy, run,
    t: services.t, formatDate: services.formatNewsDate, adminOverview: admin ? adminOverview : { status: "hidden" }, refreshAdminOverview };
}

export function readLegacyGoal(user) {
  if (user?.goal !== undefined) return user.goal;
  try { return localStorage.getItem(`qg-account-goal:${user?.id}`) || ""; } catch { return ""; }
}
