import { useEffect, useRef } from "react";
import { useSkillsPageModel } from "./skillsHooks.js";

export function SkillsPageContent() {
  const model = useSkillsPageModel();
  const canvasRef = useRef(null);

  useEffect(() => {
    model.bindRadar(canvasRef.current);
    model.refreshIcons?.();
  });

  return (
    <section className="skills-section">
      <div className="section-heading">
        <div>
          <h2 id="skillsPageTitle">{model.t("skills") || "能力值"}</h2>
          <small id="skillsPageSubtitle">
            {model.t("skillPageSubtitle") || "把训练记录、题目表现和面试反馈汇总成 quant readiness score。"}
          </small>
        </div>
      </div>
      <div className="skill-value-hero">
        <article className="skill-score-panel">
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
        <article className="skill-radar-panel">
          <div className="skill-radar-header">
            <div>
              <h3 id="skillRadarTitle">{model.t("skillRadarTitle") || "能力雷达"}</h3>
              <small id="skillRadarHint">
                {model.t("skillRadarHint") || "悬停到能力点或右侧分数，查看做题情况和平均得分。"}
              </small>
            </div>
            <img
              className="skill-radar-coach"
              src="assets/generated/mascot-teacher-chart.webp?v=premium-system-2"
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
                onMouseMove={model.handleRadarMove}
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
      <div id="skillsGrid" className="skills-grid">
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
