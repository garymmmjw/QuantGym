import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TextField } from "../../primitives/TextField";
import { FilterBar } from "./FilterBar";

const controls = (
  <>
    <TextField label="Search problems" name="search" />
    <label>
      Difficulty
      <select name="difficulty"><option>All</option></select>
    </label>
  </>
);

describe("FilterBar", () => {
  it("keeps keyboard order predictable and submits without navigating", async () => {
    const user = userEvent.setup();
    const onClear = vi.fn();
    const onSubmit = vi.fn();
    render(
      <FilterBar
        activeCount={2}
        onClear={onClear}
        onSubmit={onSubmit}
        resultSummary="128 results"
      >
        {controls}
      </FilterBar>,
    );

    await user.tab();
    expect(screen.getByRole("textbox", { name: "Search problems" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("combobox", { name: "Difficulty" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Clear filters 2 active" })).toHaveFocus();
    await user.tab();
    expect(screen.getByRole("button", { name: "Apply filters" })).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onSubmit).toHaveBeenCalledOnce();

    await user.click(screen.getByRole("button", { name: "Clear filters 2 active" }));
    expect(onClear).toHaveBeenCalledOnce();
  });

  it("disables every control and action while filters are unavailable", () => {
    render(
      <FilterBar activeCount={1} disabled onClear={vi.fn()} onSubmit={vi.fn()}>
        {controls}
      </FilterBar>,
    );

    expect(screen.getByRole("textbox")).toBeDisabled();
    expect(screen.getByRole("combobox")).toBeDisabled();
    expect(screen.getAllByRole("button").every((button) => button.hasAttribute("disabled"))).toBe(true);
  });
});
