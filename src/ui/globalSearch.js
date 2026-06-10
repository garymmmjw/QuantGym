import { cssEscape } from '../lib/dom.js';

export function createGlobalSearchController(options = {}) {
  const {
    elements,
    buildResults = () => [],
    activateResult = () => {},
    emptyLabel = () => ""
  } = options;
  let matches = [];
  let timer = 0;
  let composing = false;

  function clearTimer() {
    if (!timer) return;
    window.clearTimeout(timer);
    timer = 0;
  }

  function render() {
    clearTimer();
    if (!elements.globalSearchInput || !elements.globalSearchResults) return;
    const query = elements.globalSearchInput.value.trim();
    matches = buildResults(query);
    elements.globalSearchResults.innerHTML = "";
    if (!query) {
      hide();
      return;
    }

    if (!matches.length) {
      const empty = document.createElement("div");
      empty.className = "global-search-empty";
      empty.textContent = emptyLabel();
      elements.globalSearchResults.appendChild(empty);
      elements.globalSearchResults.classList.remove("hidden");
      return;
    }

    matches.forEach((result, index) => {
      const button = document.createElement("button");
      button.className = "global-search-result";
      button.type = "button";
      button.dataset.searchIndex = String(index);
      const meta = document.createElement("span");
      meta.className = "global-search-result-meta";
      meta.textContent = result.typeLabel;
      const title = document.createElement("strong");
      title.textContent = result.title;
      const detail = document.createElement("small");
      detail.textContent = result.detail;
      button.append(meta, title, detail);
      button.addEventListener("mousedown", (event) => event.preventDefault());
      button.addEventListener("click", () => activateResult(index));
      elements.globalSearchResults.appendChild(button);
    });
    elements.globalSearchResults.classList.remove("hidden");
  }

  function schedule() {
    if (composing) return;
    clearTimer();
    timer = window.setTimeout(() => {
      timer = 0;
      render();
    }, 90);
  }

  function hide() {
    clearTimer();
    elements.globalSearchResults?.classList.add("hidden");
  }

  function clear() {
    if (elements.globalSearchInput) elements.globalSearchInput.value = "";
    matches = [];
    hide();
  }

  function handleKeydown(event) {
    if (event.key === "Escape") {
      hide();
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      clearTimer();
      if (!matches.length) render();
      if (matches.length) activateResult(0);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
    const buttons = [...(elements.globalSearchResults?.querySelectorAll(".global-search-result") || [])];
    if (!buttons.length) return;
    event.preventDefault();
    const current = buttons.findIndex((button) => button === document.activeElement);
    const delta = event.key === "ArrowDown" ? 1 : -1;
    const next = current < 0 ? 0 : (current + delta + buttons.length) % buttons.length;
    buttons[next].focus();
  }

  return {
    render,
    schedule,
    hide,
    clear,
    handleKeydown,
    getMatch(index) {
      return matches[index];
    },
    setComposing(value) {
      composing = Boolean(value);
    }
  };
}

export function updateGlobalSearchPlaceholder(elements = {}, options = {}) {
  const {
    windowRef = globalThis.window,
    t = (key) => key
  } = options;
  const input = elements.globalSearchInput;
  if (!input) return;
  const compact = windowRef?.matchMedia?.("(max-width: 520px)")?.matches;
  input.placeholder = t(compact ? "appSearchPlaceholderCompact" : "appSearchPlaceholder");
  input.setAttribute("aria-label", t("appSearchPlaceholder"));
}

export function spotlightElement(selector, options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const windowRef = options.windowRef || globalThis.window;
  const node = documentRef?.querySelector?.(selector);
  if (!node) return false;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("spotlight");
  windowRef?.setTimeout?.(() => node.classList.remove("spotlight"), 900);
  return true;
}

export function activateGlobalSearchResult(controller, index, actions = {}) {
  const result = controller?.getMatch?.(index);
  if (!result) return false;
  const windowRef = actions.windowRef || globalThis.window;
  const documentRef = actions.documentRef || globalThis.document;
  const spotlight = actions.spotlight || ((selector) => spotlightElement(selector, { documentRef, windowRef }));
  const scheduleSpotlight = (selector) => {
    windowRef?.setTimeout?.(() => spotlight(selector), actions.spotlightDelay ?? 80);
  };
  const dispatchProblemOpen = (problemId) => {
    const CustomEventCtor = windowRef?.CustomEvent || globalThis.CustomEvent;
    if (!windowRef?.dispatchEvent || !CustomEventCtor || !problemId) return;
    windowRef.dispatchEvent(new CustomEventCtor("quantgym:problem-open", {
      detail: { problemId, source: "global-search" }
    }));
  };

  actions.clear?.();

  if (result.type === "module") {
    actions.switchModule?.(result.module);
    return true;
  }
  if (result.type === "problem") {
    actions.switchModule?.("problems");
    dispatchProblemOpen(result.id);
    actions.openProblem?.(result.id);
    windowRef?.setTimeout?.(() => dispatchProblemOpen(result.id), actions.spotlightDelay ?? 120);
    return true;
  }
  if (result.type === "job") {
    actions.switchModule?.("jobs");
    scheduleSpotlight(`[data-job-id="${cssEscape(result.id)}"]`);
    return true;
  }
  if (result.type === "company") {
    actions.setCompanyTier?.("all");
    actions.switchModule?.("companies");
    scheduleSpotlight(`[data-company-card="${cssEscape(result.id)}"]`);
    return true;
  }
  if (result.type === "course") {
    actions.switchModule?.("courses");
    scheduleSpotlight(`[data-course-id="${cssEscape(result.id)}"]`);
    return true;
  }
  if (result.type === "skill") {
    actions.switchModule?.("skills");
    windowRef?.setTimeout?.(() => {
      actions.setRadarHover?.(result.id);
      windowRef?.dispatchEvent?.(new CustomEvent("quantgym:skill-focus", {
        detail: { skillKey: result.id }
      }));
      spotlight(`[data-skill-key="${cssEscape(result.id)}"]`);
    }, actions.spotlightDelay ?? 120);
    return true;
  }
  if (result.type === "news") {
    actions.focusNews?.(result.id);
    return true;
  }
  return false;
}
