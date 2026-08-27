import { useId, type ReactNode } from "react";

import { Button } from "../../../design-system/primitives/Button";
import type { ProblemDetail } from "../../../domains/problems/problems.schema";
import { AttemptComposer, type AttemptComposerProps } from "./AttemptComposer";
import { HintPanel, type HintPanelProps } from "./HintPanel";
import { NoteEditor, type NoteEditorProps } from "./NoteEditor";
import { TrainingResult, type TrainingResultProps } from "./TrainingResult";
import styles from "./ProblemsWorkspace.module.css";

export type ProblemSolutionState = Readonly<{
  content: ReactNode;
  onReveal: () => void;
  revealed: boolean;
  disabled?: boolean;
  error?: ReactNode;
  isLoading?: boolean;
}>;

export type ProblemDetailCopy = Readonly<{
  attempts: string;
  bestScore: string;
  bookmark: string;
  complete: string;
  completing: string;
  companies: string;
  difficultyLabels: Readonly<Record<ProblemDetail["difficulty"], string>>;
  next: string;
  navigation: string;
  previous: string;
  prompt: string;
  readyDescription: string;
  readyLabel: string;
  revealSolution: string;
  revealingSolution: string;
  solution: string;
  start: string;
  starting: string;
  tags: string;
  trainingActions: string;
  unbookmark: string;
}>;

const defaultCopy: ProblemDetailCopy = {
  attempts: "尝试",
  bestScore: "最高分",
  bookmark: "收藏题目",
  complete: "完成本次训练",
  completing: "正在确认训练结果",
  companies: "常考公司",
  difficultyLabels: {
    Easy: "简单",
    Hard: "困难",
    Medium: "中等",
  },
  next: "下一题",
  navigation: "题目切换",
  previous: "上一题",
  prompt: "题目",
  readyDescription: "启动后可以使用提示、提交答案并记录正式训练结果。",
  readyLabel: "准备开始",
  revealSolution: "查看参考解析",
  revealingSolution: "正在获取解析",
  solution: "参考解析",
  start: "开始这道题",
  starting: "正在启动训练",
  tags: "知识点",
  trainingActions: "训练操作",
  unbookmark: "取消收藏",
};

const localizedProblemValue = (
  language: "en" | "zh-CN",
  zh: string | null,
  en: string | null,
): string => language === "en"
  ? en ?? zh ?? "Untitled problem"
  : zh ?? en ?? "未命名题目";

export type ProblemDetailPanelProps = Readonly<{
  canComplete: boolean;
  isSessionActive: boolean;
  note: NoteEditorProps;
  onComplete: () => void;
  onStart: () => void;
  onToggleFavorite: () => void;
  problem: ProblemDetail;
  solution: ProblemSolutionState;
  attempt?: AttemptComposerProps;
  className?: string;
  completeDisabled?: boolean;
  copy?: ProblemDetailCopy;
  favoriteDisabled?: boolean;
  hint?: HintPanelProps;
  isCompleting?: boolean;
  isStarting?: boolean;
  language?: "en" | "zh-CN";
  nextDisabled?: boolean;
  onNextProblem?: () => void;
  onPreviousProblem?: () => void;
  previousDisabled?: boolean;
  recovery?: ReactNode;
  result?: TrainingResultProps;
  startDisabled?: boolean;
}>;

export function ProblemDetailPanel({
  attempt,
  canComplete,
  className,
  completeDisabled = false,
  copy = defaultCopy,
  favoriteDisabled = false,
  hint,
  isCompleting = false,
  isSessionActive,
  isStarting = false,
  language = "zh-CN",
  nextDisabled = false,
  note,
  onComplete,
  onNextProblem,
  onPreviousProblem,
  onStart,
  onToggleFavorite,
  previousDisabled = false,
  problem,
  recovery,
  result,
  solution,
  startDisabled = false,
}: ProblemDetailPanelProps) {
  const solutionId = useId();
  const title = localizedProblemValue(language, problem.titleZh, problem.titleEn);
  const subtitle = localizedProblemValue(
    language === "en" ? "zh-CN" : "en",
    problem.titleZh,
    problem.titleEn,
  );
  const prompt = localizedProblemValue(language, problem.promptZh, problem.promptEn);
  const classes = [styles.detailCard, className].filter(Boolean).join(" ");
  const favorite = problem.favorite.favorite;

  return (
    <article className={classes} data-problem-id={problem.id}>
      <header className={styles.detailHero}>
        <div className={styles.detailBadges}>
          <span
            className={styles.difficultyBadge}
            data-difficulty={problem.difficulty.toLowerCase()}
          >
            {copy.difficultyLabels[problem.difficulty]}
          </span>
          <span>{problem.category}</span>
          <span>{problem.source.name}</span>
          {problem.hot100 ? <span>HOT 100</span> : null}
        </div>
        <div className={styles.detailTitleRow}>
          <div>
            <h2>{title}</h2>
            {subtitle === title ? null : <p>{subtitle}</p>}
          </div>
          <button
            aria-label={favorite ? copy.unbookmark : copy.bookmark}
            aria-pressed={favorite}
            className={styles.detailFavorite}
            disabled={favoriteDisabled}
            onClick={onToggleFavorite}
            type="button"
          >
            <span aria-hidden="true">{favorite ? "★" : "☆"}</span>
          </button>
        </div>
      </header>

      <div className={styles.detailBody}>
        {onPreviousProblem === undefined && onNextProblem === undefined ? null : (
          <nav aria-label={copy.navigation} className={styles.problemNavigation}>
            {onPreviousProblem === undefined ? <span /> : (
              <Button
                disabled={previousDisabled}
                onClick={onPreviousProblem}
                size="small"
                variant="ghost"
              >
                <span aria-hidden="true">←</span>{copy.previous}
              </Button>
            )}
            {onNextProblem === undefined ? null : (
              <Button
                disabled={nextDisabled}
                onClick={onNextProblem}
                size="small"
                variant="ghost"
              >
                {copy.next}<span aria-hidden="true">→</span>
              </Button>
            )}
          </nav>
        )}

        <section className={styles.promptSection}>
          <h3>{copy.prompt}</h3>
          <p>{prompt}</p>
          {problem.tags.length === 0 ? null : (
            <ul className={styles.tagList} aria-label={copy.tags}>
              {problem.tags.map((tag) => <li key={tag}>{tag}</li>)}
            </ul>
          )}
        </section>

        <dl className={styles.detailStats}>
          <div>
            <dt>{copy.attempts}</dt>
            <dd data-qg-metric>{problem.progress.attemptCount}</dd>
          </div>
          <div>
            <dt>{copy.bestScore}</dt>
            <dd data-qg-metric>{problem.progress.bestScore ?? "—"}</dd>
          </div>
          <div>
            <dt>{copy.companies}</dt>
            <dd>{problem.companies[0] ?? "—"}</dd>
          </div>
        </dl>

        {recovery === undefined ? null : <div className={styles.detailRecovery}>{recovery}</div>}

        <section aria-label={copy.trainingActions} className={styles.trainingFlow}>
          {result === undefined ? null : <TrainingResult {...result} />}

          {result !== undefined ? null : isSessionActive ? (
            <>
              {hint === undefined ? null : <HintPanel {...hint} />}
              {attempt === undefined ? null : <AttemptComposer {...attempt} />}

              <section className={styles.solutionPanel} aria-labelledby={`${solutionId}-title`}>
                <Button
                  aria-controls={`${solutionId}-content`}
                  aria-expanded={solution.revealed}
                  disabled={solution.disabled ?? false}
                  isLoading={solution.isLoading ?? false}
                  loadingLabel={copy.revealingSolution}
                  onClick={solution.onReveal}
                  variant="secondary"
                >
                  <span aria-hidden="true">◇</span>
                  <span id={`${solutionId}-title`}>
                    {solution.revealed ? copy.solution : copy.revealSolution}
                  </span>
                  <span aria-hidden="true">{solution.revealed ? "↑" : "↓"}</span>
                </Button>
                {solution.revealed ? (
                  <div className={styles.solutionContent} id={`${solutionId}-content`}>
                    {solution.content}
                  </div>
                ) : null}
                {solution.error === undefined ? null : (
                  <div className={styles.inlineError} role="alert">{solution.error}</div>
                )}
              </section>

              <div className={styles.completeAction}>
                <Button
                  disabled={!canComplete || completeDisabled}
                  fullWidth
                  isLoading={isCompleting}
                  loadingLabel={copy.completing}
                  onClick={onComplete}
                  size="large"
                >
                  {copy.complete}
                </Button>
              </div>
            </>
          ) : (
            <div className={styles.startTraining}>
              <div>
                <strong>{copy.readyLabel}</strong>
                <p>{copy.readyDescription}</p>
              </div>
              <Button
                disabled={startDisabled}
                isLoading={isStarting}
                loadingLabel={copy.starting}
                onClick={onStart}
                size="large"
              >
                {copy.start}
              </Button>
            </div>
          )}
        </section>

        <NoteEditor {...note} />
      </div>
    </article>
  );
}
