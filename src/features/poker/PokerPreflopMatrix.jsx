import {
  getMatrixHandKey,
  getPreflopStrategyForHand,
  POKER_MATRIX_RANKS,
  POKER_POSITION_LABELS
} from "../../modules/poker/engine.js";

const POKER_PREFLOP_POSITIONS = ["utg", "hj", "co", "btn", "sb", "bb"];

export function PokerPreflopMatrix({ position = "btn", selectedHand = "AKs", onPositionChange, onHandSelect }) {
  const resolvedPosition = POKER_POSITION_LABELS[position] ? position : "btn";
  const resolvedHand = selectedHand || "AKs";
  const selectedStrategy = getPreflopStrategyForHand(resolvedHand, resolvedPosition);

  return (
    <section className="poker-solver-panel">
      <div className="panel-heading">
        <div>
          <h3>100BB Preflop Solver Lite</h3>
          <small>简化 6-max baseline：RFI / mix / defend / fold，用来训练翻前直觉。</small>
        </div>
        <select
          id="pokerPreflopPositionSelect"
          aria-label="Preflop position"
          value={resolvedPosition}
          onChange={(event) => onPositionChange?.(event.target.value)}
        >
          {POKER_PREFLOP_POSITIONS.map((item) => (
            <option key={item} value={item}>{POKER_POSITION_LABELS[item]}</option>
          ))}
        </select>
      </div>
      <div className="poker-solver-layout">
        <div id="pokerPreflopMatrix" className="poker-preflop-matrix" aria-label="100BB preflop hand matrix">
          <span className="poker-matrix-header corner">{POKER_POSITION_LABELS[resolvedPosition]}</span>
          {POKER_MATRIX_RANKS.map((rank) => (
            <span key={`col-${rank}`} className="poker-matrix-header">{rank}</span>
          ))}
          {POKER_MATRIX_RANKS.map((rowRank, rowIndex) => (
            <PreflopMatrixRow
              key={rowRank}
              position={resolvedPosition}
              rowIndex={rowIndex}
              rowRank={rowRank}
              selectedHand={resolvedHand}
              onHandSelect={onHandSelect}
            />
          ))}
        </div>
        <aside id="pokerPreflopDetail" className="poker-preflop-detail">
          <span className="rank-label">100BB {POKER_POSITION_LABELS[resolvedPosition]}</span>
          <h4>{resolvedHand} · {selectedStrategy.label}</h4>
          <p>{selectedStrategy.description}</p>
          <div className="poker-frequency-bar" aria-label="Suggested frequency">
            <i style={{ width: `${selectedStrategy.frequency}%` }} />
          </div>
          <small>
            Frequency {selectedStrategy.frequency}% · sizing baseline: open 2.2BB,
            3-bet 8-10BB in position, 10-12BB out of position.
          </small>
        </aside>
      </div>
    </section>
  );
}

function PreflopMatrixRow({ position, rowIndex, rowRank, selectedHand, onHandSelect }) {
  return (
    <>
      <span className="poker-matrix-header">{rowRank}</span>
      {POKER_MATRIX_RANKS.map((_, colIndex) => {
        const handKey = getMatrixHandKey(rowIndex, colIndex);
        const strategy = getPreflopStrategyForHand(handKey, position);
        const selected = handKey === selectedHand;
        return (
          <button
            key={handKey}
            type="button"
            className={`poker-matrix-cell ${strategy.tier}${selected ? " selected" : ""}`}
            data-hand={handKey}
            title={`${handKey}: ${strategy.label}`}
            aria-pressed={selected}
            onClick={() => onHandSelect?.(handKey)}
          >
            <strong>{handKey}</strong>
            <span>{strategy.code}</span>
          </button>
        );
      })}
    </>
  );
}
