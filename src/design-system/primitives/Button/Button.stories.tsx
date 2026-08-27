import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "./Button";

const meta = {
  title: "Design System/Primitives/Button",
  component: Button,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        data-qg-theme={context.parameters.theme === "dark" ? "dark" : "light"}
        style={{
          minHeight: "8rem",
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
    children: "Start practice",
  },
  argTypes: {
    variant: { control: "select", options: ["primary", "secondary", "ghost", "danger"] },
    size: { control: "select", options: ["small", "medium", "large"] },
  },
} satisfies Meta<typeof Button>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  parameters: { theme: "dark" },
};

export const Loading: Story = {
  args: { isLoading: true, loadingLabel: "Building your plan" },
};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Active: Story = {
  args: { "aria-pressed": true, children: "Added to today" },
};

export const Focus: Story = {
  args: { autoFocus: true, variant: "secondary" },
};

export const ReducedMotion: Story = {
  parameters: { motion: "reduced" },
};

export const Variants: Story = {
  render: () => (
    <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
      <Button>Primary</Button>
      <Button variant="secondary">Secondary</Button>
      <Button variant="ghost">Ghost</Button>
      <Button variant="danger">Danger</Button>
    </div>
  ),
};
