import { collectLeetCodeActivities, leetcodeSubmissionDay } from '../personal/calendar/leetcodeCalendar.js';
import { parseLocalDay } from '../personal/calendar/calendarModel.js';

const validCount = value => Number.isSafeInteger(value) && value >= 0;

/** Dated repeat completions and a separate, undated profile-history floor. */
export function summarizeLeetCodeProgress(snapshot = {}, options = {}) {
  let calendar = collectLeetCodeActivities(snapshot, options);
  const completions = calendar.completions;
  const firstCompletions = calendar.firstCompletions;
  const knownProblems = firstCompletions.length;
  const syncedAt = snapshot.connection?.lastSyncedAt;
  const trustedTotal = Object.hasOwn(snapshot, 'syncedLifetimeSolvedCount')
    ? snapshot.syncedLifetimeSolvedCount : snapshot.stats?.solved;
  const profileTotal = snapshot.connection?.site === 'cn' && validCount(trustedTotal)
    && leetcodeSubmissionDay(syncedAt, options.timeZone)
    && Date.parse(syncedAt) <= new Date(options.now ?? Date.now()).getTime() ? trustedTotal : null;
  const missingDates = profileTotal === null ? 0 : Math.max(0, profileTotal - knownProblems);
  if (missingDates && calendar.historyCompleteThrough && Date.parse(syncedAt) <= Date.parse(calendar.historyCompleteThrough)) {
    // An older profile already proves more solved problems than the purported
    // complete export contains. Its cutoff cannot certify historical firsts.
    calendar = { ...calendar, historyComplete: false, historyCompleteThrough: null, historyCompleteThroughDay: null };
  }
  const throughNow = !calendar.historyCompleteThrough
    || Date.parse(calendar.historyCompleteThrough) >= new Date(options.now ?? Date.now()).getTime();
  const complete = throughNow && (calendar.historyComplete && missingDates === 0 || profileTotal === 0 && !completions.length);
  const total = profileTotal !== null || complete || completions.length ? completions.length + missingDates : null;
  const newTotal = total === null ? null : Math.max(profileTotal ?? 0, knownProblems);
  return { calendar, completions, firstCompletions, knownProblems, missingDates, complete, total, newTotal,
    newStatus: newTotal === null ? 'unavailable' : complete || profileTotal !== null && profileTotal >= knownProblems ? 'ready' : 'partial',
    countStatus: total === null ? 'unavailable' : complete ? 'ready' : 'partial' };
}

/** Both Stage views use the same left-open, right-closed personal-history range. */
export function summarizeLeetCodeRange(progress, start, end, available = true) {
  const missing = { leetcodeNew: null, leetcode: null, leetcodeNewStatus: 'unavailable', leetcodeCountStatus: 'unavailable' };
  if (!available || !progress || !parseLocalDay(start) || !parseLocalDay(end) || start > end) return missing;
  const empty = start === end;
  const through = progress.calendar?.historyCompleteThrough;
  const throughDay = progress.calendar?.historyCompleteThroughDay;
  // A captured instant proves every day strictly before its local day. A later
  // refresh must not invalidate those closed historical Stage intervals.
  const complete = empty || (throughDay ? end < throughDay : progress.complete);
  const hasCoveredPortion = Boolean(throughDay && start < throughDay);
  const within = item => item.dayKey > start && item.dayKey <= end;
  const total = progress.completions.filter(within).length;
  const firstBounds = new Map((progress.calendar?.firstSolveBounds || []).map(bound => [bound.problemSlug, bound]));
  const first = progress.firstCompletions.filter(item => {
    if (!within(item)) return false;
    if (through && Date.parse(item.completedAt) <= Date.parse(through)) return true;
    if (!through && progress.complete) return true;
    // An exhaustive solved set proves an unseen problem was first solved after
    // its checkpoint, not necessarily at the earliest AC the recent feed kept.
    // Count it only when the entire possible-first interval fits this Stage.
    // A checkpoint on the excluded start day cannot establish that condition.
    const bound = firstBounds.get(item.problemSlug);
    return Boolean(bound?.afterDay > start || throughDay && throughDay > start);
  }).length;
  return {
    leetcodeNew: empty ? 0 : complete || hasCoveredPortion || first > 0 ? first : null,
    leetcode: complete || hasCoveredPortion || total > 0 ? total : null,
    leetcodeNewStatus: complete ? 'ready' : 'partial',
    leetcodeCountStatus: complete ? 'ready' : 'partial',
  };
}
