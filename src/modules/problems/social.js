export function normalizeProblemSocial(raw = {}, preserveComments = []) {
  return {
    problemId: String(raw.problemId || ""),
    likeCount: Math.max(0, Number(raw.likeCount || 0)),
    commentCount: Math.max(0, Number(raw.commentCount || 0)),
    liked: Boolean(raw.liked),
    comments: Array.isArray(raw.comments) ? raw.comments : preserveComments
  };
}

export function getProblemSocial(socialMap = new Map(), problemId = "") {
  return socialMap.get(problemId) || normalizeProblemSocial({ problemId });
}

export function mergeProblemSocialEntries(currentSocial = new Map(), entries = [], options = {}) {
  const next = options.replace ? new Map() : new Map(currentSocial);
  (Array.isArray(entries) ? entries : []).forEach((raw) => {
    if (!raw?.problemId) return;
    const previous = currentSocial.get(raw.problemId);
    next.set(raw.problemId, normalizeProblemSocial(raw, previous?.comments || []));
  });
  return next;
}

export function setProblemSocialEntry(currentSocial = new Map(), problemId = "", raw = {}) {
  const next = new Map(currentSocial);
  next.set(problemId, normalizeProblemSocial({ ...raw, problemId }));
  return next;
}

export function mergeProblemSocialRefresh(currentSocial = new Map(), problemId = "", entries = []) {
  if (!problemId) {
    return mergeProblemSocialEntries(currentSocial, entries, { replace: true });
  }
  if (!entries?.[0]) return currentSocial;
  return setProblemSocialEntry(currentSocial, problemId, entries[0]);
}

export function normalizeProblemCommentText(text = "") {
  return String(text || "").trim();
}

export function getProblemSocialCloudPreflight(canUseCloud = false) {
  return canUseCloud
    ? { ok: true, noticeKey: "" }
    : { ok: false, noticeKey: "problemSocialCloudRequired" };
}

export function getProblemCommentPreflight(text = "", canUseCloud = false) {
  const content = normalizeProblemCommentText(text);
  if (!content) return { ok: false, content, noticeKey: "problemCommentRequired" };
  if (!canUseCloud) return { ok: false, content, noticeKey: "problemSocialCloudRequired" };
  return { ok: true, content, noticeKey: "" };
}

export function applyProblemSocialSuccess(currentSocial = new Map(), problemId = "", social = {}) {
  return {
    social: setProblemSocialEntry(currentSocial, problemId, social),
    noticeKey: ""
  };
}

export function getProblemSocialErrorNoticeKey() {
  return "problemSocialError";
}

export async function requestProblemSocial(cloudApi, problemId = "") {
  const path = problemId ? `/problem-social/${encodeURIComponent(problemId)}` : "/problem-social";
  const result = await cloudApi(path);
  return problemId ? [result.social].filter(Boolean) : (result.problemSocial || []);
}

export async function requestProblemLike(cloudApi, problemId) {
  const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/like`, { method: "POST" });
  return result.social;
}

export async function requestProblemComment(cloudApi, problemId, text) {
  const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/comments`, {
    method: "POST",
    body: { text }
  });
  return result.social;
}

export async function requestDeleteProblemComment(cloudApi, problemId, commentId) {
  const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/comments/${encodeURIComponent(commentId)}`, {
    method: "DELETE"
  });
  return result.social;
}
