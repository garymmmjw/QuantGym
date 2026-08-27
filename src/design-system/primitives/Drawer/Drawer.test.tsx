import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import { Drawer } from "./Drawer";

const DrawerHarness = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open filters
      </button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Filters"
        description="Narrow the current question set."
        closeLabel="Close filters"
        side="right"
      >
        <button type="button">Reset</button>
        <button type="button">Apply filters</button>
      </Drawer>
    </>
  );
};

describe("Drawer", () => {
  it("acts as a labelled modal with trapped focus and restores the opener", async () => {
    const user = userEvent.setup();
    render(<DrawerHarness />);

    const trigger = screen.getByRole("button", { name: "Open filters" });
    await user.click(trigger);

    const drawer = screen.getByRole("dialog", { name: "Filters" });
    expect(drawer).toHaveAttribute("aria-modal", "true");
    expect(drawer).toHaveAttribute("data-side", "right");
    expect(drawer).toHaveAccessibleDescription("Narrow the current question set.");

    const close = screen.getByRole("button", { name: "Close filters" });
    const apply = screen.getByRole("button", { name: "Apply filters" });
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(apply).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("wraps focus through boundary guards", () => {
    render(
      <Drawer open onOpenChange={vi.fn()} title="Embedded filters">
        <button type="button">Last filter action</button>
      </Drawer>,
    );

    const close = screen.getByRole("button", { name: "Close drawer" });
    const lastAction = screen.getByRole("button", { name: "Last filter action" });
    const startGuard = document.querySelector<HTMLElement>(
      '[data-modal-focus-guard="start"]',
    );
    const endGuard = document.querySelector<HTMLElement>(
      '[data-modal-focus-guard="end"]',
    );

    endGuard?.focus();
    expect(close).toHaveFocus();
    startGuard?.focus();
    expect(lastAction).toHaveFocus();
  });
});
