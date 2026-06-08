export function ProblemCard({
  item,
  isEnglish,
  t,
  onOpen,
  onToggleCompleted,
  onToggleSaved
}) {
  const completeLabel = item.completed
    ? (isEnglish ? "Mark unfinished" : "标记为未完成")
    : (isEnglish ? "Mark completed" : "标记完成");
  const saveLabel = item.favorite ? t("removeSaved") : t("saveForReview");

  return (
    <article
      className="problem-card"
      data-problem-id={item.id}
      tabIndex={0}
      role="button"
      aria-label={`${t("openProblem")}: ${item.title}`}
      onClick={() => onOpen(item.id)}
      onKeyDown={(event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        onOpen(item.id);
      }}
    >
      <h3>{item.title}</h3>
      <button
        type="button"
        className={`problem-complete-button problem-complete-corner${item.completed ? " active" : ""}`}
        title={completeLabel}
        aria-label={completeLabel}
        onClick={(event) => {
          event.stopPropagation();
          onToggleCompleted(item.id);
        }}
      >
        <i data-lucide={item.completed ? "check-circle-2" : "circle"} />
      </button>
      <div className="problem-meta">
        {item.bookName ? <span className="problem-tag source">{item.bookName}</span> : null}
        {item.companies.map((company) => (
          <span key={company.id || company.name} className="problem-tag company">{company.name}</span>
        ))}
        <span className="problem-tag topic">{item.category}</span>
        <span className={`problem-tag difficulty ${item.difficultyClass}`}>{item.difficulty}</span>
        {item.tags.map((tag, index) => (
          <span key={`${tag}-${index}`} className="problem-tag skill">{tag}</span>
        ))}
        {item.lastScore != null && Number.isFinite(Number(item.lastScore)) ? (
          <span className="problem-tag score">
            {t("lastScore")}
            {" "}
            {Math.round(Number(item.lastScore))}
            /100
          </span>
        ) : null}
      </div>
      <div className="problem-prompt">{item.preview}</div>
      <div className="problem-card-footer">
        <div className="problem-card-metrics">
          <span className="problem-card-metric">
            <i data-lucide="heart" />
            <span>{item.likeCount}</span>
          </span>
          <span className="problem-card-metric">
            <i data-lucide="message-square" />
            <span>{item.commentCount}</span>
          </span>
        </div>
        <button
          type="button"
          className={`problem-save-button${item.favorite ? " active" : ""}`}
          title={saveLabel}
          aria-label={saveLabel}
          onClick={(event) => {
            event.stopPropagation();
            onToggleSaved(item.id);
          }}
        >
          <i data-lucide={item.favorite ? "bookmark-check" : "bookmark"} />
        </button>
        <span className="problem-card-open">
          {t("viewFullProblem")}
          {" "}
          <i data-lucide="chevron-right" />
        </span>
      </div>
    </article>
  );
}
