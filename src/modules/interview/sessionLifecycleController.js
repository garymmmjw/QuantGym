import {
  buildInterviewSessionSnapshot,
  clearDurableInterview,
  copyDurableInterviewToSession,
  copySessionSnapshotToDurable,
  hasDurableInterview,
  readInterviewSessionSnapshot,
  writeInterviewSessionSnapshot
} from './session.js';
import { getInterviewTimeUpMessage } from './timer.js';

export function createInterviewSessionLifecycleController(deps = {}) {
  const windowRef = deps.windowRef || globalThis;
  const storageKey = deps.storageKey || "";
  const resumeStorageKey = deps.resumeStorageKey || "";
  const getInterviewState = deps.getInterviewState || (() => ({}));
  const getRuntimeState = deps.getRuntimeState || (() => ({}));

  function clearTimers() {
    deps.clearTimers?.();
  }

  function clearQuestionTimer() {
    deps.clearQuestionTimer?.();
  }

  function clearTypingTimers() {
    deps.clearTypingTimers?.();
  }

  function persistSnapshot() {
    const snapshot = buildInterviewSessionSnapshot({
      interviewLanguage: getInterviewState().language,
      interviewPanelExpandedIndex: getRuntimeState().panelExpandedIndex,
      interviewSession: getInterviewState().session,
      interviewMessages: getInterviewState().messages,
      summarizeAttachment: deps.summarizeAttachment
    });
    writeInterviewSessionSnapshot(storageKey, snapshot);
  }

  function hasDurable() {
    return hasDurableInterview(resumeStorageKey);
  }

  function clearDurable() {
    clearDurableInterview(resumeStorageKey);
  }

  function exit() {
    const interviewState = getInterviewState();
    if (!interviewState.session) return;
    const useZh = interviewState.language !== "en";
    const completed = Boolean(interviewState.session.completed);
    let keep = false;
    if (!completed) {
      keep = windowRef.confirm?.(useZh
        ? "保留这次面试进程？\n点击「确定」保留，下次回来可继续；点击「取消」放弃本次进程。"
        : "Keep this interview in progress?\nOK = save and resume later. Cancel = discard this session.") || false;
    }
    if (keep) {
      persistSnapshot();
      copySessionSnapshotToDurable(storageKey, resumeStorageKey);
    } else {
      clearDurable();
    }
    deps.resetInterview?.();
  }

  function resumeDurable() {
    const interviewState = getInterviewState();
    if (!copyDurableInterviewToSession(resumeStorageKey, storageKey)) return;
    interviewState.session = null;
    deps.setSnapshotRestored?.(false);
    restoreSnapshot();
    clearDurable();
    deps.updateStatus?.();
    deps.renderTranscript?.();
    deps.renderQuestionPanel?.();
  }

  function restoreSnapshot() {
    const interviewState = getInterviewState();
    deps.setSnapshotRestored?.(true);
    if (interviewState.session) return;
    const snapshot = readInterviewSessionSnapshot(storageKey);
    if (!snapshot) return;
    const snapshotLanguage = snapshot.interviewState?.language || snapshot.interviewLanguage;
    interviewState.language = snapshotLanguage === "en" ? "en" : "zh";
    deps.syncLanguageControls?.();
    getRuntimeState().panelExpandedIndex = Number.isFinite(Number(snapshot.interviewPanelExpandedIndex))
      ? Number(snapshot.interviewPanelExpandedIndex)
      : 0;
    interviewState.session = snapshot.session;
    interviewState.session.currentProblem = interviewState.session.currentIndex >= 0
      ? interviewState.session.questions?.[interviewState.session.currentIndex] || null
      : null;
    interviewState.messages = Array.isArray(snapshot.messages) ? snapshot.messages : [];
    resumeQuestionTimer();
  }

  function resumeQuestionTimer() {
    const interviewState = getInterviewState();
    if (!interviewState.session || interviewState.session.phase !== "running" || interviewState.session.completed || interviewState.session.awaitingNext) return;
    if (interviewState.session.currentIndex < 0 || interviewState.session.remainingSeconds <= 0) return;
    clearQuestionTimer();
    deps.setTimer?.(interviewState.session.remainingSeconds);
    deps.setQuestionTimer?.(windowRef.setInterval?.(() => {
      if (!interviewState.session || interviewState.session.completed) return;
      interviewState.session.remainingSeconds -= 1;
      deps.setTimer?.(interviewState.session.remainingSeconds);
      if (interviewState.session.remainingSeconds <= 0) {
        clearQuestionTimer();
        deps.appendMessage?.("coach", getInterviewTimeUpMessage({
          language: interviewState.language,
          live: Boolean(deps.isLive?.())
        }));
        deps.updateStatus?.("timeup");
      }
    }, 1000));
  }

  return {
    clearDurable,
    clearQuestionTimer,
    clearTimers,
    clearTypingTimers,
    exit,
    hasDurable,
    persistSnapshot,
    restoreSnapshot,
    resumeDurable,
    resumeQuestionTimer
  };
}
