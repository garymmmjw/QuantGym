import type { Preview } from "@storybook/react-vite";

import "../src/design-system/tokens/typography.css";
import "../src/design-system/tokens/foundations.css";
import "../src/design-system/tokens/light.css";
import "../src/design-system/tokens/dark.css";
import "../src/design-system/motion/motion.css";

const preview: Preview = {
  tags: ["autodocs"],
  globalTypes: {
    theme: {
      description: "QuantGym color theme",
      defaultValue: "light",
      toolbar: {
        icon: "paintbrush",
        items: [
          { value: "light", title: "Light" },
          { value: "dark", title: "Dark" },
        ],
      },
    },
  },
  decorators: [
    (Story, context) => {
      const theme = context.globals.theme === "dark" ? "dark" : "light";
      document.documentElement.dataset.qgTheme = theme;
      document.documentElement.lang = "zh-CN";
      document.documentElement.style.colorScheme = theme;
      return Story();
    },
  ],
  parameters: {
    layout: "centered",
    controls: {
      matchers: {
        color: /(background|color)$/iu,
        date: /Date$/u,
      },
    },
    a11y: {
      test: "error",
    },
    viewport: {
      options: {
        mobile: { name: "Mobile 390×844", styles: { width: "390px", height: "844px" } },
        tablet: { name: "Tablet 1024×768", styles: { width: "1024px", height: "768px" } },
        laptop: { name: "Laptop 1280×720", styles: { width: "1280px", height: "720px" } },
        desktop: { name: "Desktop 1440×900", styles: { width: "1440px", height: "900px" } },
      },
    },
  },
};

export default preview;
