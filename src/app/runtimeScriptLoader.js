export function loadRuntimeScript(src, { documentRef = document, timeoutMs = 20000, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  return new Promise((resolve, reject) => {
    const script = documentRef.createElement('script');
    let settled = false;
    const finish = error => {
      if (settled) return;
      settled = true;
      clearTimer(timer);
      script.onload = script.onerror = null;
      if (error) { script.remove(); reject(error); } else resolve(true);
    };
    const timer = setTimer(() => finish(new Error('runtime_timeout')), timeoutMs);
    script.src = src;
    script.async = false;
    script.onload = () => finish();
    script.onerror = () => finish(new Error('runtime_unavailable'));
    documentRef.head.append(script);
  });
}
