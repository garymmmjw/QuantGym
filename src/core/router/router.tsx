import { createElement, lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { Spinner } from "../../design-system/primitives/Spinner";
import AuthPage from "../../pages/v2/AuthPage";
import NotFoundPage from "../../pages/v2/NotFoundPage";
import { AuthenticatedShellRoute } from "./AuthenticatedShellRoute";
import { COMPATIBILITY_BUSINESS_ROUTES } from "./businessRouteOwnership";
import { ProblemsRoute } from "./ProblemsRoute";
import { RouteErrorBoundary } from "./RouteErrorBoundary";

const legacyRouteAdapter = lazy(
  () => import("../../legacy-preview/LegacyRouteAdapter"),
);
const overviewPage = lazy(
  () => import("../../pages/training/OverviewPage"),
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

const compatibilityRouteChildren = COMPATIBILITY_BUSINESS_ROUTES
  .map(({ id, path }) => ({
    path: path.slice(1),
    element: path === "/problems"
      ? <ProblemsRoute compatibilityElement={legacyCompatibilityElement} />
      : legacyCompatibilityElement,
    id: `preview-${id}`,
  }));

const nativeOverviewElement = (
  <Suspense fallback={<Spinner label="正在载入训练总览" size="large" />}>
    {createElement(overviewPage)}
  </Suspense>
);

export const authenticatedBusinessRouteChildren = [
  { index: true, element: nativeOverviewElement },
  ...compatibilityRouteChildren,
  { path: "*", element: <NotFoundPage /> },
];

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
    children: authenticatedBusinessRouteChildren,
  },
]);
