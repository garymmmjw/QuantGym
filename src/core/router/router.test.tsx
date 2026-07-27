import "@testing-library/jest-dom/vitest";

import { render, screen } from "@testing-library/react";
import * as ReactRouterDom from "react-router-dom";

const { legacyAdapterLocation, legacyAdapterRender } = vi.hoisted(() => ({
  legacyAdapterLocation: vi.fn(),
  legacyAdapterRender: vi.fn(),
}));

vi.mock("../../pages/training/OverviewPage", () => ({
  default: () => <h1>原生总览测试页</h1>,
}));

vi.mock("../../pages/training/ProblemTrainingHandoffPage", () => ({
  default: ({ handoff }: {
    handoff: Readonly<{ problemId: string; sessionId: string }> | null;
  }) => (
    <section data-testid="native-problem-handoff">
      <h1>原生训练题目测试页</h1>
      <output>{handoff === null ? "invalid" : `${handoff.problemId}:${handoff.sessionId}`}</output>
    </section>
  ),
}));

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

  it("renders a valid training handoff natively without mounting compatibility", async () => {
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
      "11111111-1111-4111-8111-111111111111:22222222-2222-4222-8222-222222222222",
    )).toBeVisible();
    expect(screen.queryByRole("heading", { name: "兼容页面测试桩" }))
      .not.toBeInTheDocument();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });

  it("keeps ordinary Problems navigation in the isolated compatibility adapter", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/problems"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "兼容页面测试桩" })).toBeVisible();
    expect(legacyAdapterLocation).toHaveBeenCalledWith("/problems");
    expect(screen.queryByTestId("native-problem-handoff")).not.toBeInTheDocument();
  });

  it("keeps unrelated Problems query state inside the isolated compatibility route", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/problems?focus=weakness&source=plan"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByRole("heading", { name: "兼容页面测试桩" })).toBeVisible();
    expect(legacyAdapterLocation).toHaveBeenCalledWith(
      "/problems?focus=weakness&source=plan",
    );
    expect(screen.queryByTestId("native-problem-handoff")).not.toBeInTheDocument();
  });

  it("fails a malformed handoff closed without mounting compatibility", async () => {
    const router = ReactRouterDom.createMemoryRouter([
      {
        path: "/",
        element: <ReactRouterDom.Outlet />,
        children: authenticatedBusinessRouteChildren,
      },
    ], { initialEntries: ["/problems?problem=bad&session=also-bad"] });

    render(<ReactRouterDom.RouterProvider router={router} />);

    expect(await screen.findByText("invalid")).toBeVisible();
    expect(legacyAdapterRender).not.toHaveBeenCalled();
  });
});
