import { useId, type ReactNode } from "react";

import { Button } from "../../../design-system/primitives/Button";
import styles from "./ProblemsWorkspace.module.css";

export type HintPanelProps = Readonly<{
  hint: ReactNode;
  onReveal: () => void;
  revealed: boolean;
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  error?: ReactNode;
  isLoading?: boolean;
  loadingLabel?: string;
  revealLabel?: string;
  title?: string;
}>;

export function HintPanel({
  className,
  description = "提示会记录到本次训练进度中。",
  disabled = false,
  error,
  hint,
  isLoading = false,
  loadingLabel = "正在获取提示",
  onReveal,
  revealLabel = "使用提示",
  revealed,
  title = "需要一点方向？",
}: HintPanelProps) {
  const hintId = useId();
  const classes = [styles.trainingBlock, styles.hintPanel, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section aria-labelledby={hintId} className={classes}>
      <div className={styles.hintCopy}>
        <h3 id={hintId}>{title}</h3>
        {revealed ? (
          <div className={styles.revealedContent}>{hint}</div>
        ) : (
          <p>{description}</p>
        )}
      </div>
      {revealed ? null : (
        <Button
          disabled={disabled}
          isLoading={isLoading}
          loadingLabel={loadingLabel}
          onClick={onReveal}
          variant="secondary"
        >
          {revealLabel}
        </Button>
      )}
      {error === undefined ? null : (
        <div className={styles.inlineError} role="alert">{error}</div>
      )}
    </section>
  );
}
