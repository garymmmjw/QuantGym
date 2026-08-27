import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../../primitives/Button";
import { ResultSummary } from "./ResultSummary";

const meta = {
  title: "Patterns/ResultSummary",
  component: ResultSummary,
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        style={{ maxWidth: "48rem", padding: "2rem" }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    status: "completed",
    title: "Training complete",
    description: "Your official result is saved and the linked plan task is now complete.",
    scoreValue: "84",
    scoreLabel: "score",
    metrics: [
      { label: "Accuracy", value: "87.5%" },
      { label: "Time", value: "08:42" },
      { label: "Plan", value: "7 / 10" },
    ],
    actions: <><Button>Continue</Button><Button variant="ghost">Review solution</Button></>,
  },
} satisfies Meta<typeof ResultSummary>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Completion: Story = {};

export const Reward: Story = {
  args: {
    status: "reward",
    title: "Rewards added",
    rewards: [
      { id: "xp", label: "Experience", value: "+20 XP" },
      { id: "streak", label: "Streak", value: "9 days" },
    ],
  },
};

export const Error: Story = {
  args: {
    status: "error",
    title: "Result could not be loaded",
    description: "Your answer remains saved. Retry without starting another attempt.",
    scoreValue: undefined,
    metrics: [],
    actions: <Button variant="secondary">Retry</Button>,
  },
};

export const ReducedMotion: Story = {
  args: { status: "reward", rewards: [{ id: "xp", label: "Experience", value: "+30 XP" }] },
  parameters: { motion: "reduced" },
};
