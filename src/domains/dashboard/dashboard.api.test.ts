import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";

import {
  dashboardOverviewQueryOptions,
  dashboardQueryKeys,
  getDashboardOverview,
  selectDashboardResourceVersion,
} from "./dashboard.queries";
import type { DashboardOverview } from "./dashboard.schema";

const overview: DashboardOverview = {
  planProgress: {
    completedTasks: 2,
    planId: "10000000-0000-4000-8000-000000000001",
    totalTasks: 5,
    version: 4,
  },
  profile: {
    displayName: "Gary",
    level: 3,
    streakDays: 7,
    weeklyXp: 90,
  },
  recentXp: [{
    amount: 20,
    id: "20000000-0000-4000-8000-000000000002",
    occurredAt: "2026-07-27T02:00:00Z",
    reason: "problem_completion",
    skillKey: "arrays",
  }],
  resourceVersions: {
    notifications: 4,
    plan: 4,
    xpLedger: 6,
  },
  todayTask: {
    actionResourceId: "30000000-0000-4000-8000-000000000003",
    actionTarget: "problems",
    id: "40000000-0000-4000-8000-000000000004",
    rewardXp: 20,
    status: "open",
    title: "完成两数之和训练",
    unlockReason: "巩固数组与哈希表",
    version: 2,
  },
  unreadNotificationCount: 1,
  weakness: {
    label: "哈希表边界仍需加强",
    recommendedProblemId: "30000000-0000-4000-8000-000000000003",
    score: 62,
    skillKey: "arrays",
  },
};

const server = setupServer();

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));
afterEach(() => server.resetHandlers());
afterAll(() => server.close());

describe("dashboard typed client", () => {
  it("loads and validates the server-composed Overview through MSW", async () => {
    server.use(http.get("*/api/v2/dashboard/overview", ({ request }) => {
      expect(request.credentials).toBe("include");
      return HttpResponse.json(overview);
    }));

    await expect(getDashboardOverview()).resolves.toEqual(overview);
    expect(selectDashboardResourceVersion(overview, "xpLedger")).toBe(6);
    expect(selectDashboardResourceVersion(overview, "unknown")).toBe(0);
  });

  it("forwards cancellation to an in-flight Overview request", async () => {
    server.use(http.get("*/api/v2/dashboard/overview", async () => {
      await delay(1_000);
      return HttpResponse.json(overview);
    }));
    const controller = new AbortController();
    const request = getDashboardOverview(controller.signal);

    controller.abort();

    await expect(request).rejects.toMatchObject({ name: "AbortError" });
  });

  it("rejects incoherent plan progress instead of rendering it", async () => {
    server.use(http.get("*/api/v2/dashboard/overview", () => HttpResponse.json({
      ...overview,
      planProgress: { ...overview.planProgress, completedTasks: 6 },
    })));

    await expect(getDashboardOverview()).rejects.toThrow();
  });

  it("uses owner-isolated, typed Overview query keys", () => {
    expect(dashboardOverviewQueryOptions("acct-a").queryKey)
      .toEqual(dashboardQueryKeys.overview("acct-a"));
    expect(dashboardQueryKeys.overview("acct-a"))
      .not.toEqual(dashboardQueryKeys.overview("acct-b"));
  });
});
