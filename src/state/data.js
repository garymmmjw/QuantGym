import { timestampOrZero } from '../lib/date.js';
import { mergeEconomy, normalizeBonusXp, normalizeEconomy } from '../modules/economy/index.js';

export function normalizeState(rawState = {}, deps = {}) {
  const {
    createBaseState = () => ({}),
    normalizeSkills = passthroughObject,
    normalizeResources = passthroughArray,
    normalizeNetworkContact = passthroughObject,
    normalizeMentalMathRecords = passthroughArray,
    normalizeGameRecords = passthroughArray,
    normalizeCourseStates = passthroughArray,
    normalizeInterviewExperience = passthroughObject,
    normalizeResumeState = passthroughObject,
    normalizeJobs = passthroughArray,
    normalizeCourses = passthroughArray,
    normalizeLeaderboardSettings = passthroughObject,
    mergeNews = (seed = [], saved = []) => [...seed, ...saved]
  } = deps;
  const sanitizedState = withoutRetiredDailyTrainingState(rawState);
  const base = createBaseState();
  const legacyFavorites = Array.isArray(sanitizedState.interviewFavorites) ? sanitizedState.interviewFavorites : [];
  return {
    ...base,
    ...sanitizedState,
    skills: normalizeSkills(sanitizedState.skills || {}),
    entries: Array.isArray(sanitizedState.entries) ? sanitizedState.entries : [],
    resources: normalizeResources(sanitizedState.resources),
    network: Array.isArray(sanitizedState.network) ? sanitizedState.network.map(normalizeNetworkContact) : [],
    interviewFavorites: legacyFavorites.filter((favorite) => !favorite?.problemId),
    mentalMathRecords: normalizeMentalMathRecords(sanitizedState.mentalMathRecords),
    gameRecords: normalizeGameRecords(sanitizedState.gameRecords),
    courseStates: normalizeCourseStates(sanitizedState.courseStates),
    interviewExperiences: Array.isArray(sanitizedState.interviewExperiences)
      ? sanitizedState.interviewExperiences.map(normalizeInterviewExperience)
      : [],
    resume: normalizeResumeState(sanitizedState.resume),
    jobs: normalizeJobs(sanitizedState.jobs),
    courses: normalizeCourses(sanitizedState.courses),
    streakCount: Math.max(0, Number(sanitizedState.streakCount || 0)),
    checkIns: Array.isArray(sanitizedState.checkIns) ? sanitizedState.checkIns.filter((item) => item?.date) : [],
    economy: normalizeEconomy(sanitizedState),
    bonusXp: normalizeBonusXp(sanitizedState.bonusXp),
    leaderboard: normalizeLeaderboardSettings(sanitizedState.leaderboard),
    news: mergeNews(base.news || [], Array.isArray(sanitizedState.news) ? sanitizedState.news : []),
    newsFetchedAt: sanitizedState.newsFetchedAt || "",
    newsFetchAttemptAt: sanitizedState.newsFetchAttemptAt || "",
    newsSyncError: sanitizedState.newsSyncError || "",
    jobsFetchedAt: sanitizedState.jobsFetchedAt || "",
    jobsFetchAttemptAt: sanitizedState.jobsFetchAttemptAt || "",
    jobsSyncError: sanitizedState.jobsSyncError || "",
    updatedAt: sanitizedState.updatedAt || sanitizedState.createdAt || base.createdAt
  };
}

export function localStatePayload(rawState = {}, deps = {}) {
  void deps;
  return withoutRetiredDailyTrainingState(rawState);
}

export function cloudStatePayload(rawState = {}, deps = {}) {
  const payload = localStatePayload(rawState, deps);
  return payload;
}

export function mergeCloudState(remoteState = {}, localState = {}, deps = {}) {
  const {
    normalizeSkills = passthroughObject,
    normalizeInterviewExperience = passthroughObject,
    mergeCourseStates = (...lists) => lists.flat().filter(Boolean),
    mergeResumeState = (remote, local) => ({ ...(remote || {}), ...(local || {}) }),
    mergeJobs = (remote = [], local = []) => [...remote, ...local],
    mergeCourses = (remote = [], local = []) => [...remote, ...local],
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
    resume: mergeResumeState(remote.resume, local.resume),
    jobs: mergeJobs(remote.jobs, local.jobs),
    courses: mergeCourses(remote.courses, local.courses),
    streakCount: Math.max(Number(remote.streakCount || 0), Number(local.streakCount || 0)),
    checkIns: mergeRecords(remote.checkIns, local.checkIns),
    economy: mergeEconomy(remote.economy, local.economy, { remoteUpdatedAt: remote.updatedAt, localUpdatedAt: local.updatedAt }),
    bonusXp: Math.max(normalizeBonusXp(remote.bonusXp), normalizeBonusXp(local.bonusXp)),
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
    mergeCloudState = (remote, local) => ({ ...(remote || {}), ...(local || {}) }),
    normalizeState = (value) => value || {}
  } = options;
  const remoteState = withoutRetiredDailyTrainingState(payload.state);
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
  return [...byId.values()].sort((a, b) => timestampOrZero(a.date || a.createdAt) - timestampOrZero(b.date || b.createdAt));
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

function withoutRetiredDailyTrainingState(rawState = {}) {
  const payload = { ...(rawState || {}) };
  delete payload.problems;
  delete payload.problemStates;
  delete payload.leetcodeHot100Done;
  delete payload.studyPlan;
  delete payload.prepPlan;
  return payload;
}
