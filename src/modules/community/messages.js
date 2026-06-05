import {
  makeMessageThreadId,
  normalizeMessageParticipant,
  normalizeMessageThread
} from './data.js';

export function buildDirectMessageStart(store = {}, currentUser = null, participant = null, options = {}) {
  if (!currentUser || !participant?.id || participant.id === currentUser.id) {
    return { ok: false, store, threadId: "", changed: false };
  }

  const now = options.now || new Date().toISOString();
  const makeId = options.makeId || (() => `${Date.now()}-${Math.random()}`);
  const introText = options.introText || "";
  const me = normalizeMessageParticipant({
    id: currentUser.id || "local-user",
    name: currentUser.name || currentUser.email || "Quant",
    avatar: currentUser.picture || ""
  });
  const other = normalizeMessageParticipant(participant);
  const threadId = makeMessageThreadId([me.id, other.id]);
  const threads = Array.isArray(store?.threads) ? [...store.threads] : [];
  const existing = threads.find((thread) => thread.id === threadId);

  if (existing) {
    return {
      ok: true,
      store: { ...store, threads },
      threadId,
      changed: false
    };
  }

  threads.unshift(normalizeMessageThread({
    id: threadId,
    participants: [me, other],
    messages: [{
      id: makeId(),
      senderId: me.id,
      text: introText.replace("{name}", other.name),
      createdAt: now,
      readBy: [me.id]
    }],
    updatedAt: now
  }, { makeId }));

  return {
    ok: true,
    store: { ...store, threads },
    threadId,
    changed: true
  };
}
