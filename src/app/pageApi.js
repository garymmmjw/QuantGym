import { createAccountPageApi } from "./services/accountPageApi.js";
import { createCommunityPageApi } from "./services/communityPageApi.js";
import { createCoursesPageApi } from "./services/coursesPageApi.js";
import { createExperiencesPageApi } from "./services/experiencesPageApi.js";
import { createInterviewPageApi } from "./services/interviewPageApi.js";
import { createJobsPageApi } from "./services/jobsPageApi.js";
import { createLibraryPageApi } from "./services/libraryPageApi.js";
import { createMemoryPageApi } from "./services/memoryPageApi.js";
import { createMessagesPageApi } from "./services/messagesPageApi.js";
import { createNetworkPageApi } from "./services/networkPageApi.js";
import { createOverviewPageApi } from "./services/overviewPageApi.js";
import { createPageApiUserState } from "./services/pageApiUserState.js";
import { createPlanPageApi } from "./services/planPageApi.js";
import { createPkPageApi } from "./services/pkPageApi.js";
import { createPokerPageApi } from "./services/pokerPageApi.js";
import { createProblemsPageApi } from "./services/problemsPageApi.js";
import { createResumePageApi } from "./services/resumePageApi.js";
import { createSkillsPageApi } from "./services/skillsPageApi.js";
import { createToolsPageApi } from "./services/toolsPageApi.js";

export function createPageApi(deps = {}) {
  const userStateApi = createPageApiUserState(deps);
  const problems = createProblemsPageApi(deps);
  const plan = createPlanPageApi({
    ...deps,
    setProblemSearchQuery: problems.setSearchQuery
  });

  return {
    t: deps.t,
    getLanguage: deps.getLanguage,
    skillDefs: deps.skillDefs,
    getCurrentUser: () => deps.appState?.currentUser || null,
    saveState: (options) => deps.saveState?.(options),
    refreshIcons: (options) => deps.refreshIcons?.(options),
    safeExternalUrl: deps.safeExternalUrl,
    openExternalUrl: deps.openExternalUrl,
    inferSource: deps.inferSource,
    makeId: deps.makeId,
    parseTags: deps.parseTags,
    formatDate: deps.formatDate,
    formatNewsDate: deps.formatNewsDate,
    getInitials: deps.getInitials,
    localDateKey: deps.localDateKey,

    courses: createCoursesPageApi(deps, userStateApi),
    jobs: createJobsPageApi(deps, userStateApi),
    resume: createResumePageApi(deps, userStateApi),
    experiences: createExperiencesPageApi(deps, userStateApi),
    messages: createMessagesPageApi(deps),
    network: createNetworkPageApi(deps, userStateApi),
    memory: createMemoryPageApi(deps, userStateApi),

    account: createAccountPageApi(deps),
    community: createCommunityPageApi(deps),
    library: createLibraryPageApi(deps),
    overview: createOverviewPageApi(deps),
    plan,
    skills: createSkillsPageApi(deps),
    pk: createPkPageApi(deps),
    tools: createToolsPageApi(deps),
    problems,
    interview: createInterviewPageApi(deps),
    poker: createPokerPageApi(deps),

    rebindElements: deps.rebindElements
  };
}
