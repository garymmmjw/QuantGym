import type { Meta, StoryObj } from "@storybook/react-vite";

import { Pagination } from "./Pagination";

const meta = {
  title: "Patterns/Pagination",
  component: Pagination,
  decorators: [(Story) => <div style={{ minWidth: "min(46rem, 90vw)", padding: "2rem" }}><Story /></div>],
  args: {
    canGoNext: true,
    canGoPrevious: true,
    currentPage: 4,
    onNext: () => undefined,
    onPrevious: () => undefined,
    rangeLabel: "Showing 61–80 of 128 problems",
    totalPages: 7,
  },
} satisfies Meta<typeof Pagination>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Boundary: Story = {
  args: { canGoPrevious: false, currentPage: 1 },
};

export const LoadingDisabled: Story = {
  args: { loading: true },
};
