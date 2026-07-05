import {
  getProblemRowNumber,
  getProblemTitlePair,
  localizeCategoryLabel,
  localizeDifficultyLabel
} from "./problemDisplayLabels.js";

export function ProblemCard({
  item,
  index,
  isActive,
  isEnglish,
  t,
  onOpen,
  // Kept in the signature for API compatibility: completion/bookmark actions
  // now live in the detail panel per the Playful Precision design.
  onToggleCompleted, // eslint-disable-line no-unused-vars
  onToggleSaved // eslint-disable-line no-unused-vars
}) {
  const { main, sub } = getProblemTitlePair(item.id, item.title, isEnglish);
  const rowNumber = getProblemRowNumber(item.id, index);
  const topicLabel = localizeCategoryLabel(item.category, isEnglish);
  const difficultyLabel = localizeDifficultyLabel(item.difficulty, isEnglish);

  return (
    <article
      className={`problem-card${isActive ? " is-active" : ""}`}
      data-problem-id={item.id}
      tabIndex={0}
      role="button"
      aria-label={`${t("openProblem")}: ${item.title}`}
      aria-current={isActive ? "true" : undefined}
      onClick={() => onOpen(item.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen(item.id);
      }}
    >
      <span className="qg-problem-num" aria-hidden="true">{rowNumber}</span>
      <div className="qg-problem-main">
        <div className="qg-problem-title-row">
          <h3>{main}</h3>
          {item.completed ? (
            <span className="qg-problem-solved" title={isEnglish ? "Solved" : "已解决"}>✓</span>
          ) : null}
        </div>
        {sub ? <div className="qg-problem-sub">{sub}</div> : null}
      </div>
      {topicLabel ? (
        <span className="problem-tag topic" data-q-topic>{topicLabel}</span>
      ) : null}
      <span className={`problem-tag difficulty ${item.difficultyClass}`}>{difficultyLabel}</span>
      <span className="qg-problem-acc" data-q-acc aria-hidden="true">
        {item.lastScore != null && Number.isFinite(Number(item.lastScore))
          ? `${Math.round(Number(item.lastScore))}%`
          : ""}
      </span>
    </article>
  );
}
