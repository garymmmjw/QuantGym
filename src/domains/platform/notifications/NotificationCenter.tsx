import {
  useMemo,
  type ReactNode,
  type RefObject,
} from "react";

import { EmptyState } from "../../../design-system/patterns/EmptyState";
import { RecoveryPanel } from "../../../design-system/patterns/RecoveryPanel";
import { useToast } from "../../../design-system/patterns/ToastRegion";
import { Alert } from "../../../design-system/primitives/Alert";
import { Button } from "../../../design-system/primitives/Button";
import { Drawer } from "../../../design-system/primitives/Drawer";
import { Skeleton } from "../../../design-system/primitives/Skeleton";
import { ApiError } from "../../../shared/api/errors";
import {
  useMarkNotificationReadMutation,
  type MarkNotificationReadInput,
} from "./notifications.mutations";
import {
  selectUnreadNotificationCount,
  useNotificationsQuery,
} from "./notifications.queries";
import { notificationRecoveryFor } from "./notifications.recovery";
import type { Notification } from "./notifications.schema";
import styles from "./NotificationCenter.module.css";

export type NotificationCenterLanguage = "zh-CN" | "en";

export type NotificationCenterProps = Readonly<{
  csrfProof: string | null;
  language: NotificationCenterLanguage;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  ownerScope: string;
  onSignIn?: (() => void) | undefined;
  returnFocusRef?: RefObject<HTMLElement | null> | undefined;
  verifyOwner?: (() => Promise<void>) | undefined;
}>;

type NotificationCopy = Readonly<{
  close: string;
  description: (unreadCount: number) => string;
  dismissError: string;
  emptyBody: string;
  emptyTitle: string;
  loadLatest: string;
  loading: string;
  markRead: string;
  markingRead: string;
  permissionAction: string;
  queryErrorAria: string;
  reference: string;
  retry: string;
  retrying: string;
  successBody: string;
  successTitle: string;
  title: string;
}>;

const copyByLanguage: Readonly<Record<NotificationCenterLanguage, NotificationCopy>> = {
  "zh-CN": {
    close: "关闭通知中心",
    description: (unreadCount) => unreadCount > 0
      ? `${unreadCount} 条未读通知`
      : "没有未读通知",
    dismissError: "关闭错误提示",
    emptyBody: "新的训练提醒、进度更新和系统消息会出现在这里。",
    emptyTitle: "暂时没有通知",
    loadLatest: "载入最新状态",
    loading: "正在载入通知",
    markRead: "标为已读",
    markingRead: "正在标记",
    permissionAction: "重新登录",
    queryErrorAria: "通知中心恢复",
    reference: "请求 ID",
    retry: "重试",
    retrying: "正在重试",
    successBody: "未读数量已同步更新。",
    successTitle: "通知已标为已读",
    title: "通知中心",
  },
  en: {
    close: "Close notification center",
    description: (unreadCount) => unreadCount > 0
      ? `${unreadCount} unread notification${unreadCount === 1 ? "" : "s"}`
      : "No unread notifications",
    dismissError: "Dismiss error",
    emptyBody: "New training reminders, progress updates, and system messages will appear here.",
    emptyTitle: "You’re all caught up",
    loadLatest: "Load latest state",
    loading: "Loading notifications",
    markRead: "Mark as read",
    markingRead: "Marking as read",
    permissionAction: "Sign in again",
    queryErrorAria: "Notification center recovery",
    reference: "Request ID",
    retry: "Retry",
    retrying: "Retrying",
    successBody: "Your unread count is now up to date.",
    successTitle: "Notification marked as read",
    title: "Notifications",
  },
};

const formatNotificationTime = (
  value: string,
  language: NotificationCenterLanguage,
) => new Intl.DateTimeFormat(language === "zh-CN" ? "zh-CN" : "en", {
  dateStyle: "medium",
  timeStyle: "short",
}).format(new Date(value));

const LoadingState = ({ label }: Readonly<{ label: string }>) => (
  <div aria-label={label} className={styles.loading} role="status">
    <span className={styles.visuallyHidden}>{label}</span>
    {Array.from({ length: 3 }, (_, index) => (
      <div className={styles.loadingRow} key={index}>
        <Skeleton height={40} variant="circle" width={40} />
        <div className={styles.loadingCopy}>
          <Skeleton height={14} width={index === 1 ? "72%" : "84%"} />
          <Skeleton height={12} width="100%" />
          <Skeleton height={12} width="42%" />
        </div>
      </div>
    ))}
  </div>
);

type RecoveryActionProps = Readonly<{
  input: MarkNotificationReadInput;
  onDismiss: () => void;
  onLoadLatest: () => void;
  onRetry: (input: MarkNotificationReadInput) => void;
  onSignIn: (() => void) | undefined;
  copy: NotificationCopy;
  state: ReturnType<typeof notificationRecoveryFor>["state"];
}>;

const RecoveryAction = ({
  copy,
  input,
  onDismiss,
  onLoadLatest,
  onRetry,
  onSignIn,
  state,
}: RecoveryActionProps): ReactNode => {
  if (state === "permission-denied" && onSignIn !== undefined) {
    return <Button onClick={onSignIn} size="small">{copy.permissionAction}</Button>;
  }
  if (state === "stale-version-conflict") {
    return <Button onClick={onLoadLatest} size="small">{copy.loadLatest}</Button>;
  }
  if (state === "non-recoverable-error") {
    return <Button onClick={onDismiss} size="small" variant="secondary">{copy.dismissError}</Button>;
  }
  return <Button onClick={() => onRetry(input)} size="small">{copy.retry}</Button>;
};

const recoveryTitle = (
  state: ReturnType<typeof notificationRecoveryFor>["state"],
  language: NotificationCenterLanguage,
) => {
  const isChinese = language === "zh-CN";
  switch (state) {
    case "offline-draft":
      return isChinese ? "当前处于离线状态" : "You’re offline";
    case "permission-denied":
      return isChinese ? "需要重新验证身份" : "Please sign in again";
    case "stale-version-conflict":
      return isChinese ? "通知状态已变化" : "Notification state changed";
    case "recoverable-error":
      return isChinese ? "暂时无法标记通知" : "Couldn’t mark the notification";
    case "non-recoverable-error":
      return isChinese ? "无法完成此操作" : "This action couldn’t be completed";
  }
};

const recoveryMessage = (
  state: ReturnType<typeof notificationRecoveryFor>["state"],
  language: NotificationCenterLanguage,
) => {
  const isChinese = language === "zh-CN";
  switch (state) {
    case "offline-draft":
      return isChinese ? "通知仍保持未读，联网后可以重试。" : "The notification is still unread. Retry when you’re online.";
    case "permission-denied":
      return isChinese ? "当前会话没有权限更新这条通知。" : "Your current session can’t update this notification.";
    case "stale-version-conflict":
      return isChinese ? "请先载入服务器上的最新通知状态。" : "Load the latest notification state before trying again.";
    case "recoverable-error":
      return isChinese ? "通知仍保持未读，你可以安全地重试。" : "The notification is still unread, so it is safe to retry.";
    case "non-recoverable-error":
      return isChinese ? "通知没有被修改，请稍后再试。" : "The notification was not changed. Try again later.";
  }
};

type NotificationRowProps = Readonly<{
  copy: NotificationCopy;
  language: NotificationCenterLanguage;
  markingId: string | null;
  notification: Notification;
  recovery: ReturnType<typeof notificationRecoveryFor> | null;
  onDismissError: () => void;
  onLoadLatest: () => void;
  onMarkRead: (input: MarkNotificationReadInput) => void;
  onSignIn: (() => void) | undefined;
}>;

const NotificationRow = ({
  copy,
  language,
  markingId,
  notification,
  onDismissError,
  onLoadLatest,
  onMarkRead,
  onSignIn,
  recovery,
}: NotificationRowProps) => {
  const unread = notification.readAt === null;
  const isMarking = markingId === notification.id;
  const input = { id: notification.id };

  return (
    <li className={styles.item} data-notification-read={unread ? undefined : "true"}>
      <article className={styles.card}>
        <span aria-hidden="true" className={styles.kindMark}>
          {notification.kind.slice(0, 1).toUpperCase()}
        </span>
        <div className={styles.itemContent}>
          <div className={styles.itemHeading}>
            <h3>{notification.title}</h3>
            {unread ? <span className={styles.unreadDot} aria-hidden="true" /> : null}
          </div>
          <p>{notification.body}</p>
          <time dateTime={notification.createdAt}>
            {formatNotificationTime(notification.createdAt, language)}
          </time>
          {unread ? (
            <Button
              aria-label={`${copy.markRead}: ${notification.title}`}
              disabled={markingId !== null && !isMarking}
              isLoading={isMarking}
              loadingLabel={copy.markingRead}
              onClick={() => onMarkRead(input)}
              size="small"
              variant="ghost"
            >
              {copy.markRead}
            </Button>
          ) : null}
          {recovery === null ? null : (
            <Alert
              action={(
                <RecoveryAction
                  copy={copy}
                  input={input}
                  onDismiss={onDismissError}
                  onLoadLatest={onLoadLatest}
                  onRetry={onMarkRead}
                  onSignIn={onSignIn}
                  state={recovery.state}
                />
              )}
              className={styles.recovery}
              data-recovery-state={recovery.state}
              role="alert"
              title={recoveryTitle(recovery.state, language)}
              tone={recovery.state === "permission-denied" || recovery.state === "non-recoverable-error"
                ? "danger"
                : "warning"}
            >
              {recoveryMessage(recovery.state, language)}
              {recovery.requestId === null ? null : (
                <span className={styles.requestId}>
                  {copy.reference}: <code>{recovery.requestId}</code>
                </span>
              )}
            </Alert>
          )}
        </div>
      </article>
    </li>
  );
};

export function NotificationCenter({
  csrfProof,
  language,
  onOpenChange,
  onSignIn,
  open,
  ownerScope,
  returnFocusRef,
  verifyOwner,
}: NotificationCenterProps) {
  const copy = copyByLanguage[language];
  const notifications = useNotificationsQuery({ enabled: open, ownerScope });
  const markRead = useMarkNotificationReadMutation({
    csrfProof,
    ownerScope,
    ...(verifyOwner === undefined ? {} : { verifyOwner }),
  });
  const toast = useToast();
  const unreadCount = selectUnreadNotificationCount(notifications.data);
  const errorNotificationId = markRead.isError ? markRead.variables.id : null;
  const markingId = markRead.isPending ? markRead.variables.id : null;
  const mutationRecovery = useMemo(
    () => markRead.isError ? notificationRecoveryFor(markRead.error) : null,
    [markRead.error, markRead.isError],
  );

  const submitMarkRead = (input: MarkNotificationReadInput) => {
    markRead.mutate(input, {
      onSuccess: () => {
        toast.addToast({
          dedupeKey: `notification-read-${input.id}`,
          message: copy.successBody,
          title: copy.successTitle,
          tone: "success",
        });
      },
    });
  };

  const loadLatest = () => {
    markRead.reset();
    void notifications.refetch();
  };

  const queryRecovery = notifications.isError
    ? notificationRecoveryFor(notifications.error)
    : null;
  const queryErrorMessage = notifications.error instanceof ApiError
    ? notifications.error.message
    : undefined;

  return (
    <Drawer
      className={styles.panel ?? ""}
      closeLabel={copy.close}
      description={copy.description(unreadCount)}
      id="qg-notification-center"
      onOpenChange={onOpenChange}
      open={open}
      {...(returnFocusRef === undefined ? {} : { returnFocusRef })}
      side="right"
      title={copy.title}
    >
      {notifications.isPending ? <LoadingState label={copy.loading} /> : null}
      {queryRecovery === null ? null : (
        <RecoveryPanel
          actionLabel={queryRecovery.state === "permission-denied"
            ? copy.permissionAction
            : copy.retry}
          ariaLabel={copy.queryErrorAria}
          busy={notifications.isFetching}
          busyLabel={copy.retrying}
          message={queryErrorMessage}
          onReload={() => void notifications.refetch()}
          onRetry={() => void notifications.refetch()}
          onReturn={() => onOpenChange(false)}
          {...(onSignIn === undefined ? {} : { onSignIn })}
          referenceLabel={copy.reference}
          requestId={queryRecovery.requestId}
          state={queryRecovery.state}
        />
      )}
      {notifications.isSuccess && notifications.data.items.length === 0 ? (
        <EmptyState
          description={copy.emptyBody}
          mascot="sleep"
          mascotSize="small"
          title={copy.emptyTitle}
        />
      ) : null}
      {notifications.isSuccess && notifications.data.items.length > 0 ? (
        <ol className={styles.list}>
          {notifications.data.items.map((notification) => (
            <NotificationRow
              copy={copy}
              key={notification.id}
              language={language}
              markingId={markingId}
              notification={notification}
              onDismissError={() => markRead.reset()}
              onLoadLatest={loadLatest}
              onMarkRead={submitMarkRead}
              onSignIn={onSignIn}
              recovery={errorNotificationId === notification.id ? mutationRecovery : null}
            />
          ))}
        </ol>
      ) : null}
    </Drawer>
  );
}
