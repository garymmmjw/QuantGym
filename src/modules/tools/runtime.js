import { formatDuration as formatDurationValue, makeDrill as makeDrillValue } from './drills.js';
import {
  renderDrillQuestionView,
  renderDrillStatusView,
  renderMentalLeaderboardView,
  renderMentalRecordsView,
  syncDrillModeButtons
} from './mentalMath.js';
import {
  makeMarketGameRound as makeMarketGameRoundValue,
  renderMarketGameView,
  scoreMarketQuote as scoreMarketQuoteValue
} from './marketGame.js';
import {
  applyDrillAnswer as applyDrillAnswerValue,
  applyDrillSkip as applyDrillSkipValue,
  buildMentalMathEntry as buildMentalMathEntryValue,
  createDrillSession as createDrillSessionValue,
  getDrillCompletionStats as getDrillCompletionStatsValue,
  getMentalMathXpGain as getMentalMathXpGainValue
} from './session.js';
import { normalizeMentalMathRecords } from './data.js';

export function createToolsPracticeController(deps = {}) {
  let currentDrill = null;
  let drillMode = deps.initialDrillMode || 'numberLogic';
  let drillSession = null;
  let drillTimerId = null;
  let currentMarketGame = null;

  const windowRef = deps.windowRef || globalThis;
  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};
  const nowIso = () => deps.nowIso?.() || new Date().toISOString();
  const makeId = () => deps.makeId?.() || `${Date.now()}-${Math.random()}`;
  const formatNumber = (value) => deps.formatNumber?.(value) || String(value);
  const translate = (key) => deps.t?.(key) || key;

  function getDrillModeLabel(mode = drillMode) {
    const labels = {
      numberLogic: 'Number Logic',
      arithmetic: 'Arithmetic',
      percent: translate('mentalPercent'),
      square: translate('mentalSquare'),
      ev: 'EV'
    };
    return labels[mode] || labels.numberLogic;
  }

  function createDrillSession(running = false) {
    const els = getElements();
    return createDrillSessionValue({
      id: makeId(),
      mode: drillMode,
      total: els.drillCountSelect?.value || 20,
      durationSeconds: els.drillTimeSelect?.value || 1500,
      running,
      startedAt: Date.now()
    });
  }

  function ensureDrillSession() {
    if (drillSession && currentDrill) return;
    drillSession = createDrillSession(false);
    currentDrill = makeDrillValue(drillSession.mode);
  }

  function startDrillTimer() {
    stopDrillTimer();
    drillTimerId = windowRef.setInterval?.(() => {
      if (!drillSession?.running) return;
      drillSession.remainingSeconds = Math.max(0, drillSession.remainingSeconds - 1);
      renderDrillStatus();
      if (drillSession.remainingSeconds <= 0) finishDrillSession('time');
    }, 1000);
  }

  function stopDrillTimer() {
    if (drillTimerId) windowRef.clearInterval?.(drillTimerId);
    drillTimerId = null;
  }

  function renderDrillStatus() {
    renderDrillStatusView(getElements(), drillSession, {
      formatDuration: formatDurationValue
    });
  }

  function renderDrillQuestion() {
    renderDrillQuestionView(getElements(), currentDrill, drillSession, {
      formatNumber,
      chooseAnswerLabel: translate('mentalChooseAnswer'),
      pressStartLabel: translate('mentalPressStart')
    });
  }

  function renderMentalRecords() {
    const records = normalizeMentalMathRecords(getState().mentalMathRecords, { makeId });
    renderMentalRecordsView(getElements(), records, {
      emptyBlock: deps.emptyBlock,
      emptyLabel: translate('mentalEmpty'),
      getDrillModeLabel,
      formatDate: deps.formatDate,
      formatDuration: formatDurationValue
    });
  }

  function renderMentalLeaderboard() {
    const records = normalizeMentalMathRecords(getState().mentalMathRecords, { makeId });
    renderMentalLeaderboardView(getElements(), records, {
      currentUserName: deps.getCurrentUserName?.() || 'You'
    });
  }

  function makeMarketGameRound() {
    return makeMarketGameRoundValue({
      id: makeId(),
      previousScore: currentMarketGame?.score
    });
  }

  function renderMarketGame() {
    renderMarketGameView(getElements(), currentMarketGame);
  }

  function render() {
    const els = getElements();
    if (!els.drillQuestion) return;
    ensureDrillSession();
    syncDrillModeButtons(drillMode);
    renderDrillStatus();
    renderDrillQuestion();
    renderMentalRecords();
    renderMentalLeaderboard();
    if (!currentMarketGame) currentMarketGame = makeMarketGameRound();
    deps.ensurePokerGame?.();
    renderMarketGame();
    deps.renderPokerGame?.();
    deps.refreshIcons?.();
  }

  function startDrillSession() {
    stopDrillTimer();
    drillSession = createDrillSession(true);
    currentDrill = makeDrillValue(drillSession.mode);
    startDrillTimer();
    render();
  }

  function checkDrill(rawAnswer) {
    const result = applyDrillAnswerValue(drillSession, currentDrill, rawAnswer, {
      formatNumber
    });
    if (!result.changed) return;
    render();
    if (drillSession.running) {
      windowRef.setTimeout?.(() => advanceDrillQuestion({ countSkip: false }), 520);
    }
  }

  function skipDrill() {
    if (!currentDrill || !drillSession?.running || drillSession.completed) return;
    if (currentDrill.answered) {
      advanceDrillQuestion({ countSkip: false });
      return;
    }
    const result = applyDrillSkipValue(drillSession, currentDrill, {
      formatNumber
    });
    if (!result.changed) return;
    render();
    if (drillSession.running) {
      windowRef.setTimeout?.(() => advanceDrillQuestion({ countSkip: false }), 420);
    }
  }

  function advanceDrillQuestion(options = {}) {
    if (!drillSession || drillSession.completed) return;
    if (!drillSession.running) return;
    if (!currentDrill?.answered && options.countSkip !== false) {
      drillSession.skipped += 1;
    }
    if (drillSession.index + 1 >= drillSession.total) {
      finishDrillSession('complete');
      return;
    }
    drillSession.index += 1;
    drillSession.answered = false;
    currentDrill = makeDrillValue(drillSession.mode);
    render();
  }

  function finishDrillSession(reason = 'complete') {
    const state = getState();
    if (!drillSession || drillSession.completed || !state) return;
    stopDrillTimer();
    drillSession.completed = true;
    drillSession.running = false;
    const { accuracy, usedSeconds } = getDrillCompletionStatsValue(drillSession);
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
      createdAt: nowIso()
    }], { makeId })[0];

    if (record && !state.mentalMathRecords?.some?.((item) => item.id === record.id)) {
      state.mentalMathRecords = normalizeMentalMathRecords([...(state.mentalMathRecords || []), record], { makeId });
      const xpGain = getMentalMathXpGainValue(record);
      state.skills.mentalMath = Math.max(0, (state.skills.mentalMath || 0) + xpGain);
      state.entries.push(buildMentalMathEntryValue(record, {
        id: makeId(),
        date: nowIso(),
        reason,
        skillDefs: deps.skillDefs || {},
        xpGain,
        usedSeconds
      }));
      deps.saveState?.();
      deps.renderSummary?.();
      deps.renderSkills?.();
      deps.renderMemory?.();
    }

    if (currentDrill) currentDrill.feedback = `Session complete. Score ${drillSession.score}, accuracy ${accuracy}%.`;
    render();
  }

  function newMarketGame(renderAfter = true) {
    currentMarketGame = makeMarketGameRound();
    if (renderAfter) render();
  }

  function submitMarketQuote() {
    const els = getElements();
    if (!currentMarketGame) return;
    const bid = Number(els.marketBidInput?.value);
    const ask = Number(els.marketAskInput?.value);
    const result = scoreMarketQuoteValue(currentMarketGame, bid, ask, {
      formatNumber
    });
    if (result.scored) deps.recordGameResult?.('market', result.score, result.detail);
    renderMarketGame();
    if (result.scored) deps.renderSkills?.();
  }

  function setDrillMode(value) {
    drillMode = value || drillMode;
  }

  function dispose() {
    stopDrillTimer();
  }

  return {
    advanceDrillQuestion,
    checkDrill,
    dispose,
    newMarketGame,
    render,
    setDrillMode,
    skipDrill,
    startDrillSession,
    submitMarketQuote
  };
}
