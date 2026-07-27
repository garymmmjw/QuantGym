import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../../primitives/Button";
import { EmptyState } from "../EmptyState";
import { Metric } from "../Metric";
import { NetworkBanner } from "../NetworkBanner";
import { RecoveryPanel } from "../RecoveryPanel";
import { DashboardTemplate } from "./DashboardTemplate";

const dashboardContent = (
  <section aria-labelledby="today-heading">
    <h2 id="today-heading">Today&apos;s training plan</h2>
    <p>Complete the probability drill, then review the linked weak skill.</p>
  </section>
);

const dashboardMetrics = (
  <>
    <Metric label="Weekly XP" value="438" trend="+12.4%" tone="positive" />
    <Metric label="Current streak" value="9 days" detail="Best: 14 days" />
    <Metric label="Plan progress" value="6 / 10" detail="Two tasks due today" />
  </>
);

const meta = {
  title: "Patterns/DashboardTemplate",
  component: DashboardTemplate,
  decorators: [
    (Story, context) => (
      <div
        data-qg-motion={context.parameters.motion === "reduced" ? "reduced" : undefined}
        style={{ minWidth: "min(72rem, 92vw)", padding: "2rem" }}
      >
        <Story />
      </div>
    ),
  ],
  args: {
    title: "Your training overview",
    eyebrow: "Monday · daily loop",
    description: "Start with the highest-priority task and keep every outcome connected to your plan.",
    primaryAction: <Button>Resume training</Button>,
    secondaryAction: <Button variant="ghost">View plan</Button>,
    metrics: dashboardMetrics,
    children: dashboardContent,
  },
} satisfies Meta<typeof DashboardTemplate>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Loading: Story = {
  args: { status: "loading" },
};

export const Empty: Story = {
  args: {
    metrics: undefined,
    children: (
      <EmptyState
        action={<Button>Create a plan</Button>}
        description="Create a goal and QuantGym will prepare the first focused task."
        mascot="search"
        title="No training plan yet"
      />
    ),
  },
};

export const Error: Story = {
  args: {
    metrics: undefined,
    children: <RecoveryPanel onRetry={() => undefined} state="recoverable-error" />,
  },
};

export const Offline: Story = {
  args: {
    hero: <NetworkBanner onAction={() => undefined} status="offline" />,
  },
};

export const PermissionDenied: Story = {
  args: {
    metrics: undefined,
    children: <RecoveryPanel onSignIn={() => undefined} state="permission-denied" />,
  },
};
