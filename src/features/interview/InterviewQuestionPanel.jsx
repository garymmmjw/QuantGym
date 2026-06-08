import { InterviewRichText } from "./InterviewRichText.jsx";

export function InterviewQuestionPanel({ panel, renderRichText, appendInlineRichText, onToggleItem }) {
  if (!panel || panel.empty) {
    return (
      <aside id="interviewQuestionPanel" className="interview-question-panel" aria-label="本轮面试题目">
        <div className="interview-question-panel-empty">{panel?.emptyText || ""}</div>
      </aside>
    );
  }

  return (
    <aside id="interviewQuestionPanel" className="interview-question-panel" aria-label="本轮面试题目">
      <div className="interview-question-panel-head">
        <strong>{panel.title}</strong>
        <span>{panel.progress}</span>
      </div>
      <div className="interview-panel-stats">
        {panel.stats.map((item) => (
          <span key={item.label}>
            <small>{item.label}</small>
            <strong>{item.value}</strong>
          </span>
        ))}
      </div>
      <div className="interview-question-accordion">
        {panel.items.map((item) => (
          <article
            key={item.index}
            tabIndex={0}
            role="button"
            className={[
              "interview-question-item",
              item.expanded ? "is-expanded" : "",
              item.current ? "is-current" : "",
              item.scored ? "is-scored" : "",
              item.wrapped ? "is-wrapped" : ""
            ].filter(Boolean).join(" ")}
            data-interview-question-index={String(item.index)}
            aria-expanded={String(item.expanded)}
            onClick={() => onToggleItem?.(item.expanded ? -1 : item.index)}
            onKeyDown={(event) => {
              if (event.key !== "Enter" && event.key !== " ") return;
              event.preventDefault();
              onToggleItem?.(item.expanded ? -1 : item.index);
            }}
          >
            <span className="interview-question-main">
              <strong>{item.title}</strong>
              <small>{item.meta}</small>
            </span>
            <span
              className={`interview-question-score${item.current && panel.live ? " is-live-state" : ""}`}
              data-target-score={item.targetScore != null ? String(item.targetScore) : undefined}
            >
              {item.scoreText}
            </span>
            <div className="interview-question-detail">
              <p>{item.prompt}</p>
              {item.evaluation ? (
                <small>
                  <InterviewRichText
                    content={item.evaluation}
                    renderInto={(node, text) => appendInlineRichText?.(node, text)}
                    className=""
                  />
                </small>
              ) : null}
              {item.dimensions?.length ? (
                <div className="interview-dimension-bars">
                  {item.dimensions.map((dim) => (
                    <span key={dim.key}>
                      <b>{dim.label}</b>
                      <i style={{ "--score": dim.score / 5 }} />
                      <em>{dim.score}/5</em>
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </article>
        ))}
      </div>
    </aside>
  );
}
