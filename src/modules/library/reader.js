import {
  formatPdfEmbedUrl,
  getLibraryReaderMeta,
  resolveLibraryReaderUrl,
  toReaderUrl
} from './readerAccess.js';
import { probePdfUrl } from './readerProbe.js';

export function createLibraryReader(deps = {}) {
  const getElements = () => deps.elements || {};

  const getLanguage = () => deps.getLanguage?.() || "zh";
  const isEnglish = () => getLanguage() === "en";

  const getReaderUrl = async (entry) => {
    return resolveLibraryReaderUrl(entry, {
      language: getLanguage(),
      canUseCloud: deps.canUseCloud,
      cloudApi: deps.cloudApi,
      getCloudApiBase: deps.getCloudApiBase
    });
  };

  const close = () => {
    const els = getElements();
    els.libraryReaderOverlay?.classList.add("hidden");
    els.libraryReaderOverlay?.classList.remove("is-opening");
    if (els.libraryReaderFrame) els.libraryReaderFrame.src = "about:blank";
    document.body.classList.remove("library-reader-open");
  };

  const open = async (entryId) => {
    const els = getElements();
    const entry = deps.getEntries?.().find((item) => item.id === entryId);
    if (!entry?.readUrl && !entry?.readAssetId) {
      if (entry?.sourceSlug) deps.openPractice?.(entry.sourceSlug);
      return;
    }
    if (entry.readType === "external") {
      window.open(toReaderUrl(entry.readUrl), "_blank", "noopener,noreferrer");
      return;
    }

    if (!els.libraryReaderOverlay || !els.libraryReaderFrame) {
      const url = await getReaderUrl(entry).catch(() => "");
      if (url) window.open(url, "_blank", "noopener,noreferrer");
      return;
    }

    const title = deps.getTitle?.(entry, isEnglish()) || "";
    els.libraryReaderTitle.textContent = title;
    els.libraryReaderMeta.textContent = getLibraryReaderMeta(entry, getLanguage());
    els.libraryReaderOpenNew.innerHTML = `<i data-lucide="external-link"></i>${deps.escapeHtml?.(isEnglish() ? "Open" : "新窗口") || ""}`;
    els.libraryReaderOpenNew.href = "#";
    els.libraryReaderFrame.src = "about:blank";
    els.libraryReaderOverlay.style.setProperty("--reader-cover", `url("${entry.coverUrl || ""}")`);
    els.libraryReaderOverlay.dataset.readerType = entry.readType || "pdf";
    els.libraryReaderOverlay.classList.remove("hidden");
    els.libraryReaderOverlay.classList.add("is-opening");
    document.body.classList.add("library-reader-open");
    deps.refreshIcons?.();

    try {
      const url = await getReaderUrl(entry);
      if (entry.readType === "pdf") await probePdfUrl(url, { language: getLanguage() });
      els.libraryReaderOpenNew.href = url;
      els.libraryReaderFrame.src = entry.readType === "pdf" ? formatPdfEmbedUrl(url) : url;
    } catch (error) {
      close();
      window.alert(error?.message || (isEnglish() ? "Unable to open this PDF." : "暂时无法打开这本 PDF。"));
      return;
    } finally {
      window.setTimeout(() => {
        els.libraryReaderOverlay?.classList.remove("is-opening");
      }, 900);
    }
  };

  return { open, close };
}
