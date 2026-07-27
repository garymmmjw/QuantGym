import { useId, type ReactNode } from "react";

import styles from "./WorkflowBoard.module.css";

export type WorkflowBoardItem = Readonly<{
  id: string;
  content: ReactNode;
  ariaLabel?: string;
  disabled?: boolean;
}>;

export type WorkflowBoardColumn = Readonly<{
  id: string;
  title: ReactNode;
  items: readonly WorkflowBoardItem[];
  action?: ReactNode;
  description?: ReactNode;
  emptyState?: ReactNode;
}>;

export type WorkflowBoardProps = Readonly<{
  columns: readonly WorkflowBoardColumn[];
  ariaLabel?: string;
  className?: string;
  columnsLabel?: string;
  description?: ReactNode;
  disabled?: boolean;
  disabledMessage?: ReactNode;
  itemCountLabel?: (count: number) => string;
  title?: ReactNode;
}>;

export function WorkflowBoard({
  ariaLabel,
  className,
  columns,
  columnsLabel,
  description,
  disabled = false,
  disabledMessage = "This board is currently read only.",
  itemCountLabel = (count) => `${count} items`,
  title,
}: WorkflowBoardProps) {
  const titleId = useId();
  const classes = [styles.root, disabled ? styles.disabled : undefined, className]
    .filter(Boolean)
    .join(" ");

  return (
    <section
      aria-disabled={disabled || undefined}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined && title !== undefined ? titleId : undefined}
      className={classes}
      data-workflow-board="true"
    >
      {title === undefined && description === undefined ? null : (
        <header className={styles.header}>
          {title === undefined ? null : <h2 className={styles.title} id={titleId}>{title}</h2>}
          {description === undefined ? null : <p className={styles.description}>{description}</p>}
        </header>
      )}
      {disabled ? <p className={styles.disabledMessage} role="status">{disabledMessage}</p> : null}
      <div
        aria-label={columnsLabel ?? (
          ariaLabel === undefined ? "Workflow columns" : `${ariaLabel} columns`
        )}
        className={styles.scroller}
        inert={disabled || undefined}
        role="group"
        tabIndex={!disabled && columns.length > 1 ? 0 : undefined}
      >
        <div className={styles.columns}>
          {columns.map((column) => (
            <WorkflowColumn
              column={column}
              itemCountLabel={itemCountLabel}
              key={column.id}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function WorkflowColumn({
  column,
  itemCountLabel,
}: Readonly<{
  column: WorkflowBoardColumn;
  itemCountLabel: (count: number) => string;
}>) {
  const columnTitleId = useId();
  const hasItems = column.items.length > 0;

  return (
    <section aria-labelledby={columnTitleId} className={styles.column}>
      <header className={styles.columnHeader}>
        <div>
          <h3 className={styles.columnTitle} id={columnTitleId}>{column.title}</h3>
          {column.description === undefined ? null : (
            <p className={styles.columnDescription}>{column.description}</p>
          )}
        </div>
        <span
          aria-label={itemCountLabel(column.items.length)}
          className={styles.count}
          data-qg-metric
        >
          {column.items.length}
        </span>
      </header>
      {hasItems ? (
        <ol className={styles.items}>
          {column.items.map((item) => (
            <li
              aria-disabled={item.disabled || undefined}
              aria-label={item.ariaLabel}
              className={[styles.item, item.disabled ? styles.itemDisabled : undefined]
                .filter(Boolean)
                .join(" ")}
              data-workflow-item={item.id}
              inert={item.disabled || undefined}
              key={item.id}
            >
              {item.content}
            </li>
          ))}
        </ol>
      ) : (
        <div className={styles.empty}>{column.emptyState ?? "No items in this stage."}</div>
      )}
      {column.action === undefined ? null : <div className={styles.columnAction}>{column.action}</div>}
    </section>
  );
}
