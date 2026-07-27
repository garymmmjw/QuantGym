import { queryOptions, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "../../shared/api/client";
import { runOwnerScopedQuery } from "../../shared/api/ownerScopedQueries";
import {
  trainingResultResponseSchema,
  trainingSessionResponseSchema,
  type TrainingResultResponse,
  type TrainingSessionResponse,
} from "./training.schema";

const sessionIdSchema = z.string().uuid();

export const trainingQueryKeys = {
  all: ["training"] as const,
  forOwner: (ownerScope: string) => ["training", ownerScope] as const,
  session: (ownerScope: string, sessionId: string) => (
    ["training", ownerScope, "session", sessionIdSchema.parse(sessionId)] as const
  ),
  sessions: (ownerScope: string) => ["training", ownerScope, "session"] as const,
  result: (ownerScope: string, sessionId: string) => (
    ["training", ownerScope, "result", sessionIdSchema.parse(sessionId)] as const
  ),
  results: (ownerScope: string) => ["training", ownerScope, "result"] as const,
} as const;

export const getTrainingSession = async (
  sessionId: string,
  signal?: AbortSignal,
): Promise<TrainingSessionResponse> => {
  const validSessionId = sessionIdSchema.parse(sessionId);
  const response = await apiRequest<unknown>(
    `/training/sessions/${encodeURIComponent(validSessionId)}`,
    {
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return trainingSessionResponseSchema.parse(response);
};

export type TrainingSessionQueryOptions = Readonly<{
  enabled?: boolean;
  ownerScope: string;
  sessionId: string;
}>;

export const trainingSessionQueryOptions = ({
  enabled = true,
  ownerScope,
  sessionId,
}: TrainingSessionQueryOptions) => queryOptions({
  enabled,
  queryFn: ({ signal }) => runOwnerScopedQuery(
    ownerScope,
    () => getTrainingSession(sessionId, signal),
    signal,
  ),
  queryKey: trainingQueryKeys.session(ownerScope, sessionId),
  retry: false,
});

export const useTrainingSessionQuery = (
  options: TrainingSessionQueryOptions,
) => useQuery(trainingSessionQueryOptions(options));

export const getTrainingResult = async (
  sessionId: string,
  signal?: AbortSignal,
): Promise<TrainingResultResponse> => {
  const validSessionId = sessionIdSchema.parse(sessionId);
  const response = await apiRequest<unknown>(
    `/training/sessions/${encodeURIComponent(validSessionId)}/result`,
    {
      ...(signal === undefined ? {} : { signal }),
    },
  );
  return trainingResultResponseSchema.parse(response);
};

export type TrainingResultQueryOptions = Readonly<{
  enabled?: boolean;
  ownerScope: string;
  sessionId: string;
}>;

export const trainingResultQueryOptions = ({
  enabled = true,
  ownerScope,
  sessionId,
}: TrainingResultQueryOptions) => queryOptions({
  enabled,
  queryFn: ({ signal }) => runOwnerScopedQuery(
    ownerScope,
    () => getTrainingResult(sessionId, signal),
    signal,
  ),
  queryKey: trainingQueryKeys.result(ownerScope, sessionId),
  retry: false,
});

export const useTrainingResultQuery = (
  options: TrainingResultQueryOptions,
) => useQuery(trainingResultQueryOptions(options));
