import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import * as ReactRouterDom from "react-router-dom";

import { I18nProvider } from "../../shared/i18n";

const { legacyAdapterLocation, legacyAdapterRender } = vi.hoisted(() => ({
  legacyAdapterLocation: vi.fn(),
  legacyAdapterRender: vi.fn(),
}));

vi.mock("../../pages/training/OverviewPage", () => ({
  default: () => <h1>原生总览测试页</h1>,
}));

vi.mock("../../pages/plan/PlanPage", () => ({
  default: () => <h1>原生计划测试页</h1>,
}));

vi.mock("../../pages/training/ProblemsPage", async () => {
  const { useLocation } = await vi.importActual<typeof ReactRouterDom>(
    "react-router-dom",
  );
  function ProblemsPageStub() {
    const location = useLocation();
    return (
      <section data-testid="native-problems-page">
        <h1>原生训练题目测试页</h1>
        <output>{`${location.pathname}${location.search}`}</output>
      </section>
    );
  }
  return {
    default: ProblemsPageStub,
  };
});

vi.mock("../../legacy-preview/LegacyRouteAdapter", async () => {
  const { useLocation } = await vi.importActual<typeof ReactRouterDom>(
    "react-router-dom",
  );
  function CompatibilityAdapterStub() {
    const location = useLocation();
    legacyAdapterLocation(`${location.pathname}${location.search}`);
    legacyAdapterRender();
    return <h1>兼容页面测试桩</h1>;
  }
  return {
    default: CompatibilityAdapterStub,
  };
});

import { PlanRouteLoadingFallback } from "./PlanRouteLoadingFallback";
import { ProblemsRouteLoadingFallback } from "./ProblemsRouteLoadingFallback";
import { authenticatedBusinessRouteChildren } from "./router";

describe("business router ownership", () => {
  beforeEach(() => {
    legacyAdapterLocation.mockClear();
    legacyAdapterRender.mockClear();
  });

  it("renders the native Overview at / without mounting the compatibility adapter", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "原生总览测试页" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "兼容页面测试桩" })).not.toBeInTheDocument();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });

  it("renders the native Plan at /plan without mounting the compatibility adapter", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/plan"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "原生计划测试页" })).toBeVisible();
    expect(screen.queryByRole("heading", { name: "兼容页面测试桩" })).not.toBeInTheDocument();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });

  it("localizes the native Plan lazy-loading fallback", () => {
    const { rerender } = render(
      <I18nProvider language="zh-CN">
        <PlanRouteLoadingFallback />
      </I18nProvider>,
    );

    expect(screen.getByRole("status", { name: "正在载入训练计划" })).toBeVisible();

    rerender(
      <I18nProvider language="en">
        <PlanRouteLoadingFallback />
      </I18nProvider>,
    );

    expect(screen.getByRole("status", { name: "Loading training plan" })).toBeVisible();
    expect(screen.queryByRole("status", { name: "正在载入训练计划" }))
      .not.toBeInTheDocument();
  });

  it("localizes the native Problems lazy-loading fallback", () => {
    const { rerender } = render(
      <I18nProvider language="zh-CN">
        <ProblemsRouteLoadingFallback />
      </I18nProvider>,
    );

    expect(screen.getByRole("status", { name: "正在载入题目训练" })).toBeVisible();

    rerender(
      <I18nProvider language="en">
        <ProblemsRouteLoadingFallback />
      </I18nProvider>,
    );

    expect(screen.getByRole("status", { name: "Loading problem training" })).toBeVisible();
    expect(screen.queryByRole("status", { name: "正在载入题目训练" }))
      .not.toBeInTheDocument();
  });

  it("keeps the remaining business routes in the isolated compatibility adapter", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/skills?focus=weakness"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "兼容页面测试桩" })).toBeVisible();
    expect(legacyAdapterLocation).toHaveBeenCalledWith("/skills?focus=weakness");
    expect(screen.queryByTestId("native-problems-page")).not.toBeInTheDocument();
  });

  it("renders a valid training handoff in the native Problems page", async () => {
    const handoff = (
      "/problems"
      + "?problem=11111111-1111-4111-8111-111111111111"
      + "&session=22222222-2222-4222-8222-222222222222"
    );
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: [handoff] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "原生训练题目测试页" })).toBeVisible();
    expect(screen.getByText(
      handoff,
    )).toBeVisible();
    expect(screen.queryByRole("heading", { name: "兼容页面测试桩" }))
      .not.toBeInTheDocument();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });

  it("renders ordinary Problems navigation natively", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/problems"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "原生训练题目测试页" })).toBeVisible();
    expect(screen.getByText("/problems")).toBeVisible();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });

  it("preserves Problems query state in the native route", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/problems?focus=weakness&source=plan"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "原生训练题目测试页" })).toBeVisible();
    expect(screen.getByText(
      "/problems?focus=weakness&source=plan",
    )).toBeVisible();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });

  it("keeps malformed Problems query state inside the native page", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/problems?problem=bad&session=also-bad"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "原生训练题目测试页" })).toBeVisible();
    expect(screen.getByText("/problems?problem=bad&session=also-bad")).toBeVisible();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });
});
