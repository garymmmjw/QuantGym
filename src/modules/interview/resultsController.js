import { copyText } from '../../lib/clipboard.js';
import { flashButtonLabel } from '../../ui/domText.js';
import { launchInterviewConfetti } from './confetti.js';
import { buildInterviewFavorite } from './favorites.js';
import { buildInterviewReportHtml } from './format.js';
import {
  applyInterviewPracticeProblemState,
  buildInterviewPracticeRecord,
  buildInterviewPracticeSessionPatch
} from './practice.js';
import {
  buildCompletedInterviewHistoryEntry,
  buildInterviewCompletionReport
} from './report.js';
import {
  clearInterviewSessionSnapshot,
  loadInterviewHistory,
  saveInterviewHistoryEntry
} from './session.js';

export function createInterviewResultsController(deps = {}) {
  const elements = deps.elements || {};
  const windowRef = deps.windowRef || globalThis;
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const getUserState = deps.getUserState || (() => ({}));

  function getLanguage() {
    return getInterviewState().language === "en" ? "en" : "zh";
  }

  function saveFavorite() {
    const problem = deps.getSelectedProblem?.();
    const messages = deps.getCurrentQuestionMessages?.() || [];
    if (!problem || !messages.length) return;

    const favorite = buildInterviewFavorite({
      problem,
      messages,
      language: getLanguage(),
      makeId: deps.makeId,
      normalizeCategory: deps.normalizeCategory,
      parseEvaluation: deps.parseEvaluation
    });
    if (!favorite) return;

    deps.updateProblemState?.(problem.id, (current) => ({
      ...current,
      favorite: true,
      lastFavoriteAt: favorite.createdAt,
      favorites: [...(current.favorites || []), favorite].slice(-80)
    }));
    deps.saveState?.();
    deps.renderFavorites?.();
    flashButtonLabel(
      elements.saveInterviewFavoriteBtn,
      getLanguage() === "zh" ? "已收藏" : "Saved",
      getLanguage() === "zh" ? "总结到收藏夹" : "Save",
      { setTimeoutImpl: windowRef.setTimeout?.bind(windowRef) }
    );
  }

  async function shareQuestion() {
    const messages = deps.getCurrentQuestionMessages?.() || [];
    if (!messages.length) return;
    await copyText(deps.formatCurrentQuestionConversation?.(messages) || "");
    flashButtonLabel(
      elements.shareInterviewQuestionBtn,
      getLanguage() === "zh" ? "已复制" : "Copied",
      getLanguage() === "zh" ? "分享" : "Share",
      { setTimeoutImpl: windowRef.setTimeout?.bind(windowRef) }
    );
  }

  function recordPractice(problem, feedback = {}) {
    const userState = getUserState();
    const practice = buildInterviewPracticeRecord({
      problem,
      feedback,
      session: getInterviewState().session,
      skillKeys: Object.keys(deps.skillDefs || {}),
      normalizeCategory: deps.normalizeCategory,
      makeId: deps.makeId
    });
    userState.skills[practice.category] = Math.max(0, (userState.skills[practice.category] || 0) + practice.xpGain);
    userState.entries.push(practice.entry);
    deps.updateProblemState?.(problem.id, (current) => applyInterviewPracticeProblemState(current, practice));
    const sessionPatch = buildInterviewPracticeSessionPatch(getInterviewState().session, practice, feedback);
    if (sessionPatch) {
      getInterviewState().session.questionResults = sessionPatch.questionResults;
      getInterviewState().session.latestScoredIndex = sessionPatch.latestScoredIndex;
    }
    deps.saveState?.();
    deps.renderSummary?.();
    deps.renderModule?.("skills");
    deps.renderModule?.("memory");
    deps.renderProblems?.();
    deps.renderQuestionPanel?.();
  }

  function goToNextQuestion() {
    const session = getInterviewState().session;
    if (!session || !session.awaitingNext) return;
    deps.showQuestion?.(session.currentIndex + 1);
  }

  function complete() {
    const interviewState = getInterviewState();
    if (!interviewState.session || interviewState.session.completed) return;
    deps.clearQuestionTimer?.();
    interviewState.session.completed = true;
    interviewState.session.awaitingNext = false;
    deps.updateStatus?.("completed");
    const priorHistory = loadInterviewHistory(deps.historyStorageKey);
    const report = buildInterviewCompletionReport({
      session: interviewState.session,
      history: priorHistory,
      language: interviewState.language,
      formatCategory: deps.formatCategory
    });
    const historyEntry = buildCompletedInterviewHistoryEntry({
      session: interviewState.session,
      language: interviewState.language
    });
    if (historyEntry) {
      saveInterviewHistoryEntry(deps.historyStorageKey, historyEntry, { limit: 50 });
    }
    deps.appendMessage?.("coach", report, { variant: "report", typewriter: false });
    launchConfetti();
    clearInterviewSessionSnapshot(deps.sessionStorageKey);
    deps.renderQuestionPanel?.();
  }

  function exportReport() {
    const interviewState = getInterviewState();
    if (!interviewState.session) return;
    const reportText = buildInterviewCompletionReport({
      session: interviewState.session,
      history: loadInterviewHistory(deps.historyStorageKey),
      language: interviewState.language,
      formatCategory: deps.formatCategory
    });
    const win = windowRef.open?.("", "_blank");
    if (!win) {
      deps.appendMessage?.("system", getLanguage() === "zh"
        ? "无法打开导出窗口，请允许弹出窗口后重试。"
        : "Could not open the export window. Allow pop-ups and retry.");
      return;
    }
    win.document.write(buildReportHtml(reportText));
    win.document.close();
    win.focus();
    windowRef.setTimeout?.(() => {
      try {
        win.print();
      } catch {
        /* user can print manually */
      }
    }, 350);
  }

  function buildReportHtml(text) {
    return buildInterviewReportHtml(text, {
      language: getLanguage()
    });
  }

  function launchConfetti() {
    launchInterviewConfetti(elements.interviewTranscript, {
      setTimeoutImpl: windowRef.setTimeout?.bind(windowRef)
    });
  }

  function revealAnswer() {
    if (deps.isLive?.() || deps.isOnboarding?.()) {
      deps.appendMessage?.("system", getLanguage() === "zh"
        ? "真实面试模式中不会展示参考答案；结束报告会统一复盘。"
        : "Reference answers stay hidden in live mock mode; the final report will summarize the review.");
      return;
    }
    const problem = deps.getSelectedProblem?.();
    if (!problem) return;
    deps.appendMessage?.("system", [
      getLanguage() === "zh" ? "### 参考答案" : "### Reference answer",
      deps.getLocalizedProblemField?.(problem, "answer", getLanguage() === "en") || (getLanguage() === "zh" ? "未填写" : "Not provided"),
      "",
      getLanguage() === "zh" ? "### 解析" : "### Explanation",
      deps.getLocalizedProblemField?.(problem, "explanation", getLanguage() === "en") || (getLanguage() === "zh" ? "未填写" : "Not provided"),
      deps.getProblemMediaMarkdown?.(problem, "answer")
    ].filter(Boolean).join("\n"), { variant: "reference" });
  }

  return {
    buildReportHtml,
    complete,
    exportReport,
    goToNextQuestion,
    launchConfetti,
    recordPractice,
    revealAnswer,
    saveFavorite,
    shareQuestion
  };
}
