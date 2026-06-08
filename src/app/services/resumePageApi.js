export function createResumePageApi(deps = {}, userStateApi = {}) {
  const { getUserState, setUserPatch } = userStateApi;
  return {
    getResume: () => deps.normalizeResume?.(getUserState().resume || {}) || {},
    setResume(resume) {
      setUserPatch({ resume: deps.normalizeResume?.(resume) || resume });
    },
    saveText(text) {
      const resume = this.getResume();
      this.setResume({ ...resume, text, updatedAt: new Date().toISOString() });
      deps.saveState?.();
    },
    async review(text) {
      const body = String(text || "").trim();
      if (!body) return [deps.t?.("resumeNoContent") || "请先填写简历内容。"];
      this.setResume({ ...this.getResume(), text, updatedAt: new Date().toISOString() });
      deps.saveState?.();
      try {
        return await deps.requestResumeReview?.(body);
      } catch {
        return deps.localResumeReview?.(body) || [];
      }
    },
    getEmptyReviewLabel: deps.getEmptyReviewLabel,
    renderAccountResumeMeta: deps.renderAccountResumeMeta
  };
}
