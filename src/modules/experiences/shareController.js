import {
  clearExperienceShareForPost,
  publishExperienceRecord
} from './share.js';

export function createExperienceShareController(deps = {}) {
  const getRecords = () => deps.getRecords?.() || [];
  const setRecords = (records) => deps.setRecords?.(records);
  const getCommunity = () => {
    const community = deps.loadCommunity?.() || deps.getCommunity?.() || {};
    deps.setCommunity?.(community);
    return community;
  };
  const renderExperiences = () => deps.renderExperiences?.();

  function publish(recordId) {
    const result = publishExperienceRecord({
      records: getRecords(),
      community: getCommunity(),
      recordId,
      currentUser: deps.getCurrentUser?.(),
      makeId: deps.makeId,
      normalizePost: deps.normalizePost,
      normalizeExperience: deps.normalizeExperience,
      formatText: deps.formatText,
      now: deps.now?.()
    });
    if (!result.ok) return result;

    deps.setCommunity?.(result.community);
    setRecords(result.records);
    deps.saveCommunity?.();
    deps.saveState?.();
    deps.setCommunityFilter?.("experience");
    renderExperiences();
    deps.switchModule?.("community");
    deps.renderCommunity?.();
    return result;
  }

  function clearForPost(postId) {
    const records = clearExperienceShareForPost(getRecords(), postId, {
      normalizeExperience: deps.normalizeExperience,
      now: deps.now?.()
    });
    setRecords(records);
    deps.saveState?.();
    renderExperiences();
    return records;
  }

  return {
    clearForPost,
    publish
  };
}
