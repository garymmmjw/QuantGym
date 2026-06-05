import { readFilePayload } from '../../lib/files.js';
import { normalizeResumeState } from './data.js';

export function isTextResumeFile(file) {
  return Boolean(file && (/\.(txt|md|tex)$/i.test(file.name || "") || /text|markdown|latex/i.test(file.type || "")));
}

export async function buildResumeUploadState(file, currentResume = {}, options = {}) {
  if (!file) return { ok: false, code: "missingFile", message: "" };
  const maxBytes = options.maxBytes || 5 * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      ok: false,
      code: "fileTooLarge",
      message: options.fileTooLargeLabel || "Resume file is too large. Keep it under 5MB."
    };
  }

  const now = options.now || new Date().toISOString();
  const nextResume = {
    ...currentResume,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    uploadedAt: now,
    updatedAt: now
  };
  const textFile = isTextResumeFile(file);
  if (textFile) {
    const readPayload = options.readFilePayload || readFilePayload;
    const payload = await readPayload(file, { preferDataUrl: false });
    nextResume.text = payload.text || "";
  }

  return {
    ok: true,
    textFile,
    resume: normalizeResumeState(nextResume)
  };
}

export function formatResumeUploadMeta(resume = {}, emptyLabel = "") {
  const normalized = normalizeResumeState(resume);
  if (!normalized.fileName) return emptyLabel;
  const sizeKb = Math.max(1, Math.round(normalized.fileSize / 1024));
  return `${normalized.fileName} · ${sizeKb} KB`;
}
