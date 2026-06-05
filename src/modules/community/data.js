export function normalizeCommunityStore(raw = {}, deps = {}) {
  return {
    posts: Array.isArray(raw?.posts) ? raw.posts.map((post) => normalizeCommunityPost(post, deps)) : [],
    threads: Array.isArray(raw?.threads)
      ? raw.threads.map((thread) => normalizeMessageThread(thread, deps)).filter((thread) => thread.participants.length >= 2)
      : []
  };
}

export function normalizeCommunityFilter(value = "all") {
  return value === "experience" ? "experience" : "all";
}

export function createCommunityFilterState(initialValue = "all") {
  let filter = normalizeCommunityFilter(initialValue);
  return {
    getFilter() {
      return filter;
    },
    setFilter(value) {
      filter = normalizeCommunityFilter(value);
      return filter;
    }
  };
}

export function normalizeCommunityPost(raw = {}, deps = {}) {
  const {
    makeId = () => `${Date.now()}-${Math.random()}`,
    normalizeExperience = (value) => value,
    normalizeCountry = (value) => value || "china",
    normalizeRegionForCountry = (region) => region || ""
  } = deps;
  const experience = raw.experience && raw.kind === "experience"
    ? normalizeExperience(raw.experience)
    : null;
  const country = normalizeCountry(raw.country || "china");
  return {
    id: raw.id || makeId(),
    kind: experience ? "experience" : "update",
    experience,
    authorId: raw.authorId || "",
    authorName: raw.authorName || "Quant",
    authorAvatar: raw.authorAvatar || "",
    country,
    region: normalizeRegionForCountry(raw.region, country),
    text: String(raw.text || "").trim(),
    media: raw.media?.dataUrl ? {
      dataUrl: raw.media.dataUrl,
      type: raw.media.type === "video" ? "video" : "image",
      name: raw.media.name || ""
    } : null,
    likes: Array.isArray(raw.likes) ? raw.likes.map(String) : [],
    comments: Array.isArray(raw.comments) ? raw.comments.map((comment) => normalizeCommunityComment(comment, deps)) : [],
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

export function normalizeCommunityComment(raw = {}, deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  return {
    id: raw.id || makeId(),
    authorId: raw.authorId || "",
    authorName: raw.authorName || "Quant",
    text: String(raw.text || "").trim(),
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

export function normalizeMessageParticipant(raw = {}) {
  return {
    id: String(raw?.id || "").trim(),
    name: String(raw?.name || "Quant").trim() || "Quant",
    avatar: String(raw?.avatar || "").trim()
  };
}

export function normalizeDirectMessage(raw = {}, deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  return {
    id: String(raw?.id || makeId()),
    senderId: String(raw?.senderId || "").trim(),
    text: String(raw?.text || "").trim().slice(0, 2000),
    createdAt: raw?.createdAt || new Date().toISOString(),
    readBy: Array.isArray(raw?.readBy) ? raw.readBy.map(String) : []
  };
}

export function makeMessageThreadId(ids = []) {
  return `thread-${[...new Set(ids.filter(Boolean).map(String))].sort().join("-")}`;
}

export function normalizeMessageThread(raw = {}, deps = {}) {
  const participants = Array.isArray(raw?.participants)
    ? raw.participants.map(normalizeMessageParticipant).filter((participant) => participant.id)
    : [];
  const messages = Array.isArray(raw?.messages)
    ? raw.messages.map((message) => normalizeDirectMessage(message, deps)).filter((message) => message.text)
    : [];
  return {
    id: String(raw?.id || makeMessageThreadId(participants.map((participant) => participant.id))),
    participants: [...new Map(participants.map((participant) => [participant.id, participant])).values()],
    messages,
    updatedAt: raw?.updatedAt || messages.at(-1)?.createdAt || new Date().toISOString()
  };
}

export function getUserMessageThreads(store = {}, currentUserId = "local-user", deps = {}) {
  return normalizeCommunityStore(store, deps).threads
    .filter((thread) => thread.participants.some((participant) => participant.id === currentUserId))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

export function getUnreadMessageCount(threads = [], currentUserId = "local-user") {
  return (Array.isArray(threads) ? threads : []).reduce((count, thread) => (
    count + thread.messages.filter((message) => message.senderId !== currentUserId && !message.readBy.includes(currentUserId)).length
  ), 0);
}

export function mergeCloudCommunity(remoteCommunity, localCommunity, deps = {}) {
  const {
    mergeRecordsById = (...lists) => [].concat(...lists).filter(Boolean),
    latestIso = (...values) => values.filter(Boolean).sort().at(-1) || ""
  } = deps;
  const byId = new Map();
  const threadsById = new Map();
  [normalizeCommunityStore(remoteCommunity, deps), normalizeCommunityStore(localCommunity, deps)].forEach((source) => {
    source.posts.forEach((post) => {
      const existing = byId.get(post.id) || {};
      byId.set(post.id, normalizeCommunityPost({
        ...existing,
        ...post,
        likes: [...new Set([...(existing.likes || []), ...(post.likes || [])])],
        comments: mergeRecordsById(existing.comments || [], post.comments || [])
      }, deps));
    });
    source.threads.forEach((thread) => {
      const existing = threadsById.get(thread.id);
      if (!existing) {
        threadsById.set(thread.id, thread);
        return;
      }
      const messages = mergeRecordsById(existing.messages || [], thread.messages || [])
        .map((message) => normalizeDirectMessage(message, deps))
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      threadsById.set(thread.id, normalizeMessageThread({
        ...existing,
        ...thread,
        participants: [...(existing.participants || []), ...(thread.participants || [])],
        messages,
        updatedAt: latestIso(existing.updatedAt, thread.updatedAt, messages.at(-1)?.createdAt)
      }, deps));
    });
  });
  return {
    posts: [...byId.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    threads: [...threadsById.values()].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  };
}
