import { escapeHtml } from '../../lib/text.js';

export function renderDrillStatusView(els = {}, session = null, options = {}) {
  if (!session) return;
  const answered = session.correct + session.incorrect;
  const accuracy = answered ? Math.round((session.correct / answered) * 100) : 0;
  const timeText = options.formatDuration?.(session.remainingSeconds) || "0:00";
  if (els.drillScore) els.drillScore.textContent = String(session.score);
  if (els.drillAccuracy) els.drillAccuracy.textContent = `${accuracy}%`;
  if (els.drillTimer) els.drillTimer.textContent = timeText;
  if (els.drillProgressText) {
    els.drillProgressText.textContent = `${session.completed ? "Finished" : "Question"} ${Math.min(session.index + 1, session.total)}/${session.total}`;
  }
  if (els.drillTimeLeftText) els.drillTimeLeftText.textContent = `Time left: ${timeText}`;
  if (els.drillProgressFill) {
    const percent = Math.round((Math.min(session.index, session.total) / Math.max(session.total, 1)) * 100);
    els.drillProgressFill.style.width = `${percent}%`;
  }
}

export function renderDrillQuestionView(els = {}, drill = null, session = null, options = {}) {
  if (!drill || !els.drillQuestion || !els.drillOptions) return;
  const formatNumber = options.formatNumber || ((value) => String(value));
  els.drillQuestion.textContent = drill.question;
  els.drillOptions.innerHTML = "";
  drill.options.forEach((option) => {
    const button = document.createElement("button");
    const selected = drill.selected != null && Number(option) === Number(drill.selected);
    const correct = Math.abs(Number(option) - Number(drill.answer)) <= drill.tolerance;
    button.type = "button";
    button.className = [
      "drill-option",
      drill.answered && correct ? "correct" : "",
      drill.answered && selected && !correct ? "incorrect" : ""
    ].filter(Boolean).join(" ");
    button.dataset.drillOption = String(option);
    button.disabled = Boolean(!session?.running || drill.answered || session?.completed);
    button.textContent = formatNumber(option);
    els.drillOptions.appendChild(button);
  });
  if (els.drillFeedback) {
    els.drillFeedback.textContent = drill.feedback || (session?.running
      ? options.chooseAnswerLabel || ""
      : options.pressStartLabel || "");
  }
}

export function renderMentalRecordsView(els = {}, records = [], options = {}) {
  const safeRecords = Array.isArray(records) ? records : [];
  if (els.mentalBestScore) {
    const best = safeRecords.length ? Math.max(...safeRecords.map((record) => record.score)) : 0;
    els.mentalBestScore.textContent = `Best ${best}`;
  }
  renderSparklineView(els.mentalSparkline, safeRecords.map((record) => record.score));
  if (!els.mentalRecordList) return;
  els.mentalRecordList.innerHTML = "";
  if (!safeRecords.length) {
    els.mentalRecordList.appendChild(options.emptyBlock?.(options.emptyLabel || "") || document.createTextNode(""));
    return;
  }
  safeRecords.slice(-5).reverse().forEach((record) => {
    const row = document.createElement("div");
    row.className = "mental-record-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(record.label || options.getDrillModeLabel?.(record.mode) || "")}</strong>
        <small>${escapeHtml(options.formatDate?.(record.createdAt) || record.createdAt || "")} · ${escapeHtml(options.formatDuration?.(record.durationSeconds) || "")}</small>
      </div>
      <span>${escapeHtml(String(record.score))}</span>
      <small>${escapeHtml(String(record.correct))}/${escapeHtml(String(record.total))} · ${escapeHtml(String(record.accuracy))}%</small>
    `;
    els.mentalRecordList.appendChild(row);
  });
}

export function renderSparklineView(svg, values = []) {
  if (!svg) return;
  svg.innerHTML = "";
  const series = values.slice(-18);
  if (series.length < 2) {
    svg.innerHTML = '<text x="16" y="42">No trend yet</text>';
    return;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);
  const points = series.map((value, index) => {
    const x = 10 + (index / Math.max(series.length - 1, 1)) * 240;
    const y = 58 - ((value - min) / range) * 44;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  svg.innerHTML = `
    <polyline class="sparkline-area" points="10,62 ${points} 250,62"></polyline>
    <polyline class="sparkline-line" points="${points}"></polyline>
    ${series.map((value, index) => {
      const [x, y] = points.split(" ")[index].split(",");
      return `<circle cx="${x}" cy="${y}" r="2.8"><title>${escapeHtml(String(value))}</title></circle>`;
    }).join("")}
  `;
}

export function renderMentalLeaderboardView(els = {}, records = [], options = {}) {
  if (!els.mentalLeaderboardList) return;
  const safeRecords = Array.isArray(records) ? records : [];
  const best = safeRecords.length ? Math.max(...safeRecords.map((record) => record.score)) : 0;
  const rows = [
    { name: options.currentUserName || "You", score: best, self: true },
    { name: "Ari Chen", score: 22 },
    { name: "Mina Patel", score: 18 },
    { name: "Leo Wang", score: 15 },
    { name: "Sofia Kim", score: 12 }
  ].sort((a, b) => b.score - a.score);
  els.mentalLeaderboardList.innerHTML = "";
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = `mental-leaderboard-row${row.self ? " self" : ""}`;
    item.innerHTML = `
      <span>${index + 1}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <b>${escapeHtml(String(row.score))}</b>
    `;
    els.mentalLeaderboardList.appendChild(item);
  });
}

export function syncDrillModeButtons(mode = "numberLogic") {
  document.querySelectorAll("[data-drill]").forEach((button) => {
    button.classList.toggle("active", button.dataset.drill === mode);
  });
}
