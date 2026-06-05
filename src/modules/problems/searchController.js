import { normalizeSearchQuery } from "../../lib/text.js";
import { getProblemViewModeForSearch } from "./filters.js";

export function createProblemSearchController(options = {}) {
  let timer = 0;
  let composing = false;
  const debounceMs = Number(options.debounceMs || 140);
  const windowRef = options.windowRef || globalThis.window;

  function clearTimer() {
    if (!timer) return;
    windowRef.clearTimeout(timer);
    timer = 0;
  }

  function schedule() {
    if (composing) return;
    clearTimer();
    timer = windowRef.setTimeout(() => {
      timer = 0;
      options.renderResults?.();
    }, debounceMs);
  }

  function cancel() {
    clearTimer();
  }

  function handleInput() {
    if (composing) return;
    options.clearDetail?.();
    options.resetPagination?.();
    options.setViewMode?.(getProblemViewModeForSearch(options.getQuery?.() || "", options.getViewMode?.() || "all"));
    schedule();
  }

  function handleKeydown(event) {
    if (event.key !== "Enter") return;
    const query = normalizeSearchQuery(options.getQuery?.() || "");
    if (!query) return;
    event.preventDefault();
    cancel();
    const firstMatch = options.getMatches?.({ forceAllView: true })?.[0];
    if (firstMatch) options.openProblem?.(firstMatch.id);
  }

  return {
    cancel,
    schedule,
    handleInput,
    handleKeydown,
    setComposing(value) {
      composing = Boolean(value);
    }
  };
}
