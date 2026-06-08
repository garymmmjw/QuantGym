export function createExperiencesPageApi(deps = {}, userStateApi = {}) {
  const { getUserState, setUserPatch } = userStateApi;
  return {
    getRecords: () => getUserState().interviewExperiences || [],
    setRecords(records) {
      setUserPatch({ interviewExperiences: records });
    },
    normalize: deps.normalizeExperience,
    formatOutcome: deps.formatExperienceOutcome,
    formatDate: deps.formatExperienceDate,
    labels: deps.experienceLabels,
    publish: deps.publishExperience
  };
}
