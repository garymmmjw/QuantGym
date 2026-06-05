export function toReaderUrl(value = "") {
  if (!value) return "";
  return encodeURI(value).replace(/#/g, "%23");
}

export function absolutizeApiUrl(url, apiBase = "") {
  const raw = String(url || "").trim();
  if (/^https?:\/\//i.test(raw)) return raw;
  try {
    const base = new URL(apiBase || "");
    return `${base.origin}${raw.startsWith("/") ? raw : `/${raw}`}`;
  } catch {
    return raw;
  }
}

export function formatPdfEmbedUrl(url) {
  const raw = String(url || "").trim();
  if (!raw) return "";
  const [base] = raw.split("#");
  return `${base}#toolbar=0&navpanes=0&scrollbar=1&view=FitH&statusbar=0&messages=0`;
}

export function getLibraryReaderKindLabel(entry = {}, language = "zh") {
  const isEnglish = language === "en";
  return entry.kind === "questionSet"
    ? (isEnglish ? "Question Set" : "题单")
    : (isEnglish ? "Book" : "书籍");
}

export function getLibraryReaderMeta(entry = {}, language = "zh") {
  const isEnglish = language === "en";
  const accessLabel = entry.readType === "pdf"
    ? (isEnglish ? "Secure PDF" : "安全 PDF")
    : "HTML";
  return `${accessLabel} · ${getLibraryReaderKindLabel(entry, language)}`;
}

export async function resolveLibraryReaderUrl(entry = {}, deps = {}) {
  const language = deps.language === "en" ? "en" : "zh";
  const isEnglish = language === "en";
  if (entry.readType !== "pdf") return toReaderUrl(entry.readUrl);
  if (!entry.readAssetId) {
    throw new Error(isEnglish
      ? "This PDF is not configured for online reading."
      : "这本 PDF 尚未配置线上阅读。");
  }
  if (!deps.canUseCloud?.()) {
    throw new Error(isEnglish
      ? "Please sign in or register with the cloud account before reading PDFs."
      : "请先用云端账号登录或注册后再阅读 PDF。");
  }
  const result = await deps.cloudApi?.(`/library/reader-token/${encodeURIComponent(entry.readAssetId)}`, { method: "POST" });
  const url = result?.url || result?.path || "";
  if (!url) {
    throw new Error(isEnglish
      ? "The server did not return a reader URL."
      : "服务器没有返回阅读链接。");
  }
  return absolutizeApiUrl(url, deps.getCloudApiBase?.() || "");
}
