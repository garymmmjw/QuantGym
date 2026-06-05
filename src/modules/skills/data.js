import { SCORE_XP_PER_POINT } from '../../constants.js';
import { dayKey } from '../../lib/date.js';
import { skillDefs } from '../../skills.js';

export function normalizeSkills(rawSkills = {}, defs = skillDefs) {
  const skills = Object.fromEntries(Object.keys(defs).map((key) => [key, Number(rawSkills[key] || 0)]));
  if (rawSkills.probability && !rawSkills.probabilityExpectation) skills.probabilityExpectation += Number(rawSkills.probability || 0);
  if (rawSkills.mental && !rawSkills.mentalMath) skills.mentalMath += Number(rawSkills.mental || 0);
  return skills;
}

export function getSkillScore(xp, xpPerPoint = SCORE_XP_PER_POINT) {
  return Math.min(100, Math.floor((xp || 0) / xpPerPoint));
}

export function getTotalXp(skills = {}, defs = skillDefs) {
  return Object.keys(defs).reduce((sum, key) => sum + (skills[key] || 0), 0);
}

export function calculateQuantScore(skills = {}, defs = skillDefs) {
  const scores = Object.keys(defs).map((key) => getSkillScore(skills?.[key] || 0));
  if (!scores.length) return 0;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 10) / 10;
}

export function getLevelInfo(xp = 0) {
  const level = Math.floor(Math.sqrt(xp / 55)) + 1;
  const previous = Math.pow(level - 1, 2) * 55;
  const nextTotal = Math.pow(level, 2) * 55;
  const current = Math.max(0, xp - previous);
  const next = Math.max(1, nextTotal - previous);
  return {
    level,
    current,
    next,
    percent: Math.min(100, Math.round((current / next) * 100))
  };
}

export function getRank(score = 0) {
  if (score >= 100) return "World-Class Quant PM";
  if (score >= 90) return "Head of Quant";
  if (score >= 75) return "Senior Quant Trader";
  if (score >= 60) return "Quant Researcher";
  if (score >= 40) return "Junior Quant";
  if (score >= 20) return "Quant Intern";
  if (score >= 10) return "Analyst II";
  return "Analyst I";
}

export function getWeeklyXp(entries = [], now = Date.now()) {
  const cutoff = now - 7 * 24 * 60 * 60 * 1000;
  return (Array.isArray(entries) ? entries : [])
    .filter((entry) => new Date(entry.date).getTime() >= cutoff)
    .reduce((sum, entry) => sum + Number(entry.totalXp || 0), 0);
}

export function getStreak(entries = [], checkIns = [], today = new Date()) {
  const days = new Set([
    ...(Array.isArray(entries) ? entries : []).map((entry) => dayKey(entry.date)),
    ...(Array.isArray(checkIns) ? checkIns : []).map((item) => dayKey(item.date))
  ]);
  let streak = 0;
  const cursor = new Date(today);
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

export function getSkillPracticeStats(skillKey, state = {}, deps = {}) {
  const normalizeCategory = deps.normalizeCategory || ((value) => value);
  const clampNumber = deps.clampNumber || ((value, min, max) => Math.min(max, Math.max(min, value)));
  const problems = Array.isArray(state.problems) ? state.problems : [];
  const entriesSource = Array.isArray(state.entries) ? state.entries : [];
  const problemStates = Array.isArray(state.problemStates) ? state.problemStates : [];
  const problemById = new Map(problems.map((problem) => [problem.id, problem]));
  const entries = entriesSource.filter((entry) => Number(entry.gains?.[skillKey] || 0) > 0);
  const relatedStates = problemStates.filter((item) => {
    const problem = problemById.get(item.problemId);
    return problem && normalizeCategory(problem.category) === skillKey;
  });
  const problemIds = new Set(relatedStates.map((item) => item.problemId).filter(Boolean));
  entries.forEach((entry) => {
    if (entry.problemId) problemIds.add(entry.problemId);
  });

  const scoreValues = [];
  relatedStates.forEach((item) => {
    const history = Array.isArray(item.scoreHistory) ? item.scoreHistory : [];
    history.forEach((record) => {
      const score = Number(record.score);
      if (Number.isFinite(score)) scoreValues.push(clampNumber(score, 0, 100));
    });
    if (!history.length && Number.isFinite(Number(item.lastScore))) {
      scoreValues.push(clampNumber(Number(item.lastScore), 0, 100));
    }
  });
  entries.forEach((entry) => {
    if (Number.isFinite(Number(entry.interviewScore))) {
      scoreValues.push(clampNumber(Number(entry.interviewScore), 0, 100));
    }
  });

  const scoredPracticeCount = relatedStates.reduce((sum, item) => {
    const scoreCount = Array.isArray(item.scoreHistory) ? item.scoreHistory.length : 0;
    return sum + Math.max(Number(item.interviewCount || 0), scoreCount, Number.isFinite(Number(item.lastScore)) ? 1 : 0);
  }, 0);
  const practiceCount = Math.max(entries.length, scoredPracticeCount);
  const averageScore = scoreValues.length
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : null;
  const latestEntry = entries
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return {
    score: getSkillScore(state.skills?.[skillKey] || 0),
    xp: state.skills?.[skillKey] || 0,
    practiceCount,
    problemCount: problemIds.size,
    averageScore,
    latestText: latestEntry?.text || ""
  };
}

export function getAllSkillPracticeStats(state = {}, deps = {}, defs = skillDefs) {
  const stats = Object.keys(defs).map((key) => getSkillPracticeStats(key, state, deps));
  const averageScores = stats.map((item) => item.averageScore).filter((score) => Number.isFinite(score));
  return {
    practiceCount: stats.reduce((sum, item) => sum + item.practiceCount, 0),
    averageScore: averageScores.length
      ? averageScores.reduce((sum, score) => sum + score, 0) / averageScores.length
      : null
  };
}
