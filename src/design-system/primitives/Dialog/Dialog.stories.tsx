import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Dialog } from "./Dialog";

const DialogPreview = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Open dialog</Button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Confirm practice"
        description="Your current answer will be saved before the next set."
      >
        <p>Review your progress, then continue when you are ready.</p>
        <Button type="button">Continue</Button>
      </Dialog>
    </>
  );
};

const meta = {
  title: "Primitives/Dialog",
  component: DialogPreview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DialogPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
