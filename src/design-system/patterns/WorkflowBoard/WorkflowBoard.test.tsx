import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { WorkflowBoard } from "./WorkflowBoard";

describe("WorkflowBoard", () => {
  it("labels every workflow stage and exposes item counts without nested cards", () => {
    render(
      <WorkflowBoard
        ariaLabel="Training workflow"
        columns={[
          {
            id: "today",
            title: "Today",
            items: [
              { id: "one", content: <button type="button">Open probability drill</button> },
              { id: "two", content: "Review weak skill", disabled: true },
            ],
          },
          { id: "next", title: "Next", items: [], emptyState: "No later tasks" },
        ]}
      />,
    );

    expect(screen.getByRole("region", { name: "Training workflow" })).toBeInTheDocument();
    expect(screen.getByRole("group", { name: "Training workflow columns" })).toHaveAttribute("tabindex", "0");
    expect(screen.getAllByRole("listitem")).toHaveLength(2);
    expect(screen.getByLabelText("2 items")).toHaveTextContent("2");
    expect(screen.getByText("Review weak skill").closest("li")).toHaveAttribute("aria-disabled", "true");
    expect(screen.getByText("Review weak skill").closest("li")).toHaveAttribute("inert");
    expect(screen.getByText("No later tasks")).toBeInTheDocument();
  });

  it("announces the read-only state while preserving readable board content", () => {
    render(
      <WorkflowBoard
        ariaLabel="Locked plan"
        columns={[{
          id: "today",
          title: "Today",
          items: [{ id: "locked-task", content: <button type="button">Open locked task</button> }],
        }]}
        disabled
        disabledMessage="Complete the diagnostic first."
      />,
    );

    const board = screen.getByRole("region", { name: "Locked plan" });
    const scroller = board.querySelector('[role="group"]');
    expect(board).toHaveAttribute("aria-disabled", "true");
    expect(scroller).toHaveAttribute("inert");
    expect(scroller).not.toHaveAttribute("tabindex");
    expect(scroller?.querySelector("button")).toHaveTextContent("Open locked task");
    expect(screen.getByRole("status")).toHaveTextContent("Complete the diagnostic first.");
  });
});
