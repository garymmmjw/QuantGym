import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { useNavigate } from "react-router-dom";

import { Button } from "../../design-system/primitives/Button";
import { DashboardTemplate } from "../../design-system/patterns/DashboardTemplate";
import { DraftStatus } from "../../design-system/patterns/DraftStatus";
import { EmptyState } from "../../design-system/patterns/EmptyState";
import { Metric } from "../../design-system/patterns/Metric";
import { QuantyImage } from "../../design-system/patterns/QuantyImage";
import {
  RecoveryPanel,
  type RecoveryState,
} from "../../design-system/patterns/RecoveryPanel";
import { WorkflowBoard } from "../../design-system/patterns/WorkflowBoard";
import { useCurrentUserQuery } from "../../domains/account/auth/auth.queries";
import {
  newCompletePlanTaskIntent,
  newCreatePlanIntent,
  newRunPlanDiagnosticIntent,
  newUpdatePlanTaskIntent,
  type CompletePlanTaskIntent,
  type PlanTaskChanges,
} from "../../domains/plan/plan.mutations";
import { useCurrentPlanQuery } from "../../domains/plan/plan.queries";
import type {
  CreatePlanRequest,
  DiagnosticAnswerRequest,
  OfficialPlan,
  OfficialPlanTask,
} from "../../domains/plan/plan.schema";
import { buildProblemTrainingRoute } from "../../domains/problems/problems.routes";
import {
  TRAINING_RECONNECT_REPLAYED_EVENT,
  subscribeTrainingDraftChanges,
} from "../../domains/training/training.events";
import {
  newStartTrainingIntent,
  useStartTrainingMutation,
  type StartTrainingIntent,
} from "../../domains/training/training.mutations";
import type { StartTrainingResponse } from "../../domains/training/training.schema";
import {
  consumeTrainingRecoveryReceipt,
  listTrainingRecoveryReceipts,
  persistTrainingMutationDraft,
  persistTrainingRecoveryReceipt,
  recoverTrainingMutationIntent,
  trainingRecoveryReceiptPlanTaskId,
  trainingRecoveryReceiptMatchesSourceAttempt,
  type TrainingRecoveryReceipt,
} from "../../domains/training/training.recovery";
import { readCsrfToken } from "../../shared/api/csrf";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../shared/api/mutationRecovery";
import { verifyCurrentSessionOwner } from "../../shared/api/ownerScopedQueries";
import { useI18n, type AppLanguage } from "../../shared/i18n";
import { createAccountScope } from "../../shared/lib/accountScope";
import { useOnlineStatus } from "../../shared/lib/useOnlineStatus";
import {
  isRecoverableDraftAttemptActive,
  recoverableDraftRepository,
  type RecoverableDraft,
} from "../../shared/storage/drafts";
import {
  type DiagnosticAnswerSelection,
  type PlanDiagnosticQuestionId,
} from "../training/planDiagnosticCatalog";
import { PlanDiagnosticPanel } from "./PlanDiagnosticPanel";
import { PlanSetupForm } from "./PlanSetupForm";
import { PlanTaskCard, type PlanTaskPendingAction } from "./PlanTaskCard";
import { TaskEditor } from "./TaskEditor";
import {
  createPlanDisplayModel,
  localizedPlanTaskContent,
  localizedRecommendationRationale,
  planCopyFor,
  planTaskActionsFor,
} from "./plan.model";
import { usePlanMutationWorkflow } from "./usePlanMutationWorkflow";
import styles from "./PlanPage.module.css";

type NavigateTo = (href: string) => void;

export type PlanPageSession = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

export type PlanPageProps = Readonly<{
  onNavigate?: NavigateTo;
  session?: PlanPageSession;
}>;

type TrainingStartWorkflow = Readonly<{
  draft: RecoverableDraft | null;
  failure: MutationFailure | null;
  intent: StartTrainingIntent;
  phase: "persisting" | "submitting" | "retrying" | "reconciling" | "failed";
}>;

type PlanPageCopy = Readonly<{
  allCompleteDescription: string;
  allCompleteTitle: string;
  boardDescription: string;
  boardDisabled: string;
  boardLabel: string;
  columnsLabel: string;
  completedColumn: string;
  completedEmpty: string;
  createDescription: string;
  createEyebrow: string;
  createTitle: string;
  diagnosticMetric: string;
  diagnosticPending: string;
  discardDraft: string;
  draftChecking: string;
  draftCheckingTitle: string;
  draftReconciling: string;
  draftReconcilingTitle: string;
  draftSaving: string;
  draftSavingTitle: string;
  draftSubmitting: string;
  draftSubmittingTitle: string;
  itemCount: (count: number) => string;
  loadErrorAction: string;
  loadErrorDescription: string;
  loadErrorTitle: string;
  loadingDescription: string;
  loadingLabel: string;
  loadingTitle: string;
  openColumn: string;
  openEmpty: string;
  openMetric: string;
  pageDescription: string;
  pageEyebrow: string;
  pageTitle: string;
  planStatus: string;
  primaryComplete: string;
  primaryNavigate: string;
  primaryStartBaseline: string;
  primaryStartTraining: string;
  progressDetail: string;
  progressMetric: string;
  recommendationsDescription: string;
  recommendationsEmpty: string;
  recommendationsTitle: string;
  requestId: string;
  retryTraining: string;
  signIn: string;
  statusActive: string;
  statusArchived: string;
  statusCompleted: string;
  trainingDiscard: string;
  trainingFailureTitle: string;
  weeklyMetric: string;
}>;

const copyByLanguage: Readonly<Record<AppLanguage, PlanPageCopy>> = {
  en: {
    allCompleteDescription: "There are no open tasks on the confirmed plan. Completed work remains visible below.",
    allCompleteTitle: "This plan has no remaining tasks",
    boardDescription: "Open and completed tasks come directly from the current server plan.",
    boardDisabled: "The task board is locked while the current change is confirmed.",
    boardLabel: "Plan tasks",
    columnsLabel: "Open and completed plan task columns",
    completedColumn: "Completed",
    completedEmpty: "Completed tasks will remain here as a confirmed record.",
    createDescription: "Choose a real target and weekly commitment. The service will generate the task sequence.",
    createEyebrow: "A focused path, not a fabricated timeline",
    createTitle: "Create your first training plan",
    diagnosticMetric: "Baseline",
    diagnosticPending: "Pending",
    discardDraft: "Discard local change",
    draftChecking: "Checking this device for an unfinished plan change before enabling actions.",
    draftCheckingTitle: "Checking saved changes",
    draftReconciling: "Another tab may be finishing this exact request. The board stays locked until its result is known.",
    draftReconcilingTitle: "Confirming the latest change",
    draftSaving: "The exact request and idempotency key are being stored on this device first.",
    draftSavingTitle: "Saving the change locally",
    draftSubmitting: "The saved request is being sent to the plan service.",
    draftSubmittingTitle: "Confirming with the server",
    itemCount: (count) => `${count} ${count === 1 ? "task" : "tasks"}`,
    loadErrorAction: "Try loading again",
    loadErrorDescription: "The current plan could not be verified, so no cached or sample tasks are shown.",
    loadErrorTitle: "The plan is temporarily unavailable",
    loadingDescription: "Verifying the current account and its official plan.",
    loadingLabel: "Loading training plan",
    loadingTitle: "Loading your plan",
    openColumn: "Next up",
    openEmpty: "No open tasks are currently confirmed.",
    openMetric: "Open tasks",
    pageDescription: "One current plan, one clear next action, and only server-confirmed progress.",
    pageEyebrow: "Training plan",
    pageTitle: "Your quantitative career plan",
    planStatus: "Plan status",
    primaryComplete: "Complete next task",
    primaryNavigate: "Open next step",
    primaryStartBaseline: "Complete baseline",
    primaryStartTraining: "Start next training",
    progressDetail: "Confirmed task completion",
    progressMetric: "Progress",
    recommendationsDescription: "Active recommendations retained by the current plan.",
    recommendationsEmpty: "No active recommendations are currently confirmed.",
    recommendationsTitle: "Active recommendations",
    requestId: "Request reference",
    retryTraining: "Retry training start",
    signIn: "Sign in again",
    statusActive: "Active",
    statusArchived: "Archived",
    statusCompleted: "Completed",
    trainingDiscard: "Discard training request",
    trainingFailureTitle: "Training could not be started",
    weeklyMetric: "Weekly time",
  },
  "zh-CN": {
    allCompleteDescription: "服务端确认的计划中已没有待完成任务，历史成果仍保留在下方。",
    allCompleteTitle: "当前计划任务已全部完成",
    boardDescription: "待完成与已完成任务均直接来自当前服务端计划。",
    boardDisabled: "正在确认当前更改，任务看板已暂时锁定。",
    boardLabel: "计划任务",
    columnsLabel: "待完成与已完成计划任务分栏",
    completedColumn: "已完成",
    completedEmpty: "完成后的任务会作为已确认记录保留在这里。",
    createDescription: "选择真实目标与每周投入时间，任务顺序将由服务端生成。",
    createEyebrow: "聚焦真实目标，不虚构成长时间线",
    createTitle: "创建你的第一份训练计划",
    diagnosticMetric: "能力基线",
    diagnosticPending: "待完成",
    discardDraft: "放弃本地更改",
    draftChecking: "正在检查本机是否有未完成的计划更改，确认前不会开放操作。",
    draftCheckingTitle: "正在检查已保存更改",
    draftReconciling: "其他标签页可能正在完成同一请求，确认结果前任务看板保持锁定。",
    draftReconcilingTitle: "正在确认最新更改",
    draftSaving: "正在先把精确请求与幂等标识安全保存在本机。",
    draftSavingTitle: "正在保存本地更改",
    draftSubmitting: "已保存的请求正在提交给计划服务。",
    draftSubmittingTitle: "正在等待服务端确认",
    itemCount: (count) => `${count} 项任务`,
    loadErrorAction: "重新载入",
    loadErrorDescription: "当前计划暂时无法验证，因此不会展示缓存或示例任务。",
    loadErrorTitle: "暂时无法载入计划",
    loadingDescription: "正在确认当前账号及其正式训练计划。",
    loadingLabel: "正在载入训练计划",
    loadingTitle: "正在载入你的计划",
    openColumn: "下一步",
    openEmpty: "当前没有服务端确认的待完成任务。",
    openMetric: "待完成任务",
    pageDescription: "一份当前计划、一个清晰下一步，只展示服务端确认的进度。",
    pageEyebrow: "训练计划",
    pageTitle: "你的量化职业训练计划",
    planStatus: "计划状态",
    primaryComplete: "完成下一项任务",
    primaryNavigate: "打开下一步",
    primaryStartBaseline: "完成 Baseline",
    primaryStartTraining: "开始下一项训练",
    progressDetail: "已确认任务完成度",
    progressMetric: "计划进度",
    recommendationsDescription: "当前计划保留的有效建议。",
    recommendationsEmpty: "当前没有服务端确认的有效建议。",
    recommendationsTitle: "当前建议",
    requestId: "请求编号",
    retryTraining: "重试启动训练",
    signIn: "重新登录",
    statusActive: "进行中",
    statusArchived: "已归档",
    statusCompleted: "已完成",
    trainingDiscard: "放弃训练请求",
    trainingFailureTitle: "暂时无法启动训练",
    weeklyMetric: "每周投入",
  },
};

const defaultPlanRequest: CreatePlanRequest = {
  role: "quantResearch",
  season: "2027-summer",
  track: "internship",
  weeklyHours: 8,
};

const safeCsrfProof = (): string | null => {
  try {
    return readCsrfToken();
  } catch {
    return null;
  }
};

const exactDraft = (
  source: RecoverableDraft,
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => drafts.find((draft) => (
  draft.draftId === source.draftId
  && draft.generationId === source.generationId
)) ?? null;

const recoverPlanTrainingIntent = (
  draft: RecoverableDraft,
): StartTrainingIntent | null => {
  if (draft.kind !== "training.start") return null;
  try {
    const intent = recoverTrainingMutationIntent(draft);
    return intent.kind === "start" && intent.request.planTaskId !== undefined
      ? intent
      : null;
  } catch {
    return null;
  }
};

const latestPlanTrainingDraft = (
  drafts: readonly RecoverableDraft[],
): Readonly<{ draft: RecoverableDraft; intent: StartTrainingIntent }> | null => {
  const candidates = drafts.flatMap((draft) => {
    const intent = recoverPlanTrainingIntent(draft);
    return intent === null ? [] : [{ draft, intent }];
  }).sort((left, right) => (
    left.draft.updatedAt.localeCompare(right.draft.updatedAt)
    || left.draft.draftId.localeCompare(right.draft.draftId)
  ));
  return candidates.at(-1) ?? null;
};

const receiptForDraft = (
  draft: RecoverableDraft,
  receipts: readonly TrainingRecoveryReceipt[],
): TrainingRecoveryReceipt | null => receipts.find(({ payload }) => (
  payload.intentKind === "start"
  && payload.sourceDraftId === draft.draftId
  && payload.sourceGenerationId === draft.generationId
)) ?? null;

const pendingTrainingFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "PLAN_TRAINING_RECOVERY_PENDING",
  message: language === "en"
    ? online
      ? "A saved training request is still waiting for server confirmation."
      : "The training request remains on this device and can continue when online."
    : online
      ? "本机仍有一项未得到服务器确认的训练启动请求。"
      : "训练启动请求已保留在本机，联网后可以继续。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const trainingReconciliationFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "PLAN_TRAINING_RECONCILIATION_FAILED",
  message: language === "en"
    ? "The saved training request could not be reconciled yet. Please retry."
    : "暂时无法确认训练启动请求是否已同步，请重试。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const trainingStorageFailure = (language: AppLanguage): MutationFailure => ({
  code: "DRAFT_STORAGE_UNAVAILABLE",
  message: language === "en"
    ? "The training request could not be safely saved on this device. Please retry."
    : "无法先把训练启动请求安全保存在本机，请稍后重试。",
  preserveDraft: false,
  requestId: null,
  retryable: true,
  state: "recoverable-error",
});

const localizedFailureMessage = (
  failure: MutationFailure,
  language: AppLanguage,
): string => {
  if (language !== "en") return failure.message;
  if (!/[\u3400-\u9fff]/u.test(failure.message)) return failure.message;
  const messages: Readonly<Record<MutationFailure["state"], string>> = {
    "non-recoverable-error": "This change cannot continue. Discard it and review the latest plan.",
    "offline-draft": "The network connection was interrupted. Your change remains safely saved on this device.",
    "permission-denied": "Your session must be verified again before this change can continue.",
    "recoverable-error": "The request could not be confirmed yet. Your saved change is safe to retry.",
    "stale-version-conflict": "This plan changed elsewhere. Load the latest version before continuing.",
  };
  return messages[failure.state];
};

const planStatusLabel = (
  status: OfficialPlan["status"],
  copy: PlanPageCopy,
): string => {
  if (status === "completed") return copy.statusCompleted;
  if (status === "archived") return copy.statusArchived;
  return copy.statusActive;
};

const recommendationKindLabel = (
  kind: OfficialPlan["recommendations"][number]["kind"],
  language: AppLanguage,
): string => {
  const labels = {
    en: { problem: "Problem", skill: "Skill", task: "Task" },
    "zh-CN": { problem: "题目", skill: "能力", task: "任务" },
  } as const;
  return labels[language][kind];
};

const recommendationProvenanceLabel = (
  provenance: OfficialPlan["recommendations"][number]["provenanceType"],
  language: AppLanguage,
): string => {
  const labels = {
    en: {
      diagnostic: "Source: baseline assessment",
      system: "Source: plan system",
      training: "Source: confirmed training",
    },
    "zh-CN": {
      diagnostic: "来源：Baseline 诊断",
      system: "来源：计划系统",
      training: "来源：已确认训练",
    },
  } as const;
  return labels[language][provenance];
};

const workflowDraftStatus = (
  phase: Exclude<TrainingStartWorkflow["phase"], "failed">,
  copy: PlanPageCopy,
): Readonly<{
  message: string;
  state: "saving" | "saved" | "queued";
  title: string;
}> => {
  if (phase === "persisting") {
    return {
      message: copy.draftSaving,
      state: "saving",
      title: copy.draftSavingTitle,
    };
  }
  if (phase === "reconciling") {
    return {
      message: copy.draftReconciling,
      state: "saved",
      title: copy.draftReconcilingTitle,
    };
  }
  return {
    message: copy.draftSubmitting,
    state: "queued",
    title: copy.draftSubmittingTitle,
  };
};

const recoveryActionLabel = (
  state: RecoveryState,
  language: AppLanguage,
): string => {
  const english: Readonly<Record<RecoveryState, string>> = {
    "non-recoverable-error": "Discard change",
    "offline-draft": "Retry when online",
    "permission-denied": "Sign in again",
    "recoverable-error": "Retry",
    "stale-version-conflict": "Load latest version",
    retry: "Retry",
  };
  const chinese: Readonly<Record<RecoveryState, string>> = {
    "non-recoverable-error": "放弃更改",
    "offline-draft": "联网后重试",
    "permission-denied": "重新登录",
    "recoverable-error": "重试",
    "stale-version-conflict": "载入最新版本",
    retry: "重试",
  };
  return (language === "en" ? english : chinese)[state];
};

const taskEditorDomId = (taskId: string): string => `plan-task-editor-${taskId}`;
const taskEditTriggerDomId = (taskId: string): string => `plan-task-edit-${taskId}`;

function PlanSessionPage({
  onNavigate,
  session,
}: Readonly<{
  onNavigate: NavigateTo | undefined;
  session: PlanPageSession;
}>) {
  const routerNavigate = useNavigate();
  const navigate = useCallback<NavigateTo>((href) => {
    if (onNavigate === undefined) routerNavigate(href);
    else onNavigate(href);
  }, [onNavigate, routerNavigate]);
  const { language } = useI18n();
  const copy = copyByLanguage[language];
  const planCopy = planCopyFor(language);
  const online = useOnlineStatus();
  const onlineRef = useRef(online);
  const { csrfProof, ownerScope, verifyOwner } = session;
  const currentPlan = useCurrentPlanQuery({ ownerScope });
  const plan = currentPlan.data?.plan ?? null;
  const mountedRef = useRef(true);
  const trainingOperationRef = useRef<AbortController | null>(null);
  const getTrainingOperationSignal = useCallback(
    () => trainingOperationRef.current?.signal,
    [],
  );
  const startMutation = useStartTrainingMutation({
    csrfProof,
    getOperationSignal: getTrainingOperationSignal,
    ownerScope,
    ...(verifyOwner === undefined ? {} : { verifyOwner }),
  });
  const [setup, setSetup] = useState<CreatePlanRequest>(defaultPlanRequest);
  const [editingTaskIdentity, setEditingTaskIdentity] = useState<Readonly<{
    id: string;
    version: number;
  }> | null>(null);
  const [diagnosticExpandedAtVersion, setDiagnosticExpandedAtVersion] = (
    useState<number | null>(null)
  );
  const [diagnosticSelections, setDiagnosticSelections] = (
    useState<readonly DiagnosticAnswerSelection[]>([])
  );
  const [diagnosticSubmissionVersion, setDiagnosticSubmissionVersion] = (
    useState<number | null>(null)
  );
  const [trainingWorkflow, setTrainingWorkflow] = (
    useState<TrainingStartWorkflow | null>(null)
  );
  const [trainingInspectionFailure, setTrainingInspectionFailure] = (
    useState<MutationFailure | null>(null)
  );
  const [trainingRecoveryReady, setTrainingRecoveryReady] = useState(false);
  const trainingWorkflowRef = useRef<TrainingStartWorkflow | null>(null);
  const trainingRecoveryReadyRef = useRef(false);
  const trainingInspectionFailureRef = useRef<MutationFailure | null>(null);
  const trainingInspectionRef = useRef(false);
  const trainingInspectionPendingRef = useRef(false);
  const trainingInspectionRunnerRef = useRef<() => void>(() => undefined);
  const trainingRevisionRef = useRef(0);

  const restoreTaskEditFocus = useCallback((taskId: string) => {
    if (typeof window === "undefined") return;
    window.requestAnimationFrame(() => {
      document.getElementById(taskEditTriggerDomId(taskId))?.focus();
    });
  }, []);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    trainingWorkflowRef.current = trainingWorkflow;
  }, [trainingWorkflow]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      trainingRevisionRef.current += 1;
      trainingOperationRef.current?.abort(
        new DOMException("Plan page unmounted", "AbortError"),
      );
    };
  }, []);

  const commitTrainingWorkflow = useCallback((next: TrainingStartWorkflow | null) => {
    trainingWorkflowRef.current = next;
    if (mountedRef.current) setTrainingWorkflow(next);
  }, []);

  const commitTrainingRecoveryReady = useCallback((ready: boolean) => {
    trainingRecoveryReadyRef.current = ready;
    if (mountedRef.current) setTrainingRecoveryReady(ready);
  }, []);

  const commitTrainingInspectionFailure = useCallback((
    failure: MutationFailure | null,
  ) => {
    trainingInspectionFailureRef.current = failure;
    if (mountedRef.current) setTrainingInspectionFailure(failure);
  }, []);

  const trainingOperationIsCurrent = useCallback((revision: number) => (
    mountedRef.current && trainingRevisionRef.current === revision
  ), []);

  const verifyRecoveryOwner = useCallback(async (signal?: AbortSignal) => {
    if (verifyOwner === undefined) {
      await verifyCurrentSessionOwner(ownerScope, signal);
      return;
    }
    await verifyOwner(signal);
  }, [ownerScope, verifyOwner]);

  const consumeStartReceipt = useCallback(async (
    source: RecoverableDraft,
    receipt: TrainingRecoveryReceipt,
    revision: number,
  ): Promise<boolean> => {
    if (receipt.payload.intentKind !== "start") return false;
    const intent = recoverPlanTrainingIntent(source);
    if (intent === null) return false;
    try {
      await verifyRecoveryOwner();
      if (!trainingOperationIsCurrent(revision)) return false;
      if (
        isRecoverableDraftAttemptActive(source)
        && !trainingRecoveryReceiptMatchesSourceAttempt(receipt, source)
      ) return false;
      let acknowledged = await recoverableDraftRepository.acknowledge(source);
      if (!trainingOperationIsCurrent(revision)) return false;
      if (!acknowledged) {
        const drafts = await recoverableDraftRepository.list(ownerScope);
        if (!trainingOperationIsCurrent(revision)) return false;
        acknowledged = exactDraft(source, drafts) === null;
      }
      if (!acknowledged) return false;
      let consumed = false;
      for (let pass = 0; pass < 2 && !consumed; pass += 1) {
        consumed = await consumeTrainingRecoveryReceipt(ownerScope, receipt);
        if (!trainingOperationIsCurrent(revision)) return false;
        if (!consumed) {
          const receipts = await listTrainingRecoveryReceipts(ownerScope);
          if (!trainingOperationIsCurrent(revision)) return false;
          consumed = !receipts.some(
            ({ draft }) => draft.draftId === receipt.draft.draftId
              && draft.generationId === receipt.draft.generationId,
          );
        }
      }
      if (!consumed) {
        if (trainingOperationIsCurrent(revision)) {
          commitTrainingWorkflow({
            draft: source,
            failure: trainingReconciliationFailure(onlineRef.current, language),
            intent,
            phase: "failed",
          });
        }
        return false;
      }
      commitTrainingWorkflow(null);
      if (!trainingOperationIsCurrent(revision)) return false;
      navigate(buildProblemTrainingRoute({
        problemId: receipt.payload.response.problemId,
        sessionId: receipt.payload.response.sessionId,
      }));
      return true;
    } catch (error) {
      if (!trainingOperationIsCurrent(revision)) return false;
      const classified = classifyMutationFailure(error, onlineRef.current);
      commitTrainingWorkflow({
        draft: source,
        failure: classified.state === "permission-denied"
          ? classified
          : trainingReconciliationFailure(onlineRef.current, language),
        intent,
        phase: "failed",
      });
      return false;
    }
  }, [
    commitTrainingWorkflow,
    language,
    navigate,
    ownerScope,
    trainingOperationIsCurrent,
    verifyRecoveryOwner,
  ]);

  const consumeDetachedStartReceipts = useCallback(async (
    receipts: readonly TrainingRecoveryReceipt[],
    revision: number,
  ): Promise<boolean> => {
    const ordered = [...receipts].sort((left, right) => (
      left.draft.updatedAt.localeCompare(right.draft.updatedAt)
      || left.draft.draftId.localeCompare(right.draft.draftId)
    ));
    let handoff: Readonly<{ problemId: string; sessionId: string }> | null = null;
    await verifyRecoveryOwner();
    if (!trainingOperationIsCurrent(revision)) return false;
    for (const receipt of ordered) {
      if (
        receipt.payload.intentKind !== "start"
        || trainingRecoveryReceiptPlanTaskId(receipt) === null
      ) continue;
      let consumed = false;
      for (let pass = 0; pass < 2 && !consumed; pass += 1) {
        consumed = await consumeTrainingRecoveryReceipt(ownerScope, receipt);
        if (!trainingOperationIsCurrent(revision)) return false;
        if (!consumed) {
          const persistedReceipts = await listTrainingRecoveryReceipts(ownerScope);
          if (!trainingOperationIsCurrent(revision)) return false;
          consumed = !persistedReceipts.some(
            ({ draft }) => draft.draftId === receipt.draft.draftId
              && draft.generationId === receipt.draft.generationId,
          );
        }
      }
      if (!consumed) throw new Error("TRAINING_RECEIPT_RECONCILIATION_FAILED");
      handoff = {
        problemId: receipt.payload.response.problemId,
        sessionId: receipt.payload.response.sessionId,
      };
    }
    if (handoff === null) return false;
    commitTrainingWorkflow(null);
    if (!trainingOperationIsCurrent(revision)) return true;
    navigate(buildProblemTrainingRoute(handoff));
    return true;
  }, [
    commitTrainingWorkflow,
    navigate,
    ownerScope,
    trainingOperationIsCurrent,
    verifyRecoveryOwner,
  ]);

  const inspectTrainingRecovery = useCallback(async () => {
    if (!mountedRef.current) return;
    if (trainingInspectionRef.current) {
      trainingInspectionPendingRef.current = true;
      commitTrainingRecoveryReady(false);
      return;
    }
    const revision = trainingRevisionRef.current;
    trainingInspectionRef.current = true;
    commitTrainingRecoveryReady(false);
    try {
      const drafts = await recoverableDraftRepository.list(ownerScope);
      if (!trainingOperationIsCurrent(revision)) return;
      const receipts = await listTrainingRecoveryReceipts(ownerScope);
      if (!trainingOperationIsCurrent(revision)) return;
      commitTrainingInspectionFailure(null);
      const current = trainingWorkflowRef.current;
      if (
        current?.phase === "persisting"
        || current?.phase === "submitting"
        || current?.phase === "retrying"
      ) return;
      const detachedReceipts = receipts.filter((receipt) => (
        !drafts.some((draft) => (
          draft.draftId === receipt.payload.sourceDraftId
          && draft.generationId === receipt.payload.sourceGenerationId
        ))
        && trainingRecoveryReceiptPlanTaskId(receipt) !== null
      ));
      if (
        detachedReceipts.length > 0
        && await consumeDetachedStartReceipts(detachedReceipts, revision)
      ) return;
      if (!trainingOperationIsCurrent(revision)) return;

      let recovered: Readonly<{
        draft: RecoverableDraft;
        intent: StartTrainingIntent;
      }> | null = null;
      if (current !== null && current.draft !== null) {
        const source = exactDraft(current.draft, drafts);
        const sourceIntent = source === null ? null : recoverPlanTrainingIntent(source);
        if (source !== null && sourceIntent !== null) {
          recovered = { draft: source, intent: sourceIntent };
        } else {
          const receipt = receiptForDraft(current.draft, receipts);
          if (
            receipt !== null
            && await consumeStartReceipt(current.draft, receipt, revision)
          ) return;
          if (!trainingOperationIsCurrent(revision)) return;
          if (trainingWorkflowRef.current?.phase === "failed" && receipt !== null) return;
          commitTrainingWorkflow(null);
          recovered = latestPlanTrainingDraft(drafts);
        }
      } else {
        recovered = latestPlanTrainingDraft(drafts);
      }

      if (recovered === null) {
        return;
      }

      const receipt = receiptForDraft(recovered.draft, receipts);
      if (receipt !== null) {
        if (await consumeStartReceipt(recovered.draft, receipt, revision)) return;
        if (!trainingOperationIsCurrent(revision)) return;
        if (trainingWorkflowRef.current?.phase === "failed") return;
      }

      if (isRecoverableDraftAttemptActive(recovered.draft)) {
        commitTrainingWorkflow({
          draft: recovered.draft,
          failure: null,
          intent: recovered.intent,
          phase: "reconciling",
        });
      } else if (
        current === null
        || current.phase === "reconciling"
      ) {
        commitTrainingWorkflow({
          draft: recovered.draft,
          failure: pendingTrainingFailure(onlineRef.current, language),
          intent: recovered.intent,
          phase: "failed",
        });
      }
    } catch (error) {
      if (!trainingOperationIsCurrent(revision)) return;
      const current = trainingWorkflowRef.current;
      if (current !== null) {
        commitTrainingWorkflow({
          ...current,
          failure: classifyMutationFailure(error, onlineRef.current),
          phase: "failed",
        });
      } else {
        commitTrainingInspectionFailure(
          trainingReconciliationFailure(onlineRef.current, language),
        );
      }
    } finally {
      trainingInspectionRef.current = false;
      if (
        mountedRef.current
        && (
          trainingInspectionPendingRef.current
          || revision !== trainingRevisionRef.current
        )
      ) {
        trainingInspectionPendingRef.current = false;
        globalThis.setTimeout(() => trainingInspectionRunnerRef.current(), 0);
      } else if (trainingOperationIsCurrent(revision)) {
        commitTrainingRecoveryReady(true);
      }
    }
  }, [
    commitTrainingInspectionFailure,
    commitTrainingRecoveryReady,
    commitTrainingWorkflow,
    consumeDetachedStartReceipts,
    consumeStartReceipt,
    language,
    ownerScope,
    trainingOperationIsCurrent,
  ]);

  useEffect(() => {
    trainingInspectionRunnerRef.current = () => void inspectTrainingRecovery();
    return () => {
      trainingInspectionRunnerRef.current = () => undefined;
    };
  }, [inspectTrainingRecovery]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => void inspectTrainingRecovery(), 0);
    return () => globalThis.clearTimeout(timeout);
  }, [inspectTrainingRecovery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const inspect = () => void inspectTrainingRecovery();
    window.addEventListener(TRAINING_RECONNECT_REPLAYED_EVENT, inspect);
    return () => window.removeEventListener(TRAINING_RECONNECT_REPLAYED_EVENT, inspect);
  }, [inspectTrainingRecovery]);

  useEffect(() => subscribeTrainingDraftChanges(ownerScope, () => {
    const current = trainingWorkflowRef.current;
    if (
      current?.phase === "persisting"
      || current?.phase === "submitting"
      || current?.phase === "retrying"
    ) return;
    trainingRevisionRef.current += 1;
    commitTrainingRecoveryReady(false);
    void inspectTrainingRecovery();
  }), [commitTrainingRecoveryReady, inspectTrainingRecovery, ownerScope]);

  useEffect(() => {
    if (
      typeof window === "undefined"
      || trainingWorkflow === null
      || trainingWorkflow.draft === null
      || (
        trainingWorkflow.phase !== "reconciling"
        && trainingWorkflow.phase !== "failed"
      )
    ) {
      return undefined;
    }
    const poll = window.setInterval(() => void inspectTrainingRecovery(), 750);
    return () => window.clearInterval(poll);
  }, [inspectTrainingRecovery, trainingWorkflow]);

  const scheduleTrainingReinspection = useCallback(() => {
    if (!mountedRef.current) return;
    trainingRevisionRef.current += 1;
    commitTrainingWorkflow(null);
    commitTrainingRecoveryReady(false);
    globalThis.setTimeout(() => void inspectTrainingRecovery(), 0);
  }, [commitTrainingRecoveryReady, commitTrainingWorkflow, inspectTrainingRecovery]);

  const finishTrainingStart = useCallback(async (
    intent: StartTrainingIntent,
    attempted: RecoverableDraft,
    response: StartTrainingResponse,
    signal: AbortSignal,
    revision: number,
  ) => {
    if (signal.aborted || !trainingOperationIsCurrent(revision)) return false;
    try {
      const receipt = await persistTrainingRecoveryReceipt(
        ownerScope,
        attempted,
        intent,
        response,
      );
      if (signal.aborted || !trainingOperationIsCurrent(revision)) return false;
      if (receipt === null) {
        scheduleTrainingReinspection();
        return false;
      }
      return consumeStartReceipt(attempted, receipt, revision);
    } catch {
      if (!trainingOperationIsCurrent(revision)) return false;
      commitTrainingWorkflow({
        draft: attempted,
        failure: trainingReconciliationFailure(onlineRef.current, language),
        intent,
        phase: "failed",
      });
      return false;
    }
  }, [
    commitTrainingWorkflow,
    consumeStartReceipt,
    language,
    ownerScope,
    scheduleTrainingReinspection,
    trainingOperationIsCurrent,
  ]);

  const submitPersistedTraining = useCallback(async (
    intent: StartTrainingIntent,
    source: RecoverableDraft,
    retrying: boolean,
    revision: number,
  ) => {
    let attempted: RecoverableDraft | null;
    try {
      attempted = await recoverableDraftRepository.markAttempt(source);
    } catch {
      if (trainingOperationIsCurrent(revision)) {
        commitTrainingWorkflow({
          draft: source,
          failure: trainingReconciliationFailure(onlineRef.current, language),
          intent,
          phase: "failed",
        });
      }
      return false;
    }
    if (!trainingOperationIsCurrent(revision)) {
      if (mountedRef.current && attempted !== null) {
        await recoverableDraftRepository.releaseAttempt(attempted).catch(() => null);
      }
      return false;
    }
    if (attempted === null) {
      scheduleTrainingReinspection();
      return false;
    }
    trainingOperationRef.current?.abort(
      new DOMException("Training start superseded", "AbortError"),
    );
    if (!trainingOperationIsCurrent(revision)) {
      if (mountedRef.current) {
        await recoverableDraftRepository.releaseAttempt(attempted).catch(() => null);
      }
      return false;
    }
    const controller = new AbortController();
    trainingOperationRef.current = controller;
    commitTrainingWorkflow({
      draft: attempted,
      failure: null,
      intent,
      phase: retrying ? "retrying" : "submitting",
    });
    try {
      const response = await startMutation.mutateAsync(intent);
      if (
        controller.signal.aborted
        || !trainingOperationIsCurrent(revision)
      ) return false;
      return finishTrainingStart(
        intent,
        attempted,
        response,
        controller.signal,
        revision,
      );
    } catch (error) {
      if (
        controller.signal.aborted
        || !trainingOperationIsCurrent(revision)
      ) return false;
      commitTrainingWorkflow({
        draft: attempted,
        failure: classifyMutationFailure(error, onlineRef.current),
        intent,
        phase: "failed",
      });
      return false;
    } finally {
      if (trainingOperationRef.current === controller) {
        trainingOperationRef.current = null;
      }
    }
  }, [
    commitTrainingWorkflow,
    finishTrainingStart,
    language,
    scheduleTrainingReinspection,
    startMutation,
    trainingOperationIsCurrent,
  ]);

  const persistAndStartTraining = useCallback(async (
    intent: StartTrainingIntent,
  ) => {
    if (
      trainingWorkflowRef.current !== null
      || !trainingRecoveryReadyRef.current
      || trainingInspectionFailureRef.current !== null
    ) return false;
    const revision = trainingRevisionRef.current + 1;
    trainingRevisionRef.current = revision;
    trainingOperationRef.current?.abort(
      new DOMException("Training start superseded", "AbortError"),
    );
    commitTrainingWorkflow({
      draft: null,
      failure: null,
      intent,
      phase: "persisting",
    });
    let draft: RecoverableDraft;
    try {
      draft = await persistTrainingMutationDraft(ownerScope, intent);
    } catch {
      if (trainingOperationIsCurrent(revision)) {
        commitTrainingWorkflow({
          draft: null,
          failure: trainingStorageFailure(language),
          intent,
          phase: "failed",
        });
      }
      return false;
    }
    if (!trainingOperationIsCurrent(revision)) return false;
    return submitPersistedTraining(intent, draft, false, revision);
  }, [
    commitTrainingWorkflow,
    language,
    ownerScope,
    submitPersistedTraining,
    trainingOperationIsCurrent,
  ]);

  const startTaskTraining = useCallback((task: OfficialPlanTask) => {
    if (task.targetProblemId === null) return;
    void persistAndStartTraining(newStartTrainingIntent({
      planTaskId: task.id,
      problemId: task.targetProblemId,
    }));
  }, [persistAndStartTraining]);

  const onTaskRequiresTraining = useCallback((
    _intent: CompletePlanTaskIntent,
    task: OfficialPlanTask,
  ) => {
    startTaskTraining(task);
  }, [startTaskTraining]);

  const planWorkflow = usePlanMutationWorkflow({
    csrfProof,
    language,
    online,
    ownerScope,
    onTaskRequiresTraining,
    ...(verifyOwner === undefined ? {} : { verifyOwner }),
  });

  const retryTraining = useCallback(async () => {
    if (
      !trainingRecoveryReadyRef.current
      || trainingInspectionFailureRef.current !== null
    ) return;
    const current = trainingWorkflowRef.current;
    if (current?.phase !== "failed") return;
    const revision = trainingRevisionRef.current + 1;
    trainingRevisionRef.current = revision;
    trainingOperationRef.current?.abort(
      new DOMException("Training retry superseded", "AbortError"),
    );
    commitTrainingWorkflow({
      ...current,
      failure: null,
      phase: "reconciling",
    });
    if (current.draft === null) {
      commitTrainingWorkflow({ ...current, failure: null, phase: "persisting" });
      let draft: RecoverableDraft;
      try {
        draft = await persistTrainingMutationDraft(ownerScope, current.intent);
      } catch {
        if (trainingOperationIsCurrent(revision)) {
          commitTrainingWorkflow({
            ...current,
            failure: trainingStorageFailure(language),
            phase: "failed",
          });
        }
        return;
      }
      if (!trainingOperationIsCurrent(revision)) return;
      await submitPersistedTraining(current.intent, draft, true, revision);
      return;
    }
    try {
      const drafts = await recoverableDraftRepository.list(ownerScope);
      if (!trainingOperationIsCurrent(revision)) return;
      const source = exactDraft(current.draft, drafts);
      if (source === null) {
        scheduleTrainingReinspection();
        return;
      }
      const sourceIntent = recoverPlanTrainingIntent(source);
      if (sourceIntent === null) {
        scheduleTrainingReinspection();
        return;
      }
      if (isRecoverableDraftAttemptActive(source)) {
        commitTrainingWorkflow({
          draft: source,
          failure: null,
          intent: sourceIntent,
          phase: "reconciling",
        });
        return;
      }
      await submitPersistedTraining(
        sourceIntent,
        source,
        true,
        revision,
      );
    } catch {
      if (trainingOperationIsCurrent(revision)) {
        commitTrainingWorkflow({
          ...current,
          failure: trainingReconciliationFailure(onlineRef.current, language),
        });
      }
    }
  }, [
    commitTrainingWorkflow,
    language,
    ownerScope,
    scheduleTrainingReinspection,
    submitPersistedTraining,
    trainingOperationIsCurrent,
  ]);

  const discardTraining = useCallback(async () => {
    if (
      !trainingRecoveryReadyRef.current
      || trainingInspectionFailureRef.current !== null
    ) return;
    const current = trainingWorkflowRef.current;
    if (current === null) return;
    const revision = trainingRevisionRef.current + 1;
    trainingRevisionRef.current = revision;
    trainingOperationRef.current?.abort(
      new DOMException("Training request discarded", "AbortError"),
    );
    trainingOperationRef.current = null;
    commitTrainingRecoveryReady(false);
    if (current.draft !== null) {
      try {
        const discarded = await recoverableDraftRepository.discard(current.draft);
        if (!trainingOperationIsCurrent(revision)) return;
        let sourceStillExists = false;
        if (!discarded) {
          const drafts = await recoverableDraftRepository.list(ownerScope);
          if (!trainingOperationIsCurrent(revision)) return;
          sourceStillExists = exactDraft(current.draft, drafts) !== null;
        }
        if (sourceStillExists) {
          commitTrainingWorkflow({
            ...current,
            failure: trainingReconciliationFailure(onlineRef.current, language),
            phase: "failed",
          });
          commitTrainingRecoveryReady(true);
          return;
        }
        const receipts = await listTrainingRecoveryReceipts(ownerScope);
        if (!trainingOperationIsCurrent(revision)) return;
        const matchingReceipts = receipts.filter(
          ({ payload }) => payload.sourceDraftId === current.draft?.draftId
            && payload.sourceGenerationId === current.draft?.generationId,
        );
        for (const receipt of matchingReceipts) {
          let consumed = false;
          for (let pass = 0; pass < 2 && !consumed; pass += 1) {
            consumed = await consumeTrainingRecoveryReceipt(ownerScope, receipt);
            if (!trainingOperationIsCurrent(revision)) return;
            if (!consumed) {
              const persistedReceipts = await listTrainingRecoveryReceipts(ownerScope);
              if (!trainingOperationIsCurrent(revision)) return;
              consumed = !persistedReceipts.some(
                ({ draft }) => draft.draftId === receipt.draft.draftId
                  && draft.generationId === receipt.draft.generationId,
              );
            }
          }
          if (!consumed) throw new Error("TRAINING_RECEIPT_DISCARD_FAILED");
        }
      } catch {
        if (trainingOperationIsCurrent(revision)) {
          commitTrainingWorkflow({
            ...current,
            failure: trainingReconciliationFailure(onlineRef.current, language),
            phase: "failed",
          });
          commitTrainingRecoveryReady(true);
        }
        return;
      }
    }
    if (!trainingOperationIsCurrent(revision)) return;
    scheduleTrainingReinspection();
  }, [
    commitTrainingRecoveryReady,
    commitTrainingWorkflow,
    language,
    ownerScope,
    scheduleTrainingReinspection,
    trainingOperationIsCurrent,
  ]);

  const display = useMemo(
    () => plan === null ? null : createPlanDisplayModel(plan, language),
    [language, plan],
  );
  const activeRecommendations = useMemo(() => (
    plan?.recommendations
      .filter(({ status }) => status === "active")
      .sort((left, right) => left.rank - right.rank || left.id.localeCompare(right.id))
      ?? []
  ), [plan?.recommendations]);
  const planInteractionLocked = (
    !planWorkflow.recoveryReady
    || planWorkflow.inspectionFailure !== null
    || planWorkflow.workflow !== null
    || !trainingRecoveryReady
    || trainingInspectionFailure !== null
    || trainingWorkflow !== null
    || currentPlan.isError
  );
  const boardDisabled = planInteractionLocked || plan?.status !== "active";

  const submitPlan = useCallback((request: CreatePlanRequest) => {
    if (planInteractionLocked || plan !== null) return;
    void planWorkflow.submit(newCreatePlanIntent(request));
  }, [plan, planInteractionLocked, planWorkflow]);

  const submitDiagnostic = useCallback((answers: DiagnosticAnswerRequest[]) => {
    if (planInteractionLocked || plan === null || plan.status !== "active") return;
    setDiagnosticSubmissionVersion(plan.version);
    void (async () => {
      if (await planWorkflow.submit(newRunPlanDiagnosticIntent(plan, answers))) {
        setDiagnosticSubmissionVersion(null);
        setDiagnosticExpandedAtVersion(null);
        setDiagnosticSelections([]);
      }
    })();
  }, [
    plan,
    planInteractionLocked,
    planWorkflow,
    setDiagnosticExpandedAtVersion,
    setDiagnosticSelections,
  ]);

  const openDiagnostic = useCallback(() => {
    if (plan === null) return;
    setDiagnosticSubmissionVersion(null);
    setDiagnosticSelections([]);
    setDiagnosticExpandedAtVersion(plan.version);
  }, [plan]);

  const cancelDiagnostic = useCallback(() => {
    setDiagnosticSubmissionVersion(null);
    setDiagnosticExpandedAtVersion(null);
  }, []);

  const completeTask = useCallback((task: OfficialPlanTask) => {
    if (planInteractionLocked || plan === null || plan.status !== "active") return;
    void planWorkflow.submit(newCompletePlanTaskIntent(plan, task));
  }, [plan, planInteractionLocked, planWorkflow]);

  const editTask = useCallback((task: OfficialPlanTask) => {
    if (
      planInteractionLocked
      || plan === null
      || plan.status !== "active"
      || task.status !== "open"
    ) return;
    setEditingTaskIdentity({ id: task.id, version: task.version });
  }, [plan, planInteractionLocked]);

  const submitTaskEdit = useCallback((
    task: OfficialPlanTask,
    changes: PlanTaskChanges,
  ) => {
    if (planInteractionLocked || plan === null || plan.status !== "active") return;
    void (async () => {
      if (await planWorkflow.submit(newUpdatePlanTaskIntent(plan, task, changes))) {
        setEditingTaskIdentity(null);
        restoreTaskEditFocus(task.id);
      }
    })();
  }, [plan, planInteractionLocked, planWorkflow, restoreTaskEditFocus]);

  const activeEditingTaskIdentity = editingTaskIdentity !== null
    && plan?.tasks.some((task) => (
      task.id === editingTaskIdentity.id
      && task.status === "open"
      && task.version === editingTaskIdentity.version
    )) === true
    ? editingTaskIdentity
    : null;
  const displayedDiagnosticExpanded = diagnosticExpandedAtVersion !== null && !(
    diagnosticSubmissionVersion !== null
    && plan !== null
    && plan.version > diagnosticSubmissionVersion
    && plan.diagnosticStatus === "completed"
  );

  useEffect(() => {
    if (editingTaskIdentity === null || activeEditingTaskIdentity !== null) return;
    restoreTaskEditFocus(editingTaskIdentity.id);
  }, [activeEditingTaskIdentity, editingTaskIdentity, restoreTaskEditFocus]);

  const changeDiagnosticAnswer = useCallback((
    questionId: PlanDiagnosticQuestionId,
    optionId: string,
  ) => {
    setDiagnosticSelections((selections) => [
      ...selections.filter((selection) => selection.questionId !== questionId),
      { optionId, questionId },
    ]);
  }, []);

  if (currentPlan.isPending && currentPlan.data === undefined) {
    return (
      <DashboardTemplate
        className={styles.page ?? ""}
        description={copy.loadingDescription}
        eyebrow={copy.pageEyebrow}
        loadingLabel={copy.loadingLabel}
        status="loading"
        title={copy.loadingTitle}
      >
        <div />
      </DashboardTemplate>
    );
  }

  if (currentPlan.isError && currentPlan.data === undefined) {
    const failure = classifyMutationFailure(currentPlan.error, online);
    return (
      <DashboardTemplate
        className={styles.page ?? ""}
        description={copy.loadErrorDescription}
        eyebrow={copy.pageEyebrow}
        title={copy.loadErrorTitle}
      >
        <RecoveryPanel
          actionLabel={copy.loadErrorAction}
          busy={currentPlan.isFetching}
          busyLabel={copy.loadErrorAction}
          className={styles.recovery ?? ""}
          message={copy.loadErrorDescription}
          onReload={() => void currentPlan.refetch()}
          onRetry={() => void currentPlan.refetch()}
          onReturn={() => navigate("/")}
          onSignIn={() => navigate("/login?reauth=1&redirect=%2Fplan")}
          referenceLabel={copy.requestId}
          requestId={failure.requestId}
          state={failure.state}
          title={copy.loadErrorTitle}
        />
      </DashboardTemplate>
    );
  }

  if (currentPlan.data === undefined) return null;

  const firstOpenTask = display?.openTasks[0] ?? null;
  const primaryTaskActions = firstOpenTask === null
    ? null
    : planTaskActionsFor(firstOpenTask, language);
  let primaryAction: ReactNode;
  if (
    plan === null
    || plan.status !== "active"
    || planInteractionLocked
    || displayedDiagnosticExpanded
  ) {
    primaryAction = undefined;
  } else if (plan.diagnosticStatus !== "completed") {
    primaryAction = (
      <Button onClick={openDiagnostic} size="large">
        {copy.primaryStartBaseline}
      </Button>
    );
  } else if (firstOpenTask === null || primaryTaskActions === null) {
    primaryAction = undefined;
  } else if (primaryTaskActions.training !== null) {
    primaryAction = (
      <Button onClick={() => startTaskTraining(firstOpenTask)} size="large">
        {copy.primaryStartTraining}
      </Button>
    );
  } else if (primaryTaskActions.navigation !== null) {
    primaryAction = (
      <Button
        onClick={() => navigate(primaryTaskActions.navigation!.route)}
        size="large"
      >
        {copy.primaryNavigate}
      </Button>
    );
  } else if (primaryTaskActions.canComplete) {
    primaryAction = (
      <Button onClick={() => completeTask(firstOpenTask)} size="large">
        {copy.primaryComplete}
      </Button>
    );
  } else {
    primaryAction = undefined;
  }

  const planWorkflowPhase = planWorkflow.workflow?.phase;
  const workflowStatus = planWorkflowPhase === undefined || planWorkflowPhase === "failed"
    ? null
    : workflowDraftStatus(planWorkflowPhase, copy);
  const trainingStatus = trainingWorkflow === null || trainingWorkflow.phase === "failed"
    ? null
    : workflowDraftStatus(trainingWorkflow.phase, copy);
  const planFailure = planWorkflow.workflow?.phase === "failed"
    ? planWorkflow.workflow.failure
    : null;
  const planInspectionFailure = planWorkflow.inspectionFailure;
  const trainingFailure = trainingWorkflow?.phase === "failed"
    ? trainingWorkflow.failure
    : null;

  const statusStack = (
    planWorkflow.recoveryReady && trainingRecoveryReady
    && workflowStatus === null && trainingStatus === null
    && planFailure === null && planInspectionFailure === null
    && trainingFailure === null && trainingInspectionFailure === null
    && !(currentPlan.isError && currentPlan.data !== undefined)
  ) ? null : (
    <div className={styles.statusStack}>
      {!planWorkflow.recoveryReady || !trainingRecoveryReady ? (
        <DraftStatus
          message={copy.draftChecking}
          state="saving"
          title={copy.draftCheckingTitle}
        />
      ) : null}
      {workflowStatus === null ? null : (
        <DraftStatus
          message={workflowStatus.message}
          state={workflowStatus.state}
          title={workflowStatus.title}
        />
      )}
      {planInspectionFailure === null ? null : (
        <RecoveryPanel
          actionLabel={copy.loadErrorAction}
          busy={!planWorkflow.recoveryReady}
          message={localizedFailureMessage(planInspectionFailure, language)}
          onReload={() => void planWorkflow.inspectRecovery()}
          onRetry={() => void planWorkflow.inspectRecovery()}
          onReturn={() => navigate("/")}
          onSignIn={() => navigate("/login?reauth=1&redirect=%2Fplan")}
          referenceLabel={copy.requestId}
          requestId={planInspectionFailure.requestId}
          state={planInspectionFailure.state}
          title={copy.loadErrorTitle}
        />
      )}
      {trainingStatus === null ? null : (
        <DraftStatus
          message={trainingStatus.message}
          state={trainingStatus.state}
          title={trainingStatus.title}
        />
      )}
      {planFailure === null ? null : (
        <div className={styles.recoveryGroup}>
          <RecoveryPanel
            actionLabel={recoveryActionLabel(planFailure.state, language)}
            message={localizedFailureMessage(planFailure, language)}
            onReload={() => void planWorkflow.loadLatest()}
            onRetry={() => void planWorkflow.retry()}
            onReturn={() => void planWorkflow.discard()}
            onSignIn={() => navigate("/login?reauth=1&redirect=%2Fplan")}
            referenceLabel={copy.requestId}
            requestId={planFailure.requestId}
            state={planFailure.state}
          />
          {planFailure.state === "non-recoverable-error" ? null : (
            <Button onClick={() => void planWorkflow.discard()} variant="ghost">
              {copy.discardDraft}
            </Button>
          )}
        </div>
      )}
      {trainingFailure === null ? null : (
        <div className={styles.recoveryGroup}>
          <RecoveryPanel
            actionLabel={trainingFailure.state === "permission-denied"
              ? copy.signIn
              : trainingFailure.state === "non-recoverable-error"
                ? copy.trainingDiscard
                : copy.retryTraining}
            message={localizedFailureMessage(trainingFailure, language)}
            onReload={() => void retryTraining()}
            onRetry={() => void retryTraining()}
            onReturn={() => void discardTraining()}
            onSignIn={() => navigate("/login?reauth=1&redirect=%2Fplan")}
            referenceLabel={copy.requestId}
            requestId={trainingFailure.requestId}
            state={trainingFailure.state}
            title={copy.trainingFailureTitle}
          />
          {trainingFailure.state === "non-recoverable-error" ? null : (
            <Button onClick={() => void discardTraining()} variant="ghost">
              {copy.trainingDiscard}
            </Button>
          )}
        </div>
      )}
      {trainingInspectionFailure === null ? null : (
        <RecoveryPanel
          actionLabel={copy.retryTraining}
          busy={!trainingRecoveryReady}
          message={localizedFailureMessage(trainingInspectionFailure, language)}
          onReload={() => void inspectTrainingRecovery()}
          onRetry={() => void inspectTrainingRecovery()}
          onReturn={() => navigate("/")}
          onSignIn={() => navigate("/login?reauth=1&redirect=%2Fplan")}
          referenceLabel={copy.requestId}
          requestId={trainingInspectionFailure.requestId}
          state={trainingInspectionFailure.state}
          title={copy.trainingFailureTitle}
        />
      )}
      {currentPlan.isError && currentPlan.data !== undefined ? (
        <RecoveryPanel
          actionLabel={copy.loadErrorAction}
          busy={currentPlan.isFetching}
          message={copy.loadErrorDescription}
          onReload={() => void currentPlan.refetch()}
          onRetry={() => void currentPlan.refetch()}
          onReturn={() => navigate("/")}
          onSignIn={() => navigate("/login?reauth=1&redirect=%2Fplan")}
          state={classifyMutationFailure(currentPlan.error, online).state}
          title={copy.loadErrorTitle}
        />
      ) : null}
    </div>
  );

  if (plan === null) {
    return (
      <DashboardTemplate
        className={styles.page ?? ""}
        description={copy.pageDescription}
        eyebrow={copy.pageEyebrow}
        hero={(
          <section className={styles.emptyHero}>
            <div className={styles.emptyHeroCopy}>
              <p className={styles.heroEyebrow}>{copy.createEyebrow}</p>
              <h2>{copy.createTitle}</h2>
              <p>{copy.createDescription}</p>
            </div>
            <QuantyImage
              alt=""
              asset="teacher"
              className={styles.heroMascot}
              priority
              prominence="primary"
              size="hero"
            />
          </section>
        )}
        title={copy.pageTitle}
      >
        {statusStack}
        <PlanSetupForm
          disabled={planInteractionLocked}
          isSubmitting={planWorkflowPhase === "persisting" || planWorkflowPhase === "submitting"}
          language={language}
          onChange={setSetup}
          onSubmit={submitPlan}
          value={setup}
        />
      </DashboardTemplate>
    );
  }

  if (display === null) return null;

  const pendingTaskId = planWorkflow.workflow !== null
    && "taskId" in planWorkflow.workflow.intent
    ? planWorkflow.workflow.intent.taskId
    : trainingWorkflow?.intent.request.planTaskId ?? null;
  const pendingTaskAction = (task: OfficialPlanTask): PlanTaskPendingAction | null => {
    if (task.id !== pendingTaskId) return null;
    if (trainingWorkflow !== null) return "training";
    if (planWorkflow.workflow?.intent.kind === "complete-task") return "complete";
    if (planWorkflow.workflow?.intent.kind === "update-task") return "edit";
    return null;
  };
  const boardColumns = [
    {
      description: language === "en"
        ? "Actions that are still confirmed as open."
        : "仍被服务端确认为待完成的行动。",
      emptyState: display.completedTasks.length === 0
        ? copy.openEmpty
        : (
            <EmptyState
              description={copy.allCompleteDescription}
              headingLevel={3}
              mascot="trophy"
              mascotAlt=""
              mascotSize="small"
              title={copy.allCompleteTitle}
            />
          ),
      id: "open",
      items: display.openTasks.map((task) => ({
        ariaLabel: localizedPlanTaskContent(task, language).title,
        content: (
          <div className={styles.taskContent}>
            <PlanTaskCard
              disabled={boardDisabled}
              editing={activeEditingTaskIdentity?.id === task.id}
              editorId={taskEditorDomId(task.id)}
              editTriggerId={taskEditTriggerDomId(task.id)}
              language={language}
              onComplete={completeTask}
              onEdit={editTask}
              onNavigate={(route) => navigate(route)}
              onStartTraining={(_problemId, sourceTask) => startTaskTraining(sourceTask)}
              pendingAction={pendingTaskAction(task)}
              task={task}
            />
            {activeEditingTaskIdentity?.id !== task.id ? null : (
              <TaskEditor
                disabled={boardDisabled}
                id={taskEditorDomId(task.id)}
                isSubmitting={pendingTaskAction(task) === "edit"}
                key={`${task.id}:${task.version}:${language}`}
                language={language}
                onCancel={() => {
                  setEditingTaskIdentity(null);
                  restoreTaskEditFocus(task.id);
                }}
                onSubmit={(changes) => submitTaskEdit(task, changes)}
                task={task}
              />
            )}
          </div>
        ),
        id: task.id,
      })),
      title: copy.openColumn,
    },
    {
      description: language === "en"
        ? "Server-confirmed completion history."
        : "由服务端确认的完成记录。",
      emptyState: copy.completedEmpty,
      id: "completed",
      items: display.completedTasks.map((task) => ({
        ariaLabel: localizedPlanTaskContent(task, language).title,
        content: (
          <PlanTaskCard
            disabled
            language={language}
            task={task}
          />
        ),
        id: task.id,
      })),
      title: copy.completedColumn,
    },
  ] as const;

  return (
    <DashboardTemplate
      aside={(
        <section aria-labelledby="plan-recommendations-title" className={styles.recommendations}>
          <div className={styles.asideHeading}>
            <p>{copy.recommendationsDescription}</p>
            <h2 id="plan-recommendations-title">{copy.recommendationsTitle}</h2>
          </div>
          {activeRecommendations.length === 0 ? (
            <p className={styles.recommendationsEmpty}>{copy.recommendationsEmpty}</p>
          ) : (
            <ol className={styles.recommendationList}>
              {activeRecommendations.map((recommendation) => (
                <li
                  data-provenance-resource={recommendation.provenanceResourceId ?? undefined}
                  data-recommendation-provenance={recommendation.provenanceType}
                  key={recommendation.id}
                >
                  <div className={styles.recommendationBadges}>
                    <span>{recommendationKindLabel(recommendation.kind, language)}</span>
                    <span className={styles.recommendationProvenance}>
                      {recommendationProvenanceLabel(
                        recommendation.provenanceType,
                        language,
                      )}
                    </span>
                  </div>
                  <p>{localizedRecommendationRationale(recommendation, language)}</p>
                </li>
              ))}
            </ol>
          )}
        </section>
      )}
      asideLabel={copy.recommendationsTitle}
      className={styles.page ?? ""}
      description={copy.pageDescription}
      eyebrow={copy.pageEyebrow}
      hero={(
        <section className={styles.planHero}>
          <div className={styles.planHeroCopy}>
            <div className={styles.heroStatusRow}>
              <span>{planStatusLabel(plan.status, copy)}</span>
              <span>{display.progressLabel}</span>
            </div>
            <h2>{display.title}</h2>
            <p>{display.subtitle}</p>
            <progress
              aria-label={copy.progressMetric}
              className={styles.progressTrack}
              max={100}
              value={display.progressPercentage}
            >
              {display.progressPercentage}%
            </progress>
          </div>
          <QuantyImage
            alt=""
            asset={display.openTasks.length === 0 ? "trophy" : "focused"}
            className={styles.heroMascot}
            priority
            prominence="primary"
            size="hero"
          />
        </section>
      )}
      layout="tablet-stacked"
      metrics={(
        <>
          <Metric
            detail={copy.progressDetail}
            label={copy.progressMetric}
            prefix="✓"
            tone={display.progressPercentage === 100 ? "positive" : "neutral"}
            value={`${display.progressPercentage}%`}
          />
          <Metric
            detail={display.progressLabel}
            label={copy.openMetric}
            prefix="→"
            tone={display.openTasks.length > 0 ? "warning" : "positive"}
            value={display.openTasks.length}
          />
          <Metric
            detail={planCopy.weeklyHoursOption(plan.weeklyHours)}
            label={copy.weeklyMetric}
            prefix="7D"
            value={plan.weeklyHours}
          />
          <Metric
            detail={plan.diagnosticStatus === "completed"
              ? planCopy.baselineCompletedTitle
              : planCopy.baselinePendingDescription}
            label={copy.diagnosticMetric}
            prefix="B"
            tone={plan.diagnosticStatus === "completed" ? "positive" : "warning"}
            value={plan.diagnosticStatus === "completed"
              ? display.diagnosticScore
              : copy.diagnosticPending}
          />
        </>
      )}
      metricsLabel={copy.pageEyebrow}
      primaryAction={primaryAction}
      title={copy.pageTitle}
    >
      {statusStack}
      <PlanDiagnosticPanel
        diagnosticScore={plan.diagnosticScore}
        diagnosticScores={plan.diagnosticScores}
        disabled={boardDisabled}
        expanded={displayedDiagnosticExpanded}
        isSubmitting={planWorkflow.workflow?.intent.kind === "diagnostic"
          && planWorkflow.workflow.phase !== "failed"}
        language={language}
        onAnswerChange={changeDiagnosticAnswer}
        onCancel={cancelDiagnostic}
        onOpen={openDiagnostic}
        onSubmit={submitDiagnostic}
        selections={diagnosticSelections}
        status={plan.diagnosticStatus}
      />
      <WorkflowBoard
        ariaLabel={copy.boardLabel}
        className={styles.board ?? ""}
        columns={boardColumns}
        columnsLabel={copy.columnsLabel}
        description={copy.boardDescription}
        disabled={boardDisabled}
        disabledMessage={copy.boardDisabled}
        itemCountLabel={copy.itemCount}
        title={copy.boardLabel}
      />
    </DashboardTemplate>
  );
}

function PlanPageFromSession({
  onNavigate,
}: Readonly<{ onNavigate: NavigateTo | undefined }>) {
  const routerNavigate = useNavigate();
  const { language } = useI18n();
  const currentUser = useCurrentUserQuery();
  const fallbackCopy = language === "en"
    ? {
        loadingTitle: "Confirming your training account",
        permissionAction: "Sign in again",
        permissionMessage: "Sign in to view and manage your official training plan.",
        permissionTitle: "Sign in to view your training plan",
      }
    : {
        loadingTitle: "正在确认训练账号",
        permissionAction: "重新登录",
        permissionMessage: "登录后即可查看并管理你的正式训练计划。",
        permissionTitle: "需要登录后查看训练计划",
      };
  const session = useMemo<PlanPageSession | null>(() => {
    if (currentUser.data === null || currentUser.data === undefined) return null;
    return {
      csrfProof: safeCsrfProof(),
      ownerScope: createAccountScope(currentUser.data.email),
    };
  }, [currentUser.data]);

  if (currentUser.data === null) {
    return (
      <DashboardTemplate title={fallbackCopy.permissionTitle}>
        <RecoveryPanel
          actionLabel={fallbackCopy.permissionAction}
          message={fallbackCopy.permissionMessage}
          onSignIn={() => {
            if (onNavigate === undefined) routerNavigate("/login?redirect=%2Fplan");
            else onNavigate("/login?redirect=%2Fplan");
          }}
          state="permission-denied"
          title={fallbackCopy.permissionTitle}
        />
      </DashboardTemplate>
    );
  }

  if (session === null) {
    return (
      <DashboardTemplate status="loading" title={fallbackCopy.loadingTitle}>
        <div />
      </DashboardTemplate>
    );
  }
  return <PlanSessionPage onNavigate={onNavigate} session={session} />;
}

export function PlanPage({
  onNavigate,
  session,
}: PlanPageProps) {
  return session === undefined
    ? <PlanPageFromSession onNavigate={onNavigate} />
    : <PlanSessionPage onNavigate={onNavigate} session={session} />;
}

export default PlanPage;
