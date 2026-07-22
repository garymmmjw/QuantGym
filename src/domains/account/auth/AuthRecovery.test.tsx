import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { AuthMutationError } from "./auth.mutations";
import { AuthRecovery, type AuthRecoveryProps } from "./AuthRecovery";

const ok = { status: "ok" } as const;

const renderRecovery = (overrides: Partial<AuthRecoveryProps> = {}) => {
  const props: AuthRecoveryProps = {
    onBack: vi.fn(),
    onPhaseChange: vi.fn(),
    phase: "forgot",
    requestPasswordReset: async () => ok,
    resetPassword: async () => ok,
    ...overrides,
  };
  return { ...render(<AuthRecovery {...props} />), props };
};

describe("AuthRecovery", () => {
  it("submits a forgot-password request and moves to the neutral sent state", async () => {
    const userEventDriver = userEvent.setup();
    const requestPasswordReset = vi.fn<AuthRecoveryProps["requestPasswordReset"]>()
      .mockResolvedValue(ok);
    const onPhaseChange = vi.fn();
    renderRecovery({ onPhaseChange, requestPasswordReset });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.click(screen.getByRole("button", { name: "发送重置链接" }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledWith({ email: "gary@example.com" });
      expect(onPhaseChange).toHaveBeenCalledWith("forgot-sent");
    });
  });

  it("explains that reset email delivery is disabled without claiming success", async () => {
    const userEventDriver = userEvent.setup();
    const requestPasswordReset = vi.fn<AuthRecoveryProps["requestPasswordReset"]>()
      .mockRejectedValue(new AuthMutationError({
        cause: new Error("disabled"),
        code: "PASSWORD_RESET_UNAVAILABLE",
        kind: "retryable",
        message: "reset unavailable",
        status: 503,
      }));
    const onPhaseChange = vi.fn();
    renderRecovery({ onPhaseChange, requestPasswordReset });

    const email = screen.getByRole("textbox", { name: "邮箱" });
    await userEventDriver.type(email, "gary@example.com");
    await userEventDriver.click(screen.getByRole("button", { name: "发送重置链接" }));

    const status = await screen.findByRole("status", { name: "邮件重置暂未开放" });
    expect(status).toHaveTextContent("尚未接入邮件发送服务");
    expect(email).toHaveValue("gary@example.com");
    expect(onPhaseChange).not.toHaveBeenCalled();
  });

  it("preserves the email draft when the device is offline", async () => {
    const userEventDriver = userEvent.setup();
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(false);
    const requestPasswordReset = vi.fn<AuthRecoveryProps["requestPasswordReset"]>()
      .mockRejectedValue(new TypeError("Failed to fetch"));
    renderRecovery({ requestPasswordReset });

    const email = screen.getByRole("textbox", { name: "邮箱" });
    await userEventDriver.type(email, "gary@example.com");
    await userEventDriver.click(screen.getByRole("button", { name: "发送重置链接" }));

    await screen.findByRole("status", { name: "当前处于离线状态" });
    expect(email).toHaveValue("gary@example.com");
    expect(screen.getByRole("button", { name: "联网后重试" })).toBeEnabled();
  });

  it("reissues security proof from the explicit permission recovery action", async () => {
    const userEventDriver = userEvent.setup();
    const requestPasswordReset = vi.fn<AuthRecoveryProps["requestPasswordReset"]>()
      .mockRejectedValueOnce(new AuthMutationError({
        cause: new Error("expired csrf"),
        code: "CSRF_PROOF_STALE",
        kind: "permission",
        message: "安全验证已过期",
        requestId: "req_permission_123",
        status: 403,
      }))
      .mockResolvedValueOnce(ok);
    const onPhaseChange = vi.fn();
    renderRecovery({ onPhaseChange, requestPasswordReset });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.click(screen.getByRole("button", { name: "发送重置链接" }));

    const failure = await screen.findByRole("alert", { name: "需要重新验证" });
    expect(failure).toHaveTextContent("参考编号：req_permission_123");
    await userEventDriver.click(screen.getByRole("button", { name: "重新验证并提交" }));

    await waitFor(() => {
      expect(requestPasswordReset).toHaveBeenCalledTimes(2);
      expect(onPhaseChange).toHaveBeenCalledWith("forgot-sent");
    });
  });

  it("prevents returning to login while a reset-email request is pending", async () => {
    const userEventDriver = userEvent.setup();
    let resolveRequest: (value: typeof ok) => void = () => undefined;
    const requestPasswordReset = vi.fn<AuthRecoveryProps["requestPasswordReset"]>().mockImplementation(
      () => new Promise((resolve) => {
        resolveRequest = resolve;
      }),
    );
    const { props } = renderRecovery({ requestPasswordReset });

    await userEventDriver.type(screen.getByRole("textbox", { name: "邮箱" }), "gary@example.com");
    await userEventDriver.click(screen.getByRole("button", { name: "发送重置链接" }));

    await waitFor(() => expect(screen.getByRole("button", { name: /返回登录/u })).toBeDisabled());
    expect(props.onBack).not.toHaveBeenCalled();
    resolveRequest(ok);
    await waitFor(() => expect(props.onPhaseChange).toHaveBeenCalledWith("forgot-sent"));
  });

  it("turns a reset screen without a token into a real recovery path", async () => {
    const userEventDriver = userEvent.setup();
    const resetPassword = vi.fn<AuthRecoveryProps["resetPassword"]>();
    const { props } = renderRecovery({ phase: "reset", resetPassword });

    expect(screen.getByRole("alert", { name: "重置链接无效" })).toBeInTheDocument();
    expect(screen.queryByLabelText(/^新密码/u)).not.toBeInTheDocument();
    expect(resetPassword).not.toHaveBeenCalled();

    await userEventDriver.click(screen.getByRole("button", { name: "重新申请重置链接" }));
    expect(props.onPhaseChange).toHaveBeenCalledWith("forgot");
  });

  it("passes the fragment token with the 12-character password and reports completion", async () => {
    const userEventDriver = userEvent.setup();
    const token = "t".repeat(32);
    const resetPassword = vi.fn<AuthRecoveryProps["resetPassword"]>().mockResolvedValue(ok);
    const onPhaseChange = vi.fn();
    renderRecovery({ onPhaseChange, phase: "reset", resetPassword, resetToken: token });

    await userEventDriver.type(screen.getByLabelText(/^新密码/u), "x".repeat(12));
    await userEventDriver.type(screen.getByLabelText(/^确认新密码/u), "x".repeat(12));
    await userEventDriver.click(screen.getByRole("button", { name: "设置新密码" }));

    await waitFor(() => {
      expect(resetPassword).toHaveBeenCalledWith({ password: "x".repeat(12), token });
      expect(onPhaseChange).toHaveBeenCalledWith("reset-success");
    });
  });

  it("offers a new-link action when a reset challenge is stale", async () => {
    const userEventDriver = userEvent.setup();
    const token = "t".repeat(32);
    const resetPassword = vi.fn<AuthRecoveryProps["resetPassword"]>().mockRejectedValue(
      new AuthMutationError({
        cause: new Error("stale reset"),
        code: "PASSWORD_RESET_STALE",
        kind: "conflict",
        message: "链接状态已变化",
        requestId: "req_reset_stale_123",
        status: 409,
      }),
    );
    const onPhaseChange = vi.fn();
    renderRecovery({ onPhaseChange, phase: "reset", resetPassword, resetToken: token });

    await userEventDriver.type(screen.getByLabelText(/^新密码/u), "x".repeat(12));
    await userEventDriver.type(screen.getByLabelText(/^确认新密码/u), "x".repeat(12));
    await userEventDriver.click(screen.getByRole("button", { name: "设置新密码" }));

    const failure = await screen.findByRole("status", { name: "链接状态已变化" });
    expect(failure).toHaveTextContent("参考编号：req_reset_stale_123");
    await userEventDriver.click(screen.getByRole("button", { name: "申请新链接" }));
    expect(onPhaseChange).toHaveBeenCalledWith("forgot");
  });

  it("renders the final reset success state without exposing the token", () => {
    renderRecovery({ phase: "reset-success", resetToken: "sensitive-token" });

    expect(screen.getByRole("heading", { name: "密码已更新" })).toBeInTheDocument();
    expect(screen.getByText(/所有旧登录会话已安全退出/u)).toBeInTheDocument();
    expect(screen.queryByText("sensitive-token")).not.toBeInTheDocument();
  });
});
