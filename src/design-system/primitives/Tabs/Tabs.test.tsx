import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Tabs, type TabDefinition } from "./Tabs";

const tabs: readonly TabDefinition[] = [
  { id: "overview", label: "Overview", content: "Overview content" },
  { id: "locked", label: "Locked", content: "Locked content", disabled: true },
  { id: "activity", label: "Activity", content: "Activity content" },
];

describe("Tabs", () => {
  it("links the active tab to its tab panel", () => {
    render(<Tabs ariaLabel="Account sections" defaultValue="overview" tabs={tabs} />);

    const activeTab = screen.getByRole("tab", { name: "Overview" });
    const panel = screen.getByRole("tabpanel", { name: "Overview" });

    expect(screen.getByRole("tablist", { name: "Account sections" })).toBeInTheDocument();
    expect(activeTab).toHaveAttribute("aria-selected", "true");
    expect(activeTab).toHaveAttribute("aria-controls", panel.id);
    expect(panel).toHaveTextContent("Overview content");
  });

  it("supports roving keyboard focus and skips disabled tabs", async () => {
    const user = userEvent.setup();
    render(<Tabs ariaLabel="Account sections" defaultValue="overview" tabs={tabs} />);

    const overview = screen.getByRole("tab", { name: "Overview" });
    const activity = screen.getByRole("tab", { name: "Activity" });

    overview.focus();
    await user.keyboard("{ArrowRight}");

    expect(activity).toHaveFocus();
    expect(activity).toHaveAttribute("aria-selected", "true");
    expect(screen.getByRole("tabpanel", { name: "Activity" })).toHaveTextContent(
      "Activity content",
    );

    await user.keyboard("{Home}");
    expect(overview).toHaveFocus();
    expect(overview).toHaveAttribute("aria-selected", "true");
  });

  it("reports controlled value changes without mutating the selected tab", async () => {
    const user = userEvent.setup();
    const onValueChange = vi.fn();
    render(
      <Tabs
        ariaLabel="Account sections"
        onValueChange={onValueChange}
        tabs={tabs}
        value="overview"
      />,
    );

    await user.click(screen.getByRole("tab", { name: "Activity" }));

    expect(onValueChange).toHaveBeenCalledWith("activity");
    expect(screen.getByRole("tab", { name: "Overview" })).toHaveAttribute(
      "aria-selected",
      "true",
    );
  });

  it("keeps vertical layout semantics aligned with up and down keyboard navigation", async () => {
    const user = userEvent.setup();
    render(
      <Tabs
        ariaLabel="Vertical account sections"
        defaultValue="overview"
        orientation="vertical"
        tabs={tabs}
      />,
    );

    const tabList = screen.getByRole("tablist", { name: "Vertical account sections" });
    const overview = screen.getByRole("tab", { name: "Overview" });
    const activity = screen.getByRole("tab", { name: "Activity" });
    expect(tabList).toHaveAttribute("aria-orientation", "vertical");

    overview.focus();
    await user.keyboard("{ArrowRight}");
    expect(overview).toHaveFocus();
    await user.keyboard("{ArrowDown}");
    expect(activity).toHaveFocus();
  });
});
