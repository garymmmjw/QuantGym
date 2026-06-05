import {
  getUnreadMessageCount,
  getUserMessageThreads,
  normalizeCommunityComment,
  normalizeCommunityPost,
  normalizeMessageParticipant,
  normalizeMessageThread
} from './data.js';
import { buildDirectMessageStart } from './messages.js';

export function createCommunityProvider(deps = {}) {
  const getCurrentId = () => deps.getCurrentUser?.()?.id || "local-user";
  const getNormalizeDeps = () => ({
    makeId: deps.makeId,
    normalizeExperience: deps.normalizeExperience,
    normalizeCountry: deps.normalizeCountry,
    normalizeRegionForCountry: deps.normalizeRegionForCountry
  });

  function normalizePost(raw = {}) {
    return normalizeCommunityPost(raw, getNormalizeDeps());
  }

  function normalizeComment(raw = {}) {
    return normalizeCommunityComment(raw, getNormalizeDeps());
  }

  function normalizeParticipant(raw = {}) {
    return normalizeMessageParticipant(raw);
  }

  function normalizeThread(raw = {}) {
    return normalizeMessageThread(raw, getNormalizeDeps());
  }

  function getThreads() {
    deps.reloadCommunity?.();
    return getUserMessageThreads(deps.getCommunity?.(), getCurrentId(), getNormalizeDeps());
  }

  function getUnreadCount() {
    return getUnreadMessageCount(getThreads(), getCurrentId());
  }

  function updateUnreadBadge() {
    const elements = deps.elements || {};
    if (!elements.commandUnreadCount) return;
    const unread = getUnreadCount();
    elements.commandUnreadCount.textContent = unread ? String(unread) : "0";
    elements.commandChatBtn?.classList.toggle("has-unread", unread > 0);
  }

  function startDirectMessage(participant) {
    deps.reloadCommunity?.();
    const result = buildDirectMessageStart(deps.getCommunity?.(), deps.getCurrentUser?.(), participant, {
      makeId: deps.makeId,
      introText: deps.getIntroText?.() || ""
    });
    if (!result.ok) return result;
    deps.setCommunity?.(result.store);
    if (result.changed) deps.saveCommunity?.();
    deps.selectThread?.(result.threadId);
    deps.switchModule?.("messages");
    deps.renderMessages?.();
    return result;
  }

  return {
    getThreads,
    getUnreadCount,
    normalizeComment,
    normalizeParticipant,
    normalizePost,
    normalizeThread,
    updateUnreadBadge,
    startDirectMessage
  };
}
