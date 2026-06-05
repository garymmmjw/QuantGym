import {
  applyAccountSaveResult,
  buildAccountSaveResult,
  readAccountForm
} from './save.js';

export function createAccountController(deps = {}) {
  const {
    elements,
    getAppState,
    getUserState,
    normalizeEmail,
    normalizeCountry,
    normalizeRegionForCountry,
    normalizeGraduationTerm,
    normalizeLeaderboardSettings,
    hashPassword,
    saveAuth,
    getCurrentUser,
    saveState,
    queueCloudSync,
    renderUserChip,
    renderAll,
    switchModule,
    t
  } = deps;

  async function saveAccount() {
    const appState = getAppState();
    const userState = getUserState();
    if (!appState.currentUser) return;
    const result = await buildAccountSaveResult({
      values: readAccountForm(elements),
      currentUser: appState.currentUser,
      accounts: appState.auth.accounts,
      normalizeEmail,
      normalizeCountry,
      normalizeRegionForCountry,
      normalizeGraduationTerm,
      hashPassword
    });
    if (!result.ok) {
      if (result.message) elements.accountMessage.textContent = result.message;
      return;
    }

    applyAccountSaveResult(appState.auth, userState, result, {
      normalizeLeaderboardSettings
    });
    saveAuth();
    appState.currentUser = getCurrentUser();
    saveState();
    queueCloudSync("account", 0);
    renderUserChip();
    renderAll();
    switchModule("account");
    elements.accountMessage.textContent = t("accountUpdated");
  }

  return {
    saveAccount
  };
}
