import {
  renderGoogleClientInput as renderGoogleClientInputView,
  renderGooglePlaceholder as renderGooglePlaceholderView,
  setRegisterCodeButtonState as setRegisterCodeButtonStateView
} from './authTabs.js';

export function createAuthUiRuntime(deps = {}) {
  let googleInitRetries = 0;
  let initializedGoogleClientId = "";
  let initializedGoogleCallback = null;
  let registerCodeTimer = null;

  const windowRef = deps.windowRef || globalThis;
  const getElements = () => deps.elements || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const getGoogleClientId = () => deps.getGoogleClientId?.() || "";

  function setRegisterCodeButtonBusy(isBusy, label = text("sendVerificationCode")) {
    setRegisterCodeButtonStateView(getElements().sendRegisterCodeBtn, {
      busy: isBusy,
      label
    });
  }

  function startRegisterCodeCooldown(seconds) {
    windowRef.clearInterval?.(registerCodeTimer);
    let remaining = Math.max(0, Math.floor(seconds || 0));
    const render = () => {
      if (!remaining) {
        setRegisterCodeButtonBusy(false);
        windowRef.clearInterval?.(registerCodeTimer);
        registerCodeTimer = null;
        return;
      }
      setRegisterCodeButtonBusy(true, `${text("resendIn")} ${remaining}s`);
      remaining -= 1;
    };
    render();
    registerCodeTimer = windowRef.setInterval?.(render, 1000) || null;
  }

  function renderGoogleClientInput() {
    renderGoogleClientInputView(getElements(), getGoogleClientId());
  }

  function renderGooglePlaceholder() {
    renderGooglePlaceholderView(getElements(), {
      documentRef: deps.documentRef || globalThis.document,
      continueLabel: text("googleContinue"),
      disabledLabel: text("notEnabled")
    });
  }

  function resetGoogleRetries() {
    googleInitRetries = 0;
  }

  function initGoogleLogin() {
    const els = getElements();
    if (!els.googleButton) return;
    renderGoogleClientInput();
    els.googleButton.innerHTML = "";
    const googleClientId = getGoogleClientId();

    if (!deps.googleLoginEnabled) {
      resetGoogleRetries();
      initializedGoogleClientId = "";
      initializedGoogleCallback = null;
      renderGooglePlaceholder();
      return;
    }

    if (!googleClientId) {
      resetGoogleRetries();
      initializedGoogleClientId = "";
      initializedGoogleCallback = null;
      renderGooglePlaceholder();
      return;
    }

    const googleAccounts = windowRef.google?.accounts?.id;
    if (!googleAccounts) {
      if (googleInitRetries < (deps.maxGoogleInitRetries || 12)) {
        googleInitRetries += 1;
        deps.showAuthMessage?.(text("authGoogleLoading"));
        windowRef.setTimeout?.(initGoogleLogin, deps.googleRetryDelayMs || 500);
      } else {
        deps.showAuthMessage?.(text("authGoogleLoadFailed"));
      }
      return;
    }

    resetGoogleRetries();
    if (
      initializedGoogleClientId !== googleClientId
      || initializedGoogleCallback !== deps.handleGoogleCredential
    ) {
      googleAccounts.initialize({
        client_id: googleClientId,
        callback: deps.handleGoogleCredential,
        auto_select: false
      });
      initializedGoogleClientId = googleClientId;
      initializedGoogleCallback = deps.handleGoogleCredential;
    }
    const buttonWidth = Math.min(400, Math.max(240, Math.floor(els.googleButton.clientWidth || 400)));
    googleAccounts.renderButton(els.googleButton, {
      theme: "outline",
      size: "large",
      shape: "pill",
      text: "continue_with",
      width: buttonWidth
    });
    deps.showAuthMessage?.(text("authGoogleEnabled"));
  }

  function dispose() {
    windowRef.clearInterval?.(registerCodeTimer);
    registerCodeTimer = null;
  }

  return {
    dispose,
    initGoogleLogin,
    renderGoogleClientInput,
    renderGooglePlaceholder,
    setRegisterCodeButtonBusy,
    startRegisterCodeCooldown
  };
}
