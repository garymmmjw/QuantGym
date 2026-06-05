import { makeId as defaultMakeId } from '../../lib/id.js';
import { randomChoice as defaultRandomChoice, randomInt as defaultRandomInt } from '../../lib/random.js';
import { formatPkProblem, scorePkAnswer } from './data.js';

const DEFAULT_PK_OPPONENTS = [
  "AlphaQuant",
  "Jane Street Trainee",
  "Vol Arb Intern",
  "Data Quant",
  "Options Challenger"
];

export function createPkMatch(problems = [], options = {}) {
  const source = Array.isArray(problems) ? problems.filter(Boolean) : [];
  const randomChoice = options.randomChoice || defaultRandomChoice;
  const randomInt = options.randomInt || defaultRandomInt;
  const makeId = options.makeId || defaultMakeId;
  const formatCategory = options.formatCategory || ((category) => category || "");
  const opponents = Array.isArray(options.opponents) && options.opponents.length ? options.opponents : DEFAULT_PK_OPPONENTS;
  const problem = options.problem || randomChoice(source);

  if (!problem) {
    return {
      session: null,
      emptyMessage: options.emptyMessage || "题库为空，先添加题目。"
    };
  }

  const opponent = options.opponent || randomChoice(opponents);
  const session = {
    id: makeId(),
    problem,
    opponent,
    opponentScore: randomInt(58, 92),
    userScore: 0,
    startedAt: options.nowMs?.() ?? Date.now(),
    finished: false
  };

  return {
    session,
    problemText: formatPkProblem(problem),
    feed: [
      `已匹配 ${opponent}`,
      `题目来自：${formatCategory(problem.category)} · ${problem.difficulty}`
    ]
  };
}

export function buildPkAnswerResult(session, answer, options = {}) {
  const normalizedAnswer = String(answer || "").trim();
  if (!session || session.finished || !normalizedAnswer) return { ok: false, session };

  const nowMs = options.nowMs?.() ?? Date.now();
  const makeId = options.makeId || defaultMakeId;
  const skillDefs = options.skillDefs || {};
  const normalizeCategory = options.normalizeCategory || ((category) => category || "");
  const category = normalizeCategory(session.problem.category);
  const elapsed = Math.round((nowMs - session.startedAt) / 1000);
  const userScore = scorePkAnswer(session.problem, normalizedAnswer, elapsed, {
    getLocalizedProblemField: options.getLocalizedProblemField
  });
  const nextSession = {
    ...session,
    userScore,
    finished: true
  };
  const won = userScore >= session.opponentScore;
  const xpGain = won ? 18 : 10;
  const skillName = skillDefs[category]?.name || category;

  return {
    ok: true,
    session: nextSession,
    userScore,
    opponentScore: session.opponentScore,
    won,
    category,
    xpGain,
    entry: {
      id: makeId(),
      date: new Date(nowMs).toISOString(),
      text: `PK：${session.problem.titleZh || session.problem.titleEn}，对手 ${session.opponent}，比分 ${userScore}-${session.opponentScore}`,
      gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === category ? xpGain : 0])),
      totalXp: xpGain,
      duration: 0
    },
    feed: [
      won ? "你赢了这一局。" : "这局对手领先。",
      `你的得分：${userScore}`,
      `${session.opponent}：${session.opponentScore}`,
      `获得 ${skillName} +${xpGain} XP`
    ]
  };
}

export function buildPkRevealFeed(session, options = {}) {
  if (!session) return [];
  const getLocalizedProblemField = options.getLocalizedProblemField || ((problem, field) => problem?.[field] || "");
  return [
    "参考答案",
    getLocalizedProblemField(session.problem, "answer", false) || "未填写",
    getLocalizedProblemField(session.problem, "explanation", false) || "未填写"
  ];
}
