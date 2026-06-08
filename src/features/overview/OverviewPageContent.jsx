import { useEffect } from "react";
import { useOverviewPageModel } from "./overviewHooks.js";

function LeaderboardTrend({ delta }) {
  if (delta === null) {
    return <span className="leaderboard-trend new">·</span>;
  }
  if (delta > 0) {
    return (
      <span className="leaderboard-trend up">
        <i data-lucide="arrow-up-right" />
        <b>+{delta}</b>
      </span>
    );
  }
  if (delta < 0) {
    return (
      <span className="leaderboard-trend down">
        <i data-lucide="arrow-down-right" />
        <b>{delta}</b>
      </span>
    );
  }
  return <span className="leaderboard-trend flat">—</span>;
}

function medalClass(rank) {
  if (rank === 1) return "gold";
  if (rank === 2) return "silver";
  if (rank === 3) return "bronze";
  return "plain";
}

export function OverviewPageContent() {
  const model = useOverviewPageModel();
  const { leaderboard } = model;
  const settings = leaderboard.settings || {};
  const scopeSummary = leaderboard.scopeSummary || {};
  const showCountry = settings.scope !== "global";
  const showRegion = settings.scope === "region";
  const updateLeaderboardMetric = (event) => model.updateLeaderboard({ metric: event.target.value });
  const updateLeaderboardScope = (event) => model.updateLeaderboard({ scope: event.target.value });
  const updateLeaderboardCountry = (event) => model.updateLeaderboard({ country: event.target.value });
  const updateLeaderboardRegion = (event) => model.updateLeaderboard({ region: event.target.value });
  const updateLeaderboard = model.updateLeaderboard;

  useEffect(() => {
    const bindings = [
      ["leaderboardMetricSelect", "metric"],
      ["leaderboardScopeSelect", "scope"],
      ["leaderboardCountrySelect", "country"],
      ["leaderboardRegionSelect", "region"]
    ];
    const disposers = bindings.map(([id, key]) => {
      const select = document.getElementById(id);
      if (!select) return null;
      const sync = () => updateLeaderboard({ [key]: select.value });
      const syncAfterKey = () => window.setTimeout(sync, 0);
      select.addEventListener("change", sync);
      select.addEventListener("input", sync);
      select.addEventListener("blur", sync);
      select.addEventListener("keydown", syncAfterKey);
      return () => {
        select.removeEventListener("change", sync);
        select.removeEventListener("input", sync);
        select.removeEventListener("blur", sync);
        select.removeEventListener("keydown", syncAfterKey);
      };
    });
    return () => {
      disposers.forEach((dispose) => dispose?.());
    };
  }, [updateLeaderboard]);

  return (
    <div className="overview-route-page">
      <section className="news-ticker" aria-label="Quant 新闻滚动条" data-i18n-aria-label="newsTickerLabel">
        <div className="ticker-label">
          <i data-lucide="radio" />
          <span data-i18n="newsTickerTitle">{model.t("newsTickerTitle") || "Quant Wire"}</span>
        </div>
        <div className="ticker-viewport">
          <div id="newsTickerTrack" className="news-ticker-track">
            {model.tickerNews.length ? (
              [...model.tickerNews, ...model.tickerNews].map((item, index) => (
                <button
                  className="news-ticker-item"
                  type="button"
                  key={`${item.id}-${index}`}
                  data-news-id={item.id}
                  aria-label={`${item.source} ${item.title}`}
                  onClick={() => model.focusNews(item.id)}
                >
                  <span>{item.source}</span>
                  <strong>{item.title}</strong>
                </button>
              ))
            ) : (
              <button className="news-ticker-item" type="button">
                {model.t("newsTickerEmpty") || "暂无新闻"}
              </button>
            )}
          </div>
        </div>
      </section>

      <section className="quanty-hero">
        <div className="quanty-hero-copy">
          <span className="hero-kicker">Welcome back, Quant</span>
          <h2 id="heroTypewriter">Sharpen your quant edge today.</h2>
          <div className="hero-actions hidden" aria-hidden="true">
            <button
              className="primary-button"
              id="generateStudyPlanBtn"
              type="button"
              tabIndex={-1}
              onClick={model.generateTodayStudyPlan}
            >
              <i data-lucide="calendar-check-2" />
              进入备战计划
            </button>
          </div>
          <div className={`today-plan-card${model.todayPlan ? "" : " hidden"}`} id="todayPlanCard">
            {model.todayPlan ? (
              <>
                <div className="today-plan-top">
                  <strong>{model.t("planTitle") || "今日计划"}</strong>
                  <span>{model.todayPlan.summary}</span>
                </div>
                <ul>
                  {model.todayPlan.items.map((item, index) => (
                    <li key={item.id || `${item.title}-${index}`} className={item.done ? "done" : ""}>
                      <span className="plan-dot">{item.done ? "OK" : item.minutes ? item.minutes : "Q"}</span>
                      <div>
                        <strong>{item.title}</strong>
                        <small>{item.detail}</small>
                      </div>
                    </li>
                  ))}
                </ul>
                <button className="secondary-button today-plan-open" type="button" onClick={() => model.openModule("plan")}>
                  <i data-lucide="arrow-right" />
                  {model.t(model.todayPlan.prepPlanActive ? "todayPlanView" : "todayPlanCreate")}
                </button>
              </>
            ) : null}
          </div>
        </div>
        <div className="shark-stage" id="sharkStage">
          <div className="shark-bubble" id="sharkBubble" role="status" aria-live="polite" />
          <button className="shark-interactive" id="sharkInteractive" type="button" aria-label="戳一下 Quanty">
            <span className="shark-glow" aria-hidden="true" />
            <img
              src="assets/generated/shark-hero-clean.png?v=original-clean-1"
              alt=""
              loading="lazy"
              id="heroShark"
              draggable="false"
            />
          </button>
        </div>
      </section>

      <section className="feature-launch-grid hidden" aria-label="主要功能入口">
        {[
          ["problems", "feature-learn.webp?v=premium-system-2", "题库"],
          ["tools", "feature-practice.webp?v=premium-system-2", "限时训练"],
          ["skills", "feature-quest.webp?v=premium-system-2", "能力值"],
          ["experiences", "feature-notebook.webp?v=premium-system-2", "面经记录"]
        ].map(([moduleId, image, label]) => (
          <button
            className="feature-launch-card"
            type="button"
            key={moduleId}
            data-jump-module={moduleId}
            aria-label={`进入${label}`}
            onClick={() => model.openModule(moduleId)}
          >
            <img src={`assets/generated/${image}`} alt="" loading="lazy" />
            <strong>{label}</strong>
          </button>
        ))}
      </section>

      <section className="summary-band">
        <div className="summary-copy">
          <div className="rank-row">
            <span className="rank-label">当前段位</span>
            <strong id="rankName">{model.summary.rank}</strong>
          </div>
          <div className="total-xp">
            <span id="totalXp">{model.formatScore(model.summary.score)}</span>
            <span>分 / 100</span>
          </div>
        </div>
        <div className="summary-metrics" aria-label="学习统计">
          <div className="metric-card metric-streak">
            <span id="streakCount">{model.summary.streak}</span>
            <small>连续天数</small>
          </div>
          <div className="metric-card metric-records">
            <span id="entryCount">{model.summary.entryCount}</span>
            <small>记录</small>
          </div>
          <div className="metric-card metric-xp">
            <span id="weeklyXp">{model.summary.weeklyXp}</span>
            <small>7 日 XP</small>
          </div>
        </div>
      </section>

      <section className="overview-effect-grid" aria-label="训练进度可视化">
        <article className="overview-effect-panel problem-progress-panel">
          <div className="effect-panel-heading">
            <div>
              <span className="rank-label">PROGRESS</span>
              <h2>Problem completion</h2>
            </div>
            <button
              className="icon-button ghost"
              type="button"
              title="打开题库"
              aria-label="打开题库"
              onClick={() => model.openModule("problems")}
            >
              <i data-lucide="arrow-up-right" />
            </button>
          </div>
          <div id="overviewProblemProgress" className="effect-progress-group">
            {model.problemProgress.map((item) => (
              <div
                className="effect-progress-row"
                key={item.key}
                style={{ "--value": String(item.percent), "--accent-index": String(item.accentIndex) }}
              >
                <div>
                  <strong>{item.label}</strong>
                  <span>{item.done} / {item.total}</span>
                </div>
                <i aria-hidden="true"><span /></i>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-effect-panel daily-xp-panel">
          <div className="effect-panel-heading">
            <div>
              <span className="rank-label">DAILY XP</span>
              <h2>Experience rhythm</h2>
            </div>
          </div>
          <div id="overviewXpBars" className="daily-xp-bars" aria-label="每日经验值柱状图">
            {model.dailyXpBars.map((item) => (
              <div className="daily-xp-bar" key={item.label} style={{ "--h": `${item.height}%` }}>
                <strong>{item.xp}</strong>
                <i />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-effect-panel contribution-panel">
          <div className="effect-panel-heading">
            <div>
              <span className="rank-label">CONSISTENCY</span>
              <h2>Contribution heatmap</h2>
            </div>
          </div>
          <div id="overviewContributionHeatmap" className="contribution-heatmap" aria-label="贡献热力图">
            {model.heatmap ? (
              <>
                <div
                  className="contribution-heatmap-grid"
                  style={{
                    gridTemplateRows: "repeat(7, var(--heatmap-cell-size))",
                    gridAutoColumns: "var(--heatmap-cell-size)",
                    "--weeks": String(model.heatmap.weekCount)
                  }}
                >
                  {model.heatmap.days.map((day) => (
                    <span
                      key={day.key}
                      className={[
                        "contribution-heatmap-cell",
                        `level-${day.future ? 0 : day.level}`,
                        day.future ? "is-future" : "",
                        day.key === model.heatmap.todayKey ? "is-today" : ""
                      ].filter(Boolean).join(" ")}
                      style={{ "--v": String(day.level) }}
                      title={day.title}
                    />
                  ))}
                </div>
                <div
                  className="contribution-month-labels"
                  style={{ gridTemplateColumns: `repeat(${model.heatmap.weekCount}, var(--heatmap-cell-size))` }}
                >
                  {model.heatmap.labels.map((month) => (
                    <span
                      key={`${month.label}-${month.startWeek}`}
                      style={{ gridColumn: `${month.startWeek + 1} / span ${Math.min(month.weekSpan, model.heatmap.weekCount - month.startWeek)}` }}
                    >
                      {month.label}
                    </span>
                  ))}
                </div>
                <div className="contribution-range-label">
                  {model.t("streakLast12Weeks") || "近 12 周"} - {model.heatmap.startLabel} - {model.heatmap.endLabel}
                </div>
              </>
            ) : null}
          </div>
        </article>
      </section>

      <section className="workspace-grid overview-ranking-grid">
        <form
          className="log-panel hidden"
          id="logForm"
          aria-hidden="true"
          onSubmit={(event) => event.preventDefault()}
        >
          <div className="panel-heading">
            <h2>今日记录</h2>
            <button className="icon-button ghost" id="sampleBtn" type="button" title="填入示例" aria-label="填入示例" tabIndex={-1}>
              <i data-lucide="wand-sparkles" />
            </button>
          </div>
          <textarea
            id="logText"
            rows="8"
            placeholder="例：今天刷了 3 道 LeetCode；用 pandas 做了 groupby；复盘 Bayes 和 OLS；练了 option Greeks 和速算。"
            tabIndex={-1}
          />
          <div id="autoClassifyChips" className="auto-classify-chips" aria-live="polite" />
          <div className="form-row">
            <input id="durationInput" type="number" min="0" step="5" placeholder="分钟" tabIndex={-1} />
            <select id="difficultyInput" aria-label="难度" tabIndex={-1} defaultValue="1">
              <option value="1">普通</option>
              <option value="1.25">较难</option>
              <option value="1.6">很难</option>
            </select>
            <button className="primary-button" type="submit" tabIndex={-1}>
              <i data-lucide="plus" />
              记录
            </button>
          </div>
          <div id="analysisPreview" className="analysis-preview" aria-live="polite" />
        </form>
        <aside className="leaderboard-panel">
          <div className="panel-heading">
            <h2>排行榜</h2>
            <button
              className="icon-button ghost"
              id="refreshLeaderboardBtn"
              type="button"
              title="刷新排行榜"
              aria-label="刷新排行榜"
              onClick={model.refreshLeaderboard}
            >
              <i data-lucide="trophy" />
            </button>
          </div>
          <div className="leaderboard-controls" aria-label="排行榜设置">
            <label className="leaderboard-control">
              指标
              <select
                id="leaderboardMetricSelect"
                aria-label="排行榜指标"
                value={settings.metric || "overall"}
                onBlur={updateLeaderboardMetric}
                onChange={updateLeaderboardMetric}
                onInput={updateLeaderboardMetric}
              >
                {leaderboard.metricOptions.map(([value, label]) => (
                  <option key={value} value={value}>{label}</option>
                ))}
              </select>
            </label>
            <label className="leaderboard-control">
              视图
              <select
                id="leaderboardScopeSelect"
                aria-label="排行榜范围"
                value={settings.scope || "global"}
                onBlur={updateLeaderboardScope}
                onChange={updateLeaderboardScope}
                onInput={updateLeaderboardScope}
              >
                <option value="global">全部用户</option>
                <option value="country">按国家</option>
                <option value="region">按地区</option>
              </select>
            </label>
            <label className={`leaderboard-control leaderboard-location-control${showCountry ? "" : " hidden"}`} data-leaderboard-country-control>
              国家
              <select
                id="leaderboardCountrySelect"
                aria-label="排行榜国家"
                value={settings.country || "china"}
                disabled={!showCountry}
                onBlur={updateLeaderboardCountry}
                onChange={updateLeaderboardCountry}
                onInput={updateLeaderboardCountry}
              >
                {model.countryOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
            <label className={`leaderboard-control leaderboard-location-control${showRegion ? "" : " hidden"}`} data-leaderboard-region-control>
              地区
              <select
                id="leaderboardRegionSelect"
                aria-label="排行榜地区"
                value={settings.region || model.regionOptions[0]?.value || ""}
                disabled={!showRegion}
                onBlur={updateLeaderboardRegion}
                onChange={updateLeaderboardRegion}
                onInput={updateLeaderboardRegion}
              >
                {model.regionOptions.map((option) => (
                  <option key={option.value} value={option.value}>{option.label}</option>
                ))}
              </select>
            </label>
          </div>
          <div id="leaderboardScopeSummary" className="leaderboard-scope-summary">
            {`${scopeSummary.metricLabel || ""} · ${scopeSummary.location || ""} · ${scopeSummary.rowCount || 0} ${scopeSummary.userLabel || ""} · ${scopeSummary.sourceText || ""}`}
          </div>
          <div id="leaderboardList" className="leaderboard-list">
            {leaderboard.rows.length ? leaderboard.rows.map((row) => (
              <div className={`leaderboard-item${row.isCurrent ? " current" : ""}`} key={row.id}>
                <strong className={`leaderboard-rank ${medalClass(row.place)}`}>{row.place}</strong>
                <span
                  className={`leaderboard-avatar${row.picture ? " has-image" : ""}`}
                  style={{ "--avatar-hue": String(model.hashStringToHue(row.id || row.name)) }}
                >
                  {row.picture ? <img src={row.picture} alt="" loading="lazy" /> : model.getInitials(row.name)}
                </span>
                <div className="leaderboard-identity">
                  <span>{row.isCurrent ? `${row.name} · ${model.t("leaderboardYou") || "你"}` : row.name}</span>
                  <small>{[row.rank, row.locationLabel].filter(Boolean).join(" · ")}</small>
                </div>
                <b className="leaderboard-score">
                  <span>{model.formatScore(row.score)}</span>
                  <small>{model.t("leaderboardScoreUnit") || ""}</small>
                </b>
                <LeaderboardTrend delta={row.trend} />
              </div>
            )) : (
              <p className="leaderboard-empty">{model.t("leaderboardEmpty") || "暂无排行数据。"}</p>
            )}
          </div>
        </aside>
      </section>

      <section className="community-panel overview-community hidden" aria-hidden="true">
        <div className="section-heading">
          <div>
            <h2>社区</h2>
            <small id="overviewCommunitySummary">分享进度、照片、视频和面试灵感。</small>
          </div>
          <button
            className="icon-button ghost"
            id="overviewCommunityExpandBtn"
            type="button"
            title="打开社区"
            aria-label="打开社区"
            tabIndex={-1}
            onClick={() => model.openModule("community")}
          >
            <i data-lucide="panel-top-open" />
          </button>
        </div>
        <form id="overviewCommunityForm" className="community-form" onSubmit={(event) => event.preventDefault()}>
          <textarea
            id="overviewCommunityText"
            rows="3"
            placeholder="发一条动态：今天练了什么、遇到什么题、想问什么？"
            tabIndex={-1}
          />
          <div id="overviewCommunityMediaPreview" className="community-media-preview hidden" />
          <div className="community-compose-actions">
            <label className="icon-button ghost file-button" title="添加照片或视频" aria-label="添加照片或视频">
              <input id="overviewCommunityMedia" type="file" accept="image/*,video/*" tabIndex={-1} />
              <i data-lucide="image-plus" />
            </label>
            <button className="primary-button" type="submit" tabIndex={-1}>
              <i data-lucide="send" />
              发布
            </button>
          </div>
        </form>
        <div id="overviewCommunityList" className="community-list compact" />
      </section>
    </div>
  );
}
