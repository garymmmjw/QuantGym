import { useEffect, useState } from "react";
import { EmptyState } from "../../components/common/EmptyState.jsx";
import { difficultyClass } from "../../modules/problems/format.js";
import {
  getCatalogProblemInfo,
  getProblemTitlePair,
  getSourceShortLabel,
  localizeCategoryLabel,
  localizeDifficultyLabel
} from "./problemDisplayLabels.js";
import { ProblemRichText } from "./ProblemRichText.jsx";

const NOTE_STORAGE_PREFIX = "quantgym.problemNote.";

function DetailBlock({
  title,
  content,
  variant,
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
    <section className={`problem-detail-block qg-block-${variant || "plain"}${isLocked ? " is-locked" : locked ? " is-unlocked" : ""}`}>
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
  listItem,
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
  const [noteDraft, setNoteDraft] = useState("");
  const detailId = detail?.id || "";

  useEffect(() => {
    if (!detailId) return;
    try {
      setNoteDraft(window.localStorage.getItem(`${NOTE_STORAGE_PREFIX}${detailId}`) || "");
    } catch {
      setNoteDraft("");
    }
  }, [detailId]);

  if (!detail) return null;

  const completeLabel = detail.completed
    ? (isEnglish ? "Completed" : "已完成")
    : (isEnglish ? "Mark completed" : "标记完成");

  const info = getCatalogProblemInfo(detail.id);
  const difficulty = info?.difficulty || detail.meta?.[1] || "";
  const diffKey = difficultyClass(difficulty) || "medium";
  const { main: mainTitle, sub: subTitle } = getProblemTitlePair(detail.id, detail.title, isEnglish);
  const topicLabel = localizeCategoryLabel(info?.category || detail.meta?.[0] || "", isEnglish);
  const sourceLabel = getSourceShortLabel(info?.bookSlug) || info?.bookName || "";
  const extraTags = (detail.meta || []).slice(2, 5);
  const firms = (listItem?.companies || []).map((company) => company.name).filter(Boolean);
  const lastScore = listItem?.lastScore;
  const accText = lastScore != null && Number.isFinite(Number(lastScore))
    ? `${Math.round(Number(lastScore))}%`
    : "--";

  const handleNoteChange = (event) => {
    const value = event.target.value;
    setNoteDraft(value);
    try {
      if (value) window.localStorage.setItem(`${NOTE_STORAGE_PREFIX}${detail.id}`, value);
      else window.localStorage.removeItem(`${NOTE_STORAGE_PREFIX}${detail.id}`);
    } catch {
      /* storage unavailable */
    }
  };

  return (
    <>
      <header className={`qg-problem-detail-head is-${diffKey}`}>
        <div className="qg-problem-detail-tags">
          <span className={`qg-detail-diff is-${diffKey}`}>{localizeDifficultyLabel(difficulty, isEnglish)}</span>
          {topicLabel ? <span className="qg-detail-tag">{topicLabel}</span> : null}
          {sourceLabel ? <span className="qg-detail-tag">{sourceLabel}</span> : null}
        </div>
        <h2 className="qg-detail-title">{mainTitle}</h2>
        {subTitle ? <div className="qg-detail-sub">{subTitle}</div> : null}
      </header>

      <div className="qg-problem-detail-body">
        <div className="problem-detail-top qg-detail-utility-row">
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
        </div>

        <DetailBlock
          title={t("problemQuestion")}
          content={detail.question}
          variant="question"
          renderInto={renderInto}
          t={t}
        />

        {extraTags.length ? (
          <div className="qg-detail-tag-row">
            {extraTags.map((tag, index) => (
              <span key={`${tag}-${index}`}>{tag}</span>
            ))}
          </div>
        ) : null}

        <DetailBlock
          title={t("problemHint")}
          content={detail.hint}
          variant="hint"
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
          variant="answer"
          locked
          revealed={detail.answerRevealed}
          lockedTitle={t("problemAnswerLocked")}
          revealLabel={t("problemRevealAnswer")}
          onReveal={() => onRevealBlock(detail.id, "answer")}
          renderInto={renderInto}
          t={t}
        />

        <div className="qg-detail-stats">
          <div>
            <span>{isEnglish ? "Pass rate" : "通过率"}</span>
            <b>{accText}</b>
          </div>
          <div>
            <span>{isEnglish ? "Attempts" : "尝试"}</span>
            <b>--</b>
          </div>
          <div>
            <span>{isEnglish ? "Asked at" : "常考"}</span>
            <b className="is-firm">{firms.length ? firms.join(" · ") : "--"}</b>
          </div>
        </div>

        <textarea
          className="qg-detail-notes"
          placeholder={isEnglish ? "Jot a note… (autosaved)" : "写点笔记…（自动保存）"}
          value={noteDraft}
          onChange={handleNoteChange}
        />

        <div className="problem-detail-actions qg-detail-cta-row">
          <button
            type="button"
            className={`secondary-button problem-detail-complete${detail.completed ? " active" : ""}`}
            aria-pressed={detail.completed}
            onClick={() => onToggleCompleted(detail.id)}
          >
            <i data-lucide={detail.completed ? "check-circle-2" : "circle"} />
            {completeLabel}
          </button>
          <button
            type="button"
            className={`secondary-button problem-detail-save${detail.favorite ? " active" : ""}`}
            aria-pressed={detail.favorite}
            onClick={() => onToggleSaved(detail.id)}
          >
            <i data-lucide={detail.favorite ? "bookmark-check" : "bookmark"} />
            {detail.favorite ? t("savedForReview") : t("saveForReview")}
          </button>
          <button
            type="button"
            className="primary-button"
            data-problem-action="mock-interview"
            onClick={() => onSelectInterview(detail.id)}
          >
            <i data-lucide="messages-square" />
            {t("useForMock")}
          </button>
        </div>

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
              const result = onPostComment(detail.id, commentDraft);
              if (result && typeof result.then === "function") {
                result.then((actionResult) => {
                  if (actionResult?.ok !== false) setCommentDraft("");
                }).catch(() => {});
              } else if (result?.ok !== false) {
                setCommentDraft("");
              }
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
      </div>
    </>
  );
}
