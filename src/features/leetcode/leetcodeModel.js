export const EMPTY_LEETCODE = Object.freeze({ connection: null, stats: null, submissions: [], problems: [], calendar: [], coverage: {} });

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
  return { username: value.username,
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

export function drawReviewProblem(problems, previousSlug = "", random = Math.random) {
  const pool = reviewPool(problems);
  const candidates = pool.length > 1 ? pool.filter((item) => item.slug !== previousSlug) : pool;
  if (!candidates.length) return null;
  const value = Number(random());
  const index = Math.floor(Math.min(Math.max(Number.isFinite(value) ? value : 0, 0), 0.9999999999999999) * candidates.length);
  return candidates[index];
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
