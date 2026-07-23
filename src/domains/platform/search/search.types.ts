export type SearchLanguage = "zh-CN" | "en";

export type LocalizedSearchText = Readonly<Record<SearchLanguage, string>>;

type SearchResultBase = Readonly<{
  description?: LocalizedSearchText;
  href: string;
  id: string;
  keywords?: readonly string[];
  title: LocalizedSearchText;
}>;

export type SearchResultBadge =
  | Readonly<{ kind: "v2" }>
  | Readonly<{ kind: "compatibility" }>
  | Readonly<{
    kind: "label";
    label: LocalizedSearchText;
  }>;

export type SearchResultPresentation = Readonly<{
  badge: SearchResultBadge;
  badgeTone: "v2" | "compatibility" | "entity";
  marker: string;
}>;

export type PresentedSearchResult<TKind extends string = string> = SearchResultBase & Readonly<{
  kind: TKind;
  presentation: SearchResultPresentation;
}>;

export type V2NavigationSearchResult = SearchResultBase & Readonly<{
  kind: "v2-navigation";
}>;

export type CompatibilityNavigationSearchResult = SearchResultBase & Readonly<{
  kind: "compatibility-navigation";
}>;

export type SearchNavigationResult =
  | V2NavigationSearchResult
  | CompatibilityNavigationSearchResult;

/**
 * Providers may introduce new result kinds by supplying presentation metadata.
 * The command palette renders this protocol without branching on domain kinds.
 */
export type SearchResult =
  | SearchNavigationResult
  | PresentedSearchResult;

export type SearchProviderRequest = Readonly<{
  language: SearchLanguage;
  query: string;
  signal?: AbortSignal | undefined;
}>;

export type SearchProviderResult<TResult extends SearchResult = SearchResult> =
  TResult & Readonly<{
    presentation: SearchResultPresentation;
    providerId: string;
  }>;

export type SearchProvider<TResult extends SearchResult = SearchResult> =
  Readonly<{
    id: string;
    priority?: number;
    search: (
      request: SearchProviderRequest,
    ) => Promise<readonly TResult[]> | readonly TResult[];
  }>;

export type StaticNavigationProviderOptions<
  TResult extends SearchNavigationResult = SearchNavigationResult,
> = Readonly<{
  id: string;
  priority?: number;
  results: readonly TResult[];
}>;

export type Phase1SearchRegistryOptions = Readonly<{
  compatibilityNavigation: readonly CompatibilityNavigationSearchResult[];
  v2Navigation: readonly V2NavigationSearchResult[];
}>;
