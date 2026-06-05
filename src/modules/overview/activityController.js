import {
  buildMonthlyContributionHeatmap as buildMonthlyContributionHeatmapValue,
  buildRecentContributionHeatmap as buildRecentContributionHeatmapValue,
  getContributionSeries as getContributionSeriesValue,
  getContributionStatsByDay as getContributionStatsByDayValue,
  getDailyXpSeries as getDailyXpSeriesValue
} from './data.js';
import {
  flashTodayPlanCreated,
  renderTodayPlanCard
} from './todayPlan.js';
import {
  buildLegacyTodayStudyPlan as buildLegacyTodayStudyPlanValue,
  buildTodayStudyPlan as buildTodayStudyPlanValue
} from '../plan/data.js';

export function createOverviewActivityController(deps = {}) {
  const getState = () => deps.getState?.() || {};
  const getElements = () => deps.elements || {};

  function getDailyXpSeries(days = 7) {
    return getDailyXpSeriesValue({
      days,
      entries: getState().entries,
      locale: deps.getLocale?.()
    });
  }

  function getContributionStatsByDay(today = new Date()) {
    const state = getState();
    return getContributionStatsByDayValue({
      entries: state.entries,
      problemStates: state.problemStates,
      leetcodeHot100Done: state.leetcodeHot100Done,
      normalizeLeetcodeHot100Done: deps.normalizeLeetcodeHot100Done,
      today
    });
  }

  function getContributionSeries(days = 35) {
    const today = new Date();
    return getContributionSeriesValue({
      days,
      today,
      statsByDay: getContributionStatsByDay(today)
    });
  }

  function buildRecentContributionHeatmap(weekCount = 12) {
    const today = new Date();
    return buildRecentContributionHeatmapValue({
      weekCount,
      today,
      locale: deps.getLocale?.(),
      statsByDay: getContributionStatsByDay(today)
    });
  }

  function buildMonthlyContributionHeatmap(monthCount = 4) {
    const state = getState();
    return buildMonthlyContributionHeatmapValue({
      monthCount,
      locale: deps.getLocale?.(),
      today: new Date(),
      entries: state.entries,
      problemStates: state.problemStates,
      leetcodeHot100Done: state.leetcodeHot100Done,
      normalizeLeetcodeHot100Done: deps.normalizeLeetcodeHot100Done
    });
  }

  function buildTodayStudyPlan() {
    return buildTodayStudyPlanValue({
      prepPlan: getState().prepPlan,
      state: getState(),
      language: deps.getLanguage?.(),
      makeId: deps.makeId,
      getSkillScore: deps.getSkillScore,
      graduationTerm: deps.getGraduationTerm?.(),
      localDateKey: deps.localDateKey,
      formatCategoryLabel: deps.formatCategoryLabel
    });
  }

  function buildLegacyTodayStudyPlan() {
    return buildLegacyTodayStudyPlanValue({
      state: getState(),
      language: deps.getLanguage?.(),
      makeId: deps.makeId,
      getSkillScore: deps.getSkillScore,
      graduationTerm: deps.getGraduationTerm?.()
    });
  }

  function renderTodayPlan() {
    const elements = getElements();
    if (!elements.todayPlanCard) return;
    const state = getState();
    const prepPlan = deps.normalizePrepPlan?.(state.prepPlan);
    const plan = prepPlan ? buildTodayStudyPlan() : deps.normalizeStudyPlan?.(state.studyPlan);
    const result = renderTodayPlanCard(elements.todayPlanCard, plan, {
      documentRef: deps.documentRef,
      prepPlanActive: Boolean(prepPlan),
      t: deps.t,
      onOpen: () => deps.switchModule?.("plan")
    });
    if (result.rendered) deps.renderTodoDock?.();
  }

  function generateTodayStudyPlan() {
    const state = getState();
    if (state.prepPlan) {
      deps.switchModule?.("plan");
      return;
    }
    state.studyPlan = buildTodayStudyPlan();
    deps.saveState?.();
    renderTodayPlan();
    deps.renderTodoDock?.();
    deps.refreshIcons?.();
    flashTodayPlanCreated(getElements().todayPlanCard, { windowRef: deps.windowRef });
  }

  return {
    buildLegacyTodayStudyPlan,
    buildMonthlyContributionHeatmap,
    buildRecentContributionHeatmap,
    buildTodayStudyPlan,
    generateTodayStudyPlan,
    getContributionSeries,
    getContributionStatsByDay,
    getDailyXpSeries,
    renderTodayPlan
  };
}
