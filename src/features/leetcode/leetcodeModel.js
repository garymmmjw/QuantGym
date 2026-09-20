export const EMPTY_LEETCODE = Object.freeze({ connection: null, stats: null, submissions: [], syncedSubmissions: [], importedSubmissions: [], problems: [], calendar: [], coverage: {}, reviewBackpack: [] });

export function problemUrl(slug) {
  return typeof slug === "string" && /^[a-zA-Z0-9_-]{1,200}$/.test(slug)
    ? `https://leetcode.cn/problems/${slug}/` : "";
}

export function normalizeProfile(value) {
  const input = String(value || "").trim();
  if (/^[a-zA-Z0-9_-]{1,100}$/.test(input)) return input;
  try {
    const url = new URL(input);
    if (url.protocol !== "https:" || url.hostname !== "leetcode.cn" || url.port || url.username || url.password) return "";
    const match = url.pathname.match(/^\/u\/([a-zA-Z0-9_-]{1,100})\/?$/);
    return match?.[1] || "";
  } catch { return ""; }
}

export function prepareHistory(value) {
  if (!value || typeof value !== "object" || typeof value.username !== "string" || !/^[a-zA-Z0-9_-]{1,100}$/.test(value.username) || value.site && value.site !== "cn") throw new Error("invalid_import");
  if (!Array.isArray(value.problems) || !Array.isArray(value.submissions) || value.problems.length + value.submissions.length > 20000 || !(value.problems.length + value.submissions.length)) throw new Error("invalid_import");
  const scalar = (value, limit, optional = true) => {
    if (value === undefined || value === null) { if (optional) return ""; throw new Error("invalid_import"); }
    if (typeof value !== "string" && !(typeof value === "number" && Number.isSafeInteger(value))) throw new Error("invalid_import");
    const result = String(value).trim();
    if (result.length > limit || !optional && !result) throw new Error("invalid_import");
    return result;
  };
  const metadata = (row, key) => {
    if (!row || typeof row !== "object" || Array.isArray(row) || !problemUrl(row[key])) throw new Error("invalid_import");
    let difficulty = row.difficulty ?? null;
    if (typeof difficulty === "string") difficulty = ({ EASY: 1, MEDIUM: 2, HARD: 3 })[difficulty.toUpperCase()];
    if (difficulty !== null && ![1, 2, 3].includes(difficulty)) throw new Error("invalid_import");
    return { [key]: row[key], title: scalar(row.title, 500), titleEn: scalar(row.titleEn, 500), frontendId: scalar(row.frontendId, 100), difficulty };
  };
  let historyCoverage = {};
  if (value.coverage !== undefined) {
    const coverage = value.coverage;
    const capturedAt = value.capturedAt;
    if (!coverage || typeof coverage !== 'object' || Array.isArray(coverage)
      || ['problemsComplete', 'submissionsComplete', 'complete'].some(key => typeof coverage[key] !== 'boolean')
      || !Number.isSafeInteger(coverage.skippedRecords) || coverage.skippedRecords < 0
      || typeof coverage.reason !== 'string' || coverage.reason.length > 300
      || typeof capturedAt !== 'string' || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(capturedAt)
      || !Number.isFinite(Date.parse(capturedAt))
      || new Date(`${capturedAt.slice(0, 10)}T00:00:00Z`).toISOString().slice(0, 10) !== capturedAt.slice(0, 10)
      || (coverage.complete && (!coverage.problemsComplete || !coverage.submissionsComplete || coverage.skippedRecords !== 0 || coverage.reason.trim()))) throw new Error('invalid_import');
    historyCoverage = { capturedAt, coverage: { problemsComplete: coverage.problemsComplete,
      submissionsComplete: coverage.submissionsComplete, complete: coverage.complete,
      skippedRecords: coverage.skippedRecords, reason: coverage.reason } };
  }
  return { username: value.username, ...historyCoverage,
    problems: value.problems.map((row) => metadata(row, "slug")),
    submissions: value.submissions.map((row) => {
      const id = scalar(row?.id, 100, false);
      const submittedAt = scalar(row?.submittedAt, 100, false);
      if (!/^[a-zA-Z0-9_-]+$/.test(id) || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(submittedAt) || !Number.isFinite(new Date(submittedAt).getTime()) || row.status !== "AC") throw new Error("invalid_import");
      const [year, month, day] = submittedAt.slice(0, 10).split("-").map(Number);
      const civil = new Date(Date.UTC(year, month - 1, day));
      if (year < 2000 || civil.getUTCFullYear() !== year || civil.getUTCMonth() !== month - 1 || civil.getUTCDate() !== day) throw new Error("invalid_import");
      return { id, ...metadata(row, "problemSlug"), submittedAt, status: "AC" };
    }),
  };
}

export function reviewPool(problems = [], difficulty = "all", query = "") {
  const seen = new Set();
  const needle = String(query).trim().toLowerCase();
  return (Array.isArray(problems) ? problems : []).filter((problem) => {
    if (!problemUrl(problem?.slug) || seen.has(problem.slug)) return false;
    seen.add(problem.slug);
    if (difficulty !== "all" && String(problem.difficulty) !== String(difficulty)) return false;
    return !needle || [problem.title, problem.titleEn, problem.frontendId, problem.slug].some((value) => String(value || "").toLowerCase().includes(needle));
  });
}

const REVIEW_DAY = 86400000;
const reviewInstant = (value) => {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)) return null;
  const instant = Date.parse(value), civilDate = new Date(`${value.slice(0, 10)}T00:00:00Z`);
  return Number.isFinite(instant) && Number.isFinite(civilDate.getTime()) && civilDate.toISOString().slice(0, 10) === value.slice(0, 10) ? instant : null;
};

// This weights the known history; it does not claim that a partial import is a
// complete attempt count. Every item in the solved pool has at least one AC.
export function reviewDrawWeights(problems, { now = Date.now(), submissions = [], practiceSessions = [], connection = null } = {}) {
  const time = Number(now instanceof Date ? now.getTime() : now);
  if (!Number.isFinite(time)) throw new TypeError("Invalid review draw time");
  const accepted = new Map(), seenSubmissions = new Set();
  for (const row of Array.isArray(submissions) ? submissions : []) {
    const id = typeof row?.id === "string" || Number.isSafeInteger(row?.id) ? String(row.id) : "";
    const submittedAt = reviewInstant(row?.submittedAt);
    if (!/^[a-zA-Z0-9_-]{1,100}$/.test(id) || seenSubmissions.has(id) || row?.status !== "AC"
      || !problemUrl(row.problemSlug) || submittedAt === null) continue;
    seenSubmissions.add(id);
    const previous = accepted.get(row.problemSlug);
    accepted.set(row.problemSlug, { count: (previous?.count || 0) + 1, latest: Math.max(previous?.latest ?? -Infinity, submittedAt) });
  }
  const coding = new Map(), seenPractice = new Set();
  for (const session of Array.isArray(practiceSessions) ? practiceSessions : []) {
    const question = session?.question;
    const completedAt = reviewInstant(session?.completedAt);
    if (!connection?.username || !connection?.linkedAt || session?.kind !== "coding" || session?.status !== "completed"
      || typeof session.id !== "string" || !session.id.trim() || seenPractice.has(session.id) || completedAt === null
      || question?.source !== "leetcode" || !problemUrl(question.slug) || question.id !== question.slug
      || question.username !== connection.username || question.linkedAt !== connection.linkedAt) continue;
    seenPractice.add(session.id);
    const previous = coding.get(question.slug);
    coding.set(question.slug, { count: (previous?.count || 0) + 1, latest: Math.max(previous?.latest ?? -Infinity, completedAt) });
  }
  const history = reviewPool(problems).map(problem => {
    const records = accepted.get(problem.slug);
    const sessions = coding.get(problem.slug);
    const times = [reviewInstant(problem.lastAcceptedAt), reviewInstant(problem.review?.lastReviewedAt), records?.latest, sessions?.latest]
      .filter(value => Number.isFinite(value));
    const latest = times.length ? Math.max(...times) : null;
    const knownAcceptedCount = Math.max(1, records?.count || 0);
    const reviewCount = Number.isSafeInteger(problem.review?.reviewCount) && problem.review.reviewCount > 0 ? problem.review.reviewCount : 0;
    return { problem, lastPracticedAt: latest === null ? null : new Date(latest).toISOString(),
      elapsedDays: latest === null ? null : Math.max(0, (time - latest) / REVIEW_DAY), knownAcceptedCount, reviewCount, codingOACount: sessions?.count || 0 };
  });
  // Missing dates stay unknown. A neutral median age prevents missing history
  // from being interpreted as either "just practiced" or "very old".
  const ages = history.map(row => row.elapsedDays).filter(value => value !== null).sort((a, b) => a - b);
  const middle = Math.floor(ages.length / 2);
  const neutralAge = !ages.length ? 0 : ages.length % 2 ? ages[middle] : (ages[middle - 1] + ages[middle]) / 2;
  return history.map(row => ({ ...row,
    weight: (1 + Math.log1p(row.elapsedDays ?? neutralAge)) / Math.sqrt(row.knownAcceptedCount + row.reviewCount + row.codingOACount),
  }));
}

export function drawReviewProblem(problems, previousSlug = "", random = Math.random, options = {}) {
  const weighted = reviewDrawWeights(problems, options);
  const candidates = weighted.length > 1 ? weighted.filter(({ problem }) => problem.slug !== previousSlug) : weighted;
  if (!candidates.length) return null;
  const value = Number(random());
  const fraction = Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 0.9999999999999999);
  let remaining = fraction * candidates.reduce((total, row) => total + row.weight, 0);
  for (const row of candidates) {
    if (remaining < row.weight) return row.problem;
    remaining -= row.weight;
  }
  return candidates[candidates.length - 1].problem;
}

export function leetcodeError(error, en = false) {
  if (error?.status === 401) return en ? "Your cloud session is no longer valid. Sign in again to reconnect." : "云端登录已失效，请重新登录以恢复连接。";
  if (error?.status === 403) return en ? "This account does not have access to this cloud feature." : "当前账户没有此云端功能的访问权限。";
  if (error?.status === 429) return en ? "Please wait a moment before syncing again." : "同步较频繁，请稍后再试。";
  if (error?.status === 404) return en ? "The account or connection could not be found." : "未找到该账号或关联记录，请检查主页链接。";
  if (error?.status === 409) return en ? "The linked account changed. Refresh and try again." : "关联账号已变化，请刷新后重试。";
  if (error?.status === 400 || error?.status === 422) return en ? "Check the profile link or imported history. The account must match your connection." : "请检查主页链接或导入记录，记录须来自当前关联的力扣账号。";
  return en ? "Sync is temporarily unavailable. Saved records are kept; please retry." : "暂时无法同步，已保存的记录仍然保留，请稍后重试。";
}
