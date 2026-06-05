export function getScaledClassificationGains(gains = {}, difficulty = 1) {
  return Object.fromEntries(
    Object.entries(gains || {}).map(([key, value]) => [key, Math.round(Number(value || 0) * Number(difficulty || 1))])
  );
}

export function buildClassifiedLogEntry(options = {}) {
  const gains = options.gains || {};
  return {
    id: options.id || "",
    date: options.date || new Date().toISOString(),
    text: String(options.text || ""),
    gains,
    totalXp: Object.values(gains).reduce((sum, value) => sum + Number(value || 0), 0),
    duration: Number(options.duration || 0)
  };
}

export function applySkillEntry(state = {}, entry = {}, options = {}) {
  const skillDefs = options.skillDefs || {};
  if (!state.skills) state.skills = {};
  if (!Array.isArray(state.entries)) state.entries = [];
  Object.entries(entry.gains || {}).forEach(([key, value]) => {
    if (!skillDefs[key]) return;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) + Number(value || 0));
  });
  state.entries.push(entry);
  return entry;
}

export function undoLatestSkillEntry(state = {}, options = {}) {
  const skillDefs = options.skillDefs || {};
  if (!Array.isArray(state.entries)) state.entries = [];
  if (!state.skills) state.skills = {};
  const entry = state.entries.pop();
  if (!entry) return { changed: false, entry: null };
  Object.entries(entry.gains || {}).forEach(([key, value]) => {
    if (!skillDefs[key]) return;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) - Number(value || 0));
  });
  return { changed: true, entry };
}

export function applyClassifiedLogEntry(state = {}, options = {}) {
  const gains = getScaledClassificationGains(options.classification?.gains || {}, options.difficulty);
  const entry = buildClassifiedLogEntry({
    id: options.id,
    date: options.date,
    text: options.text,
    gains,
    duration: options.duration
  });
  return applySkillEntry(state, entry, {
    skillDefs: options.skillDefs
  });
}

export function getGameSkillKey(game = "") {
  return game === "market" ? "market" : "probabilityExpectation";
}

export function applyGameResult(state = {}, options = {}) {
  const {
    detail = "",
    game = "",
    normalizeGameRecords = (records) => records,
    score = 0,
    skillDefs = {}
  } = options;
  const skillKey = getGameSkillKey(game);
  const xpGain = Math.max(2, Math.abs(Number(score || 0)));
  const makeId = options.makeId || (() => "");
  const nowIso = options.nowIso || (() => new Date().toISOString());
  if (!state.skills) state.skills = {};
  if (!Array.isArray(state.entries)) state.entries = [];
  state.gameRecords = normalizeGameRecords([...(state.gameRecords || []), {
    id: makeId(),
    game,
    score,
    detail,
    createdAt: nowIso()
  }]);
  const entry = buildClassifiedLogEntry({
    id: makeId(),
    date: nowIso(),
    text: detail,
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === skillKey ? xpGain : 0])),
    duration: 0
  });
  applySkillEntry(state, entry, { skillDefs });
  return {
    entry,
    skillKey,
    xpGain
  };
}
