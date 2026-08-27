import type { Meta, StoryObj } from "@storybook/react-vite";

import { Metric } from "./Metric";

const meta = {
  title: "Patterns/Metric",
  component: Metric,
  decorators: [(Story) => <div style={{ inlineSize: "18rem", padding: "2rem" }}><Story /></div>],
  args: {
    label: "Weekly XP",
    value: "438",
    trend: "+12.4%",
    detail: "48 XP ahead of last week",
    tone: "positive",
    prefix: "XP",
  },
} satisfies Meta<typeof Metric>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Loading: Story = {
  args: { loading: true },
};

export const Reward: Story = {
  args: { label: "Reward earned", value: "+30 XP", trend: "Level 8", tone: "reward" },
};
