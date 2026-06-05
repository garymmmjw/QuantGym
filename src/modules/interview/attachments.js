import { escapeHtml } from '../../lib/text.js';

export function formatInterviewFileMeta(file, fallback = "", options = {}) {
  if (!file) return fallback;
  const minKb = Number(options.minKb || 0);
  const sizeKb = Math.max(minKb, Math.round(Number(file.size || 0) / 1024));
  return `${file.name || "attachment"} · ${sizeKb} KB`;
}

export function renderInterviewFileMeta(node, file, fallback = "", options = {}) {
  if (!node) return "";
  const label = formatInterviewFileMeta(file, fallback, options);
  node.textContent = label;
  return label;
}

export function renderInterviewAttachmentPreview(container, file, label = "", options = {}) {
  if (!container) return false;
  const documentRef = options.documentRef || globalThis.document;
  container.innerHTML = "";
  container.classList.toggle("hidden", !file);
  if (!file) return true;

  const chip = documentRef.createElement("span");
  chip.className = "interview-attachment-chip";
  chip.innerHTML = `<i data-lucide="${file.type?.startsWith("image/") ? "image" : "paperclip"}"></i><span>${escapeHtml(label)}</span>`;
  container.appendChild(chip);
  options.refreshIcons?.();
  return true;
}

export function autoSizeInterviewAnswer(textarea, options = {}) {
  if (!textarea) return false;
  const min = Number(options.min || 44);
  const max = Number(options.max || 220);
  textarea.style.height = "auto";
  textarea.style.height = `${Math.min(Math.max(min, textarea.scrollHeight), max)}px`;
  return true;
}
