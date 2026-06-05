import {
  applyProblemSocialSuccess,
  getProblemCommentPreflight,
  getProblemSocialCloudPreflight,
  getProblemSocialErrorNoticeKey
} from './social.js';

function noticeText(noticeKey = "", t = (key) => key) {
  return noticeKey ? t(noticeKey) : "";
}

export async function runProblemLikeAction(options = {}) {
  const {
    currentSocial = new Map(),
    problemId = "",
    canUseCloud = false,
    requestLike,
    t = (key) => key
  } = options;
  const preflight = getProblemSocialCloudPreflight(canUseCloud);
  if (!preflight.ok) {
    return {
      ok: false,
      requested: false,
      social: currentSocial,
      notice: noticeText(preflight.noticeKey, t)
    };
  }
  try {
    const social = await requestLike?.(problemId);
    const next = applyProblemSocialSuccess(currentSocial, problemId, social);
    return {
      ok: true,
      requested: true,
      social: next.social,
      notice: noticeText(next.noticeKey, t)
    };
  } catch {
    return {
      ok: false,
      requested: true,
      social: currentSocial,
      notice: noticeText(getProblemSocialErrorNoticeKey(), t)
    };
  }
}

export async function runProblemCommentAction(options = {}) {
  const {
    currentSocial = new Map(),
    problemId = "",
    text = "",
    canUseCloud = false,
    requestComment,
    t = (key) => key
  } = options;
  const preflight = getProblemCommentPreflight(text, canUseCloud);
  if (!preflight.ok) {
    return {
      ok: false,
      requested: false,
      content: preflight.content,
      social: currentSocial,
      notice: noticeText(preflight.noticeKey, t)
    };
  }
  try {
    const social = await requestComment?.(problemId, preflight.content);
    const next = applyProblemSocialSuccess(currentSocial, problemId, social);
    return {
      ok: true,
      requested: true,
      content: preflight.content,
      social: next.social,
      notice: noticeText(next.noticeKey, t)
    };
  } catch {
    return {
      ok: false,
      requested: true,
      content: preflight.content,
      social: currentSocial,
      notice: noticeText(getProblemSocialErrorNoticeKey(), t)
    };
  }
}

export async function runProblemDeleteCommentAction(options = {}) {
  const {
    currentSocial = new Map(),
    problemId = "",
    commentId = "",
    requestDelete,
    t = (key) => key
  } = options;
  try {
    const social = await requestDelete?.(problemId, commentId);
    const next = applyProblemSocialSuccess(currentSocial, problemId, social);
    return {
      ok: true,
      requested: true,
      social: next.social,
      notice: noticeText(next.noticeKey, t)
    };
  } catch {
    return {
      ok: false,
      requested: true,
      social: currentSocial,
      notice: noticeText(getProblemSocialErrorNoticeKey(), t)
    };
  }
}
