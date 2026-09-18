import { normalizeLeetcodeConnection } from "../../features/account/accountCenterData.js";
export function readAccountForm(elements = {}) {
  return {
    name: elements.accountNameInput?.value?.trim() || "",
    email: elements.accountEmailInput?.value || "",
    country: elements.accountCountrySelect?.value || "",
    region: elements.accountRegionSelect?.value || "",
    graduationTerm: elements.accountGraduationTermInput?.value || "",
    avatarUrl: elements.accountAvatarUrl?.value?.trim() || "",
    avatarData: elements.accountForm?.dataset?.avatarData || "",
    avatarCleared: Boolean(elements.accountForm?.dataset?.avatarCleared),
    currentPassword: elements.accountCurrentPassword?.value || ""
  };
}

export async function buildAccountSaveResult(options = {}) {
  const values = options.values || {};
  const currentUser = options.currentUser;
  if (!currentUser) return { ok: false, code: "missingUser", message: "" };

  const labels = {
    missingIdentity: "昵称和邮箱都要填。",
    duplicateEmail: "这个邮箱已经被另一个账户使用。",
    passwordRequired: "更改本地账户邮箱需要输入当前密码。",
    wrongPassword: "当前密码不对，邮箱没有更新。",
    ...(options.labels || {})
  };
  const normalizeEmail = options.normalizeEmail || ((value) => String(value || "").trim().toLowerCase());
  const normalizeCountry = options.normalizeCountry || ((value) => value || "china");
  const normalizeRegionForCountry = options.normalizeRegionForCountry || ((region) => region || "");
  const normalizeGraduationTerm = options.normalizeGraduationTerm || ((value) => value || "");
  const hashPassword = options.hashPassword || (async () => "");
  const now = options.now || new Date().toISOString();

  const name = String(values.name || "").trim();
  const email = normalizeEmail(values.email);
  const country = normalizeCountry(values.country);
  const region = normalizeRegionForCountry(values.region, country);
  const graduationTerm = normalizeGraduationTerm(values.graduationTerm);
  const picture = values.avatarCleared
    ? ""
    : values.avatarData || values.avatarUrl || currentUser.picture || "";

  if (!name || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return { ok: false, code: "missingIdentity", message: labels.missingIdentity };
  }

  const duplicate = (options.accounts || []).some((account) => (
    account.id !== currentUser.id && normalizeEmail(account.email) === email
  ));
  if (duplicate) {
    return { ok: false, code: "duplicateEmail", message: labels.duplicateEmail };
  }

  const updates = {
    name,
    email,
    country,
    region,
    graduationTerm,
    picture,
    updatedAt: now
  };

  if (values.goal !== undefined) updates.goal = String(values.goal).trim().slice(0, 160);
  if (values.preferences !== undefined) {
    const preferences = { ...(currentUser.preferences || {}), ...values.preferences };
    updates.preferences = {
      language: preferences.language === "en" ? "en" : "zh",
      theme: preferences.theme === "dark" ? "dark" : "light"
    };
  }
  if (values.integrations !== undefined) {
    try { updates.integrations = { leetcode: normalizeLeetcodeConnection(values.integrations.leetcode) }; }
    catch (error) { return { ok: false, code: "invalidConnection", message: error.message }; }
  }
  if (normalizeEmail(currentUser.email) !== email && currentUser.provider !== "local") {
    return { ok: false, code: "providerEmail", message: "请在登录服务提供方管理邮箱。 / Manage your email with your sign-in provider." };
  }
  if (currentUser.provider === "local" && normalizeEmail(currentUser.email) !== email) {
    if (!values.currentPassword) {
      return { ok: false, code: "passwordRequired", message: labels.passwordRequired };
    }
    const oldHash = await hashPassword(currentUser.email, values.currentPassword);
    if (!options.verifyOnServer && oldHash !== currentUser.passwordHash) {
      return { ok: false, code: "wrongPassword", message: labels.wrongPassword };
    }
    updates.passwordHash = await hashPassword(email, values.currentPassword);
  }

  return {
    ok: true,
    country,
    region,
    updates,
    accounts: (options.accounts || []).map((account) => (
      account.id === currentUser.id ? { ...account, ...updates } : account
    ))
  };
}

export function applyAccountSaveResult(auth = {}, state = {}, result = {}, options = {}) {
  if (!result.ok) return { changed: false };
  auth.accounts = result.accounts;
  state.leaderboard = options.normalizeLeaderboardSettings?.({
    ...(state.leaderboard || {}),
    country: result.country,
    region: result.region
  }) || state.leaderboard;
  return { changed: true };
}
