import { useId, type FormEvent, type ReactNode } from "react";

import { Button } from "../../../design-system/primitives/Button";
import styles from "./ProblemsWorkspace.module.css";

export type AttemptKind = "text" | "code" | "multiple_choice";

export type AttemptComposerCopy = Readonly<{
  answerLabel: string;
  characterCount: (count: number, maximum: number) => string;
  kindLabel: string;
  kindLabels: Readonly<Record<AttemptKind, string>>;
  placeholder: string;
  submit: string;
  submitting: string;
  title: string;
}>;

const defaultCopy: AttemptComposerCopy = {
  answerLabel: "你的答案",
  characterCount: (count, maximum) => `${count} / ${maximum}`,
  kindLabel: "作答方式",
  kindLabels: {
    code: "代码",
    multiple_choice: "选项",
    text: "文字",
  },
  placeholder: "写下推导、答案或代码…",
  submit: "提交作答",
  submitting: "正在提交作答",
  title: "先独立作答",
};

export type AttemptComposerProps = Readonly<{
  answer: string;
  kind: AttemptKind;
  onAnswerChange: (answer: string) => void;
  onSubmit: () => void;
  availableKinds?: readonly AttemptKind[];
  className?: string;
  copy?: AttemptComposerCopy;
  disabled?: boolean;
  error?: ReactNode;
  feedback?: ReactNode;
  isSubmitting?: boolean;
  maxLength?: number;
  onKindChange?: (kind: AttemptKind) => void;
}>;

export function AttemptComposer({
  answer,
  availableKinds = ["text"],
  className,
  copy = defaultCopy,
  disabled = false,
  error,
  feedback,
  isSubmitting = false,
  kind,
  maxLength = 50_000,
  onAnswerChange,
  onKindChange,
  onSubmit,
}: AttemptComposerProps) {
  const answerId = useId();
  const errorId = useId();
  const countId = useId();
  const classes = [styles.trainingBlock, styles.attemptComposer, className]
    .filter(Boolean)
    .join(" ");
  const isDisabled = disabled || isSubmitting;

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (answer.trim() === "" || isDisabled) return;
    onSubmit();
  };

  return (
    <form className={classes} onSubmit={handleSubmit}>
      <header className={styles.trainingBlockHeader}>
        <h3>{copy.title}</h3>
        {availableKinds.length <= 1 || onKindChange === undefined ? null : (
          <label className={styles.kindControl}>
            <span>{copy.kindLabel}</span>
            <select
              disabled={isDisabled}
              onChange={(event) => onKindChange(event.currentTarget.value as AttemptKind)}
              value={kind}
            >
              {availableKinds.map((availableKind) => (
                <option key={availableKind} value={availableKind}>
                  {copy.kindLabels[availableKind]}
                </option>
              ))}
            </select>
          </label>
        )}
      </header>
      <label className={styles.visuallyHidden} htmlFor={answerId}>{copy.answerLabel}</label>
      <textarea
        aria-describedby={`${countId}${error === undefined ? "" : ` ${errorId}`}`}
        aria-invalid={error === undefined ? undefined : true}
        className={styles.answerField}
        disabled={isDisabled}
        id={answerId}
        maxLength={maxLength}
        onChange={(event) => onAnswerChange(event.currentTarget.value)}
        placeholder={copy.placeholder}
        spellCheck={kind !== "code"}
        value={answer}
      />
      <div className={styles.composerFooter}>
        <span className={styles.characterCount} data-qg-metric id={countId}>
          {copy.characterCount(answer.length, maxLength)}
        </span>
        <Button
          disabled={isDisabled || answer.trim() === ""}
          isLoading={isSubmitting}
          loadingLabel={copy.submitting}
          type="submit"
        >
          {copy.submit}
        </Button>
      </div>
      {error === undefined ? null : (
        <div className={styles.inlineError} id={errorId} role="alert">{error}</div>
      )}
      {feedback === undefined ? null : <div className={styles.attemptFeedback}>{feedback}</div>}
    </form>
  );
}
