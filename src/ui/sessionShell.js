export function applySessionShellState(elements = {}, currentUser = null, options = {}) {
  const {
    documentRef = globalThis.document,
    windowRef = globalThis.window,
    applySidebarState = () => {},
    startAfterLogin = "",
    authReadyMessage = ""
  } = options;
  const authenticated = Boolean(currentUser);

  documentRef?.body?.classList?.toggle?.("is-authenticated", authenticated);
  documentRef?.documentElement?.classList?.remove?.("auth-session-hint");
  windowRef?.scrollTo?.(0, 0);
  elements.authShell?.classList?.toggle?.("hidden", authenticated);
  elements.appShell?.classList?.toggle?.("hidden", !authenticated);
  applySidebarState();
  elements.regionRank?.classList?.toggle?.("hidden", !authenticated);
  elements.userChip?.classList?.toggle?.("hidden", !authenticated);
  elements.languageSelect?.classList?.remove?.("hidden");

  [
    elements.settingsBtn,
    elements.exportBtn,
    elements.importInput?.parentElement,
    elements.resetBtn,
    elements.logoutBtn
  ].filter(Boolean).forEach((node) => {
    node.classList?.toggle?.("hidden", !authenticated);
  });

  if (!authenticated) {
    if (elements.todayLine) elements.todayLine.textContent = startAfterLogin;
    if (elements.authMessage) elements.authMessage.textContent = authReadyMessage;
  }

  return { authenticated };
}
