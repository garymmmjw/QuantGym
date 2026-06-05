import { createResumeProvider } from './provider.js';
import { createResumeRuntime } from './runtime.js';

export function createResumeControllerBundle(deps = {}) {
  const runtime = createResumeRuntime({
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

  const provider = createResumeProvider({
    elements: deps.elements,
    getState: deps.getState,
    resumeRuntime: runtime,
    getLanguage: deps.getLanguage,
    getGraduationTerm: deps.getGraduationTerm,
    getFileTooLargeLabel: deps.getFileTooLargeLabel,
    getEmptyMetaLabel: deps.getEmptyMetaLabel,
    saveState: deps.saveState,
    renderResume: deps.renderResume
  });

  return {
    handleAccountFile: provider.handleAccountFile,
    localReview: provider.localReview,
    provider,
    renderAccountMeta: provider.renderAccountMeta,
    requestReview: provider.requestReview,
    runtime
  };
}
