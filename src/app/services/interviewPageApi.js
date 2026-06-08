import { getInterviewActionPanelViewModel } from "../../modules/interview/actionPanel.js";
import { formatInterviewCategorySummary } from "../../modules/interview/setup.js";
import { getInterviewStatusViewModel } from "../../modules/interview/status.js";
import { formatInterviewTimer } from "../../modules/interview/timer.js";
import { getInterviewEmptyTranscriptText } from "../../modules/interview/transcript.js";
import { interviewModeDefs } from "../../modules/interview/defs.js";
import {
  getInterviewDimensionBarItems,
  getInterviewPanelStatsItems
} from "../../modules/interview/panel.js";
import { isCompactInterviewReply } from "../../modules/interview/format.js";

function buildTranscriptMessages(messages = [], options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const safeMessages = Array.isArray(messages) ? messages : [];
  const currentActionStep = options.currentOnboardingStep || "";
  const latestActionMessageId = currentActionStep
    ? [...safeMessages].reverse().find((message) => (
      Array.isArray(message.actions) && message.actions.length
    ))?.id || ""
    : "";
  if (!safeMessages.length) {
    return [{
      id: "empty",
      role: "system",
      text: getInterviewEmptyTranscriptText(language),
      displayText: getInterviewEmptyTranscriptText(language),
      grouped: false
    }];
  }

  let prevRole = null;
  return safeMessages.map((message) => {
    const grouped = message.role !== "user" && message.role === prevRole;
    prevRole = message.role;
    const text = message.displayText ?? message.text ?? "";
    const showActions = !message.actionStep
      || (currentActionStep && (
        message.actionStep === currentActionStep
        || options.isCurrentOnboardingStep?.(message.actionStep)
        || message.id === latestActionMessageId
      ));
    return {
      id: message.id || "",
      role: message.role || "system",
      text,
      displayText: text,
      typing: Boolean(message.typing),
      thinking: Boolean(message.thinking),
      grouped,
      compact: message.role === "user" && isCompactInterviewReply(text),
      variant: message.variant || "",
      attachments: message.attachments || [],
      actions: showActions ? (message.actions || []) : [],
      actionStep: message.actionStep || ""
    };
  });
}

function buildQuestionPanel(session, options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const useZh = language === "zh";
  const live = Boolean(options.live);
  const expandedIndex = Number.isFinite(Number(options.expandedIndex)) ? Number(options.expandedIndex) : 0;
  const formatCategory = options.formatCategory || ((category) => category || "");

  if (!session?.questions?.length) {
    return {
      empty: true,
      emptyText: useZh
        ? "完成 AI 配置后，这里会显示本轮进度。"
        : "After AI setup, this panel shows session progress.",
      title: "",
      progress: "",
      stats: [],
      items: []
    };
  }

  return {
    empty: false,
    live,
    title: live
      ? (useZh ? "真实面试进度" : "Live progress")
      : (useZh ? "训练面板" : "Practice panel"),
    progress: `${Math.max(0, session.currentIndex + 1)} / ${session.questions.length}`,
    stats: getInterviewPanelStatsItems({
      session,
      live,
      language,
      focusDefs: options.focusDefs || {}
    }),
    items: session.questions.map((problem, index) => {
      const result = session.questionResults?.[index] || null;
      const expanded = index === expandedIndex;
      const current = index === session.currentIndex;
      const titleText = useZh ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
      const promptText = useZh ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;
      let scoreText = "--";
      if (live) {
        scoreText = current ? (useZh ? "当前" : "Now") : result ? (useZh ? "完成" : "Done") : "--";
      } else if (result?.score != null) {
        scoreText = String(Math.round(result.score));
      }
      return {
        index,
        expanded,
        current,
        scored: result?.score != null && !live,
        wrapped: result?.status === "wrapped",
        title: `Q${index + 1}. ${titleText || (useZh ? "未命名题目" : "Untitled question")}`,
        meta: [formatCategory(problem.category), problem.difficulty || ""].filter(Boolean).join(" · "),
        prompt: promptText || (useZh ? "暂无题干。" : "No prompt."),
        scoreText,
        targetScore: result?.score != null && !live ? Math.round(result.score) : null,
        evaluation: result?.evaluation || "",
        dimensions: !live && result?.dimensions
          ? getInterviewDimensionBarItems(result.dimensions, { language })
          : []
      };
    })
  };
}

export function createInterviewPageApi(deps = {}) {
  function sync(options = {}) {
    const reactSetup = options.reactSetup !== false;
    const reactSession = options.reactSession !== false;
    if (deps.interviewRuntime?.state) {
      deps.interviewRuntime.state.reactSession = reactSession;
    }
    deps.rebindElements?.();
    deps.renderInterviewSetup?.({ reactSetup });
    if (reactSetup === false) {
      deps.renderInterviewCategoryPicker?.();
      deps.updateInterviewSetupVisibility?.();
    }
    deps.updateInterviewLayout?.();
    if (reactSession === false) {
      deps.renderInterviewTranscript?.();
      deps.renderInterviewFavorites?.();
      deps.renderInterviewQuestionPanel?.();
    }
    deps.updateInterviewAnswerMode?.();
    deps.refreshIcons?.();
  }

  function getViewModel() {
    const state = deps.interviewState || {};
    const runtime = deps.interviewRuntime?.state || {};
    const language = state.language === "en" ? "en" : "zh";
    const isEnglish = language === "en";
    const modeDefs = deps.interviewModeDefs || interviewModeDefs;
    const setupMode = modeDefs[runtime.setupMode] ? runtime.setupMode : "practice";
    const source = deps.getInterviewSource?.() === "pdf" ? "pdf" : "full";
    const selectedCategories = deps.getInterviewSelectedCategories?.() || ["all"];
    const availableCategories = deps.getInterviewAvailableCategories?.() || [];
    const formatCategory = deps.formatCategoryLabel || ((category) => category || "");
    const categorySummary = formatInterviewCategorySummary(selectedCategories, {
      language,
      formatCategory
    });
    const sourceLabel = source === "pdf"
      ? (isEnglish ? "PDF source" : "PDF 题源")
      : (isEnglish ? `Question bank · ${categorySummary}` : `题库抽题 · ${categorySummary}`);
    const summaryText = isEnglish
      ? `The AI interviewer configures practice / live through chat. ${sourceLabel}`
      : `AI 面试官会通过对话配置 practice / live。${sourceLabel}`;
    const selectedSet = new Set(selectedCategories);
    const showConsole = Boolean(runtime.preparing || state.session);
    const onboarding = Boolean(deps.isInterviewOnboarding?.());
    const live = Boolean(deps.isInterviewLiveMode?.());
    const session = state.session || null;
    const status = getInterviewStatusViewModel({
      session,
      status: runtime.uiStatus || "",
      language,
      typeDefs: deps.interviewTypeDefs || {},
      onboarding
    });
    const timerSeconds = Number.isFinite(Number(runtime.timerSeconds))
      ? runtime.timerSeconds
      : session?.remainingSeconds;
    const timerText = status.timerText != null
      ? status.timerText
      : (Number.isFinite(Number(timerSeconds)) ? formatInterviewTimer(timerSeconds) : "--:--");
    const favorites = (deps.getInterviewFavorites?.() || []).slice().reverse().slice(0, 6).map((favorite) => ({
      id: favorite.id || "",
      title: favorite.title || "Untitled",
      meta: [
        favorite.category ? formatCategory(favorite.category) : "",
        favorite.createdAt ? deps.formatDate?.(favorite.createdAt) || favorite.createdAt : ""
      ].filter(Boolean).join(" · "),
      summary: favorite.summary || ""
    }));

    return {
      phase: showConsole ? "session" : "setup",
      isEnglish,
      language,
      setup: {
        summaryText,
        source,
        showPdfRow: source === "pdf",
        showCategoryRow: source === "full",
        mode: setupMode,
        hasDurableSession: Boolean(deps.hasDurableInterview?.()),
        categories: ["all", ...availableCategories].map((key) => ({
          key,
          label: key === "all"
            ? (isEnglish ? "Random" : "随机")
            : formatCategory(key),
          active: key === "all" ? selectedSet.has("all") : selectedSet.has(key)
        }))
      },
      session: {
        showConsole,
        layout: {
          setupOnly: !showConsole,
          sessionOnly: showConsole,
          immersive: showConsole,
          showPanel: Boolean(runtime.panelVisible)
        },
        status: {
          title: status.title || "Ready",
          questionStatus: status.questionStatus || "",
          timerText
        },
        messages: buildTranscriptMessages(state.messages, {
          language,
          currentOnboardingStep: session?.onboardingStep || "",
          isCurrentOnboardingStep: deps.isCurrentOnboardingStep
        }),
        favorites: {
          summary: favorites.length
            ? `${favorites.length} 条复盘`
            : "保存高价值题目复盘。",
          items: favorites,
          emptyText: "完成一题后可以把要点收进这里。"
        },
        questionPanel: buildQuestionPanel(session, {
          language,
          live,
          expandedIndex: runtime.panelExpandedIndex,
          formatCategory,
          focusDefs: deps.interviewFocusDefs || {}
        }),
        actionPanel: getInterviewActionPanelViewModel({
          session,
          onboarding,
          live,
          language
        }),
        renderRichText: deps.renderRichText,
        appendInlineRichText: deps.appendInlineRichText
      }
    };
  }

  return {
    sync,
    getViewModel,
    selectLanguage: (value) => {
      if (deps.interviewState) deps.interviewState.language = value === "en" ? "en" : "zh";
      sync();
    },
    selectMode: (value) => {
      const runtime = deps.interviewRuntime?.state;
      const modeDefs = deps.interviewModeDefs || interviewModeDefs;
      if (runtime) runtime.setupMode = modeDefs[value] ? value : "practice";
      sync();
    },
    handleSetupChange: (field) => {
      if (field === "type" || field === "source") {
        deps.interviewRuntime?.state && (deps.interviewRuntime.state.selectedCategories = new Set(["all"]));
      }
      sync();
      if (field === "type" || field === "source") deps.resetInterview?.({ keepSetup: true });
    },
    toggleCategory: (value) => { deps.toggleInterviewCategory?.(value); sync(); },
    setPanelExpandedIndex: (index) => { deps.setInterviewPanelExpandedIndex?.(index); sync(); },
    updatePdfMeta: (event) => { deps.updateInterviewPdfMeta?.(event); sync(); },
    updateAnswerFileMeta: (event) => { deps.updateInterviewAnswerFileMeta?.(event); sync(); },
    autoSizeAnswer: () => deps.autoSizeInterviewAnswer?.(),
    handleAnswerKeydown: (event) => deps.handleInterviewAnswerKeydown?.(event),
    handleTranscriptAction: (event) => { deps.handleInterviewTranscriptAction?.(event); sync(); },
    handleTranscriptActionValue: async (value) => {
      if (!value) return;
      await deps.handleOnboardingAnswer?.(value);
      sync();
    },
    saveLlmConfig: () => deps.saveLlmConfig?.(),
    start: () => { deps.startInterview?.(); sync(); },
    requestHint: async () => { await deps.requestInterviewHint?.(); sync(); },
    revealAnswer: () => { deps.revealInterviewAnswer?.(); sync(); },
    nextQuestion: () => { deps.goToNextInterviewQuestion?.(); sync(); },
    saveFavorite: () => { deps.saveCurrentInterviewFavorite?.(); sync(); },
    shareQuestion: () => deps.shareCurrentInterviewQuestion?.(),
    restart: () => { deps.restartInterviewWithSameConfig?.(); sync(); },
    exportReport: () => deps.exportInterviewReport?.(),
    togglePanel: () => { deps.toggleInterviewPanel?.(); sync(); },
    exit: () => { deps.exitInterview?.(); sync(); },
    resume: () => { deps.resumeDurableInterview?.(); sync(); },
    toggleVoice: () => deps.toggleVoiceAnswer?.(),
    clear: () => { deps.resetInterview?.(); sync(); },
    submitAnswer: async () => { await deps.submitInterviewAnswer?.(); sync(); },
    getState: () => deps.interviewState
  };
}
