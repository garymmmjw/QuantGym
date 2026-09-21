export function createMathTypesetScheduler(options = {}) {
  const windowRef = options.windowRef || globalThis;
  const delayMs = Number.isFinite(Number(options.delayMs)) ? Math.max(0, Number(options.delayMs)) : 80;
  const retryMs = Number.isFinite(Number(options.retryMs)) ? Math.max(1, Number(options.retryMs)) : 100;
  const pending = new Set();
  let timer = null;
  let running = false;
  let disposed = false;

  function pruneDetached() {
    for (const root of pending) {
      if (root.isConnected === false) pending.delete(root);
    }
  }

  function queue(delay = delayMs) {
    if (disposed || running || timer !== null || !pending.size) return;
    timer = windowRef.setTimeout?.(flush, delay) ?? null;
  }

  function flush() {
    timer = null;
    pruneDetached();
    if (disposed || !pending.size) return;
    const mathJax = windowRef.MathJax;
    if (typeof mathJax?.typesetPromise !== "function") {
      // The CDN may load after React has already mounted the question.
      queue(retryMs);
      return;
    }

    running = true;
    // Share MathJax's queue with other callers, including its initial page scan.
    // Take the batch only after startup: roots arriving while it loads belong
    // in the same pass rather than being silently dropped or re-typeset.
    const task = Promise.resolve(mathJax.startup?.promise).catch(() => {}).then(async () => {
      pruneDetached();
      if (disposed || !pending.size) return;
      const roots = [...pending];
      pending.clear();
      const batch = roots.filter(root => !roots.some(other => other !== root && other.contains?.(root)));
      try {
        await mathJax.typesetPromise(batch);
      } finally {
        const removed = batch.filter(root => disposed || root.isConnected === false);
        if (removed.length) mathJax.typesetClear?.(removed);
      }
    });
    mathJax.startup ||= {};
    const settled = task.catch(() => {});
    mathJax.startup.promise = settled;
    settled.then(() => {
      running = false;
      pruneDetached();
      queue();
    });
  }

  function schedule(root) {
    if (disposed || !root || root.isConnected === false) return false;
    pending.add(root);
    queue();
    return true;
  }

  function dispose() {
    disposed = true;
    if (timer !== null) windowRef.clearTimeout?.(timer);
    timer = null;
    pending.clear();
  }

  function isPending() {
    return !disposed && (timer !== null || running || pending.size > 0);
  }

  return {
    dispose,
    isPending,
    schedule
  };
}

// A content version may unmount while MathJax is still processing it. Clear its
// registered math after that work, without changing the next version's DOM.
export function clearMathTypeset(root, options = {}) {
  const mathJax = (options.windowRef || globalThis).MathJax;
  if (!root || typeof mathJax?.typesetClear !== "function") return;
  const task = Promise.resolve(mathJax.startup?.promise).catch(() => {}).then(() => mathJax.typesetClear([root]));
  mathJax.startup ||= {};
  mathJax.startup.promise = task.catch(() => {});
}
