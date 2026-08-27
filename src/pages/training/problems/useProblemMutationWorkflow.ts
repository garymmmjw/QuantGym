import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ZodError } from "zod";

import {
  PROBLEM_RECONNECT_REPLAYED_EVENT,
  publishProblemDraftChanged,
  subscribeProblemDraftChanges,
} from "../../../domains/problems/problems.events";
import {
  acknowledgeProblemFavorite,
  acknowledgeProblemNote,
  invalidateProblemMutationReadModels,
  mutateProblem,
  type ProblemMutationIntent,
} from "../../../domains/problems/problems.mutations";
import { problemQueryKeys } from "../../../domains/problems/problems.queries";
import {
  PROBLEM_DRAFT_KINDS,
  persistProblemMutationDraft,
  reconcileProblemMutation,
  recoverProblemMutationIntent,
} from "../../../domains/problems/problems.recovery";
import {
  favoriteStateSchema,
  problemNoteSchema,
} from "../../../domains/problems/problems.schema";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../../shared/api/mutationRecovery";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../../shared/api/ownerScopedQueries";
import type { AppLanguage } from "../../../shared/i18n";
import {
  isRecoverableDraftAttemptActive,
  recoverableDraftRepository,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../../shared/storage/drafts";

export type ProblemWorkflowPhase =
  | "persisting"
  | "submitting"
  | "retrying"
  | "reconciling"
  | "failed";

export type ProblemMutationWorkflow = Readonly<{
  draft: RecoverableDraft | null;
  failure: MutationFailure | null;
  intent: ProblemMutationIntent;
  phase: ProblemWorkflowPhase;
}>;

export type ProblemMutationWorkflowOptions = Readonly<{
  csrfProof: string | null;
  language?: AppLanguage;
  online: boolean;
  ownerScope: string;
  repository?: RecoverableDraftRepository;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

const isProblemDraft = (draft: RecoverableDraft): boolean => (
  PROBLEM_DRAFT_KINDS.includes(draft.kind as (typeof PROBLEM_DRAFT_KINDS)[number])
);

const latestProblemDraft = (
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => drafts
  .filter(isProblemDraft)
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

type RecoveredProblemDraft = Readonly<{
  draft: RecoverableDraft;
  drafts: readonly RecoverableDraft[];
  intent: ProblemMutationIntent;
}> | Readonly<{
  draft: null;
  drafts: readonly RecoverableDraft[];
  intent: null;
}>;

const recoverLatestValidProblemDraft = async (
  repository: RecoverableDraftRepository,
  ownerScope: string,
): Promise<RecoveredProblemDraft> => {
  let drafts = await repository.list(ownerScope);
  let draft = latestProblemDraft(drafts);
  while (draft !== null) {
    try {
      return {
        draft,
        drafts,
        intent: recoverProblemMutationIntent(draft),
      };
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      if (!await removeExactDraft(repository, draft, "discard")) {
        throw new Error("PROBLEM_INVALID_DRAFT_DISCARD_FAILED", { cause: error });
      }
      publishProblemDraftChanged(ownerScope);
      drafts = await repository.list(ownerScope);
      draft = latestProblemDraft(drafts);
    }
  }
  return { draft: null, drafts, intent: null };
};

const pendingDraftFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "PROBLEM_RECOVERY_PENDING",
  message: language === "en"
    ? online
      ? "This device still has a problem change that the server has not confirmed."
      : "The problem change is kept on this device and can continue when you are online."
    : online
      ? "本机仍有一项未得到服务器确认的题目更改。"
      : "题目更改已保留在本机，联网后可以继续。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const reconciliationFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "PROBLEM_DRAFT_RECONCILIATION_FAILED",
  message: language === "en"
    ? "We could not confirm whether the saved problem change was synchronized. Try again."
    : "暂时无法确认本机题目更改是否已同步，请重试。",
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

const abortError = (message: string) => new DOMException(message, "AbortError");

export function useProblemMutationWorkflow({
  csrfProof,
  language = "zh-CN",
  online,
  ownerScope,
  repository = recoverableDraftRepository,
  verifyOwner,
}: ProblemMutationWorkflowOptions) {
  const queryClient = useQueryClient();
  const [workflowState, setWorkflowState] = useState(() => ({
    ownerScope,
    value: null as ProblemMutationWorkflow | null,
  }));
  const [recoveryReadyState, setRecoveryReadyState] = useState(() => ({
    ownerScope,
    value: false,
  }));
  const [inspectionFailureState, setInspectionFailureState] = useState(() => ({
    ownerScope,
    value: null as MutationFailure | null,
  }));
  const workflow = workflowState.ownerScope === ownerScope
    ? workflowState.value
    : null;
  const recoveryReady = recoveryReadyState.ownerScope === ownerScope
    ? recoveryReadyState.value
    : false;
  const inspectionFailure = inspectionFailureState.ownerScope === ownerScope
    ? inspectionFailureState.value
    : null;
  const workflowRef = useRef<ProblemMutationWorkflow | null>(null);
  const inspectionFailureRef = useRef<MutationFailure | null>(null);
  const inspectionInFlightRef = useRef(false);
  const inspectionPendingRef = useRef(false);
  const mountedRef = useRef(true);
  const activeOwnerScopeRef = useRef(ownerScope);
  const scopeEpochRef = useRef(0);
  const operationEpochRef = useRef(0);
  const operationRef = useRef<AbortController | null>(null);
  const onlineRef = useRef(online);

  const commitWorkflow = useCallback((next: ProblemMutationWorkflow | null) => {
    if (activeOwnerScopeRef.current !== ownerScope) return;
    workflowRef.current = next;
    setWorkflowState({ ownerScope, value: next });
  }, [ownerScope]);

  const commitInspectionFailure = useCallback((next: MutationFailure | null) => {
    if (activeOwnerScopeRef.current !== ownerScope) return;
    inspectionFailureRef.current = next;
    setInspectionFailureState({ ownerScope, value: next });
  }, [ownerScope]);

  const commitRecoveryReady = useCallback((next: boolean) => {
    if (activeOwnerScopeRef.current !== ownerScope) return;
    setRecoveryReadyState({ ownerScope, value: next });
  }, [ownerScope]);

  useEffect(() => {
    workflowRef.current = workflow;
  }, [workflow]);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    const scopeEpoch = scopeEpochRef.current + 1;
    scopeEpochRef.current = scopeEpoch;
    activeOwnerScopeRef.current = ownerScope;
    mountedRef.current = true;
    inspectionInFlightRef.current = false;
    inspectionPendingRef.current = false;
    operationEpochRef.current += 1;
    operationRef.current?.abort(abortError("Problem workflow owner changed"));
    operationRef.current = null;
    workflowRef.current = null;
    inspectionFailureRef.current = null;
    return () => {
      if (scopeEpochRef.current !== scopeEpoch) return;
      mountedRef.current = false;
      operationEpochRef.current += 1;
      operationRef.current?.abort(abortError("Problem workflow unmounted"));
      operationRef.current = null;
    };
  }, [ownerScope]);

  const scopeIsCurrent = useCallback((scopeEpoch: number) => (
    mountedRef.current
    && scopeEpochRef.current === scopeEpoch
    && activeOwnerScopeRef.current === ownerScope
  ), [ownerScope]);

  const effectiveVerifyOwner = useCallback((signal?: AbortSignal) => (
    verifyOwner === undefined
      ? verifyCurrentSessionOwner(ownerScope, signal)
      : verifyOwner(signal)
  ), [ownerScope, verifyOwner]);

  const recoverLatestDraft = useCallback(
    () => recoverLatestValidProblemDraft(repository, ownerScope),
    [ownerScope, repository],
  );

  const runRecoveryInspection = useCallback(async (scopeEpoch: number) => {
    try {
      const recovered = await recoverLatestDraft();
      if (!scopeIsCurrent(scopeEpoch)) return;
      const { draft, drafts } = recovered;
      commitInspectionFailure(null);
      const current = workflowRef.current;
      const currentSource = current?.draft === null || current === null
        ? null
        : exactDraft(current.draft, drafts);
      if (draft === null) {
        if (current?.draft !== null && current !== null && currentSource === null) {
          operationEpochRef.current += 1;
          operationRef.current?.abort(abortError("Problem draft reconciled elsewhere"));
          commitWorkflow(null);
          void queryClient.invalidateQueries({
            queryKey: problemQueryKeys.forOwner(ownerScope),
          });
        }
        return;
      }
      const canAdoptDraft = current === null
        || current.phase === "reconciling"
        || (current.draft !== null && currentSource === null);
      if (!canAdoptDraft) return;
      commitWorkflow(isRecoverableDraftAttemptActive(draft)
        ? {
            draft,
            failure: null,
            intent: recovered.intent,
            phase: "reconciling",
          }
        : {
            draft,
            failure: pendingDraftFailure(onlineRef.current, language),
            intent: recovered.intent,
            phase: "failed",
          });
    } catch (error) {
      if (!scopeIsCurrent(scopeEpoch)) return;
      const current = workflowRef.current;
      if (current !== null) {
        commitWorkflow({
          ...current,
          failure: classifyMutationFailure(error, onlineRef.current),
          phase: "failed",
        });
      } else {
        commitInspectionFailure(reconciliationFailure(onlineRef.current, language));
      }
    }
  }, [
    commitInspectionFailure,
    commitWorkflow,
    language,
    ownerScope,
    queryClient,
    recoverLatestDraft,
    scopeIsCurrent,
  ]);

  const inspectRecovery = useCallback(async () => {
    const scopeEpoch = scopeEpochRef.current;
    if (!scopeIsCurrent(scopeEpoch)) return;
    if (inspectionInFlightRef.current) {
      inspectionPendingRef.current = true;
      commitRecoveryReady(false);
      return;
    }
    inspectionInFlightRef.current = true;
    commitRecoveryReady(false);
    try {
      do {
        inspectionPendingRef.current = false;
        await runRecoveryInspection(scopeEpoch);
      } while (scopeIsCurrent(scopeEpoch) && inspectionPendingRef.current);
    } finally {
      if (scopeIsCurrent(scopeEpoch)) {
        inspectionInFlightRef.current = false;
        commitRecoveryReady(true);
      }
    }
  }, [commitRecoveryReady, runRecoveryInspection, scopeIsCurrent]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => void inspectRecovery(), 0);
    return () => globalThis.clearTimeout(timeout);
  }, [inspectRecovery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const inspect = () => void inspectRecovery();
    window.addEventListener(PROBLEM_RECONNECT_REPLAYED_EVENT, inspect);
    return () => window.removeEventListener(PROBLEM_RECONNECT_REPLAYED_EVENT, inspect);
  }, [inspectRecovery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    return subscribeProblemDraftChanges(ownerScope, () => void inspectRecovery());
  }, [inspectRecovery, ownerScope]);

  useEffect(() => {
    if (
      typeof window === "undefined"
      || workflow === null
      || workflow.draft === null
      || (workflow.phase !== "reconciling" && workflow.phase !== "failed")
    ) return undefined;
    const interval = window.setInterval(() => void inspectRecovery(), 750);
    return () => window.clearInterval(interval);
  }, [inspectRecovery, workflow]);

  const inspectAfterDraftChange = useCallback(async () => {
    if (!mountedRef.current || activeOwnerScopeRef.current !== ownerScope) return;
    commitRecoveryReady(false);
    commitWorkflow(null);
    await inspectRecovery();
  }, [commitRecoveryReady, commitWorkflow, inspectRecovery, ownerScope]);

  const finishAcknowledged = useCallback(async (
    intent: ProblemMutationIntent,
    draft: RecoverableDraft,
    response: Awaited<ReturnType<typeof mutateProblem>>,
  ): Promise<boolean> => {
    if (intent.kind === "set-favorite") {
      await acknowledgeProblemFavorite(
        queryClient,
        ownerScope,
        intent,
        favoriteStateSchema.parse(response),
      );
    } else {
      acknowledgeProblemNote(
        queryClient,
        ownerScope,
        intent,
        problemNoteSchema.parse(response),
      );
      await invalidateProblemMutationReadModels(
        queryClient,
        ownerScope,
        intent.problemId,
      );
    }
    return removeExactDraft(repository, draft, "acknowledge");
  }, [ownerScope, queryClient, repository]);

  const submitPersisted = useCallback(async (
    intent: ProblemMutationIntent,
    source: RecoverableDraft,
    retrying: boolean,
    operationEpoch: number,
  ): Promise<boolean> => {
    const scopeEpoch = scopeEpochRef.current;
    const operationIsCurrent = () => scopeIsCurrent(scopeEpoch)
      && operationEpochRef.current === operationEpoch;
    let attempted: RecoverableDraft | null;
    try {
      attempted = await repository.markAttempt(source);
    } catch {
      publishProblemDraftChanged(ownerScope);
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
      if (attempted !== null) await repository.releaseAttempt(attempted).catch(() => null);
      publishProblemDraftChanged(ownerScope);
      return false;
    }
    if (attempted === null) {
      publishProblemDraftChanged(ownerScope);
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
        await inspectAfterDraftChange();
        return false;
      }
      commitWorkflow({
        draft: leaseWinner,
        failure: null,
        intent: recoverProblemMutationIntent(leaseWinner),
        phase: "reconciling",
      });
      return false;
    }

    publishProblemDraftChanged(ownerScope);
    const controller = new AbortController();
    operationRef.current?.abort(abortError("Superseded problem workflow"));
    operationRef.current = controller;
    commitWorkflow({
      draft: attempted,
      failure: null,
      intent,
      phase: retrying ? "retrying" : "submitting",
    });

    const releaseAttempt = async (): Promise<RecoverableDraft | null> => {
      try {
        const released = await repository.releaseAttempt(attempted);
        publishProblemDraftChanged(ownerScope);
        return released;
      } catch {
        return attempted;
      }
    };

    try {
      const response = await runOwnerVerifiedOperation(
        effectiveVerifyOwner,
        (signal) => mutateProblem(intent, csrfProof, signal),
        controller.signal,
      );
      if (!operationIsCurrent() || controller.signal.aborted) {
        await releaseAttempt();
        return false;
      }
      if (!await finishAcknowledged(intent, attempted, response)) {
        publishProblemDraftChanged(ownerScope);
        if (operationIsCurrent()) await inspectAfterDraftChange();
        return false;
      }
      publishProblemDraftChanged(ownerScope);
      if (!operationIsCurrent() || controller.signal.aborted) return false;
      await inspectAfterDraftChange();
      return true;
    } catch (error) {
      if (controller.signal.aborted || !operationIsCurrent()) {
        await releaseAttempt();
        return false;
      }
      if (
        typeof error === "object"
        && error !== null
        && "status" in error
        && error.status === 409
      ) {
        try {
          const acknowledged = await reconcileProblemMutation({
            intent,
            ownerScope,
            queryClient,
            signal: controller.signal,
            verifyOwner: effectiveVerifyOwner,
          });
          if (
            acknowledged
            && operationIsCurrent()
            && await removeExactDraft(repository, attempted, "acknowledge")
          ) {
            publishProblemDraftChanged(ownerScope);
            await inspectAfterDraftChange();
            return true;
          }
        } catch (reconciliationError) {
          const retained = await releaseAttempt();
          if (operationIsCurrent()) {
            commitWorkflow({
              draft: retained,
              failure: classifyMutationFailure(reconciliationError, onlineRef.current),
              intent,
              phase: "failed",
            });
          }
          return false;
        }
      }
      const failure = classifyMutationFailure(error, onlineRef.current);
      let retainedDraft: RecoverableDraft | null = attempted;
      let presentedFailure = failure;
      if (failure.preserveDraft) {
        retainedDraft = await releaseAttempt();
        if (retainedDraft === null) {
          if (operationIsCurrent()) await inspectAfterDraftChange();
          return false;
        }
      } else if (await removeExactDraft(repository, attempted, "discard")) {
        retainedDraft = null;
        publishProblemDraftChanged(ownerScope);
      } else {
        presentedFailure = reconciliationFailure(onlineRef.current, language);
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
    inspectAfterDraftChange,
    language,
    ownerScope,
    queryClient,
    repository,
    scopeIsCurrent,
  ]);

  const submit = useCallback(async (intent: ProblemMutationIntent) => {
    if (
      !recoveryReady
      || inspectionFailureRef.current !== null
      || workflowRef.current !== null
      || activeOwnerScopeRef.current !== ownerScope
    ) return false;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(abortError("Superseded problem workflow"));
    commitWorkflow({ draft: null, failure: null, intent, phase: "persisting" });
    let draft: RecoverableDraft;
    try {
      draft = await persistProblemMutationDraft(ownerScope, intent, repository);
    } catch {
      if (
        mountedRef.current
        && activeOwnerScopeRef.current === ownerScope
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
    publishProblemDraftChanged(ownerScope);
    if (
      !mountedRef.current
      || activeOwnerScopeRef.current !== ownerScope
      || operationEpochRef.current !== operationEpoch
    ) return false;
    if (!online) {
      commitWorkflow({
        draft,
        failure: pendingDraftFailure(false, language),
        intent,
        phase: "failed",
      });
      return false;
    }
    return submitPersisted(intent, draft, false, operationEpoch);
  }, [
    commitWorkflow,
    language,
    online,
    ownerScope,
    recoveryReady,
    repository,
    submitPersisted,
  ]);

  const retry = useCallback(async () => {
    const current = workflowRef.current;
    if (current?.phase !== "failed") return false;
    if (!online && current.draft !== null) {
      commitWorkflow({
        ...current,
        failure: pendingDraftFailure(false, language),
      });
      return false;
    }
    if (current.draft === null) {
      commitWorkflow(null);
      return submit(current.intent);
    }
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(abortError("Superseded problem retry"));
    commitWorkflow({ ...current, failure: null, phase: "reconciling" });
    let source: RecoverableDraft | null;
    try {
      source = exactDraft(current.draft, await repository.list(ownerScope));
    } catch {
      if (
        mountedRef.current
        && activeOwnerScopeRef.current === ownerScope
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
      || activeOwnerScopeRef.current !== ownerScope
      || operationEpochRef.current !== operationEpoch
    ) return false;
    if (source === null) {
      await queryClient.invalidateQueries({
        queryKey: problemQueryKeys.forOwner(ownerScope),
      });
      await inspectAfterDraftChange();
      return false;
    }
    if (isRecoverableDraftAttemptActive(source)) {
      commitWorkflow({
        draft: source,
        failure: null,
        intent: recoverProblemMutationIntent(source),
        phase: "reconciling",
      });
      return false;
    }
    return submitPersisted(
      recoverProblemMutationIntent(source),
      source,
      true,
      operationEpoch,
    );
  }, [
    commitWorkflow,
    inspectAfterDraftChange,
    language,
    online,
    ownerScope,
    queryClient,
    repository,
    submit,
    submitPersisted,
  ]);

  const discard = useCallback(async () => {
    const current = workflowRef.current;
    if (current === null) return;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    operationRef.current?.abort(abortError("Problem workflow discarded"));
    commitWorkflow({ ...current, failure: null, phase: "reconciling" });
    const discarded = current.draft === null
      || await removeExactDraft(repository, current.draft, "discard");
    if (
      !mountedRef.current
      || activeOwnerScopeRef.current !== ownerScope
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
    publishProblemDraftChanged(ownerScope);
    await inspectAfterDraftChange();
  }, [
    commitWorkflow,
    inspectAfterDraftChange,
    language,
    ownerScope,
    repository,
  ]);

  const loadLatest = useCallback(async () => {
    const current = workflowRef.current;
    if (current === null) return;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const controller = new AbortController();
    operationRef.current?.abort(abortError("Loading latest problem"));
    operationRef.current = controller;
    commitWorkflow({ ...current, failure: null, phase: "reconciling" });
    try {
      await reconcileProblemMutation({
        intent: current.intent,
        ownerScope,
        queryClient,
        signal: controller.signal,
        verifyOwner: effectiveVerifyOwner,
      });
      if (
        !mountedRef.current
        || activeOwnerScopeRef.current !== ownerScope
        || operationEpochRef.current !== operationEpoch
        || controller.signal.aborted
      ) return;
      const discarded = current.draft === null
        || await removeExactDraft(repository, current.draft, "discard");
      if (
        !mountedRef.current
        || activeOwnerScopeRef.current !== ownerScope
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
      publishProblemDraftChanged(ownerScope);
      await inspectAfterDraftChange();
    } catch (error) {
      if (
        mountedRef.current
        && activeOwnerScopeRef.current === ownerScope
        && operationEpochRef.current === operationEpoch
        && !controller.signal.aborted
      ) {
        commitWorkflow({
          ...current,
          failure: classifyMutationFailure(error, onlineRef.current),
          phase: "failed",
        });
      }
    } finally {
      if (operationRef.current === controller) operationRef.current = null;
    }
  }, [
    commitWorkflow,
    effectiveVerifyOwner,
    inspectAfterDraftChange,
    language,
    ownerScope,
    queryClient,
    repository,
  ]);

  return {
    busy: workflow !== null && workflow.phase !== "failed",
    canSubmit: (
      recoveryReady
      && inspectionFailure === null
      && workflow === null
    ),
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
