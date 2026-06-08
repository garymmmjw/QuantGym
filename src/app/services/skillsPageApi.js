export function createSkillsPageApi(deps = {}) {
  function getSkills() {
    return deps.getState?.().skills || {};
  }

  function getSkillCards() {
    const skills = getSkills();
    return Object.entries(deps.skillDefs || {}).map(([key, def]) => {
      const xp = skills[key] || 0;
      const score = deps.getSkillScore?.(xp) || 0;
      const stats = deps.getSkillPracticeStats?.(key) || {
        practiceCount: 0,
        problemCount: 0,
        averageScore: null
      };
      return { key, def, xp, score, stats };
    });
  }

  function getSummary() {
    const skills = getSkills();
    const score = deps.getQuantScore?.() || 0;
    const stats = deps.getAllSkillPracticeStats?.() || { practiceCount: 0, averageScore: null };
    const weakest = Object.entries(deps.skillDefs || {})
      .map(([key, def]) => ({
        key,
        def,
        score: deps.getSkillScore?.(skills[key] || 0) || 0
      }))
      .sort((left, right) => left.score - right.score)[0];
    return {
      score,
      practiceCount: stats.practiceCount,
      averageScore: stats.averageScore,
      weakestLabel: weakest?.def?.short || "-"
    };
  }

  function bindRadar() {
    deps.rebindElements?.();
  }

  return {
    getSummary,
    getSkillCards,
    bindRadar,
    setHover: (...args) => deps.skillRadarRuntime?.setHover?.(...args),
    clearHover: () => deps.skillRadarRuntime?.clearHover?.(),
    drawRadar: (...args) => deps.skillRadarRuntime?.draw?.(...args),
    handleRadarMove: (event) => deps.skillRadarRuntime?.handleMove?.(event),
    focusFirstSkill: () => deps.skillRadarRuntime?.focusFirst?.(),
    getRadarHoverKey: () => deps.skillRadarRuntime?.getHoverKey?.() || "",
    updateLegendHighlight: (key) => deps.skillRadarRuntime?.updateLegendHighlight?.(key),
    formatScore: deps.formatScore,
    t: deps.t
  };
}
