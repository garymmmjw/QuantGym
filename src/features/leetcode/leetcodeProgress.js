import { collectLeetCodeActivities, leetcodeSubmissionDay } from '../personal/calendar/leetcodeCalendar.js';

const validCount = value => Number.isSafeInteger(value) && value >= 0;

/** Dated repeat completions and a separate, undated profile-history floor. */
export function summarizeLeetCodeProgress(snapshot = {}, options = {}) {
  const calendar = collectLeetCodeActivities(snapshot, options);
  const completions = calendar.completions;
  const knownProblems = new Set(completions.map(item => item.problemSlug)).size;
  const syncedAt = snapshot.connection?.lastSyncedAt;
  const trustedTotal = Object.hasOwn(snapshot, 'syncedLifetimeSolvedCount')
    ? snapshot.syncedLifetimeSolvedCount : snapshot.stats?.solved;
  const profileTotal = snapshot.connection?.site === 'cn' && validCount(trustedTotal)
    && leetcodeSubmissionDay(syncedAt, options.timeZone)
    && Date.parse(syncedAt) <= new Date(options.now ?? Date.now()).getTime() ? trustedTotal : null;
  const missingDates = profileTotal === null ? 0 : Math.max(0, profileTotal - knownProblems);
  const complete = calendar.historyComplete && missingDates === 0 || profileTotal === 0 && !completions.length;
  return { calendar, completions, knownProblems, missingDates, complete,
    total: profileTotal !== null || complete || completions.length ? completions.length + missingDates : null };
}
