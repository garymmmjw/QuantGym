import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState, type ReactNode } from "react";

import { ToastProvider } from "../../../design-system/patterns/ToastRegion";
import { ApiError } from "../../../shared/api/errors";
import {
  createInMemoryTodoDraftRepository,
  createTodoDraft,
  type TodoDraftRepository,
} from "./todoDrafts";
import { newCreateTodoIntent } from "./todo.mutations";
import type { PlanTask } from "./todo.schema";
import { TodoDock } from "./TodoDock";
import { TodoLauncher } from "./TodoLauncher";

const { mutateTodoMock, todosQueryMock } = vi.hoisted(() => ({
  mutateTodoMock: vi.fn(),
  todosQueryMock: vi.fn(),
}));

vi.mock("./todo.mutations", async (importOriginal) => ({
  ...await importOriginal<Record<string, unknown>>(),
  mutateTodo: mutateTodoMock,
}));

vi.mock("./todo.queries", () => ({
  todoQueryKeys: {
    all: ["plan-tasks"],
    forOwner: (ownerScope: string) => ["plan-tasks", ownerScope],
  },
  useTodosQuery: todosQueryMock,
}));

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
const ownerScope = "acct-1234567890abcdef";
const sessionCsrfProof = "session-proof-0123456789abcdef";

const queryResult = (items: readonly PlanTask[] = [task]) => ({
  data: { items },
  error: null,
  isError: false,
  isFetching: false,
  isPending: false,
  refetch: vi.fn(),
});

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return function Wrapper({ children }: Readonly<{ children: ReactNode }>) {
    return (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
  };
};

const setOnline = (online: boolean) => {
  Object.defineProperty(navigator, "onLine", {
    configurable: true,
    value: online,
  });
};

const waitForDraftEditor = async () => {
  const editor = screen.getByLabelText("新增待办") as HTMLInputElement;
  await waitFor(() => expect(editor.disabled).toBe(false));
  return editor;
};

beforeEach(() => {
  setOnline(true);
  todosQueryMock.mockReturnValue(queryResult());
  mutateTodoMock.mockResolvedValue(task);
});

describe("TodoDock", () => {
  it("renders the true empty state without demo tasks", async () => {
    todosQueryMock.mockReturnValue(queryResult([]));

    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={createInMemoryTodoDraftRepository()}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    expect(await screen.findByText("今天从一件小事开始")).toBeTruthy();
    expect(screen.queryByText("示例待办")).toBeNull();
  });

  it("supports create, edit, complete and delete with versioned intents", async () => {
    const user = userEvent.setup();
    const repository = createInMemoryTodoDraftRepository();
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    await user.type(await waitForDraftEditor(), "完成一套题");
    await user.click(screen.getByRole("button", { name: "添加" }));
    await waitFor(() => expect(mutateTodoMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      kind: "create",
      title: "完成一套题",
    })));
    expect(mutateTodoMock).toHaveBeenCalledTimes(1);
    expect(mutateTodoMock.mock.calls[0]?.[1]).toBe(sessionCsrfProof);

    const editInput = screen.getByLabelText("编辑待办");
    await user.clear(editInput);
    await user.type(editInput, "复习动态规划");
    await user.click(screen.getByRole("button", { name: "保存" }));
    await waitFor(() => expect(mutateTodoMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      kind: "update",
      taskId: task.id,
      title: "复习动态规划",
      version: 3,
    })));

    await user.click(screen.getByRole("button", { name: `完成：${task.title}` }));
    await waitFor(() => expect(mutateTodoMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      kind: "complete",
      taskId: task.id,
      version: 3,
    })));

    await user.click(screen.getByRole("button", { name: "删除" }));
    await waitFor(() => expect(mutateTodoMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      kind: "delete",
      taskId: task.id,
      version: 3,
    })));
  });

  it("keeps an offline create as a draft and does not claim server success", async () => {
    setOnline(false);
    const user = userEvent.setup();
    const repository = createInMemoryTodoDraftRepository();
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    await user.type(await waitForDraftEditor(), "离线草稿");
    await user.click(screen.getByRole("button", { name: "添加" }));

    await waitFor(async () => expect(await repository.list(ownerScope)).toHaveLength(1));
    expect(mutateTodoMock).not.toHaveBeenCalled();
    expect(screen.getAllByText("待同步").length).toBeGreaterThan(0);
    expect(screen.queryByText("待办已同步")).toBeNull();
  });

  it("keeps the editor value when local draft persistence cannot be guaranteed", async () => {
    const user = userEvent.setup();
    const failingRepository: TodoDraftRepository = {
      clear: vi.fn().mockResolvedValue(undefined),
      list: vi.fn().mockResolvedValue([]),
      put: vi.fn().mockRejectedValue(new Error("storage unavailable")),
      remove: vi.fn().mockResolvedValue(undefined),
    };
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={failingRepository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    const input = await waitForDraftEditor();
    await user.type(input, "不能丢失的输入");
    await user.click(screen.getByRole("button", { name: "添加" }));

    expect(await screen.findByRole("button", { name: "丢弃草稿" })).toBeTruthy();
    expect((input as HTMLInputElement).value).toBe("不能丢失的输入");
    expect(mutateTodoMock).not.toHaveBeenCalled();
  });

  it("keeps editing locked after a draft read failure until retry succeeds", async () => {
    const user = userEvent.setup();
    const list = vi.fn()
      .mockRejectedValueOnce(new Error("malformed persisted record"))
      .mockResolvedValueOnce([]);
    const recoveringRepository: TodoDraftRepository = {
      clear: vi.fn().mockResolvedValue(undefined),
      list,
      put: vi.fn().mockResolvedValue(undefined),
      remove: vi.fn().mockResolvedValue(undefined),
    };

    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={recoveringRepository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    const editor = screen.getByLabelText("新增待办") as HTMLInputElement;
    expect(editor.disabled).toBe(true);
    const retry = await screen.findByRole("button", { name: "重试读取" });
    expect(editor.disabled).toBe(true);
    expect(list).toHaveBeenCalledTimes(1);

    await user.click(retry);

    await waitFor(() => expect(list).toHaveBeenCalledTimes(2));
    await waitFor(() => expect(editor.disabled).toBe(false));
    expect(screen.queryByRole("button", { name: "重试读取" })).toBeNull();
  });

  it("offers an explicit discard path for a non-recoverable mutation", async () => {
    mutateTodoMock.mockRejectedValueOnce(new ApiError({
      code: "TODO_INVALID",
      message: "内容不符合要求",
      requestId: "req-invalid",
      status: 422,
    }));
    const user = userEvent.setup();
    const repository = createInMemoryTodoDraftRepository();
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    await user.type(await waitForDraftEditor(), "需要修正");
    await user.click(screen.getByRole("button", { name: "添加" }));
    await user.click(await screen.findByRole("button", { name: "丢弃草稿" }));

    await waitFor(async () => expect(await repository.list(ownerScope)).toEqual([]));
  });

  it("verifies the current session owner before syncing an account-scoped draft", async () => {
    const user = userEvent.setup();
    const repository = createInMemoryTodoDraftRepository();
    const verifyOwner = vi.fn().mockRejectedValue(new ApiError({
      code: "AUTH_SESSION_OWNER_CHANGED",
      message: "账号已变化",
      requestId: null,
      status: 401,
    }));
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        onPermissionRecovery={vi.fn()}
        open
        ownerScope={ownerScope}
        verifyOwner={verifyOwner}
      />,
      { wrapper: createWrapper() },
    );

    await user.type(await waitForDraftEditor(), "只属于当前账号");
    await user.click(screen.getByRole("button", { name: "添加" }));

    expect(await screen.findByRole("button", { name: "重新登录" })).toBeTruthy();
    expect(verifyOwner).toHaveBeenCalledOnce();
    expect(mutateTodoMock).not.toHaveBeenCalled();
    expect(await repository.list(ownerScope)).toHaveLength(1);
  });

  it("rebases a stale task intent onto the latest server version", async () => {
    const latestTask: PlanTask = { ...task, title: "服务端新标题", version: 4 };
    todosQueryMock.mockReturnValue({
      ...queryResult(),
      refetch: vi.fn().mockResolvedValue({ data: { items: [latestTask] } }),
    });
    mutateTodoMock
      .mockRejectedValueOnce(new ApiError({
        code: "TODO_VERSION_CONFLICT",
        message: "版本已更新",
        requestId: "req-stale",
        status: 409,
      }))
      .mockResolvedValueOnce({ ...latestTask, completedAt: "2026-07-23T05:00:00Z", status: "completed", version: 5 });
    const user = userEvent.setup();
    const repository = createInMemoryTodoDraftRepository();
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    await user.click(screen.getByRole("button", { name: `完成：${task.title}` }));
    await user.click(await screen.findByRole("button", { name: "载入最新后重试" }));

    await waitFor(() => expect(mutateTodoMock.mock.calls.at(-1)?.[0]).toEqual(expect.objectContaining({
      kind: "complete",
      taskId: task.id,
      version: 4,
    })));
    await waitFor(async () => expect(await repository.list(ownerScope)).toEqual([]));
  });

  it("acknowledges an unavailable replay without recreating the task", async () => {
    todosQueryMock.mockReturnValue(queryResult([]));
    mutateTodoMock.mockRejectedValueOnce(new ApiError({
      code: "TODO_REPLAY_UNAVAILABLE",
      message: "原操作已确认，但任务的当前状态不可用",
      requestId: "req-replay-unavailable",
      status: 409,
    }));
    const user = userEvent.setup();
    const repository = createInMemoryTodoDraftRepository();
    const queryClient = new QueryClient({
      defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
    });
    const invalidateQueries = vi.spyOn(queryClient, "invalidateQueries");
    const Wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
      <QueryClientProvider client={queryClient}>
        <ToastProvider>{children}</ToastProvider>
      </QueryClientProvider>
    );
    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: Wrapper },
    );

    await user.type(await waitForDraftEditor(), "只创建一次");
    await user.click(screen.getByRole("button", { name: "添加" }));

    await waitFor(async () => expect(await repository.list(ownerScope)).toEqual([]));
    expect(mutateTodoMock).toHaveBeenCalledTimes(1);
    expect(invalidateQueries).toHaveBeenCalledWith({
      queryKey: ["plan-tasks", ownerScope],
    });
    expect(screen.queryByRole("button", { name: "载入最新后重试" })).toBeNull();
    expect(await screen.findByText("待办已同步")).toBeTruthy();
  });

  it("continues flushing independent drafts after one recoverable failure", async () => {
    const repository = createInMemoryTodoDraftRepository();
    await repository.put(createTodoDraft(newCreateTodoIntent("第一条"), ownerScope));
    await repository.put(createTodoDraft(newCreateTodoIntent("第二条"), ownerScope));
    mutateTodoMock
      .mockRejectedValueOnce(new ApiError({
        code: "TEMPORARY_FAILURE",
        message: "稍后重试",
        requestId: "req-retry",
        retryable: true,
        status: 503,
      }))
      .mockResolvedValueOnce(task);

    render(
      <TodoDock
        csrfProof={sessionCsrfProof}
        draftRepository={repository}
        language="zh-CN"
        onOpenChange={vi.fn()}
        open
        ownerScope={ownerScope}
      />,
      { wrapper: createWrapper() },
    );

    await waitFor(() => expect(mutateTodoMock).toHaveBeenCalledTimes(2));
    await waitFor(async () => expect(await repository.list(ownerScope)).toHaveLength(1));
  });

  it("restores focus to the floating launcher after closing", async () => {
    const user = userEvent.setup();
    function Harness() {
      const [open, setOpen] = useState(false);
      const launcherRef = useRef<HTMLButtonElement>(null);
      return (
        <>
          <TodoLauncher
            language="zh-CN"
            onClick={() => setOpen(true)}
            ref={launcherRef}
          />
          <TodoDock
            csrfProof={sessionCsrfProof}
            draftRepository={createInMemoryTodoDraftRepository()}
            language="zh-CN"
            onOpenChange={setOpen}
            open={open}
            ownerScope={ownerScope}
            returnFocusRef={launcherRef}
          />
        </>
      );
    }
    render(<Harness />, { wrapper: createWrapper() });
    const launcher = screen.getByRole("button", { name: /打开今日待办/ });

    await user.click(launcher);
    await user.click(screen.getByRole("button", { name: "关闭今日待办" }));

    expect(launcher.matches(":focus")).toBe(true);
  });
});
