import { createResumeReviewRequester } from './review.js';

export function createResumeRuntime(deps = {}) {
  let resumeReviewRequester = null;

  function getResumeReviewRequester() {
    if (!resumeReviewRequester) {
      resumeReviewRequester = createResumeReviewRequester({
        getEndpoint: deps.getEndpoint,
        getFallbackEndpoint: deps.getFallbackEndpoint,
        getModel: deps.getModel,
        getFallbackModel: deps.getFallbackModel,
        normalizeModel: deps.normalizeModel,
        setLlmConfig: deps.setLlmConfig,
        saveLlmConfig: deps.saveLlmConfig,
        getHeaders: deps.getHeaders,
        getLanguage: deps.getLanguage,
        getGraduationTerm: deps.getGraduationTerm,
        requestReview: deps.requestReview
      });
    }
    return resumeReviewRequester;
  }

  async function requestReview(text = "") {
    return getResumeReviewRequester().request(text);
  }

  return {
    getResumeReviewRequester,
    requestReview
  };
}
