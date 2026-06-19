export function shiftDate(date, amount) {
  const next = dateOrNull(date) || new Date();
  next.setHours(12, 0, 0, 0);
  next.setDate(next.getDate() + amount);
  return next;
}

export function dateOrNull(value) {
  if (value instanceof Date) {
    const timestamp = value.getTime();
    return Number.isFinite(timestamp) ? new Date(timestamp) : null;
  }
  if (typeof value === "number") return Number.isFinite(value) ? new Date(value) : null;
  const text = String(value || "").trim();
  if (!text) return null;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp) : null;
}

export function timestampOrZero(value) {
  return dateOrNull(value)?.getTime() || 0;
}

export function isoOrNow(value, fallback = new Date()) {
  return (dateOrNull(value) || dateOrNull(fallback) || new Date()).toISOString();
}

export function dayKey(date) {
  const d = dateOrNull(date);
  if (!d) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function localDateKey(date = new Date()) {
  return dayKey(date) || dayKey(new Date());
}

export function formatDate(date) {
  const parsed = dateOrNull(date);
  if (!parsed) return String(date || "");
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

export function formatNewsDate(date) {
  const dateOnly = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}/${dateOnly[2]}/${dateOnly[3]}`;
  const parsed = dateOrNull(date);
  if (!parsed) return String(date || "");
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed);
}

export function formatTimeOnly(date) {
  const parsed = dateOrNull(date);
  if (!parsed) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}
