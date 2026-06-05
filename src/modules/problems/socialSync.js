import {
  getProblemSocialErrorNoticeKey,
  mergeProblemSocialRefresh
} from './social.js';

export function createProblemSocialSyncController(deps = {}) {
  const getSocial = () => deps.getSocial?.() || new Map();
  const getSelectedProblemDetailId = () => deps.getSelectedProblemDetailId?.() || "";
  const getProblemById = (problemId) => deps.getProblemById?.(problemId) || null;

  const renderForProblem = (problemId = "") => {
    if (getSelectedProblemDetailId() && getSelectedProblemDetailId() === problemId) {
      const problem = getProblemById(problemId);
      if (problem) deps.renderProblemDetail?.(problem);
      return;
    }
    deps.renderProblems?.();
  };

  const refresh = async (problemId = "") => {
    try {
      const entries = await deps.requestSocial?.(problemId) || [];
      deps.setSocial?.(mergeProblemSocialRefresh(getSocial(), problemId, entries));
      renderForProblem(problemId);
      return { ok: true, entries };
    } catch (error) {
      if (problemId) {
        deps.setNotice?.(deps.t?.(getProblemSocialErrorNoticeKey()) || getProblemSocialErrorNoticeKey());
        const problem = getProblemById(problemId);
        if (problem) deps.renderProblemDetail?.(problem);
      }
      return { ok: false, error };
    }
  };

  return { refresh };
}
