import { useState } from "react";
import { useAuthStore } from '../../stores/AppServicesContext.jsx';
import { LocalTrainingRecovery } from '../../components/common/LocalTrainingRecovery.jsx';
import { ProblemNotes } from './ProblemNotes.jsx';
import { difficultyClass } from "../../modules/problems/format.js";
import {
  getCatalogProblemInfo,
  getProblemTitlePair,
  getSourceShortLabel,
  localizeCategoryLabel,
  localizeDifficultyLabel
} from "./problemDisplayLabels.js";
import { ProblemRichText } from "./ProblemRichText.jsx";

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
  onBack,
  onOpenProblem,
  onToggleCompleted,
  onToggleSaved,
  onSelectInterview,
  onRevealBlock,
}) {
  const ownerId = useAuthStore(state => state.currentUser?.id || '');

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
              {detail.favorite ? (isEnglish ? "Saved question" : "已收藏题目") : (isEnglish ? "Save question" : "收藏题目")}
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

        <LocalTrainingRecovery />
        <ProblemNotes key={JSON.stringify([ownerId, detail.id])} ownerId={ownerId} problemId={detail.id} isEnglish={isEnglish} />

        <div className="qg-detail-cta-row">
          <button
            type="button"
            className={`qg-detail-solve${detail.completed ? " is-done" : ""}`}
            onClick={() => onToggleCompleted(detail.id)}
          >
            {detail.completed
              ? (isEnglish ? "Solved ✓" : "已解决 ✓")
              : (isEnglish ? "Done · Mark solved" : "做完了 · 标记已解")}
          </button>
          <button
            type="button"
            className={`qg-detail-bookmark${detail.favorite ? " active" : ""}`}
            title={detail.favorite ? (isEnglish ? "Saved question" : "已收藏题目") : (isEnglish ? "Save question" : "收藏题目")}
            aria-label={detail.favorite ? (isEnglish ? "Saved question" : "已收藏题目") : (isEnglish ? "Save question" : "收藏题目")}
            onClick={() => onToggleSaved(detail.id)}
          >
            <i data-lucide={detail.favorite ? "bookmark-check" : "bookmark"} />
          </button>
        </div>


      </div>
    </>
  );
}
