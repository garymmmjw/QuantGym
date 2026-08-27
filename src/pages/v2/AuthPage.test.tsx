import "@testing-library/jest-dom/vitest";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { BrowserRouter, useLocation } from "react-router-dom";

const authMocks = vi.hoisted(() => ({
  currentUserData: undefined as typeof authenticatedUser | undefined,
  currentUserIsPending: false,
  currentUserIsSuccess: false,
  forgot: vi.fn(),
  login: vi.fn(),
  register: vi.fn(),
  reset: vi.fn(),
}));

vi.mock("../../domains/account/auth/auth.mutations", () => ({
  useForgotPasswordMutation: () => ({ mutateAsync: authMocks.forgot }),
  useLoginMutation: () => ({ mutateAsync: authMocks.login }),
  useRegisterMutation: () => ({ mutateAsync: authMocks.register }),
  useResetPasswordMutation: () => ({ mutateAsync: authMocks.reset }),
}));

vi.mock("../../domains/account/auth/auth.queries", () => ({
  authQueryKeys: { me: ["auth", "me"] },
  useCurrentUserQuery: () => ({
    data: authMocks.currentUserData,
    isPending: authMocks.currentUserIsPending,
    isSuccess: authMocks.currentUserIsSuccess,
  }),
}));

vi.mock("../../domains/account/auth/EmailAuthForm", () => ({
  EmailAuthForm: ({
    googleErrorCode,
    mode,
    onAuthenticated,
    onForgotPassword,
    onModeChange,
    redirectPath,
  }: Readonly<{
    googleErrorCode?: string | undefined;
    mode: "login" | "register";
    onAuthenticated: (user: typeof authenticatedUser) => void;
    onForgotPassword: () => void;
    onModeChange: (mode: "login" | "register") => void;
    redirectPath: string;
  }>) => (
    <div>
      <output data-testid="auth-mode">{mode}</output>
      <output data-testid="google-error">{googleErrorCode ?? "none"}</output>
      <output data-testid="redirect-path">{redirectPath}</output>
      <button type="button" onClick={() => onAuthenticated(authenticatedUser)}>
        Complete authentication
      </button>
      <button
        type="button"
        onClick={() => onModeChange(mode === "login" ? "register" : "login")}
      >
        Switch authentication mode
      </button>
      <button type="button" onClick={onForgotPassword}>Open password recovery</button>
    </div>
  ),
}));

vi.mock("../../domains/account/auth/AuthRecovery", () => ({
  AuthRecovery: ({
    onBack,
    onPhaseChange,
    resetPassword,
    resetToken,
  }: Readonly<{
    onBack: () => void;
    onPhaseChange: (phase: "forgot" | "reset-success") => void;
    resetPassword: (values: { password: string; token: string }) => Promise<unknown>;
    resetToken?: string;
  }>) => (
    <div>
      <output data-testid="reset-token">{resetToken ?? "missing"}</output>
      <button type="button" onClick={() => onPhaseChange("forgot")}>Request new reset</button>
      <button
        type="button"
        onClick={async () => {
          await resetPassword({ password: "new-password", token: resetToken ?? "missing" });
          onPhaseChange("reset-success");
        }}
      >
        Complete password reset
      </button>
      <button type="button" onClick={onBack}>Return to login</button>
    </div>
  ),
}));

import AuthPage from "./AuthPage";

const authenticatedUser = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: { language: "zh-CN", theme: "light", version: 1 },
} as const;

const matchMedia = (query: string): MediaQueryList => ({
  addEventListener: vi.fn(),
  addListener: vi.fn(),
  dispatchEvent: vi.fn(),
  matches: false,
  media: query,
  onchange: null,
  removeEventListener: vi.fn(),
  removeListener: vi.fn(),
});

function LocationProbe() {
  const location = useLocation();
  return <output data-testid="location">{`${location.pathname}${location.search}${location.hash}`}</output>;
}

const renderPage = () => {
  const queryClient = new QueryClient({
    defaultOptions: { mutations: { retry: false }, queries: { retry: false } },
  });
  const wrapper = ({ children }: Readonly<{ children: ReactNode }>) => (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        {children}
        <LocationProbe />
      </BrowserRouter>
    </QueryClientProvider>
  );
  return { queryClient, ...render(<AuthPage />, { wrapper }) };
};

beforeEach(() => {
  authMocks.currentUserData = undefined;
  authMocks.currentUserIsPending = false;
  authMocks.currentUserIsSuccess = false;
  window.matchMedia = vi.fn(matchMedia);
  window.history.replaceState(null, "", "/login");
});

describe("AuthPage", () => {
  it("does not expose authentication actions while the existing session is unresolved", () => {
    authMocks.currentUserIsPending = true;
    renderPage();

    expect(screen.getByRole("status", { name: "正在确认登录状态" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Complete authentication" })).not.toBeInTheDocument();
  });

  it("keeps forced reauthentication available even when the previous me result was successful", () => {
    authMocks.currentUserData = authenticatedUser;
    authMocks.currentUserIsSuccess = true;
    window.history.replaceState(null, "", "/login?reauth=1");

    renderPage();

    expect(screen.getByRole("button", { name: "Complete authentication" })).toBeVisible();
    expect(screen.getByTestId("location")).toHaveTextContent("/login?reauth=1");
  });

  it("preserves forced reauthentication across registration and password recovery", async () => {
    const userEventDriver = userEvent.setup();
    authMocks.currentUserData = authenticatedUser;
    authMocks.currentUserIsSuccess = true;
    window.history.replaceState(
      null,
      "",
      "/login?redirect=%2Faccount&reauth=1",
    );
    renderPage();

    await userEventDriver.click(screen.getByRole("button", { name: "Switch authentication mode" }));
    await waitFor(() => {
      expect(screen.getByTestId("auth-mode")).toHaveTextContent("register");
      expect(new URLSearchParams(window.location.search).get("reauth")).toBe("1");
      expect(new URLSearchParams(window.location.search).get("redirect")).toBe("/account");
      expect(screen.getByTestId("location")).not.toHaveTextContent(/^\/account/u);
    });

    await userEventDriver.click(screen.getByRole("button", { name: "Open password recovery" }));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("mode")).toBe("forgot");
      expect(new URLSearchParams(window.location.search).get("reauth")).toBe("1");
      expect(screen.getByRole("button", { name: "Return to login" })).toBeVisible();
    });

    await userEventDriver.click(screen.getByRole("button", { name: "Return to login" }));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("mode")).toBeNull();
      expect(new URLSearchParams(window.location.search).get("reauth")).toBe("1");
      expect(screen.getByRole("button", { name: "Complete authentication" })).toBeVisible();
    });
  });

  it("keeps an allowlisted Google failure visible over an existing session", async () => {
    const userEventDriver = userEvent.setup();
    authMocks.currentUserData = authenticatedUser;
    authMocks.currentUserIsSuccess = true;
    window.history.replaceState(
      null,
      "",
      "/login?authError=GOOGLE_OAUTH_FAILED",
    );
    renderPage();

    expect(screen.getByTestId("google-error")).toHaveTextContent("GOOGLE_OAUTH_FAILED");
    expect(screen.getByTestId("location")).toHaveTextContent(
      "/login?authError=GOOGLE_OAUTH_FAILED",
    );

    await userEventDriver.click(screen.getByRole("button", { name: "Open password recovery" }));
    await waitFor(() => {
      expect(new URLSearchParams(window.location.search).get("mode")).toBe("forgot");
      expect(new URLSearchParams(window.location.search).get("reauth")).toBe("1");
      expect(screen.getByRole("button", { name: "Return to login" })).toBeVisible();
    });
  });

  it.each([
    ["https%3A%2F%2Fevil.example%2Fsteal", "/"],
    ["%2F%2Fevil.example%2Fsteal", "/"],
    ["%2Ftraining%3Fday%3D1", "/training?day=1"],
  ])("navigates only to a safe redirect for %s", async (redirect, expectedPath) => {
    const userEventDriver = userEvent.setup();
    window.history.replaceState(null, "", `/login?redirect=${redirect}`);
    renderPage();

    expect(screen.getByTestId("redirect-path")).toHaveTextContent(expectedPath);
    await userEventDriver.click(screen.getByRole("button", { name: "Complete authentication" }));

    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent(expectedPath));
  });

  it("keeps login, registration, and forgot views synchronized with the URL", async () => {
    const userEventDriver = userEvent.setup();
    window.history.replaceState(null, "", "/login?mode=register");
    renderPage();

    expect(screen.getByTestId("auth-mode")).toHaveTextContent("register");
    await userEventDriver.click(screen.getByRole("button", { name: "Switch authentication mode" }));
    await waitFor(() => {
      expect(screen.getByTestId("auth-mode")).toHaveTextContent("login");
      expect(screen.getByTestId("location")).toHaveTextContent("/login");
    });

    await userEventDriver.click(screen.getByRole("button", { name: "Open password recovery" }));
    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login?mode=forgot");
    });
  });

  it("accepts exactly one allowlisted Google error and ignores untrusted values", () => {
    window.history.replaceState(null, "", "/login?authError=GOOGLE_OAUTH_FAILED");
    const firstRender = renderPage();

    expect(screen.getByTestId("google-error")).toHaveTextContent("GOOGLE_OAUTH_FAILED");
    expect(screen.getByText(/授权可能已取消或链接已经失效/u)).toBeInTheDocument();
    firstRender.unmount();

    window.history.replaceState(
      null,
      "",
      "/login?authError=GOOGLE_OAUTH_FAILED&authError=AUTH_SERVICE_UNAVAILABLE",
    );
    renderPage();
    expect(screen.getByTestId("google-error")).toHaveTextContent("none");
    expect(screen.queryByText(/授权可能已取消或链接已经失效/u)).not.toBeInTheDocument();
  });

  it("parses a valid reset token from the fragment and immediately removes it from the URL", async () => {
    const token = "t".repeat(32);
    window.history.replaceState(null, "", `/auth/reset#token=${token}`);
    renderPage();

    expect(screen.getByTestId("reset-token")).toHaveTextContent(token);
    await waitFor(() => {
      expect(window.location.hash).toBe("");
      expect(screen.getByTestId("location")).toHaveTextContent("/auth/reset");
    });
  });

  it("keeps a valid password-reset route available for an existing session", async () => {
    const token = "t".repeat(32);
    authMocks.currentUserIsSuccess = true;
    window.history.replaceState(null, "", `/auth/reset#${token}`);
    renderPage();

    expect(screen.getByTestId("reset-token")).toHaveTextContent(token);
    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/auth/reset");
    });
  });

  it("moves an invalid reset route to the forgot flow and synchronizes the URL", async () => {
    const userEventDriver = userEvent.setup();
    window.history.replaceState(null, "", "/auth/reset");
    renderPage();

    await userEventDriver.click(screen.getByRole("button", { name: "Request new reset" }));

    await waitFor(() => {
      expect(screen.getByTestId("location")).toHaveTextContent("/login?mode=forgot");
      expect(screen.getByText("已打开密码重置表单。")).toBeInTheDocument();
    });
  });

  it("clears an existing me cache after password reset before returning to login", async () => {
    const userEventDriver = userEvent.setup();
    const token = "t".repeat(32);
    authMocks.currentUserIsSuccess = true;
    authMocks.reset.mockResolvedValue({ status: "ok" });
    window.history.replaceState(null, "", `/auth/reset#${token}`);
    const { queryClient } = renderPage();
    queryClient.setQueryData(["auth", "me"], authenticatedUser);

    await userEventDriver.click(screen.getByRole("button", { name: "Complete password reset" }));

    await waitFor(() => {
      expect(authMocks.reset).toHaveBeenCalledWith({ password: "new-password", token });
      expect(queryClient.getQueryData(["auth", "me"])).toBeNull();
    });
    authMocks.currentUserIsSuccess = false;
    await userEventDriver.click(screen.getByRole("button", { name: "Return to login" }));
    await waitFor(() => expect(screen.getByTestId("location")).toHaveTextContent("/login"));
  });

  it("keeps authenticated identity in memory without writing browser storage", async () => {
    const userEventDriver = userEvent.setup();
    const storageWrite = vi.spyOn(Storage.prototype, "setItem");
    const { queryClient } = renderPage();

    await userEventDriver.click(screen.getByRole("button", { name: "Complete authentication" }));

    await waitFor(() => {
      expect(queryClient.getQueryData(["auth", "me"])).toEqual(authenticatedUser);
    });
    expect(storageWrite).not.toHaveBeenCalled();
  });
});
