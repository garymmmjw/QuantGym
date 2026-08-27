import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";

import { Dialog } from "./Dialog";

const DialogHarness = () => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open dialog
      </button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirm practice"
        description="Your current answer will be saved."
        closeLabel="Close dialog"
      >
        <button type="button">Cancel</button>
        <button type="button">Continue</button>
      </Dialog>
    </>
  );
};

const InitialFocusHarness = () => {
  const preferredFocusRef = useRef<HTMLButtonElement>(null);

  return (
    <Dialog
      open
      onOpenChange={vi.fn()}
      title="Choose a path"
      initialFocusRef={preferredFocusRef}
    >
      <button type="button">Secondary</button>
      <button ref={preferredFocusRef} type="button">Preferred</button>
    </Dialog>
  );
};

describe("Dialog", () => {
  it("labels the modal, traps keyboard focus, closes on Escape, and restores focus", async () => {
    const user = userEvent.setup();
    render(<DialogHarness />);

    const trigger = screen.getByRole("button", { name: "Open dialog" });
    await user.click(trigger);

    const dialog = screen.getByRole("dialog", { name: "Confirm practice" });
    expect(dialog).toHaveAttribute("aria-modal", "true");
    expect(dialog).toHaveAccessibleDescription("Your current answer will be saved.");

    const close = screen.getByRole("button", { name: "Close dialog" });
    const continueButton = screen.getByRole("button", { name: "Continue" });
    expect(close).toHaveFocus();
    expect(document.body).toHaveStyle({ overflow: "hidden" });

    await user.tab({ shift: true });
    expect(continueButton).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
    expect(document.body.style.overflow).toBe("");
  });

  it("only dismisses from the backdrop when backdrop dismissal is enabled", async () => {
    const user = userEvent.setup();
    const onOpenChange = vi.fn();
    const { rerender } = render(
      <Dialog open onOpenChange={onOpenChange} title="Details" closeOnBackdrop={false}>
        <p>Dialog content</p>
      </Dialog>,
    );

    await user.click(screen.getByTestId("dialog-backdrop"));
    expect(onOpenChange).not.toHaveBeenCalled();

    rerender(
      <Dialog open onOpenChange={onOpenChange} title="Details" closeOnBackdrop>
        <p>Dialog content</p>
      </Dialog>,
    );
    await user.click(screen.getByTestId("dialog-backdrop"));
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps focus on the modal surface when there are no tabbable descendants", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onOpenChange={vi.fn()} title="Read only notice">
        <p>There are no actions in this notice.</p>
      </Dialog>,
    );

    const dialog = screen.getByRole("dialog", { name: "Read only notice" });
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(close).toHaveFocus();

    close.setAttribute("disabled", "");
    dialog.focus();
    await user.tab();
    expect(dialog).toHaveFocus();
  });

  it("honors an explicit initial focus target inside the dialog", () => {
    render(<InitialFocusHarness />);

    expect(screen.getByRole("button", { name: "Preferred" })).toHaveFocus();
  });

  it("includes native disclosure controls and skips CSS-hidden descendants", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onOpenChange={vi.fn()} title="Advanced practice settings">
        <button type="button">Visible action</button>
        <button type="button" style={{ display: "none" }}>Hidden action</button>
        <details>
          <summary>Advanced options</summary>
          <p>Optional controls</p>
          <button type="button">Hidden nested action</button>
          <details>
            <summary>Nested hidden options</summary>
          </details>
        </details>
        <fieldset disabled>
          <button type="button">Disabled fieldset action</button>
        </fieldset>
      </Dialog>,
    );

    const close = screen.getByRole("button", { name: "Close dialog" });
    const summary = screen.getByText("Advanced options");
    expect(close).toHaveFocus();

    await user.tab({ shift: true });
    expect(summary).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
  });

  it("uses the native sequential tab stop for a named radio group", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onOpenChange={vi.fn()} title="Choose a practice mode">
        <label>
          <input defaultChecked name="mode" type="radio" />
          Guided
        </label>
        <label>
          <input name="mode" type="radio" />
          Timed
        </label>
      </Dialog>,
    );

    const close = screen.getByRole("button", { name: "Close dialog" });
    const guided = screen.getByRole("radio", { name: "Guided" });
    const timed = screen.getByRole("radio", { name: "Timed" });
    guided.focus();
    await user.tab();
    expect(close).toHaveFocus();

    timed.focus();
    await user.tab();
    expect(close).toHaveFocus();
  });

  it("orders positive tabindex controls before ordinary tab stops", async () => {
    const user = userEvent.setup();
    render(
      <Dialog open onOpenChange={vi.fn()} title="Ordered controls">
        <button type="button" tabIndex={2}>Second positive stop</button>
        <button type="button" tabIndex={1}>First positive stop</button>
      </Dialog>,
    );

    const firstPositive = screen.getByRole("button", { name: "First positive stop" });
    const close = screen.getByRole("button", { name: "Close dialog" });
    expect(firstPositive).toHaveFocus();

    await user.tab({ shift: true });
    expect(close).toHaveFocus();
    await user.tab();
    expect(firstPositive).toHaveFocus();
  });

  it("wraps focus through boundary guards for embedded browsing contexts", () => {
    render(
      <Dialog open onOpenChange={vi.fn()} title="Embedded practice">
        <button type="button">Last action</button>
      </Dialog>,
    );

    const close = screen.getByRole("button", { name: "Close dialog" });
    const lastAction = screen.getByRole("button", { name: "Last action" });
    const startGuard = document.querySelector<HTMLElement>(
      '[data-modal-focus-guard="start"]',
    );
    const endGuard = document.querySelector<HTMLElement>(
      '[data-modal-focus-guard="end"]',
    );
    expect(startGuard).not.toBeNull();
    expect(endGuard).not.toBeNull();

    endGuard?.focus();
    expect(close).toHaveFocus();
    startGuard?.focus();
    expect(lastAction).toHaveFocus();
  });
});
