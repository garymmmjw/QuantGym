// Measure natural content, not document.scrollHeight (which includes the iframe
// viewport and prevents the host from shrinking after a long course map).
export function measureLearnDocument(document) {
  return Math.max(1, Math.ceil(document.body?.getBoundingClientRect().height || 0));
}

export function installEmbeddedLayout(win, bridge) {
  let queued = null, previous = 0, active = true;
  const report = () => {
    queued = null;
    if (!active) return;
    const height = measureLearnDocument(win.document);
    if (height !== previous) { previous = height; bridge.reportLayout(height); }
  };
  const schedule = () => { if (active && queued === null) queued = win.requestAnimationFrame(report); };
  const resize = new win.ResizeObserver(schedule);
  resize.observe(win.document.body);
  const root = win.document.getElementById('root');
  if (root) resize.observe(root);
  const mutation = new win.MutationObserver(schedule);
  mutation.observe(win.document.body, { childList: true, subtree: true, attributes: true, characterData: true });
  win.addEventListener('resize', schedule);
  win.document.addEventListener('load', schedule, true);
  win.document.fonts?.ready.then(schedule);
  schedule();
  return () => {
    active = false;
    if (queued !== null) win.cancelAnimationFrame(queued);
    resize.disconnect(); mutation.disconnect();
    win.removeEventListener('resize', schedule);
    win.document.removeEventListener('load', schedule, true);
  };
}
