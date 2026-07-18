import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

import { TextField } from "./TextField";

describe("TextField", () => {
  it("associates its label and supporting hint with the input", async () => {
    const user = userEvent.setup();

    render(
      <TextField
        label="Email address"
        hint="Use your QuantGym account email."
        name="email"
        type="email"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email address" });
    expect(input).toHaveAccessibleDescription("Use your QuantGym account email.");
    expect(input).not.toHaveAttribute("aria-invalid", "true");

    await user.click(input);
    await user.keyboard("gary@example.com");
    expect(input).toHaveValue("gary@example.com");
  });

  it("programmatically associates and announces an error", () => {
    render(
      <TextField
        defaultValue="not-an-email"
        error="Enter a valid email address."
        label="Email address"
        type="email"
      />,
    );

    const input = screen.getByRole("textbox", { name: "Email address" });
    expect(input).toHaveAttribute("aria-invalid", "true");
    expect(input).toHaveAccessibleDescription("Enter a valid email address.");
    expect(screen.getByRole("alert")).toHaveTextContent("Enter a valid email address.");
  });

  it("exposes native disabled and required states", () => {
    render(<TextField disabled label="Invite code" required />);

    const input = screen.getByRole("textbox", { name: /invite code/i });
    expect(input).toBeDisabled();
    expect(input).toBeRequired();
  });
});
