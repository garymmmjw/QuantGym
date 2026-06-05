export function createBackupPayload(options = {}) {
  const {
    currentUser = null,
    now = new Date(),
    serializeState = (state) => state,
    state = {}
  } = options;
  return {
    version: 2,
    exportedAt: now.toISOString(),
    user: currentUser ? { name: currentUser.name, email: currentUser.email, provider: currentUser.provider } : null,
    state: serializeState(state)
  };
}

export function getBackupFilename(currentUser = null, now = new Date()) {
  return `quantgym-${currentUser?.name || "backup"}-${now.toISOString().slice(0, 10)}.json`;
}

export function createBackupDownload(options = {}) {
  const now = options.now || new Date();
  return {
    filename: getBackupFilename(options.currentUser, now),
    payload: createBackupPayload({
      currentUser: options.currentUser,
      now,
      serializeState: options.serializeState,
      state: options.state
    })
  };
}

export function parseBackupState(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  return parsed.state || parsed;
}

export async function mergeBackupFile(file, currentState = {}, deps = {}) {
  if (!file) return { changed: false, state: currentState };
  const readFileAsText = deps.readFileAsText;
  if (typeof readFileAsText !== "function") throw new Error("Missing file reader");
  const raw = await readFileAsText(file);
  return {
    changed: true,
    state: mergeImportedState(currentState, parseBackupState(raw), deps)
  };
}

export function mergeImportedState(currentState = {}, importedRaw = {}, deps = {}) {
  const importedState = parseBackupState(importedRaw);
  const normalizeMentalMathRecords = deps.normalizeMentalMathRecords || passthroughArray;
  const normalizeGameRecords = deps.normalizeGameRecords || passthroughArray;
  const mergeProblemStates = deps.mergeProblemStates || ((...lists) => lists.flat().filter(Boolean));
  const problemStatesFromFavorites = deps.problemStatesFromFavorites || passthroughArray;
  const defaultLeaderboardSettings = deps.defaultLeaderboardSettings || (() => ({}));
  const mergeProblems = deps.mergeProblems || ((seed = [], saved = []) => [...seed, ...saved]);
  const mergeNews = deps.mergeNews || ((seed = [], saved = []) => [...seed, ...saved]);
  const normalizeState = deps.normalizeState || ((state) => state);
  const nowIso = deps.nowIso || new Date().toISOString();
  return normalizeState({
    skills: { ...(currentState.skills || {}), ...(importedState.skills || {}) },
    entries: Array.isArray(importedState.entries) ? importedState.entries : [],
    resources: Array.isArray(importedState.resources) ? importedState.resources : [],
    network: Array.isArray(importedState.network) ? importedState.network : [],
    interviewFavorites: Array.isArray(importedState.interviewFavorites) ? importedState.interviewFavorites : [],
    mentalMathRecords: normalizeMentalMathRecords(importedState.mentalMathRecords),
    gameRecords: normalizeGameRecords(importedState.gameRecords),
    problemStates: mergeProblemStates(
      currentState.problemStates || [],
      Array.isArray(importedState.problemStates) ? importedState.problemStates : [],
      problemStatesFromFavorites(Array.isArray(importedState.interviewFavorites) ? importedState.interviewFavorites : [])
    ),
    leaderboard: importedState.leaderboard || currentState.leaderboard || defaultLeaderboardSettings(),
    problems: mergeProblems(currentState.problems, Array.isArray(importedState.problems) ? importedState.problems : []),
    news: mergeNews(currentState.news || [], Array.isArray(importedState.news) ? importedState.news : []),
    newsFetchedAt: importedState.newsFetchedAt || currentState.newsFetchedAt || "",
    newsFetchAttemptAt: importedState.newsFetchAttemptAt || currentState.newsFetchAttemptAt || "",
    newsSyncError: importedState.newsSyncError || "",
    createdAt: importedState.createdAt || currentState.createdAt || nowIso,
    updatedAt: nowIso
  });
}

function passthroughArray(value = []) {
  return Array.isArray(value) ? value : [];
}
