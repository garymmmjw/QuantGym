import { usePkPageModel } from "./pkHooks.js";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";

export function PkPageContent() {
  const model = usePkPageModel();
  const { view, phase, matching, stats, battle, outcome, t } = model;
  const isLobby = phase === "lobby";
  const isBattle = phase === "battle";
  const isReveal = phase === "reveal";

  return (
    <section className="pk-section qg-training-page qg-pk-page" data-phase={phase}>
      <header className="pk-page-head section-heading">
        <div className="pk-page-head-lede">
          <span className="pk-kicker">{t("pkKicker")}</span>
          <h2>
            PK <span className="pk-kicker-accent">{t("pkTitleZi")}</span>
          </h2>
          <p className="pk-page-sub">{t("pkSubtitle")}</p>
        </div>
        <div className="pk-head-stats">
          <div className="pk-head-stat">
            <small>Rating</small>
            <strong className="pk-head-stat-you">{stats.ratingText}</strong>
          </div>
          <div className="pk-head-stat">
            <small>{t("pkStatsRecord")}</small>
            <strong>{stats.recordText}</strong>
          </div>
          <div className="pk-head-stat">
            <small>{t("pkStatsWinRate")}</small>
            <strong className="pk-head-stat-rate">{stats.winRateText}</strong>
          </div>
        </div>
      </header>

      <div className="pk-grid">
        <div className="pk-arena qg-pk-arena" data-phase={phase}>
          {/* --- Lobby ------------------------------------------------------ */}
          <div className="pk-lobby" hidden={!isLobby}>
            <QuantyImage
              asset="hero"
              size="medium"
              draggable="false"
            />
            <div className="pk-lobby-title">{matching ? t("pkLobbyMatching") : t("pkLobbyReady")}</div>
            <div className="pk-lobby-sub">{t("pkLobbyDesc")}</div>
            {!view.session && view.problemText && view.problemText !== model.idlePlaceholder ? (
              <div className="pk-lobby-note">{view.problemText}</div>
            ) : null}
            <button
              id="startPkBtn"
              className={`pk-match-btn${matching ? " is-matching" : ""}`}
              type="button"
              onClick={model.start}
              disabled={matching}
            >
              {matching ? t("pkMatchingBtn") : t("pkStartMatchBtn")}
            </button>
          </div>

          {/* --- Battle ----------------------------------------------------- */}
          <div className="pk-battle" hidden={!isBattle}>
            <div className="pk-battle-head">
              <span className="pk-battle-ava pk-battle-ava-you">{t("pkYou")}</span>
              <span className="pk-battle-vs">VS</span>
              <span
                className="pk-battle-ava pk-battle-ava-opp"
                style={{ background: battle.palette.bg, color: battle.palette.fg }}
              >
                {battle.initials}
              </span>
              <div className="pk-battle-opp">
                <div id="pkOpponentName" className="pk-battle-opp-name">{battle.opponentName}</div>
                <div className="pk-battle-opp-note">{battle.oppNote}</div>
              </div>
              <span className={`pk-battle-timer${model.timeLeft <= 10 ? " is-low" : ""}`}>
                {model.timeLeft}s
              </span>
            </div>
            <div className="pk-timer-track">
              <div className="pk-timer-bar" style={{ width: `${model.timerPct}%` }} />
            </div>
            <div className="pk-battle-body">
              <div className="pk-q-meta">{battle.qMeta}</div>
              <div id="pkProblem" className="pk-problem pk-q-text">{view.problemText}</div>
              {model.answerOptions ? (
                <div className="pk-options-wrap">
                  <div id="pkOptions" className="pk-options" role="group" aria-label={t("pkOptionsAria")}>
                    {model.answerOptions.map((option) => {
                      const isPicked = model.picked?.value === option.value;
                      const classes = [
                        "pk-option",
                        isPicked && option.correct ? "is-correct" : "",
                        isPicked && !option.correct ? "is-wrong" : "",
                        model.picked && !model.picked.correct && option.correct ? "is-answer" : ""
                      ]
                        .filter(Boolean)
                        .join(" ");
                      return (
                        <button
                          key={option.id}
                          type="button"
                          className={classes}
                          disabled={Boolean(model.picked)}
                          data-pk-option={option.value}
                          onClick={() => model.pickOption(option)}
                        >
                          {option.value}
                        </button>
                      );
                    })}
                  </div>
                  <span className="pk-form-hint pk-options-hint">
                    {t("pkOptionsHint")}
                  </span>
                </div>
              ) : null}
              <form
                id="pkForm"
                className="pk-form"
                hidden={Boolean(model.answerOptions)}
                onSubmit={model.submit}
              >
                <textarea
                  id="pkAnswer"
                  rows={4}
                  placeholder={t("pkFreeAnswerPlaceholder")}
                  value={view.answer}
                  onChange={(event) => model.setAnswer(event.target.value)}
                />
                <div className="form-row pk-form-row">
                  <span className="pk-form-hint">{t("pkFormHint")}</span>
                  <button className="primary-button pk-submit-btn" type="submit">
                    <i data-lucide="send" />
                    {t("pkSubmitBtn")}
                  </button>
                </div>
              </form>
            </div>
          </div>

          {/* --- Reveal ----------------------------------------------------- */}
          <div className={`pk-reveal${outcome.win ? " is-win" : " is-loss"}`} hidden={!isReveal}>
            <img src={outcome.img} alt="" loading="lazy" draggable="false" />
            <div className={`pk-reveal-kicker${outcome.win ? " is-win" : " is-loss"}`}>
              {outcome.kicker}
            </div>
            <div className="pk-reveal-title">{outcome.title}</div>
            <div className="pk-reveal-sub">{outcome.sub}</div>
            <div className="pk-reveal-pills">
              <span className="pk-reveal-delta">{outcome.deltaText}</span>
              <span className="pk-reveal-score">
                {t("pkYouScorePrefix")} <b id="pkUserScore" className="pk-reveal-score-num">{outcome.userScore}</b> · {t("pkOppScoreLabel")}{" "}
                <b id="pkOpponentScore" className="pk-reveal-score-num">{outcome.opponentScore}</b>
              </span>
            </div>
            <div className="pk-reveal-actions">
              <button className="pk-again-btn" type="button" onClick={model.start} disabled={matching}>
                {matching ? t("pkMatchingShort") : t("pkPlayAgain")}
              </button>
              <button className="pk-ghost-btn" type="button" onClick={model.backToLobby}>
                {t("pkBackToLobby")}
              </button>
              <button
                id="pkRevealBtn"
                className="pk-ghost-btn pk-reveal-btn"
                type="button"
                title={t("pkViewAnswerTitle")}
                aria-label={t("pkViewAnswerTitle")}
                onClick={model.reveal}
              >
                {t("pkViewAnswerTitle")}
              </button>
            </div>
            <aside id="pkFeed" className="pk-feed pk-reveal-feed" hidden={!model.answerRevealed}>
              {view.feed.map((item, index) => (
                <div className="pk-feed-item" key={`${index}-${String(item).slice(0, 24)}`}>{item}</div>
              ))}
            </aside>
          </div>
        </div>

        <div className="pk-side">
          <section className="pk-history-card">
            <h3 className="pk-history-title">{t("pkHistoryTitle")}</h3>
            <div className="pk-hist-list">
              {stats.history.length === 0 ? (
                <p className="pk-hist-empty">{t("pkHistoryEmpty")}</p>
              ) : (
                stats.history.map((row) => (
                  <div className="pk-hist-row" key={row.id}>
                    <span className={`pk-hist-badge${row.win ? " is-win" : " is-loss"}`}>
                      {row.win ? t("pkHistWin") : t("pkHistLose")}
                    </span>
                    <div className="pk-hist-main">
                      <div className="pk-hist-opp">{row.opponent}</div>
                      <div className="pk-hist-meta">{row.meta}</div>
                    </div>
                    <span className={`pk-hist-delta${row.win ? " is-win" : " is-loss"}`}>
                      {row.delta}
                    </span>
                  </div>
                ))
              )}
            </div>
          </section>

          <section className="pk-rules-card">
            <span className="pk-rules-kicker">{t("pkRulesKicker")}</span>
            <p className="pk-rules-body">
              {t("pkRulesBody")}
            </p>
          </section>
        </div>
      </div>
    </section>
  );
}
