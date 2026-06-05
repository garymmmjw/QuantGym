export function createDrillSession(options = {}) {
  const total = Math.max(1, Number(options.total || 20));
  const durationSeconds = Math.max(60, Number(options.durationSeconds || 1500));
  return {
    id: options.id || "",
    mode: options.mode || "numberLogic",
    total,
    index: 0,
    score: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    durationSeconds,
    remainingSeconds: durationSeconds,
    running: Boolean(options.running),
    answered: false,
    completed: false,
    startedAt: options.startedAt || Date.now()
  };
}

export function applyDrillAnswer(session, drill, rawAnswer, options = {}) {
  if (!drill || !session?.running || session.completed || drill.answered) return { changed: false };
  const answer = Number(rawAnswer);
  if (!Number.isFinite(answer)) return { changed: false };
  const formatNumber = options.formatNumber || ((value) => String(value));
  const correct = Math.abs(answer - drill.answer) <= drill.tolerance;
  drill.answered = true;
  drill.selected = answer;
  drill.feedback = correct
    ? `Correct. ${drill.explain}`
    : `Answer: ${formatNumber(drill.answer)}. ${drill.explain}`;
  session.answered = true;
  if (correct) {
    session.correct += 1;
    session.score += 1;
  } else {
    session.incorrect += 1;
    session.score -= 1;
  }
  return { changed: true, correct, answer };
}

export function applyDrillSkip(session, drill, options = {}) {
  if (!drill || !session?.running || session.completed) return { changed: false };
  const formatNumber = options.formatNumber || ((value) => String(value));
  drill.answered = true;
  drill.skipped = true;
  drill.feedback = `Skipped. Answer: ${formatNumber(drill.answer)}. ${drill.explain}`;
  session.skipped += 1;
  session.answered = true;
  return { changed: true };
}

export function getDrillCompletionStats(session = {}) {
  const answered = Number(session.correct || 0) + Number(session.incorrect || 0);
  const accuracy = answered ? Math.round((Number(session.correct || 0) / answered) * 100) : 0;
  const usedSeconds = Math.max(0, Number(session.durationSeconds || 0) - Number(session.remainingSeconds || 0));
  return { answered, accuracy, usedSeconds };
}

export function getMentalMathXpGain(record = {}) {
  return Math.max(4, Number(record.correct || 0) * 3 + Math.max(0, Number(record.score || 0)));
}

export function buildMentalMathEntry(record = {}, options = {}) {
  const xpGain = Number(options.xpGain || 0);
  const skillDefs = options.skillDefs || {};
  return {
    id: options.id || "",
    date: options.date || new Date().toISOString(),
    text: `Mental Math ${record.label}: ${record.score} (${record.correct}/${record.total}, ${options.reason || "complete"})`,
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === "mentalMath" ? xpGain : 0])),
    totalXp: xpGain,
    duration: Math.round(Number(options.usedSeconds || 0) / 60)
  };
}
