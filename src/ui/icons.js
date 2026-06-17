let scheduledFrame = 0;
const pendingRefreshes = [];
const ICON_SELECTOR = "[data-lucide]";

function isIconPlaceholder(node) {
  return Boolean(
    node?.nodeType === 1
    && node.tagName?.toLowerCase() !== "svg"
    && node.getAttribute?.("data-lucide")
  );
}

function collectIconPlaceholders(root) {
  const placeholders = [];
  if (isIconPlaceholder(root)) {
    placeholders.push(root);
  }
  root.querySelectorAll?.(ICON_SELECTOR).forEach((node) => {
    if (isIconPlaceholder(node)) {
      placeholders.push(node);
    }
  });
  return placeholders;
}

function getDocument(root, windowRef) {
  if (root?.nodeType === 9) return root;
  return root?.ownerDocument || windowRef?.document || globalThis.document;
}

function hasRenderedIcon(node, iconName) {
  const child = node.firstElementChild;
  return node.getAttribute("data-lucide-rendered") === "true"
    && node.getAttribute("data-lucide-rendered-name") === iconName
    && child?.tagName?.toLowerCase() === "svg";
}

function createDetachedIcon({ source, iconName, createIcons, documentRef }) {
  const wrapper = documentRef.createElement("div");
  const shell = source.cloneNode(false);
  shell.removeAttribute("id");
  shell.removeAttribute("data-lucide-rendered");
  shell.removeAttribute("data-lucide-rendered-name");
  shell.setAttribute("data-lucide", iconName);
  wrapper.append(shell);
  createIcons({ root: wrapper });
  return wrapper.querySelector("svg[data-lucide]");
}

function renderIconPlaceholder({ source, createIcons, documentRef }) {
  const iconName = source.getAttribute("data-lucide");
  if (!iconName || hasRenderedIcon(source, iconName)) return;
  try {
    const svg = createDetachedIcon({ source, iconName, createIcons, documentRef });
    if (!svg) return;
    source.replaceChildren(svg);
    source.setAttribute("data-lucide-rendered", "true");
    source.setAttribute("data-lucide-rendered-name", iconName);
  } catch (error) {
    source.removeAttribute("data-lucide-rendered");
    source.removeAttribute("data-lucide-rendered-name");
  }
}

function runRefresh({ root, windowRef }) {
  const createIcons = windowRef?.lucide?.createIcons;
  if (!createIcons) return;
  const documentRef = getDocument(root, windowRef);
  if (!documentRef) return;
  collectIconPlaceholders(root).forEach((source) => {
    renderIconPlaceholder({ source, createIcons, documentRef });
  });
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
