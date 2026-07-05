import { useCallback, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useSkillsPageModel } from "./skillsHooks.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import {
  getSkillDisplayName,
  getSkillDisplayPair,
  getSkillPracticeCategoryZh,
  getSkillRadarLabel
} from "./skillDisplayLabels.js";

const SKILL_ICON_KIND = {
  probabilityExpectation: "prob",
  complexNumbers: "prob",
  statistics: "stat",
  market: "stat",
  calculus: "calc",
  algebra: "calc",
  linearAlgebra: "calc",
  optimization: "deriv",
  option: "deriv",
  machineLearning: "deriv",
  deepLearning: "deriv",
  leetcode: "code",
  cppProgramming: "code",
  pandasNumpy: "code",
  mentalMath: "speed"
};

const SKILL_GLYPH_PATHS = {
  prob: ["M4 18L18 4", "M7 7h.01", "M15 17h.01"],
  calc: ["M8 7h8", "M8.5 12h.01M12 12h.01M15.5 12h.01M8.5 16h.01M12 16h.01"],
  stat: ["M4 19V5", "M4 19h16", "M8 16v-4M12 16V8M16 16v-6"],
  deriv: ["M4 16c4 0 4-8 8-8s4 8 8 8"],
  code: ["M9 8l-4 4 4 4", "M15 8l4 4-4 4"],
  speed: ["M12 13V9", "M9 3h6"]
};

function SkillGlyph({ kind }) {
  const paths = SKILL_GLYPH_PATHS[kind];
  if (!paths) return null;
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="1.9"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      style={{ width: 17, height: 17, display: "block" }}
    >
      {kind === "calc" ? <rect x="4" y="3" width="16" height="18" rx="3" /> : null}
      {kind === "speed" ? <circle cx="12" cy="13" r="8" /> : null}
      {paths.map((d) => <path key={d.slice(0, 8)} d={d} />)}
    </svg>
  );
}

export function SkillsPageContent() {
  const model = useSkillsPageModel();
  const navigate = useNavigate();
  const canvasRef = useRef(null);

  const goPractice = useCallback((event) => {
    if (event) event.stopPropagation();
    navigate("/problems");
  }, [navigate]);

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

  const weakest = useMemo(() => {
    if (!model.cards.length) return null;
    return model.cards.reduce(
      (lowest, card) => (card.score < lowest.score ? card : lowest),
      model.cards[0]
    );
  }, [model.cards]);

  return (
    <section className="skills-section qg-growth-page qg-skills-page">
      <div className="section-heading qg-skills-heading">
        <div>
          <span className="hero-kicker qg-skills-kicker">GROWTH · 能力雷达</span>
          <h2 id="skillsPageTitle">{model.t("skills") || "能力值"} <span className="qg-skills-title-en">Skills</span></h2>
          <small id="skillsPageSubtitle">六维能力画像 · 找到弱项，精准补强</small>
        </div>
        <div className="qg-skills-headline-stats">
          <div className="qg-skills-stat">
            <span id="skillsScoreLabel">综合评级</span>
            <strong id="skillsScoreValue" aria-live="polite">{model.tier}</strong>
          </div>
          <div className="qg-skills-stat qg-skills-stat-brand">
            <span id="skillsAverageLabel">本周提升</span>
            <strong id="skillsAverageScore">
              {`${model.weekly.weeklyDelta >= 0 ? "+" : ""}${model.weekly.weeklyDelta}%`}
            </strong>
          </div>
        </div>
      </div>

      <div className="qg-skills-main">
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
                    <strong>{getSkillDisplayName(model.activeSkill.key, model.activeSkill.def)} · {model.activeSkill.score}/100</strong>
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
            <div className="skill-radar-caption">
              <span className="skill-radar-caption-you"><i />你的能力</span>
              <span className="skill-radar-caption-target"><i />目标段位</span>
            </div>
          </div>
        </article>

        <div id="skillRadarLegend" className="skill-radar-legend qg-skills-rows" aria-label="能力分数">
          {model.cards.map(({ key, def, score }) => {
            const delta = model.weekly.deltas[key] || 0;
            const glyphKind = SKILL_ICON_KIND[key];
            const pair = getSkillDisplayPair(key, def);
            return (
              <button
                className={`skill-radar-legend-row qg-skill-row${model.hoverKey === key ? " is-active" : ""}`}
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
                <span className="qg-skill-row-icon" style={{ background: `${def.color}1a`, color: def.color }}>
                  {glyphKind ? <SkillGlyph kind={glyphKind} /> : def.short}
                </span>
                <span className="qg-skill-row-body">
                  <span className="qg-skill-row-name">{pair.title}</span>
                  <span className="qg-skill-row-sub">{pair.sub}</span>
                </span>
                <span className="legend-dot" style={{ background: def.color }} />
                {delta !== 0 ? (
                  <span className={`qg-skill-row-trend ${delta > 0 ? "is-up" : "is-down"}`}>
                    {delta > 0 ? `▲ ${delta}` : `▼ ${Math.abs(delta)}`}
                  </span>
                ) : null}
                <strong className="qg-skill-row-score" style={{ color: def.color }}>{score}</strong>
                <span
                  className="qg-skill-row-cta"
                  role="link"
                  tabIndex={-1}
                  onClick={goPractice}
                >
                  去练
                </span>
                <span className="qg-skill-row-track">
                  <span
                    className="qg-skill-row-fill"
                    style={{ width: `${score}%`, background: `linear-gradient(90deg, ${def.color}, ${def.color}aa)` }}
                  />
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="qg-skills-footer">
        <article className="qg-skills-coach">
          <img
            className="qg-skills-coach-avatar"
            src="/assets/generated/playful-precision/avatar-focused-v2.png"
            alt=""
            loading="lazy"
          />
          <div className="qg-skills-coach-body">
            <span className="qg-skills-coach-kicker">弱项建议 · COACH</span>
            <p className="qg-skills-coach-copy">
              {weakest
                ? <>「{getSkillDisplayName(weakest.key, weakest.def)}」是你目前最弱的一环（<b>{weakest.score}</b>）。建议本周去<span> 题目 → {getSkillPracticeCategoryZh(weakest.key, weakest.def)} </span>集中补强，稳步拉高整体能力值。</>
                : <>继续刷题、模拟面试和记录训练，弱项建议会在这里出现。</>}
            </p>
            <button type="button" className="qg-skills-coach-cta" onClick={goPractice}>
              去刷{weakest ? getSkillRadarLabel(weakest.key, weakest.def) : ""}弱项 →
            </button>
          </div>
        </article>

        <article className="qg-skills-trend">
          <h3>近 4 周趋势</h3>
          <div className="qg-skills-trend-bars">
            {model.weekly.trend.map((week, index) => (
              <div className="qg-skills-trend-col" key={week.label}>
                <div className="qg-skills-trend-slot">
                  <span
                    className={`qg-skills-trend-bar${index === model.weekly.trend.length - 1 ? " is-current" : ""}`}
                    style={{ height: `${Math.max(0, Math.min(100, week.score))}%` }}
                  />
                </div>
                <span className="qg-skills-trend-label">{week.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="qg-skills-summary">
          <p id="skillsScoreCopy">
            {model.t("skillScoreCopy") || "分数来自九个能力维度。继续刷题、模拟面试和记录训练，能力值会自动更新。"}
          </p>
          <div className="qg-skills-summary-meta">
            <span>
              <b id="skillsEntriesCount">{model.summary.practiceCount}</b>
              <small id="skillsEntriesLabel">{model.t("practiceCount") || "训练记录"}</small>
            </span>
            <span>
              <b id="skillsWeakestSkill">
                {weakest ? getSkillDisplayName(weakest.key, weakest.def) : model.summary.weakestLabel}
              </b>
              <small id="skillsWeakestLabel">{model.t("weakestSkill") || "优先补强"}</small>
            </span>
          </div>
        </article>
      </div>

      <div className="qg-skills-detail-head">
        <h3>各维度明细</h3>
        <small>训练次数、练过题目与平均得分，逐维度拆解你的能力画像。</small>
      </div>
      <div id="skillsGrid" className="skills-grid qg-skill-grid">
        {model.cards.map(({ key, def, xp, score, stats }) => {
          const pair = getSkillDisplayPair(key, def);
          return (
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
                <h3>{pair.title}</h3>
                <small>{pair.sub}</small>
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
          );
        })}
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
  const text = cssVar(styles, "--qg-text", "#1b1a38");
  const text2 = cssVar(styles, "--qg-text-2", "#4a4966");
  const border = cssVar(styles, "--qg-border", "#ecebf7");
  const brand = cssVar(styles, "--qg-brand", "#5b5ff5");
  const isDark = document.documentElement.getAttribute("data-qg-theme") === "dark";
  const targetStroke = isDark ? "#5855a9" : "#c9c7f5";
  const center = { x: width / 2, y: height / 2 + 8 };
  const radius = Math.min(width, height) * 0.31;
  const keys = cards.map((card) => card.key);

  ctx.clearRect(0, 0, width, height);

  for (let ring = 1; ring <= 4; ring += 1) {
    const points = keys.map((_, index) => radarPoint(index, keys.length, radius * (ring / 4), center));
    ctx.strokeStyle = border;
    ctx.lineWidth = 1;
    drawPolygon(ctx, points, false);
  }

  cards.forEach((card, index) => {
    const axis = radarPoint(index, cards.length, radius, center);
    const label = radarPoint(index, cards.length, radius + 30, center);
    const isActive = card.key === hoverKey;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(axis.x, axis.y);
    ctx.strokeStyle = isActive ? brand : border;
    ctx.lineWidth = isActive ? 2 : 1;
    ctx.stroke();

    ctx.fillStyle = isActive ? text : text2;
    ctx.font = `${isActive ? 800 : 700} 12px "Plus Jakarta Sans", system-ui, sans-serif`;
    ctx.textAlign = label.x < center.x - 8 ? "right" : label.x > center.x + 8 ? "left" : "center";
    ctx.textBaseline = "middle";
    ctx.fillText(getSkillRadarLabel(card.key, card.def), label.x, label.y);
  });

  // Target-tier dashed polygon (behind the ability polygon)
  const targetPoints = keys.map((_, index) => radarPoint(index, keys.length, radius * 0.8, center));
  ctx.save();
  ctx.setLineDash([4, 4]);
  ctx.strokeStyle = targetStroke;
  ctx.lineWidth = 1.5;
  drawPolygon(ctx, targetPoints, false);
  ctx.restore();

  const values = cards.map((card) => Math.max(0.08, Math.min(1, Number(card.score || 0) / 100)));
  const points = values.map((value, index) => radarPoint(index, cards.length, radius * value, center));
  ctx.fillStyle = hexToRgba(brand, 0.16);
  ctx.strokeStyle = brand;
  ctx.lineWidth = 2.5;
  ctx.lineJoin = "round";
  drawPolygon(ctx, points, true);

  points.forEach((point, index) => {
    const card = cards[index];
    const isActive = card.key === hoverKey;
    ctx.fillStyle = brand;
    ctx.beginPath();
    ctx.arc(point.x, point.y, isActive ? 5.5 : 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = surface;
    ctx.lineWidth = 2;
    ctx.stroke();
  });
}

function hexToRgba(hex, alpha) {
  const value = String(hex || "").trim();
  const match = /^#([0-9a-f]{6})$/i.exec(value);
  if (!match) return `rgba(91, 95, 245, ${alpha})`;
  const num = parseInt(match[1], 16);
  const r = (num >> 16) & 255;
  const g = (num >> 8) & 255;
  const b = num & 255;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
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
    const label = radarPoint(index, cards.length, radius + 30, center);
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

function cssVar(styles, name, fallback) {
  return styles.getPropertyValue(name).trim() || fallback;
}
