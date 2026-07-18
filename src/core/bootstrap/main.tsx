import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

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
