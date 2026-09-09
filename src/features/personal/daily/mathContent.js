// MathJax 3 mutates its target DOM and requires asynchronous typesetting to be
// serialized. Each target below belongs to one immutable React content version.
export function scheduleMathContent(node, { windowRef = globalThis, isVisible = () => true, timeoutMs = 20000 } = {}) {
  let cancelled = false, timer = null, finishWaiting;
  const started = Date.now();
  const ready = new Promise((resolve, reject) => {
    finishWaiting = () => resolve(null);
    const check = () => {
      if (cancelled) return resolve(null);
      if (windowRef.MathJax?.typesetPromise) return resolve(windowRef.MathJax);
      if (Date.now() - started >= timeoutMs) return reject(new Error('Math rendering has not loaded.'));
      timer = windowRef.setTimeout(check, 50);
    };
    check();
  });
  const done = ready.then(math => {
    if (!math || cancelled) return false;
    const task = Promise.resolve(math.startup?.promise).catch(() => {}).then(async () => {
      if (cancelled || !node.isConnected || !isVisible()) return false;
      await math.typesetPromise([node]);
      if (cancelled || !node.isConnected) {
        math.typesetClear?.([node]);
        return false;
      }
      return true;
    });
    // Share MathJax's documented queue with every personal text block.
    math.startup ||= {};
    math.startup.promise = task.catch(() => {});
    return task;
  });
  return {
    done,
    cancel() {
      cancelled = true;
      if (timer !== null) windowRef.clearTimeout(timer);
      finishWaiting();
      windowRef.MathJax?.typesetClear?.([node]);
    },
  };
}
