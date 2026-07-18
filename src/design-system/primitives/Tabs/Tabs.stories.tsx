import type { Meta, StoryObj } from "@storybook/react-vite";

import { Tabs, type TabDefinition } from "./Tabs";

const exampleTabs: readonly TabDefinition[] = [
  {
    id: "overview",
    label: "Overview",
    content: "A concise view of your current learning rhythm.",
  },
  {
    id: "activity",
    label: "Activity",
    content: "Your latest practice and review activity.",
  },
  {
    id: "insights",
    label: "Insights",
    content: "Personalized performance insights.",
  },
];

const meta = {
  title: "Design System/Primitives/Tabs",
  component: Tabs,
  tags: ["autodocs"],
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        data-qg-theme={context.parameters.theme === "dark" ? "dark" : "light"}
        style={{
          minHeight: "12rem",
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
    ariaLabel: "Learning insights",
    tabs: exampleTabs,
  },
} satisfies Meta<typeof Tabs>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Light: Story = {};

export const Dark: Story = {
  args: { defaultValue: "activity" },
  parameters: { theme: "dark" },
};

export const Active: Story = {
  args: { defaultValue: "insights" },
};

export const WithDisabledTab: Story = {
  args: {
    tabs: [
      exampleTabs[0]!,
      { ...exampleTabs[1]!, disabled: true },
      exampleTabs[2]!,
    ],
  },
};

export const Vertical: Story = {
  args: { orientation: "vertical" },
};

export const Focus: Story = {
  args: { autoFocus: true },
};

export const ReducedMotion: Story = {
  parameters: { motion: "reduced" },
};
