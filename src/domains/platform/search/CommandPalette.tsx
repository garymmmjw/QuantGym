import {
  useEffect,
  useId,
  useRef,
  useState,
  type KeyboardEvent as ReactKeyboardEvent,
  type RefObject,
} from "react";

import { Dialog } from "../../../design-system/primitives/Dialog";
import styles from "./CommandPalette.module.css";
import { commandPaletteCopy, type CommandPaletteCopy } from "./search.copy";
import type { SearchProviderRegistry } from "./search.registry";
import type {
  SearchLanguage,
  SearchProviderResult,
  SearchResult,
  SearchResultPresentation,
} from "./search.types";

type SearchStatus = "loading" | "ready" | "error";

export type CommandPaletteProps = Readonly<{
  copy?: Partial<CommandPaletteCopy>;
  language: SearchLanguage;
  onNavigate: (result: SearchProviderResult) => void;
  onOpenChange: (open: boolean) => void;
  open: boolean;
  registry: SearchProviderRegistry;
  returnFocusRef?: RefObject<HTMLElement | null>;
}>;

type OpenCommandPaletteProps = Omit<CommandPaletteProps, "open">;

const resolveText = (
  result: SearchResult,
  language: SearchLanguage,
) => ({
  description: result.description?.[language],
  title: result.title[language],
});

const optionIdFor = (
  listId: string,
  result: Pick<SearchResult, "id" | "kind">,
) => (
  `${listId}-option-${encodeURIComponent(`${result.kind}:${result.id}`)}`
);

const badgeLabelFor = (
  presentation: SearchResultPresentation,
  language: SearchLanguage,
  copy: CommandPaletteCopy,
) => {
  switch (presentation.badge.kind) {
    case "v2":
      return copy.v2Label;
    case "compatibility":
      return copy.compatibilityLabel;
    case "label":
      return presentation.badge.label[language];
  }
};

function OpenCommandPalette({
  copy: copyOverrides,
  language,
  onNavigate,
  onOpenChange,
  registry,
  returnFocusRef,
}: OpenCommandPaletteProps) {
  const copy = { ...commandPaletteCopy[language], ...copyOverrides };
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const listId = useId();
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<readonly SearchProviderResult[]>([]);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [status, setStatus] = useState<SearchStatus>("loading");

  useEffect(() => {
    const controller = new AbortController();
    void registry.search({
      language,
      query,
      signal: controller.signal,
    }).then((nextResults) => {
      if (controller.signal.aborted) return;
      setResults(nextResults);
      setSelectedIndex(0);
      setStatus("ready");
    }).catch((error: unknown) => {
      if (error instanceof DOMException && error.name === "AbortError") return;
      setResults([]);
      setSelectedIndex(0);
      setStatus("error");
    });

    return () => controller.abort();
  }, [language, query, registry]);

  const selectedResult = results[selectedIndex];
  const navigate = (result: SearchProviderResult) => {
    onOpenChange(false);
    onNavigate(result);
  };
  const handleInputKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (status !== "ready" || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setSelectedIndex((current) => (current + 1) % results.length);
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setSelectedIndex((current) => (current - 1 + results.length) % results.length);
      return;
    }
    if (event.key === "Home") {
      event.preventDefault();
      setSelectedIndex(0);
      return;
    }
    if (event.key === "End") {
      event.preventDefault();
      setSelectedIndex(results.length - 1);
      return;
    }
    if (event.key === "Enter" && selectedResult !== undefined) {
      event.preventDefault();
      navigate(selectedResult);
    }
  };

  const activeDescendant = selectedResult === undefined
    ? undefined
    : optionIdFor(listId, selectedResult);

  useEffect(() => {
    if (status !== "ready" || selectedResult === undefined) return;
    const selectedOption = listRef.current?.querySelector<HTMLElement>(
      '[role="option"][aria-selected="true"]',
    );
    selectedOption?.scrollIntoView?.({ block: "nearest" });
  }, [selectedResult, status]);

  return (
    <Dialog
      className={styles.dialog ?? ""}
      closeLabel={copy.closeLabel}
      description={copy.description}
      id="qg-command-palette"
      initialFocusRef={inputRef}
      onOpenChange={onOpenChange}
      open
      title={copy.title}
      {...(returnFocusRef === undefined ? {} : { returnFocusRef })}
    >
      <div className={styles.searchField}>
        <span aria-hidden="true" className={styles.searchIcon}>⌕</span>
        <label className={styles.inputLabel}>
          <span className={styles.visuallyHidden}>{copy.inputLabel}</span>
          <input
            aria-activedescendant={activeDescendant}
            aria-autocomplete="list"
            aria-controls={listId}
            aria-expanded="true"
            autoComplete="off"
            className={styles.input}
            onChange={(event) => {
              setQuery(event.currentTarget.value);
              setResults([]);
              setSelectedIndex(0);
              setStatus("loading");
            }}
            onKeyDown={handleInputKeyDown}
            placeholder={copy.placeholder}
            ref={inputRef}
            role="combobox"
            spellCheck={false}
            type="search"
            value={query}
          />
        </label>
        <kbd className={styles.escapeHint}>Esc</kbd>
      </div>

      <div className={styles.resultsViewport}>
        <ul
          aria-label={copy.resultsLabel}
          className={styles.results}
          id={listId}
          ref={listRef}
          role="listbox"
        >
          {status === "loading" ? (
            <li role="none">
              <p aria-live="polite" className={styles.state} role="status">
                {copy.loading}
              </p>
            </li>
          ) : null}
          {status === "error" || (status === "ready" && results.length === 0) ? (
            <li role="none">
              <p aria-live="polite" className={styles.state} role="status">
                {copy.empty}
              </p>
            </li>
          ) : null}
          {status === "ready"
            ? results.map((result, index) => {
              const text = resolveText(result, language);
              const selected = index === selectedIndex;
              const badgeClassName = result.presentation.badgeTone === "v2"
                ? styles.v2Badge
                : result.presentation.badgeTone === "compatibility"
                  ? styles.compatibilityBadge
                  : styles.entityBadge;
              return (
                <li
                  aria-selected={selected}
                  className={styles.option}
                  id={optionIdFor(listId, result)}
                  key={`${result.kind}:${result.id}`}
                  onClick={() => navigate(result)}
                  onMouseDown={(event) => event.preventDefault()}
                  onMouseMove={() => setSelectedIndex(index)}
                  role="option"
                >
                  <div className={styles.optionContent}>
                    <span aria-hidden="true" className={styles.optionMark}>
                      {result.presentation.marker}
                    </span>
                    <span className={styles.optionCopy}>
                      <strong>{text.title}</strong>
                      {text.description === undefined
                        ? null
                        : <span>{text.description}</span>}
                    </span>
                    <span className={badgeClassName}>
                      {badgeLabelFor(result.presentation, language, copy)}
                    </span>
                  </div>
                </li>
              );
            })
            : null}
        </ul>
      </div>
      <div aria-hidden="true" className={styles.keyboardHints}>
        <span><kbd>↑</kbd><kbd>↓</kbd> {language === "zh-CN" ? "选择" : "Select"}</span>
        <span><kbd>↵</kbd> {language === "zh-CN" ? "打开" : "Open"}</span>
      </div>
    </Dialog>
  );
}

export function CommandPalette({
  open,
  ...props
}: CommandPaletteProps) {
  return open ? <OpenCommandPalette {...props} /> : null;
}
