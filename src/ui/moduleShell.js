export function applyModuleShellState(options = {}) {
  const {
    documentRef = globalThis.document,
    moduleName = "",
    fallbackModule = "overview"
  } = options;
  const views = [...(documentRef?.querySelectorAll?.("[data-module-view]") || [])];
  const hasPerModuleViews = views.some((view) => view.dataset.moduleView && view.dataset.moduleView !== "route");
  const targetModule = hasPerModuleViews && views.some((view) => view.dataset.moduleView === moduleName)
    ? moduleName
    : (hasPerModuleViews ? fallbackModule : moduleName);
  let activeTab = null;

  documentRef?.querySelectorAll?.("[data-module-tab]").forEach((button) => {
    const isActive = button.dataset.moduleTab === targetModule;
    button.classList.toggle("active", isActive);
    if (isActive) activeTab = button;
  });

  views.forEach((view) => {
    const routeHost = view.dataset.moduleView === "route";
    view.classList.toggle("active", routeHost || view.dataset.moduleView === targetModule);
  });

  documentRef?.body?.classList?.remove?.("is-poker-module");
  return { targetModule, activeTab };
}

export function scrollActiveModuleTab(activeTab, options = {}) {
  const windowRef = options.windowRef || globalThis.window;
  if (!activeTab || !windowRef?.matchMedia?.("(max-width: 760px)")?.matches) return false;
  windowRef.requestAnimationFrame?.(() => {
    activeTab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
  });
  return true;
}
