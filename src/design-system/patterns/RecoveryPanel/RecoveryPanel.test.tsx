import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { RecoveryPanel, type RecoveryPanelProps, type RecoveryState } from "./RecoveryPanel";

type RecoveryCase = Readonly<{
  callback: keyof Pick<RecoveryPanelProps, "onReload" | "onRetry" | "onReturn" | "onSignIn">;
  label: string;
  state: RecoveryState;
}>;

const recoveryCases: readonly RecoveryCase[] = [
  { state: "recoverable-error", callback: "onRetry", label: "重试" },
  { state: "non-recoverable-error", callback: "onReturn", label: "返回安全页面" },
  { state: "offline-draft", callback: "onRetry", label: "联网后重试" },
  { state: "permission-denied", callback: "onSignIn", label: "重新登录" },
  { state: "stale-version-conflict", callback: "onReload", label: "载入最新版本" },
  { state: "retry", callback: "onRetry", label: "再次重试" },
];

describe("RecoveryPanel", () => {
  it.each(recoveryCases)("maps $state to its fixed recovery action", async ({ callback, label, state }) => {
    const user = userEvent.setup();
    const handler = vi.fn();

    render(<RecoveryPanel state={state} {...{ [callback]: handler }} />);

    const panel = screen.getByRole(
      ["offline-draft", "retry"].includes(state) ? "status" : "alert",
    );
    expect(panel).toHaveAttribute("data-recovery-state", state);
    await user.click(screen.getByRole("button", { name: label }));
    expect(handler).toHaveBeenCalledOnce();
  });

  it("shows a request ID and supports fully replaceable user-facing copy", () => {
    render(
      <RecoveryPanel
        state="recoverable-error"
        actionLabel="Try now"
        ariaLabel="Request recovery"
        message="The request can be repeated."
        onRetry={vi.fn()}
        referenceLabel="Reference"
        requestId=" req_safe_123 "
        title="Connection interrupted"
      />,
    );

    const panel = screen.getByRole("alert", { name: "Request recovery" });
    expect(panel).toHaveTextContent("Connection interrupted");
    expect(panel).toHaveTextContent("The request can be repeated.");
    expect(panel).toHaveTextContent("Reference：req_safe_123");
    expect(screen.getByRole("button", { name: "Try now" })).toBeEnabled();
  });

  it("does not render a dead action and exposes a busy retry state", () => {
    const { rerender } = render(<RecoveryPanel state="recoverable-error" />);
    expect(screen.queryByRole("button")).not.toBeInTheDocument();

    rerender(
      <RecoveryPanel
        state="recoverable-error"
        busy
        busyLabel="Restoring request"
        onRetry={vi.fn()}
      />,
    );
    expect(screen.getByRole("button", { name: "Restoring request" })).toBeDisabled();
  });
});
