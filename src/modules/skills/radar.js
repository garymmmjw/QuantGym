export function createSkillRadarController(deps = {}) {
  let hitAreas = [];
  let hoverKey = "";
  let animatedValues = null;
  let targetValues = null;
  let animationFrame = 0;

  const getElements = () => deps.elements || {};
  const getSkillDefs = () => deps.skillDefs || {};
  const getSkills = () => deps.getSkills?.() || {};
  const getSkillScore = (xp) => deps.getSkillScore?.(xp) || 0;
  const getPracticeStats = (skillKey) => deps.getPracticeStats?.(skillKey) || {};
  const text = (key) => deps.t?.(key) || key;
  const escape = (value) => deps.escapeHtml?.(String(value ?? "")) ?? String(value ?? "");
  const getDocument = () => deps.documentRef || globalThis.document;
  const now = () => deps.performanceRef?.now?.() ?? globalThis.performance?.now?.() ?? Date.now();
  const requestFrame = (callback) => {
    const request = deps.requestAnimationFrame || globalThis.requestAnimationFrame || ((fn) => setTimeout(() => fn(now()), 16));
    return request(callback);
  };
  const cancelFrame = (frame) => {
    const cancel = deps.cancelAnimationFrame || globalThis.cancelAnimationFrame || clearTimeout;
    cancel(frame);
  };

  function handleMove(event) {
    const canvas = getElements().skillRadar;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) * (canvas.width / rect.width);
    const y = (event.clientY - rect.top) * (canvas.height / rect.height);
    const hit = hitAreas
      .map((area) => ({ ...area, distance: Math.hypot(area.x - x, area.y - y) }))
      .filter((area) => area.distance <= area.radius)
      .sort((a, b) => a.distance - b.distance)[0];
    if (!hit) {
      clearHover();
      return;
    }
    setHover(hit.key, event);
  }

  function setHover(skillKey, event) {
    const skillDefs = getSkillDefs();
    if (!skillDefs[skillKey]) return;
    const changed = hoverKey !== skillKey;
    hoverKey = skillKey;
    if (changed) draw(skillKey);
    updateLegendHighlight(skillKey);
    showTooltip(skillKey, event);
  }

  function clearHover() {
    if (!hoverKey) {
      hideTooltip();
      return;
    }
    hoverKey = "";
    draw();
    updateLegendHighlight("");
    hideTooltip();
  }

  function updateLegendHighlight(skillKey) {
    const documentRef = getDocument();
    documentRef?.querySelectorAll?.("[data-skill-radar-key]").forEach((row) => {
      row.classList.toggle("is-active", row.dataset.skillRadarKey === skillKey);
    });
    documentRef?.querySelectorAll?.("[data-skill-key]").forEach((card) => {
      card.classList.toggle("is-active", card.dataset.skillKey === skillKey);
    });
  }

  function showTooltip(skillKey, event) {
    const { skillRadarTooltip: tooltip, skillRadar: canvas } = getElements();
    if (!tooltip || !canvas) return;
    const def = getSkillDefs()[skillKey];
    const stats = getPracticeStats(skillKey);
    tooltip.innerHTML = `
      <strong>${escape(def.name)} · ${stats.score}/100</strong>
      <span>${escape(text("practiceCount"))}: ${stats.practiceCount}</span>
      <span>${escape(text("practicedProblems"))}: ${stats.problemCount}</span>
      <span>${escape(text("averageScore"))}: ${stats.averageScore == null ? escape(text("noPracticeYet")) : `${Math.round(stats.averageScore)}/100`}</span>
      <span>${escape(text("skillXp"))}: ${stats.xp}</span>
      <em>${escape(stats.latestText ? `${text("latestPractice")}: ${stats.latestText}` : text("noPracticeYet"))}</em>
    `;
    tooltip.classList.remove("hidden");
    const wrapperRect = canvas.parentElement.getBoundingClientRect();
    const left = event ? event.clientX - wrapperRect.left + 14 : wrapperRect.width * 0.56;
    const top = event ? event.clientY - wrapperRect.top : wrapperRect.height * 0.45;
    tooltip.style.left = `${Math.min(Math.max(16, left), wrapperRect.width - 260)}px`;
    tooltip.style.top = `${Math.min(Math.max(18, top), wrapperRect.height - 126)}px`;
  }

  function hideTooltip() {
    getElements().skillRadarTooltip?.classList.add("hidden");
  }

  function draw(highlightKey = hoverKey, options = {}) {
    const canvas = getElements().skillRadar;
    if (!canvas) return;
    const skillDefs = getSkillDefs();
    const skills = getSkills();
    const keys = Object.keys(skillDefs);
    const targets = keys.map((key) => getSkillScore(skills?.[key] || 0) / 100);
    const shouldAnimate = options.animate !== false && (!targetValues || !sameRadarValues(targets, targetValues));
    targetValues = targets;
    if (!animatedValues) animatedValues = targets.map(() => 0);
    if (shouldAnimate) {
      const from = [...animatedValues];
      const start = now();
      const duration = 720;
      if (animationFrame) cancelFrame(animationFrame);
      const animate = (time) => {
        const progress = easeOutCubic(Math.min(1, (time - start) / duration));
        animatedValues = targets.map((target, index) => from[index] + (target - from[index]) * progress);
        renderCanvas(highlightKey, animatedValues);
        if (progress < 1) {
          animationFrame = requestFrame(animate);
        } else {
          animationFrame = 0;
          animatedValues = [...targets];
          renderCanvas(highlightKey, animatedValues);
        }
      };
      animationFrame = requestFrame(animate);
      return;
    }
    renderCanvas(highlightKey, animatedValues || targets);
  }

  function renderCanvas(highlightKey, values) {
    const canvas = getElements().skillRadar;
    if (!canvas) return;
    const skillDefs = getSkillDefs();
    const skills = getSkills();
    const ctx = canvas.getContext("2d");
    const width = canvas.width;
    const height = canvas.height;
    ctx.clearRect(0, 0, width, height);
    hitAreas = [];

    const keys = Object.keys(skillDefs);
    const center = { x: width / 2, y: height / 2 + 2 };
    const radius = Math.min(width, height) * 0.35;
    const time = now() / 1000;

    const panelGradient = ctx.createRadialGradient(center.x, center.y, 12, center.x, center.y, radius * 1.72);
    panelGradient.addColorStop(0, "rgba(255,255,255,0.96)");
    panelGradient.addColorStop(0.48, "rgba(247,244,255,0.88)");
    panelGradient.addColorStop(1, "rgba(255,252,247,0.98)");
    ctx.fillStyle = panelGradient;
    roundRect(ctx, 10, 10, width - 20, height - 20, 26);
    ctx.fill();
    ctx.save();
    ctx.shadowColor = "rgba(99, 91, 255, 0.18)";
    ctx.shadowBlur = 28;
    ctx.strokeStyle = "rgba(222, 216, 255, 0.74)";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(center.x, center.y, radius * 1.18, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();

    for (let ring = 1; ring <= 4; ring += 1) {
      const points = keys.map((_, index) => radarPoint(index, keys.length, radius * (ring / 4), center));
      ctx.strokeStyle = ring === 4 ? "rgba(167, 139, 250, 0.58)" : "rgba(185, 174, 228, 0.26)";
      ctx.lineWidth = ring === 4 ? 2 : 1;
      drawPolygon(ctx, points, false);
    }

    keys.forEach((key, index) => {
      const outer = radarPoint(index, keys.length, radius, center);
      const orbit = radarPoint(index, keys.length, radius * 1.18, center);
      const pulse = 1 + Math.sin(time * 2.8 + index) * 0.08;
      ctx.beginPath();
      ctx.moveTo(center.x, center.y);
      ctx.lineTo(outer.x, outer.y);
      ctx.strokeStyle = key === highlightKey ? "rgba(99, 91, 255, 0.92)" : "rgba(154, 156, 175, 0.28)";
      ctx.lineWidth = key === highlightKey ? 2 : 1;
      ctx.stroke();

      ctx.save();
      ctx.shadowColor = key === highlightKey ? "rgba(99, 91, 255, 0.36)" : "rgba(99, 91, 255, 0.14)";
      ctx.shadowBlur = key === highlightKey ? 18 : 10;
      ctx.fillStyle = "#ffffff";
      ctx.strokeStyle = key === highlightKey ? "#9f8cff" : "rgba(222, 216, 255, 0.9)";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.arc(orbit.x, orbit.y, (key === highlightKey ? 13 : 10) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = skillDefs[key].color;
      ctx.beginPath();
      ctx.arc(orbit.x, orbit.y, (key === highlightKey ? 4.5 : 3.4) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();

      const score = getSkillScore(skills?.[key] || 0);
      const label = radarPoint(index, keys.length, radius + 65, center);
      ctx.fillStyle = key === highlightKey ? "#17171f" : skillDefs[key].color;
      ctx.font = `${key === highlightKey ? "900" : "800"} 16px Inter, system-ui, sans-serif`;
      ctx.textAlign = label.x < center.x - 5 ? "right" : label.x > center.x + 5 ? "left" : "center";
      ctx.textBaseline = "bottom";
      ctx.fillText(skillDefs[key].short, label.x, label.y);
      ctx.fillStyle = key === highlightKey ? "#635bff" : "#64677a";
      ctx.font = "800 12px Inter, system-ui, sans-serif";
      ctx.textBaseline = "top";
      ctx.fillText(`${score}/100`, label.x, label.y + 5);
      hitAreas.push({ key, x: label.x, y: label.y, radius: 54 });
      hitAreas.push({ key, x: orbit.x, y: orbit.y, radius: 24 });
    });

    const referenceValues = keys.map((_, index) => 0.78 - (index % 3) * 0.08);
    const referencePoints = referenceValues.map((value, index) => radarPoint(index, keys.length, radius * value, center));
    ctx.fillStyle = "rgba(99, 91, 255, 0.035)";
    ctx.strokeStyle = "rgba(99, 91, 255, 0.18)";
    ctx.lineWidth = 1.5;
    drawPolygon(ctx, referencePoints, true);

    const points = values.map((value, index) => radarPoint(index, keys.length, radius * Math.max(value, 0.08), center));
    ctx.save();
    ctx.shadowColor = "rgba(99, 91, 255, 0.36)";
    ctx.shadowBlur = 22;
    const fillGradient = ctx.createLinearGradient(center.x - radius, center.y - radius, center.x + radius, center.y + radius);
    fillGradient.addColorStop(0, "rgba(94, 204, 255, 0.34)");
    fillGradient.addColorStop(0.46, "rgba(99, 91, 255, 0.31)");
    fillGradient.addColorStop(1, "rgba(207, 101, 255, 0.38)");
    ctx.fillStyle = fillGradient;
    ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
    ctx.lineWidth = 4;
    drawPolygon(ctx, points, true);
    ctx.restore();

    ctx.strokeStyle = "rgba(99, 91, 255, 0.82)";
    ctx.lineWidth = 2;
    drawPolygon(ctx, points, false);

    points.forEach((point, index) => {
      const key = keys[index];
      const pulse = 1 + Math.sin(time * 4 + index * 0.8) * 0.08;
      hitAreas.push({ key, x: point.x, y: point.y, radius: 28 });
      ctx.save();
      ctx.shadowColor = key === highlightKey ? "rgba(99, 91, 255, 0.48)" : "rgba(113, 142, 255, 0.22)";
      ctx.shadowBlur = key === highlightKey ? 20 : 12;
      ctx.beginPath();
      ctx.fillStyle = "#ffffff";
      ctx.arc(point.x, point.y, (key === highlightKey ? 10 : 7) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.lineWidth = key === highlightKey ? 4 : 3;
      ctx.strokeStyle = key === highlightKey ? "#9f8cff" : "rgba(255,255,255,0.94)";
      ctx.stroke();
      ctx.fillStyle = key === highlightKey ? "#635bff" : skillDefs[key].color;
      ctx.beginPath();
      ctx.arc(point.x, point.y, (key === highlightKey ? 4.2 : 3.2) * pulse, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });
  }

  return {
    handleMove,
    setHover,
    clearHover,
    updateLegendHighlight,
    draw,
    getHoverKey() {
      return hoverKey;
    },
    focusFirst() {
      setHover(Object.keys(getSkillDefs())[0] || "");
    }
  };
}

function sameRadarValues(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.001);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function radarPoint(index, count, radius, center) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPolygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();
}
