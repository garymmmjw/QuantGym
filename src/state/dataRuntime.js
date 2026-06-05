import { createBaseState as createBaseStateValue } from './base.js';
import {
  cloudStatePayload as cloudStatePayloadValue,
  latestIso as latestIsoValue,
  localStatePayload as localStatePayloadValue,
  mergeCloudState as mergeCloudStateValue,
  mergeRecordsById as mergeRecordsByIdValue,
  normalizeState as normalizeStateValue
} from './data.js';
import {
  mergeCourses as mergeCoursesValue,
  mergeCourseStates as mergeCourseStatesValue,
  normalizeCourses as normalizeCoursesValue,
  normalizeCourseStates as normalizeCourseStatesValue
} from '../modules/courses/data.js';
import { normalizeInterviewExperience as normalizeInterviewExperienceValue } from '../modules/experiences/data.js';
import {
  mergeJobs as mergeJobsValue,
  normalizeJobs as normalizeJobsValue
} from '../modules/jobs/data.js';
import { normalizeResources as normalizeResourcesValue } from '../modules/memory/data.js';
import {
  normalizePrepPlan as normalizePrepPlanValue,
  normalizeStudyPlan as normalizeStudyPlanValue
} from '../modules/plan/data.js';
import {
  mergeResumeState as mergeResumeStateValue,
  normalizeResumeState as normalizeResumeStateValue
} from '../modules/resume/data.js';
import { normalizeSkills as normalizeSkillsValue } from '../modules/skills/data.js';
import {
  normalizeGameRecords as normalizeGameRecordsValue,
  normalizeMentalMathRecords as normalizeMentalMathRecordsValue
} from '../modules/tools/data.js';

export function createStateDataRuntime(deps = {}) {
  function createBaseState() {
    return createBaseStateValue({
      skillDefs: deps.skillDefs,
      seedJobs: deps.seedJobs,
      seedCourses: deps.seedCourses,
      seedNews: deps.seedNews,
      catalogProblems: deps.catalogProblems,
      mergeProblems: deps.mergeProblems,
      isDisabledProblemSource: deps.isDisabledProblemSource,
      defaultLeaderboardSettings: deps.defaultLeaderboardSettings,
      nowIso: deps.nowIso
    });
  }

  function getStateDataDeps() {
    return {
      createBaseState,
      normalizeSkills,
      normalizeResources,
      normalizeNetworkContact: deps.normalizeNetworkContact,
      normalizeMentalMathRecords,
      normalizeGameRecords,
      normalizeCourseStates,
      mergeProblemStates: deps.mergeProblemStates,
      problemStatesFromFavorites: deps.problemStatesFromFavorites,
      isDisabledProblemId: deps.isDisabledProblemId,
      normalizeLeetcodeHot100Done: deps.normalizeLeetcodeHot100Done,
      normalizeStudyPlan,
      normalizePrepPlan,
      normalizeInterviewExperience,
      normalizeResumeState,
      normalizeJobs,
      normalizeCourses,
      normalizeLeaderboardSettings: deps.normalizeLeaderboardSettings,
      mergeProblems: deps.mergeProblems,
      isCatalogProblem: deps.isCatalogProblem,
      isDisabledProblemSource: deps.isDisabledProblemSource,
      mergeNews: deps.mergeNews,
      getUserCatalogProblems: deps.getUserCatalogProblems,
      mergeRecordsById,
      mergeCourseStates,
      mergeResumeState,
      mergeJobs,
      mergeCourses,
      defaultLeaderboardSettings: deps.defaultLeaderboardSettings,
      latestIso,
      skillDefs: deps.skillDefs,
      makeId: deps.makeId
    };
  }

  function normalizeState(rawState) {
    return normalizeStateValue(rawState, getStateDataDeps());
  }

  function normalizeStudyPlan(raw = null) {
    return normalizeStudyPlanValue(raw, { makeId: deps.makeId });
  }

  function normalizePrepPlan(raw = null) {
    return normalizePrepPlanValue(raw, {
      makeId: deps.makeId,
      localDateKey: deps.localDateKey
    });
  }

  function normalizeMentalMathRecords(records = []) {
    return normalizeMentalMathRecordsValue(records, { makeId: deps.makeId });
  }

  function normalizeGameRecords(records = []) {
    return normalizeGameRecordsValue(records, { makeId: deps.makeId });
  }

  function normalizeInterviewExperience(raw = {}) {
    return normalizeInterviewExperienceValue(raw, {
      makeId: deps.makeId,
      parseTags: deps.parseTags
    });
  }

  function normalizeResumeState(raw = {}) {
    return normalizeResumeStateValue(raw);
  }

  function normalizeJobs(rawJobs) {
    return normalizeJobsValue(rawJobs, {
      seedJobs: deps.seedJobs,
      parseTags: deps.parseTags,
      stableId: deps.stableProblemId,
      makeId: deps.makeId
    });
  }

  function normalizeCourses(rawCourses) {
    return normalizeCoursesValue(rawCourses, {
      seedCourses: deps.seedCourses,
      parseTags: deps.parseTags,
      stableId: deps.stableCourseId,
      makeId: deps.makeId,
      inferSource: deps.inferSource,
      safeExternalUrl: deps.safeExternalUrl
    });
  }

  function normalizeResources(rawResources) {
    return normalizeResourcesValue(rawResources, {
      normalizeContentSources: deps.normalizeContentSources,
      inferSource: deps.inferSource,
      makeId: deps.makeId
    });
  }

  function normalizeCourseStates(rawStates = []) {
    return normalizeCourseStatesValue(rawStates);
  }

  function normalizeSkills(rawSkills) {
    return normalizeSkillsValue(rawSkills, deps.skillDefs);
  }

  function localStatePayload(rawState) {
    return localStatePayloadValue(rawState, getStateDataDeps());
  }

  function cloudStatePayload(rawState) {
    return cloudStatePayloadValue(rawState, getStateDataDeps());
  }

  function mergeCloudState(remoteState, localState) {
    return mergeCloudStateValue(remoteState, localState, getStateDataDeps());
  }

  function mergeRecordsById(...lists) {
    return mergeRecordsByIdValue(lists, {
      makeId: deps.makeId
    });
  }

  function mergeCourseStates(...lists) {
    return mergeCourseStatesValue(lists, {
      latestIso
    });
  }

  function mergeResumeState(remoteResume, localResume) {
    return mergeResumeStateValue(remoteResume, localResume, {
      latestIso
    });
  }

  function mergeJobs(remoteJobs, localJobs) {
    return mergeJobsValue(remoteJobs, localJobs, {
      seedJobs: deps.seedJobs,
      parseTags: deps.parseTags,
      stableId: deps.stableProblemId,
      makeId: deps.makeId
    });
  }

  function mergeCourses(remoteCourses, localCourses) {
    return mergeCoursesValue(remoteCourses, localCourses, {
      seedCourses: deps.seedCourses,
      parseTags: deps.parseTags,
      stableId: deps.stableCourseId,
      makeId: deps.makeId,
      inferSource: deps.inferSource,
      safeExternalUrl: deps.safeExternalUrl
    });
  }

  function latestIso(...values) {
    return latestIsoValue(...values);
  }

  return {
    cloudStatePayload,
    createBaseState,
    getStateDataDeps,
    latestIso,
    localStatePayload,
    mergeCloudState,
    mergeCourses,
    mergeCourseStates,
    mergeJobs,
    mergeRecordsById,
    mergeResumeState,
    normalizeCourses,
    normalizeCourseStates,
    normalizeGameRecords,
    normalizeInterviewExperience,
    normalizeJobs,
    normalizeMentalMathRecords,
    normalizePrepPlan,
    normalizeResources,
    normalizeResumeState,
    normalizeSkills,
    normalizeState,
    normalizeStudyPlan
  };
}
