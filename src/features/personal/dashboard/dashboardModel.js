import { collectCalendarActivities, summarizeActivities, buildDailySummaries, localDayKey } from '../calendar/calendarModel.js';
import { getDailyProgress } from '../daily/dailyEngine.js';
import { mentalSettingsKey } from '../mental/mentalEngine.js';
import { getReviewQueue } from '../review/reviewEngine.js';
import { getApplications, getUpcomingApplications } from '../applications/applicationModel.js';

export function getDashboardModel(state, legacyState = {}, now = new Date()) {
  const today = localDayKey(now);
  const { activities } = collectCalendarActivities(state, legacyState);
  const week = buildDailySummaries(activities, today, 7);
  const activeSession = [...(state.dailySessions || [])].filter(session => session.status === 'active').sort((a,b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || b.id.localeCompare(a.id))[0] || null;
  const dueReviews = getReviewQueue(state, now).filter(item => item.due);
  const applications = getApplications(state);
  const upcoming = getUpcomingApplications(state, today);
  const trials = (state.trials || []).filter(trial => trial.status === 'completed').sort((a,b) => Date.parse(b.completedAt) - Date.parse(a.completedAt));
  const latestTrial = trials[0] || null;
  const comparable = latestTrial ? trials.filter(trial => mentalSettingsKey(trial.settings) === mentalSettingsKey(latestTrial.settings)) : [];
  return {
    today, week, weekActiveDays:week.filter(day => day.activityCount > 0).length,
    todaySummary:summarizeActivities(activities.filter(activity => localDayKey(activity.completedAt) === today)),
    activeSession, dailyProgress:getDailyProgress(activeSession), dueReviews,
    applications, upcoming, latestTrial, mentalBest:comparable.length ? Math.max(...comparable.map(trial => trial.correct)) : null,
  };
}
