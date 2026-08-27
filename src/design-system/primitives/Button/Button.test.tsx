import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { Button } from "./Button";

describe("Button", () => {
  it("is a safe, keyboard-operable button by default", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(<Button onClick={onClick}>Start practice</Button>);

    const button = screen.getByRole("button", { name: "Start practice" });
    expect(button).toHaveAttribute("type", "button");

    await user.tab();
    expect(button).toHaveFocus();
    await user.keyboard("{Enter}");
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("prevents interaction while disabled", async () => {
    const user = userEvent.setup();
    const onClick = vi.fn();

    render(
      <Button disabled onClick={onClick}>
        Save plan
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Save plan" });
    expect(button).toBeDisabled();
    await user.click(button);
    expect(onClick).not.toHaveBeenCalled();
  });

  it("announces and locks its loading state", () => {
    render(
      <Button isLoading loadingLabel="Saving plan">
        Save plan
      </Button>,
    );

    const button = screen.getByRole("button", { name: "Saving plan" });
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
    expect(button).toHaveTextContent("Saving plan");
    expect(screen.getByRole("status")).toHaveTextContent("Saving plan");
    expect(button.querySelector("[aria-hidden='true']")).toBeInTheDocument();
  });
});
