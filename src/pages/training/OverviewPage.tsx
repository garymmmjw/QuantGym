import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";

import { DashboardTemplate } from "../../design-system/patterns/DashboardTemplate";
import { DraftStatus } from "../../design-system/patterns/DraftStatus";
import { EmptyState } from "../../design-system/patterns/EmptyState";
import { Metric } from "../../design-system/patterns/Metric";
import { QuantyImage } from "../../design-system/patterns/QuantyImage";
import {
  RecoveryPanel,
  type RecoveryState,
} from "../../design-system/patterns/RecoveryPanel";
import { Button } from "../../design-system/primitives/Button";
import { useCurrentUserQuery } from "../../domains/account/auth/auth.queries";
import {
  useDashboardOverviewQuery,
} from "../../domains/dashboard/dashboard.queries";
import { buildProblemTrainingRoute } from "../../domains/problems/problems.routes";
import { TRAINING_RECONNECT_REPLAYED_EVENT } from "../../domains/training/training.events";
import {
  newStartTrainingIntent,
  useStartTrainingMutation,
  type StartTrainingIntent,
} from "../../domains/training/training.mutations";
import {
  consumeTrainingRecoveryReceipt,
  listTrainingRecoveryReceipts,
  persistTrainingMutationDraft,
  recoverTrainingMutationIntent,
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
import styles from "./OverviewPage.module.css";
import {
  overviewCopyFor,
  selectTrainingRecommendation,
  type OverviewCopy,
  type TrainingRecommendation,
} from "./overview.model";

type NavigateTo = (href: string) => void;

export type OverviewPageSession = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: () => Promise<void>;
}>;

export type OverviewPageProps = Readonly<{
  onNavigate?: NavigateTo;
  session?: OverviewPageSession;
}>;

type StartWorkflow = Readonly<{
  draft: RecoverableDraft | null;
  failure: MutationFailure | null;
  intent: StartTrainingIntent;
  phase: "persisting" | "submitting" | "retrying" | "reconciling" | "failed";
}>;

type StartTrainingRecoveryReceipt = TrainingRecoveryReceipt & Readonly<{
  payload: Extract<
    TrainingRecoveryReceipt["payload"],
    Readonly<{ intentKind: "start" }>
  >;
}>;

type StartReceiptConsumption =
  | Readonly<{ status: "blocked" }>
  | Readonly<{ source: RecoverableDraft; status: "source-active" }>
  | Readonly<{ status: "consumed" }>;

const pendingDraftFailure = (online: boolean): MutationFailure => ({
  code: "TRAINING_START_RECOVERY_PENDING",
  message: online
    ? "本机仍有一项未得到服务器确认的训练启动请求。"
    : "训练启动请求已保留在本机，联网后可以继续。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const draftReconciliationFailure = (online: boolean): MutationFailure => ({
  code: "TRAINING_DRAFT_RECONCILIATION_FAILED",
  message: "暂时无法确认本机训练请求是否已移除，请重试。",
  preserveDraft: true,
  requestId: null,
  retryable: true,
  state: online ? "recoverable-error" : "offline-draft",
});

const classifyRecoveryInspectionFailure = (
  error: unknown,
  online: boolean,
): MutationFailure => {
  const failure = classifyMutationFailure(error, online);
  if (
    failure.state === "permission-denied"
    || failure.state === "offline-draft"
    || failure.state === "recoverable-error"
  ) return failure;
  return draftReconciliationFailure(online);
};

const latestStartDraft = (
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => {
  const matching = drafts
    .filter((draft) => draft.kind === "training.start")
    .sort((left, right) => (
      left.updatedAt.localeCompare(right.updatedAt)
      || left.draftId.localeCompare(right.draftId)
    ));
  return matching[matching.length - 1] ?? null;
};

const orderedStartReceipts = (
  receipts: readonly TrainingRecoveryReceipt[],
): readonly StartTrainingRecoveryReceipt[] => receipts
    .filter((receipt): receipt is StartTrainingRecoveryReceipt => (
      receipt.payload.intentKind === "start"
    ))
    .sort((left, right) => (
      left.draft.updatedAt.localeCompare(right.draft.updatedAt)
      || left.draft.draftId.localeCompare(right.draft.draftId)
    ));

const receiptMatchesSource = (
  receipt: TrainingRecoveryReceipt,
  source: RecoverableDraft,
) => (
  receipt.payload.sourceDraftId === source.draftId
  && receipt.payload.sourceGenerationId === source.generationId
);

const exactStartDraftGeneration = (
  draftId: string,
  generationId: string,
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => drafts.find((draft) => (
  draft.kind === "training.start"
  && draft.draftId === draftId
  && draft.generationId === generationId
)) ?? null;

const RECOVERY_RECONCILIATION_POLL_MS = 750;

const receiptSourceDraft = (
  receipt: TrainingRecoveryReceipt,
  drafts: readonly RecoverableDraft[],
): RecoverableDraft | null => exactStartDraftGeneration(
  receipt.payload.sourceDraftId,
  receipt.payload.sourceGenerationId,
  drafts,
);

const startIntentFromDraft = (draft: RecoverableDraft): StartTrainingIntent => {
  const recovered = recoverTrainingMutationIntent(draft);
  if (recovered.kind !== "start") {
    throw new Error("TRAINING_START_DRAFT_KIND_INVALID");
  }
  return recovered;
};

type TrainingStartRecoveryProps = Readonly<{
  busy?: boolean;
  className?: string;
  language: AppLanguage;
  onReload?: () => void;
  onRetry?: () => void;
  onReturn?: () => void;
  onSignIn?: () => void;
  requestId?: string | null;
  state: RecoveryState;
}>;

export function TrainingStartRecovery({
  busy = false,
  className,
  language,
  onReload,
  onRetry,
  onReturn,
  onSignIn,
  requestId,
  state,
}: TrainingStartRecoveryProps) {
  const copy = overviewCopyFor(language);
  const presentation = copy.recovery[state];
  return (
    <RecoveryPanel
      actionLabel={presentation.action}
      busy={busy}
      busyLabel={presentation.action}
      message={presentation.message}
      referenceLabel={copy.requestId}
      requestId={requestId ?? null}
      state={state}
      title={presentation.title}
      {...(className === undefined ? {} : { className })}
      {...(onReload === undefined ? {} : { onReload })}
      {...(onRetry === undefined ? {} : { onRetry })}
      {...(onReturn === undefined ? {} : { onReturn })}
      {...(onSignIn === undefined ? {} : { onSignIn })}
    />
  );
}

const safeCsrfProof = (): string | null => {
  try {
    return readCsrfToken();
  } catch {
    return null;
  }
};

const formatActivityDate = (
  value: string,
  language: AppLanguage,
): string => new Intl.DateTimeFormat(language, {
  day: "numeric",
  month: "short",
}).format(new Date(value));

const RecommendationHero = ({
  copy,
  onStart,
  recoveryReady,
  recommendation,
  workflow,
}: Readonly<{
  copy: OverviewCopy;
  onStart: () => void;
  recoveryReady: boolean;
  recommendation: TrainingRecommendation;
  workflow: StartWorkflow | null;
}>) => {
  const isPersisting = workflow?.phase === "persisting";
  const isSubmitting = workflow?.phase === "submitting";
  const isBusy = isPersisting || isSubmitting;
  return (
    <article className={styles.heroCard} data-training-recommendation={recommendation.eyebrow}>
      <div className={styles.heroCopy}>
        <p className={styles.heroEyebrow}>
          {recommendation.eyebrow === "task"
            ? copy.recommendationTask
            : copy.recommendationWeakness}
        </p>
        <h2 className={styles.heroTitle}>{recommendation.title}</h2>
        <p className={styles.heroReason}>
          {recommendation.eyebrow === "weakness" && recommendation.score !== null
            ? copy.recommendationScore(recommendation.score)
            : recommendation.reason}
        </p>
        <ul className={styles.heroMeta}>
          {recommendation.rewardXp === null ? null : (
            <li className={styles.heroMetaItem}>
              <strong>+{recommendation.rewardXp} XP</strong>
            </li>
          )}
          {recommendation.eyebrow === "weakness" ? (
            <li className={styles.heroMetaItem}>{recommendation.reason}</li>
          ) : null}
        </ul>
        <div className={styles.heroAction}>
          <Button
            disabled={!recoveryReady}
            isLoading={isBusy}
            loadingLabel={isPersisting ? copy.startSavingTitle : copy.startQueuedTitle}
            onClick={onStart}
            size="large"
          >
            {copy.cta}
          </Button>
        </div>
        {isPersisting ? (
          <DraftStatus
            className={styles.draftStatus ?? ""}
            message={copy.startSaving}
            state="saving"
            title={copy.startSavingTitle}
          />
        ) : null}
        {isSubmitting ? (
          <DraftStatus
            className={styles.draftStatus ?? ""}
            message={copy.startQueued}
            state="queued"
            title={copy.startQueuedTitle}
          />
        ) : null}
      </div>
      <QuantyImage
        alt=""
        asset={recommendation.eyebrow === "task" ? "teacher" : "focused"}
        className={styles.heroMascot}
        priority
        prominence="primary"
        size="hero"
      />
    </article>
  );
};

const OverviewMetrics = ({
  copy,
  overview,
}: Readonly<{
  copy: OverviewCopy;
  overview: NonNullable<ReturnType<typeof useDashboardOverviewQuery>["data"]>;
}>) => {
  const progress = overview.planProgress;
  return (
    <>
      <Metric
        detail={copy.metricLevelDetail}
        label={copy.metricLevel}
        prefix="LV"
        tone="neutral"
        value={`Lv.${overview.profile.level}`}
      />
      <Metric
        detail={copy.metricWeeklyXpDetail}
        label={copy.metricWeeklyXp}
        prefix="XP"
        tone="reward"
        value={overview.profile.weeklyXp}
      />
      <Metric
        detail={copy.metricStreakDetail}
        label={copy.metricStreak}
        prefix="7D"
        tone={overview.profile.streakDays > 0 ? "positive" : "neutral"}
        value={`${overview.profile.streakDays}`}
        trend={copy.metricStreak}
      />
      <Metric
        detail={progress === null
          ? copy.metricPlanEmpty
          : copy.metricPlanProgress(progress.completedTasks, progress.totalTasks)}
        label={copy.metricPlan}
        prefix="✓"
        tone="neutral"
        value={progress === null
          ? "—"
          : `${progress.completedTasks}/${progress.totalTasks}`}
      />
    </>
  );
};

function OverviewSessionPage({
  onNavigate,
  session,
}: Readonly<{
  onNavigate: NavigateTo | undefined;
  session: OverviewPageSession;
}>) {
  const routerNavigate = useNavigate();
  const { csrfProof, ownerScope, verifyOwner } = session;
  const navigate = useCallback<NavigateTo>((href) => {
    if (onNavigate === undefined) routerNavigate(href);
    else onNavigate(href);
  }, [onNavigate, routerNavigate]);
  const { language } = useI18n();
  const copy = overviewCopyFor(language);
  const online = useOnlineStatus();
  const onlineRef = useRef(online);
  const overview = useDashboardOverviewQuery(ownerScope);
  const startMutation = useStartTrainingMutation({
    csrfProof,
    ownerScope,
    ...(verifyOwner === undefined ? {} : { verifyOwner }),
  });
  const [workflow, setWorkflow] = useState<StartWorkflow | null>(null);
  const [recoveryBusy, setRecoveryBusy] = useState(false);
  const [recoveryReady, setRecoveryReady] = useState(false);
  const [recoveryInspectionBusy, setRecoveryInspectionBusy] = useState(false);
  const [recoveryInspectionFailure, setRecoveryInspectionFailure] = (
    useState<MutationFailure | null>(null)
  );
  const [recoveryInspectionRequest, setRecoveryInspectionRequest] = useState(0);
  const recoveryRevisionRef = useRef(0);
  const recoveryInspectionInFlightRef = useRef(false);
  const recoveryInspectionPendingRef = useRef(false);
  const recoveryOperationInFlightRef = useRef(false);
  const recommendation = overview.data === undefined
    ? null
    : selectTrainingRecommendation(overview.data);
  const verifyRecoveryOwner = useCallback(async () => {
    if (verifyOwner === undefined) {
      await verifyCurrentSessionOwner(ownerScope);
      return;
    }
    await verifyOwner();
  }, [ownerScope, verifyOwner]);

  useEffect(() => {
    onlineRef.current = online;
  }, [online]);

  const consumeStartReceipt = useCallback(async (
    receipt: TrainingRecoveryReceipt,
  ): Promise<StartReceiptConsumption> => {
    await verifyRecoveryOwner();
    let source = receiptSourceDraft(
      receipt,
      await recoverableDraftRepository.list(ownerScope),
    );
    for (let pass = 0; source !== null && pass < 2; pass += 1) {
      if (
        isRecoverableDraftAttemptActive(source)
        && !trainingRecoveryReceiptMatchesSourceAttempt(receipt, source)
      ) {
        return { source, status: "source-active" };
      }
      const sourceAcknowledged = await recoverableDraftRepository.acknowledge(source);
      if (sourceAcknowledged) source = null;
      else {
        source = receiptSourceDraft(
          receipt,
          await recoverableDraftRepository.list(ownerScope),
        );
      }
    }
    if (source !== null) {
      return isRecoverableDraftAttemptActive(source)
        ? { source, status: "source-active" }
        : { status: "blocked" };
    }
    if (await consumeTrainingRecoveryReceipt(ownerScope, receipt)) {
      return { status: "consumed" };
    }
    const receiptStillExists = orderedStartReceipts(
      await listTrainingRecoveryReceipts(ownerScope),
    ).some(({ draft }) => draft.draftId === receipt.draft.draftId);
    return { status: receiptStillExists ? "blocked" : "consumed" };
  }, [ownerScope, verifyRecoveryOwner]);

  const requestRecoveryInspection = useCallback(() => {
    if (recoveryInspectionInFlightRef.current) {
      recoveryInspectionPendingRef.current = true;
      return;
    }
    setRecoveryReady(false);
    setRecoveryInspectionRequest((request) => request + 1);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.addEventListener(
      TRAINING_RECONNECT_REPLAYED_EVENT,
      requestRecoveryInspection,
    );
    return () => window.removeEventListener(
      TRAINING_RECONNECT_REPLAYED_EVENT,
      requestRecoveryInspection,
    );
  }, [requestRecoveryInspection]);

  useEffect(() => {
    if (
      typeof window === "undefined"
      || workflow?.phase !== "reconciling"
    ) return undefined;
    const poll = window.setInterval(
      requestRecoveryInspection,
      RECOVERY_RECONCILIATION_POLL_MS,
    );
    return () => window.clearInterval(poll);
  }, [requestRecoveryInspection, workflow?.phase]);

  useEffect(() => {
    let active = true;
    let inspectionCompleted = false;
    const revision = recoveryRevisionRef.current;
    const inspectionIsCurrent = () => (
      active && recoveryRevisionRef.current === revision
    );

    const inspectDurableRecovery = async () => {
      recoveryInspectionInFlightRef.current = true;
      setRecoveryInspectionBusy(true);
      try {
        const receipts = await listTrainingRecoveryReceipts(ownerScope);
        if (!inspectionIsCurrent()) return;
        const startReceipts = orderedStartReceipts(receipts);
        const receipt = startReceipts[startReceipts.length - 1] ?? null;
        if (receipt !== null) {
          for (const candidate of startReceipts) {
            const result = await consumeStartReceipt(candidate);
            if (result.status === "source-active") {
              setWorkflow({
                draft: result.source,
                failure: null,
                intent: startIntentFromDraft(result.source),
                phase: "reconciling",
              });
              inspectionCompleted = true;
              setRecoveryInspectionFailure(null);
              return;
            }
            if (result.status === "blocked") {
              throw new Error("TRAINING_START_RECEIPT_RECONCILIATION_FAILED");
            }
            if (!inspectionIsCurrent()) return;
          }
          inspectionCompleted = true;
          setRecoveryInspectionFailure(null);
          navigate(buildProblemTrainingRoute({
            problemId: receipt.payload.response.problemId,
            sessionId: receipt.payload.response.sessionId,
          }));
          return;
        }

        const draft = latestStartDraft(
          await recoverableDraftRepository.list(ownerScope),
        );
        if (!inspectionIsCurrent()) return;
        if (draft === null) {
          const confirmationReceipts = orderedStartReceipts(
            await listTrainingRecoveryReceipts(ownerScope),
          );
          if (!inspectionIsCurrent()) return;
          if (confirmationReceipts.length > 0) {
            recoveryInspectionPendingRef.current = true;
            setRecoveryInspectionFailure(null);
            return;
          }
          setWorkflow((current) => (
            current?.phase === "reconciling" ? null : current
          ));
          inspectionCompleted = true;
          setRecoveryInspectionFailure(null);
          return;
        }
        const intent = startIntentFromDraft(draft);
        setWorkflow((current) => (
          current === null || current.phase === "reconciling"
            ? isRecoverableDraftAttemptActive(draft)
              ? {
                  draft,
                  failure: null,
                  intent,
                  phase: "reconciling",
                }
              : {
                  draft,
                  failure: pendingDraftFailure(onlineRef.current),
                  intent,
                  phase: "failed",
                }
            : current
        ));
        inspectionCompleted = true;
        setRecoveryInspectionFailure(null);
      } catch (error) {
        if (inspectionIsCurrent()) {
          setRecoveryInspectionFailure(
            classifyRecoveryInspectionFailure(error, onlineRef.current),
          );
        }
      } finally {
        recoveryInspectionInFlightRef.current = false;
        if (inspectionIsCurrent()) {
          setRecoveryInspectionBusy(false);
          if (recoveryInspectionPendingRef.current) {
            recoveryInspectionPendingRef.current = false;
            setRecoveryReady(false);
            setRecoveryInspectionRequest((request) => request + 1);
          } else if (inspectionCompleted) setRecoveryReady(true);
        } else if (!active) {
          recoveryInspectionPendingRef.current = false;
        }
      }
    };

    void inspectDurableRecovery();
    return () => {
      active = false;
    };
  }, [consumeStartReceipt, navigate, ownerScope, recoveryInspectionRequest]);

  const reconcileAcknowledgedStart = async (
    draft: RecoverableDraft,
    intent: StartTrainingIntent,
  ): Promise<boolean> => {
    let sourceAcknowledged = false;
    try {
      sourceAcknowledged = await recoverableDraftRepository.acknowledge(draft);
    } catch {
      // Inspect the durable receipt and exact source before deciding whether
      // this success can be handed off without creating a future duplicate.
    }

    try {
      const consumeMatchingReceipts = async () => {
        const matchingReceipts = orderedStartReceipts(
          await listTrainingRecoveryReceipts(ownerScope),
        ).filter((receipt) => receiptMatchesSource(receipt, draft));
        for (const receipt of matchingReceipts) {
          const result = await consumeStartReceipt(receipt);
          if (result.status !== "consumed") return result;
        }
        return { status: "consumed" } as const;
      };

      const initialReceiptResult = await consumeMatchingReceipts();
      if (initialReceiptResult.status === "source-active") {
        setWorkflow({
          draft: initialReceiptResult.source,
          failure: null,
          intent: startIntentFromDraft(initialReceiptResult.source),
          phase: "reconciling",
        });
        return false;
      }
      if (initialReceiptResult.status === "blocked") {
        throw new Error("TRAINING_START_RECEIPT_RECONCILIATION_FAILED");
      }
      if (sourceAcknowledged) return true;

      for (let pass = 0; pass < 2; pass += 1) {
        const exactSource = exactStartDraftGeneration(
          draft.draftId,
          draft.generationId,
          await recoverableDraftRepository.list(ownerScope),
        );
        if (exactSource === null) return true;
        if (isRecoverableDraftAttemptActive(exactSource)) {
          setWorkflow({
            draft: exactSource,
            failure: null,
            intent: startIntentFromDraft(exactSource),
            phase: "reconciling",
          });
          return false;
        }
        if (await recoverableDraftRepository.acknowledge(exactSource)) {
          const finalReceiptResult = await consumeMatchingReceipts();
          if (finalReceiptResult.status === "source-active") {
            setWorkflow({
              draft: finalReceiptResult.source,
              failure: null,
              intent: startIntentFromDraft(finalReceiptResult.source),
              phase: "reconciling",
            });
            return false;
          }
          if (finalReceiptResult.status === "blocked") {
            throw new Error("TRAINING_START_RECEIPT_RECONCILIATION_FAILED");
          }
          return true;
        }
      }
    } catch {
      // The recovery below keeps the exact idempotency key available.
    }

    setWorkflow({
      draft,
      failure: draftReconciliationFailure(onlineRef.current),
      intent,
      phase: "failed",
    });
    return false;
  };

  const submitPersistedIntent = async (
    intent: StartTrainingIntent,
    draft: RecoverableDraft,
    retrying: boolean,
  ) => {
    setWorkflow({
      draft,
      failure: null,
      intent,
      phase: retrying ? "retrying" : "submitting",
    });

    let response;
    try {
      response = await startMutation.mutateAsync(intent);
    } catch (error) {
      setWorkflow({
        draft,
        failure: classifyMutationFailure(error, online),
        intent,
        phase: "failed",
      });
      return;
    }

    if (!await reconcileAcknowledgedStart(draft, intent)) return;
    navigate(buildProblemTrainingRoute({
      problemId: response.problemId,
      sessionId: response.sessionId,
    }));
  };

  const persistAndSubmit = async (
    intent: StartTrainingIntent,
    retrying: boolean,
  ) => {
    setWorkflow({
      draft: null,
      failure: null,
      intent,
      phase: retrying ? "retrying" : "persisting",
    });
    let draft: RecoverableDraft;
    try {
      draft = await persistTrainingMutationDraft(ownerScope, intent);
    } catch {
      setWorkflow({
        draft: null,
        failure: {
          code: "DRAFT_STORAGE_UNAVAILABLE",
          message: copy.recovery["recoverable-error"].message,
          preserveDraft: false,
          requestId: null,
          retryable: true,
          state: "recoverable-error",
        },
        intent,
        phase: "failed",
      });
      return;
    }
    await submitPersistedIntent(intent, draft, retrying);
  };

  const startRecommendation = () => {
    if (!recoveryReady || recommendation === null || workflow !== null) return;
    const intent = newStartTrainingIntent({
      ...(recommendation.planTaskId === null
        ? {}
        : { planTaskId: recommendation.planTaskId }),
      problemId: recommendation.problemId,
    });
    void persistAndSubmit(intent, false);
  };

  const retryStart = () => {
    if (workflow?.phase !== "failed") return;
    const failedWorkflow = workflow;
    if (failedWorkflow.draft === null) {
      void persistAndSubmit(failedWorkflow.intent, true);
      return;
    }
    const sourceDraft = failedWorkflow.draft;
    setWorkflow({
      ...failedWorkflow,
      failure: null,
      phase: "reconciling",
    });
    void (async () => {
      try {
        const exactSource = exactStartDraftGeneration(
          sourceDraft.draftId,
          sourceDraft.generationId,
          await recoverableDraftRepository.list(ownerScope),
        );
        if (exactSource === null) {
          requestRecoveryInspection();
          return;
        }
        if (isRecoverableDraftAttemptActive(exactSource)) {
          setWorkflow({
            draft: exactSource,
            failure: null,
            intent: startIntentFromDraft(exactSource),
            phase: "reconciling",
          });
          return;
        }
        await submitPersistedIntent(
          startIntentFromDraft(exactSource),
          exactSource,
          true,
        );
      } catch {
        setWorkflow({
          ...failedWorkflow,
          failure: draftReconciliationFailure(onlineRef.current),
          phase: "failed",
        });
      }
    })();
  };

  const reconcileFailedDraft = async (
    failedWorkflow: StartWorkflow,
    clearWhenMissing: boolean,
  ) => {
    try {
      if (failedWorkflow.draft !== null) {
        const sourceDraft = failedWorkflow.draft;
        const matchingReceipts = orderedStartReceipts(
          await listTrainingRecoveryReceipts(ownerScope),
        ).filter((receipt) => receiptMatchesSource(receipt, sourceDraft));
        const latestReceipt = matchingReceipts[matchingReceipts.length - 1] ?? null;
        if (latestReceipt !== null) {
          for (const receipt of matchingReceipts) {
            const result = await consumeStartReceipt(receipt);
            if (result.status === "source-active") {
              setWorkflow({
                draft: result.source,
                failure: null,
                intent: startIntentFromDraft(result.source),
                phase: "reconciling",
              });
              return;
            }
            if (result.status === "blocked") {
              setWorkflow({
                ...failedWorkflow,
                failure: draftReconciliationFailure(online),
              });
              return;
            }
          }
          navigate(buildProblemTrainingRoute({
            problemId: latestReceipt.payload.response.problemId,
            sessionId: latestReceipt.payload.response.sessionId,
          }));
          return;
        }
      }
      const replacement = latestStartDraft(
        await recoverableDraftRepository.list(ownerScope),
      );
      if (replacement === null) {
        if (clearWhenMissing) setWorkflow(null);
        else {
          setWorkflow({
            ...failedWorkflow,
            failure: draftReconciliationFailure(online),
          });
        }
        return;
      }
      const replacementIsActive = isRecoverableDraftAttemptActive(replacement);
      setWorkflow({
        draft: replacement,
        failure: replacementIsActive ? null : pendingDraftFailure(online),
        intent: startIntentFromDraft(replacement),
        phase: replacementIsActive ? "reconciling" : "failed",
      });
    } catch {
      setWorkflow({
        ...failedWorkflow,
        failure: draftReconciliationFailure(online),
      });
    }
  };

  const discardFailedRequest = async (reload: boolean) => {
    if (
      workflow?.phase !== "failed"
      || recoveryOperationInFlightRef.current
    ) return;
    const failedWorkflow = workflow;
    recoveryRevisionRef.current += 1;
    recoveryOperationInFlightRef.current = true;
    setRecoveryBusy(true);
    try {
      if (reload) {
        let result;
        try {
          result = await overview.refetch();
        } catch (error) {
          setWorkflow({
            ...failedWorkflow,
            failure: classifyMutationFailure(error, online),
          });
          return;
        }
        if (result.isError) {
          setWorkflow({
            ...failedWorkflow,
            failure: classifyMutationFailure(result.error, online),
          });
          return;
        }
      }
      if (failedWorkflow.draft !== null) {
        let discarded: boolean;
        try {
          discarded = await recoverableDraftRepository.discard(
            failedWorkflow.draft,
          );
        } catch {
          await reconcileFailedDraft(failedWorkflow, false);
          return;
        }
        if (!discarded) {
          await reconcileFailedDraft(failedWorkflow, true);
          return;
        }
        await reconcileFailedDraft(failedWorkflow, true);
        return;
      }
      setWorkflow(null);
    } finally {
      recoveryOperationInFlightRef.current = false;
      setRecoveryBusy(false);
    }
  };

  if (overview.isPending && overview.data === undefined) {
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

  if (overview.isError && overview.data === undefined) {
    const queryFailure = classifyMutationFailure(overview.error, online);
    return (
      <DashboardTemplate
        className={styles.page ?? ""}
        description={copy.queryErrorDescription}
        eyebrow={copy.pageEyebrow}
        title={copy.queryErrorTitle}
      >
        <RecoveryPanel
          actionLabel={copy.queryErrorAction}
          busy={overview.isFetching}
          busyLabel={copy.queryErrorAction}
          className={styles.recovery ?? ""}
          message={copy.queryErrorDescription}
          onReload={() => void overview.refetch()}
          onRetry={() => void overview.refetch()}
          onReturn={() => void overview.refetch()}
          onSignIn={() => navigate("/login?reauth=1&redirect=%2F")}
          referenceLabel={copy.requestId}
          requestId={queryFailure.requestId}
          state={queryFailure.state}
          title={copy.queryErrorTitle}
        />
      </DashboardTemplate>
    );
  }

  if (overview.data === undefined) return null;

  const recoveryState = recoveryInspectionFailure?.state
    ?? (workflow?.phase === "failed"
      ? workflow.failure?.state ?? "recoverable-error"
      : workflow?.phase === "retrying" || workflow?.phase === "reconciling"
        ? "retry"
        : null);
  const recoveryRequestId = recoveryInspectionFailure?.requestId
    ?? workflow?.failure?.requestId
    ?? null;
  const weakness = overview.data.weakness;
  const recentXp = overview.data.recentXp.slice(0, 4);

  return (
    <DashboardTemplate
      aside={weakness === null ? undefined : (
        <section aria-labelledby="overview-focus-title" className={styles.focusCard}>
          <div className={styles.focusHeading}>
            <p className={styles.focusLabel}>{copy.focusLabel}</p>
            <h2 className={styles.focusTitle} id="overview-focus-title">{weakness.label}</h2>
          </div>
          <strong className={styles.focusScore} data-qg-metric>{weakness.score}</strong>
          <p className={styles.focusDescription}>{copy.focusDescription}</p>
        </section>
      )}
      asideLabel={copy.focusLabel}
      className={styles.page ?? ""}
      description={copy.pageDescription}
      eyebrow={copy.pageEyebrow}
      hero={recoveryState === null
        ? recommendation === null
          ? (
              <EmptyState
                description={copy.emptyDescription}
                mascot="search"
                mascotAlt={copy.emptyMascotAlt}
                title={copy.emptyTitle}
              />
            )
          : (
              <RecommendationHero
                copy={copy}
                onStart={startRecommendation}
                recoveryReady={recoveryReady}
                recommendation={recommendation}
                workflow={workflow}
              />
            )
        : (
            <TrainingStartRecovery
              busy={
                workflow?.phase === "retrying"
                || workflow?.phase === "reconciling"
                || recoveryBusy
                || recoveryInspectionBusy
              }
              className={styles.recovery ?? ""}
              language={language}
              onReload={recoveryInspectionFailure === null
                ? () => void discardFailedRequest(true)
                : requestRecoveryInspection}
              onRetry={recoveryInspectionFailure === null
                ? retryStart
                : requestRecoveryInspection}
              onReturn={recoveryInspectionFailure === null
                ? () => void discardFailedRequest(false)
                : requestRecoveryInspection}
              onSignIn={() => navigate("/login?reauth=1&redirect=%2F")}
              requestId={recoveryRequestId}
              state={recoveryState}
            />
          )}
      metrics={<OverviewMetrics copy={copy} overview={overview.data} />}
      metricsLabel={copy.pageEyebrow}
      title={copy.pageTitle(overview.data.profile.displayName)}
    >
      <section aria-labelledby="overview-activity-title" className={styles.activity}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle} id="overview-activity-title">{copy.activityTitle}</h2>
          <span className={styles.sectionMeta}>{copy.activityCount(recentXp.length)}</span>
        </div>
        {recentXp.length === 0 ? (
          <p className={styles.emptyActivity}>{copy.activityEmpty}</p>
        ) : (
          <ul className={styles.activityList}>
            {recentXp.map((entry) => (
              <li className={styles.activityItem} key={entry.id}>
                <span className={styles.activitySkill}>{entry.skillKey}</span>
                <time className={styles.activityDate} dateTime={entry.occurredAt}>
                  {formatActivityDate(entry.occurredAt, language)}
                </time>
                <strong className={styles.activityXp}>+{entry.amount} XP</strong>
              </li>
            ))}
          </ul>
        )}
      </section>
    </DashboardTemplate>
  );
}

function OverviewPageFromSession({
  onNavigate,
}: Readonly<{ onNavigate: NavigateTo | undefined }>) {
  const currentUser = useCurrentUserQuery();
  const session = useMemo<OverviewPageSession | null>(() => {
    if (currentUser.data === null || currentUser.data === undefined) return null;
    return {
      csrfProof: safeCsrfProof(),
      ownerScope: createAccountScope(currentUser.data.email),
    };
  }, [currentUser.data]);

  if (session === null) {
    return (
      <DashboardTemplate
        status="loading"
        title="正在确认训练账号"
      >
        <div />
      </DashboardTemplate>
    );
  }
  return <OverviewSessionPage onNavigate={onNavigate} session={session} />;
}

export function OverviewPage({
  onNavigate,
  session,
}: OverviewPageProps) {
  return session === undefined
    ? <OverviewPageFromSession onNavigate={onNavigate} />
    : <OverviewSessionPage onNavigate={onNavigate} session={session} />;
}

export default OverviewPage;
