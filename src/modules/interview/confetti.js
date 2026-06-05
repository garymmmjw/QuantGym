export function launchInterviewConfetti(container, options = {}) {
  if (!container) return null;
  const pieceCount = Number.isFinite(Number(options.pieceCount)) ? Number(options.pieceCount) : 34;
  const random = options.random || Math.random;
  const setTimeoutImpl = options.setTimeoutImpl || globalThis.setTimeout;
  const burst = document.createElement("div");
  burst.className = "interview-confetti";
  for (let index = 0; index < pieceCount; index += 1) {
    const piece = document.createElement("span");
    piece.style.setProperty("--x", `${Math.round(random() * 100)}%`);
    piece.style.setProperty("--delay", `${Math.round(random() * 360)}ms`);
    piece.style.setProperty("--spin", `${Math.round(120 + random() * 420)}deg`);
    burst.appendChild(piece);
  }
  container.appendChild(burst);
  container.scrollTop = container.scrollHeight;
  setTimeoutImpl(() => burst.remove(), 2200);
  return burst;
}
