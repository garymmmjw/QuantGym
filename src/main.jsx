import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import "./styles/react-route-overrides.css";

const DEFAULT_PROBLEM_CATALOG_SCRIPT = "/data/problem-catalog.js?v=2";

const runtimeDataScripts = [
  {
    key: "QUANTGYM_CONFIG",
    src: "/config.js",
    isReady: (value) => value && typeof value === "object"
  },
  {
    key: "quantLibraryCatalog",
    src: "/data/library-catalog.js?v=1",
    isReady: Array.isArray
  },
  {
    key: "leetcodeHot100",
    src: "/data/leetcode-hot-100.js?v=2",
    isReady: (value) => Array.isArray(value?.problems)
  }
];

function getRuntimeGlobal(key) {
  return globalThis[key] ?? globalThis.window?.[key];
}

function loadRuntimeScript(src) {
  return new Promise((resolve) => {
    const script = document.createElement("script");
    script.src = src;
    script.async = false;
    script.onload = () => resolve(true);
    script.onerror = () => resolve(false);
    document.head.append(script);
  });
}

async function ensureRuntimeData() {
  const configScript = runtimeDataScripts[0];
  if (!configScript.isReady(getRuntimeGlobal(configScript.key))) {
    await loadRuntimeScript(configScript.src);
  }
  const config = getRuntimeGlobal("QUANTGYM_CONFIG") || {};
  const problemCatalogScript = typeof config.problemCatalogScript === "string" && config.problemCatalogScript.trim()
    ? config.problemCatalogScript.trim()
    : DEFAULT_PROBLEM_CATALOG_SCRIPT;
  const scripts = [
    {
      key: "quantProblemCatalog",
      src: problemCatalogScript,
      isReady: Array.isArray
    },
    ...runtimeDataScripts.slice(1)
  ];
  const missing = scripts.filter((item) => !item.isReady(getRuntimeGlobal(item.key)));
  await Promise.all(missing.map((item) => loadRuntimeScript(item.src)));
}

async function mountApp() {
  await ensureRuntimeData();
  const { createAppServices } = await import("./app/createAppServices.js");
  const appServices = createAppServices({ routingMode: "browser" });
  const mountNode = document.getElementById("react-root");

  if (mountNode) {
    createRoot(mountNode).render(
      <StrictMode>
        <App appServices={appServices} />
      </StrictMode>
    );
  }
}

void mountApp();
