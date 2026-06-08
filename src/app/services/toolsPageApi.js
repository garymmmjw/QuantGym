import { formatDuration, makeDrill } from "../../modules/tools/drills.js";
import {
  makeMarketGameRound,
  scoreMarketQuote
} from "../../modules/tools/marketGame.js";
import {
  applyDrillAnswer,
  applyDrillSkip,
  buildMentalMathEntry,
  createDrillSession,
  getDrillCompletionStats,
  getMentalMathXpGain
} from "../../modules/tools/session.js";
import { normalizeMentalMathRecords } from "../../modules/tools/data.js";

const DRILL_MODES = ["numberLogic", "arithmetic", "percent", "square", "ev"];

export function createToolsPageApi(deps = {}) {
  let drillMode = "numberLogic";
  let drillSession = null;
  let currentDrill = null;
  let currentMarketGame = makeMarketGameRound({ makeId: deps.makeId });
  let marketBid = String(Math.round(currentMarketGame.fairValue - currentMarketGame.volatility));
  let marketAsk = String(Math.round(currentMarketGame.fairValue + currentMarketGame.volatility));

  function getDrillModeLabel(mode = drillMode) {
    const labels = {
      numberLogic: "Number Logic",
      arithmetic: "Arithmetic",
      percent: deps.t?.("mentalPercent") || "百分比",
      square: deps.t?.("mentalSquare") || "平方",
      ev: "EV"
    };
    return labels[mode] || labels.numberLogic;
  }

  function ensureDrillSession() {
    if (drillSession && currentDrill) return;
    drillSession = createDrillSession({
      id: deps.makeId?.(),
      mode: drillMode,
      total: 20,
      durationSeconds: 1500,
      running: false
    });
    currentDrill = makeDrill(drillSession.mode);
  }

  function getDrillStatus() {
    if (!drillSession) return { score: 0, accuracy: 0, timeText: formatDuration(1500) };
    const answered = drillSession.correct + drillSession.incorrect;
    const accuracy = answered ? Math.round((drillSession.correct / answered) * 100) : 0;
    return {
      score: drillSession.score,
      accuracy,
      timeText: formatDuration(drillSession.remainingSeconds)
    };
  }

  function getDrillView() {
    ensureDrillSession();
    const progressPercent = Math.round((Math.min(drillSession.index, drillSession.total) / Math.max(drillSession.total, 1)) * 100);
    const options = (currentDrill?.options || []).map((option) => {
      const selected = currentDrill.selected != null && Number(option) === Number(currentDrill.selected);
      const correct = Math.abs(Number(option) - Number(currentDrill.answer)) <= currentDrill.tolerance;
      return {
        value: String(option),
        label: deps.formatNumber?.(option) || String(option),
        selected,
        correct: currentDrill.answered && correct,
        incorrect: currentDrill.answered && selected && !correct,
        disabled: !drillSession.running || currentDrill.answered || drillSession.completed
      };
    });
    return {
      mode: drillMode,
      modes: DRILL_MODES,
      count: drillSession.total,
      durationSeconds: drillSession.durationSeconds,
      status: getDrillStatus(),
      progressText: `${drillSession.completed ? "Finished" : "Question"} ${Math.min(drillSession.index + 1, drillSession.total)}/${drillSession.total}`,
      progressPercent,
      question: currentDrill?.question || "",
      options,
      feedback: currentDrill?.feedback || (drillSession.running
        ? deps.t?.("mentalChooseAnswer") || ""
        : deps.t?.("mentalPressStart") || ""),
      running: drillSession.running,
      completed: drillSession.completed
    };
  }

  function getRecordsView() {
    const records = normalizeMentalMathRecords(deps.getState?.().mentalMathRecords || [], { makeId: deps.makeId });
    const best = records.length ? Math.max(...records.map((record) => record.score)) : 0;
    const sparkline = records.slice(-18).map((record) => record.score);
    const rows = records.slice(-5).reverse().map((record) => ({
      id: record.id,
      label: record.label || getDrillModeLabel(record.mode),
      createdAt: deps.formatDate?.(record.createdAt) || record.createdAt,
      duration: formatDuration(record.durationSeconds),
      score: record.score,
      correct: record.correct,
      total: record.total,
      accuracy: record.accuracy
    }));
    return { best, sparkline, rows, empty: !rows.length };
  }

  function getLeaderboardView() {
    const records = normalizeMentalMathRecords(deps.getState?.().mentalMathRecords || [], { makeId: deps.makeId });
    const best = records.length ? Math.max(...records.map((record) => record.score)) : 0;
    return [
      { name: deps.getCurrentUserName?.() || "You", score: best, self: true },
      { name: "Ari Chen", score: 22 },
      { name: "Mina Patel", score: 18 },
      { name: "Leo Wang", score: 15 },
      { name: "Sofia Kim", score: 12 }
    ].sort((left, right) => right.score - left.score);
  }

  function getMarketView() {
    if (!currentMarketGame) currentMarketGame = makeMarketGameRound({ makeId: deps.makeId });
    return {
      score: Math.round(currentMarketGame.score || 0),
      fairValue: currentMarketGame.fairValue,
      volatility: currentMarketGame.volatility,
      news: currentMarketGame.news,
      feedback: currentMarketGame.feedback || "",
      quoted: currentMarketGame.quoted,
      bid: marketBid,
      ask: marketAsk
    };
  }

  function finishDrillSession(reason = "complete") {
    const state = deps.getState?.();
    if (!drillSession || drillSession.completed || !state) return getViewModel();
    drillSession.completed = true;
    drillSession.running = false;
    const { accuracy, usedSeconds } = getDrillCompletionStats(drillSession);
    const record = normalizeMentalMathRecords([{
      id: drillSession.id,
      mode: drillSession.mode,
      label: getDrillModeLabel(drillSession.mode),
      score: drillSession.score,
      correct: drillSession.correct,
      incorrect: drillSession.incorrect,
      skipped: drillSession.skipped,
      total: drillSession.total,
      accuracy,
      durationSeconds: usedSeconds,
      createdAt: new Date().toISOString()
    }], { makeId: deps.makeId })[0];

    if (record && !state.mentalMathRecords?.some?.((item) => item.id === record.id)) {
      state.mentalMathRecords = normalizeMentalMathRecords([...(state.mentalMathRecords || []), record], { makeId: deps.makeId });
      const xpGain = getMentalMathXpGain(record);
      state.skills.mentalMath = Math.max(0, (state.skills.mentalMath || 0) + xpGain);
      state.entries.push(buildMentalMathEntry(record, {
        id: deps.makeId?.(),
        date: new Date().toISOString(),
        reason,
        skillDefs: deps.skillDefs || {},
        xpGain,
        usedSeconds
      }));
      deps.saveState?.();
      deps.renderSummary?.();
      deps.renderSkills?.();
      deps.renderMemory?.();
      deps.userStateRuntime?.store?.setState?.(state);
    }
    if (currentDrill) {
      currentDrill.feedback = `Session complete. Score ${drillSession.score}, accuracy ${accuracy}%.`;
    }
    return getViewModel();
  }

  function getViewModel() {
    return {
      drill: getDrillView(),
      records: getRecordsView(),
      leaderboard: getLeaderboardView(),
      market: getMarketView()
    };
  }

  return {
    getViewModel,

    setDrillMode(mode) {
      if (!DRILL_MODES.includes(mode)) return getViewModel();
      drillMode = mode;
      drillSession = createDrillSession({
        id: deps.makeId?.(),
        mode: drillMode,
        total: drillSession?.total || 20,
        durationSeconds: drillSession?.durationSeconds || 1500,
        running: true
      });
      currentDrill = makeDrill(drillMode);
      return getViewModel();
    },

    setDrillCount(count) {
      ensureDrillSession();
      drillSession.total = Math.max(1, Number(count || 20));
      return getViewModel();
    },

    setDrillDuration(seconds) {
      ensureDrillSession();
      const duration = Math.max(60, Number(seconds || 1500));
      drillSession.durationSeconds = duration;
      drillSession.remainingSeconds = duration;
      return getViewModel();
    },

    startDrillSession(options = {}) {
      drillSession = createDrillSession({
        id: deps.makeId?.(),
        mode: drillMode,
        total: options.count || drillSession?.total || 20,
        durationSeconds: options.durationSeconds || drillSession?.durationSeconds || 1500,
        running: true
      });
      currentDrill = makeDrill(drillSession.mode);
      return getViewModel();
    },

    tickDrillTimer() {
      if (!drillSession?.running) return getViewModel();
      drillSession.remainingSeconds = Math.max(0, drillSession.remainingSeconds - 1);
      if (drillSession.remainingSeconds <= 0) return finishDrillSession("time");
      return getViewModel();
    },

    checkDrill(rawAnswer) {
      const result = applyDrillAnswer(drillSession, currentDrill, rawAnswer, { formatNumber: deps.formatNumber });
      if (!result.changed) return { view: getViewModel(), advance: false };
      const advance = Boolean(drillSession?.running);
      return { view: getViewModel(), advance };
    },

    skipDrill() {
      if (!currentDrill || !drillSession?.running || drillSession.completed) return { view: getViewModel(), advance: false };
      if (currentDrill.answered) return { view: getViewModel(), advance: true };
      applyDrillSkip(drillSession, currentDrill, { formatNumber: deps.formatNumber });
      return { view: getViewModel(), advance: Boolean(drillSession?.running) };
    },

    advanceDrillQuestion(options = {}) {
      if (!drillSession || drillSession.completed || !drillSession.running) return getViewModel();
      if (!currentDrill?.answered && options.countSkip !== false) drillSession.skipped += 1;
      if (drillSession.index + 1 >= drillSession.total) return finishDrillSession("complete");
      drillSession.index += 1;
      drillSession.answered = false;
      currentDrill = makeDrill(drillSession.mode);
      return getViewModel();
    },

    setMarketQuote(field, value) {
      if (field === "bid") marketBid = value;
      if (field === "ask") marketAsk = value;
      return getViewModel();
    },

    submitMarketQuote() {
      const bid = Number(marketBid);
      const ask = Number(marketAsk);
      const result = scoreMarketQuote(currentMarketGame, bid, ask, { formatNumber: deps.formatNumber });
      if (result.scored) deps.recordGameResult?.("market", result.score, result.detail);
      if (result.scored) deps.userStateRuntime?.store?.setState?.(deps.getState?.());
      return getViewModel();
    },

    newMarketGame() {
      currentMarketGame = makeMarketGameRound({
        id: deps.makeId?.(),
        previousScore: currentMarketGame?.score
      });
      marketBid = String(Math.round(currentMarketGame.fairValue - currentMarketGame.volatility));
      marketAsk = String(Math.round(currentMarketGame.fairValue + currentMarketGame.volatility));
      return getViewModel();
    },

    openPoker: () => deps.switchModule?.("poker"),
    t: deps.t
  };
}
