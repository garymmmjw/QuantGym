import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

import { AccountMenu } from "./AccountMenu";

describe("AccountMenu", () => {
  it("supports menu arrow keys and restores the trigger after Escape", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AccountMenu
          language="zh-CN"
          onLanguageChange={vi.fn()}
          onSignOut={vi.fn()}
          theme="light"
          user={{ displayName: "Gary", email: "gary@example.com" }}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "打开账户菜单" });
    await user.click(trigger);
    expect(screen.getByRole("menuitem", { name: "账户资料" })).toHaveFocus();

    await user.keyboard("{ArrowDown}");
    expect(screen.getByRole("menuitem", { name: "偏好设置" })).toHaveFocus();
    await user.keyboard("{End}");
    expect(screen.getByRole("menuitem", { name: "退出登录" })).toHaveFocus();

    await user.keyboard("{Escape}");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("restores focus after an in-place language action closes the menu", async () => {
    const user = userEvent.setup();
    const onLanguageChange = vi.fn();
    render(
      <MemoryRouter>
        <AccountMenu
          language="zh-CN"
          onLanguageChange={onLanguageChange}
          theme="light"
          user={{ displayName: "Gary" }}
        />
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "打开账户菜单" });
    await user.click(trigger);
    await user.click(screen.getByRole("menuitem", { name: "Switch to English" }));

    expect(onLanguageChange).toHaveBeenCalledWith("en");
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("closes after keyboard focus leaves the whole account region", async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <AccountMenu
          language="zh-CN"
          onLanguageChange={vi.fn()}
          theme="light"
          user={{ displayName: "Gary" }}
        />
        <button type="button">账户区后的操作</button>
      </MemoryRouter>,
    );

    const trigger = screen.getByRole("button", { name: "打开账户菜单" });
    await user.click(trigger);
    expect(screen.getByRole("menuitem", { name: "账户资料" })).toHaveFocus();

    await user.tab({ shift: true });
    expect(trigger).toHaveFocus();
    expect(trigger).toHaveAttribute("aria-expanded", "true");

    await user.tab();
    expect(screen.getByRole("button", { name: "账户区后的操作" })).toHaveFocus();
    expect(screen.queryByRole("menu")).not.toBeInTheDocument();
    expect(trigger).toHaveAttribute("aria-expanded", "false");
  });
});
