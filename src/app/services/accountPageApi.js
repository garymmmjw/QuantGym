import { buildAccountSaveResult, applyAccountSaveResult } from "../../modules/account/save.js";
import { buildResumeUploadState } from "../../modules/resume/file.js";
import { normalizeResumeState } from "../../modules/resume/data.js";
import { formatResumeUploadMeta } from "../../modules/resume/file.js";

export function createAccountPageApi(deps = {}) {
  return {
    async save(values = {}) {
      const currentUser = deps.appState?.currentUser;
      if (!currentUser) return { ok: false, code: "missingUser" };

      const result = await buildAccountSaveResult({
        values,
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

      applyAccountSaveResult(deps.appState.auth, deps.userState?.value, result, {
        normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings
      });
      deps.saveAuth?.();
      deps.appState.currentUser = deps.getCurrentUser?.() || deps.appState.currentUser;
      deps.saveState?.();
      deps.queueCloudSync?.("account", 0);
      deps.renderUserChip?.();
      deps.renderAll?.();
      return { ok: true, message: deps.t?.("accountUpdated") || "账户已更新。" };
    },

    async uploadResume(file) {
      if (!file) return { ok: false, code: "missingFile" };
      const result = await buildResumeUploadState(file, deps.userState?.value?.resume || {}, {
        fileTooLargeLabel: deps.t?.("resumeFileTooLarge") || "简历文件太大。"
      });
      if (!result.ok) return result;
      const resume = normalizeResumeState(result.resume);
      Object.assign(deps.userState.value, { resume });
      deps.saveState?.();
      return { ok: true, resume, meta: formatResumeUploadMeta(resume) };
    },

    getResumeMeta() {
      return formatResumeUploadMeta(deps.userState?.value?.resume || {}, deps.t?.("resumeUploadHint") || "");
    },

    formatRank(user = deps.appState?.currentUser) {
      return deps.formatAccountRank?.(user) || "-";
    },

    logout() {
      deps.logout?.();
      return { ok: true };
    }
  };
}
