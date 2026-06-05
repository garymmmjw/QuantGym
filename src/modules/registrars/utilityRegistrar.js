import { registerModule } from '../registry.js';
import { createPlanModule } from '../plan/index.js';
import { createResumeModule } from '../resume/index.js';
import { createSettingsModule } from '../settings/index.js';

export function registerUtilityModules(deps = {}) {
  registerModule("plan", createPlanModule({
    elements: deps.elements,
    render: deps.renderPrepPlan,
    create: deps.createPrepPlan,
    edit: deps.editPrepPlan,
    handleAction: deps.handlePrepPlanAction,
    submitDiagnostic: deps.submitPrepDiagnostic
  }));

  registerModule("resume", createResumeModule({
    elements: deps.elements,
    getResume: deps.getResume,
    setResume: deps.setResume,
    normalizeResume: deps.normalizeResume,
    saveState: deps.saveState,
    requestReview: deps.requestResumeReview,
    localReview: deps.localResumeReview,
    renderAccountResumeMeta: deps.renderAccountResumeMeta,
    setButtonBusy: deps.setButtonBusy,
    getEmptyReviewLabel: deps.getEmptyReviewLabel,
    t: deps.t
  }));

  registerModule("settings", createSettingsModule({
    elements: deps.elements,
    getCurrentUser: deps.getCurrentUser,
    getLanguage: deps.getLanguage,
    getLlmConfig: deps.getLlmConfig,
    getCloudConfig: deps.getCloudConfig,
    getAuth: deps.getAuth,
    defaultCloudApiEndpoint: deps.defaultCloudApiEndpoint,
    renderCountries: deps.renderCountries,
    renderRegions: deps.renderRegions,
    renderCloudStatus: deps.renderCloudStatus,
    save: deps.saveSettings,
    syncCloud: deps.syncCloud,
    setLanguage: deps.setLanguage,
    exportState: deps.exportState,
    importState: deps.importState,
    resetState: deps.resetState
  }));
}
