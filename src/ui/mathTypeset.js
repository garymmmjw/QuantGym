export function createMathTypesetScheduler(options = {}) {
  const windowRef = options.windowRef || globalThis;
  const delayMs = Number.isFinite(Number(options.delayMs)) ? Number(options.delayMs) : 80;
  let timer = null;

  function schedule(root) {
    const mathJax = windowRef.MathJax;
    if (!root || !mathJax?.typesetPromise || timer) return false;
    timer = windowRef.setTimeout?.(() => {
      timer = null;
      mathJax.typesetPromise([root]).catch(() => {});
    }, delayMs) || null;
    return Boolean(timer);
  }

  function dispose() {
    if (timer) windowRef.clearTimeout?.(timer);
    timer = null;
  }

  function isPending() {
    return Boolean(timer);
  }

  return {
    dispose,
    isPending,
    schedule
  };
}
