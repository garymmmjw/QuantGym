import { makeId } from '../../lib/id.js';
import { interviewModeDefs } from './defs.js';

export function createInterviewOnboardingSession(options = {}) {
  const fallbackLanguage = options.fallbackLanguage === "en" ? "en" : "zh";
  const presetLanguage = options.language === "en"
    ? "en"
    : options.language === "zh"
      ? "zh"
      : fallbackLanguage;
  const presetMode = interviewModeDefs[options.mode] ? options.mode : "practice";
  const source = options.source === "pdf" ? "pdf" : "full";

  return {
    id: options.id || makeId(),
    phase: "onboarding",
    mode: presetMode,
    type: "technical",
    source,
    answerMode: "chat",
    sessionConfig: {
      language: presetLanguage,
      mode: presetMode,
      focusKey: "",
      focusTags: [],
      difficulty: "",
      questionCount: 0,
      durationMinutes: 0,
      persona: "",
      ttsEnabled: true,
      source
    },
    onboardingStep: "focus",
    questions: [],
    currentIndex: -1,
    currentProblem: null,
    awaitingNext: false,
    completed: false,
    questionResults: [],
    questionConversations: [],
    latestScoredIndex: -1,
    startedAt: options.startedAt || new Date().toISOString()
  };
}

export function createRunningInterviewSession(options = {}) {
  const baseSession = options.baseSession || {};
  const config = options.config || baseSession.sessionConfig || {};
  const source = options.source === "pdf" || config.source === "pdf" ? "pdf" : "full";

  return {
    id: options.id || baseSession.id || makeId(),
    phase: "running",
    mode: options.mode || config.mode || baseSession.mode || "practice",
    type: options.type || baseSession.type || "technical",
    source,
    answerMode: options.answerMode || "chat",
    sessionConfig: config,
    questionSeconds: options.questionSeconds ?? baseSession.questionSeconds,
    questions: Array.isArray(options.questions) ? options.questions : [],
    currentIndex: Number.isFinite(Number(options.currentIndex)) ? Number(options.currentIndex) : -1,
    currentProblem: options.currentProblem || null,
    awaitingNext: Boolean(options.awaitingNext),
    completed: Boolean(options.completed),
    answeredCurrent: Boolean(options.answeredCurrent),
    questionResults: Array.isArray(options.questionResults) ? options.questionResults : [],
    questionConversations: Array.isArray(options.questionConversations) ? options.questionConversations : [],
    latestScoredIndex: Number.isFinite(Number(options.latestScoredIndex)) ? Number(options.latestScoredIndex) : -1,
    startedAt: options.startedAt || baseSession.startedAt || new Date().toISOString()
  };
}

export function summarizeInterviewAttachment(attachment) {
  if (!attachment) return null;
  return {
    name: attachment.name || "",
    type: attachment.type || "",
    size: attachment.size || 0
  };
}

export function getSerializableInterviewTranscript(messages = []) {
  return (Array.isArray(messages) ? messages : [])
    .filter((message) => !message.thinking)
    .map((message) => ({
      role: message.role,
      text: String(message.text || message.displayText || "").slice(0, 6000),
      attachments: (message.attachments || []).map(summarizeInterviewAttachment).filter(Boolean)
    }));
}

const resolveKey = key => typeof key === 'function' ? key() : key;

export function loadInterviewHistory(storageKey) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(storageKey) || "[]");
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function saveInterviewHistoryEntry(storageKey, entry, options = {}) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return false;
  try {
    const history = loadInterviewHistory(storageKey);
    const raw = localStorage.getItem(storageKey);
    if (raw && !Array.isArray(JSON.parse(raw))) return false;
    const merged = [...history.filter(item => !entry.id || item.id !== entry.id), entry];
    const encoded = JSON.stringify(merged);
    localStorage.setItem(storageKey, encoded);
    return localStorage.getItem(storageKey) === encoded;
  } catch {
    return false;
  }
}

export function clearInterviewSessionSnapshot(storageKey) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return false;
  try {
    sessionStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}

export function buildInterviewSessionSnapshot(options = {}) {
  const {
    interviewLanguage = "zh",
    interviewPanelExpandedIndex = 0,
    interviewSession = null,
    interviewMessages = [],
    summarizeAttachment = () => null
  } = options;
  if (!interviewSession) return null;
  return {
    interviewLanguage,
    interviewPanelExpandedIndex,
    session: {
      ...interviewSession,
      currentProblem: null,
      submitting: false
    },
    messages: (Array.isArray(interviewMessages) ? interviewMessages : [])
      .filter((message) => !message.thinking)
      .map((message) => ({
        id: message.id,
        role: message.role,
        text: message.text,
        displayText: message.displayText || message.text,
        typing: false,
        thinking: false,
        actions: message.actions || [],
        actionStep: message.actionStep || "",
        variant: message.variant || "",
        attachments: (message.attachments || []).map(summarizeAttachment).filter(Boolean)
      }))
  };
}

export function writeInterviewSessionSnapshot(storageKey, snapshot) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return false;
  if (!snapshot) return false;
  try {
    const prior = sessionStorage.getItem(storageKey);
    if (prior) {
      const parsed = JSON.parse(prior);
      if (!parsed?.session || (snapshot.ownerId && parsed.ownerId !== snapshot.ownerId)) return false;
    }
    sessionStorage.setItem(storageKey, JSON.stringify(snapshot));
    return true;
  } catch {
    return false;
  }
}

export function readInterviewSessionSnapshot(storageKey) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return null;
  let raw = "";
  try {
    raw = sessionStorage.getItem(storageKey) || "";
  } catch {
    return null;
  }
  if (!raw) return null;
  try {
    const snapshot = JSON.parse(raw);
    if (!snapshot?.session) return null;
    return snapshot;
  } catch {
    return null;
  }
}

export function hasDurableInterview(storageKey) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return false;
  try {
    return Boolean(localStorage.getItem(storageKey));
  } catch {
    return false;
  }
}

export function clearDurableInterview(storageKey) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return false;
  try {
    localStorage.removeItem(storageKey);
  } catch {
    /* ignore */
  }
}

export function copySessionSnapshotToDurable(sessionStorageKey, durableStorageKey) {
  sessionStorageKey = resolveKey(sessionStorageKey);
  durableStorageKey = resolveKey(durableStorageKey);
  if (!sessionStorageKey || !durableStorageKey) return false;
  try {
    const snapshot = sessionStorage.getItem(sessionStorageKey);
    if (!snapshot) return false;
    localStorage.setItem(durableStorageKey, snapshot);
    return true;
  } catch {
    return false;
  }
}

export function copyDurableInterviewToSession(durableStorageKey, sessionStorageKey) {
  sessionStorageKey = resolveKey(sessionStorageKey);
  durableStorageKey = resolveKey(durableStorageKey);
  if (!sessionStorageKey || !durableStorageKey) return false;
  try {
    const snapshot = localStorage.getItem(durableStorageKey);
    if (!snapshot) return false;
    sessionStorage.setItem(sessionStorageKey, snapshot);
    return true;
  } catch {
    return false;
  }
}

export function writeDurableInterview(storageKey, snapshot) {
  storageKey = resolveKey(storageKey);
  if (!storageKey || !snapshot) return false;
  try {
    const prior = localStorage.getItem(storageKey);
    if (prior) {
      const parsed = JSON.parse(prior);
      if (!parsed?.session || (snapshot.ownerId && parsed.ownerId !== snapshot.ownerId)) return false;
    }
    const raw = JSON.stringify(snapshot);
    localStorage.setItem(storageKey, raw);
    return localStorage.getItem(storageKey) === raw;
  } catch { return false; }
}

export function readDurableInterview(storageKey) {
  storageKey = resolveKey(storageKey);
  if (!storageKey) return null;
  try {
    const value = JSON.parse(localStorage.getItem(storageKey) || 'null');
    return value?.session ? value : null;
  } catch { return null; }
}
