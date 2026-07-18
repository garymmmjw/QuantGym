import { RouterProvider } from "react-router-dom";

import { AppErrorBoundary } from "../errors/AppErrorBoundary";
import { appRouter } from "../router/router";
import { QueryProvider } from "./QueryProvider";

export const AppProviders = () => (
  <AppErrorBoundary>
    <QueryProvider>
      <RouterProvider router={appRouter} />
    </QueryProvider>
  </AppErrorBoundary>
);
