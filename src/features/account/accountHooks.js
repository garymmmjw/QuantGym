import { useCallback, useEffect, useMemo, useState } from "react";
import { useAppStore, useAuthStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";

function canCurrentUserReadAdminOverview(user = {}) {
  const tier = String(user?.subscriptionTier || user?.plan || "").toLowerCase();
  return user?.isAdmin === true || tier === "admin";
}

export function useAccountPageModel() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const accountApi = usePageApi("account");
  const auth = useAuthStore((state) => state);
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
    avatarUrl: currentUser?.picture && !String(currentUser.picture).startsWith("data:")
      ? currentUser.picture
      : "",
    avatarData: "",
    avatarCleared: false,
    currentPassword: ""
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
    setMessage(result.message || t("accountUpdated") || "账户已更新。");
    appServices.services?.refreshIcons?.({ root: document.querySelector(".account-section") || document });
    return result;
  }, [accountApi, form, appServices, t]);

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
    appServices.services?.refreshIcons?.({ root: document.querySelector(".account-section") || document });
  }, [accountApi, appServices, t]);

  const logout = useCallback(() => {
    accountApi?.logout?.();
  }, [accountApi]);

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
      appServices.services?.refreshIcons?.({ root: document.querySelector(".account-section") || document });
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
