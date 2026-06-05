export function applySidebarState(options = {}) {
  const {
    documentRef = globalThis.document,
    prefs = {},
    button = null,
    t = (key) => key,
    refreshIcons = () => {}
  } = options;
  const collapsed = prefs.sidebarCollapsed === true;
  documentRef?.body?.classList?.toggle?.("sidebar-collapsed", collapsed);
  if (!button) return;

  const label = t(collapsed ? "sidebarShow" : "sidebarHide");
  const icon = button.querySelector?.("i");
  button.setAttribute("aria-expanded", String(!collapsed));
  button.setAttribute("aria-label", label);
  button.title = label;
  if (icon) icon.setAttribute("data-lucide", collapsed ? "panel-left-open" : "panel-left-close");
  refreshIcons();
}
