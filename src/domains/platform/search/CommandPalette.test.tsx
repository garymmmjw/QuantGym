import "@testing-library/jest-dom/vitest";

import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";

import {
  CommandPalette,
  createPhase1SearchRegistry,
  SearchProviderRegistry,
  useGlobalSearchShortcut,
  type PresentedSearchResult,
  type SearchLanguage,
  type SearchProviderResult,
} from "./index";

const registry = createPhase1SearchRegistry({
  v2Navigation: [
    {
      description: {
        "en": "Open the V2 recovery tools.",
        "zh-CN": "打开 V2 恢复工具。",
      },
      href: "/system/recovery",
      id: "v2-recovery",
      kind: "v2-navigation",
      keywords: ["network", "offline", "网络", "离线"],
      title: {
        "en": "Network recovery",
        "zh-CN": "网络恢复",
      },
    },
  ],
  compatibilityNavigation: [
    {
      href: "/problems",
      id: "compat-problems",
      kind: "compatibility-navigation",
      keywords: ["practice", "题目", "训练"],
      title: {
        "en": "Problems",
        "zh-CN": "题目",
      },
    },
    {
      href: "/companies",
      id: "compat-companies",
      kind: "compatibility-navigation",
      keywords: ["career", "公司", "求职"],
      title: {
        "en": "Companies",
        "zh-CN": "公司",
      },
    },
  ],
});

const PaletteHarness = ({
  language = "en",
  onNavigate = vi.fn(),
  shortcut = false,
}: Readonly<{
  language?: SearchLanguage;
  onNavigate?: (result: SearchProviderResult) => void;
  shortcut?: boolean;
}>) => {
  const [open, setOpen] = useState(false);
  useGlobalSearchShortcut({
    enabled: shortcut,
    onOpen: () => setOpen(true),
  });

  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open global search
      </button>
      <CommandPalette
        language={language}
        onNavigate={onNavigate}
        onOpenChange={setOpen}
        open={open}
        registry={registry}
      />
    </>
  );
};

describe("CommandPalette", () => {
  it("focuses the search input, labels compatibility results, and renders an empty state", async () => {
    const user = userEvent.setup();
    render(<PaletteHarness language="zh-CN" />);

    await user.click(screen.getByRole("button", { name: "Open global search" }));

    const input = screen.getByRole("combobox", { name: "全局搜索" });
    expect(input).toHaveFocus();
    expect(screen.getByRole("dialog", { name: "全局搜索" })).toBeInTheDocument();
    expect(screen.getByRole("region", { name: "搜索结果" })).toHaveAttribute(
      "tabindex",
      "0",
    );
    expect(await screen.findAllByText("兼容预览")).toHaveLength(2);

    await user.type(input, "完全不存在的模块");
    expect(await screen.findByText("没有找到匹配结果")).toBeInTheDocument();
  });

  it("supports Arrow keys, Home, End, Enter, and restores focus after selection", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    render(<PaletteHarness onNavigate={onNavigate} />);

    const trigger = screen.getByRole("button", { name: "Open global search" });
    await user.click(trigger);
    const input = screen.getByRole("combobox", { name: "Global search" });
    const listbox = await screen.findByRole("listbox", { name: "Search results" });
    await waitFor(() => expect(within(listbox).getAllByRole("option")).toHaveLength(3));
    const lastOption = within(listbox).getAllByRole("option").at(-1);
    expect(lastOption).toBeDefined();
    const scrollIntoView = vi.fn();
    Object.defineProperty(lastOption as HTMLElement, "scrollIntoView", {
      configurable: true,
      value: scrollIntoView,
    });

    await user.keyboard("{End}");
    expect(input).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("compat-companies"),
    );
    await waitFor(() => expect(scrollIntoView).toHaveBeenCalledWith({ block: "nearest" }));
    await user.keyboard("{Home}{ArrowDown}{ArrowUp}{ArrowDown}{Enter}");

    expect(onNavigate).toHaveBeenCalledWith(expect.objectContaining({
      href: "/problems",
      id: "compat-problems",
      kind: "compatibility-navigation",
    }));
    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("inherits focus trapping and Escape restoration from the shared Dialog", async () => {
    const user = userEvent.setup();
    render(<PaletteHarness />);

    const trigger = screen.getByRole("button", { name: "Open global search" });
    await user.click(trigger);
    const input = screen.getByRole("combobox", { name: "Global search" });
    const resultsRegion = screen.getByRole("region", { name: "Search results" });
    const close = screen.getByRole("button", { name: "Close global search" });
    expect(input).toHaveFocus();

    await user.tab();
    expect(resultsRegion).toHaveFocus();
    await user.tab();
    expect(close).toHaveFocus();
    await user.tab();
    expect(input).toHaveFocus();
    await user.keyboard("{Escape}");

    expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
    expect(trigger).toHaveFocus();
  });

  it("never opens a stale result while a new query is still loading", async () => {
    const user = userEvent.setup();
    const onNavigate = vi.fn();
    let resolveSearch: ((results: readonly SearchProviderResult[]) => void) | undefined;
    const pendingSearch = new Promise<readonly SearchProviderResult[]>((resolve) => {
      resolveSearch = resolve;
    });
    const slowRegistry = {
      search: vi.fn(({ query }: Readonly<{ query: string }>) => (
        query === ""
          ? Promise.resolve([
            {
              href: "/problems",
              id: "old-problems",
              kind: "compatibility-navigation",
              presentation: {
                badge: { kind: "compatibility" },
                badgeTone: "compatibility",
                marker: "↗",
              },
              providerId: "test",
              title: { en: "Problems", "zh-CN": "题目" },
            },
          ])
          : pendingSearch
      )),
    };
    const SlowHarness = () => {
      const [open, setOpen] = useState(true);
      return (
        <CommandPalette
          language="en"
          onNavigate={onNavigate}
          onOpenChange={setOpen}
          open={open}
          registry={slowRegistry as unknown as Parameters<typeof CommandPalette>[0]["registry"]}
        />
      );
    };
    render(<SlowHarness />);
    const input = screen.getByRole("combobox", { name: "Global search" });
    await waitFor(() => expect(input).toHaveAttribute(
      "aria-activedescendant",
      expect.stringContaining("old-problems"),
    ));

    await user.type(input, "companies");
    await user.keyboard("{Enter}");
    expect(onNavigate).not.toHaveBeenCalled();

    resolveSearch?.([]);
  });

  it("renders an async business result without a domain-specific renderer", async () => {
    const businessResult: PresentedSearchResult<"problem"> = {
      description: {
        "en": "Server-backed problem result",
        "zh-CN": "服务端题目结果",
      },
      href: "/problems/two-sum",
      id: "problem-two-sum",
      kind: "problem",
      presentation: {
        badge: {
          kind: "label",
          label: { "en": "Problem", "zh-CN": "题目" },
        },
        badgeTone: "entity",
        marker: "P",
      },
      title: { "en": "Two Sum", "zh-CN": "两数之和" },
    };
    const businessRegistry = new SearchProviderRegistry();
    businessRegistry.register({
      id: "future-problem-provider",
      async search() {
        await Promise.resolve();
        return [businessResult];
      },
    });

    render(
      <CommandPalette
        language="en"
        onNavigate={vi.fn()}
        onOpenChange={vi.fn()}
        open
        registry={businessRegistry}
      />,
    );

    const option = await screen.findByRole("option", { name: /Two Sum/u });
    expect(within(option).getByText("P")).toBeInTheDocument();
    expect(within(option).getByText("Problem")).toBeInTheDocument();
  });

  it("opens from both Cmd+K and Ctrl+K through the exported shortcut hook", async () => {
    const user = userEvent.setup();
    render(<PaletteHarness shortcut />);

    const trigger = screen.getByRole("button", { name: "Open global search" });
    trigger.focus();
    fireEvent.keyDown(window, { key: "k", metaKey: true });
    expect(await screen.findByRole("dialog", { name: "Global search" })).toBeInTheDocument();
    await user.keyboard("{Escape}");
    expect(trigger).toHaveFocus();

    fireEvent.keyDown(window, { key: "K", ctrlKey: true });
    expect(await screen.findByRole("dialog", { name: "Global search" })).toBeInTheDocument();
  });
});
