import { useId, type FormEvent } from "react";

import type {
  DiagnosticAnswerRequest,
  OfficialPlan,
} from "../../domains/plan/plan.schema";
import { Button } from "../../design-system/primitives/Button";
import { EmptyState } from "../../design-system/patterns/EmptyState";
import { ResultSummary } from "../../design-system/patterns/ResultSummary";
import type { AppLanguage } from "../../shared/i18n";
import {
  buildDiagnosticAnswerRequests,
  planDiagnosticCatalog,
  type DiagnosticAnswerSelection,
  type PlanDiagnosticQuestionId,
} from "../training/planDiagnosticCatalog";
import {
  formatDiagnosticScore,
  planCopyFor,
  skillLabelFor,
} from "./plan.model";
import styles from "./PlanDiagnosticPanel.module.css";

export type PlanDiagnosticPanelProps = Readonly<{
  diagnosticScore: number;
  diagnosticScores: OfficialPlan["diagnosticScores"];
  expanded: boolean;
  language: AppLanguage;
  onAnswerChange: (questionId: PlanDiagnosticQuestionId, optionId: string) => void;
  onOpen: () => void;
  onSubmit: (answers: DiagnosticAnswerRequest[]) => void;
  selections: readonly DiagnosticAnswerSelection[];
  status: OfficialPlan["diagnosticStatus"];
  disabled?: boolean;
  isSubmitting?: boolean;
  onCancel?: () => void;
}>;

const buildAnswersOrNull = (
  selections: readonly DiagnosticAnswerSelection[],
): DiagnosticAnswerRequest[] | null => {
  try {
    return buildDiagnosticAnswerRequests(selections);
  } catch {
    return null;
  }
};

export function PlanDiagnosticPanel({
  diagnosticScore,
  diagnosticScores,
  disabled = false,
  expanded,
  isSubmitting = false,
  language,
  onAnswerChange,
  onCancel,
  onOpen,
  onSubmit,
  selections,
  status,
}: PlanDiagnosticPanelProps) {
  const copy = planCopyFor(language);
  const answers = buildAnswersOrNull(selections);
  const selectedOptions = new Map(
    selections.map(({ optionId, questionId }) => [questionId, optionId]),
  );
  const answeredCount = planDiagnosticCatalog.filter((question) => (
    question.options.some(({ optionId }) => (
      optionId === selectedOptions.get(question.questionId)
    ))
  )).length;

  if (expanded) {
    return (
      <DiagnosticQuestionnaire
        answeredCount={answeredCount}
        answers={answers}
        disabled={disabled}
        isSubmitting={isSubmitting}
        language={language}
        onAnswerChange={onAnswerChange}
        onSubmit={onSubmit}
        selectedOptions={selectedOptions}
        {...(onCancel === undefined ? {} : { onCancel })}
      />
    );
  }

  if (status === "completed") {
    const metrics = Object.entries(diagnosticScores)
      .sort(([left], [right]) => left.localeCompare(right))
      .map(([skillKey, score]) => ({
        label: skillLabelFor(skillKey, language),
        value: formatDiagnosticScore(score),
      }));
    return (
      <ResultSummary
        actions={(
          <Button disabled={disabled} onClick={onOpen} variant="secondary">
            {copy.baselineRetake}
          </Button>
        )}
        ariaLabel={copy.baseline}
        description={copy.baselineCompletedDescription}
        metrics={metrics}
        scoreLabel={copy.diagnosticOverallScore}
        scoreValue={formatDiagnosticScore(diagnosticScore)}
        status="completed"
        title={copy.baselineCompletedTitle}
      />
    );
  }

  const isSkipped = status === "skipped";
  return (
    <EmptyState
      action={(
        <Button disabled={disabled} onClick={onOpen}>
          {copy.baselineStart}
        </Button>
      )}
      description={isSkipped
        ? copy.baselineSkippedDescription
        : copy.baselinePendingDescription}
      headingLevel={2}
      mascot={isSkipped ? "focused" : "teacher"}
      mascotAlt=""
      title={isSkipped ? copy.baselineSkippedTitle : copy.baselinePendingTitle}
    />
  );
}

type DiagnosticQuestionnaireProps = Readonly<{
  answeredCount: number;
  answers: DiagnosticAnswerRequest[] | null;
  disabled: boolean;
  isSubmitting: boolean;
  language: AppLanguage;
  onAnswerChange: (questionId: PlanDiagnosticQuestionId, optionId: string) => void;
  onSubmit: (answers: DiagnosticAnswerRequest[]) => void;
  selectedOptions: ReadonlyMap<string, string>;
  onCancel?: () => void;
}>;

function DiagnosticQuestionnaire({
  answeredCount,
  answers,
  disabled,
  isSubmitting,
  language,
  onAnswerChange,
  onCancel,
  onSubmit,
  selectedOptions,
}: DiagnosticQuestionnaireProps) {
  const copy = planCopyFor(language);
  const titleId = useId();
  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!disabled && !isSubmitting && answers !== null) onSubmit(answers);
  };
  return (
    <section aria-labelledby={titleId} className={styles.root}>
      <header className={styles.header}>
        <div>
          <p className={styles.eyebrow}>{copy.baseline}</p>
          <h2 className={styles.title} id={titleId}>{copy.baselinePendingTitle}</h2>
        </div>
        <span className={styles.progress} data-qg-metric>
          {copy.diagnosticProgress(answeredCount, planDiagnosticCatalog.length)}
        </span>
      </header>
      <form className={styles.form} onSubmit={handleSubmit}>
        {planDiagnosticCatalog.map((question, index) => (
          <fieldset
            className={styles.question}
            disabled={disabled || isSubmitting}
            key={question.questionId}
          >
            <legend className={styles.prompt}>
              <span className={styles.questionNumber} data-qg-metric>{index + 1}</span>
              {question.prompt[language === "zh-CN" ? "zh" : "en"]}
            </legend>
            <div className={styles.options}>
              {question.options.map((option) => (
                <label className={styles.option} key={option.optionId}>
                  <input
                    checked={selectedOptions.get(question.questionId) === option.optionId}
                    name={`diagnostic-${question.questionId}`}
                    onChange={() => onAnswerChange(question.questionId, option.optionId)}
                    type="radio"
                    value={option.optionId}
                  />
                  <span>{option.label[language === "zh-CN" ? "zh" : "en"]}</span>
                </label>
              ))}
            </div>
          </fieldset>
        ))}
        <div className={styles.actions}>
          {onCancel === undefined ? null : (
            <Button disabled={disabled || isSubmitting} onClick={onCancel} variant="ghost">
              {copy.baselineCancel}
            </Button>
          )}
          <Button
            disabled={disabled || answers === null}
            isLoading={isSubmitting}
            loadingLabel={copy.baselineSubmitting}
            type="submit"
          >
            {copy.baselineSubmit}
          </Button>
        </div>
      </form>
    </section>
  );
}
