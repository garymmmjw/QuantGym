function getDocumentRoot(root) {
  return root || globalThis.document;
}

export function setButtonLabel(selector, label, root = globalThis.document) {
  const button = getDocumentRoot(root)?.querySelector(selector);
  if (!button) return;
  setButtonInlineLabel(button, label, root);
}

export function setButtonInlineLabel(button, label, root = globalThis.document) {
  if (!button) return;
  const documentRef = button.ownerDocument || getDocumentRoot(root) || globalThis.document;
  const icon = button.querySelector("svg, i");
  button.textContent = "";
  if (icon) button.append(icon, documentRef.createTextNode(` ${label}`));
  else button.textContent = label;
}

export function flashButtonLabel(button, temporaryText, defaultText, options = {}) {
  if (!button) return 0;
  const delay = Number(options.delay || 1500);
  const setTimeoutImpl = options.setTimeoutImpl || globalThis.setTimeout;
  setButtonInlineLabel(button, temporaryText, options.root);
  return setTimeoutImpl(() => setButtonInlineLabel(button, defaultText, options.root), delay);
}

export function setButtonBusy(button, busy, label = "", options = {}) {
  if (!button) return;
  button.disabled = Boolean(busy);
  if (busy) {
    button.dataset.originalText = button.textContent.trim();
    if (label) setButtonInlineLabel(button, label, options.root);
  } else if (button.dataset.originalText) {
    setButtonInlineLabel(button, button.dataset.originalText, options.root);
    delete button.dataset.originalText;
  }
}

export function setFileLabel(selector, input, labelText, root = globalThis.document) {
  const label = selector ? getDocumentRoot(root)?.querySelector(selector) : input?.closest("label");
  if (!label) return;
  const icon = label.querySelector("svg, i");
  label.textContent = "";
  if (input) label.appendChild(input);
  if (icon) label.append(icon, globalThis.document.createTextNode(` ${labelText}`));
  else label.append(labelText);
}

export function setText(selector, text, root = globalThis.document) {
  const node = getDocumentRoot(root)?.querySelector(selector);
  if (node) node.textContent = text;
}

export function setAttribute(selector, attribute, value, root = globalThis.document) {
  const node = getDocumentRoot(root)?.querySelector(selector);
  if (node) node.setAttribute(attribute, value);
}

export function setTexts(selector, values, root = globalThis.document) {
  getDocumentRoot(root)?.querySelectorAll(selector).forEach((node, index) => {
    if (values[index]) node.textContent = values[index];
  });
}

export function applyStaticTranslations(root = globalThis.document, text = (key) => key) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = text(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", text(node.dataset.i18nPlaceholder));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", text(node.dataset.i18nTitle));
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", text(node.dataset.i18nAriaLabel));
  });
}

export function setButtonLabels(selector, labels, root = globalThis.document) {
  getDocumentRoot(root)?.querySelectorAll(selector).forEach((button, index) => {
    if (!labels[index]) return;
    const icon = button.querySelector("svg, i");
    button.textContent = "";
    if (icon) button.append(icon, globalThis.document.createTextNode(` ${labels[index]}`));
    else button.textContent = labels[index];
  });
}

export function setSelectOptionLabels(select, labels) {
  const options = select?.options || [];
  labels.forEach((label, index) => {
    if (options[index]) options[index].textContent = label;
  });
}

export function setPlaceholder(input, text) {
  if (input) input.placeholder = text;
}

export function setLabelText(input, text) {
  const label = input?.closest("label");
  if (!label) return;
  const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (textNode) textNode.textContent = `\n                ${text}\n                `;
}
