import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter, useLocation } from "react-router-dom";

import { authQueryKeys } from "../../domains/account/auth/auth.queries";
import type { MeResponse } from "../../domains/account/auth/auth.schema";
import { ApiError } from "../../shared/api/errors";
import { recoverableDraftOwnerBoundary } from "../../shared/storage/draftOwnerBoundary";
import { RuntimeProviders } from "../providers/RuntimeProviders";
import { AuthenticatedPlatformShell } from "./AuthenticatedPlatformShell";
import {
  clearPreferenceSyncDrafts,
  preferenceController,
} from "../../domains/platform/preferences";

const shellMocks = vi.hoisted(() => ({
  apiRequest: vi.fn(),
  registerPlanReplay: vi.fn(),
  registerProblemReplay: vi.fn(),
  registerTrainingReplay: vi.fn(),
  stopPlanReplay: vi.fn(),
  stopProblemReplay: vi.fn(),
  stopTrainingReplay: vi.fn(),
}));

vi.mock("../../shared/api/client", () => ({ apiRequest: shellMocks.apiRequest }));
vi.mock("../../domains/training/training.recovery", () => ({
  registerTrainingDraftReconnectReplay: (
    options: Record<string, unknown>,
  ) => shellMocks.registerTrainingReplay(options),
}));
vi.mock("../../domains/plan/plan.recovery", () => ({
  registerPlanDraftReconnectReplay: (
    options: Record<string, unknown>,
  ) => shellMocks.registerPlanReplay(options),
}));
vi.mock("../../domains/problems/problems.recovery", () => ({
  registerProblemDraftReconnectReplay: (
    options: Record<string, unknown>,
  ) => shellMocks.registerProblemReplay(options),
}));

const apiRequestMock = shellMocks.apiRequest;

const currentUser: MeResponse = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: { language: "zh-CN", theme: "light", version: 4 },
};
const sessionCsrfProof = "mounted-session-proof-0123456789abcdef";
let liveCsrfCookie = `__Host-qg_csrf=${sessionCsrfProof}`;

const createDeferred = <Value,>() => {
  let resolve!: (value: Value) => void;
  let reject!: (reason: unknown) => void;
  const promise = new Promise<Value>((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, reject, resolve };
};

const LocationProbe = () => {
  const location = useLocation();
  return <output data-testid="location">{location.pathname}{location.search}</output>;
};

const renderShell = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  return {
    queryClient,
    ...render(
      <RuntimeProviders>
        <QueryClientProvider client={queryClient}>
          <MemoryRouter initialEntries={["/"]}>
            <AuthenticatedPlatformShell currentUser={currentUser}>
              <h1>总览</h1>
              <LocationProbe />
            </AuthenticatedPlatformShell>
          </MemoryRouter>
        </QueryClientProvider>
      </RuntimeProviders>,
    ),
  };
};

beforeEach(async () => {
  preferenceController.reset();
  clearPreferenceSyncDrafts();
  await recoverableDraftOwnerBoundary.cancelLogout();
  liveCsrfCookie = `__Host-qg_csrf=${sessionCsrfProof}`;
  shellMocks.registerTrainingReplay.mockReturnValue(
    shellMocks.stopTrainingReplay,
  );
  shellMocks.registerPlanReplay.mockReturnValue(shellMocks.stopPlanReplay);
  shellMocks.registerProblemReplay.mockReturnValue(shellMocks.stopProblemReplay);
  vi.spyOn(document, "cookie", "get").mockImplementation(() => liveCsrfCookie);
  apiRequestMock.mockImplementation((
    path: string,
    options?: Readonly<{ body?: Record<string, unknown>; method?: string }>,
  ) => {
    if (path === "/me") return Promise.resolve(currentUser);
    if (path === "/notifications") {
      return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
    }
    if (path === "/todos") return Promise.resolve({ items: [] });
    if (path === "/preferences") {
      return Promise.resolve({
        ...currentUser.preferences,
        ...options?.body,
        version: currentUser.preferences.version + 1,
      });
    }
    if (path === "/auth/logout") return Promise.resolve({ status: "ok" });
    throw new Error(`UNHANDLED_TEST_API:${path}`);
  });
});

describe("AuthenticatedPlatformShell", () => {
  it("registers owner-verified training, plan, and problem reconnect replay and cleans them up", async () => {
    const { queryClient, unmount } = renderShell();

    await waitFor(() => expect(shellMocks.registerTrainingReplay).toHaveBeenCalledOnce());
    expect(shellMocks.registerTrainingReplay).toHaveBeenCalledWith(expect.objectContaining({
      csrfProof: sessionCsrfProof,
      onError: expect.any(Function),
      onReport: expect.any(Function),
      ownerScope: expect.stringMatching(/^acct-[a-f0-9]{16}$/u),
      queryClient,
      verifyOwner: expect.any(Function),
    }));
    await waitFor(() => expect(shellMocks.registerPlanReplay).toHaveBeenCalledOnce());
    expect(shellMocks.registerPlanReplay).toHaveBeenCalledWith(expect.objectContaining({
      csrfProof: sessionCsrfProof,
      onError: expect.any(Function),
      onReport: expect.any(Function),
      ownerScope: expect.stringMatching(/^acct-[a-f0-9]{16}$/u),
      queryClient,
      verifyOwner: expect.any(Function),
    }));
    await waitFor(() => expect(shellMocks.registerProblemReplay).toHaveBeenCalledOnce());
    expect(shellMocks.registerProblemReplay).toHaveBeenCalledWith(expect.objectContaining({
      csrfProof: sessionCsrfProof,
      onError: expect.any(Function),
      onReport: expect.any(Function),
      ownerScope: expect.stringMatching(/^acct-[a-f0-9]{16}$/u),
      queryClient,
      verifyOwner: expect.any(Function),
    }));

    unmount();
    expect(shellMocks.stopTrainingReplay).toHaveBeenCalledOnce();
    expect(shellMocks.stopPlanReplay).toHaveBeenCalledOnce();
    expect(shellMocks.stopProblemReplay).toHaveBeenCalledOnce();
  });

  it("keeps same-owner preference versions monotonic when owner checks resolve out of order", async () => {
    const staleCurrentUser = createDeferred<MeResponse>();
    const freshCurrentUser = createDeferred<MeResponse>();
    let meRequestCount = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/me") {
        meRequestCount += 1;
        if (meRequestCount === 1) return Promise.resolve(currentUser);
        return meRequestCount === 2
          ? staleCurrentUser.promise
          : freshCurrentUser.promise;
      }
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const { queryClient } = renderShell();

    await waitFor(() => expect(shellMocks.registerPlanReplay).toHaveBeenCalledOnce());
    await waitFor(() => expect(meRequestCount).toBe(1));
    const { verifyOwner } = shellMocks.registerPlanReplay.mock.calls[0]?.[0] as {
      readonly verifyOwner: (signal?: AbortSignal) => Promise<void>;
    };
    const staleVerification = verifyOwner();
    const freshVerification = verifyOwner();
    await waitFor(() => expect(meRequestCount).toBe(3));

    const freshPreferences = { language: "en", theme: "dark", version: 9 } as const;
    const freshResponse: MeResponse = {
      ...currentUser,
      displayName: "Gary Current",
      preferences: freshPreferences,
    };
    await act(async () => {
      freshCurrentUser.resolve(freshResponse);
      await freshVerification;
    });
    expect(queryClient.getQueryData(authQueryKeys.me)).toEqual(freshResponse);

    await act(async () => {
      staleCurrentUser.resolve({
        ...currentUser,
        displayName: "Gary From Older Response",
      });
      await staleVerification;
    });

    expect(queryClient.getQueryData<MeResponse>(authQueryKeys.me)?.preferences)
      .toEqual(freshPreferences);
  });

  it("still rejects a changed owner before merging a cached preference version", async () => {
    const otherUser: MeResponse = {
      displayName: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      preferences: { language: "en", theme: "dark", version: 3 },
    };
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/me") return Promise.resolve(otherUser);
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const { queryClient } = renderShell();
    const cachedUser: MeResponse = {
      ...currentUser,
      preferences: { language: "zh-CN", theme: "light", version: 12 },
    };
    queryClient.setQueryData(authQueryKeys.me, cachedUser);

    await waitFor(() => expect(shellMocks.registerPlanReplay).toHaveBeenCalledOnce());
    const { verifyOwner } = shellMocks.registerPlanReplay.mock.calls[0]?.[0] as {
      readonly verifyOwner: (signal?: AbortSignal) => Promise<void>;
    };

    await expect(verifyOwner()).rejects.toMatchObject({
      code: "AUTH_SESSION_OWNER_CHANGED",
      status: 401,
    });
    expect(queryClient.getQueryData(authQueryKeys.me)).toEqual(cachedUser);
  });

  it("keeps search, notifications and Todo mutually exclusive with focus restoration", async () => {
    const user = userEvent.setup();
    renderShell();
    const searchTrigger = screen.getByRole("button", { name: /搜索题目、公司、课程/ });

    await user.click(searchTrigger);
    const searchDialog = await screen.findByRole(
      "dialog",
      { name: "全局搜索" },
      { timeout: 5_000 },
    );
    expect(screen.getByRole("combobox", { name: "全局搜索" })).toHaveFocus();
    await user.keyboard("{Escape}");
    expect(searchDialog).not.toBeInTheDocument();
    expect(searchTrigger).toHaveFocus();

    const notificationTrigger = screen.getAllByRole("button", { name: "打开通知" })[0];
    expect(notificationTrigger).toBeDefined();
    await user.click(notificationTrigger as HTMLElement);
    expect(await screen.findByRole(
      "dialog",
      { name: "通知中心" },
      { timeout: 5_000 },
    )).toBeVisible();
    await user.keyboard("{Meta>}k{/Meta}");
    expect(screen.queryByRole("dialog", { name: "全局搜索" })).not.toBeInTheDocument();
    await user.keyboard("{Escape}");

    await user.click(screen.getByRole("button", { name: /打开今日待办/ }));
    expect(await screen.findByRole(
      "dialog",
      { name: "今日待办" },
      { timeout: 5_000 },
    )).toBeVisible();
    expect(screen.queryByRole("dialog", { name: "通知中心" })).not.toBeInTheDocument();
  }, 15_000);

  it("navigates only through clearly labelled compatibility search results", async () => {
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: /搜索题目、公司、课程/ }));
    const input = await screen.findByRole("combobox", { name: "全局搜索" });
    await user.type(input, "公司");
    await waitFor(() => expect(screen.getByText("兼容预览")).toBeVisible());
    await user.keyboard("{Enter}");

    expect(screen.getByTestId("location")).toHaveTextContent("/companies");
  });

  it("persists preferences through the versioned API and clears the session on logout", async () => {
    const user = userEvent.setup();
    const { queryClient } = renderShell();

    await user.click(screen.getAllByRole("button", { name: "切换到深色主题" })[0] as HTMLElement);
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/preferences", {
      body: { theme: "dark", version: 4 },
      csrfProof: sessionCsrfProof,
      method: "PATCH",
    }));

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "退出登录" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/auth/logout",
      { csrfProof: sessionCsrfProof, method: "POST" },
    ));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    expect(queryClient.getQueryData(["auth", "me"])).toBeUndefined();
    expect(queryClient.getQueryData(["plan-tasks"])).toBeUndefined();
  });

  it("persists the local cleanup boundary before calling the logout API", async () => {
    const order: string[] = [];
    const beginLogout = vi.spyOn(recoverableDraftOwnerBoundary, "beginLogout")
      .mockImplementation(async () => {
        order.push("boundary");
      });
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/me") return Promise.resolve(currentUser);
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      if (path === "/auth/logout") {
        order.push("request");
        return Promise.resolve({ status: "ok" });
      }
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "退出登录" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
    expect(beginLogout).toHaveBeenCalledOnce();
    expect(order).toEqual(["boundary", "request"]);
  });

  it("does not call the logout API when the durable cleanup boundary is unavailable", async () => {
    vi.spyOn(recoverableDraftOwnerBoundary, "beginLogout").mockRejectedValueOnce(
      new Error("RECOVERABLE_DRAFT_DATABASE_UNAVAILABLE"),
    );
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "退出登录" }));

    expect(await screen.findByText("退出前需要确认账号")).toBeVisible();
    expect(apiRequestMock).not.toHaveBeenCalledWith(
      "/auth/logout",
      expect.anything(),
    );
    expect(screen.getByTestId("location")).toHaveTextContent("/");
  });

  it("makes the logout retry actionable as soon as its recovery toast is visible", async () => {
    let logoutAttemptCount = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/me") return Promise.resolve(currentUser);
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      if (path === "/auth/logout") {
        logoutAttemptCount += 1;
        if (logoutAttemptCount === 1) {
          return Promise.reject(new ApiError({
            code: "AUTH_SERVICE_UNAVAILABLE",
            message: "认证服务暂时不可用。",
            requestId: "request-logout-retry",
            retryable: true,
            status: 503,
          }));
        }
        return Promise.resolve({ status: "ok" });
      }
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "退出登录" }));
    expect(await screen.findByText("暂时无法退出")).toBeVisible();

    await user.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(logoutAttemptCount).toBe(2));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
  });

  it("keeps the mounted proof when the cookie rotates as owner verification completes", async () => {
    const user = userEvent.setup();
    renderShell();
    apiRequestMock.mockImplementation((
      path: string,
      options?: Readonly<{ body?: Record<string, unknown>; method?: string }>,
    ) => {
      if (path === "/me") {
        liveCsrfCookie = "__Host-qg_csrf=rotated-session-proof-0123456789abcdef";
        return Promise.resolve(currentUser);
      }
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/preferences") {
        return Promise.resolve({
          ...currentUser.preferences,
          ...options?.body,
          version: currentUser.preferences.version + 1,
        });
      }
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });

    await user.click(screen.getAllByRole("button", { name: "切换到深色主题" })[0] as HTMLElement);

    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith("/preferences", {
      body: { theme: "dark", version: 4 },
      csrfProof: sessionCsrfProof,
      method: "PATCH",
    }));
    expect(liveCsrfCookie).toContain("rotated-session-proof");
  });

  it("keeps recovery visible when loading the latest preference version fails", async () => {
    let meRequestCount = 0;
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/me") {
        meRequestCount += 1;
        if (meRequestCount <= 2) return Promise.resolve(currentUser);
        return Promise.reject(new ApiError({
          code: "AUTH_SERVICE_UNAVAILABLE",
          message: "暂时无法载入最新设置。",
          requestId: "request-preference-reload",
          retryable: true,
          status: 503,
        }));
      }
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      if (path === "/preferences") {
        return Promise.reject(new ApiError({
          code: "PREFERENCE_VERSION_CONFLICT",
          message: "设置已在其他位置更新。",
          requestId: "request-preference-conflict",
          status: 409,
        }));
      }
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(meRequestCount).toBe(1));

    await user.click(screen.getAllByRole("button", { name: "切换到深色主题" })[0] as HTMLElement);
    await user.click(await screen.findByRole("button", { name: "载入最新后重试" }));

    expect(await screen.findByText("无法载入最新设置")).toBeVisible();
    expect(screen.getByRole("button", { name: "重试载入" })).toBeVisible();
    expect(screen.getByText("暂时无法载入最新设置。")).toBeVisible();
  });

  it("serializes a new preference behind stale-version recovery", async () => {
    let resolveReload!: (value: MeResponse) => void;
    const reloadResponse = new Promise<MeResponse>((resolve) => {
      resolveReload = resolve;
    });
    let meRequestCount = 0;
    let activePreferenceRequests = 0;
    let maxActivePreferenceRequests = 0;
    const preferenceBodies: Record<string, unknown>[] = [];
    let serverPreferences = { ...currentUser.preferences };

    apiRequestMock.mockImplementation((
      path: string,
      options?: Readonly<{ body?: Record<string, unknown>; method?: string }>,
    ) => {
      if (path === "/me") {
        meRequestCount += 1;
        if (meRequestCount === 3) return reloadResponse;
        return Promise.resolve({ ...currentUser, preferences: serverPreferences });
      }
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      if (path === "/preferences") {
        const body = options?.body ?? {};
        preferenceBodies.push(body);
        activePreferenceRequests += 1;
        maxActivePreferenceRequests = Math.max(
          maxActivePreferenceRequests,
          activePreferenceRequests,
        );
        if (preferenceBodies.length === 1) {
          activePreferenceRequests -= 1;
          return Promise.reject(new ApiError({
            code: "PREFERENCE_VERSION_CONFLICT",
            message: "设置已在其他位置更新。",
            requestId: "request-preference-conflict",
            status: 409,
          }));
        }
        serverPreferences = {
          language: body.language === "en" ? "en" : serverPreferences.language,
          theme: body.theme === "dark" ? "dark" : serverPreferences.theme,
          version: serverPreferences.version + 1,
        };
        activePreferenceRequests -= 1;
        return Promise.resolve(serverPreferences);
      }
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const user = userEvent.setup();
    renderShell();
    await waitFor(() => expect(meRequestCount).toBe(1));

    await user.click(screen.getAllByRole("button", { name: "切换到深色主题" })[0] as HTMLElement);
    await user.click(await screen.findByRole("button", { name: "载入最新后重试" }));
    await waitFor(() => expect(meRequestCount).toBe(3));

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "Switch to English" }));
    expect(preferenceBodies).toHaveLength(1);

    serverPreferences = { language: "zh-CN", theme: "light", version: 8 };
    resolveReload({ ...currentUser, preferences: serverPreferences });

    expect(await screen.findByText("Preference waiting to sync")).toBeVisible();
    expect(preferenceBodies).toEqual([
      { theme: "dark", version: 4 },
      { theme: "dark", version: 8 },
    ]);

    await user.click(screen.getByRole("button", { name: "Sync settings" }));
    await waitFor(() => expect(preferenceBodies).toHaveLength(3));
    expect(preferenceBodies[2]).toEqual({ language: "en", version: 9 });
    expect(maxActivePreferenceRequests).toBe(1);
    await waitFor(() => {
      expect(screen.queryByText("Preference waiting to sync")).not.toBeInTheDocument();
    });
  });

  it("keeps a second queued preference reachable after discarding a rejected change", async () => {
    const firstPreferenceRequest = createDeferred<never>();
    let preferenceRequestCount = 0;
    const preferenceBodies: Record<string, unknown>[] = [];
    apiRequestMock.mockImplementation((
      path: string,
      options?: Readonly<{ body?: Record<string, unknown>; method?: string }>,
    ) => {
      if (path === "/me") return Promise.resolve(currentUser);
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      if (path === "/preferences") {
        preferenceRequestCount += 1;
        preferenceBodies.push(options?.body ?? {});
        if (preferenceRequestCount === 1) return firstPreferenceRequest.promise;
        return Promise.resolve({
          language: "en",
          theme: "light",
          version: 5,
        });
      }
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const user = userEvent.setup();
    renderShell();

    await user.click(screen.getAllByRole("button", { name: "切换到深色主题" })[0] as HTMLElement);
    await waitFor(() => expect(preferenceRequestCount).toBe(1));
    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "Switch to English" }));

    firstPreferenceRequest.reject(new ApiError({
      code: "PREFERENCE_VALUE_INVALID",
      message: "当前主题值不可用。",
      requestId: "request-preference-invalid",
      status: 422,
    }));

    await user.click(await screen.findByRole("button", {
      name: "Restore server settings",
    }));
    expect(await screen.findByText("Preference waiting to sync")).toBeVisible();
    expect(document.documentElement).toHaveAttribute("lang", "en");

    await user.click(screen.getByRole("button", { name: "Sync settings" }));
    await waitFor(() => expect(preferenceBodies).toEqual([
      { theme: "dark", version: 4 },
      { language: "en", version: 4 },
    ]));
    await waitFor(() => {
      expect(screen.queryByText("Preference waiting to sync")).not.toBeInTheDocument();
    });
  });

  it("ignores a logout response after its session boundary unmounts", async () => {
    const logoutRequest = createDeferred<{ status: string }>();
    apiRequestMock.mockImplementation((path: string) => {
      if (path === "/me") return Promise.resolve(currentUser);
      if (path === "/notifications") {
        return Promise.resolve({ items: [], nextCursor: null, unreadCount: 0 });
      }
      if (path === "/todos") return Promise.resolve({ items: [] });
      if (path === "/auth/logout") return logoutRequest.promise;
      throw new Error(`UNHANDLED_TEST_API:${path}`);
    });
    const nextUser: MeResponse = {
      displayName: "Ada",
      email: "ada@example.com",
      emailVerified: true,
      preferences: { language: "en", theme: "dark", version: 7 },
    };
    const user = userEvent.setup();
    const { queryClient, unmount } = renderShell();

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "退出登录" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledWith(
      "/auth/logout",
      { csrfProof: sessionCsrfProof, method: "POST" },
    ));
    queryClient.setQueryData(authQueryKeys.me, nextUser);
    unmount();

    await act(async () => {
      logoutRequest.resolve({ status: "ok" });
      await logoutRequest.promise;
      await Promise.resolve();
    });

    expect(queryClient.getQueryData(authQueryKeys.me)).toEqual(nextUser);
  });
});
