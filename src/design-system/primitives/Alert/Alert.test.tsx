import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Alert } from "./Alert";

describe("Alert", () => {
  it("uses a polite status for non-urgent feedback", () => {
    render(
      <Alert title="Plan updated" tone="success">
        Your next practice block is ready.
      </Alert>,
    );

    const alert = screen.getByRole("status");
    expect(alert).toHaveAccessibleName("Plan updated");
    expect(alert).toHaveTextContent("Your next practice block is ready.");
    expect(alert.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });

  it("announces danger feedback assertively", () => {
    render(
      <Alert title="Could not save" tone="danger">
        Check your connection and try again.
      </Alert>,
    );

    expect(screen.getByRole("alert", { name: "Could not save" })).toHaveTextContent(
      "Check your connection and try again.",
    );
  });

  it("offers a keyboard-operable dismiss action", async () => {
    const user = userEvent.setup();
    const onDismiss = vi.fn();
    render(
      <Alert dismissLabel="Dismiss update" onDismiss={onDismiss} title="Updated">
        Saved.
      </Alert>,
    );

    const dismissButton = screen.getByRole("button", { name: "Dismiss update" });
    await user.tab();
    expect(dismissButton).toHaveFocus();
    await user.keyboard(" ");
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
