import type { ReactNode } from "react";

import { Button } from "../../primitives/Button";
import styles from "./Pagination.module.css";

export type PaginationProps = Readonly<{
  ariaLabel?: string;
  canGoNext: boolean;
  canGoPrevious: boolean;
  className?: string;
  currentPage?: number;
  disabled?: boolean;
  loading?: boolean;
  loadingLabel?: string;
  nextLabel?: ReactNode;
  onNext?: () => void;
  onPrevious?: () => void;
  pageLabel?: ReactNode;
  previousLabel?: ReactNode;
  rangeLabel?: ReactNode;
  totalPages?: number;
}>;

const safePage = (page: number | undefined) => (
  page === undefined || !Number.isFinite(page) ? undefined : Math.max(1, Math.floor(page))
);

export function Pagination({
  ariaLabel = "Pagination",
  canGoNext,
  canGoPrevious,
  className,
  currentPage,
  disabled = false,
  loading = false,
  loadingLabel = "Loading next page",
  nextLabel = "Next",
  onNext,
  onPrevious,
  pageLabel,
  previousLabel = "Previous",
  rangeLabel,
  totalPages,
}: PaginationProps) {
  const page = safePage(currentPage);
  const total = safePage(totalPages);
  const normalizedTotal = total === undefined || page === undefined ? total : Math.max(page, total);
  const computedPageLabel = pageLabel ?? (
    page === undefined
      ? null
      : normalizedTotal === undefined
        ? `Page ${page}`
        : `Page ${page} of ${normalizedTotal}`
  );
  const classes = [styles.root, className].filter(Boolean).join(" ");

  return (
    <nav
      aria-busy={loading || undefined}
      aria-label={ariaLabel}
      className={classes}
      data-pagination="cursor"
    >
      <div className={styles.summary} aria-live="polite">
        {loading ? <span role="status">{loadingLabel}</span> : rangeLabel}
      </div>
      <div className={styles.controls}>
        <Button
          aria-label={typeof previousLabel === "string" ? previousLabel : "Previous page"}
          disabled={disabled || loading || !canGoPrevious || onPrevious === undefined}
          onClick={onPrevious}
          size="small"
          variant="secondary"
        >
          <span aria-hidden="true">←</span>
          {previousLabel}
        </Button>
        {computedPageLabel === null ? null : (
          <span aria-current="page" className={styles.page} data-qg-metric>
            {computedPageLabel}
          </span>
        )}
        <Button
          aria-label={typeof nextLabel === "string" ? nextLabel : "Next page"}
          disabled={disabled || loading || !canGoNext || onNext === undefined}
          onClick={onNext}
          size="small"
          variant="secondary"
        >
          {nextLabel}
          <span aria-hidden="true">→</span>
        </Button>
      </div>
    </nav>
  );
}
