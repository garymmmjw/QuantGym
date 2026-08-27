import { z } from "zod";

import type { components, operations } from "../../shared/api/generated/schema";

type FavoriteStateContract = components["schemas"]["FavoriteStateResponse"];
type NoteContract = components["schemas"]["NoteResponse"];
type ProblemDetailContract = components["schemas"]["ProblemDetailResponse"];
type ProblemListContract = components["schemas"]["ProblemListResponse"];
type ProblemProgressContract = components["schemas"]["ProblemProgressResponse"];
type ProblemSourceContract = components["schemas"]["ProblemSourceResponse"];
type ProblemSummaryContract = components["schemas"]["ProblemSummaryResponse"];
type SaveProblemNoteContract = components["schemas"]["SaveNoteRequest"];
type SetProblemFavoriteContract = components["schemas"]["SetFavoriteRequest"];
type ProblemListQueryContract = NonNullable<
  operations["listProblems"]["parameters"]["query"]
>;

const isoDateTimeSchema = z.string().datetime({ offset: true });
const nullableIsoDateTimeSchema = isoDateTimeSchema.nullable();

export const problemIdSchema = z.string().uuid();
export const problemDifficultySchema = z.enum(["Easy", "Medium", "Hard"]);
export const problemStatusSchema = z.enum(["unstarted", "in_progress", "completed"]);

export const problemSourceSchema = z.object({
  contentVersion: z.string().trim().min(1).max(64),
  name: z.string().trim().min(1).max(200),
  slug: z.string().trim().min(1).max(120),
}).strict() satisfies z.ZodType<ProblemSourceContract>;

export const problemProgressSchema = z.object({
  attemptCount: z.number().int().nonnegative(),
  bestScore: z.number().int().min(0).max(100).nullable(),
  completedAt: nullableIsoDateTimeSchema,
  hintCount: z.number().int().nonnegative(),
  lastPracticedAt: nullableIsoDateTimeSchema,
  lastScore: z.number().int().min(0).max(100).nullable(),
  solutionRevealedAt: nullableIsoDateTimeSchema,
  status: problemStatusSchema,
  version: z.number().int().positive().nullable().optional().default(null),
}).strict() satisfies z.ZodType<ProblemProgressContract>;

export const favoriteStateSchema = z.object({
  favorite: z.boolean(),
  stateId: z.string().uuid().nullable(),
  updatedAt: nullableIsoDateTimeSchema,
  version: z.number().int().positive().nullable().optional().default(null),
}).strict().superRefine((state, context) => {
  const hasGeneration = (
    state.stateId !== null
    && state.updatedAt !== null
    && state.version !== null
  );
  const hasNoGeneration = (
    state.stateId === null
    && state.updatedAt === null
    && state.version === null
  );
  if ((state.favorite && !hasGeneration) || (!state.favorite && !hasNoGeneration)) {
    context.addIssue({
      code: "custom",
      message: "Favorite state and generation must be coherent.",
    });
  }
}) satisfies z.ZodType<FavoriteStateContract>;

export const problemNoteSchema = z.object({
  body: z.string().min(1).max(20_000),
  updatedAt: isoDateTimeSchema,
  version: z.number().int().positive(),
}).strict() satisfies z.ZodType<NoteContract>;

const problemSummaryFields = {
  category: z.string().trim().min(1).max(80),
  companies: z.array(z.string()),
  difficulty: problemDifficultySchema,
  favorite: favoriteStateSchema,
  hot100: z.boolean(),
  id: problemIdSchema,
  noteExists: z.boolean(),
  noteVersion: z.number().int().positive().nullable(),
  progress: problemProgressSchema,
  source: problemSourceSchema,
  tags: z.array(z.string()),
  titleEn: z.string().nullable(),
  titleZh: z.string().nullable(),
  version: z.number().int().positive(),
} as const;

const validateSummary = (
  problem: Readonly<{ noteExists: boolean; noteVersion: number | null }>,
  context: z.RefinementCtx,
) => {
  if (problem.noteExists !== (problem.noteVersion !== null)) {
    context.addIssue({
      code: "custom",
      message: "Problem note existence and version must be coherent.",
      path: ["noteVersion"],
    });
  }
};

export const problemSummarySchema = z.object(problemSummaryFields)
  .strict()
  .superRefine(validateSummary) satisfies z.ZodType<ProblemSummaryContract>;

export const problemDetailSchema = z.object({
  ...problemSummaryFields,
  note: problemNoteSchema.nullable(),
  promptEn: z.string().nullable(),
  promptZh: z.string().nullable(),
}).strict().superRefine((problem, context) => {
  validateSummary(problem, context);
  if (
    problem.noteExists !== (problem.note !== null)
    || (problem.note !== null && problem.note.version !== problem.noteVersion)
  ) {
    context.addIssue({
      code: "custom",
      message: "Problem note projection must match its summary version.",
      path: ["note"],
    });
  }
}) satisfies z.ZodType<ProblemDetailContract>;

export const problemListResponseSchema = z.object({
  availableSources: z.array(problemSourceSchema),
  items: z.array(problemSummarySchema),
  nextCursor: z.string().trim().min(1).max(512).nullable(),
}).strict() satisfies z.ZodType<ProblemListContract>;

export const problemListFiltersSchema = z.object({
  cursor: z.string().trim().min(1).max(512).nullable().optional(),
  daily: z.boolean().optional(),
  difficulty: problemDifficultySchema.nullable().optional(),
  favorite: z.boolean().nullable().optional(),
  hot100: z.boolean().nullable().optional(),
  limit: z.number().int().min(1).max(50).optional(),
  q: z.string().trim().min(1).max(120).nullable().optional(),
  source: z.string()
    .trim()
    .min(1)
    .max(120)
    .regex(/^[a-z0-9][a-z0-9-]*$/u)
    .nullable()
    .optional(),
  status: problemStatusSchema.nullable().optional(),
}).strict();

export const saveProblemNoteInputSchema = z.object({
  body: z.string()
    .min(1)
    .max(20_000)
    .refine((body) => body.trim().length > 0 && !body.includes("\0"), {
      message: "Note must contain visible supported text.",
    }),
  expectedVersion: z.number().int().positive().nullable().optional(),
}).strict();

export const setProblemFavoriteInputSchema = z.object({
  expectedStateId: z.string().uuid().nullable().optional(),
  expectedVersion: z.number().int().positive().nullable().optional(),
  favorite: z.boolean(),
}).strict().superRefine((input, context) => {
  const hasStateId = input.expectedStateId !== undefined && input.expectedStateId !== null;
  const hasVersion = input.expectedVersion !== undefined && input.expectedVersion !== null;
  if (hasStateId !== hasVersion) {
    context.addIssue({
      code: "custom",
      message: "Favorite state ID and version must be supplied together.",
    });
  }
});

export type FavoriteState = z.output<typeof favoriteStateSchema>;
export type ProblemDetail = z.output<typeof problemDetailSchema>;
export type ProblemDifficulty = z.output<typeof problemDifficultySchema>;
export type ProblemListFilters = Readonly<ProblemListQueryContract>;
export type ProblemListResponse = z.output<typeof problemListResponseSchema>;
export type ProblemNote = z.output<typeof problemNoteSchema>;
export type ProblemProgress = z.output<typeof problemProgressSchema>;
export type ProblemStatus = z.output<typeof problemStatusSchema>;
export type ProblemSummary = z.output<typeof problemSummarySchema>;
export type SaveProblemNoteInput = Readonly<SaveProblemNoteContract>;
export type SetProblemFavoriteInput = Readonly<SetProblemFavoriteContract>;
