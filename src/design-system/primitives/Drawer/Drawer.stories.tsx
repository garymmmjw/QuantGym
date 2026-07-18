import type { Meta, StoryObj } from "@storybook/react-vite";
import { useState } from "react";

import { Button } from "../Button";
import { Drawer } from "./Drawer";

const DrawerPreview = () => {
  const [open, setOpen] = useState(true);
  return (
    <>
      <Button type="button" onClick={() => setOpen(true)}>Open filters</Button>
      <Drawer
        open={open}
        onOpenChange={setOpen}
        title="Question filters"
        description="Choose a topic and difficulty."
        side="right"
      >
        <Button type="button" variant="secondary">Reset filters</Button>
      </Drawer>
    </>
  );
};

const meta = {
  title: "Primitives/Drawer",
  component: DrawerPreview,
  parameters: { layout: "fullscreen" },
} satisfies Meta<typeof DrawerPreview>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};
