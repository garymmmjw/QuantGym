import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type RefObject,
} from "react";

import { Button } from "../../../design-system/primitives/Button";
import { Drawer } from "../../../design-system/primitives/Drawer";
import { RecoveryPanel } from "../../../design-system/patterns/RecoveryPanel";
import { QuantyImage } from "../../../design-system/patterns/QuantyImage";
import { useToast } from "../../../design-system/patterns/ToastRegion";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../../shared/api/mutationRecovery";
import { ApiError } from "../../../shared/api/errors";
import { useOnlineStatus } from "../../../shared/lib/useOnlineStatus";
import {
  mutateTodo,
  newCompleteTodoIntent,
  newCreateTodoIntent,
  newDeleteTodoIntent,
  newUpdateTodoIntent,
  type TodoMutationIntent,
} from "./todo.mutations";
import { todoQueryKeys, useTodosQuery } from "./todo.queries";
import type { PlanTask } from "./todo.schema";
import {
  createTodoDraft,
  todoDraftRepository,
  type TodoDraft,
  type TodoDraftRepository,
} from "./todoDrafts";
import { TodoEditor } from "./TodoEditor";
import styles from "./TodoDock.module.css";

export type TodoDockProps = Readonly<{
  csrfProof: string | null;
  draftRepository?: TodoDraftRepository;
  language: "zh-CN" | "en";
  onOpenChange: (open: boolean) => void;
  onPermissionRecovery?: () => void;
  open: boolean;
  ownerScope: string;
  returnFocusRef?: RefObject<HTMLElement | null>;
  verifyOwner?: () => Promise<void>;
}>;

type FailedDraft = Readonly<{
  draft: TodoDraft;
  failure: MutationFailure;
}>;

const noOpOwnerVerification = async (): Promise<void> => undefined;

const durableStorageFailure = (isChinese: boolean): MutationFailure => ({
  code: "TODO_DRAFT_DURABLE_STORAGE_UNAVAILABLE",
  message: isChinese
    ? "浏览器无法安全保存本地草稿。输入不会被清除，请检查浏览器存储权限后重试。"
    : "The browser cannot safely persist local drafts. Your input is preserved; check storage permissions and retry.",
  preserveDraft: false,
  requestId: null,
  retryable: false,
  state: "non-recoverable-error",
});

const durableStorageReadFailure = (isChinese: boolean): MutationFailure => ({
  code: "TODO_DRAFT_DURABLE_STORAGE_READ_FAILED",
  message: isChinese
    ? "无法确认本地待同步草稿的完整状态。读取成功前不会开放编辑，以免覆盖尚未恢复的内容。"
    : "Local pending drafts could not be verified. Editing stays locked until they can be read safely.",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: "recoverable-error",
});

const upsertTask = (tasks: readonly PlanTask[], task: PlanTask) => (
  [...tasks.filter((candidate) => candidate.id !== task.id), task]
    .sort((left, right) => (
      ({ open: 0, completed: 1 }[left.status] - { open: 0, completed: 1 }[right.status])
      || left.sortOrder - right.sortOrder
      || left.createdAt.localeCompare(right.createdAt)
    ))
);

export function TodoDock({
  csrfProof,
  draftRepository = todoDraftRepository,
  language,
  onOpenChange,
  onPermissionRecovery,
  open,
  ownerScope,
  returnFocusRef,
  verifyOwner = noOpOwnerVerification,
}: TodoDockProps) {
  const isChinese = language === "zh-CN";
  const online = useOnlineStatus();
  const queryClient = useQueryClient();
  const toast = useToast();
  const todos = useTodosQuery(ownerScope, open);
  const mutation = useMutation({
    mutationFn: (intent: TodoMutationIntent) => mutateTodo(intent, csrfProof),
    networkMode: "always",
    retry: false,
  });
  const mutateTodoAsync = mutation.mutateAsync;
  const [drafts, setDrafts] = useState<readonly TodoDraft[]>([]);
  const [failedDraft, setFailedDraft] = useState<FailedDraft | null>(null);
  const [draftStorageFailure, setDraftStorageFailure] = useState<MutationFailure | null>(null);
  const [draftStorageReady, setDraftStorageReady] = useState(false);
  const [draftReadAttempt, setDraftReadAttempt] = useState(0);
  const [draftReadPending, setDraftReadPending] = useState(true);
  const inFlightDraftIdsRef = useRef(new Set<string>());
  const firstInputRef = useRef<HTMLDivElement>(null);

  const acknowledge = useCallback(async (draft: TodoDraft, result: PlanTask | null) => {
    await draftRepository.remove(ownerScope, draft.draftId);
    setDrafts((current) => current.filter((candidate) => candidate.draftId !== draft.draftId));
    const deletedTaskId = draft.intent.kind === "delete" ? draft.intent.taskId : null;
    queryClient.setQueryData<{ items: readonly PlanTask[] }>(
      todoQueryKeys.forOwner(ownerScope),
      (current) => {
        const tasks = current?.items ?? [];
        if (deletedTaskId !== null) {
          return { items: tasks.filter((task) => task.id !== deletedTaskId) };
        }
        return result === null ? { items: tasks } : { items: upsertTask(tasks, result) };
      },
    );
    setFailedDraft((current) => current?.draft.draftId === draft.draftId ? null : current);
  }, [draftRepository, ownerScope, queryClient]);

  const discardDraft = useCallback(async (draft: TodoDraft) => {
    try {
      await draftRepository.remove(ownerScope, draft.draftId);
      setDrafts((current) => current.filter((candidate) => candidate.draftId !== draft.draftId));
      setFailedDraft((current) => current?.draft.draftId === draft.draftId ? null : current);
    } catch {
      setFailedDraft({ draft, failure: durableStorageFailure(isChinese) });
    }
  }, [draftRepository, isChinese, ownerScope]);

  const syncDraft = useCallback(async (draft: TodoDraft) => {
    if (draft.ownerScope !== ownerScope) return false;
    if (inFlightDraftIdsRef.current.has(draft.draftId)) return null;
    inFlightDraftIdsRef.current.add(draft.draftId);
    if (!online) {
      setFailedDraft({
        draft,
        failure: classifyMutationFailure(new TypeError("Failed to fetch"), false),
      });
      inFlightDraftIdsRef.current.delete(draft.draftId);
      return false;
    }
    try {
      await verifyOwner();
      const result = await mutateTodoAsync(draft.intent);
      await acknowledge(draft, result);
      return true;
    } catch (error) {
      if (
        error instanceof ApiError
        && error.code === "TODO_REPLAY_UNAVAILABLE"
      ) {
        try {
          await acknowledge(draft, null);
          await queryClient.invalidateQueries({
            queryKey: todoQueryKeys.forOwner(ownerScope),
          });
          return true;
        } catch {
          setFailedDraft({ draft, failure: durableStorageFailure(isChinese) });
          return false;
        }
      }
      setFailedDraft({ draft, failure: classifyMutationFailure(error, online) });
      return false;
    } finally {
      inFlightDraftIdsRef.current.delete(draft.draftId);
    }
  }, [
    acknowledge,
    isChinese,
    mutateTodoAsync,
    online,
    ownerScope,
    queryClient,
    verifyOwner,
  ]);

  const retryDraftRead = useCallback(() => {
    setDraftStorageReady(false);
    setDraftReadPending(true);
    setDraftReadAttempt((current) => current + 1);
  }, []);

  useEffect(() => {
    if (!open) return;
    let active = true;
    void (async () => {
      try {
        const storedDrafts = await draftRepository.list(ownerScope);
        if (active) {
          setDraftStorageFailure(null);
          setDraftStorageReady(true);
          setDrafts((current) => {
            const merged = new Map(storedDrafts.map((draft) => [draft.draftId, draft]));
            for (const draft of current) merged.set(draft.draftId, draft);
            return [...merged.values()];
          });
        }
        if (!online) return;
        for (const draft of storedDrafts) {
          await syncDraft(draft);
        }
      } catch {
        if (active) {
          setDraftStorageFailure(durableStorageReadFailure(isChinese));
          setDraftStorageReady(false);
        }
      } finally {
        if (active) setDraftReadPending(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [
    draftReadAttempt,
    draftRepository,
    isChinese,
    online,
    open,
    ownerScope,
    syncDraft,
  ]);

  const submitIntent = useCallback(async (intent: TodoMutationIntent) => {
    const draft = createTodoDraft(intent, ownerScope);
    try {
      await draftRepository.put(draft);
    } catch {
      setFailedDraft({ draft, failure: durableStorageFailure(isChinese) });
      return false;
    }
    setDrafts((current) => [
      ...current.filter((candidate) => candidate.draftId !== draft.draftId),
      draft,
    ]);
    const synced = await syncDraft(draft);
    if (synced) {
      toast.addToast({
        dedupeKey: `todo-${intent.kind}-success`,
        title: isChinese ? "待办已同步" : "Task synced",
        tone: "success",
      });
    }
    return true;
  }, [draftRepository, isChinese, ownerScope, syncDraft, toast]);

  const rebaseFailedDraft = useCallback(async (draft: TodoDraft) => {
    const intent = draft.intent;
    if (intent.kind === "create") {
      await discardDraft(draft);
      await submitIntent(newCreateTodoIntent(intent.title, intent.sortOrder));
      return;
    }

    const refreshed = await todos.refetch();
    const latestTask = refreshed.data?.items.find((task) => task.id === intent.taskId);
    if (latestTask === undefined) {
      if (intent.kind === "delete") {
        await discardDraft(draft);
        return;
      }
      setFailedDraft({
        draft,
        failure: {
          code: "TODO_TASK_NO_LONGER_EXISTS",
          message: isChinese
            ? "这条待办已不存在。你可以丢弃本地草稿。"
            : "This task no longer exists. You can discard the local draft.",
          preserveDraft: false,
          requestId: null,
          retryable: false,
          state: "non-recoverable-error",
        },
      });
      return;
    }

    let rebasedIntent: TodoMutationIntent;
    if (intent.kind === "update") {
      rebasedIntent = newUpdateTodoIntent(latestTask, {
        ...(intent.sortOrder === undefined ? {} : { sortOrder: intent.sortOrder }),
        ...(intent.title === undefined ? {} : { title: intent.title }),
      });
    } else if (intent.kind === "complete") {
      if (latestTask.status === "completed") {
        await discardDraft(draft);
        return;
      }
      rebasedIntent = newCompleteTodoIntent(latestTask);
    } else {
      rebasedIntent = newDeleteTodoIntent(latestTask);
    }

    await discardDraft(draft);
    await submitIntent(rebasedIntent);
  }, [discardDraft, isChinese, submitIntent, todos]);

  const pendingCreates = useMemo(() => drafts.filter(
    (draft): draft is TodoDraft & { intent: Extract<TodoMutationIntent, { kind: "create" }> } => (
      draft.intent.kind === "create"
    ),
  ), [drafts]);
  const tasks = todos.data?.items ?? [];

  return (
    <Drawer
      className={styles.panel ?? ""}
      closeLabel={isChinese ? "关闭今日待办" : "Close today's tasks"}
      description={isChinese ? "服务端确认后才会清除本地待同步草稿" : "Local drafts clear only after server acknowledgement"}
      id="qg-todo-dock"
      initialFocusRef={firstInputRef}
      onOpenChange={onOpenChange}
      open={open}
      {...(returnFocusRef === undefined ? {} : { returnFocusRef })}
      side="right"
      title={isChinese ? "今日待办" : "Today's tasks"}
    >
      <div className={styles.root}>
        <div ref={firstInputRef} tabIndex={-1}>
          <TodoEditor
            disabled={mutation.isPending || !draftStorageReady}
            language={language}
            onSubmit={(title) => submitIntent(newCreateTodoIntent(title))}
          />
        </div>

        {!online && pendingCreates.length === 0 ? (
          <p className={styles.offlineNote} data-recovery-state="offline-draft" role="status">
            {isChinese ? "当前离线。新增内容会保留为待同步草稿。" : "Offline. New items will remain as drafts until synced."}
          </p>
        ) : null}

        {draftStorageFailure === null ? null : (
          <RecoveryPanel
            actionLabel={isChinese ? "重试读取" : "Retry reading"}
            busy={draftReadPending}
            busyLabel={isChinese ? "正在重试读取" : "Retrying read"}
            className={styles.recovery ?? ""}
            message={draftStorageFailure.message}
            onRetry={retryDraftRead}
            state={draftStorageFailure.state}
          />
        )}

        {failedDraft === null ? null : (
          <RecoveryPanel
            actionLabel={failedDraft.failure.state === "permission-denied"
              ? (isChinese ? "重新登录" : "Sign in again")
              : failedDraft.failure.state === "stale-version-conflict"
                ? (isChinese ? "载入最新后重试" : "Load latest and retry")
                : failedDraft.failure.state === "non-recoverable-error"
                  ? (isChinese ? "丢弃草稿" : "Discard draft")
                  : (isChinese ? "重试同步" : "Retry sync")}
            busy={mutation.isPending}
            className={styles.recovery ?? ""}
            message={failedDraft.failure.message}
            onReload={() => {
              void rebaseFailedDraft(failedDraft.draft);
            }}
            onRetry={() => {
              void syncDraft(failedDraft.draft);
            }}
            onReturn={() => {
              void discardDraft(failedDraft.draft);
            }}
            {...(onPermissionRecovery === undefined ? {} : { onSignIn: onPermissionRecovery })}
            requestId={failedDraft.failure.requestId}
            state={failedDraft.failure.state}
          />
        )}

        {todos.isPending ? (
          <p aria-live="polite" className={styles.state} role="status">
            {isChinese ? "正在载入待办…" : "Loading tasks…"}
          </p>
        ) : null}

        {todos.isError ? (
          <RecoveryPanel
            busy={todos.isFetching}
            className={styles.recovery ?? ""}
            onRetry={() => {
              void todos.refetch();
            }}
            state={online ? "recoverable-error" : "offline-draft"}
          />
        ) : null}

        {!todos.isPending && !todos.isError && tasks.length === 0 && pendingCreates.length === 0 ? (
          <div className={styles.empty}>
            <QuantyImage alt="" asset="happy" prominence="supporting" size="small" />
            <strong>{isChinese ? "今天从一件小事开始" : "Start with one small thing"}</strong>
            <p>{isChinese ? "添加第一条待办，完成后再继续下一项。" : "Add your first task and finish one thing at a time."}</p>
          </div>
        ) : null}

        {tasks.length > 0 || pendingCreates.length > 0 ? (
          <ul aria-label={isChinese ? "待办列表" : "Task list"} className={styles.list}>
            {pendingCreates.map((draft) => (
              <li className={styles.pendingRow} key={draft.draftId}>
                <span aria-hidden="true" className={styles.pendingDot} />
                <span>{draft.intent.title}</span>
                <small>{isChinese ? "待同步" : "Pending"}</small>
              </li>
            ))}
            {tasks.map((task) => {
              const pending = drafts.some((draft) => (
                "taskId" in draft.intent && draft.intent.taskId === task.id
              ));
              return (
                <li className={styles.taskRow} data-completed={task.status === "completed" || undefined} key={task.id}>
                  <div className={styles.taskHeading}>
                    <button
                      aria-label={isChinese ? `完成：${task.title}` : `Complete: ${task.title}`}
                      className={styles.checkbox}
                      disabled={
                        !draftStorageReady
                        || pending
                        || task.status === "completed"
                        || mutation.isPending
                      }
                      onClick={() => {
                        void submitIntent(newCompleteTodoIntent(task));
                      }}
                      type="button"
                    >
                      <span aria-hidden="true">{task.status === "completed" ? "✓" : ""}</span>
                    </button>
                    <span>{task.title}</span>
                    {pending ? <small>{isChinese ? "待同步" : "Pending"}</small> : null}
                  </div>
                  <TodoEditor
                    disabled={!draftStorageReady || pending || mutation.isPending}
                    initialTitle={task.title}
                    key={`${task.id}:${task.version}`}
                    language={language}
                    mode="edit"
                    onSubmit={(title) => {
                      if (title !== task.title) {
                        return submitIntent(newUpdateTodoIntent(task, { title }));
                      }
                    }}
                  />
                  <Button
                    disabled={!draftStorageReady || pending || mutation.isPending}
                    onClick={() => {
                      void submitIntent(newDeleteTodoIntent(task));
                    }}
                    size="small"
                    variant="ghost"
                  >
                    {isChinese ? "删除" : "Delete"}
                  </Button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
    </Drawer>
  );
}
