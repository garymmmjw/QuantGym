import { useEffect, useState } from "react";
import { useOverviewPageModel } from "./overviewHooks.js";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";
import { resolveLegacyQuantySrc } from "@/lib/quantyAssets.js";

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

function LeaderboardPodiumCard({ row, model }) {
  const you = model.t("leaderboardYou") || "你";
  return (
    <div className={`leaderboard-podium-card place-${row.place}${row.isCurrent ? " is-current" : ""}`}>
      {row.place === 1 ? (
        <img
          className="podium-crown"
          src="/assets/generated/playful-precision/reward-crown.webp"
          alt=""
          width="34"
          height="34"
          loading="lazy"
        />
      ) : (
        <span className={`podium-rank-badge medal-${medalClass(row.place)}`}>{row.place}</span>
      )}
      <span
        className={`podium-avatar${row.picture ? " has-image" : ""}`}
        style={{ "--avatar-hue": String(model.hashStringToHue(row.id || row.name)) }}
      >
        {row.picture ? <img src={resolveLegacyQuantySrc(row.picture, 160)} alt="" loading="lazy" /> : model.getInitials(row.name)}
      </span>
      <div className="podium-name">
        {row.isCurrent ? <>{row.name}<span className="podium-you"> · {you}</span></> : row.name}
      </div>
      <div className="podium-sub">{[row.rank, row.locationLabel].filter(Boolean).join(" · ")}</div>
      <div className="podium-score">{model.formatScore(row.score)}</div>
    </div>
  );
}

export function OverviewPageContent() {
  const model = useOverviewPageModel();
  const { leaderboard } = model;
  const settings = leaderboard.settings || {};
  const showCountry = settings.scope !== "global";
  const showRegion = settings.scope === "region";
  const updateLeaderboardMetric = (event) => model.updateLeaderboard({ metric: event.target.value });
  const updateLeaderboardScope = (event) => model.updateLeaderboard({ scope: event.target.value });
  const updateLeaderboardCountry = (event) => model.updateLeaderboard({ country: event.target.value });
  const updateLeaderboardRegion = (event) => model.updateLeaderboard({ region: event.target.value });
  const updateLeaderboard = model.updateLeaderboard;

  // Spins the refresh icon only while a real leaderboard refresh is in flight.
  const [isLeaderboardRefreshing, setLeaderboardRefreshing] = useState(false);
  const handleRefreshLeaderboard = async () => {
    if (isLeaderboardRefreshing) return;
    setLeaderboardRefreshing(true);
    try {
      await model.refreshLeaderboard();
    } finally {
      setLeaderboardRefreshing(false);
    }
  };

  // Achievements — derived from real user state, not seeded. Fresh accounts see them locked.
  const totalSolved = model.problemProgress.reduce((max, item) => Math.max(max, item.done || 0), 0);
  const myPlace = leaderboard.rows.find((row) => row.isCurrent)?.place || null;
  const asset = "/assets/generated/playful-precision/";

  // Today quests — derived from the real study plan when present; otherwise the
  // standard daily quest checklist is shown in its incomplete state.
  const defaultQuests = [
    { id: "daily-problem", icon: "list-checks", title: "完成每日一题", sub: "概率 · 中等难度", xp: 20 },
    { id: "mental-90", icon: "calculator", title: "Mental Math 达到 90% 正确率", sub: "限时挑战", xp: 30 },
    { id: "review-cards", icon: "notebook-pen", title: "复习 3 张资料卡", sub: "间隔记忆", xp: 15 },
    { id: "poker-session", icon: "spade", title: "完成一手扑克决策复盘", sub: "决策直觉", xp: 25 },
    { id: "read-exp", icon: "newspaper", title: "读一篇市场面经", sub: "Quant Wire", xp: 10 }
  ];
  const planItems = model.todayPlan?.items || [];
  const quests = planItems.length
    ? planItems.map((item, index) => ({
      id: item.id || `plan-${index}`,
      icon: defaultQuests[index % defaultQuests.length].icon,
      title: item.title,
      sub: item.detail || (item.minutes ? `${item.minutes} 分钟` : ""),
      xp: defaultQuests[index % defaultQuests.length].xp,
      done: Boolean(item.done)
    }))
    : defaultQuests.map((quest) => ({ ...quest, done: false }));
  const questsDone = quests.filter((quest) => quest.done).length;
  const questPct = quests.length ? Math.round((questsDone / quests.length) * 100) : 0;
  const questsLeft = quests.length - questsDone;
  const goalSubText = questsLeft === 0
    ? "奖励 +50 XP 已入账"
    : `再完成 ${questsLeft} 项 · +50 XP`;
  const heroTaskLine = questsLeft === 0
    ? "今天的训练任务已全部完成。去自由训练，或到计划里排明天的节奏。"
    : `今天还有 ${questsLeft} 个训练任务在等你。保持节奏，段位与 XP 会替你说话。`;

  // Weekly rhythm — Monday-first bars come pre-sorted from the hooks layer.
  const weekDots = model.dailyXpBars.map((item) => ({
    key: item.key || item.label,
    active: (item.xp || 0) > 0
  }));
  const trainedDays = weekDots.filter((dot) => dot.active).length;
  const todayXp = model.dailyXpBars.find((item) => item.isToday)?.xp || 0;
  const weekTotalXp = model.dailyXpBars.reduce((sum, item) => sum + (item.xp || 0), 0);
  const weekAvgXp = model.dailyXpBars.length ? Math.round(weekTotalXp / model.dailyXpBars.length) : 0;
  const heatTrainingCount = model.heatmap
    ? model.heatmap.days.reduce((sum, day) => sum + (!day.future && day.level > 0 ? 1 : 0), 0)
    : 0;
  const achievements = [
    { key: "starter", label: "初出茅庐", note: "Lv.1 达成", img: `${asset}badge-level-1.webp`, glow: "rgba(74,67,214,.22)", unlocked: (model.summary.entryCount || 0) > 0 || (model.summary.score || 0) > 0 },
    { key: "streak7", label: "七日连胜", note: "连续 7 天", img: `${asset}badge-streak-7.webp`, glow: "rgba(255,122,61,.28)", unlocked: (model.summary.streak || 0) >= 7, progress: Math.min(1, (model.summary.streak || 0) / 7) },
    { key: "gold", label: "黄金勋章", note: "正确率 90%", img: `${asset}badge-gold.webp`, glow: "rgba(255,159,46,.3)", unlocked: false },
    { key: "topWeek", label: "登顶周榜", note: "地区第一", img: `${asset}badge-top-rank.webp`, glow: "rgba(74,67,214,.22)", unlocked: myPlace === 1 },
    { key: "century", label: "百题达人", note: `${totalSolved} / 100`, img: `${asset}badge-gold.webp`, glow: "rgba(255,159,46,.3)", unlocked: totalSolved >= 100, progress: Math.min(1, totalSolved / 100) },
    { key: "master", label: "大师段位", note: "敬请期待", img: null, unlocked: false }
  ];
  const unlockedCount = achievements.filter((item) => item.unlocked).length;

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
    <div className="overview-route-page qg-growth-page qg-overview-page">
      <section className="news-ticker qg-overview-ticker" aria-label="Quant 新闻滚动条" data-i18n-aria-label="newsTickerLabel">
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

      <section className="quanty-hero qg-overview-hero">
        <div className="quanty-hero-copy">
          <span className="hero-kicker hero-streak-kicker">
            <img src="/assets/generated/playful-precision/reward-fire.webp" alt="" width="18" height="18" loading="lazy" />
            连续 {model.summary.streak} 天 · 欢迎回来，{model.summary.displayName || "Quant"}
          </span>
          <h2 id="heroTypewriter">把你的 <span className="hero-brand-word">quant</span> 练到锋利。</h2>
          <p className="hero-task-line">{heroTaskLine}</p>
          <div className="hero-actions">
            <button
              className="primary-button"
              id="generateStudyPlanBtn"
              type="button"
              onClick={model.generateTodayStudyPlan}
            >
              开始今日训练
              <i data-lucide="arrow-right" />
            </button>
            <button
              className="secondary-button hero-plan-button"
              type="button"
              onClick={() => model.openModule("plan")}
            >
              查看学习计划
            </button>
          </div>
          <div className="hero-stat-chips">
            <div className="hero-stat-chip">
              <img src="/assets/generated/playful-precision/badge-level-1.webp" alt="" width="24" height="24" loading="lazy" />
              <div>
                <small>当前段位</small>
                <b>{model.summary.rank}</b>
              </div>
            </div>
            <div className="hero-stat-chip">
              <img src="/assets/generated/playful-precision/reward-xp.webp" alt="" width="24" height="24" loading="lazy" />
              <div>
                <small>本周 XP</small>
                <b>{model.summary.weeklyXp}</b>
              </div>
            </div>
            <div className="hero-stat-chip">
              <img src="/assets/generated/playful-precision/reward-target.webp" alt="" width="24" height="24" loading="lazy" />
              <div>
                <small>已解题目</small>
                <b>{totalSolved}</b>
              </div>
            </div>
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
          <span className="stage-glow" aria-hidden="true" />
          <span className="stage-ring stage-ring-outer" aria-hidden="true" />
          <span className="stage-ring stage-ring-inner" aria-hidden="true" />
          <span className="stage-shadow" aria-hidden="true" />
          <div className="shark-bubble" id="sharkBubble" role="status" aria-live="polite" />
          <button className="shark-interactive" id="sharkInteractive" type="button" aria-label="戳一下 Quanty">
            <span className="shark-glow" aria-hidden="true" />
            <QuantyImage
              asset="hero"
              size="hero"
              id="heroShark"
              draggable="false"
            />
          </button>
          <div className="hero-float-chip hero-float-streak" aria-hidden="true">
            <img src="/assets/generated/playful-precision/reward-fire.webp" alt="" width="28" height="28" loading="lazy" />
            <div>
              <b>{model.summary.streak}</b>
              <small>连续天数</small>
            </div>
          </div>
          <div className="hero-float-chip hero-float-xp" aria-hidden="true">
            <img src="/assets/generated/playful-precision/reward-xp.webp" alt="" width="28" height="28" loading="lazy" />
            <div>
              <b>+{todayXp}</b>
              <small>今日 XP</small>
            </div>
          </div>
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

      <section className="summary-band qg-overview-summary" aria-label="学习统计">
        <div className="qg-stat-card qg-stat-rank">
          <div className="qg-stat-top">
            <img src="/assets/generated/playful-precision/badge-level-1.webp" alt="" width="46" height="46" loading="lazy" />
            <div>
              <small>当前段位</small>
              <strong id="rankName">{model.summary.rank}</strong>
            </div>
          </div>
          <div className="qg-stat-track">
            <span style={{ width: `${Math.max(3, Math.min(100, Number(model.summary.score) || 0))}%` }} />
          </div>
          <div className="qg-stat-note">
            综合评分 <span id="totalXp">{model.formatScore(model.summary.score)}</span> / 100
          </div>
        </div>
        <div className="qg-stat-card qg-stat-streak">
          <div className="qg-stat-top">
            <img src="/assets/generated/playful-precision/reward-fire.webp" alt="" width="46" height="46" loading="lazy" />
            <div>
              <small>连续天数</small>
              <strong><span id="streakCount">{model.summary.streak}</span> <em>天</em></strong>
            </div>
          </div>
          <div className="qg-week-dots" aria-hidden="true">
            {weekDots.map((dot) => (
              <span key={dot.key} className={dot.active ? "is-active" : ""} />
            ))}
          </div>
          <div className="qg-stat-note">本周已训练 {trainedDays} / 7 天</div>
        </div>
        <div className="qg-stat-card qg-stat-xp">
          <div className="qg-stat-top">
            <img src="/assets/generated/playful-precision/reward-xp.webp" alt="" width="46" height="46" loading="lazy" />
            <div>
              <small>7 日 XP</small>
              <strong id="weeklyXp">{model.summary.weeklyXp}</strong>
            </div>
          </div>
          <div className="qg-stat-track warm">
            <span style={{ width: `${Math.max(3, Math.min(100, Math.round(((Number(model.summary.weeklyXp) || 0) / 700) * 100)))}%` }} />
          </div>
          <div className="qg-stat-note">
            共 <span id="entryCount">{model.summary.entryCount}</span> 条训练记录
          </div>
        </div>
        <div className="qg-stat-card qg-stat-goal">
          <div
            className="qg-goal-ring"
            style={{ background: `conic-gradient(#fff 0% ${questPct}%, rgba(255, 255, 255, 0.26) ${questPct}% 100%)` }}
          >
            <span>{questsDone}/{quests.length}</span>
          </div>
          <div>
            <b>今日目标</b>
            <small>{goalSubText}</small>
          </div>
        </div>
      </section>

      <section className="qg-overview-quests" aria-label="今日任务">
        <div className="qg-quests-head">
          <div className="qg-quests-title">
            <img src="/assets/generated/playful-precision/reward-target.webp" alt="" width="36" height="36" loading="lazy" />
            <div>
              <strong>今日任务</strong>
              <small>全部完成即可解锁连胜奖励 +50 XP</small>
            </div>
          </div>
          <div className="qg-quests-progress">
            <i aria-hidden="true"><span style={{ width: `${questPct}%` }} /></i>
            <b>{questsDone}/{quests.length}</b>
          </div>
        </div>
        <div className="qg-quest-list">
          {quests.map((quest) => (
            <div className={`qg-quest-row${quest.done ? " is-done" : ""}`} key={quest.id}>
              <span className="qg-quest-badge" aria-hidden="true">
                <i data-lucide={quest.done ? "check" : quest.icon} />
              </span>
              <div className="qg-quest-copy">
                <strong>{quest.title}</strong>
                <small>{quest.sub}</small>
              </div>
              <span className="qg-quest-xp">+{quest.xp} XP</span>
              <span className="qg-quest-check" aria-hidden="true">
                <i data-lucide="check" />
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="overview-effect-grid qg-overview-effects" aria-label="训练进度可视化">
        <article className="overview-effect-panel problem-progress-panel qg-overview-progress">
          <div className="effect-panel-heading">
            <div>
              <h2>刷题进度</h2>
            </div>
            <div className="effect-head-side">
              <span className="effect-head-stat">已解 {totalSolved} 题</span>
              <button
                className="icon-button ghost"
                type="button"
                title={model.isEnglish ? "Open problems" : "打开题库"}
                aria-label={model.isEnglish ? "Open problems" : "打开题库"}
                data-overview-problems-cta
                onClick={() => model.openModule("problems")}
              >
                <i data-lucide="arrow-up-right" />
              </button>
            </div>
          </div>
          <div id="overviewProblemProgress" className="effect-progress-group">
            {model.problemProgress.map((item) => (
              <div
                className="effect-progress-row"
                key={item.key}
                style={{ "--value": String(item.percent), "--accent-index": String(item.accentIndex) }}
              >
                <div>
                  <span className="progress-row-name">
                    <span className="progress-dot" aria-hidden="true" />
                    <strong>{item.label}</strong>
                  </span>
                  <span className="progress-row-nums">
                    <span>{item.done} / {item.total}</span>
                    <b>{item.percent}%</b>
                  </span>
                </div>
                <i aria-hidden="true"><span /></i>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-effect-panel daily-xp-panel qg-overview-rhythm">
          <div className="effect-panel-heading">
            <div>
              <h2>本周节奏</h2>
            </div>
            <div className="rhythm-head-stat">
              <b>{weekTotalXp} <em>XP</em></b>
              <small>日均 {weekAvgXp}</small>
            </div>
          </div>
          <div id="overviewXpBars" className="daily-xp-bars" aria-label="每日经验值柱状图">
            {model.dailyXpBars.map((item) => (
              <div
                className={`daily-xp-bar${item.isToday ? " is-today" : ""}`}
                key={item.key || item.label}
                style={{ "--h": `${item.height}%` }}
              >
                <strong>{item.xp}</strong>
                <i />
                <span>{item.label}</span>
              </div>
            ))}
          </div>
        </article>

        <article className="overview-effect-panel contribution-panel qg-overview-heatmap">
          <div className="effect-panel-heading">
            <div className="heatmap-heading-copy">
              <h2>贡献热力图</h2>
              <span className="effect-head-stat">
                最近 {model.heatmap?.weekCount || 12} 周 · 共 {heatTrainingCount} 次训练
              </span>
            </div>
            <div className="heat-legend" aria-hidden="true">
              少
              <i className="heat-swatch heat-l0" />
              <i className="heat-swatch heat-l1" />
              <i className="heat-swatch heat-l2" />
              <i className="heat-swatch heat-l3" />
              <i className="heat-swatch heat-l4" />
              多
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
              </>
            ) : null}
          </div>
        </article>
      </section>

      <section className="workspace-grid overview-ranking-grid qg-overview-ranking">
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
        <aside className="leaderboard-panel qg-overview-leaderboard">
          <div className="panel-heading">
            <div className="leaderboard-title">
              <img src="/assets/generated/playful-precision/reward-trophy.webp" alt="" width="32" height="32" loading="lazy" />
              <h2>排行榜</h2>
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
            <button
              className={`icon-button ghost${isLeaderboardRefreshing ? " is-refreshing" : ""}`}
              id="refreshLeaderboardBtn"
              type="button"
              title="刷新排行榜"
              aria-label="刷新排行榜"
              aria-busy={isLeaderboardRefreshing || undefined}
              onClick={handleRefreshLeaderboard}
            >
              <i data-lucide="refresh-cw" />
            </button>
            </div>
          </div>
          <div id="leaderboardList" className="leaderboard-list">
            {leaderboard.rows.length ? (
              <>
                <div className="leaderboard-podium">
                  {leaderboard.rows.slice(0, 3).map((row) => (
                    <LeaderboardPodiumCard key={row.id} row={row} model={model} />
                  ))}
                </div>
                {leaderboard.rows.slice(3).map((row) => (
                  <div className={`leaderboard-item${row.isCurrent ? " current" : ""}`} key={row.id}>
                    <strong className={`leaderboard-rank ${medalClass(row.place)}`}>{row.place}</strong>
                    <span
                      className={`leaderboard-avatar${row.picture ? " has-image" : ""}`}
                      style={{ "--avatar-hue": String(model.hashStringToHue(row.id || row.name)) }}
                    >
                      {row.picture ? <img src={resolveLegacyQuantySrc(row.picture, 160)} alt="" loading="lazy" /> : model.getInitials(row.name)}
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
                ))}
              </>
            ) : (
              <p className="leaderboard-empty">{model.t("leaderboardEmpty") || "暂无排行数据。"}</p>
            )}
          </div>
        </aside>
      </section>

      <section className="overview-achievements qg-overview-achievements" aria-label="成就徽章">
        <div className="overview-achievements-head">
          <div>
            <span className="overview-achievements-title">成就徽章</span>
            <span className="overview-achievements-count">{unlockedCount} / {achievements.length} 已解锁</span>
          </div>
          <button
            className="achievements-more"
            type="button"
            onClick={() => model.openModule("skills")}
          >
            查看全部 ›
          </button>
        </div>
        <div className="overview-achievements-grid">
          {achievements.map((item) => (
            <div
              key={item.key}
              className={`achievement-card${item.unlocked ? " is-unlocked" : " is-locked"}`}
            >
              {item.unlocked && item.img ? (
                <img
                  className="achievement-badge"
                  src={item.img}
                  alt=""
                  width="58"
                  height="58"
                  loading="lazy"
                  style={{ filter: item.glow ? `drop-shadow(0 8px 14px ${item.glow})` : undefined }}
                />
              ) : (
                <span className="achievement-lock" aria-hidden="true">
                  <i data-lucide="lock" />
                </span>
              )}
              <div className="achievement-label">{item.label}</div>
              <div className="achievement-note">{item.note}</div>
              {!item.unlocked && typeof item.progress === "number" ? (
                <div className="achievement-progress">
                  <span style={{ width: `${Math.round(item.progress * 100)}%` }} />
                </div>
              ) : null}
            </div>
          ))}
        </div>
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
