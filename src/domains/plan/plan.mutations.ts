import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "../../shared/api/client";
import { createIdempotencyKey } from "../../shared/api/mutationRecovery";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../shared/api/ownerScopedQueries";
import { dashboardQueryKeys } from "../dashboard/dashboard.queries";
import {
  completePlanTaskRequestSchema,
  createPlanRequestSchema,
  planCreationResponseSchema,
  planDiagnosticResponseSchema,
  planTaskMutationResponseSchema,
  runPlanDiagnosticRequestSchema,
  updatePlanTaskRequestSchema,
  type CreatePlanRequest,
  type CurrentPlanResponse,
  type DiagnosticAnswerRequest,
  type OfficialPlan,
  type OfficialPlanTask,
  type PlanCreationResponse,
  type PlanDiagnosticResponse,
  type PlanTaskMutationResponse,
} from "./plan.schema";
import { planQueryKeys } from "./plan.queries";

const resourceIdSchema = z.string().uuid();
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._~-]{16,128}$/);

type StableMutationIntent = Readonly<{
  idempotencyKey: string;
}>;

export type CreatePlanIntent = StableMutationIntent & Readonly<{
  kind: "create";
  request: CreatePlanRequest;
}>;

export type RunPlanDiagnosticIntent = StableMutationIntent & Readonly<{
  kind: "diagnostic";
  request: {
    answers: DiagnosticAnswerRequest[];
    definitionVersion: "baseline-v1";
    planVersion: number;
  };
}>;

export type PlanTaskChanges = Readonly<{
  detail?: string | null;
  estimatedMinutes?: number | null;
  scheduledFor?: string | null;
  sortOrder?: number;
  title?: string;
}>;

export type UpdatePlanTaskIntent = StableMutationIntent & Readonly<{
  kind: "update-task";
  request: PlanTaskChanges & {
    planVersion: number;
    taskVersion: number;
  };
  taskId: string;
}>;

export type CompletePlanTaskIntent = StableMutationIntent & Readonly<{
  kind: "complete-task";
  request: {
    planVersion: number;
    taskVersion: number;
  };
  taskId: string;
}>;

export type PlanMutationIntent =
  | CreatePlanIntent
  | RunPlanDiagnosticIntent
  | UpdatePlanTaskIntent
  | CompletePlanTaskIntent;

const idempotencyHeaders = (key: string) => ({
  "X-Idempotency-Key": idempotencyKeySchema.parse(key),
});

export const newCreatePlanIntent = (
  input: CreatePlanRequest,
): CreatePlanIntent => ({
  idempotencyKey: createIdempotencyKey(),
  kind: "create",
  request: createPlanRequestSchema.parse(input),
});

export const newRunPlanDiagnosticIntent = (
  plan: OfficialPlan,
  answers: readonly DiagnosticAnswerRequest[],
): RunPlanDiagnosticIntent => ({
  idempotencyKey: createIdempotencyKey(),
  kind: "diagnostic",
  request: runPlanDiagnosticRequestSchema.parse({
    answers: [...answers],
    definitionVersion: "baseline-v1",
    planVersion: plan.version,
  }),
});

const requireMatchingTask = (
  plan: OfficialPlan,
  task: OfficialPlanTask,
) => {
  if (plan.id !== task.planId) throw new Error("PLAN_TASK_MISMATCH");
  return {
    planVersion: plan.version,
    taskId: resourceIdSchema.parse(task.id),
    taskVersion: task.version,
  };
};

export const newUpdatePlanTaskIntent = (
  plan: OfficialPlan,
  task: OfficialPlanTask,
  changes: PlanTaskChanges,
): UpdatePlanTaskIntent => {
  const identity = requireMatchingTask(plan, task);
  const parsed = updatePlanTaskRequestSchema.parse({
    ...changes,
    planVersion: identity.planVersion,
    taskVersion: identity.taskVersion,
  });
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "update-task",
    request: {
      ...(parsed.detail === undefined ? {} : { detail: parsed.detail }),
      ...(parsed.estimatedMinutes === undefined
        ? {}
        : { estimatedMinutes: parsed.estimatedMinutes }),
      planVersion: identity.planVersion,
      ...(parsed.scheduledFor === undefined
        ? {}
        : { scheduledFor: parsed.scheduledFor }),
      ...(parsed.sortOrder === undefined ? {} : { sortOrder: parsed.sortOrder }),
      taskVersion: identity.taskVersion,
      ...(parsed.title === undefined ? {} : { title: parsed.title }),
    },
    taskId: identity.taskId,
  };
};

export const newCompletePlanTaskIntent = (
  plan: OfficialPlan,
  task: OfficialPlanTask,
): CompletePlanTaskIntent => {
  const identity = requireMatchingTask(plan, task);
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "complete-task",
    request: completePlanTaskRequestSchema.parse({
      planVersion: identity.planVersion,
      taskVersion: identity.taskVersion,
    }),
    taskId: identity.taskId,
  };
};

export const createPlan = async (
  intent: CreatePlanIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<PlanCreationResponse> => {
  const response = await apiRequest<unknown>("/plans", {
    body: createPlanRequestSchema.parse(intent.request),
    csrfProof,
    headers: idempotencyHeaders(intent.idempotencyKey),
    method: "POST",
    ...(signal === undefined ? {} : { signal }),
  });
  return planCreationResponseSchema.parse(response);
};

export const runPlanDiagnostic = async (
  intent: RunPlanDiagnosticIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<PlanDiagnosticResponse> => {
  const response = await apiRequest<unknown>("/plans/current/diagnostic", {
    body: runPlanDiagnosticRequestSchema.parse(intent.request),
    csrfProof,
    headers: idempotencyHeaders(intent.idempotencyKey),
    method: "POST",
    ...(signal === undefined ? {} : { signal }),
  });
  return planDiagnosticResponseSchema.parse(response);
};

export const updatePlanTask = async (
  intent: UpdatePlanTaskIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<PlanTaskMutationResponse> => {
  const taskId = resourceIdSchema.parse(intent.taskId);
  const response = await apiRequest<unknown>(
    `/plans/current/tasks/${encodeURIComponent(taskId)}`,
    {
      body: updatePlanTaskRequestSchema.parse(intent.request),
      csrfProof,
      method: "PATCH",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return planTaskMutationResponseSchema.parse(response);
};

export const completePlanTask = async (
  intent: CompletePlanTaskIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<PlanTaskMutationResponse> => {
  const taskId = resourceIdSchema.parse(intent.taskId);
  const response = await apiRequest<unknown>(
    `/plans/current/tasks/${encodeURIComponent(taskId)}/complete`,
    {
      body: completePlanTaskRequestSchema.parse(intent.request),
      csrfProof,
      method: "POST",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return planTaskMutationResponseSchema.parse(response);
};

export const mutatePlan = (
  intent: PlanMutationIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<PlanCreationResponse | PlanDiagnosticResponse | PlanTaskMutationResponse> => {
  switch (intent.kind) {
    case "create":
      return createPlan(intent, csrfProof, signal);
    case "diagnostic":
      return runPlanDiagnostic(intent, csrfProof, signal);
    case "update-task":
      return updatePlanTask(intent, csrfProof, signal);
    case "complete-task":
      return completePlanTask(intent, csrfProof, signal);
  }
};

export const acknowledgePlanTaskMutation = (
  queryClient: QueryClient,
  ownerScope: string,
  intent: UpdatePlanTaskIntent | CompletePlanTaskIntent,
  acknowledged: PlanTaskMutationResponse,
) => {
  queryClient.setQueryData<CurrentPlanResponse>(
    planQueryKeys.current(ownerScope),
    (current) => {
      const plan = current?.plan;
      if (
        plan === null
        || plan === undefined
        || intent.taskId !== acknowledged.task.id
        || plan.id !== acknowledged.task.planId
        || !plan.tasks.some(({ id }) => id === acknowledged.task.id)
      ) {
        return current;
      }
      const previousTask = plan.tasks.find(({ id }) => id === acknowledged.task.id);
      if (previousTask === undefined) return current;
      if (
        plan.version === acknowledged.planVersion
        && previousTask.version === acknowledged.task.version
      ) {
        return current;
      }
      if (
        plan.version !== intent.request.planVersion
        || previousTask.version !== intent.request.taskVersion
        || acknowledged.planVersion <= plan.version
        || acknowledged.task.version <= previousTask.version
      ) {
        return current;
      }
      const completionDelta = previousTask?.status === "open"
        && acknowledged.task.status === "completed"
        ? 1
        : 0;
      return {
        plan: {
          ...plan,
          progress: {
            ...plan.progress,
            completed: Math.min(
              plan.progress.total,
              plan.progress.completed + completionDelta,
            ),
          },
          tasks: plan.tasks.map((task) => (
            task.id === acknowledged.task.id ? acknowledged.task : task
          )),
          version: acknowledged.planVersion,
        },
      };
    },
  );
};

export const invalidatePlanReadModels = async (
  queryClient: QueryClient,
  ownerScope: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: planQueryKeys.forOwner(ownerScope),
    }),
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.forOwner(ownerScope),
    }),
  ]);
};

export type PlanMutationOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: () => Promise<void>;
}>;

const usePlanMutationOptions = ({
  csrfProof,
  ownerScope,
  verifyOwner,
}: PlanMutationOptions) => {
  const queryClient = useQueryClient();
  return {
    csrfProof,
    ownerScope,
    queryClient,
    verifyOwner: verifyOwner ?? (() => verifyCurrentSessionOwner(ownerScope)),
  } as const;
};

export const useCreatePlanMutation = (options: PlanMutationOptions) => {
  const context = usePlanMutationOptions(options);
  return useMutation<PlanCreationResponse, unknown, CreatePlanIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        () => createPlan(intent, context.csrfProof),
      );
    },
    mutationKey: ["plans", context.ownerScope, "create"],
    networkMode: "always",
    onSuccess: () => invalidatePlanReadModels(context.queryClient, context.ownerScope),
    retry: false,
  });
};

export const useRunPlanDiagnosticMutation = (options: PlanMutationOptions) => {
  const context = usePlanMutationOptions(options);
  return useMutation<PlanDiagnosticResponse, unknown, RunPlanDiagnosticIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        () => runPlanDiagnostic(intent, context.csrfProof),
      );
    },
    mutationKey: ["plans", context.ownerScope, "diagnostic"],
    networkMode: "always",
    onSuccess: () => invalidatePlanReadModels(context.queryClient, context.ownerScope),
    retry: false,
  });
};

export const useUpdatePlanTaskMutation = (options: PlanMutationOptions) => {
  const context = usePlanMutationOptions(options);
  return useMutation<PlanTaskMutationResponse, unknown, UpdatePlanTaskIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        () => updatePlanTask(intent, context.csrfProof),
      );
    },
    mutationKey: ["plans", context.ownerScope, "update-task"],
    networkMode: "always",
    onSuccess: async (acknowledged, intent) => {
      acknowledgePlanTaskMutation(
        context.queryClient,
        context.ownerScope,
        intent,
        acknowledged,
      );
      await invalidatePlanReadModels(context.queryClient, context.ownerScope);
    },
    retry: false,
  });
};

export const useCompletePlanTaskMutation = (options: PlanMutationOptions) => {
  const context = usePlanMutationOptions(options);
  return useMutation<PlanTaskMutationResponse, unknown, CompletePlanTaskIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        () => completePlanTask(intent, context.csrfProof),
      );
    },
    mutationKey: ["plans", context.ownerScope, "complete-task"],
    networkMode: "always",
    onSuccess: async (acknowledged, intent) => {
      acknowledgePlanTaskMutation(
        context.queryClient,
        context.ownerScope,
        intent,
        acknowledged,
      );
      await invalidatePlanReadModels(context.queryClient, context.ownerScope);
    },
    retry: false,
  });
};
