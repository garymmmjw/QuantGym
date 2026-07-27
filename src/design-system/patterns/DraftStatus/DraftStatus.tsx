import { useId, type ReactNode } from "react";

import { Button } from "../../primitives/Button";
import styles from "./DraftStatus.module.css";

export type DraftStatusState =
  | "saving"
  | "saved"
  | "queued"
  | "offline"
  | "conflict"
  | "error"
  | "submitted";

type DraftStatusCopy = Readonly<{
  icon: string;
  message: string;
  title: string;
  tone: "info" | "success" | "warning" | "danger";
}>;

const statusCopy: Readonly<Record<DraftStatusState, DraftStatusCopy>> = {
  saving: {
    icon: "•",
    message: "Keep this page open while the latest change is stored.",
    title: "Saving draft",
    tone: "info",
  },
  saved: {
    icon: "✓",
    message: "Your latest change is safely stored on this device.",
    title: "Draft saved",
    tone: "success",
  },
  queued: {
    icon: "↗",
    message: "This draft will be submitted when the current request finishes.",
    title: "Submission queued",
    tone: "info",
  },
  offline: {
    icon: "—",
    message: "The draft remains on this device and can sync after reconnection.",
    title: "Saved offline",
    tone: "warning",
  },
  conflict: {
    icon: "!",
    message: "A newer version exists. Review it before replacing either copy.",
    title: "Draft version changed",
    tone: "warning",
  },
  error: {
    icon: "×",
    message: "We could not store the latest change. Copy your work before leaving.",
    title: "Draft not saved",
    tone: "danger",
  },
  submitted: {
    icon: "✓",
    message: "The server acknowledged this submission and removed its local draft.",
    title: "Submission complete",
    tone: "success",
  },
};

export type DraftStatusProps = Readonly<{
  state: DraftStatusState;
  actionLabel?: ReactNode;
  ariaLabel?: string;
  busy?: boolean;
  className?: string;
  disabled?: boolean;
  message?: ReactNode;
  onAction?: () => void;
  timestamp?: ReactNode;
  title?: ReactNode;
}>;

export function DraftStatus({
  actionLabel = "Try again",
  ariaLabel,
  busy = false,
  className,
  disabled = false,
  message,
  onAction,
  state,
  timestamp,
  title,
}: DraftStatusProps) {
  const titleId = useId();
  const copy = statusCopy[state];
  const classes = [styles.root, styles[copy.tone], styles[state], className]
    .filter(Boolean)
    .join(" ");
  const isUrgent = state === "conflict" || state === "error";

  return (
    <aside
      aria-atomic="true"
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined ? titleId : undefined}
      aria-live={isUrgent ? "assertive" : "polite"}
      className={classes}
      data-draft-status={state}
      role={isUrgent ? "alert" : "status"}
    >
      <span aria-hidden="true" className={styles.icon}>{copy.icon}</span>
      <div className={styles.content}>
        <div className={styles.heading}>
          <strong id={titleId}>{title ?? copy.title}</strong>
          {timestamp === undefined ? null : <span data-qg-metric>{timestamp}</span>}
        </div>
        <p>{message ?? copy.message}</p>
      </div>
      {onAction === undefined ? null : (
        <Button
          disabled={disabled}
          isLoading={busy}
          loadingLabel="Retrying"
          onClick={onAction}
          size="small"
          variant="secondary"
        >
          {actionLabel}
        </Button>
      )}
    </aside>
  );
}
