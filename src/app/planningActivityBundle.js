import { createPlanControllerBundle } from '../modules/plan/controllerBundle.js';
import { createStreakController } from '../ui/streakController.js';

export function createPlanningActivityBundle(deps = {}) {
  const {
    appState,
    buildTodayStudyPlan,
    documentRef: document,
    elements: els,
    escapeAttribute,
    escapeHtml,
    formatCategoryLabel,
    getCurrentUser,
    getInterviewRuntimeState,
    getLocale,
    getStreak,
    getState,
    localDateKey,
    localStatePayload,
    makeId,
    openModule,
    queueCloudSync,
    refreshIcons,
    renderInterviewSetup,
    renderProblems,
    renderTodayPlan,
    resetInterview,
    saveState,
    setText,
    skillDefs,
    t,
    userStateKey,
    windowRef: window,
    writeUserState
  } = deps;

  const planControllerBundle = createPlanControllerBundle({
    elements: els,
    documentRef: document,
    getState,
    buildTodayStudyPlan,
    fallbackSummary: () => t("planGenerated"),
    makeId,
    localDateKey,
    saveState,
    renderTodayPlan,
    setText,
    formatCategoryLabel,
    skillDefs,
    openModule,
    renderProblems,
    getInterviewRuntimeState,
    resetInterview,
    renderInterviewSetup,
    escapeHtml,
    escapeAttribute,
    t,
    refreshIcons
  });

  const streakController = createStreakController({
    elements: els,
    windowRef: window,
    getState,
    getCurrentUser,
    getStreak,
    getLocale,
    t,
    escapeHtml,
    writeUserState,
    serializeState: localStatePayload,
    userStateKey,
    queueCloudSync,
    nowIso: () => new Date().toISOString()
  });

  return {
    getTodoDockPlan: planControllerBundle.getTodoDockPlan,
    renderTodoDock: planControllerBundle.renderTodoDock,
    toggleTodoDock: planControllerBundle.toggleTodoDock,
    closeTodoDock: planControllerBundle.closeTodoDock,
    handleTodoDockClick: planControllerBundle.handleTodoDockClick,
    handleTodoDockEdit: planControllerBundle.handleTodoDockEdit,
    addTodoTask: planControllerBundle.addTodoTask,
    createPrepPlan: planControllerBundle.createPrepPlan,
    renderPrepPlan: planControllerBundle.renderPrepPlan,
    updatePrepTaskIndicator: planControllerBundle.updatePrepTaskIndicator,
    populatePrepPlanForm: planControllerBundle.populatePrepPlanForm,
    getPrepStageIndex: planControllerBundle.getPrepStageIndex,
    getPrepPaceText: planControllerBundle.getPrepPaceText,
    weeksUntilDate: planControllerBundle.weeksUntilDate,
    getPrepFocusSkills: planControllerBundle.getPrepFocusSkills,
    getPrepDailyTasks: planControllerBundle.getPrepDailyTasks,
    renderPrepTaskMarkup: planControllerBundle.renderPrepTaskMarkup,
    renderPrepDiagnosticMarkup: planControllerBundle.renderPrepDiagnosticMarkup,
    handlePrepPlanAction: planControllerBundle.handlePrepPlanAction,
    togglePrepTask: planControllerBundle.togglePrepTask,
    submitPrepDiagnostic: planControllerBundle.submitPrepDiagnostic,
    openPrepTask: planControllerBundle.openPrepTask,
    editPrepPlan: planControllerBundle.editPrepPlan,
    animateStreakCount: streakController.animateCount,
    hasCheckedInToday: streakController.hasCheckedInToday,
    markActivityCheckIn: streakController.markActivity,
    persistActivityCheckIn: streakController.persistActivity,
    queueCheckInCelebration: streakController.queueCelebration,
    renderStreakCalendar: streakController.renderCalendar,
    setStreakPanelOpen: streakController.setPanelOpen,
    showCheckInToast: streakController.showToast,
    toggleStreakPanel: streakController.togglePanel,
    updateCheckInPill: streakController.updatePill,
    userStateActivityHooks: {
      markActivity: streakController.markActivity,
      queueCelebration: streakController.queueCelebration
    },
    communityActivityHooks: {
      persistActivity: streakController.persistActivity
    }
  };
}
