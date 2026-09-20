import { patternCellKey, validatePatternCell } from "./mental/patternQuestions.js";
import { validatePracticeSession, mergePracticeSessions, withPracticeActivities } from "./practice/practiceModel.js";
import { validateTrackerOperations, mergeTrackerOperations } from "../tracker/trackerSyncModel.js";
import { isExplicitCompletionActivity, validateExplicitCompletionActivity, retainExplicitCompletionActivities } from './completionActivities.js';

export const PERSONAL_VERSION = 1;
const PREFIX = "quantgym.personal-prep.v1:";
const ARRAY_FIELDS = ["trials", "dailySessions", "activities"];
const OPERATIONS = ["add", "subtract", "multiply", "divide"];
const DAILY_KINDS = ["tech", "coding", "behavioral"];
const REASONING_KINDS = ["sequence", "pattern"];
const DIFFICULTIES = ["easy", "medium", "hard"];
const trainerOf = (trial) => trial?.settings?.trainer || "math";
const object = (value) => Boolean(value) && typeof value === "object" && !Array.isArray(value);
const id = (value) => typeof value === "string" && value.trim().length > 0;
const timestamp = (value) => typeof value === "string" && value.length > 0 && Number.isFinite(Date.parse(value));
const integer = (value, min = 0, max = Number.MAX_SAFE_INTEGER) => Number.isSafeInteger(value) && value >= min && value <= max;
const finite = (value, min = 0) => typeof value === "number" && Number.isFinite(value) && value >= min;
function requireData(condition, label) {
  if (!condition) throw new Error(`Invalid ${label} in training backup.`);
}
function optionalStrings(value, fields) {
  return fields.every((field) => value[field] == null || typeof value[field] === "string");
}

function validateMentalSettings(settings) {
  requireData(object(settings) && (settings.trainer == null || settings.trainer === "math")
    && integer(settings.durationSeconds, 10, 3600) && Array.isArray(settings.operations)
    && settings.operations.length > 0 && settings.operations.every((operation) => OPERATIONS.includes(operation)) && object(settings.ranges), "mental settings");
  for (const operation of settings.operations) {
    const range = settings.ranges[operation];
    requireData(object(range) && ["minA", "maxA", "minB", "maxB"].every((key) => integer(range[key], 0, 9999))
      && range.minA <= range.maxA && range.minB <= range.maxB && (operation !== "divide" || range.minA >= 1), "mental range");
  }
}

function validateMentalQuestion(question, active = false) {
  requireData(object(question) && id(question.id) && integer(question.index, 1) && OPERATIONS.includes(question.operator)
    && [question.a, question.b, question.answer].every((value) => typeof value === "number" && Number.isFinite(value))
    && timestamp(question.startedAt) && Array.isArray(question.mistakes), "mental question");
  requireData(question.mistakes.every((mistake) => object(mistake) && typeof mistake.value === "string"
    && timestamp(mistake.submittedAt) && finite(mistake.elapsedMs)), "mental mistakes");
  if (!active) requireData(timestamp(question.completedAt) && finite(question.elapsedMs)
    && ["correct", "skipped", "timeout", "aborted"].includes(question.outcome), "completed mental question");
}

function validateReasoningSettings(settings) {
  requireData(object(settings) && REASONING_KINDS.includes(settings.trainer)
    && integer(settings.durationSeconds, 10, 3600) && DIFFICULTIES.includes(settings.difficulty)
    && (settings.trainer === "sequence" ? ["numbers", "letters", "mixed"].includes(settings.sequenceType)
      : settings.sequenceType == null), "reasoning settings");
}

function validateReasoningQuestion(question, settings, active = false) {
  requireData(object(question) && id(question.id) && integer(question.index, 1)
    && question.kind === settings.trainer && id(question.family) && question.difficulty === settings.difficulty
    && id(question.answer) && typeof question.explanation === "string" && typeof question.explanationEn === "string"
    && timestamp(question.startedAt) && (question.submittedAnswer == null || typeof question.submittedAnswer === "string")
    && Array.isArray(question.mistakes) && question.mistakes.every((mistake) => object(mistake)
      && typeof mistake.value === "string" && timestamp(mistake.submittedAt) && finite(mistake.elapsedMs)), "reasoning question");
  if (settings.trainer === "sequence") {
    requireData(Array.isArray(question.tokens) && question.tokens.length >= 2 && question.tokens.length <= 64
      && Array.from(question.tokens).every((token) => typeof token === "string" && token.length > 0), "sequence tokens");
  } else {
    requireData(Array.isArray(question.grid) && question.grid.length === 9 && question.grid[8] === null
      && Array.isArray(question.options) && question.options.length === 6
      && Array.from(question.options).every((option, index) => object(option) && option.id === "ABCDEF"[index])
      && question.options.some((option) => option.id === question.answer), "pattern question");
    try {
      Array.from(question.grid.slice(0, 8)).forEach(validatePatternCell);
      question.options.forEach((option) => validatePatternCell(option.cell));
      requireData(new Set(question.options.map((option) => patternCellKey(option.cell))).size === 6, "pattern choices");
    } catch {
      requireData(false, "pattern cells");
    }
  }
  if (active) {
    requireData(question.completedAt == null && question.elapsedMs == null && question.outcome == null
      && question.submittedAnswer == null, "active reasoning question");
  } else {
    requireData(timestamp(question.completedAt) && finite(question.elapsedMs)
      && ["correct", "wrong", "skipped", "timeout", "aborted"].includes(question.outcome), "completed reasoning question");
  }
}

function validateTrial(trial, active = false) {
  requireData(object(trial) && id(trial.id) && (active ? trial.status === "active" : ["completed", "aborted"].includes(trial.status))
    && timestamp(trial.startedAt) && timestamp(trial.deadlineAt) && Date.parse(trial.deadlineAt) >= Date.parse(trial.startedAt)
    && integer(trial.correct) && Array.isArray(trial.questions), "trial");
  const reasoning = REASONING_KINDS.includes(trainerOf(trial));
  if (reasoning) {
    validateReasoningSettings(trial.settings);
    requireData(trial.dailySessionId == null, "reasoning daily reference");
    for (const [index, question] of trial.questions.entries()) {
      validateReasoningQuestion(question, trial.settings);
      requireData(question.index === index + 1, "reasoning question order");
    }
    requireData(new Set(trial.questions.map((question) => question.id)).size === trial.questions.length, "reasoning question ids");
  } else {
    validateMentalSettings(trial.settings);
    trial.questions.forEach((question) => validateMentalQuestion(question));
  }
  requireData(trial.correct === trial.questions.filter((question) => question.outcome === "correct").length, "trial score");
  requireData(optionalStrings(trial, ["dailySessionId", "settingsKey"]), "trial references");
  if (active) {
    if (!reasoning) validateMentalQuestion(trial.currentQuestion, true);
    else if (trial.currentQuestion == null) {
      requireData(id(trial.feedbackQuestionId) && trial.questions.at(-1)?.id === trial.feedbackQuestionId,
        "reasoning feedback reference");
    } else {
      validateReasoningQuestion(trial.currentQuestion, trial.settings, true);
      requireData(trial.feedbackQuestionId == null && trial.currentQuestion.index === trial.questions.length + 1
        && !trial.questions.some((question) => question.id === trial.currentQuestion.id), "active reasoning question order");
    }
    requireData(typeof trial.currentAnswer === "string", "active answer");
  } else {
    requireData(timestamp(trial.completedAt), "trial completion time");
    if (reasoning) requireData(trial.currentQuestion == null && trial.currentAnswer === "", "finished reasoning trial");
  }
}

function validateDailySettings(settings) {
  requireData(object(settings) && typeof settings.mentalEnabled === "boolean" && integer(settings.mentalSeconds, 30, 600)
    && ["library", "practice"].includes(settings.techSource)
    && DAILY_KINDS.every((kind) => integer(settings[`${kind}Count`], 0, 8) && integer(settings[`${kind}Minutes`], 1, 120)), "daily settings");
}

function validateDailySession(session) {
  requireData(object(session) && id(session.id) && ["active", "completed"].includes(session.status)
    && timestamp(session.startedAt) && /^\d{4}-\d{2}-\d{2}$/.test(session.dateKey) && timestamp(session.dateKey)
    && Array.isArray(session.questions) && object(session.answers), "daily session");
  validateDailySettings(session.settings);
  const questions = new Set();
  for (const question of session.questions) {
    requireData(object(question) && id(question.id) && !questions.has(question.id) && DAILY_KINDS.includes(question.kind)
      && typeof question.title === "string" && typeof question.prompt === "string" && finite(question.budgetSeconds, 1)
      && optionalStrings(question, ["titleEn", "promptEn", "reference", "referenceEn", "complexity", "source", "sourceLabel", "sourceUrl"]), "daily question");
    requireData(question.examples == null || (Array.isArray(question.examples) && question.examples.every((example) => object(example)
      && typeof example.input === "string" && typeof example.output === "string")), "coding examples");
    requireData(question.constraints == null || (Array.isArray(question.constraints) && question.constraints.every((entry) => typeof entry === "string")), "coding constraints");
    requireData(question.solutions == null || (object(question.solutions) && Object.values(question.solutions).every((entry) => typeof entry === "string")), "coding solutions");
    questions.add(question.id);
  }
  for (const [questionId, answer] of Object.entries(session.answers)) {
    requireData(questions.has(questionId) && object(answer) && optionalStrings(answer, ["text", "codeLanguage", "selfAssessment"])
      && (answer.elapsedSeconds == null || finite(answer.elapsedSeconds)) && (answer.timerStartedAt == null || timestamp(answer.timerStartedAt))
      && (answer.reviewed == null || typeof answer.reviewed === "boolean"), "daily answer");
    if (answer.completedAt != null) requireData(timestamp(answer.completedAt) && typeof answer.text === "string" && answer.text.trim()
      && ["independent", "with-help", "review"].includes(answer.selfAssessment), "completed daily answer");
  }
  requireData(session.mentalCompletedAt == null || (timestamp(session.mentalCompletedAt) && id(session.mentalTrialId)), "daily mental completion");
  if (session.status === "completed") requireData(timestamp(session.completedAt) && session.questions.every((question) => timestamp(session.answers[question.id]?.completedAt))
    && (!session.settings.mentalEnabled || timestamp(session.mentalCompletedAt)), "daily completion");
}

function validateActivity(activity) {
  requireData(object(activity) && id(activity.id) && ["quant", "mental", ...REASONING_KINDS, ...DAILY_KINDS, "daily", "experience-read"].includes(activity.kind)
    && integer(activity.count) && timestamp(activity.completedAt)
    && optionalStrings(activity, ["source", "note", "title", "titleEn", "status", "trialId", "dailySessionId", "sessionId", "questionId", "problemId"]), "activity");
  if (activity.kind === 'experience-read' || isExplicitCompletionActivity(activity)) validateExplicitCompletionActivity(activity);
}

function mergeDailySession(current, incoming) {
  requireData(JSON.stringify(current.questions.map((question) => [question.id, question.kind, question.prompt]))
    === JSON.stringify(incoming.questions.map((question) => [question.id, question.kind, question.prompt])), "conflicting daily questions");
  const answers = {};
  for (const question of current.questions) {
    const local = current.answers[question.id];
    const restored = incoming.answers[question.id];
    if (!local && !restored) continue;
    answers[question.id] = local?.completedAt ? local : restored?.completedAt ? restored : { ...restored, ...local };
  }
  const merged = { ...incoming, ...current, answers,
    mentalCompletedAt: current.mentalCompletedAt || incoming.mentalCompletedAt,
    mentalTrialId: current.mentalCompletedAt ? current.mentalTrialId : incoming.mentalTrialId || current.mentalTrialId };
  const complete = merged.questions.every((question) => answers[question.id]?.completedAt)
    && (!merged.settings.mentalEnabled || merged.mentalCompletedAt);
  if (complete) {
    const times = [...Object.values(answers).map((answer) => answer.completedAt), merged.mentalCompletedAt].filter(timestamp);
    merged.status = "completed";
    merged.completedAt = current.completedAt || incoming.completedAt || times.sort((a, b) => Date.parse(a) - Date.parse(b)).at(-1);
  }
  return merged;
}

function preferTrialProgress(current, incoming) {
  requireData(trainerOf(current) === trainerOf(incoming), "conflicting trial modules");
  // Pick one coherent snapshot; never splice independently generated question paths.
  // Correct answers and resolved questions only grow as a real trial progresses.
  const progress = (trial) => [trial.correct,
    trial.questions.filter((question) => ["correct", "wrong", "skipped"].includes(question.outcome)).length,
    trial.status === "completed" ? 2 : trial.status === "aborted" ? 1 : 0,
    REASONING_KINDS.includes(trainerOf(trial)) ? trial.currentQuestion?.index || trial.questions.at(-1)?.index || 0 : 0];
  const localProgress = progress(current);
  const remoteProgress = progress(incoming);
  for (let index = 0; index < localProgress.length; index += 1) {
    if (localProgress[index] !== remoteProgress[index]) return localProgress[index] > remoteProgress[index] ? current : incoming;
  }
  return current;
}

function hasTrialWork(trial) {
  return Boolean(trial.currentAnswer) || Boolean(trial.currentQuestion?.mistakes?.length)
    || trial.questions.some((question) => ["correct", "wrong", "skipped"].includes(question.outcome) || question.mistakes?.length);
}

export function createPersonalState() {
  return { mentalSettings: null, activeTrial: null, trials: [], dailySettings: null, dailySessions: [], activities: [], removedActivityIds: [], practiceSessions: [], behavioralAnswers: [], careerTrackerOperations: [] };
}

export function personalStorageKey(ownerId) {
  if (!ownerId || typeof ownerId !== "string") throw new Error("Personal training requires an account.");
  return `${PREFIX}${encodeURIComponent(ownerId)}`;
}

export function validatePersonalData(data) {
  if (!data || typeof data !== "object" || Array.isArray(data)) throw new Error("Invalid training backup.");
  for (const key of ARRAY_FIELDS) {
    if (!Array.isArray(data[key]) || data[key].some((row) => !object(row) || !id(row.id))) {
      throw new Error(`Invalid ${key} in training backup.`);
    }
    if (new Set(data[key].map((row) => row.id)).size !== data[key].length) throw new Error(`Duplicate ${key} in training backup.`);
  }
  data.trials.forEach((trial) => validateTrial(trial));
  data.dailySessions.forEach(validateDailySession);
  data.activities.forEach(validateActivity);
  const practiceSessions = data.practiceSessions === undefined ? [] : data.practiceSessions;
  requireData(Array.isArray(practiceSessions) && practiceSessions.length <= 100000
    && new Set(practiceSessions.map(session => session?.id)).size === practiceSessions.length, "practice sessions");
  practiceSessions.forEach(validatePracticeSession);
  if (data.activeTrial != null) validateTrial(data.activeTrial, true);
  if (data.mentalSettings != null) validateMentalSettings(data.mentalSettings);
  if (data.dailySettings != null) validateDailySettings(data.dailySettings);
  const removedActivityIds = data.removedActivityIds === undefined ? [] : data.removedActivityIds;
  requireData(Array.isArray(removedActivityIds) && removedActivityIds.every(id), "removed activity ids");
  const behavioralAnswers = data.behavioralAnswers === undefined ? [] : data.behavioralAnswers;
  requireData(Array.isArray(behavioralAnswers) && behavioralAnswers.length <= 10000
    && behavioralAnswers.every(answer => object(answer) && id(answer.id) && answer.id.length <= 512
      && typeof answer.text === "string" && answer.text.length <= 20000 && timestamp(answer.updatedAt))
    && new Set(behavioralAnswers.map(answer => answer.id)).size === behavioralAnswers.length, "behavioral answers");
  const careerTrackerOperations = validateTrackerOperations(data.careerTrackerOperations === undefined ? [] : data.careerTrackerOperations);
  return { ...createPersonalState(), ...data, practiceSessions, behavioralAnswers, careerTrackerOperations, removedActivityIds: [...new Set(removedActivityIds)] };
}

/** Merge valid backups or cloud snapshots without reviving terminal work or deleted entries. */
export function mergePersonalData(currentValue, incomingValue) {
  const current = validatePersonalData(currentValue);
  const incoming = validatePersonalData(incomingValue);
  const next = { ...current };
  next.careerTrackerOperations = mergeTrackerOperations(current.careerTrackerOperations, incoming.careerTrackerOperations);
  const answers = new Map(incoming.behavioralAnswers.map(answer => [answer.id, answer]));
  for (const answer of current.behavioralAnswers) {
    const other = answers.get(answer.id);
    // An explicitly cleared answer is still a revision; never revive an older draft.
    if (!other || Date.parse(answer.updatedAt) > Date.parse(other.updatedAt)
      || (Date.parse(answer.updatedAt) === Date.parse(other.updatedAt) && answer.text >= other.text)) answers.set(answer.id, answer);
  }
  next.behavioralAnswers = [...answers.values()].sort((a, b) => a.id.localeCompare(b.id));
  for (const field of ARRAY_FIELDS) {
    const byId = new Map(incoming[field].map((row) => [row.id, row]));
    for (const row of current[field]) {
      const other = byId.get(row.id);
      byId.set(row.id, other && field === "dailySessions" ? mergeDailySession(row, other)
        : other && field === "trials" ? preferTrialProgress(row, other) : row);
    }
    next[field] = [...byId.values()];
  }
  next.activities = retainExplicitCompletionActivities(next, current, incoming).activities;
  next.removedActivityIds = [...new Set([...current.removedActivityIds, ...incoming.removedActivityIds])].sort();
  next.practiceSessions = mergePracticeSessions(current.practiceSessions, incoming.practiceSessions);
  next.activities = withPracticeActivities(next).activities;
  const cancelledPreparations = new Set(next.removedActivityIds.filter((value) => value.startsWith("cancel-preparation:"))
    .map((value) => value.slice("cancel-preparation:".length)));
  const finishedIds = new Set(next.trials.map((trial) => trial.id));
  for (const trial of [current.activeTrial, incoming.activeTrial].filter(Boolean)) {
    const finished = next.trials.find((entry) => entry.id === trial.id);
    if (finished) requireData(trainerOf(finished) === trainerOf(trial), "conflicting trial modules");
  }
  const active = [current.activeTrial, incoming.activeTrial].filter((trial) => trial && !finishedIds.has(trial.id)
    && !(cancelledPreparations.has(trial.id) && !hasTrialWork(trial)));
  if (active.length === 2 && active[0].id !== active[1].id
    && active.some((trial) => REASONING_KINDS.includes(trainerOf(trial)))) {
    throw new Error("另一个试次尚未结束。请先完成当前试次，再同步另一个试次。Finish the current trial before syncing another active trial.");
  }
  next.activeTrial = active.length === 2 && active[0].id === active[1].id ? preferTrialProgress(active[0], active[1]) : active[0] || null;
  for (const trial of next.trials) {
    const kind = trainerOf(trial) === "math" ? "mental" : trainerOf(trial);
    const activityId = `${kind}:${trial.id}`;
    const index = next.activities.findIndex((activity) => activity.id === activityId);
    const activity = { ...(index < 0 ? {} : next.activities[index]), id: activityId, kind, count: trial.correct,
      completedAt: trial.completedAt, trialId: trial.id, dailySessionId: trial.dailySessionId };
    if (index < 0) next.activities.push(activity);
    else next.activities[index] = activity;
  }
  for (const session of next.dailySessions) {
    if (session.status !== "completed" || next.activities.some((activity) => activity.id === `daily:${session.id}:complete`)) continue;
    next.activities.push({ id: `daily:${session.id}:complete`, kind: "daily", count: 1, completedAt: session.completedAt, sessionId: session.id });
  }
  const removedIds = new Set(next.removedActivityIds);
  next.activities = next.activities.filter((activity) => !removedIds.has(activity.id));
  next.mentalSettings = current.mentalSettings || incoming.mentalSettings;
  next.dailySettings = current.dailySettings || incoming.dailySettings;
  next.trials.sort((a, b) => Date.parse(b.startedAt) - Date.parse(a.startedAt) || a.id.localeCompare(b.id));
  next.dailySessions.sort((a, b) => Date.parse(a.startedAt) - Date.parse(b.startedAt) || a.id.localeCompare(b.id));
  next.activities.sort((a, b) => Date.parse(a.completedAt) - Date.parse(b.completedAt) || a.id.localeCompare(b.id));
  return validatePersonalData(next);
}

function parseEnvelope(raw, ownerId) {
  const value = JSON.parse(raw);
  if (value.version !== PERSONAL_VERSION || value.ownerId !== ownerId) throw new Error("Training data belongs to a different account or version.");
  return { ...value, data: validatePersonalData(value.data) };
}

// This store is deliberately separate from the legacy shared community/cloud snapshot.
// A failed write retains the live state and the last durable copy, with an explicit error.
export function createPersonalStore({ ownerId, storage, eventTarget, now = () => new Date().toISOString() }) {
  const key = personalStorageKey(ownerId);
  const listeners = new Set();
  let persistedRaw = null;
  let blockedRead = false;
  let snapshot = { data: createPersonalState(), error: "", dirty: false, conflict: false };

  function emit(next) {
    snapshot = next;
    for (const listener of listeners) listener();
  }

  function readInitial() {
    try {
      if (!storage) throw new Error("Browser storage is unavailable.");
      const raw = storage.getItem(key);
      if (raw) snapshot = { ...snapshot, data: parseEnvelope(raw, ownerId).data };
      persistedRaw = raw;
    } catch (error) {
      blockedRead = true;
      snapshot = { ...snapshot, error: `read:${error.message}`, dirty: false };
    }
  }
  readInitial();

  function update(updater) {
    let latest = snapshot.data;
    try {
      if (!blockedRead && !snapshot.dirty) {
        const raw = storage.getItem(key);
        if (raw !== persistedRaw) {
          // A reset in another tab must not silently erase this tab's work.
          if (raw === null && persistedRaw !== null) throw new Error("Training storage changed in another tab.");
          if (raw) latest = parseEnvelope(raw, ownerId).data;
          persistedRaw = raw;
        }
      }
    } catch (error) {
      blockedRead = true;
      emit({ ...snapshot, error: `read:${error.message}` });
    }
    const proposed = updater(latest);
    if (proposed === latest) {
      if (latest !== snapshot.data) emit({ ...snapshot, data: latest });
      return { ok: !snapshot.dirty && !snapshot.error };
    }
    const next = validatePersonalData(proposed);
    const envelope = { version: PERSONAL_VERSION, ownerId, updatedAt: now(), data: next };
    try {
      if (blockedRead || snapshot.conflict) throw new Error("Previous data cannot be safely overwritten.");
      if (snapshot.dirty && storage.getItem(key) !== persistedRaw) {
        emit({ ...snapshot, conflict: true });
        throw new Error("New training data was saved in another tab.");
      }
      const raw = JSON.stringify(envelope);
      storage.setItem(key, raw);
      persistedRaw = raw;
      emit({ data: next, dirty: false, conflict: false, error: "" });
      return { ok: true };
    } catch (error) {
      emit({ ...snapshot, data: next, dirty: true, error: `write:${error.message}` });
      return { ok: false, error: error.message };
    }
  }

  function onStorage(event) {
    if (event.key !== key && event.key !== null) return;
    try {
      const raw = storage.getItem(key);
      if (raw === persistedRaw) return;
      if (snapshot.dirty) {
        emit({ ...snapshot, conflict: true, error: "conflict:Training changed in another tab. Export this tab before reloading." });
        return;
      }
      if (raw === null) throw new Error("Training storage was cleared in another tab.");
      const envelope = parseEnvelope(raw, ownerId);
      persistedRaw = raw;
      blockedRead = false;
      emit({ data: envelope.data, dirty: false, conflict: false, error: "" });
    } catch (error) {
      blockedRead = true;
      emit({ ...snapshot, error: `read:${error.message}` });
    }
  }

  return {
    getSnapshot: () => snapshot,
    subscribe(listener) {
      const reconnecting = !listeners.size;
      if (reconnecting) eventTarget?.addEventListener?.("storage", onStorage);
      listeners.add(listener);
      // The cached store can outlive its page and miss events while unsubscribed.
      if (reconnecting) onStorage({ key });
      return () => {
        listeners.delete(listener);
        if (!listeners.size) eventTarget?.removeEventListener?.("storage", onStorage);
      };
    },
    update,
    mergeFromCloud: (data) => update((current) => mergePersonalData(current, data)),
    retry: () => update((data) => ({ ...data })),
    exportBackup: () => JSON.stringify({ format: "quantgym-personal-prep", version: PERSONAL_VERSION, ownerId, exportedAt: now(), data: snapshot.data }, null, 2),
    restoreBackup(raw) {
      const backup = JSON.parse(raw);
      if (backup.format !== "quantgym-personal-prep") throw new Error("Not a personal training backup.");
      const incoming = parseEnvelope(raw, ownerId).data;
      if (blockedRead || snapshot.conflict) throw new Error("Export your current work and resolve the storage conflict before restoring.");
      return update((current) => mergePersonalData(current, incoming));
    }
  };
}
