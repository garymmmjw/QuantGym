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

  async function sendRegisterVerificationCode() {
    const elements = getElements();
    const appState = getAppState();
    const email = deps.normalizeEmail?.(elements.registerEmail.value) || "";
    if (!email || !email.includes("@")) {
      deps.showAuthMessage?.(text("authNeedEmail"));
      return;
    }
    if (appState.auth.accounts.some((account) => deps.normalizeEmail?.(account.email) === email)) {
      deps.showAuthMessage?.(text("authDuplicateEmail"));
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
        deps.showAuthMessage?.(text("authCloudVerificationUnavailable"));
      } else {
        deps.showAuthMessage?.(deps.getVerificationErrorMessage?.(error));
      }
      deps.setRegisterCodeButtonBusy?.(false);
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
        deps.showAuthMessage?.(text("authMissingRegisterFields"));
        return;
      }
      if (!verificationCode && !verificationOptional) {
        deps.showAuthMessage?.(text("authNeedVerificationCode"));
        return;
      }

      if (appState.auth.accounts.some((account) => deps.normalizeEmail?.(account.email) === email)) {
        deps.showAuthMessage?.(text("authDuplicateEmail"));
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
          elements.registerForm.reset();
          deps.showAuthMessage?.(text("authCreatedSynced"));
          deps.renderSession?.();
          return;
        } catch (error) {
          if (error?.status) {
            deps.showAuthMessage?.(deps.getVerificationErrorMessage?.(error));
            return;
          }
          deps.showAuthMessage?.(text("authCloudLocalCreated"));
        }
      }

      deps.addLocalAccount?.(appState.auth, account);
      deps.saveAuth?.();
      elements.registerForm.reset();
      deps.renderSession?.();
    } catch (error) {
      deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error));
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
        elements.loginForm.reset();
        deps.showAuthMessage?.("");
        deps.renderSession?.();
        return;
      } catch (error) {
        if (isBlockingCloudAuthError(error)) {
          deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error));
          return;
        }
        if (!account && error?.status && error.status !== 401) {
          deps.showAuthMessage?.(text("authCloudNoLocal"));
          return;
        }
        if (!account && error?.status === 401) {
          deps.showAuthMessage?.(text("authCloudLoginFailed"));
          return;
        }
      }

      if (!account) {
        deps.showAuthMessage?.(text("authNoLocalAccount"));
        return;
      }

      const passwordHash = await deps.hashPassword?.(email, password);
      if (passwordHash !== account.passwordHash) {
        deps.showAuthMessage?.(text("authWrongPassword"));
        return;
      }

      deps.setCurrentUserId?.(appState.auth, account.id);
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
      deps.showAuthMessage?.(deps.getAuthErrorMessage?.(error));
    }
  }

  function logout() {
    const appState = getAppState();
    const userStateStore = getUserStateStore();
    deps.setCurrentUserId?.(appState.auth, "");
    deps.saveAuth?.();
    appState.currentUser = null;
    if (userStateStore) userStateStore.value = deps.createBaseState?.();
    deps.renderSession?.();
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
    handleGoogleCredential,
    loginLocal,
    logout,
    registerLocal,
    saveGoogleClientId,
    sendRegisterVerificationCode
  };
}

function isBlockingCloudAuthError(error) {
  return Boolean(error?.status && error.status >= 400 && error.status < 500 && error.status !== 401);
}
