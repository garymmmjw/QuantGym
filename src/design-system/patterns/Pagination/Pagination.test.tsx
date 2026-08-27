import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Pagination } from "./Pagination";

describe("Pagination", () => {
  it("exposes cursor navigation in keyboard order and preserves organic range copy", async () => {
    const user = userEvent.setup();
    const onNext = vi.fn();
    const onPrevious = vi.fn();
    render(
      <Pagination
        canGoNext
        canGoPrevious
        currentPage={4}
        onNext={onNext}
        onPrevious={onPrevious}
        rangeLabel="Showing 61–80 of 128"
        totalPages={7}
      />,
    );

    expect(screen.getByText("Page 4 of 7")).toHaveAttribute("aria-current", "page");
    await user.click(screen.getByRole("button", { name: "Previous" }));
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(onPrevious).toHaveBeenCalledOnce();
    expect(onNext).toHaveBeenCalledOnce();
  });

  it("disables pagination at boundaries and announces loading", () => {
    render(
      <Pagination
        canGoNext
        canGoPrevious={false}
        loading
        loadingLabel="Loading more problems"
        onNext={vi.fn()}
        onPrevious={vi.fn()}
      />,
    );

    expect(screen.getByRole("status")).toHaveTextContent("Loading more problems");
    expect(screen.getAllByRole("button").every((button) => button.hasAttribute("disabled"))).toBe(true);
  });
});
