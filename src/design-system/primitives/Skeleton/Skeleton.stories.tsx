import type { Meta, StoryObj } from "@storybook/react-vite";

import { Skeleton } from "./Skeleton";

const meta = {
  title: "Design System/Primitives/Skeleton",
  component: Skeleton,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        data-qg-theme={context.parameters.theme === "dark" ? "dark" : "light"}
        style={{
          maxWidth: "32rem",
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
    height: 72,
    label: "Loading performance summary",
  },
} satisfies Meta<typeof Skeleton>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  parameters: { theme: "dark" },
};

export const TextLines: Story = {
  args: { height: 16, lines: 3, variant: "text" },
};

export const Circle: Story = {
  args: { height: 64, variant: "circle", width: 64 },
};

export const ReducedMotion: Story = {
  parameters: { motion: "reduced" },
};
