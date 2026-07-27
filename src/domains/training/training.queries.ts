import { queryOptions, useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { apiRequest } from "../../shared/api/client";
import {
  trainingResultResponseSchema,
  type TrainingResultResponse,
} from "./training.schema";

const sessionIdSchema = z.string().uuid();

export const trainingQueryKeys = {
  all: ["training"] as const,
  forOwner: (ownerScope: string) => ["training", ownerScope] as const,
  result: (ownerScope: string, sessionId: string) => (
    ["training", ownerScope, "result", sessionId] as const
  ),
  results: (ownerScope: string) => ["training", ownerScope, "result"] as const,
} as const;

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
  queryFn: ({ signal }) => getTrainingResult(sessionId, signal),
  queryKey: trainingQueryKeys.result(ownerScope, sessionId),
  retry: false,
});

export const useTrainingResultQuery = (
  options: TrainingResultQueryOptions,
) => useQuery(trainingResultQueryOptions(options));
