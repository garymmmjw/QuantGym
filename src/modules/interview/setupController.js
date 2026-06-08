import { clampNumber } from '../../lib/number.js';
import {
  autoSizeInterviewAnswer,
  renderInterviewAttachmentPreview,
  renderInterviewFileMeta
} from './attachments.js';
import {
  formatInterviewCategorySummary,
  getActiveInterviewLanguage,
  getActiveInterviewMode,
  renderInterviewAnswerMode,
  renderInterviewCategoryPicker,
  renderInterviewSetupVisibility
} from './setup.js';

export function createInterviewSetupController(deps = {}) {
  const elements = deps.elements || {};
  const documentRef = deps.documentRef || globalThis.document;
  const typeDefs = deps.typeDefs || {};
  const focusDefs = deps.focusDefs || {};
  const modeDefs = deps.modeDefs || {};
  const skillDefs = deps.skillDefs || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const getRuntimeState = deps.getRuntimeState || (() => ({}));
  const getProblems = deps.getProblems || (() => []);
  const normalizeCategory = deps.normalizeCategory || ((category) => category || "");
  const normalizeProblem = deps.normalizeProblem || ((problem) => problem);
  const formatCategory = deps.formatCategory || ((category) => category || "");

  function getSelectedCategorySet() {
    const runtimeState = getRuntimeState();
    if (!(runtimeState.selectedCategories instanceof Set)) {
      runtimeState.selectedCategories = new Set(["all"]);
    }
    return runtimeState.selectedCategories;
  }

  function getType() {
    return typeDefs[elements.interviewTypeSelect?.value] ? elements.interviewTypeSelect.value : "oa";
  }

  function getSource() {
    return elements.interviewSourceSelect?.value === "pdf" ? "pdf" : "full";
  }

  function getAnswerMode() {
    return ["text", "file", "voice"].includes(elements.interviewAnswerModeSelect?.value)
      ? elements.interviewAnswerModeSelect.value
      : "text";
  }

  function getQuestionCount() {
    return Math.round(clampNumber(elements.interviewQuestionCount?.value || 3, 1, 12));
  }

  function getQuestionSeconds() {
    return Math.round(clampNumber(elements.interviewQuestionTime?.value || typeDefs[getType()].minutes, 1, 60) * 60);
  }

  function makeBaseProblemPool(type = getType(), config = null) {
    if (config?.focusKey === "resume") return (deps.resumeProblems || []).map(normalizeProblem);
    if (config?.focusKey === "research") return (deps.researchProblems || []).map(normalizeProblem);
    if (config?.focusKey === "behavioral" || type === "behavioral") return (deps.behavioralProblems || []).map(normalizeProblem);
    const categories = typeDefs[type]?.categories || [];
    const filtered = getProblems().filter((problem) => categories.includes(normalizeCategory(problem.category)));
    return filtered.length ? filtered : getProblems();
  }

  function makeProblemPool(type = getType(), config = null) {
    const base = makeBaseProblemPool(type, config);
    const selectedCategories = config?.focusKey
      ? (focusDefs[config.focusKey]?.categories?.length ? focusDefs[config.focusKey].categories : ["all"])
      : getSelectedCategories();
    if (selectedCategories.includes("all")) return base;
    return base.filter((problem) => selectedCategories.includes(normalizeCategory(problem.category)));
  }

  function getAvailableCategories(type = getType()) {
    const categories = makeBaseProblemPool(type).map((problem) => normalizeCategory(problem.category)).filter((key) => skillDefs[key]);
    const unique = [...new Set(categories)];
    return unique.length ? unique : Object.keys(skillDefs);
  }

  function getSelectedCategories() {
    const available = getAvailableCategories();
    const selectedCategorySet = getSelectedCategorySet();
    if (selectedCategorySet.has("all")) return ["all"];
    const selected = [...selectedCategorySet].filter((key) => available.includes(key));
    return selected.length ? selected : ["all"];
  }

  function renderCategoryPicker() {
    if (!elements.interviewCategoryPicker) return;
    const runtimeState = getRuntimeState();
    const available = getAvailableCategories();
    const selected = getSelectedCategories();
    runtimeState.selectedCategories = selected[0] === "all" ? new Set(["all"]) : new Set(selected);
    renderInterviewCategoryPicker(elements.interviewCategoryPicker, {
      availableCategories: available,
      selectedCategories: runtimeState.selectedCategories,
      language: getInterviewState().language,
      formatCategory,
      documentRef
    });
  }

  function toggleCategory(category) {
    if (!category) return;
    const runtimeState = getRuntimeState();
    const selectedCategorySet = getSelectedCategorySet();
    if (category === "all") {
      runtimeState.selectedCategories = new Set(["all"]);
    } else {
      if (selectedCategorySet.has("all")) runtimeState.selectedCategories = new Set();
      const nextSet = getSelectedCategorySet();
      if (nextSet.has(category)) nextSet.delete(category);
      else nextSet.add(category);
      if (!nextSet.size) runtimeState.selectedCategories = new Set(["all"]);
    }
    renderCategoryPicker();
    updateSetupVisibility();
    deps.resetInterview?.({ keepSetup: true });
  }

  function getSelectedProblem() {
    const interviewState = getInterviewState();
    if (interviewState.session?.currentProblem) return interviewState.session.currentProblem;
    const pool = makeProblemPool();
    return pool.find((problem) => problem.id === getRuntimeState().selectedProblemId) || pool[0] || null;
  }

  function updateSetupVisibility() {
    renderInterviewSetupVisibility(elements, {
      source: getSource(),
      language: getInterviewState().language,
      selectedCategories: getSelectedCategories(),
      formatCategory
    });
  }

  function getCategorySummary() {
    return formatInterviewCategorySummary(getSelectedCategories(), {
      language: getInterviewState().language,
      formatCategory
    });
  }

  function updateAnswerMode() {
    renderInterviewAnswerMode(elements, {
      language: getInterviewState().language,
      autoSizeAnswer
    });
  }

  function updatePdfMeta() {
    const file = elements.interviewPdfInput?.files?.[0];
    renderInterviewFileMeta(elements.interviewPdfMeta, file, "上传 PDF 后会由 LLM 总结重点并生成题目。");
  }

  function updateAnswerFileMeta() {
    const file = elements.interviewAnswerFile?.files?.[0];
    const label = renderInterviewFileMeta(
      elements.interviewAnswerFileMeta,
      file,
      getInterviewState().language === "zh" ? "支持图片、文本文件和 PDF。" : "Supports images, text files, and PDF.",
      { minKb: 1 }
    );
    renderInterviewAttachmentPreview(elements.interviewAttachmentPreview, file, label, {
      documentRef,
      refreshIcons: deps.refreshIcons
    });
  }

  function autoSizeAnswer() {
    autoSizeInterviewAnswer(elements.interviewAnswer);
  }

  function handleAnswerKeydown(event) {
    if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
    event.preventDefault();
    elements.interviewForm?.requestSubmit();
  }

  function getSetupLanguage() {
    const language = getInterviewState().language;
    if (language === "en" || language === "zh") return language;
    return getActiveInterviewLanguage(documentRef);
  }

  function getSetupMode() {
    const runtimeMode = getRuntimeState().setupMode;
    if (modeDefs[runtimeMode]) return runtimeMode;
    return getActiveInterviewMode(documentRef, modeDefs, "practice");
  }

  function renderSetup(options = {}) {
    const useReactSetup = options.reactSetup !== false;
    if (!deps.hasRestoredSnapshot?.()) deps.restoreSessionSnapshot?.();
    const config = deps.getLlmConfig?.() || {};
    if (elements.llmEndpointInput) elements.llmEndpointInput.value = config.endpoint || "";
    if (elements.llmModelInput) elements.llmModelInput.value = config.model || "";
    if (!useReactSetup) {
      elements.resumeInterviewBtn?.classList.toggle("hidden", !deps.hasDurableInterview?.());
      renderCategoryPicker();
      updateSetupVisibility();
    }
    updateAnswerMode();
    deps.updateStatus?.();
    deps.renderQuestionPanel?.();
  }

  return {
    autoSizeAnswer,
    getAnswerMode,
    getAvailableCategories,
    getBaseProblemPool: makeBaseProblemPool,
    getCategorySummary,
    getQuestionCount,
    getQuestionSeconds,
    getSelectedCategories,
    getSelectedProblem,
    getSetupLanguage,
    getSetupMode,
    getSource,
    getType,
    handleAnswerKeydown,
    makeProblemPool,
    renderCategoryPicker,
    renderSetup,
    toggleCategory,
    updateAnswerFileMeta,
    updateAnswerMode,
    updatePdfMeta,
    updateSetupVisibility
  };
}
