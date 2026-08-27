import { useId, type ReactNode } from "react";

import { Button, type ButtonVariant } from "../../primitives/Button";
import { QuantyImage } from "../QuantyImage";
import styles from "./RecoveryPanel.module.css";

export type RecoveryState =
  | "recoverable-error"
  | "non-recoverable-error"
  | "offline-draft"
  | "permission-denied"
  | "stale-version-conflict"
  | "retry";

type RecoveryAction = "reload" | "retry" | "return" | "sign-in";

type RecoveryCopy = Readonly<{
  action: RecoveryAction;
  actionLabel: string;
  message: string;
  title: string;
  tone: "danger" | "info" | "warning";
  variant: ButtonVariant;
}>;

const recoveryCopy: Readonly<Record<RecoveryState, RecoveryCopy>> = {
  "recoverable-error": {
    action: "retry",
    actionLabel: "重试",
    message: "服务暂时没有响应，你可以安全地再次尝试。",
    title: "暂时无法完成操作",
    tone: "warning",
    variant: "primary",
  },
  "non-recoverable-error": {
    action: "return",
    actionLabel: "返回安全页面",
    message: "当前页面无法继续，请返回后重新选择操作。",
    title: "当前操作无法继续",
    tone: "danger",
    variant: "secondary",
  },
  "offline-draft": {
    action: "retry",
    actionLabel: "联网后重试",
    message: "当前草稿仍保留在本机，恢复网络后可以继续提交。",
    title: "当前处于离线状态",
    tone: "info",
    variant: "primary",
  },
  "permission-denied": {
    action: "sign-in",
    actionLabel: "重新登录",
    message: "当前登录状态无法完成此操作，请验证身份后继续。",
    title: "需要重新验证身份",
    tone: "danger",
    variant: "primary",
  },
  "stale-version-conflict": {
    action: "reload",
    actionLabel: "载入最新版本",
    message: "内容已在其他位置更新，请先载入最新版本再继续。",
    title: "内容版本已变化",
    tone: "warning",
    variant: "primary",
  },
  retry: {
    action: "retry",
    actionLabel: "再次重试",
    message: "上一次尝试尚未完成，你可以立即重新发起。",
    title: "可以重新尝试",
    tone: "info",
    variant: "primary",
  },
};

export type RecoveryPanelProps = Readonly<{
  state: RecoveryState;
  actionLabel?: ReactNode;
  ariaLabel?: string;
  busy?: boolean;
  busyLabel?: string;
  className?: string;
  mascotAlt?: string;
  message?: ReactNode;
  onReload?: () => void;
  onRetry?: () => void;
  onReturn?: () => void;
  onSignIn?: () => void;
  referenceLabel?: ReactNode;
  requestId?: string | null;
  title?: ReactNode;
}>;

const actionFor = (
  action: RecoveryAction,
  callbacks: Readonly<{
    onReload: (() => void) | undefined;
    onRetry: (() => void) | undefined;
    onReturn: (() => void) | undefined;
    onSignIn: (() => void) | undefined;
  }>,
) => {
  switch (action) {
    case "reload":
      return callbacks.onReload;
    case "retry":
      return callbacks.onRetry;
    case "return":
      return callbacks.onReturn;
    case "sign-in":
      return callbacks.onSignIn;
  }
};

export function RecoveryPanel({
  actionLabel,
  ariaLabel,
  busy = false,
  busyLabel = "正在恢复",
  className,
  mascotAlt = "",
  message,
  onReload,
  onRetry,
  onReturn,
  onSignIn,
  referenceLabel = "参考编号",
  requestId,
  state,
  title,
}: RecoveryPanelProps) {
  const titleId = useId();
  const messageId = useId();
  const copy = recoveryCopy[state];
  const action = actionFor(copy.action, { onReload, onRetry, onReturn, onSignIn });
  const normalizedRequestId = requestId?.trim() || null;
  const classes = [styles.root, styles[copy.tone], className].filter(Boolean).join(" ");

  return (
    <section
      aria-describedby={messageId}
      aria-label={ariaLabel}
      aria-labelledby={ariaLabel === undefined ? titleId : undefined}
      className={classes}
      data-recovery-state={state}
      role={copy.tone === "info" ? "status" : "alert"}
    >
      <QuantyImage
        asset="oops"
        alt={mascotAlt}
        className={styles.mascot}
        prominence="supporting"
        size="small"
      />
      <div className={styles.content}>
        <h2 className={styles.title} id={titleId}>{title ?? copy.title}</h2>
        <p className={styles.message} id={messageId}>{message ?? copy.message}</p>
        {normalizedRequestId === null ? null : (
          <p className={styles.reference}>
            <span>{referenceLabel}：</span>
            <code>{normalizedRequestId}</code>
          </p>
        )}
        {action === undefined ? null : (
          <div className={styles.actions}>
            <Button
              isLoading={busy}
              loadingLabel={busyLabel}
              onClick={action}
              variant={copy.variant}
            >
              {actionLabel ?? copy.actionLabel}
            </Button>
          </div>
        )}
      </div>
    </section>
  );
}
