import { listen } from '../../ui/events.js';

export function createSkillsModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getSkillDefs = () => deps.skillDefs || {};
  const getSkills = () => deps.getSkills?.() || {};
  const getRadar = () => deps.radar || {};
  const text = (key, params) => deps.t?.(key, params) || key;
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };
  const setHover = (key, event) => {
    if (getRadar().setHover) getRadar().setHover(key, event);
    else deps.setRadarHover?.(key, event);
  };
  const clearHover = () => {
    if (getRadar().clearHover) getRadar().clearHover();
    else deps.clearRadarHover?.();
  };
  const drawRadar = (...args) => {
    if (getRadar().draw) getRadar().draw(...args);
    else deps.drawRadar?.(...args);
  };
  const updateLegendHighlight = (key) => {
    if (getRadar().updateLegendHighlight) getRadar().updateLegendHighlight(key);
    else deps.updateRadarLegendHighlight?.(key);
  };
  const getRadarHoverKey = () => (
    getRadar().getHoverKey ? getRadar().getHoverKey() : deps.getRadarHoverKey?.()
  );
  const focusFirstSkill = () => {
    if (getRadar().focusFirst) getRadar().focusFirst();
    else deps.focusFirstSkill?.();
  };
  const handleRadarMove = (event) => {
    if (getRadar().handleMove) getRadar().handleMove(event);
    else deps.handleRadarMove?.(event);
  };

  const renderScoreSummary = () => {
    const els = getElements();
    const skillDefs = getSkillDefs();
    const skills = getSkills();
    const score = deps.getQuantScore?.() || 0;
    const stats = deps.getAllPracticeStats?.() || { practiceCount: 0, averageScore: null };
    const weakest = Object.entries(skillDefs)
      .map(([key, def]) => ({ key, def, score: deps.getSkillScore?.(skills?.[key] || 0) || 0 }))
      .sort((a, b) => a.score - b.score)[0];
    if (els.skillsScoreValue) els.skillsScoreValue.textContent = deps.formatScore?.(score) || String(score);
    if (els.skillsEntriesCount) els.skillsEntriesCount.textContent = stats.practiceCount;
    if (els.skillsAverageScore) els.skillsAverageScore.textContent = stats.averageScore == null ? "-" : Math.round(stats.averageScore);
    if (els.skillsWeakestSkill) els.skillsWeakestSkill.textContent = weakest?.def.short || "-";
  };

  const renderLegend = () => {
    const els = getElements();
    const skills = getSkills();
    if (!els.skillRadarLegend) return;
    els.skillRadarLegend.innerHTML = "";
    Object.entries(getSkillDefs()).forEach(([key, def]) => {
      const score = deps.getSkillScore?.(skills?.[key] || 0) || 0;
      const row = document.createElement("button");
      row.className = "skill-radar-legend-row";
      row.type = "button";
      row.dataset.skillRadarKey = key;
      row.innerHTML = `
        <span class="legend-dot"></span>
        <span>${escape(def.name)}</span>
        <strong>${score}/100</strong>
      `;
      row.querySelector(".legend-dot").style.background = def.color;
      row.addEventListener("mouseenter", (event) => setHover(key, event));
      row.addEventListener("mousemove", (event) => setHover(key, event));
      row.addEventListener("click", (event) => setHover(key, event));
      row.addEventListener("mouseleave", clearHover);
      row.addEventListener("focus", () => setHover(key));
      row.addEventListener("blur", clearHover);
      els.skillRadarLegend.appendChild(row);
    });
  };

  const render = () => {
    const els = getElements();
    if (!els.skillsGrid || !els.skillTemplate) return;
    const skills = getSkills();
    renderScoreSummary();
    renderLegend();
    els.skillsGrid.innerHTML = "";
    Object.entries(getSkillDefs()).forEach(([key, def]) => {
      const xp = skills[key] || 0;
      const score = deps.getSkillScore?.(xp) || 0;
      const stats = deps.getPracticeStats?.(key) || { practiceCount: 0, problemCount: 0, averageScore: null };
      const node = els.skillTemplate.content.firstElementChild.cloneNode(true);
      node.dataset.skillKey = key;
      const icon = node.querySelector(".skill-icon");
      icon.textContent = def.short;
      icon.style.background = def.color;
      node.querySelector("h3").textContent = def.name;
      node.querySelector("small").textContent = def.subtitle;
      node.querySelector(".level-row strong").textContent = `${score}/100`;
      node.querySelector(".level-row span").textContent = `${xp} XP`;
      const fill = node.querySelector(".progress-fill");
      fill.style.width = `${score}%`;
      fill.style.background = def.color;
      const metricRow = document.createElement("div");
      metricRow.className = "skill-card-metrics";
      metricRow.innerHTML = `
        <span><b>${stats.practiceCount}</b><small>${escape(text("practiceCount"))}</small></span>
        <span><b>${stats.problemCount}</b><small>${escape(text("practicedProblems"))}</small></span>
        <span><b>${stats.averageScore == null ? "-" : Math.round(stats.averageScore)}</b><small>${escape(text("averageScore"))}</small></span>
      `;
      const subskills = node.querySelector(".subskills");
      def.subskills.forEach((label) => {
        const span = document.createElement("span");
        span.textContent = label;
        subskills.appendChild(span);
      });
      node.insertBefore(metricRow, subskills);
      node.addEventListener("mouseenter", (event) => setHover(key, event));
      node.addEventListener("mousemove", (event) => setHover(key, event));
      node.addEventListener("mouseleave", clearHover);
      node.addEventListener("focusin", () => setHover(key));
      node.addEventListener("focusout", clearHover);
      els.skillsGrid.appendChild(node);
    });
    drawRadar();
    updateLegendHighlight(getRadarHoverKey() || "");
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.skillRadar, "mousemove", (event) => handleRadarMove(event));
      bind(els.skillRadar, "mouseleave", clearHover);
      bind(els.skillRadar, "focus", () => focusFirstSkill());
      bind(els.skillRadar, "blur", clearHover);
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
