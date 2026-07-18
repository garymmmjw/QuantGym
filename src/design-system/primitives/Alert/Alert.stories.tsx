import type { Meta, StoryObj } from "@storybook/react-vite";

import { Alert } from "./Alert";

const meta = {
  title: "Design System/Primitives/Alert",
  component: Alert,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        data-qg-theme={context.parameters.theme === "dark" ? "dark" : "light"}
        style={{
          maxWidth: "38rem",
          minHeight: "9rem",
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
    children: "Your next practice block is ready.",
    title: "Plan updated",
  },
} satisfies Meta<typeof Alert>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  parameters: { theme: "dark" },
};

export const Success: Story = {
  args: { tone: "success" },
};

export const Warning: Story = {
  args: { children: "Review the time limit before starting.", title: "Before you begin", tone: "warning" },
};

export const Error: Story = {
  args: { children: "Check your connection and try again.", title: "Could not save", tone: "danger" },
};

export const Dismissible: Story = {
  args: { dismissLabel: "Dismiss update", onDismiss: () => undefined },
};

export const ReducedMotion: Story = {
  args: { onDismiss: () => undefined },
  parameters: { motion: "reduced" },
};
