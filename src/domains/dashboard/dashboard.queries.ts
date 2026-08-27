import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../shared/api/client";
import { runOwnerScopedQuery } from "../../shared/api/ownerScopedQueries";
import {
  dashboardOverviewSchema,
  type DashboardOverview,
} from "./dashboard.schema";

export const dashboardQueryKeys = {
  all: ["dashboard"] as const,
  forOwner: (ownerScope: string) => ["dashboard", ownerScope] as const,
  overview: (ownerScope: string) => ["dashboard", ownerScope, "overview"] as const,
} as const;

export const getDashboardOverview = async (
  signal?: AbortSignal,
): Promise<DashboardOverview> => {
  const response = await apiRequest<unknown>(
    "/dashboard/overview",
    signal === undefined ? {} : { signal },
  );
  return dashboardOverviewSchema.parse(response);
};

export const dashboardOverviewQueryOptions = (
  ownerScope: string,
  enabled = true,
) => queryOptions({
  enabled,
  queryFn: ({ signal }) => runOwnerScopedQuery(
    ownerScope,
    () => getDashboardOverview(signal),
    signal,
  ),
  queryKey: dashboardQueryKeys.overview(ownerScope),
});

export const useDashboardOverviewQuery = (
  ownerScope: string,
  enabled = true,
) => useQuery(dashboardOverviewQueryOptions(ownerScope, enabled));

export const selectDashboardResourceVersion = (
  overview: DashboardOverview | null | undefined,
  resource: string,
): number => overview?.resourceVersions[resource] ?? 0;
