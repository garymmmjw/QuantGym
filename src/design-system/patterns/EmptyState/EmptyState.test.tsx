import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders at most one primary mascot with the state copy and action", () => {
    const { container } = render(
      <EmptyState
        title="No questions found"
        description="Try widening your filters."
        mascot="search"
        action={<button type="button">Clear filters</button>}
      />,
    );

    expect(screen.getByRole("heading", { name: "No questions found", level: 2 })).toBeInTheDocument();
    expect(screen.getByText("Try widening your filters.")).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Clear filters" })).toBeInTheDocument();
    expect(container.querySelectorAll('[data-quanty-prominence="primary"]')).toHaveLength(1);
    expect(container.querySelector('[data-quanty-asset="search"]')).toBeInTheDocument();
  });

  it("supports a copy-only state without injecting a mascot", () => {
    const { container } = render(
      <EmptyState title="All caught up" headingLevel={3} />,
    );

    expect(screen.getByRole("heading", { name: "All caught up", level: 3 })).toBeInTheDocument();
    expect(container.querySelector("img")).not.toBeInTheDocument();
  });
});
