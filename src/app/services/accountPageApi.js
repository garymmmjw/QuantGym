import { buildAccountSaveResult, applyAccountSaveResult } from "../../modules/account/save.js";
import { buildResumeUploadState } from "../../modules/resume/file.js";
import { normalizeResumeState } from "../../modules/resume/data.js";
import { formatResumeUploadMeta } from "../../modules/resume/file.js";
import { USER_STATE_PREFIX } from '../../constants.js';
import { migrateVerifiedCareerOwner } from '../../state/careerOwnerMigration.js';
import { deviceRecordCandidates, deviceRecordStorage, deviceRecordStamp, markDeviceRecordsRecovered } from '../../state/deviceRecordRecovery.js';

export function createAccountPageApi(deps = {}) {
  const connected = () => Boolean(deps.appState?.cloudConfig?.token && deps.appState?.cloudConfig?.userId === deps.appState?.currentUser?.id);
  const fail = error => ({ ok: false, code: error?.status === 401 ? "reauthenticate" : "saveFailed", message: error?.status === 401 ? "会话已失效或当前密码不正确，请重新登录或检查密码。 / Session expired or incorrect password." : error?.message || "保存失败，请重试。 / Could not save. Try again." });
  let passwordChangePending = false;
  let recordRecoveryPending = false;
  const text = (zh, en) => deps.getLanguage?.() === "en" ? en : zh;
  const normalizeEmail = deps.normalizeEmail || ((value) => String(value || "").trim().toLowerCase());

  const sameSession = (userId, config) => deps.appState?.currentUser?.id === userId
    && deps.appState.cloudConfig?.userId === config.userId
    && deps.appState.cloudConfig?.token === config.token
    && deps.appState.cloudConfig?.endpoint === config.endpoint;

  const signInRequired = () => ({ ok: false, code: "reauthRequired", message: text(
    "请先登录并完成账号验证，原有记录会保留。", "Sign in and verify your account first. Existing records are preserved.") });

  return {
    getDeviceRecordRecovery() {
      try {
        return { count: deviceRecordCandidates(deps.appState?.auth, deps.appState?.currentUser, deviceRecordStorage(deps.storage)).length };
      } catch { return { count: 0 }; }
    },

    async restoreDeviceRecords({ password = '' } = {}) {
      if (recordRecoveryPending) return { ok: false, code: 'busy' };
      const user = deps.appState?.currentUser;
      if (!user || !connected() || !deps.cloudApi) return signInRequired();
      if (!password || !deps.hashPassword) return { ok: false, code: 'passwordRequired', message: text('请输入保存旧记录时使用的密码。', 'Enter the password originally used for these device records.') };
      const config = { ...deps.appState.cloudConfig };
      const email = normalizeEmail(user.email);
      const isCurrent = () => sameSession(user.id, config) && normalizeEmail(deps.appState.currentUser?.email) === email;
      const changed = () => ({ ok: false, code: 'sessionChanged', message: text('账号或登录状态已变化，请重新操作。', 'Your account or session changed. Try again.') });
      recordRecoveryPending = true;
      try {
        const storage = deviceRecordStorage(deps.storage);
        if (!storage?.getItem || !storage?.setItem) throw new Error(text('浏览器存储不可用，旧记录未修改。', 'Browser storage is unavailable. Existing records were preserved.'));
        const passwordHash = await deps.hashPassword(email, password);
        if (!isCurrent()) return changed();
        let sources = deviceRecordCandidates(deps.appState.auth, user, storage).filter(profile => profile.passwordHash === passwordHash);
        if (!sources.length) return { ok: false, code: 'wrongPassword', message: text('没有找到使用此原密码的待恢复记录，请检查密码。', 'No pending device records match that original password. Check the password.') };
        const verified = await deps.cloudApi('/account');
        if (!isCurrent()) return changed();
        if (verified?.account?.id !== user.id || normalizeEmail(verified.account.email) !== email) {
          return { ok: false, code: 'invalidResponse', message: text('无法验证当前账号，旧记录未修改。请重新登录。', 'The current account could not be verified. Existing records were preserved. Sign in again.') };
        }
        // Re-read after the request: another tab may have updated the originals.
        sources = deviceRecordCandidates(deps.appState.auth, user, storage).filter(profile => profile.passwordHash === passwordHash);
        if (!sources.length) return { ok: true, restored: 0, message: text('这些记录已经恢复。', 'These records are already restored.') };
        const userStateKey = deps.userStateKey || (id => `${USER_STATE_PREFIX}.${id}`);
        const targetKey = userStateKey(user.id);
        const targetRaw = storage.getItem(targetKey);
        let mergedState = deps.userState?.value;
        if (!mergedState || !deps.mergeCloudState) throw new Error(text('记录合并暂不可用，旧记录未修改。', 'Record merging is unavailable. Existing records were preserved.'));
        if (targetRaw !== null) {
          const durable = JSON.parse(targetRaw);
          if (!durable || typeof durable !== 'object' || Array.isArray(durable)) throw new Error('Invalid current account records.');
          mergedState = deps.mergeCloudState(durable, mergedState);
        }
        const snapshots = sources.map(source => {
          const raw = storage.getItem(userStateKey(source.id));
          if (raw !== null) {
            const data = JSON.parse(raw);
            if (!data || typeof data !== 'object' || Array.isArray(data)) throw new Error('Invalid legacy records.');
            mergedState = deps.mergeCloudState(data, mergedState);
          }
          return { ...source, raw };
        });
        const serialized = JSON.stringify(deps.localStatePayload ? deps.localStatePayload(mergedState) : mergedState);
        for (const source of snapshots) {
          const key = `quantgym.device-record-recovery.v1:${encodeURIComponent(source.id)}:${encodeURIComponent(user.id)}`;
          const existing = storage.getItem(key);
          if (existing !== null) {
            const backup = JSON.parse(existing);
            if (backup.version !== 1 || backup.sourceOwnerId !== source.id || backup.targetOwnerId !== user.id) throw new Error('Invalid recovery backup.');
          } else storage.setItem(key, JSON.stringify({ version: 1, sourceOwnerId: source.id, targetOwnerId: user.id, sourceUserState: source.raw, targetUserState: targetRaw }));
        }
        for (const source of snapshots) {
          if (deviceRecordStamp(source.id, storage) !== source.sourceStamp || storage.getItem(targetKey) !== targetRaw) throw new Error(text('另一个页面更新了记录，请重试。', 'Another page updated these records. Try again.'));
          (deps.migrateVerifiedCareerOwner || migrateVerifiedCareerOwner)({ sourceOwnerId: source.id, targetOwnerId: user.id, verified: true, storage, eventTarget: deps.eventTarget || globalThis.window });
        }
        if (!isCurrent()) return changed();
        if (storage.getItem(targetKey) !== targetRaw) throw new Error(text('另一个页面更新了记录，请重试。', 'Another page updated these records. Try again.'));
        storage.setItem(targetKey, serialized);
        if (storage.getItem(targetKey) !== serialized) throw new Error('Record storage verification failed.');
        deps.userState.value = mergedState;
        const auth = deps.appState.auth;
        const previousAccounts = auth.accounts, previousLegacy = auth.legacyAccounts;
        markDeviceRecordsRecovered(auth, sources, user.id);
        try {
          if (deps.saveAuth?.() === false) throw new Error('Recovery metadata could not be saved.');
        } catch (error) {
          auth.accounts = previousAccounts;
          auth.legacyAccounts = previousLegacy;
          throw error;
        }
        deps.syncAccountStores?.();
        deps.queueCloudSync?.('state', 0);
        return { ok: true, restored: sources.length, message: text('旧记录已合并到当前账号，原始资料仍保留。', 'Device records were merged into your account. The originals were preserved.') };
      } catch (error) {
        return { ok: false, code: error?.status === 401 ? 'reauthRequired' : 'recoveryFailed', message: error?.status === 401
          ? text('登录已失效，请重新登录后恢复；旧记录已保留。', 'Your session expired. Sign in again to restore your preserved records.')
          : error?.message || text('恢复未完成，旧记录已保留，请重试。', 'Recovery did not complete. Existing records were preserved. Try again.') };
      } finally { recordRecoveryPending = false; }
    },

    // Compatibility for older callers: account verification now uses the same
    // sign-in/registration flow. These entry points cannot create a second identity.
    async sendCloudActivationCode() { return signInRequired(); },
    async activateCloudAccount() { return signInRequired(); },
    loginDeviceAccount() { return deps.loginLocal?.(); },

    cancelCloudRecovery() {
      return deps.logout?.({ cancelRecovery: true });
    },

    async save(values = {}) {
      const currentUser = deps.appState?.currentUser;
      if (!currentUser) return { ok: false, code: "missingUser" };
      if (!connected() || !deps.cloudApi) return signInRequired();
      const config = { ...deps.appState.cloudConfig };
      const isCurrentSession = () => sameSession(currentUser.id, config);

      const mergedValues = {
        name: currentUser.name, email: currentUser.email, country: currentUser.country,
        region: currentUser.region, graduationTerm: currentUser.graduationTerm,
        ...values
      };
      const result = await buildAccountSaveResult({
        values: mergedValues,
        verifyOnServer: true,
        currentUser,
        accounts: [currentUser],
        normalizeEmail: deps.normalizeEmail,
        normalizeCountry: deps.normalizeCountry,
        normalizeRegionForCountry: deps.normalizeRegionForCountry,
        normalizeGraduationTerm: deps.normalizeGraduationTerm,
        hashPassword: deps.hashPassword,
        labels: {
          missingIdentity: deps.t?.("accountMissingIdentity") || "昵称和邮箱都要填。",
          duplicateEmail: deps.t?.("accountDuplicateEmail") || "这个邮箱已经被另一个账户使用。",
          passwordRequired: deps.t?.("accountPasswordRequired") || "更改登录邮箱需要输入当前密码。",
          wrongPassword: deps.t?.("accountWrongPassword") || "当前密码不对，邮箱没有更新。"
        }
      });

      if (!result.ok) return result;
      if (!isCurrentSession()) return { ok: false, message: "账户已切换。 / Account changed." };

      {
        try {
          const editable = ["name", "email", "country", "region", "graduationTerm", "goal", "preferences", "integrations"];
          const updates = Object.fromEntries(editable.filter(key => Object.hasOwn(values, key)).map(key => [key, result.updates[key]]));
          if (["avatarUrl", "avatarData", "avatarCleared"].some(key => Object.hasOwn(values, key))) updates.picture = result.updates.picture;
          const payload = await deps.cloudApi("/account", { method: "PATCH", body: { updates, currentPassword: values.currentPassword || "" } });
          if (payload?.account?.id !== currentUser.id) throw new Error("无法确认账户资料，请重新登录。 / Account response could not be verified.");
          result.updates = { ...result.updates, ...payload.account, cloudLinked: true };
          result.country = result.updates.country;
          result.region = result.updates.region;
        } catch (error) { return fail(error); }
      }
      if (!isCurrentSession()) return { ok: false, message: "账户已切换。 / Account changed." };
      result.accounts = deps.appState.auth.accounts.map(account => account.id === currentUser.id ? { ...account, ...result.updates } : account);
      applyAccountSaveResult(deps.appState.auth, deps.userState?.value, result, {
        normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings
      });
      deps.saveAuth?.();
      deps.appState.currentUser = deps.getCurrentUser?.() || deps.appState.currentUser;
      deps.saveState?.({ checkIn: false });
      deps.renderUserChip?.();
      deps.renderAll?.();
      return { ok: true, code: "saved", message: deps.t?.("accountUpdated") || "账户已更新。" };
    },

    async changePassword({ currentPassword = "", newPassword = "" } = {}) {
      if (passwordChangePending) return { ok: false, code: "busy" };
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
      const isCurrentSession = () => sameSession(currentUser.id, config);
      if (!connected() || !deps.cloudApi) return signInRequired();
      passwordChangePending = true;
      let cloudPasswordChanged = false;
      try {
        // Derive the replacement without mutating the stored account. A cloud
        // account's current password is checked by the server, never a stale
        // local hash left behind by an earlier client.
        let accountEmail = account.email;
        let passwordHash;
        let payload = null;
        if (!isCurrentSession()) return { ok: false, code: "sessionChanged" };
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
        if (!isCurrentSession()) {
          return {
            ok: false,
            code: "sessionChanged",
            message: text("登录密码已修改；当前账户已切换，请用新密码登录原账户。", "The password changed, but this session switched accounts. Use the new password to sign in to the original account.")
          };
        }
        const updated = { ...account, email: accountEmail, passwordHash, cloudLinked: true };
        deps.appState.auth.accounts = deps.appState.auth.accounts.map(item => item.id === account.id ? updated : item);
        deps.appState.currentUser = updated;
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
          scope: "cloud",
          message: text("登录密码已修改，当前设备已保持登录；其他设备需要用新密码登录。", "Your sign-in password changed. This device stays signed in; other devices must sign in with the new password.")
        };
      } catch (error) {
        if (cloudPasswordChanged) return {
          ok: false, code: "sessionSaveFailed",
          message: text("登录密码已修改，但当前浏览器未能保存登录状态；请使用新密码重新登录。", "Your sign-in password changed, but this browser could not save its session. Sign in again using the new password.")
        };
        return {
          ok: false,
          code: error?.status === 401 ? "reauthRequired" : "passwordChangeFailed",
          message: /Password login is not configured/i.test(error?.message || "")
            ? text("该账户尚未设置登录密码，请通过邮箱找回密码完成设置。", "This account has no sign-in password yet. Set one using email password reset.")
            : error?.status === 401
            ? text("登录已失效，请恢复登录后再修改密码。密码未修改。", "Your session expired. Sign in again before changing your password. Your password was not changed.")
            : text("修改密码失败，请检查当前密码后重试。密码未修改。", "Could not change your password. Check the current password and try again. Your password was not changed.")
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
