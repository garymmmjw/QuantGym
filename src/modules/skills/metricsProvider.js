import {
  calculateQuantScore as calculateQuantScoreValue,
  getAllSkillPracticeStats as getAllSkillPracticeStatsValue,
  getLevelInfo as getLevelInfoValue,
  getRank as getRankValue,
  getSkillPracticeStats as getSkillPracticeStatsValue,
  getSkillScore as getSkillScoreValue,
  getStreak as getStreakValue,
  getTotalXp as getTotalXpValue,
  getWeeklyXp as getWeeklyXpValue
} from './data.js';

export function createSkillsMetricsProvider(deps) {
  const {
    getState,
    skillDefs,
    scoreXpPerPoint,
    normalizeCategory,
    clampNumber
  } = deps;

  function getSkills() {
    return getState().skills;
  }

  function getEntries() {
    return getState().entries;
  }

  function getCheckIns() {
    return getState().checkIns;
  }

  return {
    getTotalXp() {
      return getTotalXpValue(getSkills(), skillDefs);
    },
    getSkillScore(xp) {
      return getSkillScoreValue(xp, scoreXpPerPoint);
    },
    getQuantScore() {
      return calculateQuantScoreValue(getSkills(), skillDefs);
    },
    calculateQuantScore(skills) {
      return calculateQuantScoreValue(skills, skillDefs);
    },
    getLevelInfo(xp) {
      return getLevelInfoValue(xp);
    },
    getRank(score) {
      return getRankValue(score);
    },
    getWeeklyXp() {
      return getWeeklyXpValue(getEntries());
    },
    getStreak() {
      return getStreakValue(getEntries(), getCheckIns());
    },
    getSkillPracticeStats(skillKey) {
      return getSkillPracticeStatsValue(skillKey, getState(), {
        normalizeCategory,
        clampNumber
      });
    },
    getAllSkillPracticeStats() {
      return getAllSkillPracticeStatsValue(getState(), {
        normalizeCategory,
        clampNumber
      }, skillDefs);
    }
  };
}
