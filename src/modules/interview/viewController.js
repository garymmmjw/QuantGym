import {
  getInterviewActionPanelViewModel,
  renderInterviewActionPanel
} from './actionPanel.js';
import { renderInterviewFavorites } from './favorites.js';
import {
  animateInterviewScores,
  createInterviewDimensionMiniBars,
  createInterviewPanelStats,
  renderInterviewQuestionPanel
} from './panel.js';
import {
  appendInlineRichText,
  normalizeRichTextContent,
  renderRichText
} from './richText.js';
import { renderInterviewTranscript } from './transcript.js';
import { timestampOrZero } from '../../lib/date.js';

export function createInterviewViewController(deps = {}) {
  const elements = deps.elements || {};
  const focusDefs = deps.focusDefs || {};
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const getRuntimeState = deps.getRuntimeState || (() => ({}));
  const getUserState = deps.getUserState || (() => ({}));
  const getProblems = deps.getProblems || (() => []);
  const typeDefs = deps.typeDefs || {};
  const formatCategory = deps.formatCategory || ((category) => category || "");

  function getLanguage() {
    return getInterviewState().language === "en" ? "en" : "zh";
  }

  function useReactSession() {
    return getRuntimeState().reactSession !== false;
  }

  function scheduleMathTypeset(root) {
    deps.mathTypesetScheduler?.schedule(root);
  }

  function renderTranscript() {
    if (useReactSession()) return;
    renderInterviewTranscript(elements.interviewTranscript, getInterviewState().messages, {
      language: getLanguage(),
      isCurrentOnboardingStep: deps.isCurrentOnboardingStep,
      scheduleMathTypeset
    });
  }

  function renderRichTextNode(node, text) {
    renderRichText(node, text, {
      language: getLanguage()
    });
  }

  function appendInlineRichTextNode(node, text) {
    appendInlineRichText(node, text);
  }

  function updateLayout() {
    const showConsole = Boolean(getRuntimeState().preparing || getInterviewState().session);
    if (!useReactSession()) {
      elements.interviewSetup?.classList.toggle("hidden", showConsole);
      elements.interviewConsole?.classList.toggle("hidden", !showConsole);
      elements.interviewGrid?.classList.toggle("setup-only", !showConsole);
      elements.interviewGrid?.classList.toggle("session-only", showConsole);
    }
    deps.documentRef?.body?.classList.toggle("interview-immersive", showConsole);
    if (showConsole) {
      deps.documentRef?.body?.classList.add("sidebar-collapsed");
    } else {
      deps.applySidebarState?.();
    }
  }

  function renderQuestionPanel() {
    if (useReactSession()) return;
    const runtimeState = getRuntimeState();
    renderInterviewQuestionPanel(elements.interviewQuestionPanel, {
      session: getInterviewState().session,
      expandedIndex: runtimeState.panelExpandedIndex,
      language: getLanguage(),
      live: Boolean(deps.isLive?.()),
      focusDefs,
      formatCategory,
      appendInlineRichText: appendInlineRichTextNode,
      scheduleMathTypeset,
      refreshIcons: deps.refreshIcons,
      onExpandedChange(index) {
        runtimeState.panelExpandedIndex = index;
        renderQuestionPanel();
      }
    });
  }

  function createPanelStats(live = false) {
    return createInterviewPanelStats({
      session: getInterviewState().session,
      live,
      language: getLanguage(),
      focusDefs
    });
  }

  function createDimensionMiniBars(dimensions = {}) {
    return createInterviewDimensionMiniBars(dimensions, {
      language: getLanguage()
    });
  }

  function getFavorites() {
    const state = getUserState() || {};
    const legacy = Array.isArray(state.interviewFavorites) ? state.interviewFavorites : [];
    const problemFavorites = (state.problemStates || []).flatMap((item) => (
      Array.isArray(item.favorites) ? item.favorites : []
    ));
    const merge = deps.mergeRecordsById || ((...lists) => lists.flat().filter(Boolean));
    return merge(legacy, problemFavorites)
      .sort((a, b) => timestampOrZero(a.createdAt) - timestampOrZero(b.createdAt));
  }

  function renderFavorites() {
    if (useReactSession()) return;
    renderInterviewFavorites(elements.interviewFavoritesSummary, elements.interviewFavoritesList, getFavorites(), {
      formatCategory,
      formatDate: deps.formatDate
    });
  }

  function togglePanel() {
    const runtimeState = getRuntimeState();
    if (useReactSession()) {
      runtimeState.panelVisible = !runtimeState.panelVisible;
      return;
    }
    if (!elements.interviewConsole) return;
    const active = elements.interviewConsole.classList.toggle("show-panel");
    runtimeState.panelVisible = active;
    elements.toggleInterviewPanelBtn?.classList.toggle("is-active", active);
    elements.toggleInterviewPanelBtn?.setAttribute("aria-pressed", String(active));
    if (active) renderQuestionPanel();
  }

  function setPanelExpandedIndex(index) {
    const runtimeState = getRuntimeState();
    runtimeState.panelExpandedIndex = index;
    if (!useReactSession()) renderQuestionPanel();
  }

  function getTypeForCategory(category) {
    const normalizedCategory = deps.normalizeCategory?.(category) || category;
    const currentType = getRuntimeState().setupType || elements.interviewTypeSelect?.value || "";
    if (typeDefs[currentType]?.categories?.includes(normalizedCategory)) return currentType;
    const preferredTypes = ["technical", "oa", "behavioral"];
    return preferredTypes.find((type) => typeDefs[type]?.categories?.includes(normalizedCategory))
      || Object.keys(typeDefs).find((type) => typeDefs[type]?.categories?.includes(normalizedCategory))
      || currentType;
  }

  function updateActionPanel() {
    if (useReactSession()) return;
    if (!elements.interviewCompleteActions) return;
    const viewModel = getInterviewActionPanelViewModel({
      session: getInterviewState().session,
      onboarding: Boolean(deps.isOnboarding?.()),
      live: Boolean(deps.isLive?.()),
      language: getLanguage()
    });
    renderInterviewActionPanel(elements, viewModel);
  }

  function selectProblemForInterview(id) {
    const runtimeState = getRuntimeState();
    runtimeState.selectedProblemId = id;
    const problem = getProblems().find((item) => item.id === id);
    if (problem) {
      const category = deps.normalizeCategory?.(problem.category) || problem.category;
      runtimeState.selectedCategories = new Set([category]);
      const type = getTypeForCategory(category);
      if (type) {
        runtimeState.setupType = type;
        if (elements.interviewTypeSelect && elements.interviewTypeSelect.value !== type) {
          elements.interviewTypeSelect.value = type;
        }
      }
    }
    runtimeState.setupSource = "full";
    if (elements.interviewSourceSelect) elements.interviewSourceSelect.value = "full";
    deps.renderSetup?.();
    deps.resetInterview?.();
    deps.switchModule?.("interview");
  }

  return {
    animateScores: animateInterviewScores,
    appendInlineRichText: appendInlineRichTextNode,
    createDimensionMiniBars,
    createPanelStats,
    getFavorites,
    normalizeRichTextContent,
    renderFavorites,
    renderQuestionPanel,
    renderRichText: renderRichTextNode,
    renderTranscript,
    scheduleMathTypeset,
    selectProblemForInterview,
    togglePanel,
    setPanelExpandedIndex,
    updateActionPanel,
    updateLayout
  };
}
