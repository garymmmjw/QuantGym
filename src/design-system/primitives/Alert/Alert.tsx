import { useId, type HTMLAttributes, type ReactNode } from "react";

import styles from "./Alert.module.css";

export type AlertTone = "info" | "success" | "warning" | "danger";

export type AlertProps = Omit<HTMLAttributes<HTMLDivElement>, "role" | "title"> & {
  readonly action?: ReactNode;
  readonly dismissLabel?: string;
  readonly onDismiss?: () => void;
  readonly role?: "alert" | "status";
  readonly title?: ReactNode;
  readonly tone?: AlertTone;
};

const toneIcon: Readonly<Record<AlertTone, string>> = {
  info: "i",
  success: "✓",
  warning: "!",
  danger: "×",
};

export function Alert({
  action,
  children,
  className,
  dismissLabel = "Dismiss notification",
  onDismiss,
  role,
  title,
  tone = "info",
  ...alertProps
}: AlertProps) {
  const titleId = useId();
  const liveRole = role ?? (tone === "danger" ? "alert" : "status");
  const classes = [styles.root, styles[tone], className]
    .filter((value): value is string => Boolean(value))
    .join(" ");

  return (
    <div
      {...alertProps}
      aria-labelledby={title === undefined ? undefined : titleId}
      className={classes}
      role={liveRole}
    >
      <span aria-hidden="true" className={styles.icon}>
        {toneIcon[tone]}
      </span>
      <div className={styles.content}>
        {title === undefined ? null : (
          <div className={styles.title} id={titleId}>
            {title}
          </div>
        )}
        <div className={styles.message}>{children}</div>
        {action === undefined ? null : <div className={styles.action}>{action}</div>}
      </div>
      {onDismiss === undefined ? null : (
        <button
          aria-label={dismissLabel}
          className={styles.dismissButton}
          type="button"
          onClick={onDismiss}
        >
          <span aria-hidden="true">×</span>
        </button>
      )}
    </div>
  );
}
