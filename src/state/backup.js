export function createBackupPayload(options = {}) {
  const {
    community,
    currentUser = null,
    now = new Date(),
    serializeCommunity = (store) => store,
    serializeState = (state) => state,
    state = {}
  } = options;
  const payload = {
    version: 2,
    exportedAt: now.toISOString(),
    user: currentUser ? { name: currentUser.name, email: currentUser.email, provider: currentUser.provider } : null,
    state: serializeState(state)
  };
  if (community && typeof community === "object") {
    payload.community = serializeCommunity(community);
  }
  return payload;
}

export function getBackupFilename(currentUser = null, now = new Date()) {
  return `quantgym-${currentUser?.name || "backup"}-${now.toISOString().slice(0, 10)}.json`;
}

export function createBackupDownload(options = {}) {
  const now = options.now || new Date();
  return {
    filename: getBackupFilename(options.currentUser, now),
    payload: createBackupPayload({
      community: options.community,
      currentUser: options.currentUser,
      now,
      serializeCommunity: options.serializeCommunity,
      serializeState: options.serializeState,
      state: options.state
    })
  };
}

export function parseBackupPayload(raw) {
  const parsed = typeof raw === "string" ? JSON.parse(raw) : raw;
  if (!isPlainObject(parsed)) {
    throw new Error("Backup payload must be a JSON object.");
  }
  if (Object.prototype.hasOwnProperty.call(parsed, "state")) {
    if (!isPlainObject(parsed.state)) {
      throw new Error("Backup state must be a JSON object.");
    }
    if (
      Object.prototype.hasOwnProperty.call(parsed, "community")
        && !isPlainObject(parsed.community)
    ) {
      throw new Error("Backup community must be a JSON object.");
    }
    return {
      state: parsed.state,
      community: parsed.community
    };
  }
  return { state: parsed };
}

export function parseBackupState(raw) {
  return parseBackupPayload(raw).state;
}

export async function mergeBackupFile(file, currentState = {}, deps = {}) {
  if (!file) return { changed: false, state: currentState };
  const readFileAsText = deps.readFileAsText;
  if (typeof readFileAsText !== "function") throw new Error("Missing file reader");
  const raw = await readFileAsText(file);
  const payload = parseBackupPayload(raw);
  const result = {
    changed: true,
    state: mergeImportedState(currentState, payload.state, deps)
  };
  if (isPlainObject(payload.community)) {
    result.community = mergeImportedCommunity(deps.currentCommunity || {}, payload.community, deps);
  }
  return result;
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
    ...currentState,
    ...importedState,
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

export function mergeImportedCommunity(currentCommunity = {}, importedCommunity = {}, deps = {}) {
  const normalizeCommunityStore = deps.normalizeCommunityStore || ((store) => store || {});
  const mergeCommunityStores = deps.mergeCommunityStores;
  if (typeof mergeCommunityStores === "function") {
    return mergeCommunityStores(importedCommunity, currentCommunity);
  }
  return normalizeCommunityStore({
    posts: [
      ...(Array.isArray(currentCommunity.posts) ? currentCommunity.posts : []),
      ...(Array.isArray(importedCommunity.posts) ? importedCommunity.posts : [])
    ],
    threads: [
      ...(Array.isArray(currentCommunity.threads) ? currentCommunity.threads : []),
      ...(Array.isArray(importedCommunity.threads) ? importedCommunity.threads : [])
    ]
  });
}

function passthroughArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function isPlainObject(value) {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}
