import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";

import { Skeleton } from "./Skeleton";

describe("Skeleton", () => {
  it("is decorative by default and reserves the requested layout", () => {
    const { container } = render(<Skeleton height={24} width="12rem" />);

    const skeleton = container.firstChild;
    expect(skeleton).toHaveAttribute("aria-hidden", "true");
    expect(skeleton).toHaveStyle({
      "--qg-skeleton-height": "24px",
      "--qg-skeleton-width": "12rem",
    });
  });

  it("can announce the region it represents", () => {
    render(<Skeleton label="Loading performance summary" lines={3} variant="text" />);

    expect(
      screen.getByRole("status", { name: "Loading performance summary" }),
    ).toBeInTheDocument();
  });
});
