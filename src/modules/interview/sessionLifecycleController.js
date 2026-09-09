import {
  buildInterviewSessionSnapshot,
  clearDurableInterview,
  readInterviewSessionSnapshot,
  readDurableInterview,
  writeDurableInterview,
  writeInterviewSessionSnapshot
} from './session.js';
import { ownedStorageKey, rememberLocalRecovery, clearLocalRecovery } from '../../state/localRecovery.js';
import { archiveInterviewSnapshot } from './legacyRecovery.js';
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

  let ownerId = String(deps.getOwnerId?.() || '');
  const memory = new Map();
  const sessionKey = owner => ownedStorageKey(storageKey, owner);
  const durableKey = owner => ownedStorageKey(resumeStorageKey, owner);

  function capture(owner = ownerId) {
    if (!owner) return null;
    const snapshot = buildInterviewSessionSnapshot({
      interviewLanguage: getInterviewState().language,
      interviewPanelExpandedIndex: getRuntimeState().panelExpandedIndex,
      interviewSession: getInterviewState().session,
      interviewMessages: getInterviewState().messages,
      summarizeAttachment: deps.summarizeAttachment
    });
    if (!snapshot) return null;
    snapshot.ownerId = owner;
    snapshot.answerDraft = String(deps.getAnswerDraft?.() ?? getInterviewState().answerDraft ?? '');
    snapshot.savedAt = new Date().toISOString();
    return snapshot;
  }

  function saveSnapshot(owner, snapshot) {
    if (!snapshot || !owner) return false;
    memory.set(owner, snapshot);
    writeInterviewSessionSnapshot(sessionKey(owner), snapshot);
    const saved = writeDurableInterview(durableKey(owner), snapshot);
    if (saved) clearLocalRecovery(owner, 'interview-draft');
    else rememberLocalRecovery(owner, 'interview-draft', { backup: snapshot, retry: () => {
      if (String(deps.getOwnerId?.() || '') !== owner) return false;
      return persistSnapshot();
    } });
    return saved;
  }

  function syncOwner() {
    const nextOwner = String(deps.getOwnerId?.() || '');
    if (nextOwner === ownerId) return false;
    const old = capture();
    if (old) saveSnapshot(ownerId, old);
    clearTimers();
    deps.stopSpeech?.();
    const state = getInterviewState();
    state.session = null;
    state.messages = [];
    state.answerDraft = '';
    deps.setAnswerDraft?.('');
    deps.resetSessionUiState?.();
    deps.setSnapshotRestored?.(false);
    ownerId = nextOwner;
    return true;
  }

  function persistSnapshot() {
    if (syncOwner()) return false;
    return saveSnapshot(ownerId, capture());
  }

  function hasDurable() {
    syncOwner();
    const snapshot = memory.get(ownerId) || readDurableInterview(durableKey(ownerId));
    return Boolean(ownerId && snapshot?.ownerId === ownerId && snapshot.session);
  }

  function clearDurable() {
    syncOwner();
    clearDurableInterview(durableKey(ownerId));
    memory.delete(ownerId);
    clearLocalRecovery(ownerId, 'interview-draft');
  }

  function exit() {
    if (syncOwner()) return false;
    const interviewState = getInterviewState();
    if (!interviewState.session) return false;
    if (interviewState.session.historyPending) return false;
    const useZh = interviewState.language !== 'en';
    const keep = !interviewState.session.completed && Boolean(windowRef.confirm?.(useZh
      ? '保留这次面试进程？\n点击「确定」保留，下次回来可继续；点击「取消」放弃本次进程。'
      : 'Keep this interview in progress?\nOK = save and resume later. Cancel = discard this session.'));
    if (keep && !persistSnapshot()) return false;
    if (!keep) clearDurable();
    deps.resetInterview?.({ preserveSnapshot: keep, discard: !keep });
    return true;
  }

  function applySnapshot(snapshot) {
    if (!ownerId || snapshot?.ownerId !== ownerId || !snapshot.session) return false;
    const interviewState = getInterviewState();
    interviewState.language = snapshot.interviewLanguage === 'en' ? 'en' : 'zh';
    deps.syncLanguageControls?.();
    getRuntimeState().panelExpandedIndex = Number(snapshot.interviewPanelExpandedIndex) || 0;
    // Cloning keeps old account recovery data out of future mutable sessions.
    interviewState.session = JSON.parse(JSON.stringify(snapshot.session));
    interviewState.session.currentProblem = interviewState.session.currentIndex >= 0
      ? interviewState.session.questions?.[interviewState.session.currentIndex] || null : null;
    interviewState.messages = JSON.parse(JSON.stringify(snapshot.messages || []));
    interviewState.answerDraft = String(snapshot.answerDraft || '');
    deps.setAnswerDraft?.(interviewState.answerDraft);
    if (interviewState.session.historyPending) deps.retryPendingHistory?.();
    resumeQuestionTimer();
    return true;
  }

  function resumeDurable() {
    syncOwner();
    const snapshot = memory.get(ownerId) || readDurableInterview(durableKey(ownerId));
    if (!applySnapshot(snapshot)) return false;
    deps.setSnapshotRestored?.(true);
    // Keep the durable original; restoring never removes the only good copy.
    writeInterviewSessionSnapshot(sessionKey(ownerId), snapshot);
    deps.updateStatus?.();
    deps.renderTranscript?.();
    deps.renderQuestionPanel?.();
    return true;
  }

  function restoreSnapshot() {
    syncOwner();
    deps.setSnapshotRestored?.(true);
    if (getInterviewState().session) return true;
    const snapshot = memory.get(ownerId) || readDurableInterview(durableKey(ownerId)) || readInterviewSessionSnapshot(sessionKey(ownerId));
    return applySnapshot(snapshot);
  }

  function openRecovered(snapshot) {
    syncOwner();
    if (!ownerId || snapshot?.ownerId !== ownerId) return false;
    const current = capture();
    if (current && !archiveInterviewSnapshot(ownerId, current)) {
      saveSnapshot(ownerId, current);
      return false;
    }
    clearTimers();
    deps.stopSpeech?.();
    if (!applySnapshot(snapshot)) return false;
    persistSnapshot();
    deps.setSnapshotRestored?.(true);
    deps.updateStatus?.();
    return true;
  }

  const unsubscribeOwner = deps.subscribeOwner?.(syncOwner);
  const saveBeforeLeave = () => { if (getInterviewState().session) persistSnapshot(); };
  windowRef.addEventListener?.('pagehide', saveBeforeLeave);

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
    syncOwner,
    openRecovered,
    capture,
    dispose() { unsubscribeOwner?.(); windowRef.removeEventListener?.('pagehide', saveBeforeLeave); clearTimers(); },
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
