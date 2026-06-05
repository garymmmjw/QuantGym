import {
  getMatrixHandKey,
  getPreflopStrategyForCards,
  getPreflopStrategyForHand,
  getStartingHandKey,
  POKER_MATRIX_RANKS,
  POKER_POSITION_LABELS
} from './engine.js';

export function createPokerPreflopView(deps = {}) {
  const {
    documentRef = globalThis.document,
    elements = {},
    escapeHtml = (value) => String(value || ""),
    getHero = () => null,
    getPositionForPlayer = () => "btn",
    getSelectedHand = () => "AKs",
    setSelectedHand = () => {}
  } = deps;

  function getPosition() {
    return elements.pokerPreflopPositionSelect?.value || "btn";
  }

  function renderChart() {
    if (!elements.pokerPreflopMatrix || !elements.pokerPreflopDetail) return;
    const position = getPosition();
    const selectedHand = getSelectedHand();
    elements.pokerPreflopMatrix.innerHTML = "";

    const corner = documentRef.createElement("span");
    corner.className = "poker-matrix-header corner";
    corner.textContent = POKER_POSITION_LABELS[position] || "POS";
    elements.pokerPreflopMatrix.appendChild(corner);

    POKER_MATRIX_RANKS.forEach((rank) => {
      const header = documentRef.createElement("span");
      header.className = "poker-matrix-header";
      header.textContent = rank;
      elements.pokerPreflopMatrix.appendChild(header);
    });

    POKER_MATRIX_RANKS.forEach((rowRank, rowIndex) => {
      const rowHeader = documentRef.createElement("span");
      rowHeader.className = "poker-matrix-header";
      rowHeader.textContent = rowRank;
      elements.pokerPreflopMatrix.appendChild(rowHeader);
      POKER_MATRIX_RANKS.forEach((colRank, colIndex) => {
        const handKey = getMatrixHandKey(rowIndex, colIndex);
        const strategy = getPreflopStrategyForHand(handKey, position);
        const button = documentRef.createElement("button");
        button.type = "button";
        button.className = `poker-matrix-cell ${strategy.tier}${handKey === selectedHand ? " selected" : ""}`;
        button.dataset.hand = handKey;
        button.title = `${handKey}: ${strategy.label}`;
        button.innerHTML = `<strong>${escapeHtml(handKey)}</strong><span>${escapeHtml(strategy.code)}</span>`;
        elements.pokerPreflopMatrix.appendChild(button);
      });
    });
    renderDetail(selectedHand, position);
  }

  function handleMatrixClick(event) {
    const button = event.target.closest("[data-hand]");
    if (!button) return;
    setSelectedHand(button.dataset.hand || getSelectedHand());
    renderChart();
  }

  function renderDetail(handKey = getSelectedHand(), position = getPosition()) {
    if (!elements.pokerPreflopDetail) return;
    const strategy = getPreflopStrategyForHand(handKey, position);
    elements.pokerPreflopDetail.innerHTML = `
      <span class="rank-label">100BB ${escapeHtml(POKER_POSITION_LABELS[position] || position.toUpperCase())}</span>
      <h4>${escapeHtml(handKey)} · ${escapeHtml(strategy.label)}</h4>
      <p>${escapeHtml(strategy.description)}</p>
      <div class="poker-frequency-bar" aria-label="Suggested frequency">
        <i style="width:${escapeHtml(String(strategy.frequency))}%"></i>
      </div>
      <small>Frequency ${escapeHtml(String(strategy.frequency))}% · sizing baseline: open 2.2BB, 3-bet 8-10BB in position, 10-12BB out of position.</small>
    `;
  }

  function getHeroCoach(game) {
    const hero = getHero(game);
    if (!hero || game.stage !== "preflop" || hero.cards.length < 2 || game.handComplete) return "";
    const position = getPositionForPlayer(game, game.players.indexOf(hero));
    const strategy = getPreflopStrategyForCards(hero.cards, position);
    const handKey = getStartingHandKey(hero.cards);
    return `100BB chart: ${handKey} from ${POKER_POSITION_LABELS[position] || position.toUpperCase()} -> ${strategy.label} (${strategy.frequency}%).`;
  }

  return {
    getHeroCoach,
    handleMatrixClick,
    renderChart,
    renderDetail
  };
}
