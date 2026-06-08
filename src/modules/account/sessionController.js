import { applyAuthTabState } from '../../ui/authTabs.js';
import { applySessionShellState } from '../../ui/sessionShell.js';
import { renderUserChip as renderUserChipView } from '../../ui/userChip.js';

export function createAccountSessionController(deps = {}) {
  const getElements = () => deps.elements || {};
  const getAppState = () => deps.getAppState?.() || {};
  const getUserStateStore = () => deps.getUserStateStore?.() || null;
  const documentRef = deps.documentRef || globalThis.document;
  const windowRef = deps.windowRef || globalThis.window;
  const text = (key, params) => deps.t?.(key, params) || key;

  function renderUserChip() {
    renderUserChipView(getElements(), getAppState().currentUser, {
      documentRef,
      t: deps.t
    });
  }

  function switchAuthTab(tab) {
    return applyAuthTabState(getElements(), tab, { root: documentRef });
  }

  function renderSession() {
    const appState = getAppState();
    const userStateStore = getUserStateStore();
    appState.currentUser = deps.getCurrentUser?.() || null;
    if (userStateStore) userStateStore.value = deps.loadState?.();

    deps.clearProblemLookupCaches?.();
    deps.problemSocialState?.reset?.();
    deps.pruneProblemCatalog?.();
    deps.consumeIncomingCapture?.();
    applySessionShellState(getElements(), appState.currentUser, {
      documentRef,
      windowRef,
      applySidebarState: deps.applySidebarState,
      startAfterLogin: text("startAfterLogin"),
      authReadyMessage: deps.getAuthReadyMessage?.() || ""
    });

    if (!appState.currentUser) {
      deps.renderGoogleClientInput?.();
      deps.applyLanguage?.();
      return;
    }

    renderUserChip();
    deps.renderAll?.();
    deps.restoreRouteModule?.();
    deps.refreshProblemCatalog?.();
    deps.refreshProblemSocial?.();
  }

  return {
    renderSession,
    renderUserChip,
    switchAuthTab
  };
}
