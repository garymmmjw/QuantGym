import { useToolsPageModel } from "./toolsHooks.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";

function MentalSparkline({ values = [], t }) {
  if (values.length < 2) {
    return (
      <svg id="mentalSparkline" className="mental-sparkline" viewBox="0 0 260 72" role="img" aria-label={t("toolsSparklineAria")}>
        <text x="16" y="42">{t("toolsSparklineEmpty")}</text>
      </svg>
    );
  }
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(1, max - min);
  const points = values.map((value, index) => {
    const x = 10 + (index / Math.max(values.length - 1, 1)) * 240;
    const y = 58 - ((value - min) / range) * 44;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const pointPairs = points.join(" ").split(" ");
  return (
    <svg id="mentalSparkline" className="mental-sparkline" viewBox="0 0 260 72" role="img" aria-label={t("toolsSparklineAria")}>
      <polyline className="sparkline-area" points={`10,62 ${points.join(" ")} 250,62`} />
      <polyline className="sparkline-line" points={points.join(" ")} />
      {values.map((value, index) => {
        const [x, y] = pointPairs[index].split(",");
        return <circle key={`${index}-${value}`} cx={x} cy={y} r="2.8"><title>{value}</title></circle>;
      })}
    </svg>
  );
}

const RING_CIRCUMFERENCE = 119.38;

function parseTimeText(timeText) {
  const match = /^(\d+):(\d{2})$/.exec(String(timeText || "").trim());
  if (!match) return null;
  return Number(match[1]) * 60 + Number(match[2]);
}

// The drill/market engine emits English feedback strings. zh maps them onto
// Chinese i18n copy; EN passes the English text through (via the same i18n
// keys, whose `en` values reproduce the engine's phrasing). Routing both
// through t() keeps the two languages in one place.
function translateDrillFeedback(feedback, t) {
  const text = String(feedback || "");
  if (!text) return text;
  if (/^Session complete\./.test(text)) {
    const stats = /Score (-?\d+), accuracy (\d+)%/.exec(text);
    return stats
      ? t("toolsDrillDoneStats", { score: stats[1], accuracy: stats[2] })
      : t("toolsDrillDone");
  }
  if (/^Correct\./.test(text)) return t("toolsDrillCorrect");
  const skipped = /^Skipped\. Answer: (.+?)\./.exec(text);
  if (skipped) return t("toolsDrillSkipped", { answer: skipped[1] });
  const answer = /^Answer: (.+?)\./.exec(text);
  if (answer) return t("toolsDrillAnswer", { answer: answer[1] });
  return text;
}

function translateMarketFeedback(feedback, t) {
  const text = String(feedback || "");
  if (!text) return { text: "", tone: "" };
  const round = /^Round ([+-]?\d+)\. Mid (.+?), width (.+?), fair (.+?)\.$/.exec(text);
  if (round) {
    const pts = Number(round[1]);
    return {
      text: t(pts >= 0 ? "toolsMarketOk" : "toolsMarketBad", {
        pts: String(pts),
        mid: round[2],
        width: round[3],
        fair: round[4]
      }),
      tone: pts >= 0 ? " mg-fb-ok" : " mg-fb-bad"
    };
  }
  if (/^Bid must be below ask\./.test(text)) {
    return { text: t("toolsMarketBidBelowAsk"), tone: " mg-fb-warn" };
  }
  if (/^Round already scored\./.test(text)) {
    return { text: t("toolsMarketAlreadyScored"), tone: "" };
  }
  return { text, tone: "" };
}

export function ToolsPageContent() {
  const model = useToolsPageModel();
  const { drill, records, leaderboard, market } = model.view;

  useScopedRefreshIcons(model.refreshIcons, ".mental-math-section", [
    drill.mode,
    drill.question?.id,
    records.items,
    leaderboard,
    market.prompt,
    Boolean(model.done)
  ]);

  const modeLabels = {
    add: { sym: "＋", label: model.t("toolsModeAdd") },
    sub: { sym: "−", label: model.t("toolsModeSub") },
    mul: { sym: "×", label: model.t("toolsModeMul") },
    div: { sym: "÷", label: model.t("toolsModeDiv") },
    mixed: { sym: "∑", label: model.t("toolsModeMixed") },
    numberLogic: { sym: "＃", label: "Number Logic" },
    arithmetic: { sym: "×", label: "Arithmetic" },
    percent: { sym: "％", label: model.t("mentalPercent") || "百分比" },
    square: { sym: "²", label: model.t("mentalSquare") || "平方" },
    ev: { sym: "∑", label: "EV" }
  };
  const countChoices = [
    { value: 12, label: model.t("toolsCountLabel", { n: 12 }) },
    { value: 24, label: model.t("toolsCountLabel", { n: 24 }) },
    { value: 50, label: model.t("toolsCountLabel", { n: 50 }) }
  ];
  const bestScore = records.best ?? 0;
  const playedCount = records.rows?.length ?? 0;

  // In-drill chrome (countdown ring / 第 x/n 题 / accuracy) derived from the live view.
  const progressMatch = /(\d+)\s*\/\s*(\d+)/.exec(String(drill.progressText || ""));
  const questionIndex = progressMatch ? Number(progressMatch[1]) : 1;
  const questionTotal = progressMatch ? Number(progressMatch[2]) : (drill.count ?? model.drillCount);
  const remainingSeconds = parseTimeText(drill.status?.timeText);
  const totalSeconds = drill.durationSeconds || model.drillDuration || 1500;
  const timeFraction = remainingSeconds == null ? 1 : Math.max(0, Math.min(1, remainingSeconds / Math.max(1, totalSeconds)));
  const ringColor = remainingSeconds != null && remainingSeconds <= 30
    ? "#d0524b"
    : remainingSeconds != null && remainingSeconds <= 60
      ? "#ff9f2e"
      : "#5b5ff5";
  const accuracy = drill.status?.accuracy ?? 0;

  const done = model.done;
  const doneTag = done
    ? (done.accuracy >= 90 ? model.t("toolsDonePerfect") : done.accuracy >= 70 ? model.t("toolsDoneGreat") : done.accuracy >= 50 ? model.t("toolsDoneGood") : model.t("toolsDoneKeepGoing"))
    : "";

  const marketFeedback = translateMarketFeedback(market.feedback, model.t);

  return (
    <section className="mental-math-section qg-training-page qg-tools-page">
      <div className="mental-setup-grid">
        <div className="mental-hero mental-hero-card">
          <div className="mental-hero-copy">
            <span className="mental-hero-badge">{model.t("toolsHeroBadge")}</span>
            <h2>
              Mental Math
              <br />
              {model.t("toolsHeroTitle")}
            </h2>
            <p>{model.t("toolsHeroSub")}</p>
          </div>
          <div className="mental-session-stats" hidden aria-hidden="true">
            <span><b id="drillScore">{drill.status?.score ?? 0}</b><small>score</small></span>
            <span><b id="drillAccuracy">{drill.status?.accuracy ?? 0}%</b><small>accuracy</small></span>
            <span><b id="drillTimer">{drill.status?.timeText ?? "25:00"}</b><small>time left</small></span>
          </div>
        </div>

        <div className="mental-config-card">
          <div className="mental-config-block">
            <span className="mental-config-label">{model.t("toolsConfigOpType")}</span>
            <div className="mental-op-grid segmented" aria-label={model.t("toolsOpTypeAria")}>
              {(drill.modes || []).map((mode) => {
                const meta = modeLabels[mode] || { sym: "∑", label: mode };
                return (
                  <button
                    key={mode}
                    className={`mental-op-chip segment${drill.mode === mode ? " active" : ""}`}
                    type="button"
                    data-drill={mode}
                    aria-pressed={drill.mode === mode}
                    onClick={() => model.setMode(mode)}
                  >
                    <span className="mental-op-sym">{meta.sym}</span>
                    {meta.label}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="mental-config-block">
            <span className="mental-config-label">{model.t("toolsConfigCount")}</span>
            <div className="mental-count-grid" role="group" aria-label={model.t("toolsCountAria")}>
              {countChoices.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={`mental-count-chip${model.drillCount === choice.value ? " active" : ""}`}
                  aria-pressed={model.drillCount === choice.value}
                  onClick={() => model.setDrillCount(choice.value)}
                >
                  {choice.label}
                </button>
              ))}
            </div>
            <select
              id="drillCountSelect"
              className="mental-count-select-hidden"
              value={String(model.drillCount)}
              onChange={(event) => model.setDrillCount(Number(event.target.value))}
              tabIndex={-1}
              aria-hidden="true"
            >
              <option value="12">12</option>
              <option value="24">24</option>
              <option value="50">50</option>
            </select>
            <select
              id="drillTimeSelect"
              className="mental-count-select-hidden"
              value={String(model.drillDuration)}
              onChange={(event) => model.setDrillDuration(Number(event.target.value))}
              tabIndex={-1}
              aria-hidden="true"
            >
              <option value="300">5:00</option>
              <option value="600">10:00</option>
              <option value="1500">25:00</option>
            </select>
          </div>

          <div className="mental-stat-pills">
            <div className="mental-stat-pill">
              <span className="mental-stat-pill-label">{model.t("toolsStatBest")}</span>
              <span className="mental-stat-pill-value">{bestScore}</span>
            </div>
            <div className="mental-stat-pill">
              <span className="mental-stat-pill-label">{model.t("toolsStatTodayPlayed")}</span>
              <span className="mental-stat-pill-value">{model.t("toolsPlayedCount", { n: playedCount })}</span>
            </div>
          </div>

          <button id="startDrillSessionBtn" className="mental-start-cta" type="button" onClick={model.startSession}>
            {model.t("toolsStartTraining", { count: model.drillCount })}
          </button>
        </div>
      </div>

      <div className="mental-workspace qg-mental-arena">
        <section className="drill-panel mental-oa-panel">
          <div className={`mental-oa-live${done ? " mental-oa-live-hidden" : ""}`}>
            <div className="mental-oa-top">
              <div className={`mental-oa-ring${drill.running ? " is-running" : ""}`} aria-hidden="true">
                <svg viewBox="0 0 44 44">
                  <circle className="mental-ring-track" cx="22" cy="22" r="19" />
                  <circle
                    className="mental-ring-fill"
                    cx="22"
                    cy="22"
                    r="19"
                    style={{
                      stroke: ringColor,
                      strokeDasharray: RING_CIRCUMFERENCE,
                      strokeDashoffset: RING_CIRCUMFERENCE * (1 - timeFraction)
                    }}
                  />
                </svg>
                <span id="drillTimeLeftText" className="mental-ring-time" style={{ color: ringColor }}>{drill.status?.timeText}</span>
              </div>
              <div className="mental-oa-mid">
                <div className="mental-oa-meta">
                  <span id="drillProgressText">{drill.completed ? model.t("toolsDrillCompleted", { total: questionTotal }) : model.t("toolsDrillProgress", { index: questionIndex, total: questionTotal })}</span>
                  <span className="mental-oa-acc">{model.t("toolsAccuracyLabel")} <b>{accuracy}%</b></span>
                </div>
                <div className="mental-progress-rail" aria-hidden="true">
                  <i id="drillProgressFill" style={{ width: `${drill.progressPercent || 0}%` }} />
                </div>
              </div>
              <div className="mental-streak-pill" title={model.t("toolsComboTitle")}>
                <img src="/assets/generated/playful-precision/reward-fire.webp" alt="" />
                {/* re-keyed per real answer so the mmPop feedback replays */}
                <span key={`streak-${model.streak}`}>{model.streak}</span>
              </div>
            </div>
            <div className="drill-card">
              <div className="drill-question-card">
                <span className="drill-kicker">{model.t("toolsDrillProgressAria")}</span>
                <div id="drillQuestion" className="drill-question">{drill.question}</div>
              </div>
              <form
                id="drillForm"
                className="drill-answer"
                onSubmit={(event) => {
                  event.preventDefault();
                }}
              >
                <div id="drillOptions" className="drill-options" role="group" aria-label={model.t("pkOptionsAria")}>
                  {(drill.options || []).map((option) => (
                    <button
                      key={option.value}
                      type="button"
                      className={[
                        "drill-option",
                        option.correct ? "correct" : "",
                        option.incorrect ? "incorrect" : ""
                      ].filter(Boolean).join(" ")}
                      disabled={option.disabled}
                      data-drill-answer={option.value}
                      onClick={() => model.checkAnswer(option.value)}
                    >
                      {option.label}
                    </button>
                  ))}
                </div>
                <input id="drillInput" className="hidden" type="text" inputMode="decimal" autoComplete="off" placeholder={model.t("toolsAnswerPlaceholder")} tabIndex={-1} aria-hidden="true" />
                <div className="drill-actions">
                  <button id="skipDrillBtn" className="secondary-button compact" type="button" onClick={model.skip}>
                    <i data-lucide="skip-forward" />
                    {model.t("toolsSkip")}
                  </button>
                  <button id="nextDrillBtn" className="secondary-button compact" type="button" onClick={model.advance}>
                    <i data-lucide="arrow-right" />
                    {model.t("toolsNextQuestion")}
                  </button>
                </div>
              </form>
              <div id="drillFeedback" className="drill-feedback" aria-live="polite">{translateDrillFeedback(drill.feedback, model.t)}</div>
            </div>
          </div>

          {done ? (
            <div className="mental-done-view">
              <div className="mental-done-card">
                <QuantyImage asset="trophy" size="small" />
                <div className="mental-done-tag">{doneTag}</div>
                <div className="mental-done-title">{model.t("toolsDoneTitle")}</div>
                <div className="mental-done-stats">
                  <div>
                    <b>{done.accuracy}%</b>
                    <span>{model.t("toolsDoneAccuracy")}</span>
                  </div>
                  <i />
                  <div>
                    <b>{done.correct}<small>/{done.total}</small></b>
                    <span>{model.t("toolsDoneCorrect")}</span>
                  </div>
                  <i />
                  <div>
                    <b>{done.best}</b>
                    <span>{model.t("toolsDoneMaxCombo")}</span>
                  </div>
                </div>
              </div>
              <div className="mental-done-xp">
                <img src="/assets/generated/playful-precision/reward-xp.webp" alt="" />
                {model.t("toolsDoneXp", { xp: done.xp })}
              </div>
              <div className="mental-done-actions">
                <button type="button" className="mental-done-again" onClick={model.startSession}>{model.t("toolsDoneAgain")}</button>
                <button type="button" className="mental-done-switch" onClick={model.dismissDone}>{model.t("toolsDoneSwitch")}</button>
              </div>
            </div>
          ) : null}
        </section>

        <aside className="mental-side-stack">
          <section className="mental-record-panel">
            <div className="panel-heading">
              <h3>{model.t("toolsRecordsTitle")}</h3>
              <span id="mentalBestScore">{model.t("toolsRecordsBest", { score: records.best ?? 0 })}</span>
            </div>
            <MentalSparkline values={records.sparkline || []} t={model.t} />
            <div id="mentalRecordList" className="mental-record-list">
              {records.rows?.length ? records.rows.map((row) => (
                <div className="mental-record-row" key={row.id}>
                  <div>
                    <strong>{row.label}</strong>
                    <small>{row.createdAt} · {row.duration}</small>
                  </div>
                  <span>{row.score}</span>
                  <small>{row.correct}/{row.total} · {row.accuracy}%</small>
                </div>
              )) : <p>{model.t("mentalEmpty") || "暂无记录。"}</p>}
            </div>
          </section>
          <section className="mental-leaderboard-panel">
            <div className="panel-heading">
              <h3>{model.t("toolsLeaderboardTitle")}</h3>
              <span>{model.t("toolsLeaderboardLocal")}</span>
            </div>
            <div id="mentalLeaderboardList" className="mental-leaderboard-list">
              {leaderboard.map((row, index) => (
                <div className={`mental-leaderboard-row${row.self ? " self" : ""}`} key={row.name}>
                  <span>{index + 1}</span>
                  <strong>{row.name}</strong>
                  <b>{row.score}</b>
                </div>
              ))}
            </div>
          </section>
        </aside>
      </div>

      <section className="mental-games-panel qg-market-section">
        <div className="mg-page-head">
          <div className="mg-head-copy">
            <span className="mg-badge">{model.t("toolsMgBadge")}</span>
            <h3 className="mg-title">{model.t("toolsMgTitle")} <span>Market Game</span></h3>
            <p className="mg-sub">{model.t("toolsMgSub")}</p>
          </div>
          <div className="mg-head-stats">
            <div className="mg-stat-chip">
              <span>{model.t("toolsMgScore")}</span>
              <strong id="marketGameScore">{market.score ?? 0}</strong>
            </div>
            <div className="mg-stat-chip">
              <span>{model.t("toolsMgRound")}</span>
              <strong>{model.marketRound}</strong>
            </div>
          </div>
        </div>

        <div className="mg-grid">
          <article className="market-game-card">
            <div id="marketGamePrompt" className="game-prompt">
              <span className="mg-kicker">{model.t("toolsMgKicker", { round: model.marketRound })}</span>
              <div className="mg-question">{model.t("toolsMgQuestion", { fair: market.fairValue, volatility: market.volatility })}</div>
              <small className="mg-meta">{model.t("toolsMgMeta", { news: market.news })}</small>
            </div>
            <div className="market-quote-grid">
              <label className="mg-quote-card is-bid">
                <span className="mg-quote-label">{model.t("toolsMgBidLabel")}</span>
                <input id="marketBidInput" type="number" step="0.1" placeholder={model.t("toolsMgBidPlaceholder")} value={market.bid ?? ""} onChange={(event) => model.setMarketField("bid", event.target.value)} />
              </label>
              <label className="mg-quote-card is-ask">
                <span className="mg-quote-label">{model.t("toolsMgAskLabel")}</span>
                <input id="marketAskInput" type="number" step="0.1" placeholder={model.t("toolsMgAskPlaceholder")} value={market.ask ?? ""} onChange={(event) => model.setMarketField("ask", event.target.value)} />
              </label>
            </div>
            <div id="marketGameFeedback" className={`game-feedback${marketFeedback.tone}`}>{marketFeedback.text}</div>
            <div className="game-actions">
              <button id="submitMarketQuoteBtn" className="primary-button compact mg-submit" type="button" onClick={model.submitMarket}>{model.t("toolsMgSubmit")}</button>
              <button id="nextMarketGameBtn" className="secondary-button compact mg-next" type="button" onClick={model.newMarket}>{model.t("toolsMgNext")}</button>
            </div>
          </article>

          <aside className="mg-side">
            <div className="mg-log-card">
              <h4>{model.t("toolsMgLogTitle")}</h4>
              <div className="mg-log-list">
                {model.marketLog.length ? model.marketLog.map((row) => (
                  <div className="mg-log-row" key={row.id}>
                    <span className={`mg-log-badge${row.ok ? " ok" : " bad"}`}>{row.ok ? "✓" : "✕"}</span>
                    <div className="mg-log-name">{row.name}</div>
                    <span className={`mg-log-pts${row.ok ? " ok" : " bad"}`}>{row.pts > 0 ? `+${row.pts}` : row.pts}</span>
                  </div>
                )) : <div className="mg-log-empty">{model.t("toolsMgLogEmpty")}</div>}
              </div>
            </div>

            <div className="mg-tip-card">
              <span>{model.t("toolsMgTipTitle")}</span>
              <p>{model.t("toolsMgTipBody")}</p>
            </div>

            <article className="poker-game-card poker-launch-card">
              <div className="game-card-head">
                <div>
                  <span className="rank-label">PRIVATE TABLE</span>
                  <h4>Private Poker Room</h4>
                </div>
                <strong>100BB</strong>
              </div>
              <p>{model.t("toolsPokerTeaser")}</p>
              <div className="game-actions">
                <button className="primary-button compact" type="button" data-jump-module="poker" onClick={model.openPoker}>
                  <i data-lucide="door-open" />
                  Open table
                </button>
              </div>
            </article>
          </aside>
        </div>
      </section>
    </section>
  );
}
