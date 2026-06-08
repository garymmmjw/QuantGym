import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import { AppChromeLayout } from "../layouts/AppChromeLayout.jsx";
import { AuthLayout } from "../layouts/AuthLayout.jsx";
import { useAppServicesContext, useAuthStore } from "../stores/AppServicesContext.jsx";
import { ProtectedRoute } from "./ProtectedRoute.jsx";
import { routeConfig } from "./routeConfig.js";

const NewsPage = lazy(() => import("../pages/NewsPage.jsx").then((m) => ({ default: m.NewsPage })));
const CompaniesPage = lazy(() => import("../pages/CompaniesPage.jsx").then((m) => ({ default: m.CompaniesPage })));
const SettingsPage = lazy(() => import("../pages/SettingsPage.jsx").then((m) => ({ default: m.SettingsPage })));
const CoursesPage = lazy(() => import("../pages/CoursesPage.jsx").then((m) => ({ default: m.CoursesPage })));
const JobsPage = lazy(() => import("../pages/JobsPage.jsx").then((m) => ({ default: m.JobsPage })));
const ResumePage = lazy(() => import("../pages/ResumePage.jsx").then((m) => ({ default: m.ResumePage })));
const ExperiencesPage = lazy(() => import("../pages/ExperiencesPage.jsx").then((m) => ({ default: m.ExperiencesPage })));
const MessagesPage = lazy(() => import("../pages/MessagesPage.jsx").then((m) => ({ default: m.MessagesPage })));
const NetworkPage = lazy(() => import("../pages/NetworkPage.jsx").then((m) => ({ default: m.NetworkPage })));
const MemoryPage = lazy(() => import("../pages/MemoryPage.jsx").then((m) => ({ default: m.MemoryPage })));
const OverviewPage = lazy(() => import("../pages/OverviewPage.jsx").then((m) => ({ default: m.OverviewPage })));
const AccountPage = lazy(() => import("../pages/AccountPage.jsx").then((m) => ({ default: m.AccountPage })));
const LibraryPage = lazy(() => import("../pages/LibraryPage.jsx").then((m) => ({ default: m.LibraryPage })));
const CommunityPage = lazy(() => import("../pages/CommunityPage.jsx").then((m) => ({ default: m.CommunityPage })));
const ProblemsPage = lazy(() => import("../pages/ProblemsPage.jsx").then((m) => ({ default: m.ProblemsPage })));
const InterviewPage = lazy(() => import("../pages/InterviewPage.jsx").then((m) => ({ default: m.InterviewPage })));
const SkillsPage = lazy(() => import("../pages/SkillsPage.jsx").then((m) => ({ default: m.SkillsPage })));
const ToolsPage = lazy(() => import("../pages/ToolsPage.jsx").then((m) => ({ default: m.ToolsPage })));
const PlanPage = lazy(() => import("../pages/PlanPage.jsx").then((m) => ({ default: m.PlanPage })));
const PkPage = lazy(() => import("../pages/PkPage.jsx").then((m) => ({ default: m.PkPage })));
const PokerPage = lazy(() => import("../pages/PokerPage.jsx").then((m) => ({ default: m.PokerPage })));

const REACT_PAGES = {
  overview: OverviewPage,
  plan: PlanPage,
  skills: SkillsPage,
  interview: InterviewPage,
  problems: ProblemsPage,
  tools: ToolsPage,
  poker: PokerPage,
  experiences: ExperiencesPage,
  news: NewsPage,
  community: CommunityPage,
  messages: MessagesPage,
  network: NetworkPage,
  resume: ResumePage,
  jobs: JobsPage,
  companies: CompaniesPage,
  library: LibraryPage,
  courses: CoursesPage,
  memory: MemoryPage,
  settings: SettingsPage,
  account: AccountPage,
  pk: PkPage
};

function AppRouteElements() {
  return routeConfig.map((route) => {
    const Page = REACT_PAGES[route.id];
    if (!Page) {
      return null;
    }
    return (
      <Route
        key={route.id}
        path={route.path}
        element={(
          <Suspense fallback={<div className="app-route-loading" aria-busy="true" />}>
            <Page />
          </Suspense>
        )}
      />
    );
  });
}

function AuthenticatedLoginRedirect() {
  const appServices = useAppServicesContext();
  const currentUser = useAuthStore((state) => state.currentUser) || appServices.appState?.currentUser;
  const location = useLocation();

  if (currentUser && location.pathname === "/login") {
    return <Navigate to="/" replace />;
  }
  return null;
}

export function AppRoutes() {
  return (
    <>
      <AuthenticatedLoginRedirect />
      <Routes>
        <Route element={<AuthLayout />}>
          <Route path="/login" element={null} />
        </Route>
        <Route element={<ProtectedRoute />}>
          <Route element={<AppChromeLayout />}>
            {AppRouteElements()}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Route>
        </Route>
      </Routes>
    </>
  );
}
