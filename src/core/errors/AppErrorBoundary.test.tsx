import "@testing-library/jest-dom/vitest";

import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { ApiError } from "../../shared/api/errors";
import { AppErrorBoundary } from "./AppErrorBoundary";

function Crash({ error = new Error("render failed") }: Readonly<{ error?: Error }>): never {
  throw error;
}

describe("AppErrorBoundary", () => {
  beforeEach(() => {
    vi.spyOn(console, "error").mockImplementation(() => undefined);
    vi.spyOn(navigator, "onLine", "get").mockReturnValue(true);
  });

  it("runs an injected reset before remounting recovered content", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();

    function Harness() {
      const [recovered, setRecovered] = useState(false);
      return (
        <AppErrorBoundary onReset={(details) => {
          onReset(details);
          setRecovered(true);
        }}>
          {recovered ? <p>页面已恢复</p> : <Crash />}
        </AppErrorBoundary>
      );
    }

    render(<Harness />);
    await user.click(screen.getByRole("button", { name: "重试" }));

    await screen.findByText("页面已恢复");
    expect(onReset).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.any(Error),
      reason: "user",
    }));
  });

  it("keeps the recovery panel mounted when reset work fails", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn().mockRejectedValue(new Error("reset failed"));
    render(
      <AppErrorBoundary onReset={onReset}>
        <Crash />
      </AppErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "重试" }));

    await waitFor(() => expect(onReset).toHaveBeenCalledOnce());
    expect(screen.getByRole("alert")).toHaveAttribute("data-recovery-state", "recoverable-error");
    expect(screen.getByRole("button", { name: "重试" })).toBeEnabled();
  });

  it("maps permission failures to sign-in recovery and preserves the request ID", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn().mockImplementation(() => new Promise<void>(() => undefined));
    const error = new ApiError({
      code: "AUTH_SESSION_REQUIRED",
      message: "sign in",
      requestId: "req_permission_123",
      status: 403,
    });

    render(
      <AppErrorBoundary onReset={onReset}>
        <Crash error={error} />
      </AppErrorBoundary>,
    );

    const panel = screen.getByRole("alert");
    expect(panel).toHaveAttribute("data-recovery-state", "permission-denied");
    expect(panel).toHaveTextContent("req_permission_123");
    await user.click(screen.getByRole("button", { name: "重新登录" }));
    expect(onReset).toHaveBeenCalledWith({ error, reason: "user" });
  });

  it("resets safely when an external recovery key changes", async () => {
    const { rerender } = render(
      <AppErrorBoundary resetKeys={["route-a"]}>
        <Crash />
      </AppErrorBoundary>,
    );
    expect(screen.getByRole("alert")).toBeInTheDocument();

    rerender(
      <AppErrorBoundary resetKeys={["route-b"]}>
        <p>新路由内容</p>
      </AppErrorBoundary>,
    );

    await screen.findByText("新路由内容");
  });

  it("supports injected classification and localized recovery copy", () => {
    render(
      <AppErrorBoundary
        classifyError={() => "non-recoverable-error"}
        copy={{
          actionLabel: "Return",
          ariaLabel: "Application recovery",
          message: "Choose another route.",
          title: "This page cannot continue",
        }}
        onReset={vi.fn()}
      >
        <Crash />
      </AppErrorBoundary>,
    );

    const panel = screen.getByRole("alert", { name: "Application recovery" });
    expect(panel).toHaveTextContent("This page cannot continue");
    expect(panel).toHaveTextContent("Choose another route.");
    expect(screen.getByRole("button", { name: "Return" })).toBeEnabled();
  });

  it("selects localized copy after classifying the active recovery state", () => {
    const copyForState = vi.fn().mockReturnValue({
      actionLabel: "Reload latest",
      message: "The content changed elsewhere.",
      title: "Version conflict",
    });
    const error = new ApiError({
      code: "STALE_VERSION",
      message: "stale",
      requestId: "req_stale_123",
      status: 409,
    });

    render(
      <AppErrorBoundary copyForState={copyForState} onReset={vi.fn()}>
        <Crash error={error} />
      </AppErrorBoundary>,
    );

    expect(copyForState).toHaveBeenCalledWith("stale-version-conflict", error);
    expect(screen.getByRole("button", { name: "Reload latest" })).toBeEnabled();
    expect(screen.getByRole("alert")).toHaveTextContent("The content changed elsewhere.");
  });

  it("uses the fixed sign-in action when one is supplied for permission recovery", async () => {
    const user = userEvent.setup();
    const onReset = vi.fn();
    const onSignIn = vi.fn();
    render(
      <AppErrorBoundary
        classifyError={() => "permission-denied"}
        onReset={onReset}
        onSignIn={onSignIn}
      >
        <Crash />
      </AppErrorBoundary>,
    );

    await user.click(screen.getByRole("button", { name: "重新登录" }));
    expect(onSignIn).toHaveBeenCalledOnce();
    expect(onReset).not.toHaveBeenCalled();
  });
});
