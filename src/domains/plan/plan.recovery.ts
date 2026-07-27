import type { QueryClient } from "@tanstack/react-query";

import { ApiError } from "../../shared/api/errors";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../shared/api/ownerScopedQueries";
import {
  createRecoverableDraft,
  recoverableDraftRepository,
  registerDraftReconnectReplay,
  replayRecoverableDrafts,
  type DraftReplayReport,
  type RecoverableDraft,
  type RecoverableDraftRepository,
} from "../../shared/storage/drafts";
import {
  acknowledgePlanTaskMutation,
  completePlanTask,
  createPlan,
  invalidatePlanReadModels,
  runPlanDiagnostic,
  updatePlanTask,
  type CompletePlanTaskIntent,
  type PlanMutationIntent,
  type UpdatePlanTaskIntent,
} from "./plan.mutations";
import { getCurrentPlan, planQueryKeys } from "./plan.queries";
import {
  completePlanTaskRequestSchema,
  createPlanRequestSchema,
  runPlanDiagnosticRequestSchema,
  updatePlanTaskRequestSchema,
  type CurrentPlanResponse,
  type OfficialPlanTask,
} from "./plan.schema";

export const PLAN_DRAFT_KINDS = [
  "plan.create",
  "plan.diagnostic",
  "plan.task-update",
  "plan.task-complete",
] as const;

export const createPlanMutationDraft = (
  ownerScope: string,
  intent: PlanMutationIntent,
  updatedAt?: string,
): RecoverableDraft => {
  const common = {
    kind: `plan.${intent.kind}`,
    ownerScope,
    payload: intent.request,
    resourceId: "taskId" in intent ? intent.taskId : "current",
    serverVersion: "planVersion" in intent.request
      ? intent.request.planVersion
      : null,
    ...(updatedAt === undefined ? {} : { updatedAt }),
  } as const;
  switch (intent.kind) {
    case "create":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.create",
      });
    case "diagnostic":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.diagnostic",
      });
    case "update-task":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.task-update",
      });
    case "complete-task":
      return createRecoverableDraft({
        ...common,
        idempotencyKey: intent.idempotencyKey,
        kind: "plan.task-complete",
      });
  }
};

export const recoverPlanMutationIntent = (
  draft: RecoverableDraft,
): PlanMutationIntent => {
  switch (draft.kind) {
    case "plan.create":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "create",
        request: createPlanRequestSchema.parse(draft.payload),
      };
    case "plan.diagnostic":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "diagnostic",
        request: runPlanDiagnosticRequestSchema.parse(draft.payload),
      };
    case "plan.task-update":
      {
        const request = updatePlanTaskRequestSchema.parse(draft.payload);
        return {
          idempotencyKey: draft.idempotencyKey,
          kind: "update-task",
          request: {
            ...(request.detail === undefined ? {} : { detail: request.detail }),
            ...(request.estimatedMinutes === undefined
              ? {}
              : { estimatedMinutes: request.estimatedMinutes }),
            planVersion: request.planVersion,
            ...(request.scheduledFor === undefined
              ? {}
              : { scheduledFor: request.scheduledFor }),
            ...(request.sortOrder === undefined ? {} : { sortOrder: request.sortOrder }),
            taskVersion: request.taskVersion,
            ...(request.title === undefined ? {} : { title: request.title }),
          },
          taskId: draft.resourceId,
        };
      }
    case "plan.task-complete":
      return {
        idempotencyKey: draft.idempotencyKey,
        kind: "complete-task",
        request: completePlanTaskRequestSchema.parse(draft.payload),
        taskId: draft.resourceId,
      };
    default:
      throw new Error("PLAN_DRAFT_KIND_INVALID");
  }
};

export const persistPlanMutationDraft = async (
  ownerScope: string,
  intent: PlanMutationIntent,
  repository: RecoverableDraftRepository = recoverableDraftRepository,
): Promise<RecoverableDraft> => {
  const draft = createPlanMutationDraft(ownerScope, intent);
  await repository.put(draft);
  return draft;
};

const currentTaskFor = (
  current: CurrentPlanResponse,
  intent: UpdatePlanTaskIntent | CompletePlanTaskIntent,
): OfficialPlanTask | null => {
  const plan = current.plan;
  if (plan === null) return null;
  return plan.tasks.find(({ id, planId }) => (
    id === intent.taskId && planId === plan.id
  )) ?? null;
};

const updateIntentIsSatisfied = (
  task: OfficialPlanTask,
  intent: UpdatePlanTaskIntent,
) => {
  const request = intent.request;
  return (
    (!Object.hasOwn(request, "detail") || task.detail === request.detail)
    && (
      !Object.hasOwn(request, "estimatedMinutes")
      || task.estimatedMinutes === request.estimatedMinutes
    )
    && (
      !Object.hasOwn(request, "scheduledFor")
      || task.scheduledFor === request.scheduledFor
    )
    && (!Object.hasOwn(request, "sortOrder") || task.sortOrder === request.sortOrder)
    && (!Object.hasOwn(request, "title") || task.title === request.title)
  );
};

export const planTaskIntentIsSatisfied = (
  current: CurrentPlanResponse,
  intent: UpdatePlanTaskIntent | CompletePlanTaskIntent,
): boolean => {
  const task = currentTaskFor(current, intent);
  if (task === null) return false;
  return intent.kind === "complete-task"
    ? task.status === "completed"
    : updateIntentIsSatisfied(task, intent);
};

export type ReplayPlanDraftsOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  queryClient: QueryClient;
  repository?: RecoverableDraftRepository;
  signal?: AbortSignal;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

const planReplayOptions = (options: ReplayPlanDraftsOptions) => {
  const verifyOwner = options.verifyOwner
    ?? ((signal?: AbortSignal) => (
      verifyCurrentSessionOwner(options.ownerScope, signal)
    ));
  return {
    kinds: PLAN_DRAFT_KINDS,
    ownerScope: options.ownerScope,
    replay: async (draft: RecoverableDraft, signal?: AbortSignal) => {
      const intent = recoverPlanMutationIntent(draft);
      try {
        const acknowledged = await runOwnerVerifiedOperation(
          verifyOwner,
          async (operationSignal) => {
            switch (intent.kind) {
              case "create":
                await createPlan(intent, options.csrfProof, operationSignal);
                return null;
              case "diagnostic":
                await runPlanDiagnostic(intent, options.csrfProof, operationSignal);
                return null;
              case "update-task":
                return updatePlanTask(intent, options.csrfProof, operationSignal);
              case "complete-task":
                return completePlanTask(intent, options.csrfProof, operationSignal);
            }
          },
          signal,
        );
        if (acknowledged !== null) {
          acknowledgePlanTaskMutation(
            options.queryClient,
            options.ownerScope,
            intent as UpdatePlanTaskIntent | CompletePlanTaskIntent,
            acknowledged,
          );
        }
        await invalidatePlanReadModels(options.queryClient, options.ownerScope);
        return { acknowledged: true };
      } catch (error) {
        if (
          !(error instanceof ApiError)
          || error.status !== 409
          || error.retryable
          || (intent.kind !== "update-task" && intent.kind !== "complete-task")
        ) {
          throw error;
        }
        const current = await runOwnerVerifiedOperation(
          verifyOwner,
          (operationSignal) => getCurrentPlan(operationSignal),
          signal,
        );
        options.queryClient.setQueryData(
          planQueryKeys.current(options.ownerScope),
          current,
        );
        const acknowledged = planTaskIntentIsSatisfied(current, intent);
        await invalidatePlanReadModels(options.queryClient, options.ownerScope);
        return {
          acknowledged,
          ...(acknowledged ? {} : {
            failure: {
              code: error.code,
              requestId: error.requestId,
              retryable: false,
              state: "stale-version-conflict" as const,
            },
          }),
        };
      }
    },
    ...(options.repository === undefined ? {} : { repository: options.repository }),
    ...(options.signal === undefined ? {} : { signal: options.signal }),
  };
};

export const replayPlanMutationDrafts = (
  options: ReplayPlanDraftsOptions,
): Promise<DraftReplayReport> => replayRecoverableDrafts(planReplayOptions(options));

export const registerPlanDraftReconnectReplay = (
  options: ReplayPlanDraftsOptions & Readonly<{
    onError?: (error: unknown) => void;
    onReport?: (report: DraftReplayReport) => void;
    target?: Pick<EventTarget, "addEventListener" | "removeEventListener">;
  }>,
) => registerDraftReconnectReplay({
  ...planReplayOptions(options),
  ...(options.onError === undefined ? {} : { onError: options.onError }),
  ...(options.onReport === undefined ? {} : { onReport: options.onReport }),
  ...(options.target === undefined ? {} : { target: options.target }),
});
