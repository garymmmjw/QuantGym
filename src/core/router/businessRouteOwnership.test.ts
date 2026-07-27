import { PREVIEW_BUSINESS_ROUTES } from "../../design-system/patterns/AppShell";
import {
  BUSINESS_ROUTE_OWNERSHIP,
  COMPATIBILITY_BUSINESS_ROUTES,
  NATIVE_BUSINESS_ROUTES,
} from "./businessRouteOwnership";

describe("business route ownership", () => {
  it("assigns every shell route exactly once during staged migration", () => {
    expect(BUSINESS_ROUTE_OWNERSHIP).toHaveLength(22);
    expect(new Set(BUSINESS_ROUTE_OWNERSHIP.map(({ id }) => id)).size).toBe(22);
    expect(new Set(BUSINESS_ROUTE_OWNERSHIP.map(({ path }) => path)).size).toBe(22);
    expect(BUSINESS_ROUTE_OWNERSHIP.map(({ id, path }) => [id, path])).toEqual(
      PREVIEW_BUSINESS_ROUTES.map(({ id, path }) => [id, path]),
    );
  });

  it("moves Overview, Plan, and Problems to native ownership and keeps 19 routes compatible", () => {
    expect(NATIVE_BUSINESS_ROUTES).toEqual([
      { id: "overview", owner: "native", path: "/" },
      { id: "plan", owner: "native", path: "/plan" },
      { id: "problems", owner: "native", path: "/problems" },
    ]);
    expect(COMPATIBILITY_BUSINESS_ROUTES).toHaveLength(19);
    expect(COMPATIBILITY_BUSINESS_ROUTES).not.toContainEqual(
      expect.objectContaining({ path: "/" }),
    );
    expect(COMPATIBILITY_BUSINESS_ROUTES).not.toContainEqual(
      expect.objectContaining({ path: "/plan" }),
    );
    expect(COMPATIBILITY_BUSINESS_ROUTES).not.toContainEqual(
      expect.objectContaining({ path: "/problems" }),
    );
    expect(COMPATIBILITY_BUSINESS_ROUTES.every(
      ({ owner }) => owner === "compatibility",
    )).toBe(true);
  });
});
