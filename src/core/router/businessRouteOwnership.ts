export type BusinessRouteOwner = "native" | "compatibility";

export type BusinessRouteOwnership = Readonly<{
  id: string;
  owner: BusinessRouteOwner;
  path: string;
}>;

/**
 * Runtime route ownership during the staged Phase 2 migration.
 *
 * This registry is intentionally independent from both shell navigation and the
 * compatibility iframe allowlist. Governance checks require those two surfaces
 * to match this registry, so a route cannot silently fall back to legacy after
 * it is declared native.
 */
export const BUSINESS_ROUTE_OWNERSHIP = Object.freeze([
  { id: "overview", owner: "native", path: "/" },
  { id: "plan", owner: "compatibility", path: "/plan" },
  { id: "skills", owner: "compatibility", path: "/skills" },
  { id: "league", owner: "compatibility", path: "/league" },
  { id: "interview", owner: "compatibility", path: "/interview" },
  { id: "problems", owner: "compatibility", path: "/problems" },
  { id: "tools", owner: "compatibility", path: "/tools" },
  { id: "poker", owner: "compatibility", path: "/poker" },
  { id: "experiences", owner: "compatibility", path: "/experiences" },
  { id: "news", owner: "compatibility", path: "/news" },
  { id: "community", owner: "compatibility", path: "/community" },
  { id: "messages", owner: "compatibility", path: "/messages" },
  { id: "network", owner: "compatibility", path: "/network" },
  { id: "resume", owner: "compatibility", path: "/resume" },
  { id: "jobs", owner: "compatibility", path: "/jobs" },
  { id: "companies", owner: "compatibility", path: "/companies" },
  { id: "library", owner: "compatibility", path: "/library" },
  { id: "courses", owner: "compatibility", path: "/courses" },
  { id: "memory", owner: "compatibility", path: "/memory" },
  { id: "settings", owner: "compatibility", path: "/settings" },
  { id: "account", owner: "compatibility", path: "/account" },
  { id: "pk", owner: "compatibility", path: "/pk" },
] as const satisfies readonly BusinessRouteOwnership[]);

export const NATIVE_BUSINESS_ROUTES = Object.freeze(
  BUSINESS_ROUTE_OWNERSHIP.filter(({ owner }) => owner === "native"),
);

export const COMPATIBILITY_BUSINESS_ROUTES = Object.freeze(
  BUSINESS_ROUTE_OWNERSHIP.filter(({ owner }) => owner === "compatibility"),
);
