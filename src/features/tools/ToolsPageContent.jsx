import { useEffect } from "react";
import { useToolsPageModel } from "./toolsHooks.js";

function MentalSparkline({ values = [] }) {
  if (values.length < 2) {
    return (
      <svg id="mentalSparkline" className="mental-sparkline" viewBox="0 0 260 72" role="img" aria-label="Mental math 得分趋势">
        <text x="16" y="42">No trend yet</text>
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
    <svg id="mentalSparkline" className="mental-sparkline" viewBox="0 0 260 72" role="img" aria-label="Mental math 得分趋势">
      <polyline className="sparkline-area" points={`10,62 ${points.join(" ")} 250,62`} />
      <polyline className="sparkline-line" points={points.join(" ")} />
      {values.map((value, index) => {
        const [x, y] = pointPairs[index].split(",");
        return <circle key={`${index}-${value}`} cx={x} cy={y} r="2.8"><title>{value}</title></circle>;
      })}
    </svg>
  );
}

export function ToolsPageContent() {
  const model = useToolsPageModel();
  const { drill, records, leaderboard, market } = model.view;

  useEffect(() => {
    model.refreshIcons?.();
  });

  return (
    <section className="mental-math-section">
      <div className="mental-hero">
        <div>
          <span className="rank-label">OPTIVER STYLE</span>
          <h2>Mental Math</h2>
          <p>按 NumberLogic 的节奏练习：限时、多选、跳过不扣分，目标是在压力下保持准确率。</p>
        </div>
        <div className="mental-session-stats">
          <span><b id="drillScore">{drill.status?.score ?? 0}</b><small>score</small></span>
          <span><b id="drillAccuracy">{drill.status?.accuracy ?? 0}%</b><small>accuracy</small></span>
          <span><b id="drillTimer">{drill.status?.timeText ?? "25:00"}</b><small>time left</small></span>
        </div>
      </div>

      <div className="mental-filter-bar">
        <div className="segmented" aria-label="Mental math 题型">
          {(drill.modes || []).map((mode) => (
            <button
              key={mode}
              className={`segment${drill.mode === mode ? " active" : ""}`}
              type="button"
              data-drill={mode}
              aria-pressed={drill.mode === mode}
              onClick={() => model.setMode(mode)}
            >
              {mode === "numberLogic" ? "Number Logic" : mode === "arithmetic" ? "Arithmetic" : mode === "percent" ? model.t("mentalPercent") || "百分比" : mode === "square" ? model.t("mentalSquare") || "平方" : "EV"}
            </button>
          ))}
        </div>
        <div className="mental-session-controls">
          <label>
            题量
            <select id="drillCountSelect" value={String(model.drillCount)} onChange={(event) => model.setDrillCount(Number(event.target.value))}>
              <option value="10">10</option>
              <option value="20">20</option>
              <option value="25">25</option>
              <option value="40">40</option>
            </select>
          </label>
          <label>
            时间
            <select id="drillTimeSelect" value={String(model.drillDuration)} onChange={(event) => model.setDrillDuration(Number(event.target.value))}>
              <option value="300">5:00</option>
              <option value="600">10:00</option>
              <option value="1500">25:00</option>
            </select>
          </label>
          <button id="startDrillSessionBtn" className="primary-button" type="button" onClick={model.startSession}>
            <i data-lucide="timer-reset" />
            开始
          </button>
        </div>
      </div>

      <div className="mental-workspace">
        <section className="drill-panel mental-oa-panel">
          <div className="mental-oa-top">
            <span id="drillProgressText">{drill.progressText}</span>
            <span id="drillTimeLeftText">Time left: {drill.status?.timeText}</span>
          </div>
          <div className="mental-progress-rail" aria-hidden="true">
            <i id="drillProgressFill" style={{ width: `${drill.progressPercent || 0}%` }} />
          </div>
          <div className="drill-card">
            <div id="drillQuestion" className="drill-question">{drill.question}</div>
            <form
              id="drillForm"
              className="drill-answer"
              onSubmit={(event) => {
                event.preventDefault();
              }}
            >
              <div id="drillOptions" className="drill-options" role="group" aria-label="答案选项">
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
              <input id="drillInput" className="hidden" type="text" inputMode="decimal" autoComplete="off" placeholder="答案" tabIndex={-1} aria-hidden="true" />
              <div className="drill-actions">
                <button id="skipDrillBtn" className="secondary-button compact" type="button" onClick={model.skip}>
                  <i data-lucide="skip-forward" />
                  Skip
                </button>
                <button id="nextDrillBtn" className="secondary-button compact" type="button" onClick={model.advance}>
                  <i data-lucide="arrow-right" />
                  Next
                </button>
              </div>
            </form>
            <div id="drillFeedback" className="drill-feedback" aria-live="polite">{drill.feedback}</div>
          </div>
        </section>

        <aside className="mental-side-stack">
          <section className="mental-record-panel">
            <div className="panel-heading">
              <h3>训练记录</h3>
              <span id="mentalBestScore">Best {records.best ?? 0}</span>
            </div>
            <MentalSparkline values={records.sparkline || []} />
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
              <h3>排行榜</h3>
              <span>local</span>
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

      <section className="mental-games-panel">
        <div className="panel-heading">
          <div>
            <h3>Game</h3>
            <small>把速算和交易直觉放到互动题里练。</small>
          </div>
        </div>
        <div className="mental-games-grid">
          <article className="market-game-card">
            <div className="game-card-head">
              <div>
                <span className="rank-label">MARKET MAKING</span>
                <h4>Market Making Game</h4>
              </div>
              <strong id="marketGameScore">{market.score ?? 0}</strong>
            </div>
            <div id="marketGamePrompt" className="game-prompt">
              <span>Indicative fair: <b>{market.fairValue}</b></span>
              <span>Vol: {market.volatility} · {market.news}</span>
              <small>Quote a two-sided market. Tight and centered quotes score best; crossed markets are rejected.</small>
            </div>
            <div className="market-quote-grid">
              <label>
                Bid
                <input id="marketBidInput" type="number" step="0.1" value={market.bid ?? ""} onChange={(event) => model.setMarketField("bid", event.target.value)} />
              </label>
              <label>
                Ask
                <input id="marketAskInput" type="number" step="0.1" value={market.ask ?? ""} onChange={(event) => model.setMarketField("ask", event.target.value)} />
              </label>
            </div>
            <div className="game-actions">
              <button id="submitMarketQuoteBtn" className="primary-button compact" type="button" onClick={model.submitMarket}>Quote</button>
              <button id="nextMarketGameBtn" className="secondary-button compact" type="button" onClick={model.newMarket}>New market</button>
            </div>
            <div id="marketGameFeedback" className="game-feedback">{market.feedback}</div>
          </article>

          <article className="poker-game-card poker-launch-card">
            <div className="game-card-head">
              <div>
                <span className="rank-label">PRIVATE TABLE</span>
                <h4>Private Poker Room</h4>
              </div>
              <strong>100BB</strong>
            </div>
            <p>私房现金桌、邀请链接、入座、聊天、hand history、session ledger 和翻前策略矩阵。</p>
            <div className="game-actions">
              <button className="primary-button compact" type="button" data-jump-module="poker" onClick={model.openPoker}>
                <i data-lucide="door-open" />
                Open table
              </button>
            </div>
          </article>
        </div>
      </section>
    </section>
  );
}
