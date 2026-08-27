import type { ReactNode } from "react";

import { Button } from "../../../design-system/primitives/Button";
import { QuantyImage } from "../../../design-system/patterns/QuantyImage";
import { ResultSummary } from "../../../design-system/patterns/ResultSummary";
import styles from "./ProblemsWorkspace.module.css";

export type TrainingResultPlanEffect = Readonly<{
  description: ReactNode;
  taskCompleted: boolean;
}>;

export type TrainingResultProps = Readonly<{
  onNext: () => void;
  score: number;
  xpDelta: number;
  ariaLabel?: string;
  className?: string;
  description?: ReactNode;
  isNextLoading?: boolean;
  loadingLabel?: string;
  nextDisabled?: boolean;
  nextLabel?: string;
  nextAction?: ReactNode;
  nextActionLabel?: ReactNode;
  planEffect?: TrainingResultPlanEffect | null;
  rewardLabel?: string;
  rewardPrefix?: ReactNode;
  scoreLabel?: string;
  skillEffect?: ReactNode;
  skillEffectLabel?: ReactNode;
  title?: ReactNode;
}>;

export function TrainingResult({
  ariaLabel = "训练完成",
  className,
  description = "结果已经确认。你可以继续下一题，奖励不会阻挡后续操作。",
  isNextLoading = false,
  loadingLabel = "正在打开下一题",
  nextDisabled = false,
  nextLabel = "继续下一题",
  nextAction,
  nextActionLabel = "下一步",
  onNext,
  planEffect = null,
  rewardLabel = "训练奖励",
  rewardPrefix = "本次获得",
  score,
  scoreLabel = "分",
  skillEffect,
  skillEffectLabel = "能力变化",
  title = "本次训练结果",
  xpDelta,
}: TrainingResultProps) {
  const classes = [styles.trainingResult, className].filter(Boolean).join(" ");
  const status = score >= 80 ? "completed" : "partial";

  return (
    <section aria-label={ariaLabel} className={classes}>
      <ResultSummary
        actions={(
          <Button
            disabled={nextDisabled}
            isLoading={isNextLoading}
            loadingLabel={loadingLabel}
            onClick={onNext}
          >
            {nextLabel}
          </Button>
        )}
        description={description}
        metrics={[
          ...(skillEffect === undefined ? [] : [{
            label: skillEffectLabel,
            value: skillEffect,
          }]),
          ...(nextAction === undefined ? [] : [{
            label: nextActionLabel,
            value: nextAction,
          }]),
        ]}
        scoreLabel={scoreLabel}
        scoreValue={score}
        status={status}
        title={title}
      />
      <aside aria-label={rewardLabel} className={styles.rewardReveal}>
        <div className={styles.rewardCopy}>
          <span>{rewardPrefix}</span>
          <strong data-qg-metric>+{xpDelta} XP</strong>
          {planEffect === null ? null : (
            <p data-plan-task-completed={planEffect.taskCompleted || undefined}>
              {planEffect.description}
            </p>
          )}
        </div>
        <QuantyImage
          alt=""
          asset="trophy"
          className={styles.rewardMascot}
          prominence="supporting"
          size="small"
        />
      </aside>
    </section>
  );
}
