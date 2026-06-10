let scheduledFrame = 0;
const pendingRefreshes = [];

function runRefresh({ root, windowRef }) {
  const createIcons = windowRef?.lucide?.createIcons;
  if (!createIcons) return;
  try {
    createIcons({ root });
  } catch (error) {
    createIcons();
  }
}

function flushPendingRefreshes() {
  scheduledFrame = 0;
  const refreshes = pendingRefreshes.splice(0, pendingRefreshes.length);
  refreshes.forEach(runRefresh);
}

export function refreshIcons(options = {}) {
  const windowRef = options.windowRef || globalThis.window;
  const root = options.root || options.documentRef || windowRef?.document || globalThis.document;
  if (!root) return;
  if (options.immediate) {
    runRefresh({ root, windowRef });
    return;
  }
  if (!pendingRefreshes.some((item) => item.root === root && item.windowRef === windowRef)) {
    pendingRefreshes.push({ root, windowRef });
  }
  if (scheduledFrame) return;
  const schedule = windowRef?.requestAnimationFrame
    || ((callback) => windowRef?.setTimeout?.(callback, 0) || globalThis.setTimeout?.(callback, 0));
  scheduledFrame = schedule(flushPendingRefreshes);
}
