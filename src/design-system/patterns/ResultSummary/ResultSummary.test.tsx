import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { ResultSummary } from "./ResultSummary";

describe("ResultSummary", () => {
  it("announces completion and reward details as one non-blocking result", () => {
    render(
      <ResultSummary
        description="The linked plan task is complete."
        metrics={[{ label: "Accuracy", value: "87.5%" }]}
        rewards={[{ id: "xp", label: "Experience", value: "+20 XP" }]}
        scoreLabel="score"
        scoreValue="84"
        status="reward"
        title="Training complete"
      />,
    );

    const result = screen.getByRole("status", { name: "Training complete" });
    expect(result).toHaveAttribute("data-result-status", "reward");
    expect(result).toHaveTextContent("Accuracy87.5%");
    expect(screen.getByRole("list", { name: "Rewards earned" })).toHaveTextContent("+20 XP");
  });

  it("uses an assertive alert only for result errors", () => {
    render(<ResultSummary status="error" title="Result unavailable" />);
    expect(screen.getByRole("alert", { name: "Result unavailable" }))
      .toHaveAttribute("aria-live", "assertive");
  });
});
