import { PokerActionBar } from "./PokerActionBar.jsx";
import { PokerLobbyPanel } from "./PokerLobbyPanel.jsx";
import { PokerPreflopMatrix } from "./PokerPreflopMatrix.jsx";
import { PokerTable } from "./PokerTable.jsx";
import { PokerTournamentStrip } from "./PokerTournamentStrip.jsx";
import { usePokerPageModel } from "./pokerHooks.js";
import { useOwnedCosmetic } from "../shared/cosmetics.js";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";
import {
  estimateHeroEquity,
  getBoardCardViews,
  getCoachModel,
  getHeroCardViews,
  getHeroHandInsight,
  getPotOdds
} from "./pokerInsights.js";

function parseHistoryRows(game) {
  if (game?.panelTab !== "history") return [];
  const hands = game?.panel?.hands || [];
  const heroName = game?.playerName || "";
  return hands.slice(0, 4).map((hand) => {
    const amountMatch = /wins\s+([\d,]+)/i.exec(hand.result || "");
    const heroWon = Boolean(heroName && (hand.result || "").startsWith(heroName));
    return {
      id: `#${hand.handNumber}`,
      desc: hand.result || hand.board || "",
      res: amountMatch ? `${heroWon ? "+" : ""}${amountMatch[1]}` : "",
      tone: amountMatch ? (heroWon ? "is-win" : "") : ""
    };
  });
}

export function PokerPageContent() {
  const model = usePokerPageModel();
  const game = model.view.game;
  // 鲨鱼牌手皮肤 (shop item `poker-skin`): auto-active once owned, zero trace otherwise.
  const pokerSkinOwned = useOwnedCosmetic("poker-skin");

  const table = game?.table;
  const heroCards = getHeroCardViews(table);
  const boardCards = getBoardCardViews(table);
  const inHand = Boolean(table?.hud && heroCards.length === 2);
  const opponents = Math.max((table?.hud?.activeCount || 2) - 1, 1);
  const equity = inHand ? estimateHeroEquity(heroCards, boardCards, opponents) : null;
  const potOdds = inHand ? getPotOdds(table?.hud?.pot, table?.actions?.toCall) : null;
  const handInsight = inHand ? getHeroHandInsight(heroCards, boardCards) : null;
  const coach = getCoachModel(model.view.preflop, heroCards);
  const historyRows = parseHistoryRows(game);

  return (
    <section className="poker-room-section qg-training-page qg-poker-page">
      <div className="qg-poker-lab">
        <div className="qg-poker-main">
          <article className="qg-poker-felt-card">
            <header className="qg-poker-felt-head">
              <span className="qg-poker-kicker">TRAINING · Poker Lab</span>
              <span className="qg-poker-format">6-Max · No-Limit Hold&apos;em</span>
              <div className="qg-poker-head-meta poker-now-room-meta">
                <span className="qg-poker-meta-pill">
                  盲注 <span id="pokerBlindText">{game?.blindsText || "10 / 20"}</span>
                </span>
                <span className="qg-poker-meta-pill qg-poker-meta-num">
                  Hand #<span id="pokerRoomCode">{game?.roomCode || "QG"}</span>
                </span>
                <button
                  id="pokerLeaveTableBtn"
                  className="poker-leave-table-button"
                  type="button"
                  onClick={() => model.openModule("tools")}
                >
                  <i data-lucide="log-out" />
                  <span>Leave table</span>
                </button>
              </div>
            </header>

            <div className="poker-now-shell qg-poker-table-world">
              <div className="poker-now-brand">POKER <span>GYM</span></div>

              <PokerTournamentStrip tournament={game?.table?.tournament} />

              <aside className="poker-side-rail left" aria-label="Poker table options">
                <button type="button" title="Options" aria-label="Options"><i data-lucide="menu" /><span>OPTIONS</span></button>
                <button type="button" title="Leave table" aria-label="Leave table" onClick={() => model.openModule("tools")}>
                  <i data-lucide="log-out" /><span>LEAVE TABLE</span>
                </button>
                <button type="button" title="Away" aria-label="Away"><i data-lucide="person-standing" /></button>
              </aside>

              <aside className="poker-side-rail right" aria-label="Poker table media controls">
                <button type="button" title="Sound" aria-label="Sound"><i data-lucide="volume-2" /></button>
                <button type="button" title="Pause" aria-label="Pause" onClick={() => model.actions.pauseGame?.()}><i data-lucide="pause" /></button>
                <button type="button" title="Stop" aria-label="Stop"><i data-lucide="square" /></button>
                <button className="poker-side-burst" type="button" title="Table energy" aria-label="Table energy"><i data-lucide="sparkles" /></button>
              </aside>

              <PokerTable table={game?.table} actions={model.actions} skinOwned={pokerSkinOwned} />
            </div>

            <p className="qg-poker-handline">
              你的牌型：<strong>{handInsight ? handInsight.label : "等待发牌"}</strong>
            </p>
          </article>

          <div className="qg-poker-actionwrap">
            <PokerActionBar table={game?.table} actions={model.actions} />
          </div>
        </div>

        <aside className="qg-poker-rail">
          <section className="qg-poker-rail-card qg-poker-equity" aria-label="胜率 Equity">
            <h3>胜率 Equity</h3>
            <div className="qg-poker-donut" style={{ "--qg-equity": `${equity ?? 0}%` }}>
              <div className="qg-poker-donut-core">
                <strong>{equity != null ? `${equity}%` : "—"}</strong>
                <span>{equity != null ? "vs 对手范围" : "等待发牌"}</span>
              </div>
            </div>
            <div className="qg-poker-equity-stats">
              <div>
                <small>底池赔率</small>
                <strong className="qg-poker-stat-pos">{potOdds != null ? `${potOdds}%` : "—"}</strong>
              </div>
              <div>
                <small>牌型强度</small>
                <strong className="qg-poker-stat-warn">{handInsight ? handInsight.strength : "—"}</strong>
              </div>
            </div>
          </section>

          <section className="qg-poker-rail-card qg-poker-coach" aria-label="GTO 教练建议">
            <div className="qg-poker-coach-head">
              <QuantyImage asset="wink" size="avatar" />
              <h3>GTO 教练建议</h3>
            </div>
            <p className="qg-poker-coach-advice">
              <span>{coach.handKey} · {coach.label} · </span>
              {coach.description}
            </p>
            <div className="qg-poker-coach-freq">
              <div className={coach.primary === "fold" ? "is-primary" : ""}>
                <small>Fold</small>
                <strong className={coach.fold <= 5 && coach.primary !== "fold" ? "qg-poker-freq-mute" : ""}>{coach.fold}%</strong>
              </div>
              <div className={coach.primary === "call" ? "is-primary" : ""}>
                <small>Call</small>
                <strong className={coach.call <= 5 && coach.primary !== "call" ? "qg-poker-freq-mute" : ""}>{coach.call}%</strong>
              </div>
              <div className={coach.primary === "raise" ? "is-primary" : ""}>
                <small>Raise</small>
                <strong className={coach.raise <= 5 && coach.primary !== "raise" ? "qg-poker-freq-mute" : ""}>{coach.raise}%</strong>
              </div>
            </div>
          </section>

          <section className="qg-poker-rail-card qg-poker-history" aria-label="手牌记录">
            <h3>手牌记录</h3>
            <div className="qg-poker-history-list">
              {historyRows.length
                ? historyRows.map((row) => (
                  <div key={row.id} className="qg-poker-history-row">
                    <span className="qg-poker-history-id">{row.id}</span>
                    <span className="qg-poker-history-desc">{row.desc}</span>
                    <span className={`qg-poker-history-res ${row.tone}`.trim()}>{row.res}</span>
                  </div>
                ))
                : <p className="qg-poker-history-empty">手牌将在结束后出现在这里。</p>}
            </div>
          </section>

          <PokerLobbyPanel game={game} actions={model.actions} />
        </aside>
      </div>

      <div className="qg-poker-tools">
        <PokerPreflopMatrix
          position={model.view.preflop?.position}
          selectedHand={model.view.preflop?.selectedHand}
          onPositionChange={model.actions.setPreflopPosition}
          onHandSelect={model.actions.setPreflopHand}
        />
      </div>
    </section>
  );
}
