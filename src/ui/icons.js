export function refreshIcons(options = {}) {
  const windowRef = options.windowRef || globalThis.window;
  windowRef?.lucide?.createIcons?.();
}
