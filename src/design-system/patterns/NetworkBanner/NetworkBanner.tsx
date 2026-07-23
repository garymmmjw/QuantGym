import type { ReactNode } from "react";

import { Alert } from "../../primitives/Alert";
import { Button } from "../../primitives/Button";
import styles from "./NetworkBanner.module.css";

export type NetworkBannerStatus = "offline" | "restored";

export type NetworkBannerProps = Readonly<{
  status: NetworkBannerStatus;
  actionLabel?: ReactNode;
  ariaLabel?: string;
  dismissLabel?: string;
  message?: ReactNode;
  onAction?: () => void;
  onDismiss?: () => void;
  title?: ReactNode;
}>;

const defaultCopy: Readonly<Record<NetworkBannerStatus, Readonly<{
  actionLabel: string;
  ariaLabel: string;
  dismissLabel: string;
  message: string;
  title: string;
}>>> = {
  offline: {
    actionLabel: "重试连接",
    ariaLabel: "网络连接状态",
    dismissLabel: "关闭离线提示",
    message: "当前更改会保留在本机，恢复网络后可以继续提交。",
    title: "当前处于离线状态",
  },
  restored: {
    actionLabel: "刷新内容",
    ariaLabel: "网络连接状态",
    dismissLabel: "关闭联网提示",
    message: "连接已恢复，可以继续刚才的操作。",
    title: "已恢复网络连接",
  },
};

export function NetworkBanner({
  actionLabel,
  ariaLabel,
  dismissLabel,
  message,
  onAction,
  onDismiss,
  status,
  title,
}: NetworkBannerProps) {
  const copy = defaultCopy[status];
  const action = onAction === undefined
    ? undefined
    : (
      <Button size="small" variant="secondary" onClick={onAction}>
        {actionLabel ?? copy.actionLabel}
      </Button>
    );

  return (
    <aside
      aria-label={ariaLabel ?? copy.ariaLabel}
      className={styles.root}
      data-network-status={status}
    >
      <Alert
        {...(onDismiss === undefined ? {} : { onDismiss })}
        action={action}
        dismissLabel={dismissLabel ?? copy.dismissLabel}
        role="status"
        title={title ?? copy.title}
        tone={status === "offline" ? "warning" : "success"}
      >
        {message ?? copy.message}
      </Alert>
    </aside>
  );
}
