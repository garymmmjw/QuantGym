export function renderPkFeed(container, items = [], options = {}) {
  if (!container) return false;
  const documentRef = options.documentRef || globalThis.document;
  container.innerHTML = "";
  items.forEach((text) => {
    const item = documentRef.createElement("div");
    item.className = "pk-feed-item";
    item.textContent = text;
    container.appendChild(item);
  });
  return true;
}
