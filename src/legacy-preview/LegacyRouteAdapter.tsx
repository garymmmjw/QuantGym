import {
  useEffect,
  useId,
  useState,
} from "react";
import { useLocation } from "react-router-dom";

import { useI18n } from "../shared/i18n";
import styles from "./adapter.module.css";
import {
  buildLegacyPreviewUrl,
  resolveUnmigratedRoute,
} from "./unmigratedRoutes";

const LOAD_TIMEOUT_MS = 20_000;
const FRAME_SANDBOX = "allow-forms allow-same-origin allow-scripts";

type FrameState = "loading" | "ready" | "error";
type FrameStateRecord = Readonly<{
  key: string;
  state: FrameState;
}>;

const localizedCopy = {
  "zh-CN": {
    badge: "兼容预览",
    description: "此业务模块尚未迁移，当前由隔离的旧版预览提供。",
    error: "兼容页面暂时无法载入。你可以安全地重新加载。",
    invalid: "该路径不在兼容预览白名单中。",
    loading: "正在载入兼容页面…",
    ready: "兼容页面已载入。",
    reload: "重新加载兼容页面",
    title: "旧版兼容页面",
  },
  en: {
    badge: "Compatibility preview",
    description: "This business module is not migrated yet and is provided by the isolated legacy preview.",
    error: "The compatibility page could not load. You can safely reload it.",
    invalid: "This path is not on the compatibility preview allowlist.",
    loading: "Loading compatibility page…",
    ready: "Compatibility page loaded.",
    reload: "Reload compatibility page",
    title: "Legacy compatibility page",
  },
} as const;

export function LegacyRouteAdapter() {
  const location = useLocation();
  const { language } = useI18n();
  const copy = localizedCopy[language];
  const route = resolveUnmigratedRoute(location.pathname);
  const source = buildLegacyPreviewUrl(location.pathname);
  const [attempt, setAttempt] = useState(0);
  const componentId = useId();
  const titleId = `${componentId}-title`;
  const statusId = `${componentId}-status`;
  const frameId = `${componentId}-frame`;
  const frameKey = `${route?.path ?? "invalid"}:${attempt}`;
  const [frameStateRecord, setFrameStateRecord] = useState<FrameStateRecord>({
    key: frameKey,
    state: "loading",
  });
  const frameState = frameStateRecord.key === frameKey
    ? frameStateRecord.state
    : "loading";

  useEffect(() => {
    if (route === null || source === null) return undefined;

    const timeout = window.setTimeout(() => {
      setFrameStateRecord((current) => {
        if (current.key !== frameKey) return { key: frameKey, state: "error" };
        return current.state === "loading"
          ? { key: frameKey, state: "error" }
          : current;
      });
    }, LOAD_TIMEOUT_MS);

    return () => window.clearTimeout(timeout);
  }, [frameKey, route, source]);

  const frameTitle = (
    route === null
      ? copy.title
      : `${route.label[language]} · ${copy.title}`
  );

  if (route === null || source === null) {
    return (
      <section
        aria-labelledby={titleId}
        className={styles.root}
        data-compatibility-surface="legacy-preview"
        data-evidence-scope="excluded"
      >
        <div className={styles.toolbar}>
          <div>
            <p className={styles.badge}>{copy.badge}</p>
            <h1 id={titleId}>{copy.title}</h1>
          </div>
        </div>
        <div className={styles.invalidState} role="alert">
          <p>{copy.invalid}</p>
        </div>
      </section>
    );
  }

  const reload = () => {
    setAttempt((current) => current + 1);
  };

  const recordFrameState = (nextState: FrameState) => {
    setFrameStateRecord((current) => {
      if (nextState === "ready" && current.key === frameKey && current.state !== "loading") {
        return current;
      }
      return { key: frameKey, state: nextState };
    });
  };

  return (
    <section
      aria-describedby={statusId}
      aria-labelledby={titleId}
      className={styles.root}
      data-compatibility-surface="legacy-preview"
      data-evidence-scope="excluded"
    >
      <div className={styles.toolbar}>
        <div className={styles.heading}>
          <p className={styles.badge}>{copy.badge}</p>
          <h1 id={titleId}>{route.label[language]}</h1>
          <p className={styles.description}>{copy.description}</p>
        </div>
        <button
          aria-controls={frameId}
          className={styles.reloadButton}
          onClick={reload}
          type="button"
        >
          {copy.reload}
        </button>
      </div>

      <div
        aria-busy={frameState === "loading"}
        className={styles.frameStage}
        data-frame-state={frameState}
      >
        <iframe
          id={frameId}
          key={frameKey}
          className={styles.frame}
          data-legacy-preview-frame
          onError={() => recordFrameState("error")}
          onLoad={() => recordFrameState("ready")}
          referrerPolicy="no-referrer"
          sandbox={FRAME_SANDBOX}
          src={source}
          title={frameTitle}
        />
        {frameState !== "ready" ? (
          <div
            aria-live={frameState === "error" ? "assertive" : "polite"}
            className={styles.frameStatus}
            id={statusId}
            role={frameState === "error" ? "alert" : "status"}
          >
            <span aria-hidden="true" className={styles.statusMark}>
              {frameState === "error" ? "!" : ""}
            </span>
            <p>{frameState === "error" ? copy.error : copy.loading}</p>
            {frameState === "error" ? (
              <button className={styles.inlineReload} onClick={reload} type="button">
                {copy.reload}
              </button>
            ) : null}
          </div>
        ) : (
          <p className={styles.readyStatus} id={statusId} role="status">
            {copy.ready}
          </p>
        )}
      </div>
    </section>
  );
}

export default LegacyRouteAdapter;
