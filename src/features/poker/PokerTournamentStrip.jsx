export function PokerTournamentStrip({ tournament }) {
  if (!tournament) return null;
  return (
    <div className="poker-tournament-strip" aria-label="Poker room status">
      <span><small>Blinds</small><strong id="pokerLevelText">{tournament.blinds}</strong></span>
      <span><small>Hand</small><strong id="pokerNextLevelText">{tournament.hand}</strong></span>
      <span><small>Avg stack</small><strong id="pokerAverageStackText">{tournament.averageStack}</strong></span>
      <span><small>Chip leader</small><strong id="pokerLeaderText">{tournament.leader}</strong></span>
    </div>
  );
}
