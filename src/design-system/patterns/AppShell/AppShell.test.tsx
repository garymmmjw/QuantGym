import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { readFileSync } from "node:fs";
import { MemoryRouter } from "react-router-dom";

import { AppShell } from "./AppShell";

const readSiblingCss = (relativePath: string) => readFileSync(new URL(relativePath, import.meta.url), "utf8");

const renderShell = (
  initialEntry = "/problems",
  overrides: Partial<React.ComponentProps<typeof AppShell>> = {},
) => render(
  <MemoryRouter initialEntries={[initialEntry]}>
    <AppShell
      language="zh-CN"
      onLanguageChange={vi.fn()}
      onToggleTheme={vi.fn()}
      theme="light"
      user={{ displayName: "Gary", email: "gary@example.com" }}
      {...overrides}
    >
      <h1>题目训练</h1>
    </AppShell>
  </MemoryRouter>,
);

describe("AppShell", () => {
  it("provides skip navigation and an exact current-route state", () => {
    renderShell();

    expect(screen.getByRole("link", { name: "跳到主要内容" })).toHaveAttribute("href", "#qg-main-content");
    expect(screen.getByRole("main")).toHaveAttribute("id", "qg-main-content");
    const problemLinks = screen.getAllByRole("link", { name: "题目" });
    expect(problemLinks).toHaveLength(2);
    expect(problemLinks.every((link) => link.getAttribute("aria-current") === "page")).toBe(true);
    expect(screen.getByRole("heading", { name: "题目训练" })).toBeInTheDocument();
  });

  it("supports keyboard-visible sidebar collapse without losing route labels", async () => {
    const user = userEvent.setup();
    renderShell();

    const collapse = screen.getByRole("button", { name: "收起侧边栏" });
    collapse.focus();
    await user.keyboard("{Enter}");

    expect(screen.getByRole("button", { name: "展开侧边栏" })).toHaveAttribute("aria-pressed", "true");
    expect(screen.getAllByRole("link", { name: "题目" }).some((link) => link.getAttribute("title") === "题目")).toBe(true);
  });

  it("does not mark a parent route current for an unmatched prefixed URL", () => {
    renderShell("/problems/typo");

    expect(screen.getAllByRole("link", { name: "题目" }).every(
      (link) => link.getAttribute("aria-current") === null,
    )).toBe(true);
    expect(screen.getByRole("button", { name: "更多" })).toHaveAttribute("aria-current", "page");
  });

  it("forwards theme and language actions without persisting user data", async () => {
    const user = userEvent.setup();
    const onToggleTheme = vi.fn();
    const onLanguageChange = vi.fn();
    renderShell("/", { onLanguageChange, onToggleTheme });

    await user.click(screen.getAllByRole("button", { name: "切换到深色主题" })[0] as HTMLElement);
    expect(onToggleTheme).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "打开账户菜单" }));
    await user.click(screen.getByRole("menuitem", { name: "Switch to English" }));
    expect(onLanguageChange).toHaveBeenCalledWith("en");
  });

  it("locks the approved 252px desktop shell and 860px mobile switch in CSS", () => {
    const appShellCss = readSiblingCss("./AppShell.module.css");
    const desktopSidebarCss = readSiblingCss("../DesktopSidebar/DesktopSidebar.module.css");
    const mobileHeaderCss = readSiblingCss("../MobileHeader/MobileHeader.module.css");
    expect(appShellCss).toContain("grid-template-columns: var(--qg-shell-sidebar-width)");
    expect(appShellCss).toContain("@media (width <= 860px)");
    expect(desktopSidebarCss).toContain("inline-size: var(--qg-shell-sidebar-width)");
    expect(mobileHeaderCss).toContain("min-inline-size: var(--qg-touch-target-min)");
  });
});
