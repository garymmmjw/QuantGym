import { useEffect, useRef, useState } from "react";
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
import { FreePracticeTimer, FreePracticeOutcomes } from "./FreePracticeAttempt.jsx";
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { PRIVATE_WORKSPACES } from '../../modules/privacyPolicy.js';
import { problemNoteStorageKey } from './problemNotes.js';

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
  practiceAttempt,
  listItem,
  problem,
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
  const ownerId = useAuthStore(state => state.currentUser?.id || '');
  const [note, setNote] = useState({ key: '', text: '' });
  const bodyRef = useRef(null);
  const detailId = detail?.id || "";
  const noteKey = problemNoteStorageKey(ownerId, detailId);
  const noteDraft = note.key === noteKey ? note.text : '';

  useEffect(() => {
    if (!noteKey) return;
    try {
      setNote({ key: noteKey, text: window.localStorage.getItem(noteKey) || '' });
    } catch {
      setNote({ key: noteKey, text: '' });
    }
    setCommentDraft('');
  }, [noteKey]);

  if (!detail) return null;

  const canComplete = detail.manualCompletionAllowed !== false;
  const completeLabel = detail.completed
    ? (isEnglish ? "Completed · Undo" : "已完成 · 撤销")
    : (isEnglish ? "I finished this problem" : "我做完了");

  const info = problem || getCatalogProblemInfo(detail.id);
  const difficulty = info?.difficulty || detail.meta?.[1] || "";
  const diffKey = difficultyClass(difficulty) || "medium";
  const titles = problem ? {
    main: (isEnglish ? problem.titleEn || problem.titleZh : problem.titleZh || problem.titleEn) || detail.title,
    sub: isEnglish ? problem.titleZh : problem.titleEn
  } : getProblemTitlePair(detail.id, detail.title, isEnglish);
  const mainTitle = titles.main;
  const subTitle = titles.sub !== mainTitle ? titles.sub : "";
  const topicLabel = localizeCategoryLabel(info?.category || detail.meta?.[0] || "", isEnglish);
  const sourceLabel = getSourceShortLabel(info?.bookSlug) || info?.bookName || "";
  const provenance = info?.provenance;
  const answerStatusLabel = {
    source: isEnglish ? "Source answer" : "原书解答",
    corrected: isEnglish ? "Corrected answer" : "订正解答",
    supplemented: isEnglish ? "Supplemented answer" : "补充解答",
    reviewed: isEnglish ? "Reviewed answer" : "已核对解答"
  }[provenance?.answerStatus];
  const extraTags = (detail.meta || []).slice(2, 5);
  const firms = (listItem?.companies || []).map((company) => company.name).filter(Boolean);
  const lastScore = listItem?.lastScore;
  const accText = lastScore != null && Number.isFinite(Number(lastScore))
    ? `${Math.round(Number(lastScore))}%`
    : "--";

  const handleNoteChange = (event) => {
    if (!noteKey) return;
    const value = event.target.value;
    setNote({ key: noteKey, text: value });
    try {
      if (value) window.localStorage.setItem(noteKey, value);
      else window.localStorage.removeItem(noteKey);
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
        {provenance?.originalNumber ? <div className="fp-source-reference" data-original-number={provenance.originalNumber}>
          <span>{isEnglish ? "Book question " : "原书题号 "}{provenance.originalNumber}</span>
          {provenance.pdfPage ? <span>{isEnglish ? `PDF page ${provenance.pdfPage}` : `PDF 第 ${provenance.pdfPage} 页`}</span> : null}
        </div> : null}
      </header>

      <div className="qg-problem-detail-body" ref={bodyRef}>
        {practiceAttempt ? <FreePracticeTimer practice={practiceAttempt} isEnglish={isEnglish} onShowAnswer={() => {
          onRevealBlock(detail.id, "answer");
          window.requestAnimationFrame(() => bodyRef.current?.querySelector(".qg-block-answer")?.scrollIntoView({ block: "start", behavior: "smooth" }));
        }} /> : null}
        {/* Legacy toolbar retained for functionality; visually hidden by the replica skin. */}
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
            {!practiceAttempt ? (canComplete ? <button
              type="button"
              aria-pressed={Boolean(detail.completed)}
              className={`secondary-button problem-detail-complete${detail.completed ? " active" : ""}`}
              onClick={() => onToggleCompleted(detail.id)}
            >
              <i data-lucide={detail.completed ? "check-circle-2" : "circle"} />
              {" "}
              {completeLabel}
            </button> : <a className="secondary-button" href="/leetcode">{isEnglish ? "View synced LeetCode progress" : "查看力扣同步进度"}</a>) : null}
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

        {detail.answerRevealed && provenance && answerStatusLabel ? <aside className="fp-answer-provenance" data-answer-status={provenance.answerStatus}>
          <strong>{answerStatusLabel}</strong>
          {provenance.reviewNotes ? <ProblemRichText content={provenance.reviewNotes} renderInto={renderInto} /> : null}
          {provenance.sourceReference && provenance.answerStatus !== "source" ? <details>
            <summary>{isEnglish ? "Compare the source answer" : "查看原书答案对照"}</summary>
            <ProblemRichText content={provenance.sourceReference} renderInto={renderInto} />
          </details> : null}
        </aside> : null}

        {practiceAttempt ? <FreePracticeOutcomes practice={practiceAttempt} isEnglish={isEnglish} /> : <div className="qg-detail-stats">
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
        </div>}

        <textarea
          className="qg-detail-notes"
          placeholder={isEnglish ? "Jot a note… (autosaved)" : "写点笔记…（自动保存）"}
          value={noteDraft}
          onChange={handleNoteChange}
        />

        <div className="qg-detail-cta-row">
          {!practiceAttempt ? (canComplete ? <button
            type="button"
            aria-pressed={Boolean(detail.completed)}
            className={`qg-detail-solve${detail.completed ? " is-done" : ""}`}
            onClick={() => onToggleCompleted(detail.id)}
          >
            {completeLabel}
          </button> : <a className="qg-detail-solve" href="/leetcode">{isEnglish ? "View synced LeetCode progress" : "查看力扣同步进度"}</a>) : null}
          <button
            type="button"
            className={`qg-detail-bookmark${detail.favorite ? " active" : ""}`}
            title={detail.favorite ? t("savedForReview") : t("saveForReview")}
            aria-label={detail.favorite ? t("savedForReview") : t("saveForReview")}
            onClick={() => onToggleSaved(detail.id)}
          >
            <i data-lucide={detail.favorite ? "bookmark-check" : "bookmark"} />
          </button>
        </div>

        {!practiceAttempt ? <p className="problem-completion-note">
          {!canComplete
            ? (isEnglish ? "Completion comes from your linked LeetCode account. Opening or drawing a problem does not count." : "完成记录以关联的力扣账号为准，打开或抽取题目不会计数。")
            : detail.countsTowardPractice === false
              ? (isEnglish ? "This training item can be marked for your own progress; it is excluded from completed-problem totals." : "可标记这道训练题的个人进度；心算与推理训练不计入刷题数量。")
              : (isEnglish ? "Only clicking “I finished this problem” records completion. Opening a question or revealing its answer does not count." : "点击「我做完了」才记录完成；打开题目、查看答案不会增加刷题数量。")}
        </p> : null}

        {!PRIVATE_WORKSPACES && <section className="problem-social-panel">
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
        </section>}
      </div>
    </>
  );
}
