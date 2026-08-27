import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../../primitives/Button";
import { WorkflowBoard, type WorkflowBoardColumn } from "./WorkflowBoard";

const task = (title: string, copy: string) => (
  <article>
    <h4>{title}</h4>
    <p>{copy}</p>
    <Button size="small" variant="ghost">Open task</Button>
  </article>
);

const columns: readonly WorkflowBoardColumn[] = [
  {
    id: "today",
    title: "Today",
    description: "Highest-impact work",
    items: [
      { id: "probability", content: task("Probability drill", "Medium · 20 XP") },
      { id: "review", content: task("Review weak skill", "Expected value · 10 min") },
    ],
  },
  {
    id: "next",
    title: "Next",
    description: "Ready after today",
    items: [{ id: "market", content: task("Market making set", "Hard · 30 XP") }],
  },
  {
    id: "complete",
    title: "Complete",
    description: "Latest outcomes",
    items: [{ id: "mental", content: task("Mental math sprint", "Completed · 88%") }],
  },
];

const meta = {
  title: "Patterns/WorkflowBoard",
  component: WorkflowBoard,
  decorators: [(Story) => <div style={{ minWidth: "min(70rem, 94vw)", padding: "2rem" }}><Story /></div>],
  args: {
    ariaLabel: "Training workflow",
    columns,
    title: "Plan board",
    description: "Move through the plan in order; official training tasks complete from their result.",
  },
} satisfies Meta<typeof WorkflowBoard>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Empty: Story = {
  args: {
    columns: columns.map((column) => ({ ...column, items: [], emptyState: "Nothing scheduled here." })),
  },
};

export const Disabled: Story = {
  args: { disabled: true, disabledMessage: "Finish the diagnostic to unlock this board." },
};
