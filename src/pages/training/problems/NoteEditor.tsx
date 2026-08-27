import { useId, type FocusEvent, type ReactNode } from "react";

import { Button } from "../../../design-system/primitives/Button";
import {
  DraftStatus,
  type DraftStatusState,
} from "../../../design-system/patterns/DraftStatus";
import styles from "./ProblemsWorkspace.module.css";

export type NoteEditorStatus = "idle" | "dirty" | DraftStatusState;

export type NoteEditorStatusPresentation = Readonly<{
  message: ReactNode;
  title: ReactNode;
}>;

export type NoteEditorProps = Readonly<{
  onChange: (value: string) => void;
  onSave: () => void;
  status: NoteEditorStatus;
  value: string;
  autoSave?: boolean;
  className?: string;
  description?: ReactNode;
  disabled?: boolean;
  dirtyLabel?: ReactNode;
  error?: ReactNode;
  isSaving?: boolean;
  label?: string;
  lastSavedAt?: ReactNode;
  maxLength?: number;
  onRetry?: () => void;
  placeholder?: string;
  retryLabel?: ReactNode;
  saveLabel?: string;
  savingLabel?: string;
  statusCopy?: Partial<
    Readonly<Record<DraftStatusState, NoteEditorStatusPresentation>>
  >;
  title?: string;
}>;

export function NoteEditor({
  autoSave = true,
  className,
  description,
  disabled = false,
  dirtyLabel = "有未保存更改",
  error,
  isSaving = false,
  label = "题目笔记",
  lastSavedAt,
  maxLength = 20_000,
  onChange,
  onRetry,
  onSave,
  placeholder = "写下关键思路、易错点或待复习内容…",
  retryLabel = "重试保存",
  saveLabel = "保存笔记",
  savingLabel = "正在保存笔记",
  status,
  statusCopy,
  title = "我的笔记",
  value,
}: NoteEditorProps) {
  const noteId = useId();
  const errorId = useId();
  const classes = [styles.noteEditor, className].filter(Boolean).join(" ");
  const isDisabled = disabled || isSaving;

  const handleBlur = (event: FocusEvent<HTMLTextAreaElement>) => {
    if (
      autoSave
      && status === "dirty"
      && event.currentTarget.value.trim() !== ""
      && !isDisabled
    ) onSave();
  };

  return (
    <section aria-labelledby={noteId} className={classes}>
      <header className={styles.noteHeader}>
        <div>
          <h3 id={noteId}>{title}</h3>
          <p>{description ?? (
            autoSave
              ? "离开输入框时自动保存，也可以立即保存。"
              : "保存后会同步到当前账号。"
          )}</p>
        </div>
        {status === "dirty" ? (
          <span className={styles.dirtyStatus}>{dirtyLabel}</span>
        ) : null}
      </header>
      <label className={styles.visuallyHidden} htmlFor={`${noteId}-field`}>{label}</label>
      <textarea
        aria-describedby={error === undefined ? undefined : errorId}
        aria-invalid={error === undefined ? undefined : true}
        className={styles.noteField}
        disabled={isDisabled}
        id={`${noteId}-field`}
        maxLength={maxLength}
        onBlur={handleBlur}
        onChange={(event) => onChange(event.currentTarget.value)}
        placeholder={placeholder}
        value={value}
      />
      <div className={styles.noteActions}>
        <span data-qg-metric>{value.length} / {maxLength}</span>
        <Button
          disabled={isDisabled || status !== "dirty" || value.trim() === ""}
          isLoading={isSaving}
          loadingLabel={savingLabel}
          onClick={onSave}
          size="small"
          variant="secondary"
        >
          {saveLabel}
        </Button>
      </div>
      {status === "idle" || status === "dirty" ? null : (
        <DraftStatus
          actionLabel={retryLabel}
          busy={isSaving}
          message={error ?? statusCopy?.[status]?.message}
          state={status}
          timestamp={lastSavedAt}
          title={statusCopy?.[status]?.title}
          {...(
            (status === "error" || status === "conflict")
            && onRetry !== undefined
              ? { onAction: onRetry }
              : {}
          )}
        />
      )}
      {error === undefined || status === "error" ? null : (
        <div className={styles.inlineError} id={errorId} role="alert">{error}</div>
      )}
    </section>
  );
}
