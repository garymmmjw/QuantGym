import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { Spinner } from "./Spinner";

describe("Spinner", () => {
  it("announces a named loading operation", () => {
    render(<Spinner label="Loading practice plan" />);

    expect(screen.getByRole("status", { name: "Loading practice plan" })).toBeInTheDocument();
  });

  it("can be hidden from assistive technology when another element owns the status", () => {
    const { container } = render(<Spinner decorative />);

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(container.firstChild).toHaveAttribute("aria-hidden", "true");
  });
});
