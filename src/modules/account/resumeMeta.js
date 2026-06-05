import { normalizeResumeState } from '../resume/data.js';
import { buildResumeUploadState, formatResumeUploadMeta } from '../resume/file.js';

export function renderAccountResumeMeta(elements = {}, resume = {}, options = {}) {
  if (!elements.accountResumeMeta) return "";
  const text = formatResumeUploadMeta(resume, options.emptyLabel || "");
  elements.accountResumeMeta.textContent = text;
  return text;
}

export async function handleAccountResumeFileUpload(event, options = {}) {
  const elements = options.elements || {};
  const file = event?.target?.files?.[0];
  if (!file) return { ok: false, code: "missingFile" };

  const result = await buildResumeUploadState(file, options.currentResume || {}, {
    fileTooLargeLabel: options.fileTooLargeLabel
  });
  if (!result.ok) {
    if (elements.accountResumeMeta) elements.accountResumeMeta.textContent = result.message || "";
    if (event.target) event.target.value = "";
    return result;
  }

  const resume = normalizeResumeState(result.resume);
  options.setResume?.(resume);
  if (result.textFile && elements.resumeText) elements.resumeText.value = resume.text;
  options.saveState?.();
  options.renderResume?.();
  if (event.target) event.target.value = "";
  return { ...result, resume };
}
