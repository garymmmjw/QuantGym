import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ZodError } from "zod";

import {
  PLAN_RECONNECT_REPLAYED_EVENT,
  publishPlanDraftChanged,
  subscribePlanDraftChanges,
} from "../../domains/plan/plan.events";
import {
  acknowledgePlanTaskMutation,
  invalidatePlanReadModels,
  mutatePlan,
  type CompletePlanTaskIntent,
  type CreatePlanIntent,
  type PlanMutationIntent,
  type UpdatePlanTaskIntent,
} from "../../domains/plan/plan.mutations";
import { getCurrentPlan, planQueryKeys } from "../../domains/plan/plan.queries";
import {
  PLAN_DRAFT_KINDS,
  cacheCurrentPlanMonotonically,
  persistPlanMutationDraft,
  recoverPlanMutationIntent,
} from "../../domains/plan/plan.recovery";
import type {
  CurrentPlanResponse,
  OfficialPlan,
  OfficialPlanTask,
} from "../../domains/plan/plan.schema";
import { ApiError } from "../../shared/api/errors";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../shared/api/mutationRecovery";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../shared/api/ownerScopedQueries";
import type { AppLanguage } from "../../shared/i18n";
import {
  isRecoverableDraftAttemptActive,
  recoverableDraftRepository,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../shared/storage/drafts";

export type PlanWorkflowPhase =
  | "persisting"
  | "submitting"
  | "retrying"
  | "reconciling"
  | "failed";

export type PlanMutationWorkflow = Readonly<{
  draft: RecoverableDraft | null;
  failure: MutationFailure | null;
  intent: PlanMutationIntent;
  phase: PlanWorkflowPhase;
}>;

type PlanMutationWorkflowOptions = Readonly<{
  csrfProof: string | null;
  language?: AppLanguage;
  online: boolean;
  ownerScope: string;
  onTaskRequiresTraining?: (
    intent: CompletePlanTaskIntent,
    task: OfficialPlanTask,
  ) => void;
  repository?: RecoverableDraftRepository;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

const isPlanDraft = (draft: RecoverableDraft): boolean => (
  PLAN_DRAFT_KINDS.includes(draft.kind as (typeof PLAN_DRAFT_KINDS)[number])
);

const latestPlanDraft = (
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => drafts
  .filter(isPlanDraft)
  .sort((left, right) => (
    left.updatedAt.localeCompare(right.updatedAt)
    || left.draftId.localeCompare(right.draftId)
  ))
  .at(-1) ?? null;

const exactDraft = (
  source: RecoverableDraft,
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => drafts.find((draft) => (
  draft.draftId === source.draftId
  && draft.generationId === source.generationId
)) ?? null;

const removeExactDraft = async (
  repository: RecoverableDraftRepository,
  source: RecoverableDraft,
  operation: "acknowledge" | "discard",
): Promise<boolean> => {
  try {
    if (await repository[operation](source)) return true;
    return exactDraft(source, await repository.list(source.ownerScope)) === null;
  } catch {
    return false;
  }
};

type RecoveredPlanDraft = Readonly<{
  draft: RecoverableDraft;
  drafts: readonly RecoverableDraft[];
  intent: PlanMutationIntent;
}> | Readonly<{
  draft: null;
  drafts: readonly RecoverableDraft[];
  intent: null;
}>;

const recoverLatestValidPlanDraft = async (
  repository: RecoverableDraftRepository,
  ownerScope: string,
): Promise<RecoveredPlanDraft> => {
  let drafts = await repository.list(ownerScope);
  let draft = latestPlanDraft(drafts);
  while (draft !== null) {
    try {
      return {
        draft,
        drafts,
        intent: recoverPlanMutationIntent(draft),
      };
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      if (!await removeExactDraft(repository, draft, "discard")) {
        throw new Error("PLAN_INVALID_DRAFT_DISCARD_FAILED", { cause: error });
      }
      drafts = await repository.list(ownerScope);
      draft = latestPlanDraft(drafts);
    }
  }
  return { draft: null, drafts, intent: null };
};

export const createIntentMatchesPlan = (
  intent: CreatePlanIntent,
  plan: OfficialPlan | null,
): boolean => plan !== null
  && plan.role === intent.request.role
  && plan.season === intent.request.season
  && plan.track === intent.request.track
  && plan.weeklyHours === intent.request.weeklyHours;

const pendingDraftFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "PLAN_RECOVERY_PENDING",
  message: language === "en"
    ? online
      ? "This device still has a plan change that the server has not confirmed."
      : "The plan change is kept on this device and can continue when you are online."
    : online
      ? "本机仍有一项未得到服务器确认的计划更改。"
      : "计划更改已保留在本机，联网后可以继续。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const reconciliationFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "PLAN_DRAFT_RECONCILIATION_FAILED",
  message: language === "en"
    ? "We could not confirm whether the saved plan change was synchronized. Try again."
    : "暂时无法确认本机计划更改是否已同步，请重试。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const storageFailure = (language: AppLanguage): MutationFailure => ({
  code: "DRAFT_STORAGE_UNAVAILABLE",
  message: language === "en"
    ? "This change could not be safely stored on this device. Try again later."
    : "无法先把这项更改安全保存在本机，请稍后重试。",
  preserveDraft: false,
  requestId: null,
  retryable: true,
  state: "recoverable-error",
});

const taskIntent = (
  intent: PlanMutationIntent,
): intent is UpdatePlanTaskIntent | CompletePlanTaskIntent => (
  intent.kind === "update-task" || intent.kind === "complete-task"
);

export function usePlanMutationWorkflow({
  csrfProof,
  language = "zh-CN",
  online,
  ownerScope,
  onTaskRequiresTraining,
  repository = recoverableDraftRepository,
  verifyOwner,
}: PlanMutationWorkflowOptions) {
  const queryClient = useQueryClient();
  const [workflow, setWorkflow] = useState<PlanMutationWorkflow | null>(null);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [inspectionFailure, setInspectionFailure] = useState<MutationFailure | null>(null);
  const inspectionInFlightRef = useRef(false);
  const inspectionPendingRef = useRef(false);
  const operationEpochRef = useRef(0);
  const operationRef = useRef<AbortController | null>(null);
  const inspectionFailureRef = useRef<MutationFailure | null>(null);
  const mountedRef = useRef(true);
  const workflowRef = useRef<PlanMutationWorkflow | null>(null);
  const onTaskRequiresTrainingRef = useRef(onTaskRequiresTraining);
  const onlineRef = useRef(online);

  const commitWorkflow = useCallback((next: PlanMutationWorkflow | null) => {
    workflowRef.current = next;
    setWorkflow(next);
  }, []);

  const commitInspectionFailure = useCallback((next: MutationFailure | null) => {
    inspectionFailureRef.current = next;
    setInspectionFailure(next);
  }, []);

  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow]);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    onTaskRequiresTrainingRef.current = onTaskRequiresTraining;
  }, [onTaskRequiresTraining]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      operationEpochRef.current += 1;
      operationRef.current?.abort(
        new DOMException("Plan workflow unmounted", "AbortError"),
      );
    };
  }, []);

  const effectiveVerifyOwner = useCallback((signal?: AbortSignal) => (
    verifyOwner === undefined
      ? verifyCurrentSessionOwner(ownerScope, signal)
      : verifyOwner(signal)
  ), [ownerScope, verifyOwner]);

  const recoverLatestDraft = useCallback(
    () => recoverLatestValidPlanDraft(repository, ownerScope),
    [ownerScope, repository],
  );

  const runRecoveryInspection = useCallback(async () => {
    try {
      const recovered = await recoverLatestDraft();
      const { draft, drafts } = recovered;
      if (!mountedRef.current) return;
      commitInspectionFailure(null);
      const current = workflowRef.current;
      const currentSource = current === null || current.draft === null
        ? null
        : exactDraft(current.draft, drafts);
      if (draft === null) {
        if (current !== null && current.draft !== null && currentSource === null) {
          operationEpochRef.current += 1;
          operationRef.current?.abort(
            new DOMException("Plan draft reconciled elsewhere", "AbortError"),
          );
          commitWorkflow(null);
          void queryClient.invalidateQueries({
            queryKey: planQueryKeys.forOwner(ownerScope),
          });
        }
        return;
      }
      const canAdoptDraft = current === null
        || current.phase === "reconciling"
        || (current.draft !== null && currentSource === null);
      if (!canAdoptDraft) return;
      if (isRecoverableDraftAttemptActive(draft)) {
        commitWorkflow({
          draft,
          failure: null,
          intent: recovered.intent,
          phase: "reconciling",
        });
      } else {
        commitWorkflow({
          draft,
          failure: pendingDraftFailure(onlineRef.current, language),
          intent: recovered.intent,
          phase: "failed",
        });
      }
    } catch (error) {
      if (!mountedRef.current) return;
      const current = workflowRef.current;
      if (current !== null) {
        commitWorkflow({
          ...current,
          failure: classifyMutationFailure(error, onlineRef.current),
          phase: "failed",
        });
      } else {
        commitInspectionFailure(
          reconciliationFailure(onlineRef.current, language),
        );
      }
    }
  }, [
    commitInspectionFailure,
    commitWorkflow,
    language,
    ownerScope,
    queryClient,
    recoverLatestDraft,
  ]);

  const inspectRecovery = useCallback(async () => {
    if (!mountedRef.current) return;
    if (inspectionInFlightRef.current) {
      inspectionPendingRef.current = true;
      if (mountedRef.current) setRecoveryReady(false);
      return;
    }
    inspectionInFlightRef.current = true;
    setRecoveryReady(false);
    try {
      do {
        inspectionPendingRef.current = false;
        await runRecoveryInspection();
      } while (mountedRef.current && inspectionPendingRef.current);
    } finally {
      inspectionInFlightRef.current = false;
      if (mountedRef.current) setRecoveryReady(true);
    }
  }, [runRecoveryInspection]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => void inspectRecovery(), 0);
    return () => globalThis.clearTimeout(timeout);
  }, [inspectRecovery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const inspect = () => void inspectRecovery();
    window.addEventListener(PLAN_RECONNECT_REPLAYED_EVENT, inspect);
    return () => window.removeEventListener(PLAN_RECONNECT_REPLAYED_EVENT, inspect);
  }, [inspectRecovery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    return subscribePlanDraftChanges(
      ownerScope,
      () => void inspectRecovery(),
    );
  }, [inspectRecovery, ownerScope]);

  useEffect(() => {
    if (
      typeof window === "undefined"
      || workflow?.draft === null
      || workflow === null
      || (workflow.phase !== "reconciling" && workflow.phase !== "failed")
    ) {
      return undefined;
    }
    const poll = window.setInterval(() => void inspectRecovery(), 750);
    return () => window.clearInterval(poll);
  }, [inspectRecovery, workflow]);

  const reconcileCreateConflict = useCallback(async (
    intent: CreatePlanIntent,
    draft: RecoverableDraft,
    signal: AbortSignal,
  ): Promise<boolean> => {
    const current = await runOwnerVerifiedOperation(
      effectiveVerifyOwner,
      (operationSignal) => getCurrentPlan(operationSignal),
      signal,
    );
    const retained = cacheCurrentPlanMonotonically(
      queryClient,
      ownerScope,
      current,
    );
    if (!createIntentMatchesPlan(intent, retained.plan)) return false;
    await invalidatePlanReadModels(queryClient, ownerScope);
    return removeExactDraft(repository, draft, "acknowledge");
  }, [effectiveVerifyOwner, ownerScope, queryClient, repository]);

  const inspectAfterAcknowledgement = useCallback(async () => {
    if (!mountedRef.current) return;
    setRecoveryReady(false);
    commitWorkflow(null);
    await inspectRecovery();
  }, [commitWorkflow, inspectRecovery]);

  const finishAcknowledged = useCallback(async (
    intent: PlanMutationIntent,
    draft: RecoverableDraft,
    response: Awaited<ReturnType<typeof mutatePlan>>,
  ): Promise<boolean> => {
    if (taskIntent(intent) && "task" in response) {
      acknowledgePlanTaskMutation(
        queryClient,
        ownerScope,
        intent,
        response,
      );
    }
    await invalidatePlanReadModels(queryClient, ownerScope);
    return removeExactDraft(repository, draft, "acknowledge");
  }, [ownerScope, queryClient, repository]);

  const submitPersisted = useCallback(async (
    intent: PlanMutationIntent,
    source: RecoverableDraft,
    retrying: boolean,
    operationEpoch: number,
  ): Promise<boolean> => {
    const operationIsCurrent = () => mountedRef.current
      && operationEpochRef.current === operationEpoch;
    let attempted: RecoverableDraft | null;
    try {
      attempted = await repository.markAttempt(source);
    } catch {
      publishPlanDraftChanged(ownerScope);
      if (operationIsCurrent()) {
        commitWorkflow({
          draft: source,
          failure: reconciliationFailure(onlineRef.current, language),
          intent,
          phase: "failed",
        });
      }
      return false;
    }
    if (!operationIsCurrent()) {
      if (attempted !== null) {
        await repository.releaseAttempt(attempted).catch(() => null);
      }
      publishPlanDraftChanged(ownerScope);
      return false;
    }
    if (attempted === null) {
      publishPlanDraftChanged(ownerScope);
      let leaseWinner: RecoverableDraft | null;
      try {
        leaseWinner = exactDraft(source, await repository.list(ownerScope));
      } catch {
        if (operationIsCurrent()) {
          commitWorkflow({
            draft: source,
            failure: reconciliationFailure(onlineRef.current, language),
            intent,
            phase: "failed",
          });
        }
        return false;
      }
      if (!operationIsCurrent()) return false;
      if (leaseWinner === null) {
        await inspectAfterAcknowledgement();
        return false;
      }
      commitWorkflow({
        draft: leaseWinner,
        failure: null,
        intent,
        phase: "reconciling",
      });
      return false;
    }

    publishPlanDraftChanged(ownerScope);
    const controller = new AbortController();
    operationRef.current?.abort(
      new DOMException("Superseded plan workflow", "AbortError"),
    );
    operationRef.current = controller;
    commitWorkflow({
      draft: attempted,
      failure: null,
      intent,
      phase: retrying ? "retrying" : "submitting",
    });
    const releaseAttempt = async (): Promise<RecoverableDraft> => {
      try {
        const released = await repository.releaseAttempt(attempted) ?? attempted;
        publishPlanDraftChanged(ownerScope);
        return released;
      } catch {
        return attempted;
      }
    };
    try {
      const response = await runOwnerVerifiedOperation(
        effectiveVerifyOwner,
        (signal) => mutatePlan(intent, csrfProof, signal),
        controller.signal,
      );
      if (!operationIsCurrent() || controller.signal.aborted) {
        await releaseAttempt();
        return false;
      }
      if (!await finishAcknowledged(intent, attempted, response)) {
        if (operationIsCurrent()) {
          commitWorkflow({
            draft: attempted,
            failure: reconciliationFailure(onlineRef.current, language),
            intent,
            phase: "failed",
          });
        }
        return false;
      }
      if (!operationIsCurrent() || controller.signal.aborted) return false;
      await inspectAfterAcknowledgement();
      return true;
    } catch (error) {
      if (controller.signal.aborted || !operationIsCurrent()) {
        await releaseAttempt();
        return false;
      }
      if (
        error instanceof ApiError
        && error.code === "PLAN_ALREADY_ACTIVE"
        && intent.kind === "create"
      ) {
        try {
          if (await reconcileCreateConflict(intent, attempted, controller.signal)) {
            await inspectAfterAcknowledgement();
            return true;
          }
        } catch (reconciliationError) {
          const retained = await releaseAttempt();
          if (operationIsCurrent()) {
            commitWorkflow({
              draft: retained,
              failure: classifyMutationFailure(
                reconciliationError,
                onlineRef.current,
              ),
              intent,
              phase: "failed",
            });
          }
          return false;
        }
      }
      if (
        error instanceof ApiError
        && error.code === "PLAN_TASK_REQUIRES_TRAINING"
        && intent.kind === "complete-task"
      ) {
        let current: CurrentPlanResponse;
        try {
          const incoming = await runOwnerVerifiedOperation(
            effectiveVerifyOwner,
            (signal) => getCurrentPlan(signal),
            controller.signal,
          );
          current = cacheCurrentPlanMonotonically(
            queryClient,
            ownerScope,
            incoming,
          );
        } catch (reconciliationError) {
          const retained = await releaseAttempt();
          if (operationIsCurrent()) {
            commitWorkflow({
              draft: retained,
              failure: classifyMutationFailure(
                reconciliationError,
                onlineRef.current,
              ),
              intent,
              phase: "failed",
            });
          }
          return false;
        }
        const currentPlan = current.plan;
        const trainingTask = currentPlan?.tasks.find(({ id, planId }) => (
          id === intent.taskId && planId === currentPlan.id
        ));
        if (trainingTask?.targetProblemId === null || trainingTask === undefined) {
          const retained = await releaseAttempt();
          if (operationIsCurrent()) {
            commitWorkflow({
              draft: retained,
              failure: classifyMutationFailure(error, onlineRef.current),
              intent,
              phase: "failed",
            });
          }
          return false;
        }
        if (!await removeExactDraft(repository, attempted, "discard")) {
          if (operationIsCurrent()) {
            commitWorkflow({
              draft: attempted,
              failure: reconciliationFailure(onlineRef.current, language),
              intent,
              phase: "failed",
            });
          }
          return false;
        }
        if (!operationIsCurrent()) return false;
        await inspectAfterAcknowledgement();
        onTaskRequiresTrainingRef.current?.(intent, trainingTask);
        return false;
      }
      const failure = classifyMutationFailure(error, onlineRef.current);
      let retainedDraft: RecoverableDraft | null = attempted;
      let presentedFailure = failure;
      if (failure.preserveDraft) {
        retainedDraft = await releaseAttempt();
      } else {
        if (await removeExactDraft(repository, attempted, "discard")) {
          retainedDraft = null;
        } else {
          presentedFailure = reconciliationFailure(onlineRef.current, language);
        }
      }
      if (operationIsCurrent()) {
        commitWorkflow({
          draft: retainedDraft,
          failure: presentedFailure,
          intent,
          phase: "failed",
        });
      }
      return false;
    } finally {
      if (operationRef.current === controller) operationRef.current = null;
    }
  }, [
    csrfProof,
    commitWorkflow,
    effectiveVerifyOwner,
    finishAcknowledged,
    inspectAfterAcknowledgement,
    language,
    ownerScope,
    queryClient,
    reconcileCreateConflict,
    repository,
  ]);

  const submit = useCallback(async (intent: PlanMutationIntent) => {
    if (
      !recoveryReady
      || inspectionFailureRef.current !== null
      || workflowRef.current !== null
    ) return false;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(
      new DOMException("Superseded plan workflow", "AbortError"),
    );
    commitWorkflow({ draft: null, failure: null, intent, phase: "persisting" });
    let draft: RecoverableDraft;
    try {
      draft = await persistPlanMutationDraft(ownerScope, intent, repository);
    } catch {
      if (
        mountedRef.current
        && operationEpochRef.current === operationEpoch
      ) {
        commitWorkflow({
          draft: null,
          failure: storageFailure(language),
          intent,
          phase: "failed",
        });
      }
      return false;
    }
    if (
      !mountedRef.current
      || operationEpochRef.current !== operationEpoch
    ) {
      publishPlanDraftChanged(ownerScope);
      return false;
    }
    return submitPersisted(intent, draft, false, operationEpoch);
  }, [
    commitWorkflow,
    language,
    ownerScope,
    recoveryReady,
    repository,
    submitPersisted,
  ]);

  const retry = useCallback(async () => {
    const current = workflowRef.current;
    if (current?.phase !== "failed") return false;
    if (current.draft === null) {
      commitWorkflow(null);
      return submit(current.intent);
    }
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(
      new DOMException("Superseded plan retry", "AbortError"),
    );
    commitWorkflow({
      ...current,
      failure: null,
      phase: "reconciling",
    });
    let source: RecoverableDraft | null;
    try {
      source = exactDraft(current.draft, await repository.list(ownerScope));
    } catch {
      if (
        mountedRef.current
        && operationEpochRef.current === operationEpoch
      ) {
        commitWorkflow({
          ...current,
          failure: reconciliationFailure(onlineRef.current, language),
        });
      }
      return false;
    }
    if (
      !mountedRef.current
      || operationEpochRef.current !== operationEpoch
    ) return false;
    if (source === null) {
      await queryClient.invalidateQueries({
        queryKey: planQueryKeys.forOwner(ownerScope),
      });
      await inspectAfterAcknowledgement();
      return false;
    }
    if (isRecoverableDraftAttemptActive(source)) {
      commitWorkflow({
        draft: source,
        failure: null,
        intent: recoverPlanMutationIntent(source),
        phase: "reconciling",
      });
      return false;
    }
    return submitPersisted(
      recoverPlanMutationIntent(source),
      source,
      true,
      operationEpoch,
    );
  }, [
    commitWorkflow,
    language,
    ownerScope,
    queryClient,
    repository,
    submit,
    submitPersisted,
    inspectAfterAcknowledgement,
  ]);

  const discard = useCallback(async () => {
    const current = workflowRef.current;
    if (current === null) return;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(
      new DOMException("Plan workflow discarded", "AbortError"),
    );
    commitWorkflow({
      ...current,
      failure: null,
      phase: "reconciling",
    });
    const discarded = current.draft === null
      || await removeExactDraft(repository, current.draft, "discard");
    if (
      !mountedRef.current
      || operationEpochRef.current !== operationEpoch
    ) return;
    if (!discarded) {
      if (mountedRef.current) {
        commitWorkflow({
          ...current,
          failure: reconciliationFailure(onlineRef.current, language),
          phase: "failed",
        });
      }
      return;
    }
    await inspectAfterAcknowledgement();
  }, [commitWorkflow, inspectAfterAcknowledgement, language, repository]);

  const loadLatest = useCallback(async () => {
    const current = workflowRef.current;
    if (current === null) return;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(
      new DOMException("Loading latest plan", "AbortError"),
    );
    commitWorkflow({
      ...current,
      failure: null,
      phase: "reconciling",
    });
    try {
      await queryClient.fetchQuery({
        queryFn: ({ signal }) => runOwnerVerifiedOperation(
          effectiveVerifyOwner,
          (operationSignal) => getCurrentPlan(operationSignal),
          signal,
        ),
        queryKey: planQueryKeys.current(ownerScope),
        staleTime: 0,
      });
      if (
        !mountedRef.current
        || operationEpochRef.current !== operationEpoch
      ) return;
      const discarded = current.draft === null
        || await removeExactDraft(repository, current.draft, "discard");
      if (
        !mountedRef.current
        || operationEpochRef.current !== operationEpoch
      ) return;
      if (!discarded) {
        commitWorkflow({
          ...current,
          failure: reconciliationFailure(onlineRef.current, language),
          phase: "failed",
        });
        return;
      }
      await inspectAfterAcknowledgement();
    } catch (error) {
      if (
        mountedRef.current
        && operationEpochRef.current === operationEpoch
      ) {
        commitWorkflow({
          ...current,
          failure: classifyMutationFailure(error, onlineRef.current),
          phase: "failed",
        });
      }
    }
  }, [
    commitWorkflow,
    effectiveVerifyOwner,
    language,
    inspectAfterAcknowledgement,
    ownerScope,
    queryClient,
    repository,
  ]);

  return {
    busy: workflow !== null && workflow.phase !== "failed",
    discard,
    inspectionFailure,
    inspectRecovery,
    loadLatest,
    recoveryReady,
    retry,
    submit,
    workflow,
  } as const;
}
