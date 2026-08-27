import { z } from "zod";

import type { components } from "../../shared/api/generated/schema";

type DashboardOverviewContract = components["schemas"]["DashboardOverviewResponse"];

const isoDateTimeSchema = z.string().datetime({ offset: true });

export const dashboardProfileSchema = z.object({
  displayName: z.string().trim().min(1),
  level: z.number().int().positive(),
  streakDays: z.number().int().nonnegative(),
  weeklyXp: z.number().int().nonnegative(),
}).strict();

export const dashboardTaskSchema = z.object({
  actionResourceId: z.string().uuid().nullable(),
  actionTarget: z.string().trim().min(1).nullable(),
  id: z.string().uuid(),
  rewardXp: z.number().int().nonnegative(),
  status: z.enum(["open", "completed"]),
  title: z.string().trim().min(1),
  unlockReason: z.string().trim().min(1),
  version: z.number().int().positive(),
}).strict();

export const dashboardWeaknessSchema = z.object({
  label: z.string().trim().min(1),
  recommendedProblemId: z.string().uuid().nullable(),
  score: z.number().int().nonnegative(),
  skillKey: z.string().trim().min(1),
}).strict();

export const dashboardPlanProgressSchema = z.object({
  completedTasks: z.number().int().nonnegative(),
  planId: z.string().uuid(),
  totalTasks: z.number().int().nonnegative(),
  version: z.number().int().positive(),
}).strict().superRefine((progress, context) => {
  if (progress.completedTasks > progress.totalTasks) {
    context.addIssue({
      code: "custom",
      message: "Completed plan tasks cannot exceed total plan tasks.",
      path: ["completedTasks"],
    });
  }
});

export const dashboardXpSchema = z.object({
  amount: z.number().int().positive(),
  id: z.string().uuid(),
  occurredAt: isoDateTimeSchema,
  reason: z.literal("problem_completion"),
  skillKey: z.string().trim().min(1),
}).strict();

export const dashboardOverviewSchema = z.object({
  planProgress: dashboardPlanProgressSchema.nullable(),
  profile: dashboardProfileSchema,
  recentXp: z.array(dashboardXpSchema),
  resourceVersions: z.record(
    z.string().trim().min(1),
    z.number().int().nonnegative(),
  ),
  todayTask: dashboardTaskSchema.nullable(),
  unreadNotificationCount: z.number().int().nonnegative(),
  weakness: dashboardWeaknessSchema.nullable(),
}).strict() satisfies z.ZodType<DashboardOverviewContract>;

export type DashboardOverview = z.output<typeof dashboardOverviewSchema>;
export type DashboardPlanProgress = z.output<typeof dashboardPlanProgressSchema>;
export type DashboardTask = z.output<typeof dashboardTaskSchema>;
export type DashboardXp = z.output<typeof dashboardXpSchema>;
