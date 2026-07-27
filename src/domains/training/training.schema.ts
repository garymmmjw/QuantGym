import { z } from "zod";

import type { components } from "../../shared/api/generated/schema";

export type AttemptSubmissionResponse = components["schemas"]["AttemptSubmissionResponse"];
export type CompleteTrainingRequest = components["schemas"]["CompleteTrainingRequest"];
export type CompletionResponse = components["schemas"]["CompletionResponse"];
export type HintUseResponse = components["schemas"]["HintUseResponse"];
export type PlanEffect = components["schemas"]["PlanEffectResponse"];
export type SolutionRevealResponse = components["schemas"]["SolutionRevealResponse"];
export type StartTrainingRequest = components["schemas"]["StartTrainingRequest"];
export type StartTrainingResponse = components["schemas"]["StartTrainingResponse"];
export type SubmitAttemptRequest = components["schemas"]["SubmitAttemptRequest"];
export type TrainingResultResponse = components["schemas"]["TrainingResultResponse"];
export type VersionedTrainingRequest = components["schemas"]["VersionedTrainingRequest"];

const isoDateTimeSchema = z.string().datetime({ offset: true });
const uuidSchema = z.string().uuid();
const positiveVersionSchema = z.number().int().positive();

export const startTrainingRequestSchema = z.object({
  planTaskId: uuidSchema.nullable().optional(),
  problemId: uuidSchema,
}).strict();

export const versionedTrainingRequestSchema: z.ZodType<
  VersionedTrainingRequest,
  VersionedTrainingRequest
> = z.object({
  version: positiveVersionSchema,
}).strict();

export const submitAttemptRequestSchema: z.ZodType<
  SubmitAttemptRequest,
  SubmitAttemptRequest
> = z.object({
  answer: z.string()
    .min(1)
    .max(50_000)
    .refine((answer) => answer.trim().length > 0, "答案不能为空。")
    .refine((answer) => !answer.includes("\0"), "答案包含无效字符。"),
  kind: z.enum(["text", "code", "multiple_choice"]),
  version: positiveVersionSchema,
}).strict();

export const completeTrainingRequestSchema: z.ZodType<
  CompleteTrainingRequest,
  CompleteTrainingRequest
> = z.object({
  attemptId: uuidSchema,
  version: positiveVersionSchema,
}).strict();

export const planEffectSchema: z.ZodType<
  PlanEffect,
  PlanEffect
> = z.object({
  planVersion: positiveVersionSchema,
  taskCompleted: z.boolean(),
}).strict();

const trainingEventResponseShape = {
  eventId: uuidSchema,
  eventSequence: z.number().int().positive(),
  sessionId: uuidSchema,
  sessionVersion: positiveVersionSchema,
} as const;

export const startTrainingResponseSchema: z.ZodType<
  StartTrainingResponse,
  StartTrainingResponse
> = z.object({
  problemId: uuidSchema,
  resumed: z.boolean(),
  sessionId: uuidSchema,
  sessionVersion: positiveVersionSchema,
}).strict();

export const hintUseResponseSchema: z.ZodType<
  HintUseResponse,
  HintUseResponse
> = z.object({
  ...trainingEventResponseShape,
  hintEn: z.string().nullable(),
  hintZh: z.string().nullable(),
}).strict();

export const attemptSubmissionResponseSchema: z.ZodType<
  AttemptSubmissionResponse,
  AttemptSubmissionResponse
> = z.object({
  ...trainingEventResponseShape,
  attemptId: uuidSchema,
  score: z.number().int().min(0).max(100),
}).strict();

export const solutionRevealResponseSchema: z.ZodType<
  SolutionRevealResponse,
  SolutionRevealResponse
> = z.object({
  ...trainingEventResponseShape,
  solutionEn: z.string().nullable(),
  solutionZh: z.string().nullable(),
}).strict();

export const completionResponseSchema: z.ZodType<
  CompletionResponse,
  CompletionResponse
> = z.object({
  planEffect: planEffectSchema.nullable(),
  sessionId: uuidSchema,
  sessionVersion: positiveVersionSchema,
  xpDelta: z.number().int().nonnegative(),
}).strict();

export const trainingResultResponseSchema: z.ZodType<
  TrainingResultResponse,
  TrainingResultResponse
> = z.object({
  completedAt: isoDateTimeSchema,
  planEffect: planEffectSchema.nullable(),
  problemId: uuidSchema,
  score: z.number().int().min(0).max(100),
  sessionId: uuidSchema,
  sessionVersion: positiveVersionSchema,
  xpDelta: z.number().int().nonnegative(),
}).strict();
