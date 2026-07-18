import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import "../../design-system/tokens/typography.css";
import "../../design-system/tokens/foundations.css";
import "../../design-system/tokens/light.css";
import "../../design-system/tokens/dark.css";
import "../../design-system/motion/motion.css";
import { AppProviders } from "../providers/AppProviders";

const rootElement = document.getElementById("root");

if (!(rootElement instanceof HTMLElement)) {
  throw new Error("V2_ROOT_MISSING");
}

createRoot(rootElement).render(
  <StrictMode>
    <AppProviders />
  </StrictMode>,
);
