import { useLeaguePageModel } from "./leagueHooks.js";

const ASSET_BASE = "/assets/generated/playful-precision/";

function CutLine({ direction, label, t }) {
  if (direction === "up") {
    return (
      <div className="qg-lg-cut is-up" aria-hidden="true">
        <i className="qg-lg-cut-line" />
        <span>{t("leagueCutUp", { label })}</span>
      </div>
    );
  }
  return (
    <div className="qg-lg-cut is-down" aria-hidden="true">
      <span>{t("leagueCutDown", { label })}</span>
      <i className="qg-lg-cut-line" />
    </div>
  );
}

export function LeaguePageContent() {
  const { view, goTrain, openNode, buyItem, t } = useLeaguePageModel();
  const map = view.map || { nodes: [], doneCount: 0, total: 8 };
  const shop = view.shop || { coinsFmt: "0", items: [] };

  return (
    <section className="league-section qg-growth-page qg-league-page">
      {/* ---- Hero head: kicker/title + coins & countdown ------------- */}
      <div className="section-heading qg-league-heading qg-lg-head">
        <div className="qg-lg-head-lede">
          <span className="hero-kicker qg-league-kicker">
            {t("leagueKicker", { season: view.seasonNo })}
          </span>
          <h2 id="leaguePageTitle">
            {t("leagueTitle")} <span className="qg-league-title-en">Arena</span>
          </h2>
          <p className="qg-league-subtitle">{t("leagueSubtitle")}</p>
        </div>
        <div className="qg-lg-headstats">
          <div className="qg-lg-coin-card" data-testid="league-coins">
            <img src={`${ASSET_BASE}reward-xp.webp`} alt="" loading="lazy" draggable="false" />
            <div>
              <small>{t("leagueCoins")}</small>
              <strong>{shop.coinsFmt}</strong>
            </div>
          </div>
          <div className="qg-lg-countdown-card">
            <small>{t("leagueSeasonSettle")}</small>
            <strong>{view.countdown}</strong>
          </div>
        </div>
      </div>

      <div className="qg-lg-grid">
        {/* ---- Standings ------------------------------------------- */}
        <div id="leagueStandings" className="qg-lg-board" data-cohort={view.cohortSource || "bots"}>
          <div className="qg-lg-board-head">
            <img src={view.badge} alt="" loading="lazy" draggable="false" />
            <div className="qg-lg-board-title">
              <strong>{view.groupTitle}</strong>
              <small>{t("leagueGroupCaption")}</small>
            </div>
            <span className={`qg-lg-rank-pill is-${view.myZone}`}>{t("leagueMyRank", { rank: view.myRank })}</span>
          </div>
          <div className="qg-lg-rows">
            {view.standings.map((row) => (
              <div key={row.key} className="qg-lg-rowwrap">
                {row.cutTop ? <CutLine direction="up" label={view.nextTierUpper} t={t} /> : null}
                {row.cutBottom ? <CutLine direction="down" label={view.prevTierUpper} t={t} /> : null}
                <div
                  className={`qg-lg-row${row.me ? " is-me" : ""}`}
                  title={row.bot ? t("leagueBotTitle") : undefined}
                  data-rank={row.rank}
                >
                  <span className={`qg-lg-rowrank is-${row.rankTone}`}>{row.rank}</span>
                  <span
                    className={`qg-lg-avatar${row.me ? " is-me" : ""}`}
                    style={row.me ? undefined : { background: row.bg, color: row.fg }}
                    aria-hidden="true"
                  >
                    {row.initials}
                  </span>
                  <div className="qg-lg-rowname">
                    <strong>{row.name}</strong>
                    <small>{row.sub}</small>
                  </div>
                  {row.zone !== "safe" ? (
                    <span className={`qg-lg-zone is-${row.zone}`}>{row.zoneLabel}</span>
                  ) : null}
                  <span className="qg-lg-rowxp">{row.xpFmt}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ---- Race LIVE + rules ------------------------------------ */}
        <div className="qg-lg-side">
          <div className="qg-lg-live">
            <img
              src={`${ASSET_BASE}mascot-trophy-v2.png`}
              alt=""
              loading="lazy"
              draggable="false"
            />
            <div className="qg-lg-live-body">
              <small>{t("leagueRaceTitle")}</small>
              <p>{view.raceLine}</p>
              <button type="button" className="qg-lg-live-btn" onClick={goTrain}>
                {t("leagueGoEarnXp")}
              </button>
            </div>
          </div>
          <div className="qg-lg-rules">
            <strong className="qg-lg-rules-title">{t("leagueRulesTitle")}</strong>
            <div className="qg-lg-rules-list">
              {view.rules.map((rule) => (
                <div key={rule.num} className="qg-lg-rule">
                  <span className={`qg-lg-rule-num is-${rule.tone}`}>{rule.num}</span>
                  <span className="qg-lg-rule-text">{rule.text}</span>
                </div>
              ))}
            </div>
            <p className="qg-lg-disclosure">{view.disclosure}</p>
          </div>
        </div>
      </div>

      {/* ---- Learning map (8 stages, real progress) ----------------- */}
      <section id="leagueLearningMap" className="qg-lg-map" aria-label={t("leagueLearningMapAria")}>
        <div className="qg-lg-section-head">
          <div>
            <span className="qg-lg-section-title">{t("leagueLearningMapTitle")}</span>
            <span className="qg-lg-section-note">{t("leagueLearningMapNote")}</span>
          </div>
          <span className="qg-lg-map-count">
            {t("leagueMapCount", { done: map.doneCount, total: map.total })}
          </span>
        </div>
        <div className="qg-lg-map-scroller">
          <div className="qg-lg-map-track">
            {map.nodes.map((node) => (
              <div key={node.id} className="qg-lg-node-cell">
                <button
                  type="button"
                  className={`qg-lg-node is-${node.status}`}
                  onClick={() => openNode(node)}
                  data-node={node.id}
                >
                  <span className="qg-lg-node-dot" aria-hidden="true">
                    {node.mark}
                  </span>
                  <span className="qg-lg-node-text">
                    <span className="qg-lg-node-name">{node.name}</span>
                    <span className="qg-lg-node-sub">{node.sub}</span>
                  </span>
                </button>
                {node.hasLink ? (
                  <i
                    className={`qg-lg-node-link${node.status === "done" ? " is-done" : ""}`}
                    aria-hidden="true"
                  />
                ) : null}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ---- Reward shop -------------------------------------------- */}
      <section id="leagueRewardShop" className="qg-lg-shop" aria-label={t("leagueRewardShopAria")}>
        <div className="qg-lg-section-head">
          <div>
            <span className="qg-lg-section-title">{t("leagueRewardShopTitle")}</span>
            <span className="qg-lg-section-note">{t("leagueRewardShopNote")}</span>
          </div>
          <div className="qg-lg-balance-pill" data-testid="league-shop-balance">
            <img src={`${ASSET_BASE}reward-xp.webp`} alt="" loading="lazy" draggable="false" />
            <span>{shop.coinsFmt}</span>
          </div>
        </div>
        <div className="qg-lg-shop-grid">
          {shop.items.map((item) => (
            <div key={item.id} className="qg-lg-shop-item">
              <div className="qg-lg-shop-figure">
                <img src={item.img} alt="" loading="lazy" draggable="false" />
              </div>
              <div className="qg-lg-shop-copy">
                <strong>{item.name}</strong>
                <small>{item.desc}</small>
              </div>
              <button
                type="button"
                className={`qg-lg-shop-btn is-${item.btnState}`}
                onClick={() => buyItem(item.id)}
                data-shop-item={item.id}
              >
                {item.btnLabel}
              </button>
            </div>
          ))}
        </div>
      </section>
    </section>
  );
}
