import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { delay, http, HttpResponse } from "msw";
import { setupServer } from "msw/node";
import {
  useRef,
  useState,
} from "react";

import { ToastProvider } from "../../../design-system/patterns/ToastRegion";
import { createAccountScope } from "../../../shared/lib/accountScope";
import { NotificationCenter } from "./NotificationCenter";

const notificationId = "10000000-0000-4000-8000-000000000001";
const accountEmail = "notification-owner@example.com";
const ownerScope = createAccountScope(accountEmail);
const csrfToken = "c".repeat(43);
const unreadNotification = {
  body: "完成今天的概率训练，即可保持连胜。",
  createdAt: "2026-07-23T08:30:00+08:00",
  id: notificationId,
  kind: "training-reminder",
  readAt: null,
  title: "今日训练提醒",
} as const;
const emptyResponse = {
  items: [],
  nextCursor: null,
  unreadCount: 0,
} as const;

const server = setupServer();
const queryClients: QueryClient[] = [];

const renderCenter = (
  props: Partial<React.ComponentProps<typeof NotificationCenter>> = {},
) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      mutations: { retry: false },
      queries: { retry: false },
    },
  });
  queryClients.push(queryClient);
  return {
    queryClient,
    ...render(
      <QueryClientProvider client={queryClient}>
        <ToastProvider defaultDurationMs={60_000}>
          <NotificationCenter
            csrfProof={csrfToken}
            language="zh-CN"
            onOpenChange={vi.fn()}
            open
            ownerScope={ownerScope}
            {...props}
          />
        </ToastProvider>
      </QueryClientProvider>,
    ),
  };
};

beforeAll(() => server.listen({ onUnhandledRequest: "error" }));

beforeEach(() => {
  vi.spyOn(document, "cookie", "get").mockReturnValue(`__Host-qg_csrf=${csrfToken}`);
  server.use(http.get("*/api/v2/me", () => HttpResponse.json({ email: accountEmail })));
});

afterEach(() => {
  cleanup();
  server.resetHandlers();
  for (const queryClient of queryClients.splice(0)) queryClient.clear();
  vi.restoreAllMocks();
});

afterAll(() => server.close());

describe("NotificationCenter", () => {
  it("renders a real empty state without seeded or fabricated notifications", async () => {
    server.use(http.get("*/api/v2/notifications", () => HttpResponse.json(emptyResponse)));

    renderCenter();

    const dialog = screen.getByRole("dialog", { name: "通知中心" });
    expect(dialog).toBeVisible();
    expect(await screen.findByRole("heading", { name: "暂时没有通知" })).toBeVisible();
    expect(screen.getByText("新的训练提醒、进度更新和系统消息会出现在这里。")).toBeVisible();
    expect(within(dialog).queryByRole("list")).not.toBeInTheDocument();
    expect(screen.queryByText("今日训练提醒")).not.toBeInTheDocument();
  });

  it("supports English copy through its local language prop", async () => {
    server.use(http.get("*/api/v2/notifications", () => HttpResponse.json(emptyResponse)));

    renderCenter({ language: "en" });

    expect(screen.getByRole("dialog", { name: "Notifications" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "You’re all caught up" })).toBeVisible();
    expect(screen.getByRole("button", { name: "Close notification center" })).toBeVisible();
  });

  it("reserves the final row layout while the server response is pending", async () => {
    server.use(http.get("*/api/v2/notifications", async () => {
      await delay(150);
      return HttpResponse.json(emptyResponse);
    }));

    renderCenter();

    expect(screen.getByRole("status", { name: "正在载入通知" })).toBeVisible();
    expect(await screen.findByRole("heading", { name: "暂时没有通知" })).toBeVisible();
  });

  it("does not mark a notification read until PATCH acknowledgement arrives", async () => {
    let acknowledge: (() => void) | undefined;
    const acknowledgementGate = new Promise<void>((resolve) => {
      acknowledge = resolve;
    });
    server.use(
      http.get("*/api/v2/notifications", () => HttpResponse.json({
        items: [unreadNotification],
        nextCursor: null,
        unreadCount: 1,
      })),
      http.patch("*/api/v2/notifications/:id/read", async ({ params, request }) => {
        expect(params.id).toBe(notificationId);
        expect(request.headers.get("x-csrf-token")).toBe(csrfToken);
        await acknowledgementGate;
        return HttpResponse.json({
          ...unreadNotification,
          readAt: "2026-07-23T09:00:00+08:00",
        });
      }),
    );
    const user = userEvent.setup();
    renderCenter();

    expect(await screen.findByText("今日训练提醒")).toBeVisible();
    expect(screen.getByText("1 条未读通知")).toBeVisible();
    const markRead = screen.getByRole("button", { name: "标为已读: 今日训练提醒" });
    await user.click(markRead);

    expect(markRead).toBeDisabled();
    expect(screen.getByText("1 条未读通知")).toBeVisible();
    expect(screen.queryByText("通知已标为已读")).not.toBeInTheDocument();

    acknowledge?.();

    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "标为已读: 今日训练提醒" }))
        .not.toBeInTheDocument();
    });
    expect(screen.getByText("没有未读通知")).toBeVisible();
    expect(screen.getByText("通知已标为已读")).toBeVisible();
    expect(screen.getByRole("region", { name: "通知" })).toHaveAttribute("aria-live", "polite");
  });

  it("keeps a failed notification unread and retries from the inline recovery state", async () => {
    let shouldFail = true;
    let patchCount = 0;
    server.use(
      http.get("*/api/v2/notifications", () => HttpResponse.json({
        items: [unreadNotification],
        nextCursor: null,
        unreadCount: 1,
      })),
      http.patch("*/api/v2/notifications/:id/read", () => {
        patchCount += 1;
        if (shouldFail) {
          return HttpResponse.json({
            code: "NOTIFICATION_SERVICE_UNAVAILABLE",
            fieldErrors: {},
            message: "通知服务暂时不可用。",
            requestId: "request-notification-retry",
            retryable: true,
          }, {
            headers: { "x-request-id": "request-notification-retry" },
            status: 503,
          });
        }
        return HttpResponse.json({
          ...unreadNotification,
          readAt: "2026-07-23T09:00:00+08:00",
        });
      }),
    );
    const user = userEvent.setup();
    renderCenter();

    await user.click(await screen.findByRole("button", {
      name: "标为已读: 今日训练提醒",
    }));

    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveAttribute("data-recovery-state", "recoverable-error");
    expect(recovery).toHaveTextContent("通知仍保持未读");
    expect(recovery).toHaveTextContent("request-notification-retry");
    expect(screen.getByText("1 条未读通知")).toBeVisible();
    expect(screen.getByRole("button", { name: "标为已读: 今日训练提醒" })).toBeVisible();

    shouldFail = false;
    await user.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(patchCount).toBe(2));
    await waitFor(() => {
      expect(screen.queryByRole("button", { name: "标为已读: 今日训练提醒" }))
        .not.toBeInTheDocument();
    });
    expect(screen.getByText("没有未读通知")).toBeVisible();
  });

  it("shows query-level recovery without inventing an empty state", async () => {
    server.use(http.get("*/api/v2/notifications", () => HttpResponse.json({
      code: "NOTIFICATION_QUERY_UNAVAILABLE",
      fieldErrors: {},
      message: "通知列表暂时不可用。",
      requestId: "request-notification-query",
      retryable: true,
    }, {
      headers: { "x-request-id": "request-notification-query" },
      status: 503,
    })));

    renderCenter();

    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveAttribute("data-recovery-state", "recoverable-error");
    expect(recovery).toHaveTextContent("request-notification-query");
    expect(screen.queryByRole("heading", { name: "暂时没有通知" })).not.toBeInTheDocument();
  });

  it("closes as a controlled surface and returns focus to its launcher", async () => {
    server.use(http.get("*/api/v2/notifications", () => HttpResponse.json(emptyResponse)));

    const Harness = () => {
      const [open, setOpen] = useState(false);
      const launcherRef = useRef<HTMLButtonElement>(null);
      return (
        <QueryClientProvider client={new QueryClient({
          defaultOptions: { queries: { retry: false } },
        })}>
          <ToastProvider>
            <button ref={launcherRef} type="button" onClick={() => setOpen(true)}>
              打开测试通知
            </button>
            <NotificationCenter
              csrfProof={csrfToken}
              language="zh-CN"
              onOpenChange={setOpen}
              open={open}
              ownerScope={ownerScope}
              returnFocusRef={launcherRef}
            />
          </ToastProvider>
        </QueryClientProvider>
      );
    };
    const user = userEvent.setup();
    render(<Harness />);

    const launcher = screen.getByRole("button", { name: "打开测试通知" });
    await user.click(launcher);
    await user.click(screen.getByRole("button", { name: "关闭通知中心" }));

    expect(screen.queryByRole("dialog", { name: "通知中心" })).not.toBeInTheDocument();
    expect(launcher).toHaveFocus();
  });
});
