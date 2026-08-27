import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../../primitives/Button";
import { EmptyState } from "./EmptyState";

const meta = {
  title: "Patterns/EmptyState",
  component: EmptyState,
  args: {
    title: "No questions found",
    description: "Try widening your filters or choosing another topic.",
    mascot: "search",
    action: <Button>Clear filters</Button>,
  },
} satisfies Meta<typeof EmptyState>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Empty: Story = {};

export const Error: Story = {
  args: {
    title: "We could not load this set",
    description: "Check your connection and try again.",
    mascot: "oops",
    action: <Button>Retry</Button>,
  },
};

export const CopyOnly: Story = {
  render: () => (
    <EmptyState
      title="All caught up"
      description="There is nothing else to review right now."
    />
  ),
};
