import { registerModule } from '../registry.js';
import { createInterviewModule } from '../interview/index.js';
import { createPkModule } from '../pk/index.js';
import { createPkRuntime } from '../pk/runtime.js';
import { createProblemsModule } from '../problems/index.js';
import { createSkillsModule } from '../skills/index.js';
import { createToolsModule } from '../tools/index.js';
import { createToolsPracticeController } from '../tools/runtime.js';

export function registerTrainingModules(deps = {}) {
  registerModule("interview", createInterviewModule({
    elements: deps.elements,
    renderSetup: deps.renderInterviewSetup,
    renderTranscript: deps.renderInterviewTranscript,
    renderFavorites: deps.renderInterviewFavorites,
    selectLanguage: deps.selectInterviewLanguage,
    handleSetupChange: deps.handleInterviewSetupChange,
    toggleCategory: deps.toggleInterviewCategory,
    updateSetupVisibility: deps.updateInterviewSetupVisibility,
    updateAnswerMode: deps.updateInterviewAnswerMode,
    updatePdfMeta: deps.updateInterviewPdfMeta,
    updateAnswerFileMeta: deps.updateInterviewAnswerFileMeta,
    autoSizeAnswer: deps.autoSizeInterviewAnswer,
    handleAnswerKeydown: deps.handleInterviewAnswerKeydown,
    handleTranscriptAction: deps.handleInterviewTranscriptAction,
    saveLlmConfig: deps.saveLlmConfig,
    start: deps.startInterview,
    requestHint: deps.requestInterviewHint,
    revealAnswer: deps.revealInterviewAnswer,
    nextQuestion: deps.goToNextInterviewQuestion,
    saveFavorite: deps.saveCurrentInterviewFavorite,
    shareQuestion: deps.shareCurrentInterviewQuestion,
    restart: deps.restartInterviewWithSameConfig,
    exportReport: deps.exportInterviewReport,
    togglePanel: deps.toggleInterviewPanel,
    exit: deps.exitInterview,
    resume: deps.resumeDurableInterview,
    toggleVoice: deps.toggleVoiceAnswer,
    clear: deps.resetInterview,
    submitAnswer: deps.submitInterviewAnswer
  }));

  const pkRuntime = createPkRuntime({
    elements: deps.elements,
    documentRef: deps.documentRef,
    getState: deps.getState,
    makeId: deps.makeId,
    randomChoice: deps.randomChoice,
    randomInt: deps.randomInt,
    formatCategory: deps.formatCategory,
    skillDefs: deps.skillDefs,
    normalizeCategory: deps.normalizeCategory,
    getLocalizedProblemField: deps.getLocalizedProblemField,
    saveState: deps.saveState,
    renderAll: deps.renderAll
  });

  registerModule("pk", createPkModule({
    elements: deps.elements,
    start: pkRuntime.start,
    reveal: pkRuntime.reveal,
    submit: pkRuntime.submit
  }));

  registerModule("problems", createProblemsModule({
    elements: deps.elements,
    render: deps.renderProblems,
    setSearchComposing: deps.setProblemSearchComposing,
    handleSearchInput: deps.handleProblemSearchInput,
    handleSearchKeydown: deps.handleProblemSearchKeydown,
    setThemeFilter: deps.setProblemThemeFilter,
    setDifficultyFilter: deps.setProblemDifficultyFilter,
    setCompanyFilter: deps.setProblemCompanyFilter,
    clearCompanyFilter: deps.clearProblemCompanyFilter,
    clearSourceFilter: deps.clearProblemSourceFilter,
    handleCollectionClick: deps.handleProblemCollectionClick,
    toggleLeetcodeHot: deps.toggleLeetcodeHot,
    addFromForm: deps.addProblemFromForm,
    importJson: deps.importProblemJson,
    setViewMode: deps.setProblemViewMode,
    handlePaginationClick: deps.handleProblemPaginationClick,
    handlePaginationSubmit: deps.handleProblemPaginationSubmit,
    handlePaginationChange: deps.handleProblemPaginationChange,
    handlePaginationKeydown: deps.handleProblemPaginationKeydown
  }));

  registerModule("skills", createSkillsModule({
    elements: deps.elements,
    skillDefs: deps.skillDefs,
    getSkills: deps.getSkills,
    getSkillScore: deps.getSkillScore,
    getPracticeStats: deps.getSkillPracticeStats,
    getAllPracticeStats: deps.getAllSkillPracticeStats,
    getQuantScore: deps.getQuantScore,
    formatScore: deps.formatScore,
    radar: deps.skillRadarRuntime,
    t: deps.t,
    escapeHtml: deps.escapeHtml
  }));

  const toolsPracticeController = createToolsPracticeController({
    elements: deps.elements,
    windowRef: deps.windowRef,
    getState: deps.getState,
    getCurrentUserName: deps.getCurrentUserName,
    makeId: deps.makeId,
    formatNumber: deps.formatNumber,
    formatDate: deps.formatDate,
    t: deps.t,
    emptyBlock: deps.emptyBlock,
    skillDefs: deps.skillDefs,
    saveState: deps.saveState,
    renderSummary: deps.renderSummary,
    renderSkills: deps.renderSkills,
    renderMemory: deps.renderMemory,
    recordGameResult: deps.recordGameResult,
    ensurePokerGame: deps.ensurePokerGame,
    renderPokerGame: deps.renderPokerGame,
    refreshIcons: deps.refreshIcons
  });

  registerModule("tools", createToolsModule({
    elements: deps.elements,
    render: toolsPracticeController.render,
    setDrillMode: toolsPracticeController.setDrillMode,
    startDrillSession: toolsPracticeController.startDrillSession,
    checkDrill: toolsPracticeController.checkDrill,
    skipDrill: toolsPracticeController.skipDrill,
    advanceDrillQuestion: toolsPracticeController.advanceDrillQuestion,
    submitMarketQuote: toolsPracticeController.submitMarketQuote,
    newMarketGame: toolsPracticeController.newMarketGame
  }));
}
