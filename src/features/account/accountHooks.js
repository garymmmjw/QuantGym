import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore, useAuthStore, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import {
  calculateQuantScore,
  getLevelInfo,
  getRank,
  getStreak,
  getTotalXp
} from "../../modules/skills/data.js";
import { getEffectiveTotalXp } from "../../modules/economy/index.js";
import { hashPassword } from "../../state/auth.js";

function canCurrentUserReadAdminOverview(user = {}) {
  const tier = String(user?.subscriptionTier || user?.plan || "").toLowerCase();
  return user?.isAdmin === true || tier === "admin";
}

function goalStorageKey(userId = "") {
  return `qg-account-goal:${userId || "anonymous"}`;
}

function readStoredGoal(userId = "") {
  try {
    return localStorage.getItem(goalStorageKey(userId)) || "";
  } catch {
    return "";
  }
}

function writeStoredGoal(userId = "", goal = "") {
  try {
    if (goal) localStorage.setItem(goalStorageKey(userId), goal);
    else localStorage.removeItem(goalStorageKey(userId));
  } catch {
    /* storage unavailable */
  }
}

function isNewPasswordValid(value = "") {
  return value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);
}

export function useAccountPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const accountApi = usePageApi("account");
  const auth = useAuthStore((state) => state);
  const userStateValue = useUserStateStore((state) => state.value || {});
  const cloudConfig = useAppStore((state) => state.cloudConfig || appServices.appState?.cloudConfig || {});
  const currentUser = auth.currentUser;
  const t = appServices.t || ((key) => key);
  const [message, setMessage] = useState("");
  const [resumeMeta, setResumeMeta] = useState(() => accountApi?.getResumeMeta?.() || "");
  const [adminOverview, setAdminOverview] = useState({
    status: "idle",
    metrics: null,
    events: [],
    message: ""
  });

  const initialForm = useMemo(() => ({
    name: currentUser?.name || "",
    email: currentUser?.email || "",
    country: currentUser?.country || "china",
    region: currentUser?.region || "",
    graduationTerm: currentUser?.graduationTerm || "2027-09",
    goal: readStoredGoal(currentUser?.id),
    avatarUrl: currentUser?.picture && !String(currentUser.picture).startsWith("data:")
      ? currentUser.picture
      : "",
    avatarData: "",
    avatarCleared: false,
    currentPassword: "",
    newPassword: ""
  }), [currentUser]);

  const [form, setForm] = useState(initialForm);

  useEffect(() => {
    setForm(initialForm);
    setResumeMeta(accountApi?.getResumeMeta?.() || "");
  }, [initialForm, accountApi]);

  const update = useCallback((key, value) => {
    setForm((prev) => {
      if (key === "avatarUrl") {
        return {
          ...prev,
          avatarUrl: value,
          avatarData: "",
          avatarCleared: false
        };
      }
      return { ...prev, [key]: value };
    });
  }, []);

  const save = useCallback(async () => {
    const result = await accountApi?.save?.({
      name: form.name,
      email: form.email,
      country: form.country,
      region: form.region,
      graduationTerm: form.graduationTerm,
      avatarUrl: form.avatarUrl,
      avatarData: form.avatarData,
      avatarCleared: form.avatarCleared,
      currentPassword: form.currentPassword
    });
    if (!result?.ok) {
      setMessage(result?.message || t("accountSaveFailed") || "保存失败。");
      return result;
    }
    writeStoredGoal(currentUser?.id, String(form.goal || "").trim());
    setMessage(result.message || t("accountUpdated") || "账户已更新。");
    appServices.services?.refreshIcons?.({ root: document.querySelector(".qg-account-page") || document });
    return result;
  }, [accountApi, currentUser, form, appServices, t]);

  const uploadAvatar = useCallback(async (file) => {
    if (!file?.type?.startsWith("image/")) {
      setMessage(t("accountImageOnly") || "请选择图片文件。");
      return;
    }
    if (file.size > 1_800_000) {
      setMessage(t("accountImageTooLarge") || "头像图片太大。");
      return;
    }
    const reader = new FileReader();
    const dataUrl = await new Promise((resolve, reject) => {
      reader.onload = () => resolve(String(reader.result || ""));
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
    const uploadResult = await accountApi?.uploadAvatarMedia?.({
      dataUrl,
      name: file.name || "avatar"
    });
    const uploadedAvatar = uploadResult?.ok
      ? uploadResult.media?.dataUrl || uploadResult.media?.url || ""
      : "";
    setForm((prev) => ({
      ...prev,
      avatarData: uploadedAvatar ? "" : dataUrl,
      avatarCleared: false,
      avatarUrl: uploadedAvatar
    }));
  }, [accountApi, t]);

  const clearAvatar = useCallback(() => {
    setForm((prev) => ({
      ...prev,
      avatarData: "",
      avatarUrl: "",
      avatarCleared: true
    }));
  }, []);

  const uploadResume = useCallback(async (file) => {
    const result = await accountApi?.uploadResume?.(file);
    if (!result?.ok) {
      setMessage(result?.message || t("resumeUploadFailed") || "简历上传失败。");
      return;
    }
    setResumeMeta(result.meta || "");
    appServices.services?.refreshIcons?.({ root: document.querySelector(".qg-account-page") || document });
  }, [accountApi, appServices, t]);

  const logout = useCallback(() => {
    accountApi?.logout?.();
  }, [accountApi]);

  const passwordValid = Boolean(form.currentPassword) && isNewPasswordValid(form.newPassword);

  const changePassword = useCallback(async () => {
    if (!currentUser) return { ok: false };
    if (!isNewPasswordValid(form.newPassword)) {
      setMessage(t("accountPwInvalid") || "新密码不符合要求：至少 8 位，需同时包含字母和数字。");
      return { ok: false };
    }
    if (!form.currentPassword) {
      setMessage(t("accountPwNeedCurrent") || "请先输入当前密码。");
      return { ok: false };
    }
    const account = (appServices.appState?.auth?.accounts || []).find((item) => item.id === currentUser.id);
    if (currentUser.provider !== "local" || !account?.passwordHash) {
      setMessage(t("accountPwThirdParty") || "该账户由第三方登录管理，暂不支持在此修改密码。");
      return { ok: false };
    }
    const currentHash = await hashPassword(account.email, form.currentPassword);
    if (currentHash !== account.passwordHash) {
      setMessage(t("accountPwWrongCurrent") || "当前密码不对，密码没有修改。");
      return { ok: false };
    }
    account.passwordHash = await hashPassword(account.email, form.newPassword);
    // Persist through the normal account save flow (writes auth + queues cloud sync)
    // using the stored profile values so nothing else changes.
    const result = await accountApi?.save?.({
      name: currentUser.name || form.name,
      email: currentUser.email || form.email,
      country: currentUser.country || form.country,
      region: currentUser.region || form.region,
      graduationTerm: currentUser.graduationTerm || form.graduationTerm,
      avatarUrl: currentUser.picture || "",
      avatarData: "",
      avatarCleared: false,
      currentPassword: ""
    });
    if (!result?.ok) {
      setMessage(result?.message || t("accountSaveFailed") || "保存失败。");
      return result;
    }
    setForm((prev) => ({ ...prev, currentPassword: "", newPassword: "" }));
    setMessage(t("accountPwChanged") || "密码已修改，下次登录请使用新密码。");
    return { ok: true };
  }, [accountApi, appServices, currentUser, form, t]);

  const canRequestAdminOverview = Boolean(
    currentUser?.id
      && cloudConfig?.token
      && cloudConfig?.userId === currentUser.id
      && canCurrentUserReadAdminOverview(currentUser)
  );

  const refreshAdminOverview = useCallback(async () => {
    if (!canRequestAdminOverview || !accountApi?.fetchAdminOverview) {
      setAdminOverview({ status: "idle", metrics: null, events: [], message: "" });
      return null;
    }
    setAdminOverview((prev) => ({
      ...prev,
      status: prev.metrics ? "refreshing" : "loading",
      message: ""
    }));
    const result = await accountApi.fetchAdminOverview(24);
    if (result?.ok) {
      setAdminOverview({
        status: "ready",
        metrics: result.metrics || {},
        events: result.events || [],
        message: ""
      });
      appServices.services?.refreshIcons?.({ root: document.querySelector(".qg-account-page") || document });
      return result;
    }
    if (result?.code === "forbidden") {
      setAdminOverview({ status: "hidden", metrics: null, events: [], message: "" });
      return result;
    }
    setAdminOverview((prev) => (
      prev.metrics
        ? {
          ...prev,
          status: "error",
          message: result?.message || t("adminOverviewUnavailable") || "运维概览暂不可用。"
        }
        : { status: "hidden", metrics: null, events: [], message: "" }
    ));
    return result;
  }, [accountApi, appServices, canRequestAdminOverview, t]);

  useEffect(() => {
    refreshAdminOverview();
  }, [refreshAdminOverview]);

  const avatarPreview = form.avatarCleared
    ? ""
    : form.avatarData || form.avatarUrl || currentUser?.picture || "";

  // Real training stats for the "数据概览" panel and identity chips,
  // computed with the same helpers the rest of the app uses.
  const stats = useMemo(() => {
    const skills = userStateValue.skills || {};
    const totalXp = getEffectiveTotalXp(userStateValue);
    const solved = (Array.isArray(userStateValue.problemStates) ? userStateValue.problemStates : [])
      .filter((item) => item?.completed).length;
    const streak = getStreak(userStateValue.entries || [], userStateValue.checkIns || [], new Date(), userStateValue.economy?.frozenDays || []);
    return {
      totalXp,
      solved,
      streak,
      level: getLevelInfo(totalXp).level,
      tier: getRank(calculateQuantScore(skills))
    };
  }, [userStateValue]);

  const registeredLabel = useMemo(() => {
    const createdAt = currentUser?.createdAt;
    if (!createdAt) return "-";
    const date = new Date(createdAt);
    if (Number.isNaN(date.getTime())) return "-";
    return `${date.getFullYear()} · ${date.getMonth() + 1}`;
  }, [currentUser]);

  const lastAuthenticatedAt = auth.auth?.lastAuthenticatedAt || "";

  return {
    t,
    currentUser,
    form,
    update,
    save,
    message,
    resumeMeta,
    uploadAvatar,
    clearAvatar,
    uploadResume,
    logout,
    changePassword,
    passwordValid,
    stats,
    registeredLabel,
    lastAuthenticatedAt,
    adminOverview,
    refreshAdminOverview,
    avatarPreview,
    getInitials: pageApi?.getInitials,
    renderCountries: appServices.renderCountryOptions,
    renderRegions: appServices.renderRegionOptions,
    formatDate: appServices.formatNewsDate,
    formatRank: accountApi?.formatRank,
    refreshIcons: appServices.services?.refreshIcons
  };
}
