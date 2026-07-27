import { createElement, lazy, Suspense } from "react";
import { createBrowserRouter } from "react-router-dom";

import { Spinner } from "../../design-system/primitives/Spinner";
import { COMPATIBILITY_BUSINESS_ROUTES } from "./businessRouteOwnership";
import { PlanRouteLoadingFallback } from "./PlanRouteLoadingFallback";
import { ProblemsRouteLoadingFallback } from "./ProblemsRouteLoadingFallback";

const authPage = lazy(
  () => import("../../pages/v2/AuthPage"),
);
const authenticatedShellRoute = lazy(async () => {
  const module = await import("./AuthenticatedShellRoute");
  return { default: module.AuthenticatedShellRoute };
});
const routeErrorBoundary = lazy(async () => {
  const module = await import("./RouteErrorBoundary");
  return { default: module.RouteErrorBoundary };
});
const notFoundPage = lazy(
  () => import("../../pages/v2/NotFoundPage"),
);
const legacyRouteAdapter = lazy(
  () => import("../../legacy-preview/LegacyRouteAdapter"),
);
const overviewPage = lazy(
  () => import("../../pages/training/OverviewPage"),
);
const planPage = lazy(
  () => import("../../pages/plan/PlanPage"),
);
const problemsPage = lazy(
  () => import("../../pages/training/ProblemsPage"),
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
    element: legacyCompatibilityElement,
    id: `preview-${id}`,
  }));

const nativeOverviewElement = (
  <Suspense fallback={<Spinner label="正在载入训练总览" size="large" />}>
    {createElement(overviewPage)}
  </Suspense>
);

const nativePlanElement = (
  <Suspense fallback={<PlanRouteLoadingFallback />}>
    {createElement(planPage)}
  </Suspense>
);

const nativeProblemsElement = (
  <Suspense fallback={<ProblemsRouteLoadingFallback />}>
    {createElement(problemsPage)}
  </Suspense>
);

export const authenticatedBusinessRouteChildren = [
  { index: true, element: nativeOverviewElement },
  { path: "plan", element: nativePlanElement },
  { path: "problems", element: nativeProblemsElement },
  ...compatibilityRouteChildren,
  {
    path: "*",
    element: (
      <Suspense fallback={<Spinner label="正在载入页面" size="large" />}>
        {createElement(notFoundPage)}
      </Suspense>
    ),
  },
];

const authElement = (
  <Suspense fallback={<Spinner label="正在载入登录页面" size="large" />}>
    {createElement(authPage)}
  </Suspense>
);

const authenticatedShellElement = (
  <Suspense fallback={<Spinner label="正在载入训练空间" size="large" />}>
    {createElement(authenticatedShellRoute)}
  </Suspense>
);

const routeErrorElement = (
  <Suspense fallback={<Spinner label="正在恢复页面" size="large" />}>
    {createElement(routeErrorBoundary)}
  </Suspense>
);

export const appRouter = createBrowserRouter([
  {
    path: "/login",
    element: authElement,
  },
  {
    path: "/auth/reset",
    element: authElement,
  },
  {
    path: "/",
    element: authenticatedShellElement,
    errorElement: routeErrorElement,
    children: authenticatedBusinessRouteChildren,
  },
]);
