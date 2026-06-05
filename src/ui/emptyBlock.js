export function createEmptyBlock(text, options = {}) {
  const documentRef = options.documentRef || globalThis.document;
  const item = documentRef.createElement("div");
  item.className = "history-item";
  const paragraph = documentRef.createElement("p");
  paragraph.textContent = text;
  item.appendChild(paragraph);
  return item;
}
