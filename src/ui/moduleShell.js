export function applyModuleShellState(options = {}) {
  const {
    documentRef = globalThis.document,
    moduleName = "",
    fallbackModule = "overview"
  } = options;
  const views = [...(documentRef?.querySelectorAll?.("[data-module-view]") || [])];
  const targetModule = views.some((view) => view.dataset.moduleView === moduleName)
    ? moduleName
    : fallbackModule;
  let activeTab = null;

  documentRef?.querySelectorAll?.("[data-module-tab]").forEach((button) => {
    const isActive = button.dataset.moduleTab === targetModule;
    button.classList.toggle("active", isActive);
    if (isActive) activeTab = button;
  });

  views.forEach((view) => {
    view.classList.toggle("active", view.dataset.moduleView === targetModule);
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
