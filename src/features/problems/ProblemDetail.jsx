import { useState } from "react";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { ProblemRichText } from "./ProblemRichText.jsx";

function DetailBlock({
  title,
  content,
  locked,
  revealed,
  lockedTitle,
  revealLabel,
  lockedHint,
  onReveal,
  renderInto,
  t
}) {
  const isLocked = Boolean(locked && !revealed);

  return (
    <section className={`problem-detail-block${isLocked ? " is-locked" : locked ? " is-unlocked" : ""}`}>
      <h3>{title}</h3>
      <ProblemRichText content={content} renderInto={renderInto} />
      {isLocked ? (
        <div className="problem-lock-overlay">
          <span className="problem-lock-icon" aria-hidden="true"><i data-lucide="lock" /></span>
          <strong>{lockedTitle || t("problemContentLocked")}</strong>
          <small>{lockedHint || t("problemLockedHint")}</small>
          <button className="secondary-button compact" type="button" onClick={onReveal}>
            <i data-lucide="eye" />
            {revealLabel || t("problemRevealContent")}
          </button>
        </div>
      ) : null}
    </section>
  );
}

export function ProblemDetail({
  detail,
  t,
  isEnglish,
  renderInto,
  formatDate,
  onBack,
  onOpenProblem,
  onToggleCompleted,
  onToggleSaved,
  onSelectInterview,
  onRevealBlock,
  onToggleLike,
  onPostComment,
  onDeleteComment
}) {
  const [commentDraft, setCommentDraft] = useState("");

  if (!detail) return null;

  const completeLabel = detail.completed
    ? (isEnglish ? "Completed" : "已完成")
    : (isEnglish ? "Mark completed" : "标记完成");

  return (
    <>
      <div className="problem-detail-top">
        <button className="secondary-button" type="button" onClick={onBack}>
          <i data-lucide="arrow-left" />
          {" "}
          {t("backToProblems")}
        </button>
        <div className="problem-detail-navigation">
          <button
            className="secondary-button compact problem-detail-nav-button"
            type="button"
            disabled={!detail.navigation.previousId}
            aria-label={isEnglish ? "Previous" : "上一题"}
            onClick={() => detail.navigation.previousId && onOpenProblem(detail.navigation.previousId)}
          >
            <i data-lucide="chevron-left" />
            {isEnglish ? "Previous" : "上一题"}
          </button>
          <span className="problem-detail-position">
            {detail.navigation.index >= 0 && detail.navigation.total
              ? `${detail.navigation.index + 1} / ${detail.navigation.total}`
              : ""}
          </span>
          <button
            className="secondary-button compact problem-detail-nav-button"
            type="button"
            disabled={!detail.navigation.nextId}
            aria-label={isEnglish ? "Next" : "下一题"}
            onClick={() => detail.navigation.nextId && onOpenProblem(detail.navigation.nextId)}
          >
            <i data-lucide="chevron-right" />
            {isEnglish ? "Next" : "下一题"}
          </button>
        </div>
        <div className="problem-detail-actions">
          <button
            type="button"
            className={`secondary-button problem-detail-complete${detail.completed ? " active" : ""}`}
            onClick={() => onToggleCompleted(detail.id)}
          >
            <i data-lucide={detail.completed ? "check-circle-2" : "circle"} />
            {" "}
            {completeLabel}
          </button>
          <button
            type="button"
            className={`secondary-button problem-detail-save${detail.favorite ? " active" : ""}`}
            onClick={() => onToggleSaved(detail.id)}
          >
            <i data-lucide={detail.favorite ? "bookmark-check" : "bookmark"} />
            {" "}
            {detail.favorite ? t("savedForReview") : t("saveForReview")}
          </button>
          <button className="primary-button" type="button" onClick={() => onSelectInterview(detail.id)}>
            <i data-lucide="messages-square" />
            {" "}
            {t("useForMock")}
          </button>
        </div>
      </div>

      <h2>{detail.title}</h2>
      <div className="problem-meta">
        {detail.meta.map((label, index) => (
          <span key={`${label}-${index}`} className="pill">{label}</span>
        ))}
      </div>

      <DetailBlock
        title={t("problemQuestion")}
        content={detail.question}
        renderInto={renderInto}
        t={t}
      />
      <DetailBlock
        title={t("problemHint")}
        content={detail.hint}
        locked
        revealed={detail.hintRevealed}
        lockedTitle={t("problemHintLocked")}
        revealLabel={t("problemRevealHint")}
        onReveal={() => onRevealBlock(detail.id, "hint")}
        renderInto={renderInto}
        t={t}
      />
      <DetailBlock
        title={t("problemAnswer")}
        content={detail.answer}
        locked
        revealed={detail.answerRevealed}
        lockedTitle={t("problemAnswerLocked")}
        revealLabel={t("problemRevealAnswer")}
        onReveal={() => onRevealBlock(detail.id, "answer")}
        renderInto={renderInto}
        t={t}
      />

      <section className="problem-social-panel">
        <div className="problem-social-header">
          <div>
            <h3>{t("problemDiscussion")}</h3>
            <p>{t("problemDiscussionHint")}</p>
          </div>
          <button
            type="button"
            className={`problem-like-button${detail.social.liked ? " active" : ""}`}
            onClick={() => onToggleLike(detail.id)}
          >
            <i data-lucide="heart" />
            <span>{detail.social.liked ? t("unlike") : t("like")}</span>
            <strong>{detail.social.likeCount}</strong>
          </button>
        </div>
        {detail.socialNotice ? <p className="problem-social-notice">{detail.socialNotice}</p> : null}
        <div className="problem-comments">
          {!detail.social.comments.length ? (
            <EmptyState title={t("problemCommentEmpty")} />
          ) : detail.social.comments.map((comment) => (
            <article key={comment.id} className="problem-comment">
              <div>
                <strong>{comment.author || "Quant"}</strong>
                <time>{formatDate?.(comment.createdAt) || ""}</time>
                {comment.isOwn ? (
                  <button
                    type="button"
                    className="problem-comment-delete"
                    title={t("deleteComment")}
                    aria-label={t("deleteComment")}
                    onClick={() => onDeleteComment(detail.id, comment.id)}
                  >
                    <i data-lucide="trash-2" />
                  </button>
                ) : null}
              </div>
              <p>{comment.text}</p>
            </article>
          ))}
        </div>
        <form
          className="problem-comment-form"
          onSubmit={(event) => {
            event.preventDefault();
            onPostComment(detail.id, commentDraft);
            setCommentDraft("");
          }}
        >
          <textarea
            rows={3}
            maxLength={1200}
            placeholder={t("problemCommentPlaceholder")}
            value={commentDraft}
            onChange={(event) => setCommentDraft(event.target.value)}
          />
          <button className="primary-button" type="submit">
            <i data-lucide="send" />
            {" "}
            {t("problemCommentPost")}
          </button>
        </form>
      </section>
    </>
  );
}
