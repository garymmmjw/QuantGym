import { useId, type FormEvent, type ReactNode } from "react";

import { Button } from "../../primitives/Button";
import styles from "./FilterBar.module.css";

export type FilterBarProps = Readonly<{
  children: ReactNode;
  activeCount?: number;
  ariaLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  className?: string;
  clearLabel?: ReactNode;
  disabled?: boolean;
  onClear?: () => void;
  onSubmit?: () => void;
  resultSummary?: ReactNode;
  submitLabel?: ReactNode;
  title?: ReactNode;
}>;

export function FilterBar({
  activeCount = 0,
  ariaLabel = "Filter results",
  busy = false,
  busyLabel = "Applying filters",
  children,
  className,
  clearLabel = "Clear filters",
  disabled = false,
  onClear,
  onSubmit,
  resultSummary,
  submitLabel = "Apply filters",
  title = "Filters",
}: FilterBarProps) {
  const summaryId = useId();
  const classes = [styles.root, className].filter(Boolean).join(" ");

  const handleSubmit = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    onSubmit?.();
  };

  return (
    <form
      aria-busy={busy || undefined}
      aria-describedby={resultSummary === undefined ? undefined : summaryId}
      aria-label={ariaLabel}
      className={classes}
      onSubmit={handleSubmit}
      role="search"
    >
      <fieldset className={styles.fieldset} disabled={disabled || busy}>
        <legend className={styles.legend}>{title}</legend>
        <div className={styles.controls}>{children}</div>
        <div className={styles.footer}>
          <div aria-live="polite" className={styles.summary} id={summaryId}>
            {busy ? busyLabel : resultSummary}
          </div>
          <div className={styles.actions}>
            {onClear === undefined ? null : (
              <Button
                disabled={activeCount === 0 || disabled || busy}
                onClick={onClear}
                size="small"
                variant="ghost"
              >
                {clearLabel}
                {activeCount > 0 ? <>{" "}<span aria-label={`${activeCount} active`}>{activeCount}</span></> : null}
              </Button>
            )}
            {onSubmit === undefined ? null : (
              <Button disabled={disabled || busy} isLoading={busy} size="small" type="submit">
                {submitLabel}
              </Button>
            )}
          </div>
        </div>
      </fieldset>
    </form>
  );
}
