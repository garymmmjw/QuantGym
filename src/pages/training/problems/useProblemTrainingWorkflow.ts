import { useQueryClient } from "@tanstack/react-query";
import {
  useCallback,
  useEffect,
  useRef,
  useState,
} from "react";
import { ZodError } from "zod";

import {
  TRAINING_DRAFT_CHANGED_EVENT,
  TRAINING_RECONNECT_REPLAYED_EVENT,
  publishTrainingDraftChanged,
  subscribeTrainingDraftChanges,
} from "../../../domains/training/training.events";
import type { TrainingMutationIntent } from "../../../domains/training/training.mutations";
import {
  TRAINING_DRAFT_KINDS,
  consumeTrainingRecoveryReceipt,
  listTrainingRecoveryReceipts,
  persistTrainingMutationDraft,
  recoverTrainingMutationIntent,
  replayTrainingMutationDrafts,
  type TrainingRecoveryReceipt,
} from "../../../domains/training/training.recovery";
import {
  classifyMutationFailure,
  type MutationFailure,
} from "../../../shared/api/mutationRecovery";
import { verifyCurrentSessionOwner } from "../../../shared/api/ownerScopedQueries";
import type { AppLanguage } from "../../../shared/i18n";
import {
  isRecoverableDraftAttemptActive,
  recoverableDraftRepository,
  type DraftReplayRetention,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../../shared/storage/drafts";

export type ProblemTrainingWorkflowPhase =
  | "persisting"
  | "submitting"
  | "retrying"
  | "reconciling"
  | "failed";

export type ProblemTrainingWorkflow = Readonly<{
  draft: RecoverableDraft | null;
  failure: MutationFailure | null;
  intent: TrainingMutationIntent;
  phase: ProblemTrainingWorkflowPhase;
}>;

export type TrainingReceiptDisposition = "consume" | "defer";

export type ProblemTrainingWorkflowOptions = Readonly<{
  csrfProof: string | null;
  language: AppLanguage;
  online: boolean;
  ownerScope: string;
  onLoadLatest: (signal?: AbortSignal) => Promise<void>;
  onReceipt: (
    receipt: TrainingRecoveryReceipt,
    signal?: AbortSignal,
  ) => Promise<TrainingReceiptDisposition | void>;
  repository?: RecoverableDraftRepository;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

const isTrainingDraft = (draft: RecoverableDraft): boolean => (
  TRAINING_DRAFT_KINDS.includes(
    draft.kind as (typeof TRAINING_DRAFT_KINDS)[number],
  )
);

const exactDraft = (
  source: RecoverableDraft,
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => drafts.find((draft) => (
  draft.draftId === source.draftId
  && draft.generationId === source.generationId
)) ?? null;

const latestTrainingDraft = (
  drafts: readonly RecoverableDraft[],
  excludedDrafts: ReadonlySet<string> = new Set(),
): RecoverableDraft | null => drafts
  .filter(isTrainingDraft)
  .filter((draft) => !excludedDrafts.has(
    `${draft.draftId}:${draft.generationId}`,
  ))
  .sort((left, right) => (
    left.updatedAt.localeCompare(right.updatedAt)
    || left.draftId.localeCompare(right.draftId)
  ))
  .at(-1) ?? null;

const exactDraftKey = (
  draft: Pick<RecoverableDraft, "draftId" | "generationId">,
): string => `${draft.draftId}:${draft.generationId}`;

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

type RecoveredTrainingDraft = Readonly<{
  draft: RecoverableDraft;
  intent: TrainingMutationIntent;
}> | Readonly<{
  draft: null;
  intent: null;
}>;

const recoverLatestValidTrainingDraft = async (
  repository: RecoverableDraftRepository,
  ownerScope: string,
  excludedDrafts: ReadonlySet<string>,
): Promise<RecoveredTrainingDraft> => {
  let drafts = await repository.list(ownerScope);
  let draft = latestTrainingDraft(drafts, excludedDrafts);
  while (draft !== null) {
    try {
      return {
        draft,
        intent: recoverTrainingMutationIntent(draft),
      };
    } catch (error) {
      if (!(error instanceof ZodError)) throw error;
      if (!await removeExactDraft(repository, draft, "discard")) {
        throw new Error("TRAINING_INVALID_DRAFT_DISCARD_FAILED", { cause: error });
      }
      publishTrainingDraftChanged(ownerScope);
      drafts = await repository.list(ownerScope);
      draft = latestTrainingDraft(drafts, excludedDrafts);
    }
  }
  return { draft: null, intent: null };
};

const pendingFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "TRAINING_RECOVERY_PENDING",
  message: language === "zh-CN"
    ? online
      ? "本机仍有一项未得到服务端确认的训练操作。"
      : "训练操作已保存在本机，联网后可以继续。"
    : online
      ? "This device still has a training action awaiting server confirmation."
      : "The training action is saved on this device and can continue when online.",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const reconciliationFailure = (
  online: boolean,
  language: AppLanguage,
): MutationFailure => ({
  code: "TRAINING_RECOVERY_RECONCILIATION_FAILED",
  message: language === "zh-CN"
    ? "暂时无法确认这项训练操作的最终状态，请重试。"
    : "The final state of this training action could not be confirmed. Try again.",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const storageFailure = (language: AppLanguage): MutationFailure => ({
  code: "TRAINING_DRAFT_STORAGE_UNAVAILABLE",
  message: language === "zh-CN"
    ? "无法先将这项操作安全保存在本机，因此没有发送请求。"
    : "The action could not be stored safely on this device, so it was not sent.",
  preserveDraft: false,
  requestId: null,
  retryable: true,
  state: "recoverable-error",
});

const failureFromRetention = (
  retention: DraftReplayRetention | undefined,
  online: boolean,
  language: AppLanguage,
): MutationFailure => {
  if (
    retention?.state === undefined
    || retention.reason === "superseded"
  ) {
    return reconciliationFailure(online, language);
  }
  return {
    code: retention.code ?? "TRAINING_REPLAY_FAILED",
    message: language === "zh-CN"
      ? "服务端尚未确认这项训练操作。"
      : "The server has not confirmed this training action.",
    preserveDraft: true,
    requestId: retention.requestId ?? null,
    retryable: retention.retryable ?? true,
    state: retention.state,
  };
};

const abortIfRequested = (signal: AbortSignal | undefined) => {
  if (signal?.aborted !== true) return;
  throw signal.reason ?? new DOMException("Training workflow aborted", "AbortError");
};

export function useProblemTrainingWorkflow({
  csrfProof,
  language,
  online,
  onLoadLatest,
  onReceipt,
  ownerScope,
  repository = recoverableDraftRepository,
  verifyOwner,
}: ProblemTrainingWorkflowOptions) {
  const queryClient = useQueryClient();
  const [workflowState, setWorkflowState] = useState(() => ({
    ownerScope,
    value: null as ProblemTrainingWorkflow | null,
  }));
  const [inspectionFailureState, setInspectionFailureState] = useState(() => ({
    ownerScope,
    value: null as MutationFailure | null,
  }));
  const [recoveryReadyState, setRecoveryReadyState] = useState(() => ({
    ownerScope,
    value: false,
  }));
  if (workflowState.ownerScope !== ownerScope) {
    setWorkflowState({ ownerScope, value: null });
  }
  if (inspectionFailureState.ownerScope !== ownerScope) {
    setInspectionFailureState({ ownerScope, value: null });
  }
  if (recoveryReadyState.ownerScope !== ownerScope) {
    setRecoveryReadyState({ ownerScope, value: false });
  }
  const workflow = workflowState.ownerScope === ownerScope
    ? workflowState.value
    : null;
  const inspectionFailure = inspectionFailureState.ownerScope === ownerScope
    ? inspectionFailureState.value
    : null;
  const recoveryReady = recoveryReadyState.ownerScope === ownerScope
    ? recoveryReadyState.value
    : false;
  const mountedRef = useRef(true);
  const activeOwnerScopeRef = useRef(ownerScope);
  const scopeEpochRef = useRef(0);
  const operationEpochRef = useRef(0);
  const operationRef = useRef<AbortController | null>(null);
  const inspectionControllerRef = useRef<AbortController | null>(null);
  const inspectionPromiseRef = useRef<Promise<void> | null>(null);
  const inspectionPendingRef = useRef(false);
  const workflowRef = useRef<ProblemTrainingWorkflow | null>(null);
  const inspectionFailureRef = useRef<MutationFailure | null>(null);
  const onlineRef = useRef(online);
  const onLoadLatestRef = useRef(onLoadLatest);
  const onReceiptRef = useRef(onReceipt);

  const commitWorkflow = useCallback((next: ProblemTrainingWorkflow | null) => {
    if (activeOwnerScopeRef.current !== ownerScope) return;
    workflowRef.current = next;
    if (mountedRef.current) setWorkflowState({ ownerScope, value: next });
  }, [ownerScope]);

  const commitInspectionFailure = useCallback((next: MutationFailure | null) => {
    if (activeOwnerScopeRef.current !== ownerScope) return;
    inspectionFailureRef.current = next;
    if (mountedRef.current) setInspectionFailureState({ ownerScope, value: next });
  }, [ownerScope]);

  const commitRecoveryReady = useCallback((next: boolean) => {
    if (activeOwnerScopeRef.current !== ownerScope || !mountedRef.current) return;
    setRecoveryReadyState({ ownerScope, value: next });
  }, [ownerScope]);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  useEffect(() => {
    onLoadLatestRef.current = onLoadLatest;
  }, [onLoadLatest]);

  useEffect(() => {
    onReceiptRef.current = onReceipt;
  }, [onReceipt]);

  useEffect(() => {
    const scopeEpoch = scopeEpochRef.current + 1;
    scopeEpochRef.current = scopeEpoch;
    activeOwnerScopeRef.current = ownerScope;
    mountedRef.current = true;
    operationEpochRef.current += 1;
    operationRef.current?.abort(
      new DOMException("Training workflow owner changed", "AbortError"),
    );
    inspectionControllerRef.current?.abort(
      new DOMException("Training inspection owner changed", "AbortError"),
    );
    operationRef.current = null;
    inspectionControllerRef.current = null;
    inspectionPromiseRef.current = null;
    inspectionPendingRef.current = false;
    workflowRef.current = null;
    inspectionFailureRef.current = null;
    return () => {
      if (scopeEpochRef.current !== scopeEpoch) return;
      mountedRef.current = false;
      operationEpochRef.current += 1;
      operationRef.current?.abort(
        new DOMException("Training workflow unmounted", "AbortError"),
      );
      inspectionControllerRef.current?.abort(
        new DOMException("Training inspection unmounted", "AbortError"),
      );
      operationRef.current = null;
      inspectionControllerRef.current = null;
      inspectionPromiseRef.current = null;
      inspectionPendingRef.current = false;
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

  const consumeReceiptExactly = useCallback(async (
    receipt: TrainingRecoveryReceipt,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    for (let pass = 0; pass < 2; pass += 1) {
      abortIfRequested(signal);
      if (await consumeTrainingRecoveryReceipt(ownerScope, receipt, repository)) {
        publishTrainingDraftChanged(ownerScope);
        return true;
      }
      const remaining = await listTrainingRecoveryReceipts(
        ownerScope,
        repository,
      );
      if (!remaining.some(({ draft }) => (
        draft.draftId === receipt.draft.draftId
        && draft.generationId === receipt.draft.generationId
      ))) return true;
    }
    return false;
  }, [ownerScope, repository]);

  const processReceipts = useCallback(async (
    signal?: AbortSignal,
  ): Promise<ReadonlySet<string>> => {
    const deferredSources = new Set<string>();
    const receipts = [
      ...await listTrainingRecoveryReceipts(ownerScope, repository),
    ].sort((left, right) => (
      left.draft.updatedAt.localeCompare(right.draft.updatedAt)
      || left.draft.draftId.localeCompare(right.draft.draftId)
    ));
    for (const receipt of receipts) {
      abortIfRequested(signal);
      await effectiveVerifyOwner(signal);
      abortIfRequested(signal);
      const disposition = await onReceiptRef.current(receipt, signal);
      abortIfRequested(signal);
      if (disposition === "defer") {
        deferredSources.add(exactDraftKey({
          draftId: receipt.payload.sourceDraftId,
          generationId: receipt.payload.sourceGenerationId,
        }));
        continue;
      }
      const drafts = await repository.list(ownerScope);
      abortIfRequested(signal);
      const source = drafts.find((draft) => (
        draft.draftId === receipt.payload.sourceDraftId
        && draft.generationId === receipt.payload.sourceGenerationId
      ));
      if (source !== undefined) {
        const acknowledged = await repository.acknowledge(source);
        abortIfRequested(signal);
        if (!acknowledged) {
          const refreshed = await repository.list(ownerScope);
          abortIfRequested(signal);
          if (exactDraft(source, refreshed) !== null) {
            throw new Error("TRAINING_RECEIPT_SOURCE_ACKNOWLEDGEMENT_FAILED");
          }
        }
      }
      if (!await consumeReceiptExactly(receipt, signal)) {
        throw new Error("TRAINING_RECEIPT_CONSUMPTION_FAILED");
      }
    }
    return deferredSources;
  }, [
    consumeReceiptExactly,
    effectiveVerifyOwner,
    ownerScope,
    repository,
  ]);

  const inspectRecoveryOnce = useCallback(async (
    scopeEpoch: number,
    signal: AbortSignal,
  ) => {
    try {
      const deferredSources = await processReceipts(signal);
      abortIfRequested(signal);
      const recovered = await recoverLatestValidTrainingDraft(
        repository,
        ownerScope,
        deferredSources,
      );
      abortIfRequested(signal);
      if (!scopeIsCurrent(scopeEpoch)) return;
      commitInspectionFailure(null);
      const current = workflowRef.current;
      if (recovered.draft === null) {
        if (
          current?.phase === "reconciling"
          || (
            current?.phase === "failed"
            && current.draft !== null
          )
        ) commitWorkflow(null);
        return;
      }
      if (
        current?.phase === "persisting"
        || current?.phase === "submitting"
        || current?.phase === "retrying"
      ) return;
      const recoveredIsCurrentFailure = (
        current?.phase === "failed"
        && current.draft !== null
        && exactDraftKey(current.draft) === exactDraftKey(recovered.draft)
      );
      if (recoveredIsCurrentFailure) {
        if (current.failure?.code === "TRAINING_RECOVERY_PENDING") {
          commitWorkflow({
            ...current,
            failure: pendingFailure(onlineRef.current, language),
          });
        }
        return;
      }
      commitWorkflow(isRecoverableDraftAttemptActive(recovered.draft)
        ? {
            draft: recovered.draft,
            failure: null,
            intent: recovered.intent,
            phase: "reconciling",
          }
        : {
            draft: recovered.draft,
            failure: pendingFailure(onlineRef.current, language),
            intent: recovered.intent,
            phase: "failed",
          });
    } catch (error) {
      if (signal.aborted || !scopeIsCurrent(scopeEpoch)) return;
      const current = workflowRef.current;
      const failure = classifyMutationFailure(error, onlineRef.current);
      const safeFailure = failure.state === "permission-denied"
        ? failure
        : reconciliationFailure(onlineRef.current, language);
      if (current === null) commitInspectionFailure(safeFailure);
      else {
        commitWorkflow({
          ...current,
          failure: safeFailure,
          phase: "failed",
        });
      }
    }
  }, [
    commitInspectionFailure,
    commitWorkflow,
    language,
    ownerScope,
    processReceipts,
    repository,
    scopeIsCurrent,
  ]);

  const inspectRecovery = useCallback((): Promise<void> => {
    const scopeEpoch = scopeEpochRef.current;
    if (!scopeIsCurrent(scopeEpoch)) return Promise.resolve();
    const inFlight = inspectionPromiseRef.current;
    if (inFlight !== null) {
      inspectionPendingRef.current = true;
      commitRecoveryReady(false);
      return inFlight;
    }
    const controller = new AbortController();
    inspectionControllerRef.current = controller;
    commitRecoveryReady(false);
    const inspection = (async () => {
      try {
        do {
          inspectionPendingRef.current = false;
          await inspectRecoveryOnce(scopeEpoch, controller.signal);
        } while (
          scopeIsCurrent(scopeEpoch)
          && !controller.signal.aborted
          && inspectionPendingRef.current
        );
      } finally {
        if (inspectionControllerRef.current === controller) {
          inspectionPromiseRef.current = null;
          inspectionControllerRef.current = null;
          if (scopeIsCurrent(scopeEpoch) && !controller.signal.aborted) {
            commitRecoveryReady(true);
          }
        }
      }
    })();
    inspectionPromiseRef.current = inspection;
    return inspection;
  }, [commitRecoveryReady, inspectRecoveryOnce, scopeIsCurrent]);

  useEffect(() => {
    const timeout = globalThis.setTimeout(() => void inspectRecovery(), 0);
    return () => globalThis.clearTimeout(timeout);
  }, [inspectRecovery]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    const inspect = () => void inspectRecovery();
    window.addEventListener(TRAINING_RECONNECT_REPLAYED_EVENT, inspect);
    window.addEventListener(TRAINING_DRAFT_CHANGED_EVENT, inspect);
    return () => {
      window.removeEventListener(TRAINING_RECONNECT_REPLAYED_EVENT, inspect);
      window.removeEventListener(TRAINING_DRAFT_CHANGED_EVENT, inspect);
    };
  }, [inspectRecovery]);

  useEffect(() => (
    subscribeTrainingDraftChanges(ownerScope, () => void inspectRecovery())
  ), [inspectRecovery, ownerScope]);

  useEffect(() => {
    if (
      typeof window === "undefined"
      || workflow === null
      || (
        workflow.phase !== "reconciling"
        && workflow.phase !== "failed"
      )
    ) return undefined;
    const poll = window.setInterval(() => void inspectRecovery(), 750);
    return () => window.clearInterval(poll);
  }, [inspectRecovery, workflow]);

  const runReplay = useCallback(async (
    source: RecoverableDraft,
    intent: TrainingMutationIntent,
    retrying: boolean,
    scopeEpoch: number,
    operationEpoch: number,
  ): Promise<boolean> => {
    const operationIsCurrent = () => (
      scopeIsCurrent(scopeEpoch)
      && operationEpochRef.current === operationEpoch
    );
    const controller = new AbortController();
    operationRef.current?.abort(
      new DOMException("Training operation superseded", "AbortError"),
    );
    operationRef.current = controller;
    commitWorkflow({
      draft: source,
      failure: null,
      intent,
      phase: retrying ? "retrying" : "submitting",
    });
    try {
      const report = await replayTrainingMutationDrafts({
        csrfProof,
        ownerScope,
        queryClient,
        repository,
        signal: controller.signal,
        verifyOwner: effectiveVerifyOwner,
      });
      if (
        controller.signal.aborted
        || !operationIsCurrent()
      ) return false;
      publishTrainingDraftChanged(ownerScope);
      const retention = report.retained.find(
        ({ draftId }) => draftId === source.draftId,
      );
      if (retention !== undefined) {
        const drafts = await repository.list(ownerScope);
        const retained = exactDraft(source, drafts)
          ?? latestTrainingDraft(drafts)
          ?? source;
        commitWorkflow({
          draft: retained,
          failure: failureFromRetention(
            retention,
            onlineRef.current,
            language,
          ),
          intent: isTrainingDraft(retained)
            ? recoverTrainingMutationIntent(retained)
            : intent,
          phase: "failed",
        });
        return false;
      }
      commitWorkflow({
        draft: source,
        failure: null,
        intent,
        phase: "reconciling",
      });
      await inspectRecovery();
      return operationIsCurrent() && !controller.signal.aborted;
    } catch (error) {
      if (
        controller.signal.aborted
        || !operationIsCurrent()
      ) return false;
      const drafts = await repository.list(ownerScope).catch(() => []);
      const retained = exactDraft(source, drafts) ?? source;
      commitWorkflow({
        draft: retained,
        failure: classifyMutationFailure(error, onlineRef.current),
        intent,
        phase: "failed",
      });
      return false;
    } finally {
      if (operationRef.current === controller) operationRef.current = null;
    }
  }, [
    commitWorkflow,
    csrfProof,
    effectiveVerifyOwner,
    inspectRecovery,
    language,
    ownerScope,
    queryClient,
    repository,
    scopeIsCurrent,
  ]);

  const submit = useCallback(async (
    intent: TrainingMutationIntent,
  ): Promise<boolean> => {
    if (
      !recoveryReady
      || inspectionFailureRef.current !== null
      || workflowRef.current !== null
    ) return false;
    const scopeEpoch = scopeEpochRef.current;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    commitWorkflow({
      draft: null,
      failure: null,
      intent,
      phase: "persisting",
    });
    let draft: RecoverableDraft;
    try {
      draft = await persistTrainingMutationDraft(
        ownerScope,
        intent,
        repository,
      );
    } catch {
      if (
        scopeIsCurrent(scopeEpoch)
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
      !scopeIsCurrent(scopeEpoch)
      || operationEpochRef.current !== operationEpoch
    ) return false;
    if (!online) {
      publishTrainingDraftChanged(ownerScope);
      commitWorkflow({
        draft,
        failure: pendingFailure(false, language),
        intent,
        phase: "failed",
      });
      return false;
    }
    return runReplay(draft, intent, false, scopeEpoch, operationEpoch);
  }, [
    commitWorkflow,
    language,
    online,
    ownerScope,
    recoveryReady,
    repository,
    runReplay,
    scopeIsCurrent,
  ]);

  const retry = useCallback(async (): Promise<boolean> => {
    const current = workflowRef.current;
    if (current?.phase !== "failed") return false;
    if (!online && current.draft !== null) {
      commitWorkflow({
        ...current,
        failure: pendingFailure(false, language),
      });
      return false;
    }
    if (current.draft === null) {
      commitWorkflow(null);
      return submit(current.intent);
    }
    const scopeEpoch = scopeEpochRef.current;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const drafts = await repository.list(ownerScope).catch(() => []);
    if (
      !scopeIsCurrent(scopeEpoch)
      || operationEpochRef.current !== operationEpoch
    ) return false;
    const source = exactDraft(current.draft, drafts);
    if (source === null) {
      commitWorkflow({
        ...current,
        failure: reconciliationFailure(onlineRef.current, language),
        phase: "failed",
      });
      await inspectRecovery();
      return false;
    }
    if (isRecoverableDraftAttemptActive(source)) {
      commitWorkflow({
        draft: source,
        failure: null,
        intent: recoverTrainingMutationIntent(source),
        phase: "reconciling",
      });
      return false;
    }
    return runReplay(
      source,
      recoverTrainingMutationIntent(source),
      true,
      scopeEpoch,
      operationEpoch,
    );
  }, [
    commitWorkflow,
    inspectRecovery,
    language,
    online,
    ownerScope,
    repository,
    runReplay,
    scopeIsCurrent,
    submit,
  ]);

  const discard = useCallback(async () => {
    const current = workflowRef.current;
    if (current === null) {
      if (inspectionFailureRef.current !== null) await inspectRecovery();
      return;
    }
    const scopeEpoch = scopeEpochRef.current;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const controller = new AbortController();
    operationRef.current?.abort(
      new DOMException("Training operation discarded", "AbortError"),
    );
    operationRef.current = controller;
    commitWorkflow({
      ...current,
      failure: null,
      phase: "reconciling",
    });
    try {
      await processReceipts(controller.signal);
      if (
        !scopeIsCurrent(scopeEpoch)
        || operationEpochRef.current !== operationEpoch
        || controller.signal.aborted
      ) return;
      if (current.draft !== null) {
        const drafts = await repository.list(ownerScope);
        const source = exactDraft(current.draft, drafts);
        if (source !== null && !await removeExactDraft(repository, source, "discard")) {
          throw new Error("TRAINING_DRAFT_DISCARD_FAILED");
        }
      }
      publishTrainingDraftChanged(ownerScope);
      commitWorkflow(null);
      await inspectRecovery();
    } catch {
      if (
        !scopeIsCurrent(scopeEpoch)
        || operationEpochRef.current !== operationEpoch
        || controller.signal.aborted
      ) return;
      commitWorkflow({
        ...current,
        failure: reconciliationFailure(onlineRef.current, language),
        phase: "failed",
      });
    } finally {
      if (operationRef.current === controller) operationRef.current = null;
    }
  }, [
    commitWorkflow,
    inspectRecovery,
    language,
    ownerScope,
    processReceipts,
    repository,
    scopeIsCurrent,
  ]);

  const loadLatest = useCallback(async () => {
    const current = workflowRef.current;
    if (current === null) return;
    const scopeEpoch = scopeEpochRef.current;
    const operationEpoch = operationEpochRef.current + 1;
    operationEpochRef.current = operationEpoch;
    const controller = new AbortController();
    operationRef.current?.abort(
      new DOMException("Loading latest training state", "AbortError"),
    );
    operationRef.current = controller;
    commitWorkflow({
      ...current,
      failure: null,
      phase: "reconciling",
    });
    try {
      await effectiveVerifyOwner(controller.signal);
      await onLoadLatestRef.current(controller.signal);
      abortIfRequested(controller.signal);
      await processReceipts(controller.signal);
      if (
        !scopeIsCurrent(scopeEpoch)
        || operationEpochRef.current !== operationEpoch
      ) return;
      if (current.draft !== null) {
        const drafts = await repository.list(ownerScope);
        const source = exactDraft(current.draft, drafts);
        if (source !== null && !await removeExactDraft(repository, source, "discard")) {
          throw new Error("TRAINING_DRAFT_REPLACEMENT_FAILED");
        }
      }
      publishTrainingDraftChanged(ownerScope);
      commitWorkflow(null);
      await inspectRecovery();
    } catch (error) {
      if (
        controller.signal.aborted
        || !scopeIsCurrent(scopeEpoch)
        || operationEpochRef.current !== operationEpoch
      ) return;
      commitWorkflow({
        ...current,
        failure: classifyMutationFailure(error, onlineRef.current),
        phase: "failed",
      });
    } finally {
      if (operationRef.current === controller) operationRef.current = null;
    }
  }, [
    commitWorkflow,
    effectiveVerifyOwner,
    inspectRecovery,
    ownerScope,
    processReceipts,
    repository,
    scopeIsCurrent,
  ]);

  const canSubmit = (
    recoveryReady
    && inspectionFailure === null
    && workflow === null
  );

  return {
    busy: workflow !== null && workflow.phase !== "failed",
    canSubmit,
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
