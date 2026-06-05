export function normalizeState(rawState = {}, deps = {}) {
  const {
    createBaseState = () => ({}),
    normalizeSkills = passthroughObject,
    normalizeResources = passthroughArray,
    normalizeNetworkContact = passthroughObject,
    normalizeMentalMathRecords = passthroughArray,
    normalizeGameRecords = passthroughArray,
    normalizeCourseStates = passthroughArray,
    mergeProblemStates = (...lists) => lists.flat().filter(Boolean),
    problemStatesFromFavorites = passthroughArray,
    isDisabledProblemId = () => false,
    normalizeLeetcodeHot100Done = passthroughArray,
    normalizeStudyPlan = passthroughNullable,
    normalizePrepPlan = passthroughNullable,
    normalizeInterviewExperience = passthroughObject,
    normalizeResumeState = passthroughObject,
    normalizeJobs = passthroughArray,
    normalizeCourses = passthroughArray,
    normalizeLeaderboardSettings = passthroughObject,
    mergeProblems = (seed = [], saved = []) => [...seed, ...saved],
    isCatalogProblem = () => true,
    isDisabledProblemSource = () => false,
    mergeNews = (seed = [], saved = []) => [...seed, ...saved]
  } = deps;
  const base = createBaseState();
  const legacyFavorites = Array.isArray(rawState?.interviewFavorites) ? rawState.interviewFavorites : [];
  return {
    ...base,
    ...rawState,
    skills: normalizeSkills(rawState?.skills || {}),
    entries: Array.isArray(rawState?.entries) ? rawState.entries : [],
    resources: normalizeResources(rawState?.resources),
    network: Array.isArray(rawState?.network) ? rawState.network.map(normalizeNetworkContact) : [],
    interviewFavorites: legacyFavorites.filter((favorite) => !favorite?.problemId),
    mentalMathRecords: normalizeMentalMathRecords(rawState?.mentalMathRecords),
    gameRecords: normalizeGameRecords(rawState?.gameRecords),
    courseStates: normalizeCourseStates(rawState?.courseStates),
    problemStates: mergeProblemStates(
      Array.isArray(rawState?.problemStates) ? rawState.problemStates : [],
      problemStatesFromFavorites(legacyFavorites.filter((favorite) => favorite?.problemId))
    ).filter((problemState) => !isDisabledProblemId(problemState.problemId)),
    leetcodeHot100Done: normalizeLeetcodeHot100Done(rawState?.leetcodeHot100Done),
    studyPlan: normalizeStudyPlan(rawState?.studyPlan),
    prepPlan: normalizePrepPlan(rawState?.prepPlan),
    interviewExperiences: Array.isArray(rawState?.interviewExperiences)
      ? rawState.interviewExperiences.map(normalizeInterviewExperience)
      : [],
    resume: normalizeResumeState(rawState?.resume),
    jobs: normalizeJobs(rawState?.jobs),
    courses: normalizeCourses(rawState?.courses),
    streakCount: Math.max(0, Number(rawState?.streakCount || 0)),
    checkIns: Array.isArray(rawState?.checkIns) ? rawState.checkIns.filter((item) => item?.date) : [],
    leaderboard: normalizeLeaderboardSettings(rawState?.leaderboard),
    problems: mergeProblems(
      base.problems || [],
      Array.isArray(rawState?.problems)
        ? rawState.problems.filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem))
        : []
    ),
    news: mergeNews(base.news || [], Array.isArray(rawState?.news) ? rawState.news : []),
    newsFetchedAt: rawState?.newsFetchedAt || "",
    newsFetchAttemptAt: rawState?.newsFetchAttemptAt || "",
    newsSyncError: rawState?.newsSyncError || "",
    jobsFetchedAt: rawState?.jobsFetchedAt || "",
    jobsFetchAttemptAt: rawState?.jobsFetchAttemptAt || "",
    jobsSyncError: rawState?.jobsSyncError || "",
    updatedAt: rawState?.updatedAt || rawState?.createdAt || base.createdAt
  };
}

export function localStatePayload(rawState = {}, deps = {}) {
  const getUserCatalogProblems = deps.getUserCatalogProblems || ((problems) => problems);
  return {
    ...rawState,
    problems: getUserCatalogProblems(rawState?.problems || [])
  };
}

export function cloudStatePayload(rawState = {}, deps = {}) {
  const payload = localStatePayload(rawState, deps);
  delete payload.problems;
  delete payload.problemStates;
  return payload;
}

export function mergeCloudState(remoteState = {}, localState = {}, deps = {}) {
  const {
    normalizeSkills = passthroughObject,
    normalizeInterviewExperience = passthroughObject,
    mergeCourseStates = (...lists) => lists.flat().filter(Boolean),
    mergeProblemStates = (...lists) => lists.flat().filter(Boolean),
    mergeResumeState = (remote, local) => ({ ...(remote || {}), ...(local || {}) }),
    mergeJobs = (remote = [], local = []) => [...remote, ...local],
    mergeCourses = (remote = [], local = []) => [...remote, ...local],
    mergeProblems = (remote = [], local = []) => [...remote, ...local],
    mergeNews = (remote = [], local = []) => [...remote, ...local],
    defaultLeaderboardSettings = () => ({}),
    skillDefs = {}
  } = deps;
  const mergeRecords = deps.mergeRecordsById || ((...lists) => mergeRecordsById(lists, deps));
  const latest = deps.latestIso || latestIso;
  const remote = normalizeState(remoteState || {}, deps);
  const local = normalizeState(localState || {}, deps);
  const skills = Object.fromEntries(Object.keys(skillDefs).map((key) => [
    key,
    Math.max(Number(remote.skills?.[key] || 0), Number(local.skills?.[key] || 0))
  ]));
  const createdAt = [remote.createdAt, local.createdAt].filter(Boolean).sort()[0] || new Date().toISOString();
  const updatedCandidates = [remote.updatedAt, local.updatedAt].filter(Boolean).sort();
  const updatedAt = updatedCandidates[updatedCandidates.length - 1] || new Date().toISOString();
  return normalizeState({
    ...remote,
    ...local,
    skills: normalizeSkills(skills),
    entries: mergeRecords(remote.entries, local.entries),
    resources: mergeRecords(remote.resources, local.resources),
    network: mergeRecords(remote.network, local.network),
    interviewFavorites: mergeRecords(remote.interviewFavorites, local.interviewFavorites),
    interviewExperiences: mergeRecords(remote.interviewExperiences, local.interviewExperiences).map(normalizeInterviewExperience),
    courseStates: mergeCourseStates(remote.courseStates, local.courseStates),
    problemStates: mergeProblemStates(remote.problemStates, local.problemStates),
    studyPlan: latest(remote.studyPlan?.createdAt, local.studyPlan?.createdAt) === remote.studyPlan?.createdAt ? remote.studyPlan : local.studyPlan,
    prepPlan: latest(remote.prepPlan?.updatedAt, local.prepPlan?.updatedAt) === remote.prepPlan?.updatedAt ? remote.prepPlan : local.prepPlan,
    resume: mergeResumeState(remote.resume, local.resume),
    jobs: mergeJobs(remote.jobs, local.jobs),
    courses: mergeCourses(remote.courses, local.courses),
    streakCount: Math.max(Number(remote.streakCount || 0), Number(local.streakCount || 0)),
    checkIns: mergeRecords(remote.checkIns, local.checkIns),
    problems: mergeProblems(remote.problems, local.problems),
    news: mergeNews(remote.news, local.news),
    leaderboard: local.leaderboard || remote.leaderboard || defaultLeaderboardSettings(),
    newsFetchedAt: latest(remote.newsFetchedAt, local.newsFetchedAt),
    newsFetchAttemptAt: latest(remote.newsFetchAttemptAt, local.newsFetchAttemptAt),
    newsSyncError: local.newsSyncError || remote.newsSyncError || "",
    jobsFetchedAt: latest(remote.jobsFetchedAt, local.jobsFetchedAt),
    jobsFetchAttemptAt: latest(remote.jobsFetchAttemptAt, local.jobsFetchAttemptAt),
    jobsSyncError: local.jobsSyncError || remote.jobsSyncError || "",
    createdAt,
    updatedAt
  }, deps);
}

export function buildCloudSessionState(payload = {}, options = {}) {
  const {
    localState = {},
    merge = true,
    mergeProblemStates = (...lists) => lists.flat().filter(Boolean),
    mergeCloudState = (remote, local) => ({ ...(remote || {}), ...(local || {}) }),
    normalizeState = (value) => value || {}
  } = options;
  const remoteState = {
    ...(payload.state || {}),
    problemStates: mergeProblemStates(payload.state?.problemStates || [], payload.problemStates || [])
  };
  const nextState = merge === false
    ? normalizeState(Object.keys(remoteState).length ? remoteState : localState)
    : mergeCloudState(remoteState, localState);
  return {
    localState,
    remoteState,
    nextState
  };
}

export function buildCloudSessionCommunity(payload = {}, options = {}) {
  const {
    currentCommunity = {},
    localCommunity = currentCommunity,
    merge = true,
    normalizeCommunityStore = (value) => value || {},
    mergeCloudCommunity = (remote, local) => ({ ...(remote || {}), ...(local || {}) })
  } = options;
  return merge === false
    ? normalizeCommunityStore(payload.community || currentCommunity)
    : mergeCloudCommunity(payload.community, localCommunity);
}

export function mergeRecordsById(lists = [], deps = {}) {
  const makeId = deps.makeId || (() => `${Date.now()}-${Math.random()}`);
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((item) => {
    const id = item.id || makeId();
    byId.set(id, { ...(byId.get(id) || {}), ...item, id });
  });
  return [...byId.values()].sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));
}

export function latestIso(...values) {
  const sorted = values.filter(Boolean).sort();
  return sorted[sorted.length - 1] || "";
}

function passthroughObject(value = {}) {
  return value || {};
}

function passthroughArray(value = []) {
  return Array.isArray(value) ? value : [];
}

function passthroughNullable(value = null) {
  return value || null;
}
