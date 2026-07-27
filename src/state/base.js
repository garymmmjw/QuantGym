export function createBaseState(deps = {}) {
  const {
    skillDefs = {},
    seedJobs = [],
    seedCourses = [],
    seedNews = [],
    defaultLeaderboardSettings = () => ({}),
    nowIso = () => new Date().toISOString()
  } = deps;
  const createdAt = nowIso();

  return {
    skills: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0])),
    entries: [],
    resources: [],
    network: [],
    interviewFavorites: [],
    mentalMathRecords: [],
    gameRecords: [],
    courseStates: [],
    interviewExperiences: [],
    resume: { text: "", review: [], fileName: "", fileType: "", fileSize: 0, uploadedAt: "", updatedAt: "" },
    jobs: seedJobs.map((item) => ({ ...item, tags: [...(item.tags || [])] })),
    courses: seedCourses.map((item) => ({ ...item, tags: [...(item.tags || [])] })),
    streakCount: 0,
    checkIns: [],
    leaderboard: defaultLeaderboardSettings(),
    news: seedNews.map((item) => ({
      ...item,
      tags: [...(item.tags || [])],
      skills: [...(item.skills || [])]
    })),
    newsFetchedAt: "",
    newsFetchAttemptAt: "",
    newsSyncError: "",
    jobsFetchedAt: "",
    jobsFetchAttemptAt: "",
    jobsSyncError: "",
    createdAt,
    updatedAt: createdAt
  };
}
