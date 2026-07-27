import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { DraftStatus } from "./DraftStatus";

describe("DraftStatus", () => {
  it.each(["saving", "saved", "queued", "offline", "submitted"] as const)(
    "announces the %s state without interrupting the user",
    (state) => {
      render(<DraftStatus state={state} />);
      expect(screen.getByRole("status")).toHaveAttribute("data-draft-status", state);
      expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    },
  );

  it.each(["conflict", "error"] as const)(
    "announces the actionable %s state assertively",
    async (state) => {
      const user = userEvent.setup();
      const onAction = vi.fn();
      render(<DraftStatus actionLabel="Resolve draft" onAction={onAction} state={state} />);

      expect(screen.getByRole("alert")).toHaveAttribute("aria-live", "assertive");
      await user.click(screen.getByRole("button", { name: "Resolve draft" }));
      expect(onAction).toHaveBeenCalledOnce();
    },
  );

  it("disables retry while the same draft intent is in flight", () => {
    render(<DraftStatus busy onAction={vi.fn()} state="error" />);
    expect(screen.getByRole("button", { name: "Retrying" })).toBeDisabled();
  });
});
