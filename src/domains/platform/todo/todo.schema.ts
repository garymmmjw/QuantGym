import { z } from "zod";

const isoDateTime = z.string().datetime({ offset: true });

export const planTaskSchema = z.object({
  completedAt: isoDateTime.nullable(),
  createdAt: isoDateTime,
  id: z.string().uuid(),
  sortOrder: z.number().int().nonnegative(),
  status: z.enum(["open", "completed"]),
  title: z.string().trim().min(1).max(240),
  updatedAt: isoDateTime,
  version: z.number().int().positive(),
}).strict();

export const todoListResponseSchema = z.object({
  items: z.array(planTaskSchema),
}).strict();

export const todoTitleSchema = z.string().trim().min(1).max(240);

export type PlanTask = z.infer<typeof planTaskSchema>;
export type TodoListResponse = z.infer<typeof todoListResponseSchema>;
