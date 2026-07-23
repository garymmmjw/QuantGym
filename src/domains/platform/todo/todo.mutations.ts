import { apiRequest } from "../../../shared/api/client";
import { createIdempotencyKey } from "../../../shared/api/mutationRecovery";
import { planTaskSchema, todoTitleSchema, type PlanTask } from "./todo.schema";

type BaseTodoIntent = Readonly<{
  idempotencyKey: string;
}>;

export type CreateTodoIntent = BaseTodoIntent & Readonly<{
  kind: "create";
  sortOrder?: number;
  title: string;
}>;

export type UpdateTodoIntent = BaseTodoIntent & Readonly<{
  kind: "update";
  sortOrder?: number;
  taskId: string;
  title?: string;
  version: number;
}>;

export type CompleteTodoIntent = BaseTodoIntent & Readonly<{
  kind: "complete";
  taskId: string;
  version: number;
}>;

export type DeleteTodoIntent = BaseTodoIntent & Readonly<{
  kind: "delete";
  taskId: string;
  version: number;
}>;

export type TodoMutationIntent =
  | CreateTodoIntent
  | UpdateTodoIntent
  | CompleteTodoIntent
  | DeleteTodoIntent;

const idempotencyHeaders = (key: string) => ({
  "X-Idempotency-Key": key,
});

export const newCreateTodoIntent = (title: string, sortOrder?: number): CreateTodoIntent => ({
  idempotencyKey: createIdempotencyKey(),
  kind: "create",
  ...(sortOrder === undefined ? {} : { sortOrder }),
  title: todoTitleSchema.parse(title),
});

export const newUpdateTodoIntent = (
  task: PlanTask,
  updates: Readonly<{ title?: string; sortOrder?: number }>,
): UpdateTodoIntent => ({
  idempotencyKey: createIdempotencyKey(),
  kind: "update",
  ...(updates.sortOrder === undefined ? {} : { sortOrder: updates.sortOrder }),
  ...(updates.title === undefined ? {} : { title: todoTitleSchema.parse(updates.title) }),
  taskId: task.id,
  version: task.version,
});

export const newCompleteTodoIntent = (task: PlanTask): CompleteTodoIntent => ({
  idempotencyKey: createIdempotencyKey(),
  kind: "complete",
  taskId: task.id,
  version: task.version,
});

export const newDeleteTodoIntent = (task: PlanTask): DeleteTodoIntent => ({
  idempotencyKey: createIdempotencyKey(),
  kind: "delete",
  taskId: task.id,
  version: task.version,
});

export const mutateTodo = async (
  intent: TodoMutationIntent,
  csrfProof: string | null,
): Promise<PlanTask | null> => {
  switch (intent.kind) {
    case "create": {
      const response = await apiRequest<unknown>("/todos", {
        body: {
          ...(intent.sortOrder === undefined ? {} : { sortOrder: intent.sortOrder }),
          title: todoTitleSchema.parse(intent.title),
        },
        csrfProof,
        headers: idempotencyHeaders(intent.idempotencyKey),
        method: "POST",
      });
      return planTaskSchema.parse(response);
    }
    case "update": {
      const response = await apiRequest<unknown>(`/todos/${encodeURIComponent(intent.taskId)}`, {
        body: {
          ...(intent.sortOrder === undefined ? {} : { sortOrder: intent.sortOrder }),
          ...(intent.title === undefined ? {} : { title: todoTitleSchema.parse(intent.title) }),
          version: intent.version,
        },
        csrfProof,
        headers: idempotencyHeaders(intent.idempotencyKey),
        method: "PATCH",
      });
      return planTaskSchema.parse(response);
    }
    case "complete": {
      const response = await apiRequest<unknown>(
        `/todos/${encodeURIComponent(intent.taskId)}/complete`,
        {
          body: { version: intent.version },
          csrfProof,
          headers: idempotencyHeaders(intent.idempotencyKey),
          method: "POST",
        },
      );
      return planTaskSchema.parse(response);
    }
    case "delete":
      await apiRequest<null>(
        `/todos/${encodeURIComponent(intent.taskId)}?version=${encodeURIComponent(String(intent.version))}`,
        {
          csrfProof,
          headers: idempotencyHeaders(intent.idempotencyKey),
          method: "DELETE",
        },
      );
      return null;
  }
};
