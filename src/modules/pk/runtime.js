import {
  buildPkAnswerResult,
  buildPkRevealFeed,
  createPkMatch
} from './session.js';
import { renderPkFeed as renderPkFeedView } from './feed.js';

export function createPkRuntime(deps = {}) {
  let session = null;

  const getElements = () => deps.elements || {};
  const getState = () => deps.getState?.() || {};

  function renderFeed(items = []) {
    renderPkFeedView(getElements().pkFeed, items, {
      documentRef: deps.documentRef || globalThis.document
    });
  }

  function start() {
    const state = getState();
    const els = getElements();
    const match = createPkMatch(state.problems, {
      makeId: deps.makeId,
      randomChoice: deps.randomChoice,
      randomInt: deps.randomInt,
      formatCategory: deps.formatCategory
    });
    if (!match.session) {
      if (els.pkProblem) els.pkProblem.textContent = match.emptyMessage;
      return;
    }
    session = match.session;
    if (els.pkOpponentName) els.pkOpponentName.textContent = match.session.opponent;
    if (els.pkUserScore) els.pkUserScore.textContent = "0";
    if (els.pkOpponentScore) els.pkOpponentScore.textContent = "?";
    if (els.pkAnswer) els.pkAnswer.value = "";
    if (els.pkProblem) els.pkProblem.textContent = match.problemText;
    renderFeed(match.feed);
    els.pkAnswer?.focus?.();
  }

  function submit() {
    const state = getState();
    const els = getElements();
    if (!session) {
      start();
      return;
    }
    if (session.finished) return;
    const answer = els.pkAnswer?.value?.trim?.() || "";
    if (!answer) return;

    const result = buildPkAnswerResult(session, answer, {
      makeId: deps.makeId,
      skillDefs: deps.skillDefs,
      normalizeCategory: deps.normalizeCategory,
      getLocalizedProblemField: deps.getLocalizedProblemField
    });
    if (!result.ok) return;
    session = result.session;
    if (els.pkUserScore) els.pkUserScore.textContent = String(result.userScore);
    if (els.pkOpponentScore) els.pkOpponentScore.textContent = String(result.opponentScore);

    state.skills[result.category] = Math.max(0, (state.skills[result.category] || 0) + result.xpGain);
    state.entries.push(result.entry);
    deps.saveState?.();

    renderFeed(result.feed);
    deps.renderAll?.();
  }

  function reveal() {
    if (!session) return;
    renderFeed(buildPkRevealFeed(session, {
      getLocalizedProblemField: deps.getLocalizedProblemField
    }));
  }

  return {
    reveal,
    start,
    submit
  };
}
