import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextField } from "./TextField";

const meta = {
  title: "Design System/Primitives/TextField",
  component: TextField,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        data-qg-theme={context.parameters.theme === "dark" ? "dark" : "light"}
        style={{
          maxWidth: "30rem",
          minHeight: "10rem",
          padding: "2rem",
          backgroundColor: "var(--qg-app-background)",
          color: "var(--qg-text-primary)",
          fontFamily: "var(--qg-font-ui)",
        }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    label: "Email address",
    hint: "Use your QuantGym account email.",
    placeholder: "gary@example.com",
    type: "email",
  },
} satisfies Meta<typeof TextField>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  parameters: { theme: "dark" },
};

export const Error: Story = {
  args: {
    defaultValue: "not-an-email",
    error: "Enter a valid email address.",
    hint: undefined,
  },
};

export const Disabled: Story = {
  args: { defaultValue: "gary@example.com", disabled: true },
};

export const Required: Story = {
  args: { required: true },
};

export const Focus: Story = {
  args: { autoFocus: true },
};

export const ReducedMotion: Story = {
  parameters: { motion: "reduced" },
};
