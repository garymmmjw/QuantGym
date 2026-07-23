import { createBrowserRouter } from "react-router-dom";

import { PREVIEW_BUSINESS_ROUTES } from "../../design-system/patterns/AppShell";
import AuthPage from "../../pages/v2/AuthPage";
import NotFoundPage from "../../pages/v2/NotFoundPage";
import PreviewRoutePage from "../../pages/v2/PreviewRoutePage";
import { AuthenticatedShellRoute } from "./AuthenticatedShellRoute";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const businessRouteChildren = PREVIEW_BUSINESS_ROUTES
  .filter(({ path }) => path !== "/")
  .map(({ id, path }) => ({
    path: path.slice(1),
    element: <PreviewRoutePage />,
    id: `preview-${id}`,
  }));

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: <AuthPage />,
  },
  {
    path: "/auth/reset",
    element: <AuthPage />,
  },
  {
    path: "/",
    element: <AuthenticatedShellRoute />,
    errorElement: <RouteErrorBoundary />,
    children: [
      { index: true, element: <PreviewRoutePage /> },
      ...businessRouteChildren,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
