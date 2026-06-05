import { registerModule } from '../registry.js';
import { createAccountModule } from '../account/index.js';
import { createCompaniesModule } from '../companies/index.js';
import { createCompanyMark as createCompanyMarkView } from '../companies/view.js';
import { createCoursesModule } from '../courses/index.js';
import { createExperiencesModule } from '../experiences/index.js';
import { createLibraryModule } from '../library/index.js';

export function registerContentModules(deps = {}) {
  registerModule("account", createAccountModule({
    elements: deps.elements,
    save: deps.saveAccount,
    getCurrentUser: deps.getCurrentUser,
    defaultGraduationTerm: deps.defaultGraduationTerm,
    renderCountries: deps.renderCountries,
    renderRegions: deps.renderRegions,
    renderAccountResumeMeta: deps.renderAccountResumeMeta,
    getInitials: deps.getInitials,
    formatDate: deps.formatAccountDate,
    formatRank: deps.formatAccountRank,
    labels: deps.accountLabels,
    handleResumeFile: deps.handleAccountResumeFile
  }));

  registerModule("companies", createCompaniesModule({
    elements: deps.elements,
    companyDefs: deps.companyDefs,
    getTierFilter: deps.getCompanyTierFilter,
    setTierFilter: deps.setCompanyTierFilter,
    getLanguage: deps.getLanguage,
    formatSummary: deps.formatCompanySummary,
    formatCompanyMeta: deps.formatCompanyMeta,
    getOpenRolesLabel: deps.getCompanyOpenRolesLabel,
    getLocationsLabel: deps.getCompanyLocationsLabel,
    getCatalogProblems: deps.getCatalogProblems,
    getCompanyProblemStats: deps.getCompanyProblemStats,
    getCompanyJobs: deps.getCompanyJobs,
    companyTierWeight: deps.companyTierWeight,
    createCompanyMark(company) {
      return createCompanyMarkView(company, { getInitials: deps.getInitials });
    },
    practice: deps.practiceCompanyProblems,
    openCareers: deps.openExternalUrl,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    refreshIcons: deps.refreshIcons
  }));

  registerModule("courses", createCoursesModule({
    elements: deps.elements,
    getCourses: deps.getCourses,
    getCourseStates: deps.getCourseStates,
    setCourseStates: deps.setCourseStates,
    normalizeCourses: deps.normalizeCourses,
    normalizeCourseStates: deps.normalizeCourseStates,
    normalizeContentSources: deps.normalizeContentSources,
    save: deps.saveState,
    addTag: deps.addTag,
    safeExternalUrl: deps.safeExternalUrl,
    formatPrompt: deps.formatCoursePrompt,
    formatSourceTitle: deps.formatCourseSourceTitle,
    getQueuedLabel: deps.getCourseQueuedLabel,
    getRemoveFromPathLabel: deps.getCourseRemoveFromPathLabel,
    setText: deps.setText,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    refreshIcons: deps.refreshIcons
  }));

  registerModule("experiences", createExperiencesModule({
    elements: deps.elements,
    getRecords: deps.getExperienceRecords,
    setRecords: deps.setExperienceRecords,
    normalizeExperience: deps.normalizeExperience,
    parseTags: deps.parseTags,
    localDateKey: deps.localDateKey,
    makeId: deps.makeId,
    saveState: deps.saveState,
    publish: deps.publishExperience,
    formatOutcome: deps.formatExperienceOutcome,
    formatDate: deps.formatExperienceDate,
    labels: deps.experienceLabels,
    openCommunityExperiences: deps.openCommunityExperiences,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    refreshIcons: deps.refreshIcons
  }));

  registerModule("library", createLibraryModule({
    elements: deps.elements,
    getEntries: deps.getLibraryEntries,
    getVisibleEntries: deps.getVisibleLibraryEntries,
    getKindFilter: deps.getLibraryKindFilter,
    setQuery: deps.setLibraryQuery,
    setKindFilter: deps.setLibraryKindFilter,
    getLanguage: deps.getLanguage,
    getTitle: deps.getLibraryTitle,
    getSubtitle: deps.getLibrarySubtitle,
    getKindLabel: deps.getLibraryKindLabel,
    getCardActionLabel: deps.getLibraryCardActionLabel,
    getProblemCountLabel: deps.getLibraryProblemCountLabel,
    getReadLabel: deps.getLibraryReadLabel,
    getPracticeLabel: deps.getLibraryPracticeLabel,
    getReferenceOnlyLabel: deps.getLibraryReferenceOnlyLabel,
    getEmptyLabel: deps.getLibraryEmptyLabel,
    getBooksLabel: deps.getLibraryBooksLabel,
    getSetsLabel: deps.getLibrarySetsLabel,
    getLinkedProblemsLabel: deps.getLibraryLinkedProblemsLabel,
    getTotalProblems: deps.getTotalLibraryProblems,
    openReader: deps.openLibraryReader,
    openPractice: deps.openLibraryPractice,
    closeReader: deps.closeLibraryReader,
    emptyBlock: deps.emptyBlock,
    escapeHtml: deps.escapeHtml,
    refreshIcons: deps.refreshIcons
  }));
}
