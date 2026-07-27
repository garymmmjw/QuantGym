import { z } from "zod";

import type { components } from "../../shared/api/generated/schema";

export type CompletePlanTaskRequest = components["schemas"]["CompletePlanTaskRequest"];
export type CreatePlanRequest = components["schemas"]["CreatePlanRequest"];
export type CurrentPlanResponse = components["schemas"]["CurrentPlanResponse"];
export type DiagnosticAnswerRequest = components["schemas"]["DiagnosticAnswerRequest"];
export type OfficialPlan = components["schemas"]["OfficialPlanResponse"];
export type OfficialPlanTask = components["schemas"]["OfficialPlanTaskResponse"];
export type PlanCreationResponse = components["schemas"]["PlanCreationResponse"];
export type PlanDiagnosticResponse = components["schemas"]["PlanDiagnosticResponse"];
export type PlanTaskMutationResponse = components["schemas"]["PlanTaskMutationResponse"];
export type Recommendation = components["schemas"]["RecommendationResponse"];
export type RunPlanDiagnosticRequest = components["schemas"]["RunPlanDiagnosticRequest"];
export type UpdatePlanTaskRequest = components["schemas"]["UpdatePlanTaskRequest"];

const isoDateTimeSchema = z.string().datetime({ offset: true });
const isoDateSchema = z.string().regex(
  /^\d{4}-(?:0[1-9]|1[0-2])-(?:0[1-9]|[12]\d|3[01])$/,
  "日期必须使用 YYYY-MM-DD 格式。",
);
const uuidSchema = z.string().uuid();
const positiveVersionSchema = z.number().int().positive();

const safeTrimmedText = (
  minimum: number,
  maximum: number,
  message: string,
) => z.string()
  .trim()
  .min(minimum, message)
  .max(maximum, message)
  .refine(
    (value) => ![...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 || codePoint === 127;
    }),
    message,
  );

export const planTrackSchema = z.enum(["internship", "fulltime"]);
export const weeklyHoursSchema = z.union([
  z.literal(5),
  z.literal(8),
  z.literal(12),
  z.literal(16),
]);

export const createPlanRequestSchema: z.ZodType<
  CreatePlanRequest,
  CreatePlanRequest
> = z.object({
  role: safeTrimmedText(1, 48, "目标岗位必须为 1 至 48 个安全字符。"),
  season: safeTrimmedText(1, 48, "目标季节必须为 1 至 48 个安全字符。"),
  track: planTrackSchema,
  weeklyHours: weeklyHoursSchema,
}).strict();

export const diagnosticQuestionIds = [
  "mm-percent",
  "prob-coin",
  "prob-die",
  "stats-pvalue",
  "market-spread",
  "option-call",
  "code-two-sum",
  "research-validation",
] as const;

const diagnosticQuestionIdSchema = z.enum(diagnosticQuestionIds);

export const diagnosticAnswerRequestSchema: z.ZodType<
  DiagnosticAnswerRequest,
  DiagnosticAnswerRequest
> = z.object({
  optionId: safeTrimmedText(1, 120, "诊断选项无效。"),
  questionId: diagnosticQuestionIdSchema,
}).strict();

export const runPlanDiagnosticRequestSchema: z.ZodType<
  RunPlanDiagnosticRequest,
  RunPlanDiagnosticRequest
> = z.object({
  answers: z.array(diagnosticAnswerRequestSchema)
    .length(diagnosticQuestionIds.length)
    .superRefine((answers, context) => {
      const observed = new Set(answers.map(({ questionId }) => questionId));
      for (const questionId of diagnosticQuestionIds) {
        if (!observed.has(questionId)) {
          context.addIssue({
            code: "custom",
            message: `诊断缺少题目 ${questionId}。`,
          });
        }
      }
    }),
  definitionVersion: z.literal("baseline-v1"),
  planVersion: positiveVersionSchema,
}).strict();

const nullableTrimmedDetailSchema = z.string()
  .trim()
  .max(2_000, "任务详情不能超过 2000 个字符。")
  .refine(
    (value) => ![...value].some((character) => {
      const codePoint = character.codePointAt(0) ?? 0;
      return codePoint < 32 && character !== "\n" && character !== "\t";
    }),
    "任务详情包含不支持的字符。",
  )
  .nullable();

export const updatePlanTaskRequestSchema = z.object({
  detail: nullableTrimmedDetailSchema.optional(),
  estimatedMinutes: z.number().int().min(1).max(1_440).nullable().optional(),
  planVersion: positiveVersionSchema,
  scheduledFor: isoDateSchema.nullable().optional(),
  sortOrder: z.number().int().nonnegative().max(2_147_483_647).optional(),
  taskVersion: positiveVersionSchema,
  title: safeTrimmedText(1, 240, "任务标题必须为 1 至 240 个安全字符。").optional(),
}).strict().superRefine((request, context) => {
  const editableKeys = [
    "detail",
    "estimatedMinutes",
    "scheduledFor",
    "sortOrder",
    "title",
  ] as const;
  if (!editableKeys.some((key) => Object.hasOwn(request, key))) {
    context.addIssue({
      code: "custom",
      message: "至少需要修改一个任务字段。",
    });
  }
});

export const completePlanTaskRequestSchema: z.ZodType<
  CompletePlanTaskRequest,
  CompletePlanTaskRequest
> = z.object({
  planVersion: positiveVersionSchema,
  taskVersion: positiveVersionSchema,
}).strict();

export const planProgressSchema = z.object({
  completed: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
}).strict().superRefine(({ completed, total }, context) => {
  if (completed > total) {
    context.addIssue({
      code: "custom",
      message: "已完成任务数不能超过任务总数。",
      path: ["completed"],
    });
  }
});

export const officialPlanTaskSchema: z.ZodType<
  OfficialPlanTask,
  OfficialPlanTask
> = z.object({
  actionTarget: z.enum([
    "problems",
    "tools",
    "resume",
    "jobs",
    "experiences",
    "interview",
    "custom",
  ]).nullable(),
  completedAt: isoDateTimeSchema.nullable(),
  createdAt: isoDateTimeSchema,
  detail: z.string().max(2_000).nullable(),
  estimatedMinutes: z.number().int().min(1).max(1_440).nullable(),
  id: uuidSchema,
  planId: uuidSchema,
  recommendationId: uuidSchema.nullable(),
  scheduledFor: isoDateSchema.nullable(),
  skillKey: z.string().trim().min(1).max(120).nullable(),
  sortOrder: z.number().int().nonnegative(),
  status: z.enum(["open", "completed"]),
  targetProblemId: uuidSchema.nullable(),
  title: z.string().trim().min(1).max(240),
  updatedAt: isoDateTimeSchema,
  version: positiveVersionSchema,
}).strict();

export const recommendationSchema: z.ZodType<
  Recommendation,
  Recommendation
> = z.object({
  createdAt: isoDateTimeSchema,
  id: uuidSchema,
  kind: z.enum(["problem", "skill", "task"]),
  problemId: uuidSchema.nullable(),
  provenanceResourceId: uuidSchema.nullable(),
  provenanceType: z.enum(["diagnostic", "training", "system"]),
  rank: z.number().int().nonnegative(),
  rationale: z.string(),
  skillKey: z.string().nullable(),
  status: z.enum(["active", "applied", "dismissed"]),
  updatedAt: isoDateTimeSchema,
  version: positiveVersionSchema,
}).strict();

export const officialPlanSchema: z.ZodType<
  OfficialPlan,
  OfficialPlan
> = z.object({
  createdAt: isoDateTimeSchema,
  diagnosticScore: z.number().int().nonnegative(),
  diagnosticScores: z.record(z.string(), z.number().int()),
  diagnosticStatus: z.enum(["pending", "completed", "skipped"]),
  id: uuidSchema,
  progress: planProgressSchema,
  recommendations: z.array(recommendationSchema),
  role: z.string().trim().min(1).max(48),
  season: z.string().trim().min(1).max(48),
  status: z.enum(["active", "completed", "archived"]),
  tasks: z.array(officialPlanTaskSchema),
  track: planTrackSchema,
  updatedAt: isoDateTimeSchema,
  version: positiveVersionSchema,
  weeklyHours: weeklyHoursSchema,
}).strict();

export const currentPlanResponseSchema: z.ZodType<
  CurrentPlanResponse,
  CurrentPlanResponse
> = z.object({
  plan: officialPlanSchema.nullable(),
}).strict();

export const planCreationResponseSchema: z.ZodType<
  PlanCreationResponse,
  PlanCreationResponse
> = z.object({
  planId: uuidSchema,
  planVersion: positiveVersionSchema,
  taskIds: z.array(uuidSchema),
}).strict();

export const planDiagnosticResponseSchema: z.ZodType<
  PlanDiagnosticResponse,
  PlanDiagnosticResponse
> = z.object({
  planId: uuidSchema,
  planVersion: positiveVersionSchema,
  recommendationIds: z.array(uuidSchema),
}).strict();

export const planTaskMutationResponseSchema: z.ZodType<
  PlanTaskMutationResponse,
  PlanTaskMutationResponse
> = z.object({
  planVersion: positiveVersionSchema,
  task: officialPlanTaskSchema,
}).strict();
