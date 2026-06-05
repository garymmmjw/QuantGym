# QuantGym 应用化（App 型）转型方案

> 目标：解决「点浏览器回退就退出整个网页」的问题，并把项目从一个巨型单文件结构，逐步演进成可维护的 App 型前端架构。
> 适用代码状态：`src/main.js`（17,536 行）为实际入口，Vite 8 + ES module，已部分拆分。

---

## 0. 结论先行（TL;DR）

1. **真正的问题不是 HTML。** `index.html`（2187 行）只是 21 个模块的**静态外壳**，内联 JS 总共约 60 行（MathJax 配置 + 一个计数动画）。真正的巨石是 **`src/main.js`（17,536 行）**。
2. **回退键退出的根因是「根本没有路由」**：导航函数 `switchModule()` 只切换 `.active` class，**从不写浏览器 history、没有 `popstate` 监听、启动时也不读 URL**。整个 SPA 共用同一个 URL，历史里只有「打开页面」一条记录 —— 按回退自然退出整个站点。
3. **`app.js`（根目录，552KB / 14,144 行）是死代码**，没有任何文件引用它（真正入口是 `/src/main.js`）。可直接删除。
4. 分两阶段推进：
   - **Phase 1（约半天，净增 ~80 行，低风险）**：新增 `src/router.js`，改 `switchModule` 一处签名 + 启动处接线。立刻修复回退/前进、刷新保持当前模块、支持 `#jobs` 这类深链接。
   - **Phase 2（渐进，可随时暂停）**：把 `src/main.js` 按「模块契约」逐个拆进 `src/modules/<name>/`，引入轻量 store 管理共享状态。**不需要一次性重写**。

---

## 1. 现状诊断

### 1.1 技术栈与文件体量

| 文件 | 行数 / 体积 | 角色 |
|---|---|---|
| `index.html` | 2,187 行 | 静态外壳：21 个 `[data-module-view]` 区块 + 顶部导航。内联 JS 仅 ~60 行 |
| `src/main.js` | **17,536 行** | **实际入口与全部业务逻辑**（真正的单体） |
| `app.js`（根目录） | 14,144 行 / 552KB | **死代码**，无任何引用，可删除 |
| `styles.css` | 429KB | 全站样式（单文件） |
| `src/constants.js` / `i18n.js` / `catalog-data.js` / `prep-data.js` / `skills.js` | 小 | 已拆出的常量、文案、目录数据 |

> 说明：你之前已经做过一轮拆分（抽出 constants / i18n / data，接上 Vite + ES module），方向是对的。剩下的核心逻辑仍集中在 `main.js`。

### 1.2 现有导航机制

入口链路：`index.html` → `<script type="module" src="/src/main.js">`。

导航靠 `src/main.js` 里的 `switchModule()`（约 line 3402）：

```js
function switchModule(moduleName = "overview") {
  const hasTargetModule = [...document.querySelectorAll("[data-module-view]")]
    .some((view) => view.dataset.moduleView === moduleName);
  const targetModule = hasTargetModule ? moduleName : "overview";

  // 切换导航高亮
  document.querySelectorAll("[data-module-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.moduleTab === targetModule);
  });
  // 切换视图显隐
  document.querySelectorAll("[data-module-view]").forEach((view) => {
    view.classList.toggle("active", view.dataset.moduleView === targetModule);
  });
  // 调用对应模块的 render（overview / news / poker / jobs ...）
  // ...
  window.scrollTo({ top: 0, behavior: "smooth" });
}
```

`switchModule` 在约 25 处被调用（导航点击约 line 600、各种按钮、跳转）。

全部模块（共 21 个，`data-module-view` 取值）：
`overview, problems, interview, skills, plan, news, jobs, companies, courses, library, resume, network, experiences, community, messages, tools, poker, pk, memory, account, settings`

### 1.3 回退键为什么会退出整个网页（根因）

- `switchModule()` **只 toggle class**，**完全不调用** `history.pushState` / `replaceState`。
- 全站仅有的 history 操作是局部状态，与主导航无关：
  - `setPokerRoomUrl()`（line ~14995）：为扑克房间写 `?pokerRoom=XXXX#poker`；
  - line ~11023：消费插件 `?capture=` 参数后清理 URL；
  - line ~1636：启动时一次性 `replaceState` 清理 URL。
- **没有 `popstate` / `hashchange` 监听器**；启动（`DOMContentLoaded`，line 160）**不读 `location.hash`** 来恢复模块，所以永远默认落在 `overview`。

结论：21 个模块共用同一个 URL，浏览器历史栈里只有「进入站点」这一条目。无论你切到哪个模块，按「回退」都会跳出 QuantGym（回到上一个站点 / 空白页）。

附带影响（同源问题）：

- 刷新页面会丢失当前模块，回到 overview。
- 无法把某个模块发给别人 / 收藏（没有深链接，如 `quantgym.app/#jobs`）。

---

## 2. Phase 1 — 修复路由（最高优先级）

**目标**：回退/前进在模块之间正确移动；刷新停留在当前模块；支持 `#<module>` 深链接。
**改动**：新增 1 个文件 + 改 `switchModule` 1 行 + 启动处接线 3 行。**不动现有 25 处调用方**。

> 方案选型：采用 **hash 路由 + `history.pushState`**。理由：(1) 静态部署、无服务端路由，hash 最稳；(2) `pushState`/`replaceState` 不会触发 `popstate`/`hashchange`，因此不会回灌 `switchModule`，**无循环、单次渲染、无需抑制标志**；(3) 只改 hash、保留现有 query（`?lang`、`?pokerRoom`）。

### Step 1 — 新增 `src/router.js`

```js
// src/router.js
//
// 为什么存在：原先 switchModule() 只切换 .active class 而不碰 URL，
// 整个 app 共用一个 URL、历史栈只有一条记录，所以按浏览器「回退」会直接
// 退出整个站点。把当前模块镜像进 location.hash 后，每次切换模块都会产生
// 一条历史记录 —— 回退/前进可在模块间移动，刷新保持当前模块，#jobs 深链接生效。

const VALID_MODULES = new Set([
  "overview", "problems", "interview", "skills", "plan", "news",
  "jobs", "companies", "courses", "library", "resume", "network",
  "experiences", "community", "messages", "tools", "poker", "pk",
  "memory", "account", "settings",
]);

export const DEFAULT_MODULE = "overview";

// 从 URL hash 读取当前模块。容忍 "#poker" 之外另有 ?pokerRoom= 在 query 里的情况。
export function moduleFromHash() {
  const raw = decodeURIComponent((window.location.hash || "").replace(/^#/, "")).trim();
  const name = raw.split(/[?&/]/)[0];
  return VALID_MODULES.has(name) ? name : DEFAULT_MODULE;
}

// 把模块写入 hash 作为「新」历史记录（回退/前进会回到它）。
// 只改 hash，保留现有 query。pushState 不触发 popstate/hashchange，不会回灌 switchModule。
export function pushModuleToUrl(moduleName) {
  const target = VALID_MODULES.has(moduleName) ? moduleName : DEFAULT_MODULE;
  if ((window.location.hash || "").replace(/^#/, "") === target) return; // 同模块不重复入栈
  try {
    const url = new URL(window.location.href);
    url.hash = target; // 保留 ?lang / ?pokerRoom 等查询参数
    window.history.pushState(window.history.state, "", url.toString());
  } catch {
    // 无 History API 环境（如本地 file:// 预览）：视图照常切换，仅不写 URL。
  }
}

// 首屏「替换」当前历史记录，规范化 URL 而不额外新增一条记录。
export function replaceModuleInUrl(moduleName) {
  const target = VALID_MODULES.has(moduleName) ? moduleName : DEFAULT_MODULE;
  try {
    const url = new URL(window.location.href);
    url.hash = target;
    window.history.replaceState(window.history.state, "", url.toString());
  } catch {
    /* file:// 预览无 History API，忽略 */
  }
}

// 启动时调用一次。onNavigate(name) 应「切视图但不再写 URL」（透传 fromRouter 标志）。
// popstate 只在用户按回退/前进时触发，正是我们要响应的事件。
export function initRouter(onNavigate) {
  window.addEventListener("popstate", () => onNavigate(moduleFromHash()));
  return moduleFromHash();
}
```

### Step 2 — 改 `src/main.js` 的 `switchModule`

在文件顶部已有的一大段 import 之后，新增一行：

```js
import { initRouter, moduleFromHash, pushModuleToUrl, replaceModuleInUrl } from "./router.js";
```

把 `switchModule` 的签名和**唯一一处新增**改成：

```js
// 改前：
// function switchModule(moduleName = "overview") {

// 改后：
function switchModule(moduleName = "overview", { fromRouter = false } = {}) {
  const hasTargetModule = [...document.querySelectorAll("[data-module-view]")]
    .some((view) => view.dataset.moduleView === moduleName);
  const targetModule = hasTargetModule ? moduleName : "overview";

  // 新增：把模块同步进 URL（产生历史记录 → 回退/前进可用）。
  // 来自路由（popstate / 首屏）的调用不再回写 URL，避免重复。
  if (!fromRouter) pushModuleToUrl(targetModule);

  // ……以下保持原样（toggle class + 各模块 render + scrollTo）……
}
```

> 关键：写的是已校验过的 `targetModule`，不是原始 `moduleName`，对非法值的处理与原逻辑一致。

### Step 3 — 在启动处接线

`src/main.js` 的 `DOMContentLoaded` 回调（line 160）当前为：

```js
document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  bindElements();
  bindEvents();
  setupButtonRipples();
  renderSession();
  initGoogleLogin();
  if (currentUser) renderMentalMath();
  window.setInterval(maybeAutoRefreshNews, NEWS_AUTO_REFRESH_MS);
  window.setInterval(maybeAutoRefreshJobs, JOBS_AUTO_REFRESH_MS);
  window.addEventListener("resize", updateGlobalSearchPlaceholder);
  refreshIcons();
  initSharkInteractions();
});
```

在 `bindEvents()` 与 `renderSession()` **之后**追加这段（即在 `initSharkInteractions()` 前后均可）：

```js
  // ---- 路由接线：响应回退/前进，并按 URL hash 恢复首屏模块 ----
  initRouter((name) => switchModule(name, { fromRouter: true }));
  const initialModule = moduleFromHash();
  replaceModuleInUrl(initialModule);                  // 规范化 URL，不额外入栈
  switchModule(initialModule, { fromRouter: true });  // 渲染正确的初始模块
```

### Step 4 — 验收清单

- [ ] 点导航切到 `jobs` → 地址栏出现 `#jobs`；按浏览器「回退」→ 回到 `overview`（不退出站点）。
- [ ] 多次切换 `overview → news → poker → skills`，逐次回退能原路返回。
- [ ] 在 `#poker` 刷新页面 → 仍停在 poker，而不是回到 overview。
- [ ] 直接访问 `…/#library` → 首屏即打开 library。
- [ ] 进入扑克房间后地址栏仍含 `?pokerRoom=XXXX`（query 未被 hash 覆盖）。
- [ ] 已登录态下切换模块、回退、前进均正常；控制台无报错。

### Step 5 — 两个需要注意的交互点

1. **登录态 / 深链接**：`renderSession()` 决定显示登录页（authShell）还是应用页（appShell）。若**未登录**时用 `#jobs` 深链接进来，可能出现「应该先看到登录页，却恢复了某模块」。先按上面接线；如发现未登录深链接行为异常，把 Step 3 的「恢复初始模块」两行**移到登录成功的回调里**再执行（即登录后才 `switchModule(moduleFromHash(), { fromRouter: true })`）。
2. **与现有 poker URL 的叠加**：点 poker → `pushModuleToUrl` 推入 `#poker`，随后 `renderPokerGame()` 内部的 `setPokerRoomUrl()` 会 `replaceState` 补上 `?pokerRoom=`。两者可共存（一个 push、一个 replace），回退仍只对应「进入 poker」一条记录。Phase 2 可考虑把 pokerRoom 统一纳入路由层。

---

## 3. Phase 2 — 架构应用化（拆分 `main.js`）

Phase 1 修好体验问题后，Phase 2 解决可维护性：把 17,536 行的 `main.js` 渐进拆成「每个模块一个目录」的 App 结构。**采用 Strangler（绞杀者）策略，一次只搬一个模块，其余照旧运行，可随时停下。**

### 3.1 目标目录结构

```
src/
  main.js                ← 瘦身为「启动器」：绑外壳、init 路由、挂载当前模块
  router.js              ← Phase 1 的路由
  state/
    store.js             ← 单一数据源 + subscribe()（替代散落的模块级 let 变量）
    persistence.js       ← localStorage 读写（STORAGE_KEY / AUTH_KEY / USER_STATE_PREFIX …）
  lib/                   ← 纯函数、零 DOM：formatNumber / randomInt / clampNumber / 日期格式化 …
  ui/                    ← 跨模块 UI：icons(refreshIcons) / toast / modal / button ripples / 计数动画
  modules/
    overview/index.js
    problems/index.js
    interview/index.js
    poker/index.js
    news/index.js
    jobs/index.js
    …                    ← 每个模块一个目录
  data/                  ← 既有目录数据（problem-catalog 等）
  constants.js  i18n.js  ← 既有
```

### 3.2 模块契约（Module Contract）

每个模块导出统一接口，便于路由层调度：

```js
// src/modules/<name>/index.js
export default {
  // 首次显示时调用一次：绑事件、构建动态 DOM
  mount(ctx) {},
  // 每次成为当前模块时调用：根据 state 重新渲染
  render(ctx) {},
  // 可选，离开模块时调用：清理定时器/监听器
  unmount(ctx) {},
};
```

其中 `ctx = { store, t, els, refreshIcons, navigate }`（`navigate` 即对 `switchModule` 的封装）。

`main.js` 维护一张「模块名 → 模块对象」的注册表；路由回调变成：先 `prev.unmount?.()`，再 `next.mount?.()`（仅首次）/ `next.render()`。这就是终态。

### 3.3 共享状态：引入轻量 store

当前 `main.js` 用大量模块级 `let` 维护状态（`problemDifficultyFilter`、`newsTopicFilter`、`currentPokerGame`、`currentUser`、`interviewLanguage` …）。拆分后这些跨模块状态需要集中管理，建议一个 ~30 行的 pub/sub store：

```js
// src/state/store.js
const state = { /* user, problems, filters, poker, … */ };
const listeners = new Set();

export function getState() { return state; }
export function setState(patch) {
  Object.assign(state, patch);
  listeners.forEach((fn) => fn(state));
}
export function subscribe(fn) { listeners.add(fn); return () => listeners.delete(fn); }
```

模块在 `mount` 时 `subscribe`，状态变更触发对应模块 `render`。

### 3.4 推荐拆分顺序（叶子优先、跨切面最后）

> 原则：先搬**最独立、依赖最少**的模块，积累模式与信心，再处理强耦合的核心模块。

1. **poker** — 已半隔离（自带 `currentPokerGame` 状态、自带 URL 处理、自带 `is-poker-module` body class），最适合做第一个范例。
2. **tools / mental-math** — 相对独立的工具。
3. **news** — 主要是列表渲染 + 定时刷新。
4. **library / courses** — 以目录数据渲染为主。
5. **jobs / companies** — 过滤 + 列表。
6. **skills** — canvas 雷达图（`drawRadar`）。
7. **problems / interview** — 体量大、共享状态多，靠后。
8. **overview / account / settings** — 跨切面最重，放最后。

每搬一个：把该模块的相关函数从 `main.js` 移入 `src/modules/<name>/index.js`，按契约暴露 `mount/render`，在注册表里走新路径；其余模块继续走 `main.js` 旧的 `switchModule` 分支。新旧并存，互不影响。

### 3.5 index.html 与样式

- `index.html` 的 21 个静态 `[data-module-view]` 外壳可暂时保留；随模块拆分，可逐步把各模块的初始 DOM 也下沉到对应模块（由 `mount` 构建），但**非必须、优先级低**。
- 内联脚本：`<head>` 的 MathJax 配置**保留原位**；末尾约 line 2140 的计数动画（~50 行）后续可移入 `src/ui/`，低优先级。
- `styles.css`（429KB 单文件）后续可按模块切分为 CSS Module / 多文件，属于优化项，不阻塞功能。

---

## 4. 清理任务

- [ ] **删除根目录 `app.js`**（552KB，已确认无任何引用，真正入口是 `/src/main.js`）。删除后 `npm run dev` 与构建均不受影响。
- [ ] 检查 `artifacts/`、`experiments/` 等目录是否含旧版本副本，避免与 `src/` 混淆。
- [ ] 确认构建脚本 `scripts/build-static-site.mjs` 产物只包含 `src/` 链路。

---

## 5. 执行计划与工作量

| 阶段 | 内容 | 预估 | 风险 | 产出 |
|---|---|---|---|---|
| **Phase 1** | 新增 `router.js` + 改 `switchModule` 一处 + 启动接线 + 删 `app.js` | ~半天 | 低 | 回退/前进、刷新保持、深链接全部修复 |
| **Phase 2a** | 立 `store.js` / `lib/` / `ui/` 骨架，搬第一个模块（poker）跑通契约 | 1 天 | 低-中 | 验证模块化模式 |
| **Phase 2b** | 按 3.4 顺序逐个搬模块 | 每模块 0.5–1 天 | 中 | `main.js` 持续瘦身，可随时停 |

**建议**：先单独做 Phase 1 并提交（它独立修复你最痛的问题，回滚成本极低），稳定后再按节奏推进 Phase 2。
