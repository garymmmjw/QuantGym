import { listen } from './events.js';

export function bindAppShellEvents(options = {}) {
  const {
    documentRef = globalThis.document,
    elements = {},
    handlers = {}
  } = options;
  const disposers = [];
  const bind = (node, eventName, handler, listenerOptions) => {
    disposers.push(listen(node, eventName, handler, listenerOptions));
  };

  documentRef?.querySelectorAll?.("[data-module-tab]").forEach((button) => {
    bind(button, "click", () => {
      handlers.clearGlobalSearch?.();
      handlers.switchModule?.(button.dataset.moduleTab);
    });
  });

  documentRef?.querySelectorAll?.("[data-jump-module]").forEach((button) => {
    bind(button, "click", () => {
      handlers.clearGlobalSearch?.();
      handlers.switchModule?.(button.dataset.jumpModule);
    });
  });

  bind(elements.sidebarToggleBtn, "click", () => handlers.toggleSidebarNav?.());

  documentRef?.querySelectorAll?.("[data-auth-tab]").forEach((button) => {
    bind(button, "click", () => handlers.switchAuthTab?.(button.dataset.authTab));
  });

  bind(elements.loginForm, "submit", (event) => {
    event.preventDefault();
    if (handlers.submitEmailAuth) handlers.submitEmailAuth();
    else handlers.loginLocal?.();
  });

  bind(elements.loginEmail, "input", () => handlers.resetEmailAuthFlow?.());

  bind(elements.registerForm, "submit", (event) => {
    event.preventDefault();
    handlers.registerLocal?.();
  });

  bind(elements.sendRegisterCodeBtn, "click", () => handlers.sendRegisterVerificationCode?.());
  bind(elements.saveGoogleClientBtn, "click", () => handlers.saveGoogleClientId?.());
  bind(elements.userChip, "click", () => handlers.switchModule?.("account"));
  bind(elements.languageSelect, "change", () => handlers.setLanguage?.(elements.languageSelect.value));
  bind(elements.settingsBtn, "click", () => handlers.switchModule?.("settings"));
  bind(elements.logoutBtn, "click", () => handlers.logout?.());
  bind(elements.checkInPill, "click", () => handlers.toggleStreakPanel?.());

  bind(documentRef, "click", (event) => {
    if (!event.target?.closest?.(".streak-widget")) handlers.setStreakPanelOpen?.(false);
  });

  bind(elements.generateStudyPlanBtn, "click", () => handlers.switchModule?.("plan"));

  bind(elements.globalSearchInput, "compositionstart", () => {
    handlers.setGlobalSearchComposing?.(true);
  });
  bind(elements.globalSearchInput, "compositionend", () => {
    handlers.setGlobalSearchComposing?.(false);
    handlers.scheduleGlobalSearchResults?.();
  });
  bind(elements.globalSearchInput, "input", () => handlers.scheduleGlobalSearchResults?.());
  bind(elements.globalSearchInput, "focus", () => handlers.renderGlobalSearchResults?.());
  bind(elements.globalSearchInput, "keydown", (event) => handlers.handleGlobalSearchKeydown?.(event));

  bind(documentRef, "click", (event) => {
    if (!event.target?.closest?.(".app-search")) handlers.hideGlobalSearchResults?.();
  });

  bind(elements.logForm, "submit", (event) => {
    event.preventDefault();
    handlers.addEntry?.();
  });

  bind(elements.logText, "input", () => handlers.scheduleClassificationPreview?.());
  bind(elements.durationInput, "input", () => handlers.updatePreview?.());
  bind(elements.difficultyInput, "change", () => handlers.updatePreview?.());
  bind(elements.sampleBtn, "click", () => handlers.fillSampleEntry?.());
  bind(elements.todoDockButton, "click", () => handlers.toggleTodoDock?.());
  bind(elements.todoDockCloseBtn, "click", () => handlers.closeTodoDock?.());
  bind(elements.todoDockPanel, "click", (event) => handlers.handleTodoDockClick?.(event));
  bind(elements.todoDockPanel, "change", (event) => handlers.handleTodoDockEdit?.(event));
  bind(elements.todoDockAddForm, "submit", (event) => {
    event.preventDefault();
    handlers.addTodoTask?.();
  });

  return () => {
    disposers.splice(0).forEach((dispose) => dispose());
  };
}
