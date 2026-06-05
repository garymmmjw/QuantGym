export function formatInterviewTimer(seconds) {
  const rawSeconds = Number(seconds || 0);
  const safeSeconds = Number.isFinite(rawSeconds) ? Math.max(0, rawSeconds) : 0;
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

export function renderInterviewTimer(node, seconds) {
  if (!node) return false;
  node.textContent = formatInterviewTimer(seconds);
  return true;
}

export function getInterviewTimeUpMessage(options = {}) {
  const language = options.language === "en" ? "en" : "zh";
  const live = Boolean(options.live);
  if (language === "en") {
    return live
      ? "Time is up. Please wrap up in one sentence or submit what you have."
      : "Time is up. You can still submit the current answer for evaluation.";
  }
  return live
    ? "时间到。请用一句话收尾，或者直接提交已有回答。"
    : "时间到。你仍然可以提交当前回答，我会按已有内容评测。";
}
