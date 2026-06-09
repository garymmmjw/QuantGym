import { createAuthCloudClient } from '../../api/authCloudClient.js';
import { createCloudSessionController } from '../../state/cloudSessionController.js';
import { createAccountAuthController } from './authController.js';
import { createAccountController } from './controller.js';
import { createAccountSessionController } from './sessionController.js';

export function createAccountControllerBundle(deps = {}) {
  const accountSessionController = createAccountSessionController({
    elements: deps.elements,
    documentRef: deps.documentRef,
    windowRef: deps.windowRef,
    getAppState: deps.getAppState,
    getUserStateStore: deps.getUserStateStore,
    getCurrentUser: deps.getCurrentUser,
    loadState: deps.loadState,
    clearProblemLookupCaches: deps.clearProblemLookupCaches,
    problemSocialState: deps.problemSocialState,
    pruneProblemCatalog: deps.pruneProblemCatalog,
    consumeIncomingCapture: deps.consumeIncomingCapture,
    applySidebarState: deps.applySidebarState,
    getAuthReadyMessage: deps.getAuthReadyMessage,
    renderGoogleClientInput: deps.renderGoogleClientInput,
    applyLanguage: deps.applyLanguage,
    renderAll: deps.renderAll,
    restoreRouteModule: deps.restoreRouteModule,
    refreshProblemCatalog: deps.refreshProblemCatalog,
    refreshProblemSocial: deps.refreshProblemSocial,
    t: deps.t
  });

  const authCloudClient = createAuthCloudClient({
    cloudApi: deps.cloudApi,
    cloudStatePayload: deps.cloudStatePayload,
    getUserCatalogProblems: deps.getUserCatalogProblems
  });

  const cloudSessionController = createCloudSessionController({
    getAppState: deps.getAppState,
    getUserStateStore: deps.getUserStateStore,
    normalizeAccount: deps.normalizeAccount,
    upsertLocalAccount: deps.upsertLocalAccount,
    applyCloudSessionConfig: deps.applyCloudSessionConfig,
    saveCloudConfig: deps.saveCloudConfig,
    buildCloudSessionState: deps.buildCloudSessionState,
    loadStateForUser: deps.loadStateForUser,
    mergeProblemStates: deps.mergeProblemStates,
    mergeCloudState: deps.mergeCloudState,
    normalizeState: deps.normalizeState,
    writeUserState: deps.writeUserState,
    localStatePayload: deps.localStatePayload,
    userStateKey: deps.userStateKey,
    clearProblemLookupCaches: deps.clearProblemLookupCaches,
    buildCloudSessionCommunity: deps.buildCloudSessionCommunity,
    normalizeCommunityStore: deps.normalizeCommunityStore,
    mergeCloudCommunity: deps.mergeCloudCommunity,
    saveCommunity: deps.saveCommunity,
    queueCloudSync: deps.queueCloudSync,
    invalidateLeaderboardCloud: deps.invalidateLeaderboardCloud
  });

  const accountAuthController = createAccountAuthController({
    elements: deps.elements,
    getAppState: deps.getAppState,
    getUserStateStore: deps.getUserStateStore,
    defaultCountry: deps.defaultCountry,
    defaultRegion: deps.defaultRegion,
    defaultGraduationTerm: deps.defaultGraduationTerm,
    normalizeEmail: deps.normalizeEmail,
    makeId: deps.makeId,
    hashPassword: deps.hashPassword,
    buildLocalAccount: deps.buildLocalAccount,
    addLocalAccount: deps.addLocalAccount,
    setCurrentUserId: deps.setCurrentUserId,
    setGoogleClientId: deps.setGoogleClientId,
    getGoogleClientId: deps.getGoogleClientId,
    buildGoogleAccountFromPayload: deps.buildGoogleAccountFromPayload,
    applyGoogleAccount: deps.applyGoogleAccount,
    parseJwt: deps.parseJwt,
    saveAuth: deps.saveAuth,
    saveCloudConfig: deps.saveCloudConfig,
    createBaseState: deps.createBaseState,
    migrateLegacyState: deps.migrateLegacyState,
    loadStateForUser: deps.loadStateForUser,
    sendCloudVerificationCode: authCloudClient.sendVerificationCode,
    registerCloudAccount: authCloudClient.registerAccount,
    loginCloudAccount: authCloudClient.loginAccount,
    loginCloudGoogle: authCloudClient.loginGoogle,
    applyCloudSession: cloudSessionController.apply,
    normalizeAccount: deps.normalizeAccount,
    renderSession: accountSessionController.renderSession,
    renderGoogleClientInput: deps.renderGoogleClientInput,
    initGoogleLogin: deps.initGoogleLogin,
    setRegisterCodeButtonBusy: deps.setRegisterCodeButtonBusy,
    startRegisterCodeCooldown: deps.startRegisterCodeCooldown,
    showAuthMessage: deps.showAuthMessage,
    getVerificationErrorMessage: deps.getVerificationErrorMessage,
    getAuthErrorMessage: deps.getAuthErrorMessage,
    t: deps.t
  });

  const accountController = createAccountController({
    elements: deps.elements,
    getAppState: deps.getAppState,
    getUserState: deps.getUserState,
    normalizeEmail: deps.normalizeEmail,
    normalizeCountry: deps.normalizeCountry,
    normalizeRegionForCountry: deps.normalizeRegionForCountry,
    normalizeGraduationTerm: deps.normalizeGraduationTerm,
    normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings,
    hashPassword: deps.hashPassword,
    saveAuth: deps.saveAuth,
    getCurrentUser: deps.getCurrentUser,
    saveState: deps.saveState,
    queueCloudSync: deps.queueCloudSync,
    renderUserChip: accountSessionController.renderUserChip,
    renderAll: deps.renderAll,
    switchModule: deps.switchModule,
    t: deps.t
  });

  return {
    accountAuthController,
    renderSession: accountSessionController.renderSession,
    renderUserChip: accountSessionController.renderUserChip,
    switchAuthTab: accountSessionController.switchAuthTab,
    sendRegisterVerificationCode: accountAuthController.sendRegisterVerificationCode,
    registerLocal: accountAuthController.registerLocal,
    loginLocal: accountAuthController.loginLocal,
    logout: accountAuthController.logout,
    resetEmailAuthFlow: accountAuthController.resetEmailAuthFlow,
    saveGoogleClientId: accountAuthController.saveGoogleClientId,
    saveAccount: accountController.saveAccount,
    submitEmailAuth: accountAuthController.submitEmailAuth
  };
}
