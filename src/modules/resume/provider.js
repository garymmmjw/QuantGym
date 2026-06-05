import {
  handleAccountResumeFileUpload,
  renderAccountResumeMeta
} from '../account/resumeMeta.js';
import {
  localResumeReview,
  normalizeResumeState
} from './data.js';

export function createResumeProvider(deps = {}) {
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};

  async function handleAccountFile(event) {
    return handleAccountResumeFileUpload(event, {
      elements: getElements(),
      currentResume: getState().resume,
      fileTooLargeLabel: deps.getFileTooLargeLabel?.(),
      setResume(resume) {
        getState().resume = normalizeResumeState(resume);
      },
      saveState: deps.saveState,
      renderResume: deps.renderResume
    });
  }

  function renderAccountMeta() {
    return renderAccountResumeMeta(getElements(), getState().resume, {
      emptyLabel: deps.getEmptyMetaLabel?.()
    });
  }

  function requestReview(text = "") {
    return deps.resumeRuntime?.requestReview?.(text);
  }

  function localReview(text = "") {
    return localResumeReview(text, {
      language: deps.getLanguage?.(),
      graduationTerm: deps.getGraduationTerm?.()
    });
  }

  return {
    handleAccountFile,
    localReview,
    renderAccountMeta,
    requestReview
  };
}
