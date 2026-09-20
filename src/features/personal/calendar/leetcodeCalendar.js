import { localDayKey, parseLocalDay } from "./calendarModel.js";

const list = (value) => Array.isArray(value) ? value : [];
const validSlug = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const countOf = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;
const REPEAT_COMPLETION_MS = 3 * 60 * 60 * 1000;

export function leetcodeProblemUrl(site, slug) {
  if (site !== "cn" || !validSlug(slug)) return "";
  return `https://leetcode.cn/problems/${slug}/`;
}

// Submission instants follow the viewer's local day. An optional zone makes the
// same conversion testable without changing the device's time-zone setting.
export function leetcodeSubmissionDay(value, timeZone) {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value) || !parseLocalDay(value.slice(0, 10))) return "";
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return "";
  if (!timeZone) return localDayKey(date);
  try {
    const parts = new Intl.DateTimeFormat("en-US", { timeZone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(date);
    const part = (type) => parts.find((item) => item.type === type)?.value;
    const key = `${part("year")}-${part("month")}-${part("day")}`;
    return parseLocalDay(key) ? key : "";
  } catch {
    return "";
  }
}

/** Count synced ACs at least three hours after the previous counted AC for that problem. */
export function collectLeetCodeActivities(snapshot = {}, { timeZone, now = Date.now() } = {}) {
  const empty = { activities: [], completions: [], acceptedDays: [], calendarDays: [], calendarTimeZone: null, historyComplete: false };
  if (snapshot?.connection?.site !== "cn") return empty;
  const nowMs = new Date(now).getTime();
  if (!Number.isFinite(nowMs)) return empty;
  const byDayAndProblem = new Map();
  const byAcceptedDay = new Map();
  const lastCountedByProblem = new Map();
  const seenSubmissions = new Set();
  const accepted = [];
  const completions = [];
  // This list is projected by the server from real account syncs. The ordinary
  // submissions list also contains imported/manual history and is not proof of a solve.
  for (const submission of list(snapshot.syncedSubmissions)) {
    if (submission?.status !== "AC") continue;
    const dayKey = leetcodeSubmissionDay(submission.submittedAt, timeZone);
    const problemUrl = leetcodeProblemUrl(snapshot.connection.site, submission.problemSlug);
    if (!dayKey || !problemUrl) continue;
    const timestamp = Date.parse(submission.submittedAt);
    if (timestamp < Date.UTC(2000, 0, 1) || timestamp > nowMs) continue;
    const submissionId = String(submission.id || `${submission.problemSlug}:${timestamp}`);
    if (seenSubmissions.has(submissionId)) continue;
    seenSubmissions.add(submissionId);
    accepted.push({ submission, submissionId, timestamp, dayKey, problemUrl });
  }
  // Select counted attempts before bucketing by day, so midnight cannot reset
  // the interval and an uncounted attempt cannot extend it.
  accepted.sort((a, b) => a.timestamp - b.timestamp || a.submissionId.localeCompare(b.submissionId));
  for (const { submission, submissionId, timestamp, dayKey, problemUrl } of accepted) {
    byAcceptedDay.set(dayKey, (byAcceptedDay.get(dayKey) || 0) + 1);
    const key = `${dayKey}:${submission.problemSlug}`;
    if (!byDayAndProblem.has(key)) byDayAndProblem.set(key, {
      id: `leetcode:${snapshot.connection.site}:${snapshot.connection.username}:${key}`,
      kind: "coding",
      source: "leetcode",
      count: 0,
      submissionCount: 0,
      dayKey,
      completedAt: null,
      title: submission.title || submission.titleEn || submission.problemSlug,
      titleEn: submission.titleEn || submission.title || submission.problemSlug,
      problemSlug: submission.problemSlug,
      frontendId: submission.frontendId || "",
      problemUrl,
      status: "AC"
    });
    const activity = byDayAndProblem.get(key);
    activity.submissionCount += 1;
    if (!activity.frontendId && submission.frontendId) activity.frontendId = submission.frontendId;
    const previous = lastCountedByProblem.get(submission.problemSlug);
    if (previous != null && timestamp - previous < REPEAT_COMPLETION_MS) continue;
    lastCountedByProblem.set(submission.problemSlug, timestamp);
    activity.count += 1;
    activity.completedAt = submission.submittedAt;
    // Keep the qualifying event identity, independently of its day bucket or
    // problem. Stage and overview totals must not collapse valid later repeats.
    completions.push({
      id: `leetcode:${snapshot.connection.site}:${snapshot.connection.username}:ac:${submissionId}`,
      submissionId,
      kind: 'coding',
      source: 'leetcode',
      count: 1,
      dayKey,
      completedAt: submission.submittedAt,
      title: submission.title || submission.titleEn || submission.problemSlug,
      titleEn: submission.titleEn || submission.title || submission.problemSlug,
      problemSlug: submission.problemSlug,
      frontendId: submission.frontendId || '',
      problemUrl,
      status: 'AC',
    });
  }
  const bySourceDay = new Map();
  for (const day of list(snapshot.calendar)) {
    const submissions = countOf(day?.submissions);
    if (!parseLocalDay(day?.date) || submissions === null) continue;
    // Source calendar days are civil dates in the source's stated time zone.
    // Duplicated buckets describe the same day, so they must not be added twice.
    bySourceDay.set(day.date, Math.max(bySourceDay.get(day.date) || 0, submissions));
  }
  return {
    activities: [...byDayAndProblem.values()].filter(item => item.count > 0).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt) || a.id.localeCompare(b.id)),
    completions,
    acceptedDays: [...byAcceptedDay].map(([dayKey, submissions]) => ({ dayKey, submissions })),
    calendarDays: [...bySourceDay].map(([dayKey, submissions]) => ({ dayKey, submissions })),
    calendarTimeZone: typeof snapshot.coverage?.calendarTimeZone === "string" ? snapshot.coverage.calendarTimeZone : null,
    historyComplete: snapshot.coverage?.historyComplete === true
  };
}

export function leetcodeDailySummary(records, dayKey) {
  const activities = list(records?.activities).filter((item) => item.dayKey === dayKey);
  const acceptedDay = list(records?.acceptedDays).find((item) => item.dayKey === dayKey);
  const sourceDay = list(records?.calendarDays).find((item) => item.dayKey === dayKey);
  const solved = activities.reduce((sum, item) => sum + (countOf(item.count) || 0), 0);
  return {
    solved: solved || (acceptedDay || records?.historyComplete ? 0 : null),
    acceptedSubmissions: acceptedDay?.submissions ?? activities.reduce((sum, item) => sum + item.submissionCount, 0),
    sourceSubmissions: sourceDay?.submissions ?? null
  };
}
