import {
  buildPkAnswerResult,
  buildPkRevealFeed,
  createPkMatch
} from "../../modules/pk/session.js";

const IDLE = {
  opponentName: "Online Quant",
  userScore: 0,
  opponentScore: 0,
  problemText: "点击匹配开始。",
  feed: [],
  answer: "",
  session: null
};

export function createPkPageApi(deps = {}) {
  let view = { ...IDLE };

  function syncStore() {
    deps.userStateRuntime?.store?.setState?.(deps.getState?.());
  }

  return {
    getView() {
      return view;
    },

    start() {
      const state = deps.getState?.() || {};
      const match = createPkMatch(state.problems, {
        makeId: deps.makeId,
        randomChoice: deps.randomChoice,
        randomInt: deps.randomInt,
        formatCategory: deps.formatCategory || deps.formatCategoryLabel
      });
      if (!match.session) {
        view = { ...IDLE, problemText: match.emptyMessage };
        return view;
      }
      view = {
        opponentName: match.session.opponent,
        userScore: 0,
        opponentScore: "?",
        problemText: match.problemText,
        feed: match.feed,
        answer: "",
        session: match.session
      };
      return view;
    },

    submit(answer = "") {
      const normalized = String(answer || "").trim();
      if (!view.session) return this.start();
      if (view.session.finished || !normalized) return view;

      const state = deps.getState?.() || {};
      const result = buildPkAnswerResult(view.session, normalized, {
        makeId: deps.makeId,
        skillDefs: deps.skillDefs,
        normalizeCategory: deps.normalizeCategory,
        getLocalizedProblemField: deps.getLocalizedProblemField
      });
      if (!result.ok) return view;

      state.skills[result.category] = Math.max(0, (state.skills[result.category] || 0) + result.xpGain);
      state.entries.push(result.entry);
      deps.saveState?.();
      deps.renderAll?.();
      syncStore();

      view = {
        ...view,
        session: result.session,
        userScore: result.userScore,
        opponentScore: result.opponentScore,
        feed: result.feed,
        answer: ""
      };
      return view;
    },

    reveal() {
      if (!view.session) return view;
      view = {
        ...view,
        feed: buildPkRevealFeed(view.session, {
          getLocalizedProblemField: deps.getLocalizedProblemField
        })
      };
      return view;
    },

    setAnswer(value) {
      view = { ...view, answer: value };
      return view;
    }
  };
}
