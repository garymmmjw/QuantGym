import "@testing-library/jest-dom/vitest";

import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { useState } from "react";

import type { components } from "../../../shared/api/generated/schema";
import { AuthMutationError } from "./auth.mutations";
import { EmailAuthForm, type AuthMode, type EmailAuthFormProps } from "./EmailAuthForm";

const foundationsCss = readFileSync("src/design-system/tokens/foundations.css", "utf8");
const authCss = readFileSync("src/domains/account/auth/auth.module.css", "utf8");

type MeResponse = components["schemas"]["MeResponse"];

const user: MeResponse = {
  displayName: "Gary",
  email: "gary@example.com",
  emailVerified: true,
  preferences: { language: "zh-CN", theme: "light", version: 1 },
};

const resolvedLogin: EmailAuthFormProps["submitLogin"] = async () => ({ user });
const resolvedRegister: EmailAuthFormProps["submitRegister"] = async () => ({ user });

const renderForm = (overrides: Partial<EmailAuthFormProps> = {}) => {
  const props: EmailAuthFormProps = {
    mode: "login",
    onAuthenticated: vi.fn(),
    onForgotPassword: vi.fn(),
    onModeChange: vi.fn(),
    redirectPath: "/",
    submitLogin: resolvedLogin,
    submitRegister: resolvedRegister,
    ...overrides,
  };
  return { ...render(<EmailAuthForm {...props} />), props };
};

describe("EmailAuthForm", () => {
  it("switches login and registration tabs with roving keyboard focus", async () => {
    const userEventDriver = userEvent.setup();

    function ControlledForm() {
      const [mode, setMode] = useState<AuthMode>("login");
      return (
        <EmailAuthForm
          mode={mode}
          onAuthenticated={vi.fn()}
          onForgotPassword={vi.fn()}
          onModeChange={setMode}
          redirectPath="/"
          submitLogin={resolvedLogin}
          submitRegister={resolvedRegister}
        />
      );
    }

    render(<ControlledForm />);
    const loginTab = screen.getByRole("tab", { name: "登录" });
    const registerTab = screen.getByRole("tab", { name: "注册" });

    loginTab.focus();
    await userEventDriver.keyboard("{ArrowRight}");

    expect(registerTab).toHaveFocus();
    expect(registerTab).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("textbox", { name: "名字" })).toBeInTheDocument();

    await userEventDriver.keyboard("{ArrowLeft}");
    expect(loginTab).toHaveFocus();
    expect(loginTab).toHaveAttribute("aria-selected", "true");
    expect(screen.queryByRole("textbox", { name: "名字" })).not.toBeInTheDocument();
  });

  it("requires a name and a 12-character password before registration", async () => {
    const userEventDriver = userEvent.setup();
    const submitRegister = vi.fn(resolvedRegister);
    const onAuthenticated = vi.fn();
    renderForm({ mode: "register", onAuthenticated, submitRegister });

    await userEventDriver.type(screen.getByRole("textbox", { name: "名字" }), "Gary");
    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.type(screen.getByLabelText(/^密码/u), "x".repeat(11));
    await userEventDriver.click(screen.getByRole("button", { name: "创建账号" }));

    const passwordError = await screen.findByRole("alert");
    expect(passwordError).toHaveTextContent("密码至少需要 12 个字符");
    expect(screen.getByLabelText(/^密码/u)).toHaveAccessibleDescription(
      /密码至少需要 12 个字符/u,
    );
    expect(submitRegister).not.toHaveBeenCalled();

    await userEventDriver.clear(screen.getByLabelText(/^密码/u));
    await userEventDriver.type(screen.getByLabelText(/^密码/u), "x".repeat(12));
    await userEventDriver.click(screen.getByRole("button", { name: "创建账号" }));

    await waitFor(() => {
      expect(submitRegister).toHaveBeenCalledWith({
        displayName: "Gary",
        email: "gary@example.com",
        password: "x".repeat(12),
      });
    });
    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(user), { timeout: 2_000 });
  });

  it("exposes the password reveal control as a pressed-state button", async () => {
    const userEventDriver = userEvent.setup();
    renderForm();

    const password = screen.getByLabelText(/^密码/u);
    const toggle = screen.getByRole("button", { name: "显示密码" });
    expect(password).toHaveAttribute("type", "password");
    expect(toggle).toHaveAttribute("type", "button");
    expect(toggle).toHaveAttribute("aria-pressed", "false");
    expect(toggle.className).toBeTruthy();
    expect(foundationsCss).toMatch(/--qg-touch-target-min:\s*44px;/u);
    expect(authCss).toMatch(
      /\.passwordToggle\s*\{[^}]*min-inline-size:\s*var\(--qg-touch-target-min\);[^}]*min-block-size:\s*var\(--qg-touch-target-min\);/su,
    );

    await userEventDriver.click(toggle);
    expect(password).toHaveAttribute("type", "text");
    expect(screen.getByRole("button", { name: "隐藏密码" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("associates server field errors and announces the request error", async () => {
    const userEventDriver = userEvent.setup();
    const submitLogin = vi.fn<EmailAuthFormProps["submitLogin"]>().mockRejectedValue(
      new AuthMutationError({
        cause: new Error("invalid credentials"),
        code: "INVALID_CREDENTIALS",
        fieldErrors: { email: ["邮箱或密码不正确"] },
        kind: "invalid",
        message: "无法登录",
        status: 401,
      }),
    );
    renderForm({ submitLogin });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.type(screen.getByLabelText(/^密码/u), "wrong-password");
    fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);

    const email = screen.getByRole("textbox", { name: "邮箱" });
    await waitFor(() => expect(submitLogin).toHaveBeenCalledOnce());
    await waitFor(() => expect(email).toHaveAccessibleDescription("邮箱或密码不正确"));
    const alerts = screen.getAllByRole("alert");
    expect(alerts.some((alert) => alert.textContent?.includes("无法登录"))).toBe(true);
  });

  it("renders success feedback before invoking the authenticated callback", async () => {
    const userEventDriver = userEvent.setup();
    const onAuthenticated = vi.fn();
    renderForm({ onAuthenticated });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.type(screen.getByLabelText(/^密码/u), "password");
    fireEvent.submit(screen.getByRole("button", { name: "登录" }).closest("form")!);

    await waitFor(() => expect(onAuthenticated).not.toHaveBeenCalled());
    const success = await screen.findByRole("status", { name: "已完成" });
    expect(success).toHaveTextContent("登录成功，正在进入训练空间");
    expect(onAuthenticated).not.toHaveBeenCalled();

    await waitFor(() => expect(onAuthenticated).toHaveBeenCalledWith(user), { timeout: 2_000 });
  });

  it("shows a concrete retry action and request reference for recoverable failures", async () => {
    const userEventDriver = userEvent.setup();
    const submitLogin = vi.fn<EmailAuthFormProps["submitLogin"]>()
      .mockRejectedValueOnce(new AuthMutationError({
        cause: new Error("temporary outage"),
        code: "AUTH_SERVICE_UNAVAILABLE",
        kind: "retryable",
        message: "认证服务暂时不可用",
        requestId: "req_auth_retry_123",
        retryable: true,
        status: 503,
      }))
      .mockResolvedValueOnce({ user });
    renderForm({ submitLogin });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.type(screen.getByLabelText(/^密码/u), "password");
    await userEventDriver.click(screen.getByRole("button", { name: "登录" }));

    const failure = await screen.findByRole("status", { name: "服务暂时不可用" });
    expect(failure).toHaveTextContent("参考编号：req_auth_retry_123");
    await userEventDriver.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(submitLogin).toHaveBeenCalledTimes(2));
    expect(await screen.findByRole("status", { name: "已完成" })).toHaveTextContent("登录成功");
  });

  it("turns an allowlisted Google callback error into branded recovery copy", () => {
    renderForm({ googleErrorCode: "GOOGLE_OAUTH_FAILED" });

    expect(screen.getByRole("status", { name: "Google 登录未完成" })).toHaveTextContent(
      "授权可能已取消或链接已经失效",
    );
    expect(screen.getByRole("button", { name: "重新尝试 Google 登录" })).toBeEnabled();
  });

  it("locks competing authentication actions while a request is pending", async () => {
    const userEventDriver = userEvent.setup();
    let resolveLogin: (response: Awaited<ReturnType<EmailAuthFormProps["submitLogin"]>>) => void = () => undefined;
    const submitLogin = vi.fn<EmailAuthFormProps["submitLogin"]>().mockImplementation(
      () => new Promise((resolve) => {
        resolveLogin = resolve;
      }),
    );
    const { props } = renderForm({ submitLogin });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.type(screen.getByLabelText(/^密码/u), "password");
    await userEventDriver.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => {
      expect(screen.getByRole("tab", { name: "注册" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "忘记密码" })).toBeDisabled();
      expect(screen.getByRole("button", { name: "使用 Google 继续" })).toBeDisabled();
    });
    expect(props.onModeChange).not.toHaveBeenCalled();

    await act(async () => resolveLogin({ user }));
    await screen.findByRole("status", { name: "已完成" });
  });

  it("opens password recovery without submitting credentials", () => {
    const onForgotPassword = vi.fn();
    const submitLogin = vi.fn(resolvedLogin);
    renderForm({ onForgotPassword, submitLogin });

    fireEvent.click(screen.getByRole("button", { name: "忘记密码" }));

    expect(onForgotPassword).toHaveBeenCalledOnce();
    expect(submitLogin).not.toHaveBeenCalled();
  });
});
