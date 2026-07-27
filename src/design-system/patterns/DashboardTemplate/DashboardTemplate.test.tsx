import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { Button } from "../../primitives/Button";
import { DashboardTemplate } from "./DashboardTemplate";

describe("DashboardTemplate", () => {
  it("keeps the title and primary action available before ready content", () => {
    render(
      <DashboardTemplate
        title="Training overview"
        primaryAction={<Button>Resume training</Button>}
        secondaryAction={<Button>View plan</Button>}
        metrics={<p>438 XP</p>}
      >
        <p>Today&apos;s task</p>
      </DashboardTemplate>,
    );

    expect(screen.getByRole("heading", { level: 1, name: "Training overview" }))
      .toBeInTheDocument();
    expect(screen.getAllByRole("button").map((button) => button.textContent))
      .toEqual(["Resume training", "View plan"]);
    expect(screen.getByRole("region", { name: "Key metrics" })).toHaveTextContent("438 XP");
    expect(screen.getByText("Today's task")).toBeInTheDocument();
  });

  it("announces a layout-matched loading state without exposing stale content", () => {
    render(
      <DashboardTemplate loadingLabel="Loading daily overview" status="loading" title="Overview">
        <button type="button">Stale action</button>
      </DashboardTemplate>,
    );

    const dashboard = screen.getByRole("region", { name: "Overview" });
    expect(dashboard).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "Loading daily overview" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Stale action" })).not.toBeInTheDocument();
  });

  it("marks routes that need a distinct stacked tablet layout", () => {
    render(
      <DashboardTemplate
        aside={<p>Evidence</p>}
        layout="tablet-stacked"
        title="Plan"
      >
        <p>Tasks</p>
      </DashboardTemplate>,
    );

    expect(screen.getByRole("region", { name: "Plan" }))
      .toHaveAttribute("data-dashboard-layout", "tablet-stacked");
  });
});
