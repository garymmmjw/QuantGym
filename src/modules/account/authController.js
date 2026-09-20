import { cancelCloudReauthentication, getCloudReauthentication } from "../../state/cloudReauthentication.js";
import { deviceRecordStamp, deviceRecordStorage, markDeviceRecordsRecovered } from '../../state/deviceRecordRecovery.js';

export function createAccountAuthController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getAppState = () => deps.getAppState?.() || {};
  const getUserStateStore = () => deps.getUserStateStore?.() || null;
  const text = (key, params) => deps.t?.(key, params) || key;
  const authErrorMessage = error => error?.code === 'CAREER_OWNER_MIGRATION_FAILED'
    ? error.message : deps.getAuthErrorMessage?.(error);
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();
  const requiresCloudLogin = () => Boolean((deps.getCloudReauthentication || getCloudReauthentication)());
  let authAttemptSequence = 0;
  // All sign-in methods share an epoch. A newer attempt or logout owns the
  // session, even if an earlier request finishes after the login page closes.
  const beginAuthAttempt = () => ({ id: ++authAttemptSequence, cloudOnly: requiresCloudLogin() });
  const isCurrentAttempt = (attempt) => attempt.id === authAttemptSequence;

  function requireValidCloudSession(session, email) {
    if (typeof session?.token !== "string" || !session.token.trim() || typeof session?.account?.id !== "string" || !session.account.id.trim()
      || (email && deps.normalizeEmail?.(session.account.email) !== email)) {
      throw new Error("Invalid cloud session response");
    }
    return session;
  }

  function savedProfiles() {
    const auth = getAppState().auth || {};
    return [...new Map([...(auth.legacyAccounts || []), ...(auth.accounts || [])]
      .filter(account => account?.id).map(account => [account.id, account])).values()];
  }

  function passwordOwnerLinks(account, email, passwordHash) {
    if (typeof passwordHash !== 'string' || !passwordHash || deps.normalizeEmail?.(account.email) !== email) return [];
    return savedProfiles().filter(profile => profile.id !== account.id && profile.provider === 'local'
      && deps.normalizeEmail?.(profile.email) === email && profile.passwordHash === passwordHash && sourceNeedsRecovery(profile, account.id))
      .map(profile => ({ sourceOwnerId: profile.id, targetOwnerId: account.id, method: 'password' }));
  }

  function sourceNeedsRecovery(profile, targetOwnerId) {
    if (profile?.recordRecovery?.targetOwnerId !== targetOwnerId) return true;
    const stamp = deviceRecordStamp(profile.id, deviceRecordStorage(deps.storage));
    return !stamp || stamp !== profile.recordRecovery.sourceStamp;
  }

  function verifiedLocalState(ownerId, links = []) {
    const states = [...links.map(link => link.sourceOwnerId), ownerId]
      .map(id => deps.loadStateForUser?.(id)).filter(Boolean);
    if (!states.length) return deps.createBaseState?.();
    return states.reduce((merged, state) => {
      if (merged === state) return merged;
      if (!deps.mergeCloudState) throw new Error('Verified record merge is unavailable.');
      return deps.mergeCloudState(merged, state);
    });
  }

  function ownerLinkOptions(links) {
    return { careerOwnerLinks: links, ...(links.length === 1 ? { careerOwnerLink: links[0] } : {}) };
  }

  function recoverySources(links) {
    const storage = deviceRecordStorage(deps.storage);
    return links.map(link => ({ id: link.sourceOwnerId, sourceStamp: deviceRecordStamp(link.sourceOwnerId, storage) }));
  }

  function markAuthenticated(auth = {}) {
    auth.lastAuthenticatedAt = nowIso();
    return auth.lastAuthenticatedAt;
  }

  function getLoginEmail() {
    const elements = getElements();
    return deps.normalizeEmail?.(elements.loginEmail?.value) || "";
  }

  function getResetPasswordEmail() {
    const elements = getElements();
    return deps.normalizeEmail?.(elements.resetPasswordEmail?.value || elements.loginEmail?.value) || "";
  }

  function setEmailAuthStep(step = "email", email = "") {
    const elements = getElements();
    const isPassword = step === "password";
    const isRegister = step === "register";
    const isReset = step === "reset";
    elements.loginForm?.classList?.toggle?.("hidden", isRegister || isReset);
    elements.registerForm?.classList?.toggle?.("hidden", !isRegister);
    elements.resetPasswordForm?.classList?.toggle?.("hidden", !isReset);
    if (elements.loginForm) elements.loginForm.dataset.authStep = isPassword ? "password" : "email";
    elements.loginPassword?.classList?.remove?.("hidden");
    if (elements.loginPassword) {
      elements.loginPassword.required = isPassword;
    }
    if (email && elements.loginEmail) elements.loginEmail.value = email;
    if (email && elements.registerEmail) elements.registerEmail.value = email;
    if (email && elements.resetPasswordEmail) elements.resetPasswordEmail.value = email;
    if (!isRegister && elements.registerForm) {
      elements.registerForm.reset();
      delete elements.registerForm.dataset.verificationOptional;
      if (email && elements.registerEmail) elements.registerEmail.value = email;
    }
    if (!isReset && elements.resetPasswordForm) {
      elements.resetPasswordForm.reset();
      if (email && elements.resetPasswordEmail) elements.resetPasswordEmail.value = email;
    }
    return step;
  }

  function resetEmailAuthFlow() {
    setEmailAuthStep("email", getLoginEmail());
    deps.showAuthMessage?.("");
  }

  async function getCloudAccountExists(email) {
    if (!deps.checkCloudAccountStatus) return null;
    try {
      const result = await deps.checkCloudAccountStatus(email);
      return typeof result?.exists === "boolean" ? result.exists : null;
    } catch {
      return null;
    }
  }

  function showPasswordStep(email, status = "unknown") {
    const elements = getElements();
    setEmailAuthStep("password", email);
    if (elements.loginForm) elements.loginForm.dataset.cloudAccountStatus = status;
    deps.showAuthMessage?.("");
    elements.loginPassword?.focus?.();
    return true;
  }

  function showRegisterStep(email) {
    const elements = getElements();
    setEmailAuthStep("register", email);
    deps.showAuthMessage?.("");
    elements.registerName?.focus?.();
    return true;
  }

  function startPasswordReset() {
    const elements = getElements();
    const email = getLoginEmail();
    if (!email || !email.includes("@")) {
      deps.showAuthMessage?.(text("authNeedEmail"), true);
      return false;
    }
    setEmailAuthStep("reset", email);
    deps.showAuthMessage?.("");
    elements.resetPasswordVerificationCode?.focus?.();
    return true;
  }

  function cancelPasswordReset() {
    const email = getResetPasswordEmail();
    setEmailAuthStep(email ? "password" : "email", email);
    deps.showAuthMessage?.("");
    return true;
  }

  async function submitEmailAuth() {
    const elements = getElements();
    const email = getLoginEmail();
    if (!email || !email.includes("@")) {
      deps.showAuthMessage?.(text("authNeedEmail"), true);
      return false;
    }
    if (elements.loginForm?.dataset.authStep === "password") {
      return loginLocal();
    }
    if (elements.loginPassword?.value) {
      return loginLocal();
    }
    const attempt = beginAuthAttempt();
    const cloudExists = await getCloudAccountExists(email);
    if (!isCurrentAttempt(attempt)) return false;
    if (cloudExists === false) {
      if (requiresCloudLogin()) {
        deps.showAuthMessage?.(text("authCloudAccountMissing"), true);
        return false;
      }
      return showRegisterStep(email);
    }
    return showPasswordStep(email, cloudExists === true ? "cloud" : "unknown");
  }

  async function sendRegisterVerificationCode() {
    const elements = getElements();
    const email = deps.normalizeEmail?.(elements.registerEmail.value) || "";
    if (!email || !email.includes("@")) {
      deps.showAuthMessage?.(text("authNeedEmail"), true);
      return;
    }
    delete elements.registerForm.dataset.verificationOptional;
    deps.setRegisterCodeButtonBusy?.(true, text("sending"));
    try {
      const result = await deps.sendCloudVerificationCode?.(email, "register");
      deps.startRegisterCodeCooldown?.(Number(result?.cooldownSeconds || 60));
      const devCode = result?.devCode ? text("authDevCode", { code: result.devCode }) : "";
      const delivery = result?.delivery === "dev" ? text("authDeliveryDev") : text("authDeliveryEmail");
      deps.showAuthMessage?.(text("authVerificationSent", { email, delivery, devCode }));
    } catch (error) {
      if (!error?.status) {
        deps.showAuthMessage?.(text("authCloudVerificationUnavailable"), true);
      } else {
        deps.showAuthMessage?.(deps.getVerificationErrorMessage?.(error), true);
      }
      deps.setRegisterCodeButtonBusy?.(false);
    }
  }

  async function sendPasswordResetCode() {
    const email = getResetPasswordEmail();
    if (!email || !email.includes("@")) {
      deps.showAuthMessage?.(text("authNeedEmail"), true);
      return;
    }

    deps.setResetPasswordCodeButtonBusy?.(true, text("sending"));
    try {
      const result = await deps.sendCloudVerificationCode?.(email, "password_reset");
      deps.startResetPasswordCodeCooldown?.(Number(result?.cooldownSeconds || 60));
      const devCode = result?.devCode ? text("authDevCode", { code: result.devCode }) : "";
      const delivery = result?.delivery === "dev" ? text("authDeliveryDev") : text("authDeliveryEmail");
      deps.showAuthMessage?.(text("authPasswordResetCodeSent", { email, delivery, devCode }));
    } catch (error) {
      if (!error?.status) {
        deps.showAuthMessage?.(text("authResetCloudUnavailable"), true);
      } else {
        deps.showAuthMessage?.(getPasswordResetErrorMessage(error, deps), true);
      }
      deps.setResetPasswordCodeButtonBusy?.(false);
    }
  }

  async function registerLocal() {
    const elements = getElements();
    const appState = getAppState();
    const attempt = beginAuthAttempt();
    if (attempt.cloudOnly) {
      deps.showAuthMessage?.(text("authRecoveryExistingAccount"), true);
      setEmailAuthStep("password", getLoginEmail());
      return;
    }
    try {
      const name = elements.registerName.value.trim();
      const email = deps.normalizeEmail?.(elements.registerEmail.value) || "";
      const password = elements.registerPassword.value;
      const verificationCode = elements.registerVerificationCode.value.trim();
      if (!name || !email.includes('@') || password.length < 6) {
        deps.showAuthMessage?.(text("authMissingRegisterFields"), true);
        return;
      }
      if (!verificationCode) {
        deps.showAuthMessage?.(text("authNeedVerificationCode"), true);
        return;
      }

      const account = await deps.buildLocalAccount?.({
        id: deps.makeId?.(),
        name,
        email,
        password,
        hashPassword: deps.hashPassword,
        defaultCountry: deps.defaultCountry || "china",
        defaultRegion: deps.defaultRegion || "",
        defaultGraduationTerm: deps.defaultGraduationTerm || "",
        nowIso: nowIso()
      });
      if (!isCurrentAttempt(attempt)) return;

      // Registration is complete only after the server verifies the code and
      // returns its identity. Device profiles neither block it nor sign in.
      const cloudSession = requireValidCloudSession(await deps.registerCloudAccount?.(
        account, password, deps.createBaseState?.() || {}, appState.community, verificationCode
      ), email);
      if (!isCurrentAttempt(attempt)) return;
      const links = passwordOwnerLinks(cloudSession.account, email, account.passwordHash);
      const sources = recoverySources(links);
      deps.applyCloudSession?.(cloudSession, {
        localState: verifiedLocalState(cloudSession.account.id, links),
        localCommunity: appState.community,
        passwordHash: account.passwordHash,
        ...ownerLinkOptions(links)
      });
      markDeviceRecordsRecovered(appState.auth, sources, cloudSession.account.id);
      markAuthenticated(appState.auth);
      deps.saveAuth?.();
      elements.registerForm.reset();
      deps.showAuthMessage?.(text("authCreatedSynced"));
      deps.renderSession?.();
    } catch (error) {
      if (!isCurrentAttempt(attempt)) return;
      deps.showAuthMessage?.(error?.status ? deps.getVerificationErrorMessage?.(error) : authErrorMessage(error), true);
    }
  }

  async function loginLocal() {
    const elements = getElements();
    const appState = getAppState();
    const attempt = beginAuthAttempt();
    try {
      const email = deps.normalizeEmail?.(elements.loginEmail.value) || "";
      const password = elements.loginPassword.value;
      try {
        const cloudSession = requireValidCloudSession(await deps.loginCloudAccount?.(email, password), email);
        if (!isCurrentAttempt(attempt)) return;
        const remoteAccount = deps.normalizeAccount?.(cloudSession.account || {}) || {};
        const localFields = { passwordHash: await deps.hashPassword?.(email, password) };
        if (!isCurrentAttempt(attempt)) return;
        // A matching email alone does not prove ownership of a device profile.
        // Bind the two IDs only after this same password passed both the server
        // login and the cached local credential, while this attempt still owns
        // the session. Never discover orphan storage keys by email.
        const links = passwordOwnerLinks(remoteAccount, email, localFields.passwordHash);
        const sources = recoverySources(links);
        deps.applyCloudSession?.(cloudSession, {
          localState: verifiedLocalState(remoteAccount.id, links),
          localCommunity: appState.community,
          ...ownerLinkOptions(links),
          ...localFields
        });
        markDeviceRecordsRecovered(appState.auth, sources, remoteAccount.id);
        markAuthenticated(appState.auth);
        deps.saveAuth?.();
        elements.loginForm.reset();
        deps.showAuthMessage?.("");
        deps.renderSession?.();
        return;
      } catch (error) {
        if (!isCurrentAttempt(attempt)) return;
        if (error?.status === 401) {
          const cloudExists = await getCloudAccountExists(email);
          if (!isCurrentAttempt(attempt)) return;
          if (cloudExists === false) {
            deps.showAuthMessage?.(text("authCloudAccountMissing"), true);
            return;
          }
        }
        deps.showAuthMessage?.(authErrorMessage(error), true);
        return;
      }
    } catch (error) {
      if (!isCurrentAttempt(attempt)) return;
      deps.showAuthMessage?.(authErrorMessage(error), true);
    }
  }

  function loginDeviceAccount() {
    // Compatibility for older callers: this action has no offline authority.
    // It uses the same server login and never clears an existing session.
    return loginLocal();
  }

  function cancelCloudRecovery() {
    authAttemptSequence += 1;
    (deps.cancelCloudReauthentication || cancelCloudReauthentication)();
    setEmailAuthStep("password", getLoginEmail());
    deps.showAuthMessage?.(text("authCloudRecoveryCancelled"));
  }

  async function resetPassword() {
    const elements = getElements();
    const appState = getAppState();
    const attempt = beginAuthAttempt();
    try {
      const email = getResetPasswordEmail();
      const password = elements.resetPasswordNewPassword?.value || "";
      const verificationCode = elements.resetPasswordVerificationCode?.value?.trim() || "";
      if (!email || !email.includes("@") || password.length < 6 || !verificationCode) {
        deps.showAuthMessage?.(text("authResetMissingFields"));
        return;
      }

      const cloudSession = requireValidCloudSession(await deps.resetCloudPassword?.(email, password, verificationCode), email);
      if (!isCurrentAttempt(attempt)) return;
      const remoteAccount = deps.normalizeAccount?.(cloudSession.account || {}) || {};
      const localState = verifiedLocalState(remoteAccount.id);
      const passwordHash = await deps.hashPassword?.(email, password);
      if (!isCurrentAttempt(attempt)) return;
      deps.applyCloudSession?.(cloudSession, {
        localState,
        localCommunity: appState.community,
        passwordHash
      });
      markAuthenticated(appState.auth);
      deps.saveAuth?.();
      elements.resetPasswordForm?.reset();
      deps.showAuthMessage?.(text("authPasswordResetSynced"));
      deps.renderSession?.();
    } catch (error) {
      if (!isCurrentAttempt(attempt)) return;
      deps.showAuthMessage?.(getPasswordResetErrorMessage(error, deps), true);
    }
  }

  function logout(options = {}) {
    if (options.cancelRecovery === true) return cancelCloudRecovery();
    authAttemptSequence += 1;
    const appState = getAppState();
    const userStateStore = getUserStateStore();
    deps.setCurrentUserId?.(appState.auth, "");
    appState.auth.lastAuthenticatedAt = "";
    deps.saveAuth?.();
    appState.currentUser = null;
    if (userStateStore) userStateStore.value = deps.createBaseState?.();
    deps.renderSession?.();
    setEmailAuthStep("email");
    deps.initGoogleLogin?.();
  }

  function saveGoogleClientId() {
    const elements = getElements();
    const appState = getAppState();
    deps.setGoogleClientId?.(appState.auth, elements.googleClientIdInput?.value);
    deps.saveAuth?.();
    deps.renderGoogleClientInput?.();
    deps.initGoogleLogin?.();
  }

  async function handleGoogleCredential(response) {
    const appState = getAppState();
    const attempt = beginAuthAttempt();
    try {
      const payload = deps.parseJwt?.(response.credential);
      if (payload.aud !== deps.getGoogleClientId?.() || typeof payload.sub !== 'string' || !payload.sub.trim()
        || !deps.normalizeEmail?.(payload.email)) {
        deps.showAuthMessage?.(text("authGoogleClientMismatch"));
        return;
      }

      const id = `google:${payload.sub}`;
      const existing = savedProfiles().find((account) => account.id === id);
      const account = deps.buildGoogleAccountFromPayload?.(payload, {
        existing,
        defaultCountry: deps.defaultCountry || "china",
        defaultRegion: deps.defaultRegion || "",
        defaultGraduationTerm: deps.defaultGraduationTerm || "",
        nowIso: nowIso()
      });
      const localState = deps.loadStateForUser?.(id);
      let cloudSession;
      try {
        cloudSession = requireValidCloudSession(await deps.loginCloudGoogle?.(account, response.credential, localState, appState.community), deps.normalizeEmail?.(payload.email));
        if (!isCurrentAttempt(attempt)) return;
      } catch (error) {
        if (!isCurrentAttempt(attempt)) return;
        deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error), true);
        return;
      }
      const remoteAccount = cloudSession.account;
      const careerOwnerLink = remoteAccount.id !== id && payload.sub && sourceNeedsRecovery(existing, remoteAccount.id)
        && deps.normalizeEmail?.(payload.email)
        && deps.normalizeEmail?.(remoteAccount.email) === deps.normalizeEmail?.(payload.email)
        ? { sourceOwnerId: id, targetOwnerId: remoteAccount.id, method: 'google' }
        : undefined;
      const links = careerOwnerLink ? [careerOwnerLink] : [];
      const sources = recoverySources(links);
      deps.applyCloudSession?.(cloudSession, {
        localState: verifiedLocalState(remoteAccount.id, links),
        localCommunity: appState.community,
        ...ownerLinkOptions(links)
      });
      if (sources.some(source => source.id === id && source.sourceStamp) && !savedProfiles().some(profile => profile.id === id)) {
        // The verified Google subject can prove an exact orphaned source ID.
        // Retain its recovery stamp even if an older email upsert lost its index.
        appState.auth.legacyAccounts = [...(appState.auth.legacyAccounts || []), { ...account, cloudLinked: false }];
      }
      markDeviceRecordsRecovered(appState.auth, sources, remoteAccount.id);
      markAuthenticated(appState.auth);
      deps.saveAuth?.();
      deps.showAuthMessage?.("");
      deps.renderSession?.();
    } catch (error) {
      if (!isCurrentAttempt(attempt)) return;
      deps.showAuthMessage?.(error?.code === 'CAREER_OWNER_MIGRATION_FAILED' ? authErrorMessage(error) : text("authGoogleParseFailed"), true);
    }
  }

  return {
    cancelCloudRecovery,
    cancelPasswordReset,
    handleGoogleCredential,
    loginLocal,
    loginDeviceAccount,
    logout,
    registerLocal,
    resetEmailAuthFlow,
    resetPassword,
    saveGoogleClientId,
    sendPasswordResetCode,
    sendRegisterVerificationCode,
    startPasswordReset,
    submitEmailAuth
  };
}

function getPasswordResetErrorMessage(error, deps = {}) {
  const text = (key) => deps.t?.(key) || key;
  const raw = String(error?.message || "");
  if (error?.status === 404) return text("authResetNoLocalAccount");
  if (/Only local/i.test(raw)) return text("authResetGoogleAccount");
  if (/verification|code/i.test(raw)) return deps.getVerificationErrorMessage?.(error) || text("verificationInvalid");
  if (!error?.status) return text("authResetCloudUnavailable");
  return deps.getAuthErrorMessage?.(error) || text("authOperationFailed");
}
