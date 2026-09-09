import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App.jsx";
import { loadRuntimeScript } from "./app/runtimeScriptLoader.js";
import "./styles/playful-precision-tokens.css";
import "./styles/react-route-overrides.css";
import "./styles/playful-precision-shell.css";
import "./styles/playful-precision-growth.css";
import "./styles/playful-precision-training.css";
import "./styles/playful-precision-support.css";
import "./styles/playful-precision-replica-growth.css";
import "./styles/playful-precision-replica-training.css";
import "./styles/playful-precision-replica-training2.css";
import "./styles/playful-precision-replica-support-a.css";
import "./styles/playful-precision-replica-support-a2.css";
import "./styles/playful-precision-replica-support-b.css";
import "./styles/playful-precision-replica-support-b2.css";
import "./styles/playful-precision-replica-auth.css";
import "./styles/playful-precision-replica-league.css";
import "./styles/playful-precision-feedback.css";

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
  await Promise.all(missing.map(async (item) => {
    await loadRuntimeScript(item.src);
    if (!item.isReady(getRuntimeGlobal(item.key))) throw new Error('runtime_invalid');
  }));
}

let mounting = false;
function showBootState(failed = false) {
  const target = document.getElementById('react-root');
  if (!target) return;
  const section = document.createElement('section');
  section.className = 'prep-boot';
  section.setAttribute('role', failed ? 'alert' : 'status');
  const title = document.createElement('h1');
  title.textContent = failed ? '工作台暂时未能载入' : '正在打开你的备战工作台';
  const detail = document.createElement('p');
  detail.textContent = failed ? '连接恢复后可以重试。浏览器中已保存的训练和申请记录会保留。' : '正在准备题库与训练资料，请稍候。';
  section.append(title, detail);
  if (failed) {
    const retry = document.createElement('button');
    retry.type = 'button'; retry.textContent = '重新加载'; retry.onclick = () => mountApp();
    section.append(retry);
  }
  target.replaceChildren(section);
}
async function mountApp() {
  if (mounting) return;
  mounting = true;
  showBootState();
  try {
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
  } catch {
    mounting = false;
    showBootState(true);
  }
}

void mountApp();
