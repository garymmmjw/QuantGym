import { localDayKey, parseLocalDay } from "./calendarModel.js";

const list = (value) => Array.isArray(value) ? value : [];
const validSlug = (value) => typeof value === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(value);
const countOf = (value) => Number.isSafeInteger(value) && value >= 0 ? value : null;

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

/** Derive daily solved problems from accepted submissions, never from heatmap totals. */
export function collectLeetCodeActivities(snapshot = {}, { timeZone } = {}) {
  const empty = { activities: [], calendarDays: [], calendarTimeZone: null, historyComplete: false };
  if (snapshot?.connection?.site !== "cn") return empty;
  const byDayAndProblem = new Map();
  const seenSubmissions = new Set();
  // This list is projected by the server from real account syncs. The ordinary
  // submissions list also contains imported/manual history and is not proof of a solve.
  for (const submission of list(snapshot.syncedSubmissions)) {
    if (submission?.status !== "AC") continue;
    const dayKey = leetcodeSubmissionDay(submission.submittedAt, timeZone);
    const problemUrl = leetcodeProblemUrl(snapshot.connection.site, submission.problemSlug);
    if (!dayKey || !problemUrl) continue;
    const submissionId = String(submission.id || `${submission.problemSlug}:${submission.submittedAt}`);
    if (seenSubmissions.has(submissionId)) continue;
    seenSubmissions.add(submissionId);
    const key = `${dayKey}:${submission.problemSlug}`;
    const previous = byDayAndProblem.get(key);
    if (previous) {
      previous.submissionCount += 1;
      if (new Date(submission.submittedAt) > new Date(previous.completedAt)) previous.completedAt = submission.submittedAt;
      continue;
    }
    byDayAndProblem.set(key, {
      id: `leetcode:${snapshot.connection.site}:${snapshot.connection.username}:${key}`,
      kind: "coding",
      source: "leetcode",
      count: 1,
      submissionCount: 1,
      dayKey,
      completedAt: submission.submittedAt,
      title: submission.title || submission.titleEn || submission.problemSlug,
      titleEn: submission.titleEn || submission.title || submission.problemSlug,
      problemSlug: submission.problemSlug,
      frontendId: submission.frontendId || "",
      problemUrl,
      status: "AC"
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
    activities: [...byDayAndProblem.values()].sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt) || a.id.localeCompare(b.id)),
    calendarDays: [...bySourceDay].map(([dayKey, submissions]) => ({ dayKey, submissions })),
    calendarTimeZone: typeof snapshot.coverage?.calendarTimeZone === "string" ? snapshot.coverage.calendarTimeZone : null,
    historyComplete: snapshot.coverage?.historyComplete === true
  };
}

export function leetcodeDailySummary(records, dayKey) {
  const activities = list(records?.activities).filter((item) => item.dayKey === dayKey);
  const sourceDay = list(records?.calendarDays).find((item) => item.dayKey === dayKey);
  return {
    solved: activities.length || (records?.historyComplete ? 0 : null),
    acceptedSubmissions: activities.reduce((sum, item) => sum + item.submissionCount, 0),
    sourceSubmissions: sourceDay?.submissions ?? null
  };
}
