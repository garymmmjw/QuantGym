import { queryOptions, useQuery } from "@tanstack/react-query";

import { apiRequest } from "../../../shared/api/client";
import { todoListResponseSchema } from "./todo.schema";

export const todoQueryKeys = {
  all: ["plan-tasks"] as const,
  forOwner: (ownerScope: string) => ["plan-tasks", ownerScope] as const,
} as const;

export const listTodos = async (signal?: AbortSignal) => {
  const response = await apiRequest<unknown>(
    "/todos",
    signal === undefined ? {} : { signal },
  );
  return todoListResponseSchema.parse(response);
};

export const todoQueryOptions = (ownerScope: string) => queryOptions({
  queryFn: ({ signal }) => listTodos(signal),
  queryKey: todoQueryKeys.forOwner(ownerScope),
  retry: false,
});

export const useTodosQuery = (ownerScope: string, enabled = true) => useQuery({
  ...todoQueryOptions(ownerScope),
  enabled,
});
