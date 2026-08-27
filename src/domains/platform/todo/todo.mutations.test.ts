const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

import {
  mutateTodo,
  newCompleteTodoIntent,
  newCreateTodoIntent,
  newDeleteTodoIntent,
  newUpdateTodoIntent,
} from "./todo.mutations";
import type { PlanTask } from "./todo.schema";

const task: PlanTask = {
  completedAt: null,
  createdAt: "2026-07-23T04:00:00Z",
  id: "29584c83-7297-44ef-b985-f38e6c95de76",
  sortOrder: 0,
  status: "open",
  title: "复习二分查找",
  updatedAt: "2026-07-23T04:00:00Z",
  version: 3,
};
const sessionCsrfProof = "session-proof-0123456789abcdef";

describe("Todo mutations", () => {
  beforeEach(() => {
    apiRequestMock.mockReset();
  });

  it("trims create input and sends one idempotency key", async () => {
    apiRequestMock.mockResolvedValue(task);
    const intent = newCreateTodoIntent("  复习二分查找  ");

    await expect(mutateTodo(intent, sessionCsrfProof)).resolves.toEqual(task);
    expect(apiRequestMock).toHaveBeenCalledWith("/todos", {
      body: { title: "复习二分查找" },
      csrfProof: sessionCsrfProof,
      headers: { "X-Idempotency-Key": intent.idempotencyKey },
      method: "POST",
    });
  });

  it("maps update, complete and delete to versioned V2 endpoints", async () => {
    apiRequestMock
      .mockResolvedValueOnce({ ...task, title: "新标题", version: 4 })
      .mockResolvedValueOnce({
        ...task,
        completedAt: "2026-07-23T05:00:00Z",
        status: "completed",
        version: 4,
      })
      .mockResolvedValueOnce(null);

    const updateIntent = newUpdateTodoIntent(task, { title: "新标题" });
    const completeIntent = newCompleteTodoIntent(task);
    const deleteIntent = newDeleteTodoIntent(task);
    await mutateTodo(updateIntent, sessionCsrfProof);
    await mutateTodo(completeIntent, sessionCsrfProof);
    await mutateTodo(deleteIntent, sessionCsrfProof);

    expect(apiRequestMock.mock.calls.map(([path]) => path)).toEqual([
      `/todos/${task.id}`,
      `/todos/${task.id}/complete`,
      `/todos/${task.id}?version=3`,
    ]);
    expect(apiRequestMock.mock.calls[0]?.[1]).toEqual({
      csrfProof: sessionCsrfProof,
      headers: { "X-Idempotency-Key": updateIntent.idempotencyKey },
      method: "PATCH",
      body: {
      title: "新标题",
      version: 3,
      },
    });
    expect(apiRequestMock.mock.calls[1]?.[1]).toEqual({
      body: { version: 3 },
      csrfProof: sessionCsrfProof,
      headers: { "X-Idempotency-Key": completeIntent.idempotencyKey },
      method: "POST",
    });
    expect(apiRequestMock.mock.calls[2]?.[1]).toEqual({
      csrfProof: sessionCsrfProof,
      headers: { "X-Idempotency-Key": deleteIntent.idempotencyKey },
      method: "DELETE",
    });
  });

  it("reuses the same key when the same intent is retried", async () => {
    apiRequestMock
      .mockRejectedValueOnce(new TypeError("Failed to fetch"))
      .mockResolvedValueOnce(task);
    const intent = newCreateTodoIntent(task.title);

    await expect(mutateTodo(intent, sessionCsrfProof)).rejects.toThrow();
    await mutateTodo(intent, sessionCsrfProof);

    const keys = apiRequestMock.mock.calls.map(([, init]) => (
      init?.headers?.["X-Idempotency-Key"]
    ));
    expect(keys).toEqual([intent.idempotencyKey, intent.idempotencyKey]);
  });

  it("rejects blank and overlong titles before sending", () => {
    expect(() => newCreateTodoIntent("   ")).toThrow();
    expect(() => newCreateTodoIntent("x".repeat(241))).toThrow();
  });
});
