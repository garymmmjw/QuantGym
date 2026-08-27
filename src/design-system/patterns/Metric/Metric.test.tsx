import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { Metric } from "./Metric";

describe("Metric", () => {
  it("uses tabular metric semantics and meaningful trend copy", () => {
    render(
      <Metric
        detail="48 XP ahead of last week"
        label="Weekly XP"
        tone="positive"
        trend="+12.4%"
        value="438"
      />,
    );

    const metric = screen.getByRole("region", { name: "Weekly XP" });
    expect(metric).toHaveAttribute("data-metric-tone", "positive");
    expect(metric.querySelector("[data-qg-metric]")).toHaveTextContent("438");
    expect(metric).toHaveTextContent("+12.4%");
  });

  it("replaces the value with an announced loading state", () => {
    render(<Metric label="Plan progress" loading loadingLabel="Loading plan progress" value="6 / 10" />);

    expect(screen.getByRole("region", { name: "Plan progress" })).toHaveAttribute("aria-busy", "true");
    expect(screen.getByRole("status", { name: "Loading plan progress" })).toBeInTheDocument();
    expect(screen.queryByText("6 / 10")).not.toBeInTheDocument();
  });
});
