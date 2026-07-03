import { useCallback, useEffect, useRef } from "react";
import { useSkillsPageModel } from "./skillsHooks.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";

export function SkillsPageContent() {
  const model = useSkillsPageModel();
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    model.bindRadar(canvas);
    const frame = window.requestAnimationFrame(() => {
      drawFallbackSkillRadar(canvas, model.cards, model.hoverKey);
    });
    return () => window.cancelAnimationFrame(frame);
  }, [model.bindRadar, model.summary, model.cards, model.hoverKey]);

  const handleRadarMove = useCallback((event) => {
    model.handleRadarMove(event);
    const fallbackKey = getFallbackRadarHit(canvasRef.current, model.cards, event);
    if (fallbackKey && fallbackKey !== model.hoverKey) model.setHover(fallbackKey, event);
  }, [model]);

  useScopedRefreshIcons(model.refreshIcons, ".skills-section", [model.cards, model.summary]);

  return (
    <section className="skills-section qg-growth-page qg-skills-page">
      <div className="section-heading">
        <div>
          <h2 id="skillsPageTitle">{model.t("skills") || "能力值"}</h2>
          <small id="skillsPageSubtitle">
            {model.t("skillPageSubtitle") || "把训练记录、题目表现和面试反馈汇总成 quant readiness score。"}
          </small>
        </div>
      </div>
      <div className="skill-value-hero">
        <article className="skill-score-panel qg-skills-score">
          <span className="rank-label" id="skillsScoreLabel">{model.t("quantScore") || "Quant Score"}</span>
          <div className="skill-score-number" aria-live="polite">
            <strong id="skillsScoreValue">{model.formatScore(model.summary.score)}</strong>
            <span>/100</span>
          </div>
          <p id="skillsScoreCopy">
            {model.t("skillScoreCopy") || "分数来自九个能力维度。继续刷题、模拟面试和记录训练，能力值会自动更新。"}
          </p>
          <div className="skill-score-meta">
            <span>
              <b id="skillsEntriesCount">{model.summary.practiceCount}</b>
              <small id="skillsEntriesLabel">{model.t("practiceCount") || "训练记录"}</small>
            </span>
            <span>
              <b id="skillsAverageScore">
                {model.summary.averageScore == null ? "-" : Math.round(model.summary.averageScore)}
              </b>
              <small id="skillsAverageLabel">{model.t("averageScore") || "平均得分"}</small>
            </span>
            <span>
              <b id="skillsWeakestSkill">{model.summary.weakestLabel}</b>
              <small id="skillsWeakestLabel">{model.t("weakestSkill") || "优先补强"}</small>
            </span>
          </div>
        </article>
        <article className="skill-radar-panel qg-skills-radar">
          <div className="skill-radar-header">
            <div>
              <h3 id="skillRadarTitle">{model.t("skillRadarTitle") || "能力雷达"}</h3>
              <small id="skillRadarHint">
                {model.t("skillRadarHint") || "悬停到能力点或右侧分数，查看做题情况和平均得分。"}
              </small>
            </div>
            <img
              className="skill-radar-coach"
              src="/assets/generated/playful-precision/avatar-focused-v2.png"
              alt=""
              loading="lazy"
            />
          </div>
          <div className="skill-radar-visual">
            <div className="skill-radar-canvas-wrap">
              <canvas
                ref={canvasRef}
                id="skillRadar"
                width={680}
                height={440}
                aria-label="能力值雷达图"
                onMouseMove={handleRadarMove}
                onMouseLeave={model.clearHover}
                onFocus={model.focusFirstSkill}
                onBlur={model.clearHover}
              />
              <div
                id="skillRadarTooltip"
                className={`skill-radar-tooltip${model.activeSkill ? "" : " hidden"}`}
                role="status"
                style={model.activeSkill ? { left: "56%", top: "45%" } : undefined}
              >
                {model.activeSkill ? (
                  <>
                    <strong>{model.activeSkill.def.name} · {model.activeSkill.score}/100</strong>
                    <span>{model.t("practiceCount")}: {model.activeSkill.stats.practiceCount}</span>
                    <span>{model.t("practicedProblems")}: {model.activeSkill.stats.problemCount}</span>
                    <span>
                      {model.t("averageScore")}: {model.activeSkill.stats.averageScore == null
                        ? model.t("noPracticeYet")
                        : `${Math.round(model.activeSkill.stats.averageScore)}/100`}
                    </span>
                    <span>{model.t("skillXp")}: {model.activeSkill.xp}</span>
                    <em>
                      {model.activeSkill.stats.latestText
                        ? `${model.t("latestPractice")}: ${model.activeSkill.stats.latestText}`
                        : model.t("noPracticeYet")}
                    </em>
                  </>
                ) : null}
              </div>
            </div>
            <div id="skillRadarLegend" className="skill-radar-legend" aria-label="能力分数">
              {model.cards.map(({ key, def, score }) => (
                <button
                  className={`skill-radar-legend-row${model.hoverKey === key ? " is-active" : ""}`}
                  type="button"
                  key={key}
                  data-skill-radar-key={key}
                  onMouseEnter={(event) => model.setHover(key, event)}
                  onMouseMove={(event) => model.setHover(key, event)}
                  onClick={(event) => model.setHover(key, event)}
                  onMouseLeave={model.clearHover}
                  onFocus={() => model.setHover(key)}
                  onBlur={model.clearHover}
                >
                  <span className="legend-dot" style={{ background: def.color }} />
                  <span>{def.name}</span>
                  <strong>{score}/100</strong>
                </button>
              ))}
            </div>
          </div>
        </article>
      </div>
      <div id="skillsGrid" className="skills-grid qg-skill-grid">
        {model.cards.map(({ key, def, xp, score, stats }) => (
          <article
            className={`skill-card${model.hoverKey === key ? " is-active" : ""}`}
            key={key}
            data-skill-key={key}
            onMouseEnter={(event) => model.setHover(key, event)}
            onMouseMove={(event) => model.setHover(key, event)}
            onMouseLeave={model.clearHover}
            onFocus={() => model.setHover(key)}
            onBlur={model.clearHover}
          >
            <div className="skill-head">
              <span className="skill-icon" style={{ background: def.color }}>{def.short}</span>
              <div>
                <h3>{def.name}</h3>
                <small>{def.subtitle}</small>
              </div>
            </div>
            <div className="level-row">
              <strong>{score}/100</strong>
              <span>{xp} XP</span>
            </div>
            <div className="progress-track">
              <div className="progress-fill" style={{ width: `${score}%`, background: def.color }} />
            </div>
            <div className="skill-card-metrics">
              <span><b>{stats.practiceCount}</b><small>{model.t("practiceCount") || "训练次数"}</small></span>
              <span><b>{stats.problemCount}</b><small>{model.t("practicedProblems") || "练过题目"}</small></span>
              <span>
                <b>{stats.averageScore == null ? "-" : Math.round(stats.averageScore)}</b>
                <small>{model.t("averageScore") || "平均得分"}</small>
              </span>
            </div>
            <div className="subskills">
              {def.subskills.map((label) => <span key={label}>{label}</span>)}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}

function drawFallbackSkillRadar(canvas, cards = [], hoverKey = "") {
  if (!canvas || !cards.length) return;
  const ctx = canvas.getContext("2d");
  if (!ctx) return;

  const width = canvas.width;
  const height = canvas.height;
  const styles = getComputedStyle(document.documentElement);
  const surface = cssVar(styles, "--qg-surface", "#ffffff");
  const surface2 = cssVar(styles, "--qg-surface-2", "#fbfbfd");
  const text = cssVar(styles, "--qg-text", "#1b1a38");
  const muted = cssVar(styles, "--qg-muted", "#6d6c8e");
  const border = cssVar(styles, "--qg-border", "#ecebf7");
  const brand = cssVar(styles, "--qg-brand", "#5b5ff5");
  const center = { x: width / 2, y: height / 2 + 8 };
  const radius = Math.min(width, height) * 0.31;
  const keys = cards.map((card) => card.key);

  ctx.clearRect(0, 0, width, height);
  const panelGradient = ctx.createLinearGradient(0, 0, width, height);
  panelGradient.addColorStop(0, surface);
  panelGradient.addColorStop(1, surface2);
  ctx.fillStyle = panelGradient;
  roundedRect(ctx, 10, 10, width - 20, height - 20, 26);
  ctx.fill();

  for (let ring = 1; ring <= 4; ring += 1) {
    const points = keys.map((_, index) => radarPoint(index, keys.length, radius * (ring / 4), center));
    ctx.strokeStyle = ring === 4 ? brand : border;
    ctx.globalAlpha = ring === 4 ? 0.42 : 0.86;
    ctx.lineWidth = ring === 4 ? 1.8 : 1;
    drawPolygon(ctx, points, false);
  }
  ctx.globalAlpha = 1;

  cards.forEach((card, index) => {
    const axis = radarPoint(index, cards.length, radius, center);
    const label = radarPoint(index, cards.length, radius + 54, center);
    const isActive = card.key === hoverKey;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(axis.x, axis.y);
    ctx.strokeStyle = isActive ? brand : border;
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = card.def?.color || brand;
    ctx.beginPath();
    ctx.arc(axis.x, axis.y, isActive ? 5 : 3.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = isActive ? text : muted;
    ctx.font = `${isActive ? 900 : 800} 11px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = label.x < center.x - 8 ? "right" : label.x > center.x + 8 ? "left" : "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(card.def?.short || card.key, label.x, label.y);
    ctx.fillStyle = isActive ? brand : muted;
    ctx.font = '700 10px "Space Grotesk", system-ui, sans-serif';
    ctx.textBaseline = "top";
    ctx.fillText(`${Math.round(card.score || 0)}/100`, label.x, label.y + 4);
  });

  const values = cards.map((card) => Math.max(0.08, Math.min(1, Number(card.score || 0) / 100)));
  const points = values.map((value, index) => radarPoint(index, cards.length, radius * value, center));
  const fillGradient = ctx.createLinearGradient(center.x - radius, center.y - radius, center.x + radius, center.y + radius);
  fillGradient.addColorStop(0, "rgba(91, 95, 245, 0.30)");
  fillGradient.addColorStop(0.55, "rgba(22, 160, 106, 0.18)");
  fillGradient.addColorStop(1, "rgba(255, 159, 46, 0.20)");
  ctx.fillStyle = fillGradient;
  ctx.strokeStyle = brand;
  ctx.lineWidth = 2.5;
  drawPolygon(ctx, points, true);

  points.forEach((point, index) => {
    const card = cards[index];
    const isActive = card.key === hoverKey;
    ctx.save();
    ctx.shadowColor = isActive ? "rgba(91, 95, 245, 0.35)" : "rgba(91, 95, 245, 0.18)";
    ctx.shadowBlur = isActive ? 16 : 9;
    ctx.fillStyle = surface;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isActive ? 9 : 7, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = isActive ? brand : "rgba(255, 255, 255, 0.9)";
    ctx.lineWidth = isActive ? 3 : 2;
    ctx.stroke();
    ctx.fillStyle = card.def?.color || brand;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isActive ? 4 : 3, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function getFallbackRadarHit(canvas, cards = [], event) {
  if (!canvas || !cards.length || !event) return "";
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / Math.max(1, rect.width);
  const scaleY = canvas.height / Math.max(1, rect.height);
  const x = (event.clientX - rect.left) * scaleX;
  const y = (event.clientY - rect.top) * scaleY;
  const center = { x: canvas.width / 2, y: canvas.height / 2 + 8 };
  const radius = Math.min(canvas.width, canvas.height) * 0.31;
  const hits = cards.flatMap((card, index) => {
    const value = Math.max(0.08, Math.min(1, Number(card.score || 0) / 100));
    const point = radarPoint(index, cards.length, radius * value, center);
    const label = radarPoint(index, cards.length, radius + 54, center);
    return [
      { key: card.key, distance: Math.hypot(point.x - x, point.y - y), radius: 28 },
      { key: card.key, distance: Math.hypot(label.x - x, label.y - y), radius: 48 }
    ];
  });
  return hits
    .filter((hit) => hit.distance <= hit.radius)
    .sort((left, right) => left.distance - right.distance)[0]?.key || "";
}

function radarPoint(index, total, radius, center) {
  const angle = -Math.PI / 2 + (Math.PI * 2 * index) / Math.max(1, total);
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function drawPolygon(ctx, points, fill) {
  if (!points.length) return;
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();
}

function roundedRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.lineTo(x + width - radius, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
  ctx.lineTo(x + width, y + height - radius);
  ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
  ctx.lineTo(x + radius, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
  ctx.lineTo(x, y + radius);
  ctx.quadraticCurveTo(x, y, x + radius, y);
  ctx.closePath();
}

function cssVar(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}
