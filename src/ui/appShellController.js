import {
  getAvailableRouteModules,
  getCurrentRouteModule,
  getPathRouteModule,
  writeRouteModule
} from '../router.js';
import {
  getAuthenticatedRouteDecision,
  getSessionRouteRestoreDecision
} from '../state/authGate.js';
import { updateGlobalSearchPlaceholder as updateGlobalSearchPlaceholderView } from './globalSearch.js';
import { applyAppLanguageText } from './languageText.js';
import {
  applyModuleShellState,
  scrollActiveModuleTab
} from './moduleShell.js';
import { applySidebarState as applySidebarStateView } from './sidebar.js';

export function createAppShellController(deps = {}) {
  const documentRef = deps.documentRef || globalThis.document;
  const windowRef = deps.windowRef || globalThis.window;
  const elements = deps.elements || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const getAppState = () => deps.getAppState?.() || {};
  const getUserState = () => deps.getUserState?.() || {};
  const defaultRouteModule = deps.defaultRouteModule || "overview";
  const useBrowserRouting = deps.routingMode === "browser";

  function applySidebarState() {
    applySidebarStateView({
      documentRef,
      prefs: getAppState().appPrefs,
      button: elements.sidebarToggleBtn,
      t: text,
      refreshIcons: deps.refreshIcons
    });
  }

  function updateGlobalSearchPlaceholder() {
    updateGlobalSearchPlaceholderView(elements, {
      windowRef,
      t: text
    });
  }

  function applyLanguage() {
    const language = deps.getLanguage?.() || "zh";
    documentRef.documentElement.lang = language === "en" ? "en" : "zh-CN";
    documentRef.title = text("appTitle");
    if (elements.languageSelect) elements.languageSelect.value = language;
    if (elements.settingsLanguageSelect) elements.settingsLanguageSelect.value = language;

    applyAppLanguageText({
      root: documentRef,
      elements,
      language,
      state: getUserState(),
      t: text,
      getNetworkStatusLabel: deps.getNetworkStatusLabel,
      updatePrepTaskIndicator: deps.updatePrepTaskIndicator,
      updateGlobalSearchPlaceholder,
      updateCheckInPill: deps.updateCheckInPill,
      applySidebarState,
      renderLeaderboardScopeSummary: () => deps.renderLeaderboardScopeSummary?.(
        deps.normalizeLeaderboardSettings?.(getUserState().leaderboard),
        deps.getLeaderboardRows?.()
      ),
      startHeroTypewriter: deps.startHeroTypewriter
    });

    if (elements.googleButton?.querySelector(".auth-provider-button.disabled")) deps.renderGooglePlaceholder?.();
    if (!getAppState().currentUser && elements.authMessage && (
      !elements.authMessage.textContent.trim()
      || deps.textMatchesI18nKeys?.(elements.authMessage.textContent, ["authReadyFile", "authReadyCloud", "authReadyLocal"])
    )) {
      elements.authMessage.textContent = deps.getAuthReadyMessage?.();
    }
  }

  function handleRouteChange(moduleName) {
    const decision = getAuthenticatedRouteDecision(getAppState().currentUser, moduleName, {
      fallbackModule: defaultRouteModule
    });
    if (!decision.shouldSwitch) return;
    switchModule(decision.targetModule, { updateRoute: false });
  }

  function restoreRouteModule() {
    if (useBrowserRouting) {
      const routeModule = getPathRouteModule(windowRef.location?.pathname || "/");
      switchModule(routeModule, { updateRoute: false, scroll: false });
      return;
    }
    const routeModule = getCurrentRouteModule(getAvailableRouteModules(documentRef));
    const decision = getSessionRouteRestoreDecision(getAppState().currentUser, routeModule, {
      fallbackModule: defaultRouteModule
    });
    if (!decision.shouldRestore) return;
    writeRouteModule(decision.targetModule, { replace: true });
    switchModule(decision.targetModule, { updateRoute: false, scroll: false });
  }

  function switchModule(moduleName = defaultRouteModule, options = {}) {
    const { targetModule, activeTab } = applyModuleShellState({
      documentRef,
      moduleName,
      fallbackModule: defaultRouteModule
    });
    if (options.updateRoute !== false) {
      if (useBrowserRouting) {
        windowRef.dispatchEvent?.(new CustomEvent("quantgym:navigate-module", {
          detail: {
            moduleId: targetModule,
            replace: Boolean(options.replaceRoute)
          }
        }));
      } else {
        writeRouteModule(targetModule, { replace: Boolean(options.replaceRoute) });
      }
    }
    scrollActiveModuleTab(activeTab, { windowRef });
    if (options.scroll !== false) windowRef.scrollTo?.({ top: 0, behavior: "smooth" });
  }

  function renderAll() {
    deps.consumePendingCapture?.();
    deps.renderTodoDock?.();
    deps.maybeAutoRefreshNews?.();
    deps.maybeAutoRefreshJobs?.();
    deps.updatePreview?.();
    deps.refreshIcons?.();
    applyLanguage();
  }

  return {
    applyLanguage,
    applySidebarState,
    handleRouteChange,
    renderAll,
    restoreRouteModule,
    switchModule,
    updateGlobalSearchPlaceholder
  };
}
