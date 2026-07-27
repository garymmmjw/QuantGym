import {
  useMutation,
  useQueryClient,
  type QueryClient,
} from "@tanstack/react-query";
import { z } from "zod";

import { notificationQueryKeys } from "../platform/notifications/notifications.queries";
import { planQueryKeys } from "../plan/plan.queries";
import { dashboardQueryKeys } from "../dashboard/dashboard.queries";
import { problemQueryKeys } from "../problems/problems.queries";
import { apiRequest } from "../../shared/api/client";
import { createIdempotencyKey } from "../../shared/api/mutationRecovery";
import {
  runOwnerVerifiedOperation,
  verifyCurrentSessionOwner,
} from "../../shared/api/ownerScopedQueries";
import {
  attemptSubmissionResponseSchema,
  completeTrainingRequestSchema,
  completionResponseSchema,
  hintUseResponseSchema,
  solutionRevealResponseSchema,
  startTrainingRequestSchema,
  startTrainingResponseSchema,
  submitAttemptRequestSchema,
  versionedTrainingRequestSchema,
  type AttemptSubmissionResponse,
  type CompletionResponse,
  type HintUseResponse,
  type SolutionRevealResponse,
  type StartTrainingRequest,
  type StartTrainingResponse,
} from "./training.schema";
import { trainingQueryKeys } from "./training.queries";

const resourceIdSchema = z.string().uuid();
const idempotencyKeySchema = z.string().regex(/^[A-Za-z0-9._~-]{16,128}$/);

type IdempotentIntent = Readonly<{
  idempotencyKey: string;
}>;

export type TrainingSessionVersion = Readonly<{
  sessionId: string;
  sessionVersion: number;
}>;

export type StartTrainingIntent = IdempotentIntent & Readonly<{
  kind: "start";
  request: StartTrainingRequest;
}>;

export type UseTrainingHintIntent = IdempotentIntent & Readonly<{
  kind: "hint";
  request: { version: number };
  sessionId: string;
}>;

export type SubmitTrainingAttemptIntent = IdempotentIntent & Readonly<{
  kind: "attempt";
  request: {
    answer: string;
    kind: "text" | "code" | "multiple_choice";
    version: number;
  };
  sessionId: string;
}>;

export type RevealTrainingSolutionIntent = IdempotentIntent & Readonly<{
  kind: "solution";
  request: { version: number };
  sessionId: string;
}>;

export type CompleteTrainingIntent = IdempotentIntent & Readonly<{
  kind: "complete";
  request: {
    attemptId: string;
    version: number;
  };
  sessionId: string;
}>;

export type TrainingMutationIntent =
  | StartTrainingIntent
  | UseTrainingHintIntent
  | SubmitTrainingAttemptIntent
  | RevealTrainingSolutionIntent
  | CompleteTrainingIntent;

export type TrainingMutationResponse =
  | StartTrainingResponse
  | HintUseResponse
  | AttemptSubmissionResponse
  | SolutionRevealResponse
  | CompletionResponse;

const idempotencyHeaders = (key: string) => ({
  "X-Idempotency-Key": idempotencyKeySchema.parse(key),
});

const parseSession = (
  session: TrainingSessionVersion,
) => ({
  sessionId: resourceIdSchema.parse(session.sessionId),
  version: versionedTrainingRequestSchema.parse({
    version: session.sessionVersion,
  }).version,
});

export const nextTrainingSessionVersion = (
  response: Pick<StartTrainingResponse, "sessionId" | "sessionVersion">,
): TrainingSessionVersion => ({
  sessionId: response.sessionId,
  sessionVersion: response.sessionVersion,
});

export const newStartTrainingIntent = (
  request: StartTrainingRequest,
): StartTrainingIntent => {
  const parsed = startTrainingRequestSchema.parse(request);
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "start",
    request: {
      ...(parsed.planTaskId === undefined
        ? {}
        : { planTaskId: parsed.planTaskId }),
      problemId: parsed.problemId,
    },
  };
};

export const newUseTrainingHintIntent = (
  session: TrainingSessionVersion,
): UseTrainingHintIntent => {
  const parsed = parseSession(session);
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "hint",
    request: { version: parsed.version },
    sessionId: parsed.sessionId,
  };
};

export const newSubmitTrainingAttemptIntent = (
  session: TrainingSessionVersion,
  attempt: Readonly<{
    answer: string;
    kind: "text" | "code" | "multiple_choice";
  }>,
): SubmitTrainingAttemptIntent => {
  const parsed = parseSession(session);
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "attempt",
    request: submitAttemptRequestSchema.parse({
      ...attempt,
      version: parsed.version,
    }),
    sessionId: parsed.sessionId,
  };
};

export const newRevealTrainingSolutionIntent = (
  session: TrainingSessionVersion,
): RevealTrainingSolutionIntent => {
  const parsed = parseSession(session);
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "solution",
    request: { version: parsed.version },
    sessionId: parsed.sessionId,
  };
};

export const newCompleteTrainingIntent = (
  session: TrainingSessionVersion,
  attemptId: string,
): CompleteTrainingIntent => {
  const parsed = parseSession(session);
  return {
    idempotencyKey: createIdempotencyKey(),
    kind: "complete",
    request: completeTrainingRequestSchema.parse({
      attemptId,
      version: parsed.version,
    }),
    sessionId: parsed.sessionId,
  };
};

export const startOrResumeTraining = async (
  intent: StartTrainingIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<StartTrainingResponse> => {
  const response = await apiRequest<unknown>("/training/sessions", {
    body: startTrainingRequestSchema.parse(intent.request),
    csrfProof,
    headers: idempotencyHeaders(intent.idempotencyKey),
    method: "POST",
    ...(signal === undefined ? {} : { signal }),
  });
  return startTrainingResponseSchema.parse(response);
};

export const requestTrainingHint = async (
  intent: UseTrainingHintIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<HintUseResponse> => {
  const sessionId = resourceIdSchema.parse(intent.sessionId);
  const response = await apiRequest<unknown>(
    `/training/sessions/${encodeURIComponent(sessionId)}/hint`,
    {
      body: versionedTrainingRequestSchema.parse(intent.request),
      csrfProof,
      headers: idempotencyHeaders(intent.idempotencyKey),
      method: "POST",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return hintUseResponseSchema.parse(response);
};

export const submitTrainingAttempt = async (
  intent: SubmitTrainingAttemptIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<AttemptSubmissionResponse> => {
  const sessionId = resourceIdSchema.parse(intent.sessionId);
  const response = await apiRequest<unknown>(
    `/training/sessions/${encodeURIComponent(sessionId)}/attempts`,
    {
      body: submitAttemptRequestSchema.parse(intent.request),
      csrfProof,
      headers: idempotencyHeaders(intent.idempotencyKey),
      method: "POST",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return attemptSubmissionResponseSchema.parse(response);
};

export const revealTrainingSolution = async (
  intent: RevealTrainingSolutionIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<SolutionRevealResponse> => {
  const sessionId = resourceIdSchema.parse(intent.sessionId);
  const response = await apiRequest<unknown>(
    `/training/sessions/${encodeURIComponent(sessionId)}/solution`,
    {
      body: versionedTrainingRequestSchema.parse(intent.request),
      csrfProof,
      headers: idempotencyHeaders(intent.idempotencyKey),
      method: "POST",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return solutionRevealResponseSchema.parse(response);
};

export const completeTrainingSession = async (
  intent: CompleteTrainingIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<CompletionResponse> => {
  const sessionId = resourceIdSchema.parse(intent.sessionId);
  const response = await apiRequest<unknown>(
    `/training/sessions/${encodeURIComponent(sessionId)}/complete`,
    {
      body: completeTrainingRequestSchema.parse(intent.request),
      csrfProof,
      headers: idempotencyHeaders(intent.idempotencyKey),
      method: "POST",
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return completionResponseSchema.parse(response);
};

export const mutateTraining = (
  intent: TrainingMutationIntent,
  csrfProof: string | null,
  signal?: AbortSignal,
): Promise<TrainingMutationResponse> => {
  switch (intent.kind) {
    case "start":
      return startOrResumeTraining(intent, csrfProof, signal);
    case "hint":
      return requestTrainingHint(intent, csrfProof, signal);
    case "attempt":
      return submitTrainingAttempt(intent, csrfProof, signal);
    case "solution":
      return revealTrainingSolution(intent, csrfProof, signal);
    case "complete":
      return completeTrainingSession(intent, csrfProof, signal);
  }
};

export const invalidateTrainingCompletionReadModels = async (
  queryClient: QueryClient,
  ownerScope: string,
  sessionId: string,
) => {
  await Promise.all([
    invalidateTrainingProgressReadModels(queryClient, ownerScope),
    queryClient.invalidateQueries({
      queryKey: trainingQueryKeys.result(ownerScope, sessionId),
    }),
    queryClient.invalidateQueries({
      queryKey: planQueryKeys.forOwner(ownerScope),
    }),
    queryClient.invalidateQueries({
      queryKey: notificationQueryKeys.forOwner(ownerScope),
    }),
  ]);
};

export const invalidateTrainingProgressReadModels = async (
  queryClient: QueryClient,
  ownerScope: string,
) => {
  await Promise.all([
    queryClient.invalidateQueries({
      queryKey: dashboardQueryKeys.forOwner(ownerScope),
    }),
    queryClient.invalidateQueries({
      queryKey: problemQueryKeys.forOwner(ownerScope),
    }),
  ]);
};

export type TrainingMutationOptions = Readonly<{
  csrfProof: string | null;
  ownerScope: string;
  verifyOwner?: (signal?: AbortSignal) => Promise<void>;
}>;

export type StartTrainingMutationOptions = TrainingMutationOptions & Readonly<{
  getOperationSignal?: () => AbortSignal | undefined;
}>;

const useTrainingMutationOptions = ({
  csrfProof,
  ownerScope,
  verifyOwner,
}: TrainingMutationOptions) => {
  const queryClient = useQueryClient();
  return {
    csrfProof,
    ownerScope,
    queryClient,
    verifyOwner: verifyOwner ?? ((signal?: AbortSignal) => (
      verifyCurrentSessionOwner(ownerScope, signal)
    )),
  } as const;
};

export const useStartTrainingMutation = ({
  getOperationSignal,
  ...options
}: StartTrainingMutationOptions) => {
  const context = useTrainingMutationOptions(options);
  return useMutation<StartTrainingResponse, unknown, StartTrainingIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        (signal) => startOrResumeTraining(intent, context.csrfProof, signal),
        getOperationSignal?.(),
      );
    },
    mutationKey: ["training", context.ownerScope, "start"],
    networkMode: "always",
    onSuccess: () => invalidateTrainingProgressReadModels(
      context.queryClient,
      context.ownerScope,
    ),
    retry: false,
  });
};

export const useTrainingHintMutation = (options: TrainingMutationOptions) => {
  const context = useTrainingMutationOptions(options);
  return useMutation<HintUseResponse, unknown, UseTrainingHintIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        (signal) => requestTrainingHint(intent, context.csrfProof, signal),
      );
    },
    mutationKey: ["training", context.ownerScope, "hint"],
    networkMode: "always",
    onSuccess: () => invalidateTrainingProgressReadModels(
      context.queryClient,
      context.ownerScope,
    ),
    retry: false,
  });
};

export const useSubmitTrainingAttemptMutation = (
  options: TrainingMutationOptions,
) => {
  const context = useTrainingMutationOptions(options);
  return useMutation<
    AttemptSubmissionResponse,
    unknown,
    SubmitTrainingAttemptIntent
  >({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        (signal) => submitTrainingAttempt(intent, context.csrfProof, signal),
      );
    },
    mutationKey: ["training", context.ownerScope, "attempt"],
    networkMode: "always",
    onSuccess: () => invalidateTrainingProgressReadModels(
      context.queryClient,
      context.ownerScope,
    ),
    retry: false,
  });
};

export const useRevealTrainingSolutionMutation = (
  options: TrainingMutationOptions,
) => {
  const context = useTrainingMutationOptions(options);
  return useMutation<
    SolutionRevealResponse,
    unknown,
    RevealTrainingSolutionIntent
  >({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        (signal) => revealTrainingSolution(intent, context.csrfProof, signal),
      );
    },
    mutationKey: ["training", context.ownerScope, "solution"],
    networkMode: "always",
    onSuccess: () => invalidateTrainingProgressReadModels(
      context.queryClient,
      context.ownerScope,
    ),
    retry: false,
  });
};

export const useCompleteTrainingMutation = (
  options: TrainingMutationOptions,
) => {
  const context = useTrainingMutationOptions(options);
  return useMutation<CompletionResponse, unknown, CompleteTrainingIntent>({
    mutationFn: async (intent) => {
      return runOwnerVerifiedOperation(
        context.verifyOwner,
        (signal) => completeTrainingSession(intent, context.csrfProof, signal),
      );
    },
    mutationKey: ["training", context.ownerScope, "complete"],
    networkMode: "always",
    onSuccess: (_acknowledged, intent) => (
      invalidateTrainingCompletionReadModels(
        context.queryClient,
        context.ownerScope,
        intent.sessionId,
      )
    ),
    retry: false,
  });
};
