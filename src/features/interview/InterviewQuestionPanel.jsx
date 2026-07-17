import { InterviewRichText } from "./InterviewRichText.jsx";
import { QuantyImage } from "@/components/common/QuantyImage.jsx";

const DIFFICULTY_DEFS = {
  easy: { label: "简单", className: "is-easy" },
  medium: { label: "中等", className: "is-medium" },
  hard: { label: "困难", className: "is-hard" }
};

function splitQuestionMeta(meta = "") {
  const parts = String(meta).split("·").map((part) => part.trim()).filter(Boolean);
  let difficulty = null;
  const topics = [];
  parts.forEach((part) => {
    const def = DIFFICULTY_DEFS[part.toLowerCase()];
    if (def && !difficulty) {
      difficulty = def;
      return;
    }
    topics.push(part);
  });
  return { difficulty, topics };
}

export function InterviewQuestionPanel({
  panel,
  renderRichText,
  appendInlineRichText,
  onToggleItem,
  onRequestHint,
  hintHidden = true
}) {
  void renderRichText;
  if (!panel || panel.empty) {
    return (
      <aside id="interviewQuestionPanel" className="interview-question-panel" aria-label="本轮面试题目">
        <div className="interview-question-panel-empty">
          <QuantyImage asset="interview" size="small" draggable="false" />
          <p>{panel?.emptyText || ""}</p>
        </div>
      </aside>
    );
  }

  const current = panel.items.find((item) => item.current) || panel.items[0] || null;
  const currentMeta = current ? splitQuestionMeta(current.meta) : { difficulty: null, topics: [] };
  const currentTitle = current ? current.title.replace(/^Q\d+[.、]\s*/, "") : "";

  return (
    <aside id="interviewQuestionPanel" className="interview-question-panel" aria-label="本轮面试题目">
      {current ? (
        <article className="interview-current-card">
          <header className="interview-current-head">
            <div className="interview-current-pills">
              {currentMeta.difficulty ? (
                <span className={`interview-diff-pill ${currentMeta.difficulty.className}`}>
                  {currentMeta.difficulty.label}
                </span>
              ) : null}
              {currentMeta.topics.map((topic) => (
                <span key={topic} className="interview-topic-pill">{topic}</span>
              ))}
              <span className="interview-q-counter">{`Q${current.index + 1} / ${panel.items.length}`}</span>
            </div>
            <h3>{currentTitle}</h3>
          </header>
          <div className="interview-current-body">
            <p className="interview-current-prompt">{current.prompt}</p>
            {!hintHidden ? (
              <div>
                <button type="button" className="interview-hint-btn" onClick={() => onRequestHint?.()}>
                  <i data-lucide="lightbulb" />
                  查看提示
                </button>
              </div>
            ) : null}
            {currentMeta.topics.length ? (
              <div className="interview-current-tags">
                <span className="interview-tags-label">考点</span>
                {currentMeta.topics.map((topic) => (
                  <span key={topic} className="interview-tag-chip">{topic}</span>
                ))}
              </div>
            ) : null}
          </div>
        </article>
      ) : null}
      <div className="interview-panel-progress">
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
      </div>
    </aside>
  );
}
