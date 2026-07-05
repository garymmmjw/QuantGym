export function createAccountAuthController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getAppState = () => deps.getAppState?.() || {};
  const getUserStateStore = () => deps.getUserStateStore?.() || null;
  const text = (key, params) => deps.t?.(key, params) || key;
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();

  function findLocalAccount(email) {
    const appState = getAppState();
    return appState.auth.accounts.find((item) => (
      item.provider === "local" && deps.normalizeEmail?.(item.email) === email
    ));
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
    if (findLocalAccount(email)) {
      return showPasswordStep(email, "local");
    }

    const cloudExists = await getCloudAccountExists(email);
    if (cloudExists === false) return showRegisterStep(email);
    return showPasswordStep(email, cloudExists === true ? "cloud" : "unknown");
  }

  async function sendRegisterVerificationCode() {
    const elements = getElements();
    const appState = getAppState();
    const email = deps.normalizeEmail?.(elements.registerEmail.value) || "";
    if (!email || !email.includes("@")) {
      deps.showAuthMessage?.(text("authNeedEmail"), true);
      return;
    }
    if (appState.auth.accounts.some((account) => deps.normalizeEmail?.(account.email) === email)) {
      deps.showAuthMessage?.(text("authDuplicateEmail"), true);
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
        elements.registerForm.dataset.verificationOptional = "true";
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
    try {
      const name = elements.registerName.value.trim();
      const email = deps.normalizeEmail?.(elements.registerEmail.value) || "";
      const password = elements.registerPassword.value;
      const verificationCode = elements.registerVerificationCode.value.trim();
      const verificationOptional = elements.registerForm.dataset.verificationOptional === "true";

      if (!name || !email || password.length < 6) {
        deps.showAuthMessage?.(text("authMissingRegisterFields"), true);
        return;
      }
      if (!verificationCode && !verificationOptional) {
        deps.showAuthMessage?.(text("authNeedVerificationCode"), true);
        return;
      }

      if (appState.auth.accounts.some((account) => deps.normalizeEmail?.(account.email) === email)) {
        deps.showAuthMessage?.(text("authDuplicateEmail"), true);
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

      deps.migrateLegacyState?.(account.id);
      const localState = deps.loadStateForUser?.(account.id);

      if (!verificationOptional) {
        try {
          const cloudSession = await deps.registerCloudAccount?.(
            account,
            password,
            localState,
            appState.community,
            verificationCode
          );
          deps.applyCloudSession?.(cloudSession, {
            localState,
            localCommunity: appState.community,
            passwordHash: account.passwordHash
          });
          markAuthenticated(appState.auth);
          deps.saveAuth?.();
          elements.registerForm.reset();
          deps.showAuthMessage?.(text("authCreatedSynced"));
          deps.renderSession?.();
          return;
        } catch (error) {
          if (error?.status) {
            deps.showAuthMessage?.(deps.getVerificationErrorMessage?.(error), true);
            return;
          }
          deps.showAuthMessage?.(text("authCloudLocalCreated"));
        }
      }

      deps.addLocalAccount?.(appState.auth, account);
      markAuthenticated(appState.auth);
      deps.saveAuth?.();
      elements.registerForm.reset();
      deps.renderSession?.();
    } catch (error) {
      deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error), true);
    }
  }

  async function loginLocal() {
    const elements = getElements();
    const appState = getAppState();
    try {
      const email = deps.normalizeEmail?.(elements.loginEmail.value) || "";
      const password = elements.loginPassword.value;
      const account = findLocalAccount(email);

      try {
        const cloudSession = await deps.loginCloudAccount?.(email, password);
        const remoteAccount = deps.normalizeAccount?.(cloudSession.account || {}) || {};
        const localAccount = appState.auth.accounts.find((item) => (
          item.id === remoteAccount.id || deps.normalizeEmail?.(item.email) === email
        ));
        const localState = localAccount ? deps.loadStateForUser?.(localAccount.id) : deps.createBaseState?.();
        const localFields = localAccount?.passwordHash
          ? { passwordHash: localAccount.passwordHash }
          : { passwordHash: await deps.hashPassword?.(email, password) };
        deps.applyCloudSession?.(cloudSession, {
          localState,
          localCommunity: appState.community,
          ...localFields
        });
        markAuthenticated(appState.auth);
        deps.saveAuth?.();
        elements.loginForm.reset();
        deps.showAuthMessage?.("");
        deps.renderSession?.();
        return;
      } catch (error) {
        if (isBlockingCloudAuthError(error)) {
          deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error), true);
          return;
        }
        if (!account && error?.status && error.status !== 401) {
          deps.showAuthMessage?.(text("authCloudNoLocal"), true);
          return;
        }
        if (!account && error?.status === 401) {
          deps.showAuthMessage?.(text("authCloudLoginFailed"), true);
          return;
        }
      }

      if (!account) {
        deps.showAuthMessage?.(text("authNoLocalAccount"), true);
        return;
      }

      const passwordHash = await deps.hashPassword?.(email, password);
      if (passwordHash !== account.passwordHash) {
        deps.showAuthMessage?.(text("authWrongPassword"), true);
        return;
      }

      deps.setCurrentUserId?.(appState.auth, account.id);
      markAuthenticated(appState.auth);
      deps.saveAuth?.();
      deps.migrateLegacyState?.(account.id);
      const localState = deps.loadStateForUser?.(account.id);
      try {
        const cloudSession = await deps.loginCloudAccount?.(email, password);
        deps.applyCloudSession?.(cloudSession, {
          localState,
          localCommunity: appState.community,
          passwordHash: account.passwordHash
        });
      } catch {
        appState.cloudConfig.lastError = text("authCloudLocalSession");
        deps.saveCloudConfig?.();
      }
      elements.loginForm.reset();
      deps.showAuthMessage?.("");
      deps.renderSession?.();
    } catch (error) {
      deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error), true);
    }
  }

  async function resetPassword() {
    const elements = getElements();
    const appState = getAppState();
    try {
      const email = getResetPasswordEmail();
      const password = elements.resetPasswordNewPassword?.value || "";
      const verificationCode = elements.resetPasswordVerificationCode?.value?.trim() || "";
      if (!email || !email.includes("@") || password.length < 6 || !verificationCode) {
        deps.showAuthMessage?.(text("authResetMissingFields"));
        return;
      }

      const cloudSession = await deps.resetCloudPassword?.(email, password, verificationCode);
      const remoteAccount = deps.normalizeAccount?.(cloudSession.account || {}) || {};
      const localAccount = appState.auth.accounts.find((item) => (
        item.id === remoteAccount.id || deps.normalizeEmail?.(item.email) === email
      ));
      const localState = localAccount ? deps.loadStateForUser?.(localAccount.id) : deps.createBaseState?.();
      const passwordHash = await deps.hashPassword?.(email, password);
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
      deps.showAuthMessage?.(getPasswordResetErrorMessage(error, deps), true);
    }
  }

  function logout() {
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
    try {
      const payload = deps.parseJwt?.(response.credential);
      if (payload.aud !== deps.getGoogleClientId?.()) {
        deps.showAuthMessage?.(text("authGoogleClientMismatch"));
        return;
      }

      const id = `google:${payload.sub}`;
      const existing = appState.auth.accounts.find((account) => account.id === id);
      const account = deps.buildGoogleAccountFromPayload?.(payload, {
        existing,
        defaultCountry: deps.defaultCountry || "china",
        defaultRegion: deps.defaultRegion || "",
        defaultGraduationTerm: deps.defaultGraduationTerm || "",
        nowIso: nowIso()
      });
      deps.applyGoogleAccount?.(appState.auth, account, {
        nowIso: nowIso()
      });
      markAuthenticated(appState.auth);
      deps.saveAuth?.();
      deps.migrateLegacyState?.(id);
      const localState = deps.loadStateForUser?.(id);
      try {
        const cloudSession = await deps.loginCloudGoogle?.(account, response.credential, localState, appState.community);
        deps.applyCloudSession?.(cloudSession, { localState, localCommunity: appState.community });
      } catch {
        appState.cloudConfig.lastError = text("authGoogleLocalSession");
        deps.saveCloudConfig?.();
      }
      deps.renderSession?.();
    } catch {
      deps.showAuthMessage?.(text("authGoogleParseFailed"));
    }
  }

  return {
    cancelPasswordReset,
    handleGoogleCredential,
    loginLocal,
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

function isBlockingCloudAuthError(error) {
  return Boolean(error?.status && error.status >= 400 && error.status < 500 && error.status !== 401);
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
