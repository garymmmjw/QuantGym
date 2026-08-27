import {
  createPhase1SearchRegistry,
  createStaticNavigationProvider,
  SearchProviderRegistry,
  type CompatibilityNavigationSearchResult,
  type PresentedSearchResult,
  type V2NavigationSearchResult,
} from "./index";

const v2Navigation: readonly V2NavigationSearchResult[] = [
  {
    href: "/system/recovery",
    id: "v2-recovery",
    kind: "v2-navigation",
    keywords: ["network", "offline", "网络", "离线"],
    title: {
      "en": "Network recovery",
      "zh-CN": "网络恢复",
    },
  },
];

const compatibilityNavigation: readonly CompatibilityNavigationSearchResult[] = [
  {
    description: {
      "en": "This business route remains in the isolated legacy preview.",
      "zh-CN": "此业务页面仍位于隔离的旧版预览中。",
    },
    href: "/problems",
    id: "compat-problems",
    kind: "compatibility-navigation",
    keywords: ["practice", "题目", "训练"],
    title: {
      "en": "Problems",
      "zh-CN": "题目",
    },
  },
];

const futureProblem: PresentedSearchResult<"problem"> = {
  description: {
    "en": "Open the server-backed problem detail.",
    "zh-CN": "打开服务端题目详情。",
  },
  href: "/problems/two-sum",
  id: "problem-two-sum",
  kind: "problem",
  presentation: {
    badge: {
      kind: "label",
      label: { "en": "Problem", "zh-CN": "题目" },
    },
    badgeTone: "entity",
    marker: "P",
  },
  title: {
    "en": "Two Sum",
    "zh-CN": "两数之和",
  },
};

describe("SearchProviderRegistry", () => {
  it("combines typed V2 and compatibility navigation without requesting business data", async () => {
    const fetchSpy = vi.fn();
    vi.stubGlobal("fetch", fetchSpy);
    const registry = createPhase1SearchRegistry({
      compatibilityNavigation,
      v2Navigation,
    });

    await expect(registry.search({ language: "en", query: "" })).resolves.toEqual([
      expect.objectContaining({
        id: "v2-recovery",
        kind: "v2-navigation",
        providerId: "phase1-v2-navigation",
      }),
      expect.objectContaining({
        id: "compat-problems",
        kind: "compatibility-navigation",
        providerId: "phase1-compatibility-navigation",
      }),
    ]);
    expect(fetchSpy).not.toHaveBeenCalled();
  });

  it("matches localized titles and keywords while preserving the result discriminator", async () => {
    const registry = createPhase1SearchRegistry({
      compatibilityNavigation,
      v2Navigation,
    });

    await expect(registry.search({ language: "zh-CN", query: "离线" })).resolves.toEqual([
      expect.objectContaining({
        id: "v2-recovery",
        kind: "v2-navigation",
      }),
    ]);
    await expect(registry.search({ language: "en", query: "训练" })).resolves.toEqual([
      expect.objectContaining({
        id: "compat-problems",
        kind: "compatibility-navigation",
      }),
    ]);
  });

  it("supports a future async business provider through the presentation contract", async () => {
    const registry = new SearchProviderRegistry();
    registry.register({
      id: "future-problem-provider",
      async search({ query }) {
        await Promise.resolve();
        return query === "two sum" ? [futureProblem] : [];
      },
    });

    await expect(registry.search({ language: "en", query: "two sum" })).resolves.toEqual([
      expect.objectContaining({
        id: "problem-two-sum",
        kind: "problem",
        presentation: futureProblem.presentation,
        providerId: "future-problem-provider",
      }),
    ]);
  });

  it("rejects duplicate providers and allows explicit unregistration", async () => {
    const registry = new SearchProviderRegistry();
    const provider = createStaticNavigationProvider({
      id: "navigation",
      results: v2Navigation,
    });
    const unregister = registry.register(provider);

    expect(() => registry.register(provider)).toThrow(/navigation/u);
    unregister();
    await expect(registry.search({ language: "en", query: "" })).resolves.toEqual([]);
  });
});
