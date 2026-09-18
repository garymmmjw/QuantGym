import { sanitizeAccountForCloud } from "../../api/cloud.js";
import { buildAccountSaveResult, applyAccountSaveResult } from "../../modules/account/save.js";
import { buildResumeUploadState } from "../../modules/resume/file.js";
import { normalizeResumeState } from "../../modules/resume/data.js";
import { formatResumeUploadMeta } from "../../modules/resume/file.js";

export function createAccountPageApi(deps = {}) {
  const connected = () => Boolean(deps.appState?.cloudConfig?.token && deps.appState?.cloudConfig?.userId === deps.appState?.currentUser?.id);
  const requiresCloud = () => Boolean(deps.appState?.currentUser?.cloudLinked || deps.appState?.cloudConfig?.userId === deps.appState?.currentUser?.id);
  const fail = error => ({ ok: false, code: error?.status === 401 ? "reauthenticate" : "saveFailed", message: error?.status === 401 ? "会话已失效或当前密码不正确，请重新登录或检查密码。 / Session expired or incorrect password." : error?.message || "保存失败，请重试。 / Could not save. Try again." });
  let passwordChangePending = false;
  let activationPending = false;
  const text = (zh, en) => deps.getLanguage?.() === "en" ? en : zh;
  const normalizeEmail = deps.normalizeEmail || ((value) => String(value || "").trim().toLowerCase());

  const sameSession = (userId, config) => deps.appState?.currentUser?.id === userId
    && deps.appState.cloudConfig?.userId === config.userId
    && deps.appState.cloudConfig?.token === config.token
    && deps.appState.cloudConfig?.endpoint === config.endpoint;

  async function validateDeviceAccount(password) {
    const currentUser = deps.appState?.currentUser;
    const account = (deps.appState?.auth?.accounts || []).find(item => item.id === currentUser?.id);
    const config = { ...(deps.appState?.cloudConfig || {}) };
    if (!account || account.provider !== "local" || !account.passwordHash || !deps.hashPassword) {
      return { ok: false, code: "missingDeviceAccount", message: text("请先登录此浏览器中的本机账户。", "Sign in to this browser's device account first.") };
    }
    if (config.userId === account.id) {
      return { ok: false, code: "cloudAccount", message: text("该账户已有云端会话，请使用恢复登录。", "This account already has a cloud session. Reconnect it instead.") };
    }
    if (!password || await deps.hashPassword(account.email, password) !== account.passwordHash) {
      return { ok: false, code: "wrongPassword", message: text("当前本机密码不对。", "The current device password is incorrect.") };
    }
    if (!sameSession(account.id, config)) return { ok: false, code: "sessionChanged", message: text("当前账户已切换，请重试。", "This session switched accounts. Please try again.") };
    return { ok: true, account, config };
  }

  function activationFailure(error) {
    const message = error?.status === 409 && /Account id already exists/i.test(error?.message || "")
      ? text("这个账户已在云端注册，可能使用了修改前的邮箱。请用原登录邮箱登录或找回密码。本机记录未改动。", "This account already exists in the cloud, possibly under your previous email. Sign in or reset the password using your original email. Device records were not changed.")
      : error?.status === 409
      ? text("这个邮箱已有云端账户，请使用云端登录或找回密码。本机记录未改动。", "This email already has a cloud account. Sign in or reset its password. Device records were not changed.")
      : error?.status === 429
        ? text("请求过于频繁，请稍后重试。", "Too many requests. Please try again later.")
        : text("启用云端失败，请检查验证码或稍后重试。本机记录未改动。", "Could not enable cloud sync. Check the verification code or try again later. Device records were not changed.");
    return { ok: false, code: error?.status === 409 ? "cloudAccountExists" : "activationFailed", message };
  }

  return {
    async sendCloudActivationCode({ password = "" } = {}) {
      if (passwordChangePending || activationPending) return { ok: false, code: "busy" };
      activationPending = true;
      try {
        const checked = await validateDeviceAccount(password);
        if (!checked.ok) return checked;
        if (!deps.cloudApi) return activationFailure();
        const { account, config } = checked;
        const status = await deps.cloudApi(`/auth/account-status?email=${encodeURIComponent(account.email)}`, { auth: false });
        if (!sameSession(account.id, config)) return { ok: false, code: "sessionChanged" };
        if (status?.exists === true) return activationFailure({ status: 409 });
        if (status?.exists !== false) return activationFailure();
        const payload = await deps.cloudApi("/auth/verification-code", {
          method: "POST", auth: false, body: { email: account.email, purpose: "register" }
        });
        if (!sameSession(account.id, config)) return { ok: false, code: "sessionChanged" };
        return { ok: true, retryAfter: payload?.retryAfter || 60, message: text("验证码已发送到登录邮箱，请查看收件箱。", "A verification code was sent to your sign-in email. Check your inbox.") };
      } catch (error) {
        return activationFailure(error);
      } finally {
        activationPending = false;
      }
    },

    async activateCloudAccount({ password = "", verificationCode = "" } = {}) {
      if (passwordChangePending || activationPending) return { ok: false, code: "busy" };
      if (!String(verificationCode).trim()) return { ok: false, code: "missingCode", message: text("请输入邮箱验证码。", "Enter the email verification code.") };
      activationPending = true;
      let cloudCreated = false;
      try {
        const checked = await validateDeviceAccount(password);
        if (!checked.ok) return checked;
        if (!deps.cloudApi) return activationFailure();
        const { account, config } = checked;
        const payload = await deps.cloudApi("/auth/register", {
          method: "POST", auth: false,
          body: { account: sanitizeAccountForCloud(account), password, verificationCode: String(verificationCode).trim() }
        });
        if (typeof payload?.token !== "string" || !payload.token.trim()
          || payload.account?.id !== account.id
          || normalizeEmail(payload.account?.email) !== normalizeEmail(account.email)) {
          return { ok: false, code: "invalidResponse", message: text("云端账户身份无法确认，本机记录未改动。", "The cloud identity could not be verified. Device records were not changed.") };
        }
        if (!sameSession(account.id, config)) {
          return { ok: false, code: "sessionChanged", message: text("云端账户已启用，但当前账户已切换；请重新登录该邮箱。本机记录未改动。", "The cloud account was created, but this session switched accounts. Sign in with that email. Device records were not changed.") };
        }
        cloudCreated = true;
        deps.appState.cloudConfig = { ...config, userId: account.id, token: payload.token, lastSyncAt: "", lastError: "" };
        deps.saveCloudConfig?.();
        // Keep the local owner and all record stores intact. The normal sync
        // merges them into the newly created server account with the same ID.
        deps.syncAccountStores?.();
        deps.queueCloudSync?.("state", 0);
        deps.queueCloudSync?.("account", 0);
        // Enabling a personal account must not publish a stale shared community
        // snapshot. Community changes use their own normal save/merge flow.
        deps.renderUserChip?.();
        return { ok: true, message: text("云端账户已启用，本机训练记录正在同步。", "Cloud sync is enabled. Your device's training records are syncing.") };
      } catch (error) {
        if (cloudCreated) return {
          ok: false, code: "sessionSaveFailed",
          message: text("云端账户已启用，但当前浏览器未能保存登录状态；请使用该邮箱和密码登录。本机记录仍保留。", "Your cloud account was created, but this browser could not save its session. Sign in with that email and password. Device records are preserved.")
        };
        return activationFailure(error);
      } finally {
        activationPending = false;
      }
    },

    loginDeviceAccount() {
      return deps.loginLocal?.({ deviceOnly: true });
    },

    cancelCloudRecovery() {
      return deps.logout?.({ cancelRecovery: true });
    },

    async save(values = {}) {
      const currentUser = deps.appState?.currentUser;
      if (!currentUser) return { ok: false, code: "missingUser" };
      const token = deps.appState?.cloudConfig?.token;
      const sameSession = () => currentUser.id === deps.appState?.currentUser?.id && token === deps.appState?.cloudConfig?.token;

      const mergedValues = {
        name: currentUser.name, email: currentUser.email, country: currentUser.country,
        region: currentUser.region, graduationTerm: currentUser.graduationTerm,
        ...values
      };
      const emailChanged = String(mergedValues.email).trim().toLowerCase() !== currentUser.email;
      if (emailChanged && requiresCloud() && !connected()) return { ok: false, message: "请重新登录云端账户后修改邮箱。 / Sign in again before changing your email." };
      const result = await buildAccountSaveResult({
        values: mergedValues,
        verifyOnServer: connected(),
        currentUser,
        accounts: deps.appState?.auth?.accounts || [],
        normalizeEmail: deps.normalizeEmail,
        normalizeCountry: deps.normalizeCountry,
        normalizeRegionForCountry: deps.normalizeRegionForCountry,
        normalizeGraduationTerm: deps.normalizeGraduationTerm,
        hashPassword: deps.hashPassword,
        labels: {
          missingIdentity: deps.t?.("accountMissingIdentity") || "昵称和邮箱都要填。",
          duplicateEmail: deps.t?.("accountDuplicateEmail") || "这个邮箱已经被另一个账户使用。",
          passwordRequired: deps.t?.("accountPasswordRequired") || "更改本地账户邮箱需要输入当前密码。",
          wrongPassword: deps.t?.("accountWrongPassword") || "当前密码不对，邮箱没有更新。"
        }
      });

      if (!result.ok) return result;
      if (!sameSession()) return { ok: false, message: "账户已切换。 / Account changed." };

      if (connected()) {
        try {
          const editable = ["name", "email", "country", "region", "graduationTerm", "goal", "preferences", "integrations"];
          const updates = Object.fromEntries(editable.filter(key => Object.hasOwn(values, key)).map(key => [key, result.updates[key]]));
          if (["avatarUrl", "avatarData", "avatarCleared"].some(key => Object.hasOwn(values, key))) updates.picture = result.updates.picture;
          const payload = await deps.cloudApi("/account", { method: "PATCH", body: { updates, currentPassword: values.currentPassword || "" } });
          if (!payload?.account) throw new Error("服务未返回账户资料。 / Missing account response.");
          result.updates = { ...result.updates, ...payload.account, cloudLinked: true };
          result.country = result.updates.country;
          result.region = result.updates.region;
        } catch (error) { return fail(error); }
      }
      if (!sameSession()) return { ok: false, message: "账户已切换。 / Account changed." };
      result.accounts = deps.appState.auth.accounts.map(account => account.id === currentUser.id ? { ...account, ...result.updates } : account);
      applyAccountSaveResult(deps.appState.auth, deps.userState?.value, result, {
        normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings
      });
      deps.saveAuth?.();
      deps.appState.currentUser = deps.getCurrentUser?.() || deps.appState.currentUser;
      deps.saveState?.({ checkIn: false });
      if (!connected()) deps.queueCloudSync?.("account", 0);
      deps.renderUserChip?.();
      deps.renderAll?.();
      return { ok: true, code: "saved", message: deps.t?.("accountUpdated") || "账户已更新。" };
    },

    async changePassword({ currentPassword = "", newPassword = "" } = {}) {
      if (passwordChangePending || activationPending) return { ok: false, code: "busy" };
      const currentUser = deps.appState?.currentUser;
      if (!currentUser) return { ok: false, code: "missingUser" };
      if (currentUser.provider !== "local") {
        return { ok: false, code: "thirdParty", message: text("请在 Google 账户中管理登录密码。", "Manage your sign-in password in your Google account.") };
      }
      if (!currentPassword || newPassword.length < 8 || !/[A-Za-z]/.test(newPassword) || !/\d/.test(newPassword)) {
        return { ok: false, code: "invalidPassword", message: text("请输入当前密码；新密码至少 8 位，需同时包含字母和数字。", "Enter your current password and a new password of at least 8 characters with letters and numbers.") };
      }
      const account = (deps.appState.auth?.accounts || []).find(item => item.id === currentUser.id);
      if (!account || !deps.hashPassword) return { ok: false, code: "missingAccount" };
      const config = { ...(deps.appState.cloudConfig || {}) };
      const cloudAccount = config.userId === currentUser.id || Boolean(currentUser.cloudLinked);
      const isCurrentSession = () => sameSession(currentUser.id, config);
      if (cloudAccount && (!config.token || !deps.cloudApi)) {
        return { ok: false, code: "reauthRequired", message: text("请先恢复云端登录，再修改登录密码。", "Reconnect your cloud account before changing its sign-in password.") };
      }
      passwordChangePending = true;
      let cloudPasswordChanged = false;
      let devicePasswordChanged = false;
      try {
        // Derive the replacement without mutating the stored account. A cloud
        // account's current password is checked by the server, never a stale
        // local hash left behind by an earlier client.
        let accountEmail = account.email;
        let passwordHash;
        let payload = null;
        if (!isCurrentSession()) return { ok: false, code: "sessionChanged" };
        if (cloudAccount) {
          payload = await deps.cloudApi("/auth/change-password", {
            method: "POST",
            body: { currentPassword, newPassword }
          });
          if (typeof payload?.token !== "string" || !payload.token.trim()
            || payload.account?.id !== currentUser.id
            || typeof payload.account?.email !== "string"
            || !normalizeEmail(payload.account.email)) {
            return { ok: false, code: "invalidResponse", message: text("无法确认改密结果，请重新登录后检查。", "The password-change response could not be verified. Sign in again to check.") };
          }
          cloudPasswordChanged = true;
          // Older profile forms could change only the device copy of the
          // email. The authenticated owner ID establishes identity; restore
          // the server's email and derive the replacement hash from it.
          accountEmail = normalizeEmail(payload.account.email);
          passwordHash = await deps.hashPassword(accountEmail, newPassword);
        } else {
          const currentHash = await deps.hashPassword(account.email, currentPassword);
          if (!account.passwordHash || currentHash !== account.passwordHash) {
            return { ok: false, code: "wrongPassword", message: text("当前本机密码不对，密码没有修改。", "The current device password is incorrect. Nothing was changed.") };
          }
          passwordHash = await deps.hashPassword(accountEmail, newPassword);
        }
        if (!isCurrentSession()) {
          return {
            ok: false,
            code: "sessionChanged",
            message: cloudAccount
              ? text("云端密码已修改；当前账户已切换，请用新密码登录原账户。", "The cloud password changed, but this session switched accounts. Use the new password to sign in to the original account.")
              : text("当前账户已切换，密码没有修改。", "This session switched accounts. The password was not changed.")
          };
        }
        const updated = { ...account, email: accountEmail, passwordHash };
        deps.appState.auth.accounts = deps.appState.auth.accounts.map(item => item.id === account.id ? updated : item);
        deps.appState.currentUser = updated;
        devicePasswordChanged = true;
        if (payload) {
          deps.appState.cloudConfig = { ...config, token: payload.token, lastError: "" };
          deps.saveCloudConfig?.();
        }
        deps.saveAuth?.();
        // Do not apply response.state: changing a password does not replace or
        // reload the current account's training records or unsynced drafts.
        deps.syncAccountStores?.();
        deps.renderUserChip?.();
        return {
          ok: true,
          scope: cloudAccount ? "cloud" : "local",
          message: cloudAccount
            ? text("登录密码已修改，当前设备已保持登录；其他设备需要用新密码登录。", "Your sign-in password changed. This device stays signed in; other devices must sign in with the new password.")
            : text("本机密码已修改，仅用于此浏览器中的本机账户。", "The device password changed. It only unlocks this browser's local account.")
        };
      } catch (error) {
        if (cloudPasswordChanged) return {
          ok: false, code: "sessionSaveFailed",
          message: text("云端密码已修改，但当前浏览器未能保存登录状态；请使用新密码重新登录。", "Your cloud password changed, but this browser could not save its session. Sign in again using the new password.")
        };
        if (devicePasswordChanged) return {
          ok: false, code: "deviceSaveFailed",
          message: text("本机密码已在当前页面更新，但浏览器保存未完成，请检查浏览器存储空间。", "The device password changed in this page, but browser storage did not finish saving it. Check the browser's storage space.")
        };
        return {
          ok: false,
          code: error?.status === 401 ? "reauthRequired" : "passwordChangeFailed",
          message: /Password login is not configured/i.test(error?.message || "")
            ? text("该账户尚未设置云端密码，请通过邮箱找回密码完成设置。", "This account has no cloud password yet. Set one using email password reset.")
            : error?.status === 401
            ? text("云端登录已失效，请恢复登录后再修改密码。本机密码未修改。", "Your cloud session expired. Reconnect before changing your password. The device password was not changed.")
            : text("修改密码失败，请检查当前密码后重试。本机密码未修改。", "Could not change your password. Check the current password and try again. The device password was not changed.")
        };
      } finally {
        passwordChangePending = false;
      }
    },

    async uploadResume(file) {
      if (!file) return { ok: false, code: "missingFile" };
      const ownerId = deps.appState?.currentUser?.id;
      const result = await buildResumeUploadState(file, deps.userState?.value?.resume || {}, {
        fileTooLargeLabel: deps.t?.("resumeFileTooLarge") || "简历文件太大。"
      });
      if (!result.ok) return result;
      if (ownerId !== deps.appState?.currentUser?.id) return { ok: false, message: "账户已切换。 / Account changed." };
      const resume = normalizeResumeState(result.resume);
      Object.assign(deps.userState.value, { resume });
      deps.saveState?.({ checkIn: false });
      return { ok: true, resume, meta: formatResumeUploadMeta(resume) };
    },

    async uploadAvatarMedia({ dataUrl = "", name = "avatar" } = {}) {
      if (!dataUrl || !deps.cloudApi || (deps.canUseCloud && !deps.canUseCloud())) return { ok: false, code: "unavailable" };
      try {
        const payload = await deps.cloudApi("/media", {
          method: "POST",
          body: {
            dataUrl,
            name,
            context: "account-avatar"
          }
        });
        const media = payload?.media || null;
        if (!media?.url && !media?.dataUrl) {
          return { ok: false, code: "invalidMedia" };
        }
        return { ok: true, media };
      } catch (error) {
        return {
          ok: false,
          code: "uploadFailed",
          message: error?.message || "Could not upload avatar media"
        };
      }
    },

    getResumeMeta() {
      return formatResumeUploadMeta(deps.userState?.value?.resume || {}, deps.t?.("resumeUploadHint") || "");
    },

    formatRank(user = deps.appState?.currentUser) {
      return deps.formatAccountRank?.(user) || "-";
    },

    async fetchAdminOverview(limit = 24) {
      if (!deps.cloudApi) {
        return { ok: false, code: "unavailable", message: "Cloud API is unavailable" };
      }
      const safeLimit = Math.max(1, Math.min(50, Number(limit) || 24));
      try {
        const [metricsPayload, eventsPayload] = await Promise.all([
          deps.cloudApi("/admin/metrics"),
          deps.cloudApi(`/admin/audit-events?limit=${safeLimit}`)
        ]);
        return {
          ok: true,
          metrics: metricsPayload?.metrics || {},
          events: Array.isArray(eventsPayload?.events) ? eventsPayload.events : []
        };
      } catch (error) {
        if (error?.status === 401 || error?.status === 403) {
          return { ok: false, code: "forbidden", message: error.message || "Admin access is required" };
        }
        return {
          ok: false,
          code: "error",
          message: error?.message || "Could not load admin overview"
        };
      }
    },

    logout() {
      deps.logout?.();
      return { ok: true };
    }
  };
}
