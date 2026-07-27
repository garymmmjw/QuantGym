import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { createMemoryRouter, RouterProvider, useLocation } from "react-router-dom";

import {
  PREFERENCE_STORAGE_KEY,
  preferenceController,
} from "../../domains/platform/preferences";
import { ApiError } from "../../shared/api/errors";
import { RuntimeProviders } from "../providers/RuntimeProviders";
import { AuthenticatedShellRoute } from "./AuthenticatedShellRoute";

const { apiRequestMock } = vi.hoisted(() => ({ apiRequestMock: vi.fn() }));

vi.mock("../../shared/api/client", () => ({ apiRequest: apiRequestMock }));

const queryClients: QueryClient[] = [];

const LoginProbe = () => {
  const location = useLocation();
  return (
    <main>
      <h1>登录测试页</h1>
      <output data-testid="login-location">{location.pathname}{location.search}</output>
    </main>
  );
};

const renderAuthenticatedRoute = (initialEntry = "/problems") => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
  queryClients.push(queryClient);
  const router = createMemoryRouter([
    {
      path: "/login",
      element: <LoginProbe />,
    },
    {
      path: "/",
      element: <AuthenticatedShellRoute />,
      children: [
        { index: true, element: <h1>受保护的训练首页</h1> },
        { path: "*", element: <h1>受保护的训练页面</h1> },
      ],
    },
  ], { initialEntries: [initialEntry] });

  return {
    queryClient,
    router,
    ...render(
      <RuntimeProviders>
        <QueryClientProvider client={queryClient}>
          <RouterProvider router={router} />
        </QueryClientProvider>
      </RuntimeProviders>,
    ),
  };
};

const signedInUser = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: {
    language: "en",
    theme: "dark",
    version: 3,
  },
} as const;

beforeEach(() => {
  apiRequestMock.mockReset();
  preferenceController.reset();
  window.localStorage.removeItem(PREFERENCE_STORAGE_KEY);
  vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  vi.spyOn(document, "cookie", "get").mockReturnValue(
    "__Host-qg_csrf=session-proof-shell-route-123456",
  );
});

afterEach(() => {
  cleanup();
  for (const queryClient of queryClients.splice(0)) queryClient.clear();
  preferenceController.reset();
  window.localStorage.removeItem(PREFERENCE_STORAGE_KEY);
  vi.restoreAllMocks();
});

describe("AuthenticatedShellRoute integration", () => {
  it("keeps protected content gated while /me is pending", async () => {
    apiRequestMock.mockImplementationOnce((
      _path: string,
      options: Readonly<{ signal: AbortSignal }>,
    ) => new Promise((_resolve, reject) => {
      options.signal.addEventListener("abort", () => reject(options.signal.reason), { once: true });
    }));

    renderAuthenticatedRoute();

    expect(await screen.findByRole("heading", { name: "正在准备训练空间…" })).toBeVisible();
    expect(screen.getByText("正在安全恢复你的训练会话。")).toBeVisible();
    expect(screen.queryByRole("heading", { name: "受保护的训练页面" })).not.toBeInTheDocument();
    expect(screen.queryByRole("heading", { name: "登录测试页" })).not.toBeInTheDocument();
    expect(apiRequestMock).toHaveBeenCalledWith("/me", { signal: expect.any(AbortSignal) });
  });

  it("sends a signed-out visitor to login with the full safe return target", async () => {
    apiRequestMock.mockRejectedValueOnce(new ApiError({
      code: "AUTH_SESSION_REQUIRED",
      message: "请先登录。",
      requestId: "req_signed_out",
      status: 401,
    }));

    renderAuthenticatedRoute("/problems?focus=weakness&source=plan");

    expect(await screen.findByRole("heading", { name: "登录测试页" })).toBeVisible();
    expect(screen.getByTestId("login-location")).toHaveTextContent(
      "/login?redirect=%2Fproblems%3Ffocus%3Dweakness%26source%3Dplan",
    );
    expect(screen.queryByRole("heading", { name: "受保护的训练页面" })).not.toBeInTheDocument();
  });

  it("reconciles the successful /me preferences before continuing in the shell", async () => {
    apiRequestMock.mockResolvedValueOnce(signedInUser);

    renderAuthenticatedRoute();

    expect(await screen.findByRole("heading", { name: "受保护的训练页面" })).toBeVisible();
    await waitFor(() => {
      expect(preferenceController.store.getState()).toEqual({ theme: "dark", language: "en" });
    });
    expect(document.documentElement).toHaveAttribute("data-qg-theme", "dark");
    expect(document.documentElement).toHaveAttribute("lang", "en");
    expect(JSON.parse(window.localStorage.getItem(PREFERENCE_STORAGE_KEY) ?? "null")).toEqual({
      theme: "dark",
      language: "en",
    });
    expect(window.localStorage.getItem(PREFERENCE_STORAGE_KEY)).not.toMatch(/Gary|gary@example|version/i);
  });

  it("shows a retryable API failure with its request ID and retries /me", async () => {
    const user = userEvent.setup();
    const error = new ApiError({
      code: "UPSTREAM_UNAVAILABLE",
      message: "服务暂时不可用。",
      requestId: "req_shell_retry_123",
      retryable: true,
      status: 503,
    });
    apiRequestMock.mockRejectedValue(error);

    renderAuthenticatedRoute();

    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveAttribute("data-recovery-state", "recoverable-error");
    expect(recovery).toHaveTextContent("请求 ID：req_shell_retry_123");
    await user.click(screen.getByRole("button", { name: "重试" }));
    await waitFor(() => expect(apiRequestMock).toHaveBeenCalledTimes(2));
    expect(screen.getByRole("alert")).toHaveTextContent("req_shell_retry_123");
  });

  it("offers sign-in recovery for permission errors and preserves correlation", async () => {
    const user = userEvent.setup();
    apiRequestMock.mockRejectedValueOnce(new ApiError({
      code: "AUTH_ACCOUNT_LOCKED",
      message: "当前会话不可继续。",
      requestId: "req_shell_permission_456",
      status: 403,
    }));

    renderAuthenticatedRoute("/plan?day=today");

    const recovery = await screen.findByRole("alert");
    expect(recovery).toHaveAttribute("data-recovery-state", "permission-denied");
    expect(recovery).toHaveTextContent("req_shell_permission_456");
    await user.click(screen.getByRole("button", { name: "重新登录" }));

    expect(await screen.findByRole("heading", { name: "登录测试页" })).toBeVisible();
    expect(screen.getByTestId("login-location")).toHaveTextContent("/login?reauth=1");
  });
});
