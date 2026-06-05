# QuantGym 应用化转型 — 融合方案（Unified Plan）

> 本文融合两份方案：
> - **方案 A**（止血 + 渐进解耦，留在 vanilla）— 强在"立刻修好回退键"与低风险。
> - **方案 B**（PDF：迁移到 React + React Router + 组件化 + store + API client）— 强在现代化终点与风险分级顺序。
>
> 结论：二者**不是二选一，而是一条路径的先后三段**。已核对代码事实，逐条取舍如下。

---

## 0. 先讲清楚：两份方案在回答两个不同问题

| 维度 | 方案 A（我的） | 方案 B（PDF） |
|---|---|---|
| 回答的问题 | 怎么**立刻止血** + 低风险拆单体 | 理想**现代化终点**架构 |
| 路线 | vanilla + hash 路由 + 渐进模块化 | React + React Router + 组件化 + store + API client |
| 对"回退键退出" | **专门诊断根因，半天修好** | 未单独处理；要等 React 迁完才顺带解决 |
| 路由 | hash（`#jobs`，静态部署零配置） | path（`/jobs`，需服务端 SPA fallback） |
| 迁移顺序 | 有，但 **poker 排最前（错）** | 有，**poker 排最后（对）**，风险分级更细 |
| 改动量 / 风险 | 小 / 低 | 大 / 中高（重写 17.5k 行） |

**致命顺序问题**：方案 B 完全漏掉了"如何立刻修好回退键"。在纯 React 路线下，你最痛的问题要拖到整个 React 迁移完成（对 17,536 行单体而言现实是数周~数月）才解决。
**正确做法**：先用方案 A 的 hash 路由半天止血，再追求方案 B 的现代化终点。

---

## 1. 统一三阶段路线

### Stage 0 — 立刻止血（本周，无条件做，约半天）

**做什么**：沿用方案 A `§2` 的 hash 路由（新增 `src/router.js` + 改 `switchModule` 一处 + 启动接线 3 行）。**代码原样可用，本文不再重复粘贴。**

**为什么必须先做、且独立于框架决策**：
- 它在**任何**长期路线（继续 vanilla / 迁 React）全程都成立——为整个迁移期保住可用的回退/前进/刷新/深链接。
- 半天、净增 ~80 行、不动现有 25 处调用方、低风险、可秒回滚。

> 取舍：**采纳方案 A，修补方案 B 的最大漏洞。**

### Stage 1 — 解耦单体（接下来，渐进，仍是 vanilla）

**做什么**：用 Strangler（绞杀者）策略把 `src/main.js` 逐个模块拆进 `src/modules/<name>/`，并立起三层支撑：`store`（pub/sub 状态）、`api/client`（统一后端调用）、`lib`/`ui`（纯函数 / 跨模块 UI）。一次只搬一个模块，其余照旧，可随时停。

**为什么这一步对两条路线都值**：
- 它本身就让 17.5k 行单体变可维护、可持续交付。
- **它是 React 迁移的最佳跳板**：一个干净的模块化 vanilla 代码库，让后续 React 迁移可以"每个 module 一对一变成一个 page"，逐个搬——而不是去硬啃一个 17.5k 行单体。
- 这一步**双方方案的终态结构基本一致**（feature 模块 + store + api client），只是先用 vanilla 实现。

> 取舍：**采纳双方共识的模块化方向**，但先以最低风险的 vanilla 形态落地。

### Stage 2 — 是否上 React（审慎决定，不是自动发生）

这是一个**真实的岔路口**，不是必然。诚实的取舍：

**倾向上 React（采用方案 B 的终点），当：**
- QuantGym 要做成长期、持续生长、可能多人协作的产品（它已是公开 beta）。
- 你想从根上消灭"命令式 DOM 操作"这类 bug（回退键 bug 正是这类的产物）；React 的声明式渲染结构性地避免一整类问题。
- 你需要 React Router 的健壮路由能力：嵌套路由、`ProtectedRoute` 路由守卫（直接解决"未登录深链接"问题）、loader 等。

**可不上 React（停在 Stage 1 即足够），当：**
- QuantGym 维持个人 / 小项目规模，Stage 1 的 vanilla 模块化已能满足可维护性。
- 你不想承担重写成本与迁移期的框架共存复杂度。

**若决定上**：用方案 B 的目标架构、迁移顺序、don't-do 清单作为 playbook，但**从 Stage 1 的模块化基座迁，而非今天的单体**。诚实预期成本：把 17.5k 行命令式 DOM 代码迁成 JSX + hooks 是**真重写**，不是机械转换；迁移期需让 React 挂载进既有 DOM 与 vanilla 共存，比"cp 一份 legacy"复杂得多。

> 取舍：**采纳方案 B 作为长期终点选项**（修方案 A 过于保守、未认真摆出 React 的不足），但**补上方案 B 未提的成本与共存期风险**。

---

## 2. 关键技术裁决（逐条 取其精华 / 去其糟粕）

### 2.1 Poker 顺序 —— 采纳 B，修正 A（已核对代码）

代码证据：`src/main.js` 有 `getPokerWebSocketUrl` / `openPokerWebSocket` / `closePokerWebSocket` / `new WebSocket(...)` / `pokerOnline.ws`，且 `canUseCloud()` 双模式；后端有 `api-server/poker_engine.py`（45KB）+ `server.py`（96KB）。

→ Poker = 本地 fallback + 在线 server-authoritative。是全场**最复杂**模块。**Poker 必须最后迁。** 方案 A 原先的"poker 先迁"是错的（被其 localStorage + 独立 DOM 误导）。

### 2.2 路由方式 —— 分阶段采用

- **Stage 0 用 hash**（`#jobs`）：静态部署**零服务端配置**，立即可用。
- **Stage 2 若上 React Router 再切 path**（`/jobs`）：此时必须在静态托管侧配置 **catch-all rewrite 到 `index.html`**（SPA fallback），否则刷新 `/jobs` 会 404。方案 B 未提此成本，需补上。

### 2.3 状态管理 —— 采纳 B 的原则

- 渐进引入 store（Stage 1 的 `store.js` → Stage 2 的 `stores/authStore` `appStore` `userStateStore`）。
- **不要一开始上 Redux**；**不要把所有状态塞进 `App.jsx`**。（B 的 don't-do，正确。）

### 2.4 认证 / 深链接 —— 采纳 B 的 ProtectedRoute

方案 A 曾标注"未登录用 `#jobs` 深链接进来可能错乱"的坑。方案 B 的 `ProtectedRoute.jsx` 是干净解。
- Stage 0/1（vanilla）：在路由层加一个"auth gate"——恢复模块前先判断 `currentUser`，未登录则落到登录页、登录后再 `switchModule(moduleFromHash())`。
- Stage 2（React）：直接用 React Router 的 `ProtectedRoute` 包裹受保护页面。

### 2.5 API client + 后端独立 —— 采纳 B（代码证实）

`main.js` 有多处 `fetch` 后端调用；后端含 `api-server/server.py` + `llm-proxy/server.mjs`。
→ 把散落的 `fetch` 收敛到 `src/api/client.js`（统一 base、鉴权、错误处理）。后端 API server 独立维护。这条无论是否上 React 都该做。

### 2.6 立刻止血 —— 采纳 A（修 B 最大漏洞）

见 Stage 0。这是两份文档差异里**最重要**的一条。

### 2.7 死代码清理 —— 采纳 A

根目录 `app.js`（552KB / 14,144 行）**无任何引用**（真正入口 `/src/main.js`），删除。

---

## 3. 合并后的目标结构（Stage 1 → Stage 2 映射）

**Stage 1（vanilla 模块化，先落地）：**

```
src/
  main.js              ← 瘦身为启动器：绑外壳 + init 路由 + 挂载当前模块
  router.js            ← Stage 0 的 hash 路由
  state/  store.js  persistence.js
  api/    client.js
  lib/                 ← 纯函数（formatNumber/randomInt/日期…）
  ui/                  ← 跨模块 UI（icons/toast/modal/ripples）
  modules/<name>/index.js   ← 每模块一个，导出 { mount, render, unmount }
  data/  constants.js  i18n.js   ← 既有
```

**Stage 2（React，若决定上 —— 方案 B 的目标，几乎一对一映射）：**

```
src/
  main.jsx  App.jsx
  routes/   routes.jsx  ProtectedRoute.jsx
  layouts/  AppLayout.jsx  AuthLayout.jsx
  pages/    OverviewPage.jsx … PokerPage.jsx   ← Stage 1 的每个 module → 一个 page
  components/  shell/{Topbar,Sidebar,CommandBar}  common/{Button,Card,Modal}
  features/    interview/ problems/ poker/ library/
  stores/      authStore.js  appStore.js  userStateStore.js
  api/         client.js authApi.js syncApi.js pokerApi.js
  styles/      tokens.css global.css shell.css components.css
```

**映射关系**：Stage 1 的每个 `modules/<name>/index.js` 的 `render/mount` 逻辑 → Stage 2 的 `pages/<Name>Page.jsx`；`data-module-tab` → React Router 的 `NavLink`；hash 路由 → React Router path 路由 + ProtectedRoute。

**路由表（Stage 2）**：
```
overview→/   plan→/plan   skills→/skills   interview→/interview
problems→/problems   tools→/tools   poker→/poker   news→/news
community→/community   messages→/messages   library→/library
account→/account   settings→/settings
```

---

## 4. 合并后的迁移顺序总表

| 阶段 | 内容 | 模块/动作 | 顺序依据 | 工作量 | 风险 |
|---|---|---|---|---|---|
| **Stage 0** | hash 路由止血 + 删 `app.js` | router.js / switchModule / 启动接线 | 修最痛问题，独立于框架 | 半天 | 低 |
| **Stage 1** | 立支撑层 + 搬首个简单叶子模块 | store/api/lib/ui 骨架 + **mental-math 或 news** 跑通契约 | **先搬"既独立又简单"的**（不是 poker） | ~1 天 | 低 |
| Stage 1（续） | 渐进搬低风险页面 | overview / companies / courses / settings / account / library shell | 静态、跨切面小 | 每模块 0.5–1 天 | 低-中 |
| Stage 1（续） | 搬核心训练模块 | problems / interview / library reader | 共享状态多 | 每模块 1 天 | 中 |
| **Stage 2** | （若决定）逐模块改写为 React page | 同上顺序，复用 Stage 1 边界 | 从模块化基座迁 | 每模块 1–2 天 | 中 |
| 最后 | Poker | poker（WebSocket + 服务端引擎） | **最复杂，永远最后** | 数天 | 高 |

> 注：方案 B 的 Stage 1 首个范例选了"建 React 外壳"，方案 A 选了 poker。**两者都不理想**——首个范例应选"既独立又简单"的叶子（mental-math / news），用最小风险验证模块契约，再铺开。

---

## 5. Don't-do 清单（合并版）

- **不要**在做 React 之前不先做 Stage 0 止血（否则回退键问题拖数周）。
- **不要**一次性大重写；用 Strangler 一次搬一个模块。
- **不要**第一个就搬 / 重写 Poker（最复杂，最后）。
- **不要**把所有状态塞进 `App.jsx`；**不要**一开始上 Redux。
- **不要**把所有 HTML 直接复制进一个 React 组件。
- **不要**在 React 里继续大量 `document.getElementById`（改用 state + ref）。
- **不要**为页面切换再新建 HTML 页面。
- **不要**（Stage 2）用 path 路由却忘了配静态托管的 SPA fallback。

---

## 6. 一句话路线

**Stage 0 半天止血（本周）→ Stage 1 渐进解耦（仍 vanilla，是 React 跳板）→ Stage 2 审慎决定是否上 React（用 PDF 的终点 + 顺序 + don't-do，从模块化基座迁，Poker 永远最后）。**
