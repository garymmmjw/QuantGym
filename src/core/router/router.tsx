import { createElement, lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { PREVIEW_BUSINESS_ROUTES } from "../../design-system/patterns/AppShell";
import { Spinner } from "../../design-system/primitives/Spinner";
import AuthPage from "../../pages/v2/AuthPage";
import NotFoundPage from "../../pages/v2/NotFoundPage";
import { AuthenticatedShellRoute } from "./AuthenticatedShellRoute";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const legacyRouteAdapter = lazy(
  () => import("../../legacy-preview/LegacyRouteAdapter"),
);

const legacyCompatibilityElement = (
  <Suspense
    fallback={(
      <Spinner
        label="正在载入兼容预览"
        size="large"
      />
    )}
  >
    {createElement(legacyRouteAdapter)}
  </Suspense>
);

const businessRouteChildren = PREVIEW_BUSINESS_ROUTES
  .filter(({ path }) => path !== "/")
  .map(({ id, path }) => ({
    path: path.slice(1),
    element: legacyCompatibilityElement,
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
      { index: true, element: legacyCompatibilityElement },
      ...businessRouteChildren,
      { path: "*", element: <NotFoundPage /> },
    ],
  },
]);
