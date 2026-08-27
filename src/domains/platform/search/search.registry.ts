import type {
  Phase1SearchRegistryOptions,
  SearchLanguage,
  SearchNavigationResult,
  SearchProvider,
  SearchProviderRequest,
  SearchProviderResult,
  SearchResult,
  SearchResultPresentation,
  StaticNavigationProviderOptions,
} from "./search.types";

const normalizeSearchText = (value: string) => (
  value.normalize("NFKC").trim().toLocaleLowerCase()
);

const localizedValues = (
  result: SearchResult,
  language: SearchLanguage,
) => {
  const alternateLanguage = language === "zh-CN" ? "en" : "zh-CN";
  return [
    result.title[language],
    result.title[alternateLanguage],
    result.description?.[language] ?? "",
    result.description?.[alternateLanguage] ?? "",
    result.href,
    ...(result.keywords ?? []),
  ];
};

const searchScore = (
  result: SearchResult,
  query: string,
  language: SearchLanguage,
) => {
  const normalizedQuery = normalizeSearchText(query);
  if (normalizedQuery === "") return 1;

  const tokens = normalizedQuery.split(/\s+/u);
  const searchableValues = localizedValues(result, language).map(normalizeSearchText);
  const haystack = searchableValues.join(" ");
  if (!tokens.every((token) => haystack.includes(token))) return 0;

  const currentTitle = normalizeSearchText(result.title[language]);
  if (currentTitle === normalizedQuery) return 100;
  if (currentTitle.startsWith(normalizedQuery)) return 80;
  if (currentTitle.includes(normalizedQuery)) return 60;
  return 20;
};

const abortError = () => new DOMException("Search was cancelled.", "AbortError");

const throwIfAborted = (signal: AbortSignal | undefined) => {
  if (signal?.aborted === true) throw abortError();
};

export const createStaticNavigationProvider = <
  TResult extends SearchNavigationResult,
>({
  id,
  priority = 0,
  results,
}: StaticNavigationProviderOptions<TResult>): SearchProvider<TResult> => ({
  id,
  priority,
  search: ({ language, query, signal }) => {
    throwIfAborted(signal);

    return results
      .map((result, sourceIndex) => ({
        result,
        score: searchScore(result, query, language),
        sourceIndex,
      }))
      .filter(({ score }) => score > 0)
      .sort((left, right) => (
        right.score - left.score || left.sourceIndex - right.sourceIndex
      ))
      .map(({ result }) => result);
  },
});

type RegisteredProvider = Readonly<{
  order: number;
  provider: SearchProvider;
}>;

const builtInPresentation: Readonly<Record<
  SearchNavigationResult["kind"],
  SearchResultPresentation
>> = {
  "v2-navigation": {
    badge: { kind: "v2" },
    badgeTone: "v2",
    marker: "Q",
  },
  "compatibility-navigation": {
    badge: { kind: "compatibility" },
    badgeTone: "compatibility",
    marker: "↗",
  },
};

const presentationFor = (result: SearchResult): SearchResultPresentation => {
  if ("presentation" in result) return result.presentation;
  return builtInPresentation[result.kind];
};

const attachProvider = <TResult extends SearchResult>(
  result: TResult,
  providerId: string,
): SearchProviderResult<TResult> => ({
  ...result,
  presentation: presentationFor(result),
  providerId,
});

export class SearchProviderRegistry {
  readonly #providers = new Map<string, RegisteredProvider>();
  #nextOrder = 0;

  register<TResult extends SearchResult>(
    provider: SearchProvider<TResult>,
  ): () => void {
    if (this.#providers.has(provider.id)) {
      throw new Error(`Search provider "${provider.id}" is already registered.`);
    }

    const registeredProvider: SearchProvider = provider;
    const order = this.#nextOrder;
    this.#nextOrder += 1;
    this.#providers.set(provider.id, { order, provider: registeredProvider });

    return () => {
      const current = this.#providers.get(provider.id);
      if (current?.provider === registeredProvider) this.#providers.delete(provider.id);
    };
  }

  async search(
    request: SearchProviderRequest,
  ): Promise<readonly SearchProviderResult[]> {
    throwIfAborted(request.signal);

    const providers = [...this.#providers.values()].sort((left, right) => (
      (right.provider.priority ?? 0) - (left.provider.priority ?? 0)
      || left.order - right.order
    ));
    const providerResults = await Promise.all(
      providers.map(async ({ provider }) => ({
        provider,
        results: await provider.search(request),
      })),
    );

    throwIfAborted(request.signal);

    const seen = new Set<string>();
    const results: SearchProviderResult[] = [];
    for (const { provider, results: currentResults } of providerResults) {
      for (const result of currentResults) {
        const resultKey = `${result.kind}:${result.id}`;
        if (seen.has(resultKey)) continue;
        seen.add(resultKey);
        results.push(attachProvider(result, provider.id));
      }
    }
    return results;
  }
}

export const createPhase1SearchRegistry = ({
  compatibilityNavigation,
  v2Navigation,
}: Phase1SearchRegistryOptions) => {
  const registry = new SearchProviderRegistry();
  registry.register(createStaticNavigationProvider({
    id: "phase1-v2-navigation",
    priority: 100,
    results: v2Navigation,
  }));
  registry.register(createStaticNavigationProvider({
    id: "phase1-compatibility-navigation",
    results: compatibilityNavigation,
  }));
  return registry;
};
