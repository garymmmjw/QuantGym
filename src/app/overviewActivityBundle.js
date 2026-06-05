import { createOverviewActivityController } from '../modules/overview/activityController.js';

export function createOverviewActivityBundle(deps = {}) {
  const {
    appState,
    DEFAULT_GRADUATION_TERM,
    documentRef: document,
    elements: els,
    formatCategoryLabel,
    getLanguage,
    getLocale,
    getSkillScore,
    localDateKey,
    makeId,
    normalizeLeetcodeHot100Done,
    normalizePrepPlan,
    normalizeStudyPlan,
    refreshIcons,
    renderTodoDock,
    saveState,
    switchModule,
    t,
    userState,
    windowRef: window
  } = deps;

  const overviewActivityController = createOverviewActivityController({
    elements: els,
    documentRef: document,
    windowRef: window,
    getState: () => userState.value,
    getLocale,
    getLanguage,
    normalizeLeetcodeHot100Done,
    normalizePrepPlan,
    normalizeStudyPlan,
    makeId,
    getSkillScore,
    getGraduationTerm: () => appState.currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM,
    localDateKey,
    formatCategoryLabel,
    t,
    switchModule,
    renderTodoDock,
    saveState,
    refreshIcons
  });

  return {
    buildLegacyTodayStudyPlan: overviewActivityController.buildLegacyTodayStudyPlan,
    buildMonthlyContributionHeatmap: overviewActivityController.buildMonthlyContributionHeatmap,
    buildRecentContributionHeatmap: overviewActivityController.buildRecentContributionHeatmap,
    buildTodayStudyPlan: overviewActivityController.buildTodayStudyPlan,
    generateTodayStudyPlan: overviewActivityController.generateTodayStudyPlan,
    getContributionSeries: overviewActivityController.getContributionSeries,
    getContributionStatsByDay: overviewActivityController.getContributionStatsByDay,
    getDailyXpSeries: overviewActivityController.getDailyXpSeries,
    renderTodayPlan: overviewActivityController.renderTodayPlan
  };
}
