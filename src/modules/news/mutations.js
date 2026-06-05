export function upsertNewsItems(existingNews = [], items = [], options = {}) {
  const normalizeItem = options.normalizeItem || ((item) => item);
  const isLowQuality = options.isLowQuality || (() => false);
  const sortNews = options.sortNews || ((news) => news);
  const now = options.now || new Date().toISOString();
  const byId = new Map((Array.isArray(existingNews) ? existingNews : []).map((item) => [item.id, item]));

  items.map(normalizeItem).forEach((item) => {
    if (isLowQuality(item)) return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item, updatedAt: now });
  });

  return sortNews([...byId.values()]);
}

export function applyNewsReadReward(state, id, options = {}) {
  const news = Array.isArray(state?.news) ? state.news : [];
  const item = news.find((newsItem) => newsItem.id === id);
  if (!item || item.readAt) return { changed: false };

  const normalizeSkills = options.normalizeSkills || ((value) => Array.isArray(value) ? value : []);
  const skillDefs = options.skillDefs || {};
  const makeId = options.makeId || (() => `${Date.now()}-${Math.random()}`);
  const now = options.now || new Date().toISOString();
  const xpPerSkill = Number.isFinite(options.xpPerSkill) ? options.xpPerSkill : 8;
  const skills = normalizeSkills(item.skills);
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));

  item.readAt = now;
  skills.forEach((key) => {
    gains[key] += xpPerSkill;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) + xpPerSkill);
  });

  const entry = {
    id: makeId(),
    date: now,
    text: `${options.entryPrefix || "阅读新闻："}${item.titleZh || item.title}`,
    gains,
    totalXp: skills.length * xpPerSkill,
    duration: 0
  };
  state.entries.push(entry);

  return { changed: true, item, skills, gains, entry };
}
