import type { Meta, StoryObj } from "@storybook/react-vite";

import { DraftStatus } from "./DraftStatus";

const meta = {
  title: "Patterns/DraftStatus",
  component: DraftStatus,
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        style={{ maxWidth: "42rem", padding: "2rem" }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    state: "saved",
    timestamp: "Saved 10:42",
  },
} satisfies Meta<typeof DraftStatus>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Saved: Story = {};

export const Saving: Story = {
  args: { state: "saving", timestamp: undefined },
};

export const Offline: Story = {
  args: { actionLabel: "Retry sync", onAction: () => undefined, state: "offline" },
};

export const Conflict: Story = {
  args: { actionLabel: "Review versions", onAction: () => undefined, state: "conflict" },
};

export const Error: Story = {
  args: { disabled: true, onAction: () => undefined, state: "error" },
};

export const ReducedMotion: Story = {
  args: { state: "saving", timestamp: undefined },
  parameters: { motion: "reduced" },
};
