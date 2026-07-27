import type { Meta, StoryObj } from "@storybook/react-vite";

import { Button } from "../../primitives/Button";
import { RecoveryPanel } from "../RecoveryPanel";
import { ListDetail } from "./ListDetail";

const problemList = (
  <nav aria-label="Problems">
    <ol>
      <li><Button variant="ghost">Expected value</Button></li>
      <li><Button variant="ghost">Bayes&apos; theorem</Button></li>
      <li><Button variant="ghost">Order statistics</Button></li>
    </ol>
  </nav>
);

const problemDetail = (
  <article>
    <p>Medium · Probability</p>
    <p>A fair coin is flipped until two consecutive heads appear. Find the expected flips.</p>
    <Button>Start attempt</Button>
  </article>
);

const meta = {
  title: "Patterns/ListDetail",
  component: ListDetail,
  decorators: [(Story) => <div style={{ minWidth: "min(68rem, 94vw)", padding: "2rem" }}><Story /></div>],
  args: {
    detail: problemDetail,
    detailHeading: "Expected value",
    detailLabel: "Selected problem",
    list: problemList,
    listLabel: "Problem list",
    onBack: () => undefined,
  },
} satisfies Meta<typeof ListDetail>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Split: Story = {};

export const MobileDetail: Story = {
  args: { mobileView: "detail" },
  parameters: { viewport: { defaultViewport: "mobile" } },
};

export const PermissionDenied: Story = {
  args: {
    detail: <RecoveryPanel onSignIn={() => undefined} state="permission-denied" />,
    detailHeading: "Restricted problem",
  },
};
