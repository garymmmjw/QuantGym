export function listen(node, eventName, handler, options) {
  if (!node) return () => {};
  node.addEventListener(eventName, handler, options);
  return () => node.removeEventListener(eventName, handler, options);
}
