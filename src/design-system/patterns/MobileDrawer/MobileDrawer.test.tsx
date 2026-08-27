import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useRef, useState } from "react";
import { MemoryRouter } from "react-router-dom";

import { SHELL_NAVIGATION_GROUPS } from "../AppShell/navigation";
import { MobileDrawer } from "./MobileDrawer";

function MobileDrawerHarness() {
  const [open, setOpen] = useState(false);
  const openerRef = useRef<HTMLButtonElement>(null);
  return (
    <>
      <button ref={openerRef} type="button" onClick={() => setOpen(true)}>打开导航</button>
      <MobileDrawer
        language="zh-CN"
        navigationGroups={SHELL_NAVIGATION_GROUPS}
        onLanguageChange={vi.fn()}
        onOpenChange={setOpen}
        onToggleTheme={vi.fn()}
        open={open}
        returnFocusRef={openerRef}
        theme="light"
      />
    </>
  );
}

describe("MobileDrawer", () => {
  it("traps focus, closes with Escape, and restores the menu trigger", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MobileDrawerHarness /></MemoryRouter>);
    const opener = screen.getByRole("button", { name: "打开导航" });

    await user.click(opener);
    const dialog = screen.getByRole("dialog", { name: "全部模块" });
    expect(dialog).toBeInTheDocument();
    expect(dialog).toContainElement(document.activeElement as HTMLElement);

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog", { name: "全部模块" })).not.toBeInTheDocument();
    expect(opener).toHaveFocus();
  });

  it("closes after navigating while retaining a complete module set", async () => {
    const user = userEvent.setup();
    render(<MemoryRouter><MobileDrawerHarness /></MemoryRouter>);
    await user.click(screen.getByRole("button", { name: "打开导航" }));

    const links = screen.getAllByRole("link");
    expect(links).toHaveLength(21);
    await user.click(screen.getByRole("link", { name: "计划" }));
    expect(screen.queryByRole("dialog", { name: "全部模块" })).not.toBeInTheDocument();
  });
});
