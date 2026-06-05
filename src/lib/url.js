import { escapeHtml } from "./text.js";

export function escapeAttribute(value) {
  const raw = String(value || "#").trim();
  if (!/^https?:\/\//i.test(raw)) return "#";
  return escapeHtml(raw);
}

export function safeExternalUrl(value) {
  const raw = String(value || "#").trim();
  return /^https?:\/\//i.test(raw) ? raw : "#";
}

export function inferSourceFromUrl(value, fallback = "manual") {
  try {
    return new URL(String(value || "")).hostname.replace(/^www\./, "") || fallback;
  } catch {
    return fallback;
  }
}

export function openExternalUrl(value, options = {}) {
  const url = safeExternalUrl(value);
  if (url === "#") return false;
  const windowRef = options.windowRef || globalThis.window;
  windowRef?.open?.(url, "_blank", "noopener,noreferrer");
  return true;
}
