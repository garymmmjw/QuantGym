import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../shared/api/client";
import { runOwnerScopedQuery } from "../../shared/api/ownerScopedQueries";
import {
  currentPlanResponseSchema,
  type CurrentPlanResponse,
} from "./plan.schema";

export const planQueryKeys = {
  all: ["plans"] as const,
  current: (ownerScope: string) => ["plans", ownerScope, "current"] as const,
  forOwner: (ownerScope: string) => ["plans", ownerScope] as const,
} as const;

export const getCurrentPlan = async (
  signal?: AbortSignal,
): Promise<CurrentPlanResponse> => {
  const response = await apiRequest<unknown>("/plans/current", {
    ...(signal === undefined ? {} : { signal }),
  });
  return currentPlanResponseSchema.parse(response);
};

export type CurrentPlanQueryOptions = Readonly<{
  enabled?: boolean;
  ownerScope: string;
}>;

export const currentPlanQueryOptions = ({
  enabled = true,
  ownerScope,
}: CurrentPlanQueryOptions) => queryOptions({
  enabled,
  queryFn: ({ signal }) => runOwnerScopedQuery(
    ownerScope,
    () => getCurrentPlan(signal),
    signal,
  ),
  queryKey: planQueryKeys.current(ownerScope),
  retry: false,
});

export const useCurrentPlanQuery = (
  options: CurrentPlanQueryOptions,
) => useQuery(currentPlanQueryOptions(options));
