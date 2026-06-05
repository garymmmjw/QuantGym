import { registerModule } from '../registry.js';
import { createPokerModule } from '../poker/index.js';

export function registerPokerModule(deps = {}) {
  registerModule("poker", createPokerModule({
    elements: deps.elements,
    hasGame() {
      return Boolean(deps.pokerState?.game);
    },
    loadInitialGame: deps.loadInitialPokerGame,
    renderGame: deps.renderPokerGame,
    handleDocumentClick: deps.handlePokerDocumentClick,
    handleDocumentSubmit: deps.handlePokerDocumentSubmit,
    resetTournament: deps.resetPokerTournament,
    renderPreflopChart: deps.renderPokerPreflopChart,
    handlePreflopMatrixClick: deps.handlePokerPreflopMatrixClick
  }));
}
