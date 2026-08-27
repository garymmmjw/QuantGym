import type { Meta, StoryObj } from "@storybook/react-vite";

import { QuantyImage } from "./QuantyImage";

const meta = {
  title: "Patterns/QuantyImage",
  component: QuantyImage,
  args: {
    asset: "hero",
    alt: "Quanty waving",
    size: "medium",
    prominence: "primary",
  },
  argTypes: {
    asset: {
      control: "select",
      options: [
        "hero", "trophy", "calculator", "teacher", "fire", "laptop", "levelup", "happy",
        "focused", "wow", "wink", "interview", "oops", "poker", "search", "sleep",
      ],
    },
  },
} satisfies Meta<typeof QuantyImage>;

export default meta;
type Story = StoryObj<typeof meta>;

export const Ready: Story = {};

export const Decorative: Story = {
  args: {
    asset: "sleep",
    alt: "",
    size: "small",
    prominence: "supporting",
  },
};
