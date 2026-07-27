import type { Meta, StoryObj } from "@storybook/react-vite";

import { TextField } from "../../primitives/TextField";
import { FilterBar } from "./FilterBar";

const controls = (
  <>
    <TextField label="Search problems" name="search" placeholder="Probability, market making…" />
    <label>
      Difficulty
      <select defaultValue="all" name="difficulty">
        <option value="all">All difficulties</option>
        <option value="medium">Medium</option>
        <option value="hard">Hard</option>
      </select>
    </label>
  </>
);

const meta = {
  title: "Patterns/FilterBar",
  component: FilterBar,
  decorators: [(Story) => <div style={{ minWidth: "min(52rem, 92vw)", padding: "2rem" }}><Story /></div>],
  args: {
    activeCount: 2,
    children: controls,
    onClear: () => undefined,
    onSubmit: () => undefined,
    resultSummary: "128 matching problems",
  },
} satisfies Meta<typeof FilterBar>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Disabled: Story = {
  args: { disabled: true },
};

export const Focus: Story = {
  args: {
    children: (
      <TextField autoFocus label="Search problems" name="search" placeholder="Probability…" />
    ),
  },
};
