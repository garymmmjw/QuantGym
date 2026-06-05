const DEFAULT_RIPPLE_SELECTOR = [
  "button",
  ".primary-button",
  ".secondary-button",
  ".module-tab",
  ".segment",
  ".library-card",
  ".feature-launch-card",
  ".leetcode-hot-link",
  ".leetcode-hot-done",
  ".todo-dock-button",
  ".todo-task-toggle"
].join(", ");

export function setupButtonRipples(root = globalThis.document, options = {}) {
  const selector = options.selector || DEFAULT_RIPPLE_SELECTOR;
  const excludedSelector = options.excludedSelector || ".auth-provider-stack";
  const handleClick = (event) => {
    const button = event.target.closest(selector);
    if (!button || button.closest(excludedSelector)) return;
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ripple = document.createElement("span");
    ripple.className = "ui-ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  };
  root.addEventListener("click", handleClick);
  return () => root.removeEventListener("click", handleClick);
}
