# QuantGym UI / 功能回归审查清单

日期：2026-06-07

## 1. 审查范围

本审查用于对比当前本地 React 迁移态与 GitHub 上线基准，确认迁移后哪些 UI 不一致、哪些功能可能或已经失效，并给后续 coding agent 一份可执行的修复和验收清单。

对比基准：

- GitHub 上线基准：`origin/main@b2107214d0cdfb43170f8cc02cb35c61896b877b`
- 基准源码快照：`/tmp/quantgym-audit-origin-main`
- 当前本地分支：`codex/fix-responsive-ui-audit`
- 当前本地状态：迁移工作区包含大量未提交 React 化改动，属于本次迁移态；不是与 `origin/main` 完全一致的干净工作区。

本轮已执行检查：

```bash
git fetch origin --prune
git archive origin/main | tar -x -C /tmp/quantgym-audit-origin-main
npm run build
npm run check:stage1
npm run check:stage2:strict
```

结果：

- `npm run build` 通过。
- `npm run check:stage1` 通过，仅保留 21 个 React-owned module 的预期 warning。
- `npm run check:stage2:strict` 通过：`legacy routes: 0`、`bridge routes: 0`、`react routes: 21`。
- `git diff --check` 通过。
- 2026-06-08 最终 gates 复跑通过：`git diff --check`、`npm run check:stage1`、`npm run check:stage2`、`npm run check:stage2:full`、`npm run check:stage2:strict`、`npm run check:ui-contracts`、`npm run build`。Build 仅保留预期 warning：classic script tags 和 `createAppServices` chunk 超过 500 KB。静态构建 config 已在后续修复中改为读取本地公开 runtime config fallback，不再生成空 endpoint。
- 2026-06-08 早期外部配置审计：当时 `config.js` 中 `cloudApiEndpoint`、`llmEndpoint`、`googleClientId` 均为空，`googleLoginEnabled=false`；本机未监听 `127.0.0.1:8787` 或 `127.0.0.1:8790`；环境变量未发现 `OPENAI_API_KEY`、`QUANTGYM_GOOGLE_CLIENT_ID`、`LLM_AUTH_API_BASE` 等生产签收所需凭据。因此当时生产 LLM/PDF 和真实 Google provider 账号边界不能由本地工作区单独证明。该状态已被后续配置复验覆盖，保留为历史证据。
- 2026-06-08 空配置外部边界 UI smoke：真实 Chrome 在无 auth / 无 Google Client ID / 无 8787/8790 服务时验证 Login 稳定；临时本地账号进入 Settings 时默认 LLM/Cloud fallback endpoint 可见、Google Client ID 为空；Resume 在无 LLM 服务时走本地 fallback 并渲染修改建议；三页均无 pageerror、无 Vite overlay、无 document-level 横向溢出。证据见 `315-external-boundary-login-no-google.png`、`316-external-boundary-settings-empty-config.png`、`317-external-boundary-resume-local-fallback.png`、`317-external-boundary-empty-config-summary.json`。
- 已新增生产边界签收脚本：`npm run verify:production-boundaries`。真实部署时传入 `QUANTGYM_CLOUD_API_ENDPOINT`、`QUANTGYM_GOOGLE_ID_TOKEN`、`QUANTGYM_LLM_ENDPOINT`，以及需要时的 `QUANTGYM_LLM_BEARER_TOKEN`，脚本会验证 cloud health、Google provider login、LLM resume review、LLM PDF question generation。
- 2026-06-08 已修复真实 LLM proxy 的 Resume contract：`llm-proxy/server.mjs` 现在支持前端发送的 `task=resume_review` 并返回 `{ items }`。早期本地 8787/8790 服务启动后，production boundary 曾达到 4 pass / 1 skip；最终补齐 Google ID token 后，`npm run verify:production-boundaries` 已升级为 5 pass / 0 skip / 0 fail。真实 Chrome `/resume` UI 已 POST 到 8787 并渲染 5 条 review item。证据见 `318-resume-real-llm-proxy-review.png`、`318-resume-real-llm-proxy-review-summary.json`、`319-production-boundaries-local-services-summary.json`。
- 2026-06-08 追加 LLM proxy 鲁棒性修复：release-readiness 总闸门首次运行时真实 `resume_review` 偶发因为模型输出接近 JSON 但缺逗号/括号而失败。`llm-proxy/server.mjs` 已对 Resume review 增加宽容解析路径：严格 JSON 解析失败时从 `items` 数组片段或文本行中抽取建议，仍返回前端 contract `{ items }`。复跑 production boundary 后 LLM resume review 恢复 pass。
- 2026-06-08 Google OAuth 真实 provider login 已签收：更新 Google OAuth Client ID 后，Google Cloud Console 已允许 `http://127.0.0.1:5179` origin；helper 页面复制短时 ID token 后，`npm run verify:production-boundaries` 打到真实 `/api/auth/google` 并返回 session。后端已修复同邮箱已有本地账号时 Google 登录返回 `Email already exists` 的问题：现在会把已验证 Google 身份绑定到同邮箱账号并签发 session。证据见 `319-production-boundaries-local-services-summary.json`、`323-release-readiness-summary.json`、`327-migration-completion-audit-summary.json`。
- 2026-06-08 静态构建配置修复：`scripts/build-static-site.mjs` 现在会读取根 `.env` 和 `config.js` 作为公开 runtime config fallback，再写入 `dist/config.js`。本地 build 产物已确认包含 `8790/8787` endpoint 和 Google Client ID，不包含 `OPENAI_API_KEY`；`--strict` 仍拒绝本地 `http://127.0.0.1` endpoint，避免生产发布误用本地地址。
- 2026-06-08 UI contract gate：新增并增强 `npm run check:ui-contracts`，机器检查 21 个 React route、共享 App/Auth/Todo shell id、每个页面迁移后必须保留的关键 DOM id、25 个关键 JSON 证据文件，以及 92 个非空截图证据文件。JSON 证据现在是内容级断言：桌面/移动 route smoke 必须 21/21 pass，GitHub baseline parity 必须 21/21 pass 且 actionable issues 为 0，browser evidence manifest 必须 0 missing / 0 invalid，migration completion 必须 10 pass / 0 pending / 0 fail，production-boundary 必须维持 5 pass / 0 skip / 0 fail，local readiness 必须保持最终 pass 或明确的 production-token-only partial，static build config 不得嵌入 OpenAI key，Google token helper 浏览器 smoke 必须可渲染。新增检查时发现 `319-production-boundaries-local-services-summary.json` 前两行混入 npm wrapper 文本，已修成合法 JSON，避免后续证据读取失败；最终 Google 登录签收后，gate 已升级为同时支持过渡 partial 与最终 pass。
- 2026-06-08 Browser evidence manifest：新增 `npm run check:browser-evidence`，扫描本审查文档和 `docs/SMOKE_CHECKS.md` 中的 browser-audit 截图/JSON 引用，忽略 `<route>` 模板、下载文件名和 fixture 文件名。当前验证 276 个证据引用：229 个图片文件、47 个 JSON 文件，0 missing、0 小图、0 invalid JSON。证据见 `326-browser-evidence-manifest-summary.json`。
- 2026-06-08 Migration completion audit：新增 `npm run check:migration-completion`，把 route ownership、React migration ledger、retired bridge symbol absence、route smoke、GitHub parity、browser evidence manifest、static build config、本地 cloud/LLM boundary、Google token helper 和真实 Google provider login 汇总到 `327-migration-completion-audit-summary.json`。当前状态 `pass`：10 项要求中 10 pass、0 pending、0 fail；真实 Google provider account login 已用短时 ID token 签收。
- 2026-06-08 生产边界诊断修复与最终签收：`scripts/verify-production-boundaries.mjs` 的 skip reason 会根据已读取到的 `.env`/`config.js` 输出实际缺口。最终复跑时传入短时 Google ID token，cloud health、Google provider config、Google provider login、LLM resume review、LLM PDF question generation 全部通过，结果为 5 pass / 0 skip / 0 fail。
- 2026-06-08 release-readiness gate：新增 `npm run check:release-readiness` 和 `npm run check:release-readiness:local`。严格 gate 会在 production-boundary 或 migration completion partial 存在时失败；local handoff gate 允许这些 production partial 并写出 `323-release-readiness-summary.json`。当前 gate 链覆盖 git diff、Stage 1、Stage 2 bridge/full/strict、Browser evidence、Migration completion audit、UI contracts、Route integrity、Route interactions、Browser route smoke、Module ownership、Media storage runtime smoke、Media storage production fixture、Ops alert runtime smoke、Ops alert production fixture、Jobs source runtime smoke、Jobs source production fixture、Question-bank rights、Question-bank rights public smoke、Postgres cutover export smoke、Postgres cutover、static build、Production boundaries；带新鲜 Google token 时为最终 pass。
- 2026-06-17 route interaction contract gate：新增 `npm run check:route-interactions`，静态覆盖 21 个 React route 的关键用户交互 wiring：表单提交、按钮点击、select/filter、file input、外链安全属性、route jump、状态保存和 page API 委托。它不替代真实浏览器点击，但能防止页面 DOM id 还在、handler 被改丢造成“看起来没坏但点不动”的回归。
- 2026-06-17 browser route smoke：新增 `npm run check:browser-route-smoke`，通过 `playwright-core` 驱动本机 Google Chrome 打开临时静态构建，验证未登录保护跳转、21 个登录后 route 的 runtime health/selector/横向溢出，并真实点击 Overview 到 Problems、Skills 雷达 legend/card/tooltip 联动和全局搜索 skill spotlight、题库搜索/详情/reveal/收藏、Tools 速算答题、PK 匹配/提交/reveal/训练记录持久化、Plan 创建/编辑/任务勾选/任务跳转/刷新持久化、Interview onboarding/训练练习 hint/reveal/提交/收藏/退出恢复、Todo dock 添加任务、Community 发帖/点赞/评论/刷新持久化、Messages 线程已读/发送/刷新持久化、Experiences 面经新建/编辑/分享/删除/刷新持久化、News 手动提交/筛选/详情/已读/刷新持久化、Memory 资料新增/来源链接/刷新持久化、Network 新增/编辑/删除/刷新持久化、Resume 文本保存/刷新持久化、Jobs 筛选/申请链接行为、Companies tier 筛选/刷题跳转/官网外链行为、Library 搜索/题单筛选/练题跳转/非云端 reader guard、Courses 学习路径/来源切换/备注/刷新持久化、Account 资料保存/刷新持久化和 Settings runtime config 持久化。该 gate 发现并修复了四个真实回归：Problem personal state merge 被包成嵌套数组，导致详情收藏状态不刷新；Todo dock 同时被 React shell 和旧 bootstrap 绑定，点击后双 toggle 立刻关闭；Community 发帖调用 async page API 时未 await，导致发帖成功后输入框/媒体预览不能稳定清理；Library 练题跳转没有清空 React Problems 内部搜索 query，可能被之前的题库搜索词污染。本轮追加 Interview smoke 发现提交后评分卡真实渲染为 `58/100 / 正确性 / 主要反馈`，修正了过窄的测试断言；随后追加 Skills smoke，锁住 15 行 legend、15 张 skill card、`Probability/Expectation` tooltip 和 `principal logarithm -> Complex Numbers` 全局搜索 spotlight，并在该阶段复验 21/21 interactions pass；当前追加项见下一条 22/22 记录。
- 2026-06-17 browser route smoke 追加全局搜索多类型导航：新增真实 Chrome 覆盖 Global search module/problem/job/company/course/news result click，从任意页面点击 `Settings`、`Jane Street`、`Quantitative Trading / Research Internship`、`StatQuest: Statistics and Machine Learning`、`CoreWeave` news 和 `0DTE` problem 都会进入目标 route 并显示目标内容。该轮发现 news result 曾依赖可选 `focusNews` provider，跨 route 点击后不会稳定进入 `/news`；已改为先切换 News、写入 pending focus，并连续派发 `quantgym:news-focus`。同轮 strict smoke 又暴露 PK 快速提交时 React state 可能尚未 flush，`#pkForm.requestSubmit()` 会读到空答案；`usePkPageModel.submit` 现直接读取表单 textarea 当前值作为提交值。复验 `npm run check:browser-route-smoke` 为 21/21 routes、22/22 interactions pass。
- 2026-06-18 browser route smoke 追加 Poker Gym 深测：新增真实 Chrome 覆盖 `poker demo table starts, acts, and persists room state`，从 `/poker` 创建 demo table、开始第一手牌、等待 hero turn、提交 call/check 动作、检查 players/ledger 面板，并从 `quantgym.pokerRoom.v1.QG-MAIN` 验证房间状态持久化。该轮发现测试断言需要遵守 Poker 昵称 18 字符截断规则，最终复验 `npm run check:browser-route-smoke` 为 21/21 routes、23/23 interactions pass。
- 2026-06-18 browser route smoke 追加 AuthShell 本地认证闭环：未登录访问 `/problems` 必须重定向 `/login`，随后真实 Chrome 使用临时 `@quantgym.local` 邮箱走 account-status -> registration form -> cloud verification unavailable local fallback -> local registration -> Settings logout -> existing-email password step -> relogin。`npm run check:ui-contracts` 现在要求 `unauthenticated.localEmailAuth` 中 registration、persistence、logout、password-step、relogin 全部为 true。同轮复跑暴露 PK smoke 对随机短题的断言过窄：抽到“是否为质数”短题时页面已成功匹配，但旧断言要求题干长度大于 40 导致误报 timeout；已改为非占位有效题干判断，并为质数题生成自适应测试答案。最终复验 `npm run check:browser-route-smoke` 为 21/21 routes、23/23 interactions pass，`npm run check:release-readiness:local` 为 20 pass / 1 production-token-only partial / 0 fail，`npm run check:ui-contracts` pass。
- 2026-06-18 browser route smoke 外部 console 噪声处理：release-readiness 复跑中真实 Chrome 偶发加载 Bilibili 外部脚本 `s1.hdslb.com/.../reporter-pb/index.js`，其上报请求失败会打印 `[reporter-pb]: request error TypeError: Failed to fetch`；同轮还偶发 Chrome `compute-pressure` permissions-policy 噪声。`scripts/check-browser-route-smoke.mjs` 现在仅对这两类精准外部/浏览器噪声记录 `ignoredConsoleErrors`，QuantGym 自身 console/page/own-origin HTTP 错误仍保持失败。
- 2026-06-18 release-readiness gate 顺序修复：发现 `check:release-readiness:local` 先跑 UI contracts、后刷新 Browser route smoke 和 runtime smoke 证据；如果上一轮 `328-browser-route-smoke-summary.json` 是 fail，当前轮即使随后 Browser route smoke 通过，总闸门也会先被 stale evidence 卡住。`scripts/check-release-readiness.mjs` 现在把 UI contracts 移到证据刷新步骤之后，仍跳过 release summary 自引用内容，但会读取本轮刚生成的 route/runtime evidence。
- 2026-06-18 browser route smoke 追加跨模块 prep journey：新增真实 Chrome 覆盖 `cross-module prep journey persists library, problem, todo, resume, and settings state`，从 `/library` 选择 QuantGuide 题单进入 `/problems`，保存筛选后的题目，打开 Todo dock 添加关联任务，进入 `/resume` 保存简历备注，进入 `/settings` 保存 runtime config，然后 reload 并跨路由复查题库收藏、Todo、Resume 和 Settings 持久化。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 24 个交互并包含该 journey；复验 `npm run check:browser-route-smoke` 为 21/21 routes、24/24 interactions pass。
- 2026-06-18 browser route smoke 追加 Resume LLM review 深测：新增真实 Chrome 覆盖 `resume LLM review request, render, and reload persistence`，在 `/resume` 写入简历、配置同源 LLM endpoint、拦截并校验 `resume_review` POST payload、渲染 3 条建议，并 reload 后确认 textarea 与 review list 均持久化。该轮 `npm run check:ui-contracts` 要求 browser route smoke 至少 25 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `resumeLlmReviewPass`。复验 `npm run check:browser-route-smoke` 为 21/21 routes、25/25 interactions pass。
- 2026-06-18 browser route smoke 追加 Account 上传深测：新增真实 Chrome 覆盖 `account avatar and resume file upload persistence`，在 `/account` 通过真实 file input 上传头像 PNG 和文本简历；静态环境下头像 media 上传不可用时回退为 data URL，保存后写入本地账号 picture，简历上传写入 `userState.resume`，reload 后 Account 元信息和头像仍在，并跳转 `/resume` 确认简历文本同步到 textarea。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 26 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `accountUploadPass`。复验 `npm run check:browser-route-smoke` 为 21/21 routes、26/26 interactions pass。
- 2026-06-18 browser route smoke 追加 Tools Market Game 深测：新增真实 Chrome 覆盖 `tools market game rejects crossed quote, scores valid quote, and persists record`，在 `/tools` 先提交 crossed bid/ask 并确认拒绝且不写入记录，再提交围绕 fair value 的有效双边报价，确认 `gameRecords`、`entries` 和 `skills.market` 持久化，点击 New market 后 reload 仍能从本地状态读回。该轮发现 React page API 没有从 `initDomainSlice` 导出 `recordGameResult`，导致 Market Game 只更新屏幕分数、不保存训练记录；已补回导出并把 Tools ownership 映射到 drill + market game 两条 smoke。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 27 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `toolsMarketGamePass`。复验 `npm run check:browser-route-smoke` 为 21/21 routes、27/27 interactions pass。
- 2026-06-18 browser route smoke 追加 Overview 深测：新增真实 Chrome 覆盖 `overview leaderboard controls and news ticker navigation`，在 `/` 切换 leaderboard metric/scope/country/region，确认 `userState.leaderboard` 持久化且 reload 后控件仍为 region/United States/California，再 hover 新闻 ticker 并点击新闻进入 `/news` detail。该轮发现滚动 ticker item 因持续动画导致自动化和实际鼠标点击前稳定性不足；已为 `.news-ticker:focus-within` 增加动画暂停，并在 smoke 中模拟用户 hover 后点击。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 28 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `overviewLeaderboardPass`。复验 `npm run check:browser-route-smoke` 为 21/21 routes、28/28 interactions pass。
- 2026-06-18 browser route smoke 追加 Memory 图片上传深测：新增真实 Chrome 覆盖 `memory image resource upload fallback and reload persistence`，在 `/memory` 通过真实 file input 上传 PNG 资料，验证静态/无云端 media session 场景下会回退为 `data:image/png;base64,...` 预览与本地资源持久化，reload 后图片、文件名、`IMAGE` 类型和 `userState.resources[].dataUrl` 仍一致。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 29 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `memoryImageUploadPass`。
- 2026-06-18 media upload 无云端 session 防噪修复：在本地 API/LLM 服务打开后复跑 release-readiness 时，真实 Chrome smoke 暴露 Memory 图片上传虽然成功 fallback，但仍会先请求 `/api/media` 并在无 token 场景收到 401，导致严格 console gate 失败。Account avatar、Community media、Memory resource 和 Interview attachment 上传入口现在都会在 `canUseCloud()` 为 false 时直接使用既有本地/请求 payload fallback，不再向 `/api/media` 发无授权请求；同轮在本地 API 开启状态下复跑 `npm run check:browser-route-smoke` 为 21/21 routes、29/29 interactions pass，且 `consoleErrors`/`responseErrors` 为空。
- 2026-06-18 browser route smoke 追加 Community 媒体发帖深测：新增真实 Chrome 覆盖 `community image post fallback and reload persistence`，在 `/community` 通过真实 file input 上传 PNG，确认 preview 出现、发布后卡片图片使用本地 data URL fallback，`quantMemoryBoard.community.v1.posts[].media` 持久化文件名/type/dataUrl，reload 后图片仍显示。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 30 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `communityMediaPostPass`。
- 2026-06-18 browser route smoke 追加 Settings 备份/导入/重置深测：新增真实 Chrome 覆盖 `settings backup export, import, and reset state`，在 `/settings` 点击导出并解析下载的 v2 JSON 备份，再通过真实 file input 导入带哨兵 `resume/resources/courseStates` 的备份，跳转 `/resume` 验证简历文本恢复，最后接受重置确认并验证导入哨兵从 localStorage 和 Resume UI 清除。该轮发现 `mergeImportedState` 只恢复了部分数组、leaderboard、problem/news 等字段，`resume`、`courseStates`、`prepPlan` 等完整备份字段会被静默丢失；已改为先合并当前态和导入态，再对 skills、problemStates、problems、news 等需要特殊规则的字段走既有合并逻辑。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 31 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `settingsBackupPass`。
- 2026-06-18 browser route smoke 追加 Problems 社交 no-cloud guard：新增真实 Chrome 覆盖 `problems social like/comment no-cloud guard`，在 `/problems` 打开真实题目详情后点击 like、提交评论，并拦截任何 `/problem-social` 请求，验证无云端 session 时不会发未授权 API、like 数和状态不伪成功、评论不会出现在讨论区、用户评论草稿保留、reload 后仍没有伪社交数据。该轮发现 React problems hook 对 async `toggleLike/postComment/deleteComment` 立即 `bump()`，可能在 notice 写入前重渲染；同时评论表单会在 no-cloud 失败时清空用户输入。已让底层 action return 结果、page API 在 promise settle 后 sync、hook 在 settle 后 bump，并让评论表单仅在 action 成功或 legacy 无返回值时清空。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 32 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `problemsSocialGuardPass`。
- 2026-06-18 browser route smoke 追加 LeetCode Hot 100 tracking 深测：新增真实 Chrome 覆盖 `problems LeetCode Hot 100 tracking persistence`，在 `/problems` 展开 LeetCode Hot 100 题单，勾选第一题完成，验证题单卡进度、`.leetcode-hot-item.is-done`、`userState.leetcodeHot100Done` 和 `skills.leetcode`，reload 后重开题单确认完成状态仍在，再取消完成并确认 doneIds 与 UI 进度回退。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 33 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `leetcodeHotTrackingPass`。
- 2026-06-18 browser route smoke 追加 Account 本地邮箱变更深测：新增真实 Chrome 覆盖 `account local email change requires password and reauthenticates`，把 seed 本地账号改为真实 SHA-256 password hash 后，在 `/account` 先用错误当前密码尝试改邮箱并确认被拒，再用正确当前密码保存新邮箱、验证本地 auth account 的 email 与 password hash 旋转，reload 后表单显示新邮箱，随后 logout 验证旧邮箱登录失败、新邮箱加原密码可重新登录。`npm run check:ui-contracts` 现在要求 browser route smoke 至少 35 个交互并包含该 journey；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `accountEmailChangePass`。
- 2026-06-18 browser route smoke 追加 AuthShell 密码重置闭环：扩展未登录真实 Chrome 覆盖，在本地注册/退出/重登后通过 `forgotPasswordBtn` 进入 reset form，用拦截的 password-reset 云端验证码和 reset session 模拟真实云端密码重置，验证 reset 后自动登录、本地 password hash 更新、旧密码登录被拒、新密码重新登录成功。`npm run check:ui-contracts` 现在要求 `unauthenticated.localEmailAuth` 中 reset form/code/reset/old-password reject/new-password relogin 全部为 true；`npm run check:external-launch-blockers` 的 browser journey tracked 项也会检查 `authPasswordResetPass`。
- 2026-06-18 external launch blockers 汇总：新增 `npm run check:external-launch-blockers` 和 `341-external-launch-blockers-summary.json`，机器汇总 apex/WWW SSL、真实告警/边缘限流、真实 S3/R2+CDN、真实 jobs feed、Chrome Web Store 发布、Postgres cutover、public/commercial 题库授权 7 个外部 blocker，以及 browser journey 持续扩展的 tracked 项。默认检查验证这些 blocker 都被产品状态、signoff command 和本地 fixture evidence 覆盖并输出 `launchReadiness: blocked`；正式清场时可加 `-- --require-clear`，有 blocker 会失败。`npm run check:release-readiness:local` 现在也包含该 gate，使用跳过 release summary 自引用且不覆盖 `341` 的模式；`npm run check:ui-contracts` 内容级校验独立 summary 和 release-readiness 内嵌结果。
- 2026-06-18 question-bank rights gate 加硬：发现 public/commercial `approved` 状态只要求 `evidenceUrl` 字段存在，不能防止占位 URL、非 HTTPS URL 或未来/无效审核日期。`scripts/check-question-bank-rights.mjs` 现在验证 private/public 状态枚举、review 日期格式与非未来性、placeholder 文本，以及 public/commercial approval 的非占位 HTTPS evidence URL；`npm run check:ui-contracts` 也开始内容级校验 release-readiness 内嵌 Question-bank rights 结果，确认 15 个 active beta sources 仍全部处于 public/commercial `needs-review`，QuantGuide 保持 private visibility，归档 `question-bank` 保持 inactive/blocked。
- 2026-06-18 question-bank public/commercial approval schema 加硬：`scripts/check-question-bank-rights.mjs` 现在对 future `publicCommercial.status="approved"` 要求 `approvalType`、`redistributionScope`、`evidenceSummary`，并对 direct permission 要求 `permissionGrantor`、对 open-license/public-domain 要求 `licenseName/licenseUrl`、对 commercial release 要求 `commercial-use` scope，且 approval review 不能超过 366 天。新增 `npm run check:question-bank-rights:public-smoke` 用临时 fixture 验证 public/commercial 正例，以及缺 commercial scope、placeholder evidence、过期 review、缺 grantor、unsupported scope 等反例；新增 `npm run check:question-bank-rights:commercial` 作为商业发布显式 gate；`npm run check:ui-contracts` 内容级校验 `335-question-bank-rights-public-smoke-summary.json` 和 release-readiness 嵌套结果。
- 2026-06-18 question-bank rights evidence URL 加硬：发现 public/commercial approval 的 `evidenceUrl` 只拒绝 placeholder/example/local host，仍可能接受 `10.x`、`172.16-31.x`、`192.168.x`、link-local、`.local` 或 IPv6-mapped 私网地址作为授权证据。`scripts/check-question-bank-rights.mjs` 现在拒绝 localhost、loopback、private-network 和 raw-IP evidence/license URLs，`npm run check:question-bank-rights:public-smoke` 新增 private/raw-IP evidence URL 反例，`npm run check:external-launch-blockers` 也记录 `privateEvidenceRejected` 和 `rawIpEvidenceRejected`。
- 2026-06-18 module ownership gate：新增 `src/modules/ownership.js` 和 `npm run check:module-ownership`，把 21 个 route module 映射到 owner group、nav group、page file、feature entry、state domains 和对应的真实 Chrome browser-route-smoke interaction。Release-readiness 现在会在刷新 `328-browser-route-smoke-summary.json` 之后运行该 gate，UI contracts 会内容级校验内嵌 ownership 结果，防止页面迁移后出现“route 存在但无 owner/无交互证据”的漂移。
- 2026-06-18 media storage MIME/object-extension hardening：发现 `/api/media` 旧逻辑会优先使用原始文件名后缀，即使 data URL payload 的已验证 MIME 类型不同，例如 PNG 内容配 `.mp4` 文件名会生成 `.mp4` storage path。后端现在由 MIME 类型决定对象后缀，同时保留原始展示文件名；`npm run check:media-storage:runtime-smoke` 新增 mismatch 上传断言，并要求 DB/storage path 使用 `.png`、不生成 filename-derived `.mp4` 对象。`npm run check:ui-contracts` 已把该断言纳入 `329-media-storage-runtime-smoke-summary.json` 内容级校验。
- 2026-06-18 media URL proxy-header hardening：发现 `/api/media` 上传响应里的 API read-through URL 会无条件信任 `X-Forwarded-Host`、`X-Forwarded-Proto` 和 `X-Forwarded-Ssl`，直连客户端可伪造返回 URL 的 host/proto。后端现在支持显式 `QUANTGYM_PUBLIC_API_BASE_URL`，且仅当请求来源位于 `QUANTGYM_TRUST_PROXY_HEADERS` / `QUANTGYM_TRUSTED_PROXY_CIDRS` 配置的可信代理时才读取 forwarded host/proto；`npm run check:media-storage:runtime-smoke` 新增伪造 `evil.example.test` header 的真实上传断言，`npm run check:ui-contracts` 内容级校验该 URL 仍指向 API media endpoint。
- 2026-06-18 jobs source ingest hardening：发现外部 crawler/vendor feed 可返回 `javascript:` 等非 http(s) URL 或未知岗位 type；虽然前端打开外链时仍有安全 helper，脏 URL 仍可能进入 state、全局搜索和公司聚合数据。后端 `normalize_job_item` 现在只保留 http/https URL，其余归一为 `#`，未知 type 归一为 `internship`；`npm run check:jobs-source:runtime-smoke` 新增 `runtime-unsafe-url` feed fixture，验证 URL 被清洗、type 被默认、缓存/筛选/fallback 仍通过。`npm run check:ui-contracts` 已把 `unsafeSourceUrlSanitized` 和 `unknownSourceTypeDefaulted` 纳入 `330-jobs-source-runtime-smoke-summary.json` 内容级校验。
- 2026-06-18 jobs source `postedAt` hardening：发现真实 crawler/vendor feed 签收只防缺失 `postedAt` 后回落为 `crawler-ready`，但无效日期或未来日期仍可能进入 `/api/jobs`，前端排序会把 `Invalid Date` 当作不稳定时间处理。后端 `normalize_job_item` 现在只保留可解析且不超过未来 24 小时的 `postedAt/createdAt`，否则归一为 `crawler-ready`；`npm run check:jobs-source:runtime-smoke` 新增 invalid postedAt source job 并验证 API 输出被清洗，`npm run check:jobs-source:production-fixture` 新增 invalid/future postedAt live feed 反例，`npm run check:jobs-source:production -- --live` 现在要求真实 feed 的 company/title/postedAt 都不能依赖默认值且 postedAt 必须是有效非未来日期。`npm run check:ui-contracts` 已把 runtime 和 production fixture 证据纳入内容级校验。
- 2026-06-18 media storage live production smoke：`npm run check:media-storage:production` 默认仍是无外呼 shape gate；新增显式 `--live` 模式用于真实 bucket/CDN 签收。Live 模式会用 S3/R2 SigV4 写入一个 tiny `readiness-smoke/` 对象，验证 signed GET、public media base URL GET 字节一致，并用 signed DELETE 清理对象。Fake S3/CDN 正例验证 PUT/GET/public GET/DELETE 全链路，反例验证 public GET 失败时仍执行 DELETE 且剩余对象为 0。当前真实环境仍未配置 R2/S3/CDN，所以 #3 外部项保持待解决。
- 2026-06-18 media storage production fixture：新增 `npm run check:media-storage:production-fixture`，用隔离 env 证明 production gate 接受 R2/S3 HTTPS endpoint、redacted credentials、CDN/public base URL、sane upload envelope 和 safe timeout，拒绝 local storage、HTTP/localhost/placeholder endpoint、缺 public base、raw endpoint public base、placeholder secret、过大 base64 envelope 和超长 timeout。该脚本还启动 fake S3/CDN 跑 `--live` 正例，并模拟 public CDN 502，验证 live smoke 失败时仍发送 signed DELETE 且剩余对象为 0。`npm run check:ui-contracts` 内容级校验 `337-media-storage-production-fixture-summary.json` 和 release-readiness 嵌套结果。
- 2026-06-18 media storage production URL 加硬：发现 production gate 只拒绝 localhost object-storage endpoint / public base URL，仍可能接受 `10.x`、`172.16-31.x`、`192.168.x`、link-local、`.local` 或 IPv6-mapped 私网地址作为真实 S3/R2 endpoint 或 CDN/public base。`scripts/check-media-storage-config.mjs` 现在在 production 模式拒绝 localhost、loopback 和 private-network object endpoint / public media base URL，`npm run check:media-storage:production-fixture` 新增 private object endpoint 与 private public base 反例，`npm run check:external-launch-blockers` 也记录 `privateObjectEndpointRejected` 和 `privatePublicBaseRejected`。
- 2026-06-21 media storage raw-IP URL 加硬：发现 production object endpoint / public media base URL 在拒绝私网后仍可能接受公网裸 IP。`scripts/check-media-storage-config.mjs` 现在要求 production endpoint/public base URL 使用 DNS hostname 而不是 raw IP address，`npm run check:media-storage:production-fixture` 新增 public IP object endpoint 与 public IP public base 反例，`npm run build:media-storage-packet` 和 `npm run check:external-launch-blockers` 也记录 raw-IP URL rejection guidance。
- 2026-06-18 media storage production credential/bucket/prefix 加硬：发现 production gate 仍可能接受 URL 内嵌凭据、带 query/hash 的 public base、短 secret、`change-me-access-key`、非 DNS-safe bucket 或 `../media` 这类危险 object prefix。`scripts/check-media-storage-config.mjs` 现在要求生产 access key/secret 达到最低长度、bucket 为 DNS-safe lowercase、prefix 为安全 object key segments，并拒绝 endpoint/public base 中的 embedded credentials/query/fragment；`npm run check:media-storage:production-fixture` 新增 6 个反例，`npm run check:external-launch-blockers` 也记录这些本地覆盖。
- 2026-06-18 jobs source live production smoke 加硬：`npm run check:jobs-source:production -- --live` 现在不再只要求“至少一条 usable job”，而是要求真实 crawler/vendor feed 同时返回 internship 和 fulltime、job id 唯一、URL 全部为 HTTP(S)，且 company/title/postedAt 不能靠默认值 `Quant Firm`、`Quant Role`、`crawler-ready` 补齐。Fake feed 正例验证 bearer token 和两类岗位通过；反例验证只有 internship 会失败、缺 postedAt 会失败。当前真实环境仍未配置 `QUANTGYM_JOBS_SOURCE_URL`，所以 #4 外部项保持待解决。
- 2026-06-18 jobs source production fixture：新增 `npm run check:jobs-source:production-fixture`，用隔离 env 证明 production gate 接受 HTTPS source URL、token、sane cache/timeout/max-bytes 和完整 fallback catalog，拒绝 missing/HTTP/localhost/placeholder source URL、placeholder token、cache/timeout/max-bytes 越界、fallback catalog 缺 fulltime 和 duplicate id。该脚本还启动 fake feed 跑 `--live`，验证正例 bearer token/user-agent/两类岗位通过，并拒绝 internship-only、duplicate ids、invalid URL、defaulted postedAt、invalid JSON、oversized payload 和 missing token。该轮发现 `check-jobs-source-config.mjs --live` 遇到 oversized payload 会触发 Node unhandled error，已修成结构化 JSON fail。
- 2026-06-18 jobs source production URL 加硬：发现 production gate 只拒绝 localhost source URL，仍可能接受 `10.x`、`172.16-31.x`、`192.168.x`、link-local、`.local` 或 IPv6-mapped 私网地址作为真实 crawler/vendor feed。`scripts/check-jobs-source-config.mjs` 现在在 production 模式拒绝 localhost、loopback 和 private-network source URL，`npm run check:jobs-source:production-fixture` 新增 private source URL 反例，`npm run check:external-launch-blockers` 也记录 `privateSourceUrlRejected`。
- 2026-06-18 jobs source URL/token 加硬：发现 production gate 仍可能接受带 embedded credentials 的 source URL、带 query/hash 的 feed URL、`short-token` 或更广义 `change-me/todo/tbd` source token。`scripts/check-jobs-source-config.mjs` 现在在 production 模式拒绝 source URL username/password/query/fragment，并要求已配置的 `QUANTGYM_JOBS_SOURCE_TOKEN` 至少 24 字符且不是占位文本；`npm run check:jobs-source:production-fixture` 新增 source URL credential/query 与 short token 反例，`npm run check:external-launch-blockers` 也记录这些本地覆盖。
- 2026-06-18 Chrome Collector Board URL hardening：发现扩展 popup 的 Board URL 归一化允许任意 `http://`，可能让用户把捕获题干通过明文 URL 交给非 HTTPS 远程站点。`browser-extension/popup.js` 现在只允许 HTTPS 远程 Board URL，并保留 `localhost` / `127.0.0.1` / `::1` loopback HTTP 用于本地开发；`npm run check:browser-extension:runtime-smoke` 新增 `insecureRemoteBoardUrlRejected` 和 `loopbackHttpBoardUrlAllowed` 断言，隐私页同步披露该策略，`npm run check:chrome-store-readiness` 重新生成并验证上传 zip SHA-256。
- 2026-06-18 Chrome Web Store publication handoff：新增 `npm run check:chrome-store-publication`，在本地验证 store-readiness、上传 ZIP、listing、privacy URL、截图、review notes 和 ZIP SHA-256，用作开发者后台手动提交前的 handoff。新增 `npm run check:chrome-store-publication:published`，要求外部发布完成后提供 Chrome Web Store item id、public listing URL、`published` 状态、提交版本和与当前 ZIP 一致的 SHA-256。`scripts/package-browser-extension.mjs` 改为先写临时 ZIP 再原子替换，避免多个 store/package gate 并行运行时互相删除同一个 release ZIP。
- 2026-06-18 Chrome Web Store publication URL 加硬：发现 Chrome 发布签收中的 HTTPS URL helper 只拒绝 localhost，外部 evidence URL 仍可能指向 `10.x`、`172.16-31.x`、`192.168.x`、link-local、`.local` 或 IPv6-mapped 私网地址。`scripts/check-chrome-store-publication.mjs` 和 `scripts/check-chrome-store-readiness.mjs` 现在拒绝 localhost、loopback 和 private-network URL，`npm run check:chrome-store-publication:fixture` 新增 private evidence URL 反例，`npm run check:external-launch-blockers` 也记录 `privateEvidenceUrlRejected`。
- 2026-06-18 Chrome Web Store published-signoff 加硬：发现最终发布签收仍可能接受 `aaaaaaaa...` 这类明显占位 item id、非 detail 页的 Chrome Web Store URL、或带 embedded credentials / query / hash 的 listing/evidence URL。`scripts/check-chrome-store-publication.mjs` 现在要求 item id 不像占位符、listing URL 必须是 Chrome Web Store detail listing 且包含 item id，并拒绝 listing/evidence URL 中的 username/password/query/fragment；`npm run check:chrome-store-publication:fixture` 新增这些反例，`npm run check:external-launch-blockers` 也记录对应本地覆盖。
- 2026-06-18 Postgres cutover complete signoff URL/host 加硬：发现最终切库签收只拒绝 localhost/loopback，仍可能接受 `10.x`、`172.16-31.x`、`192.168.x`、link-local、`.local` 或 IPv6-mapped 私网地址作为 target host 或 evidence URL。`scripts/check-postgres-cutover.py` 现在拒绝 localhost、loopback 和 private-network target/evidence hosts，`npm run check:postgres-cutover:export-smoke` 新增 private target host 与 private evidence URL 反例，`npm run check:external-launch-blockers` 也记录 `privateTargetHostRejected` 和 `privateEvidenceUrlRejected`。
- 2026-06-18 ops alert production signoff hardening：`npm run check:ops-alerts:production` 现在不再只接受 `QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1`，还要求 `QUANTGYM_EDGE_RATE_LIMIT_PROVIDER`、至少 20 字符的 `QUANTGYM_EDGE_RATE_LIMIT_NOTES` 和非占位 HTTPS `QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL`。输出只暴露 evidence host 与 notes length，避免把 dashboard path 或 webhook token 写入日志。当前真实环境仍因缺少 alert webhook 和 edge signoff 保持未完成。
- 2026-06-18 ops alert webhook token hardening：发现 production gate 对 `QUANTGYM_ALERT_WEBHOOK_TOKEN` 只要求存在且不含少量占位文本，仍可能接受 `short-token` 或 `change-me-alert-webhook-token` 这种弱/占位 bearer secret。`scripts/check-ops-alert-config.mjs` 现在要求生产 webhook token 至少 24 字符并拒绝 placeholder/change-me/todo/tbd 等文本，`npm run check:ops-alerts:production-fixture` 新增 short webhook token 与 placeholder webhook token 反例，`npm run check:external-launch-blockers` 也记录 `shortWebhookTokenRejected` 和 `placeholderWebhookTokenRejected`。
- 2026-06-18 ops alert production URL 加硬：发现 production gate 只拒绝 `localhost/127.0.0.1/::1/0.0.0.0`，仍可能接受 `10.x`、`172.16-31.x`、`192.168.x`、link-local、`.local` 或 IPv6-mapped 私网地址作为真实告警 webhook / edge evidence URL。`scripts/check-ops-alert-config.mjs` 现在在 production 模式拒绝 localhost、loopback 和 private-network webhook/evidence URL，`npm run check:ops-alerts:production-fixture` 新增 private webhook 与 private edge evidence 反例，且定向 production 反例确认 `https://10.42.0.8/quantgym-alerts` 会失败。
- 2026-06-21 ops alert raw-IP URL 加硬：发现 production webhook / edge evidence URL 在拒绝私网后仍可能接受公网裸 IP。`scripts/check-ops-alert-config.mjs` 现在要求 production webhook/evidence URL 使用 DNS hostname 而不是 raw IP address，`npm run check:ops-alerts:production-fixture` 新增 public IP webhook 与 public IP edge evidence 反例，`npm run build:ops-alert-edge-packet` 和 `npm run check:external-launch-blockers` 也记录 raw-IP URL rejection guidance。
- 2026-06-18 ops alert / auth limiter proxy-header hardening：发现 API `client_rate_key()` 会无条件信任 `CF-Connecting-IP`、`X-Real-IP`、`X-Forwarded-For`，使直接客户端可伪造转发 IP 绕过仅按 IP 限制的 Google 登录限流。API 现在默认忽略这些 header；只有设置 `QUANTGYM_TRUST_PROXY_HEADERS=1` 且连接来源位于 `QUANTGYM_TRUSTED_PROXY_CIDRS` 时才采用转发客户端 IP。`npm run check:ops-alerts:runtime-smoke` 新增三次伪造 `X-Forwarded-For` 的 Google 登录尝试，验证状态为 `400,400,429` 且 Google 429 webhook 送达；`npm run check:ops-alerts:production-fixture` 正例要求显式 trusted proxy CIDR，反例拒绝空 CIDR 和 `0.0.0.0/0` wildcard trust，`npm run check:ui-contracts` 内容级校验这些证据。
- 2026-06-18 ops alert production fixture：新增 `npm run check:ops-alerts:production-fixture`，用隔离 env 证明 production gate 接受 hardened HTTPS webhook/token/sane auth limits/edge evidence 正例，拒绝 missing token、localhost、HTTP webhook、禁用 limiter、过高 limiter、缺 edge provider、placeholder evidence、过短 notes 和未确认 edge limiter 等反例；同脚本还用本地 webhook 验证 `--smoke` 会发送 `ops.readiness.smoke` 且 payload 不含 token/credential。`npm run check:ui-contracts` 现在内容级校验 `336-ops-alert-production-fixture-summary.json` 和 release-readiness 嵌套结果。
- 2026-06-17 部署版 LLM/PDF endpoint 签收：`beta.quantgym.app/config.js` 当前指向 `https://api.quantgym.app/api` 和 `https://llm.quantgym.app/interview`。直接调用部署版 LLM endpoint 时会因缺少 QuantGym cloud session 返回 `QuantGym cloud login is required`；使用真实 cloud login 取得的短时 session token 后，`npm run verify:production-boundaries` 对部署 URL 的 cloud health、Google provider config、LLM resume review、LLM PDF question generation 全部通过，只有 Google provider login 因本轮未提供新鲜 `QUANTGYM_GOOGLE_ID_TOKEN` 被跳过。证据见 `333-production-boundaries-deployed-services-summary.json`。
- 2026-06-18 deployed production-boundary verifier 加硬：发现本地 `npm run build` 会把 `config.js`/`dist/config.js` 写成本地 `127.0.0.1` 端点，之后直接跑 `npm run verify:production-boundaries` 容易把“线上边界检查”误打到本地服务。`scripts/verify-production-boundaries.mjs --deployed` 现在直接读取 `https://beta.quantgym.app/config.js` 的线上 API/LLM 端点，并在输出中记录 `scope`、`endpointSource`、`cloudApiEndpoint` 和 `llmEndpoint`；`npm run verify:production-boundaries:deployed:paste-token` 会隐藏读取新鲜 Google ID token，Google provider login 成功后自动把返回的 QuantGym cloud session 用于 deployed LLM resume/PDF 检查，并在 LLM 两项通过后刷新 `333-production-boundaries-deployed-services-summary.json`。`npm run check:ui-contracts` 允许该 deployed 证据保持 4 pass/1 skip 的 Google-token-only partial，或在提供新鲜 token 后升级为 5 pass/0 skip 的完整 pass。
- 2026-06-18 local release-readiness boundary service 管理：发现 `npm run check:release-readiness:local` 在 Production boundaries 阶段会依赖手动启动 `127.0.0.1:8790` API 和 `127.0.0.1:8787` LLM proxy，导致本地总闸门在服务未开时失败。`scripts/check-release-readiness.mjs` 现在只在 `--allow-partial-production` 且 endpoint 是 loopback 时临时启动本地 API/LLM，等待 `/api/health` 与 `/health`，运行 `verify:production-boundaries` 后只关闭自己启动的进程，并在 release summary 记录 service lifecycle。最新 `323-release-readiness-summary.json` 为 28 pass / 1 partial / 0 fail；Production boundaries 为 cloud health、Google provider config、LLM resume review、LLM PDF question generation 4 pass，缺新鲜 `QUANTGYM_GOOGLE_ID_TOKEN` 时 Google provider login 保持 token-only skip。
- 2026-06-17 media storage runtime smoke：新增 `npm run check:media-storage:runtime-smoke`，启动临时 API/SQLite/media root，经真实 `/api/auth/register` 获取 token，上传 1x1 PNG 到 `/api/media`，验证返回 URL 不再内联 data URL、文件落盘、`GET /api/media/:id` 字节一致、`media_objects` 和 `media.upload` audit event 持久化，并检查未登录 401、unsupported type 415、oversize 413。该 gate 发现并修复了后端 4xx JSON 错误响应在未读取 POST body 时仍保持 keep-alive，导致下一次请求被前一个 body 污染并变成 501 的问题；现在 4xx/5xx JSON 响应会发送 `Connection: close`。
- 2026-06-17 jobs source runtime smoke：新增 `npm run check:jobs-source:runtime-smoke`，启动临时 jobs feed 和临时 API，验证 API 会向 feed 发送 bearer token、支持嵌套 JSON feed、把 source 岗位合并到本地 catalog 前面、重复 id 以 source 数据为准、缓存避免二次拉取、POST type filter 仍工作，并在 feed 500 时返回 `source: "catalog-fallback"` 和本地 catalog。
- 2026-06-17 Postgres cutover export smoke：新增 `npm run check:postgres-cutover:export-smoke`，启动临时 API/SQLite，生成验证码、用户、session、state、community、problem、media 和 audit fixture，验证默认 SQLite export 会脱敏 auth/session/code hash、JSON payload（含 `tags_json`）、problem text、audit PII 和 media storage path；同时生成 `--include-sensitive` full export 并证明只有它能通过 `scripts/check-postgres-cutover.py --require-sensitive-export`。该 gate 发现并补齐了 `scripts/export-api-sqlite.py` 对 `tags_json` 的默认脱敏。
- 2026-06-18 Postgres cutover export smoke 加硬：发现 `scripts/export-api-sqlite.py --include-sensitive --max-rows-per-table` 会生成带 `truncated: true` 的抽样导出，如果被误用作正式迁移输入会丢数据。`scripts/check-postgres-cutover.py --require-sensitive-export` 现在要求 migration export 同时是 include-sensitive、非 summary-only、非 row-limited、无截断、rowCount/exportedRows/rows 长度一致；runtime smoke 新增截断 include-sensitive fixture，证明完整导出被接受、redacted 导出被拒、截断导出也被拒。
- 2026-06-18 Postgres cutover complete signoff：新增 `npm run check:postgres-cutover:complete`，在真实 SQLite -> managed Postgres 迁移完成后要求 `QUANTGYM_POSTGRES_CUTOVER_STATUS=complete`、目标 host/database、完成时间、HTTPS evidence URL、源 SQLite DB SHA-256、迁移 export SHA-256、目标行数、app 已指向 Postgres 和备份确认。`npm run check:postgres-cutover:export-smoke` 现在用临时 API/SQLite 正例跑过该 signoff shape，并新增反例覆盖 pending status、localhost/private/raw-IP target、database DSN、future timestamp、placeholder/private evidence URL、source/export SHA mismatch、target row count mismatch、inactive app DB 和 missing backup confirmation；`npm run check:ui-contracts` 也会内容级校验 signoff hash 前缀、row count、evidence host 和这些反例。
- 2026-06-18 Postgres cutover signoff 字段加硬：发现 final signoff 仍可能接受带空格/控制字符的 target host、含空格或分号的 database name、以及带 embedded credentials 或 query/hash 的 evidence URL。`scripts/check-postgres-cutover.py` 现在要求 target host 是 plain managed Postgres DNS hostname、database 是 plain non-placeholder identifier，并拒绝 raw IP target hosts 和 evidence URL username/password/query/fragment；`npm run check:postgres-cutover:export-smoke` 新增 public IP target、target host whitespace、unsafe database、evidence credential/query 反例，`npm run check:external-launch-blockers` 也记录这些本地覆盖。
- 2026-06-17 ops alert runtime smoke：新增 `npm run check:ops-alerts:runtime-smoke`，启动临时本地 webhook 和临时 API DB，真实触发 API 404，验证 webhook 收到 `http.error.404` 告警、Bearer token 正确、payload 不包含请求 body、Authorization、credential、password、token、synced state、community 或 problem payload。
- 2026-06-18 ops alert runtime smoke 加硬：runtime smoke 现在会等待并校验 4 条真实 webhook：404、两次 auth 401、一次 auth 429 rate-limit。该轮发现 `/api/auth/login` webhook message 会包含泛化但带敏感词的 `Invalid email or password`，已在 API 的外部 alert payload 上对 `/api/auth/*` message 做脱敏泛化，保留 audit DB 内部事件但不把 auth 失败细节发送到外部告警接收器。新增 `334-ops-alert-runtime-smoke-summary.json`，`npm run check:ui-contracts` 现在同时要求独立 ops alert 证据和 release-readiness 嵌套 ops alert 证据都满足 4 条告警、Bearer token、状态序列 `404,401,401,429`、auth limiter 和全量 payload 脱敏。
- 2026-06-08 Google ID token handoff：新增 `npm run google:token-helper`，会把本地 helper 写到被 Git 忽略的 `artifacts/google-id-token-helper.html`，并通过 `http://127.0.0.1:5179/artifacts/google-id-token-helper.html` 使用当前 Google Client ID 获取短时 ID token。helper 不把 token 写入磁盘；复制 token 后运行 `QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries` 即可补齐真实 Google provider login 边界。`verify-production-boundaries` 现在会先本地解码 JWT，检查 token 结构、issuer、过期时间和 audience 是否匹配当前 Google Client ID，再调用 provider login endpoint。证据见 `324-google-token-helper-summary.json`。
- 2026-06-08 Google token helper 真实浏览器 smoke：Google Chrome headless 已打开 `http://127.0.0.1:5179/artifacts/google-id-token-helper.html`，截图确认 helper 标题、Google 登录按钮、token textarea、copy 按钮和 `Ready.` 状态可见。该证据证明 helper UI 可渲染，但不替代真实账号登录；最终 provider login 仍需复制短时 ID token 后运行 production-boundary gate。证据见 `325-google-token-helper-browser.png` 和 `325-google-token-helper-browser-summary.json`。
- 本轮已补充真实 in-app browser、独立 Google Chrome/CDP 截图/点击验收，截图保存在 `docs/browser-audit-screenshots/`。截至 2026-06-08，所有 21 个 manifest route 已完成桌面 `1440x900` 与移动端 `390x844` 视觉冒烟：目标 selector 可见、无 Vite overlay、无 document-level 横向溢出、significant console log 为 0。汇总见 `311-chrome-visual-desktop-contact-sheet.jpg`、`312-chrome-visual-mobile-contact-sheet.jpg`、`312-chrome-visual-route-smoke-summary.json`。
- 追加 GitHub 基准对照：临时启动 `origin/main@b2107214d0cdfb43170f8cc02cb35c61896b877b` 于 `http://127.0.0.1:5180/`，用独立 Google Chrome 对全部 21 个 route 生成 baseline/current side-by-side 截图和 active-route scoped DOM 指标。后处理只保留真正 actionable 项：当前 key selector 缺失/不可见、Vite overlay、document-level 横向溢出、pageerror、相对 substantial baseline 的真实内容过稀。结果 `21/21 pass`，actionable issues 为 0；证据见 `314-github-parity-baseline-current-contact-sheet.jpg` 和 `314-github-visual-parity-all-routes-summary.json`。
- 追加复验已实际调用 in-app browser：打开当前 `http://127.0.0.1:5179/`、截图 Overview、点击 `打开题库`、点击 `Medium 1438`，截图见 `18-live-current-browser-state.png`、`19-live-click-open-problems.png`、`20-live-click-medium-filter.png`。
- 追加修复后复验：`21-live-overview-caret-fixed.png` 确认 Overview hero 标题末尾 caret 已消失；`22-live-login-redirect-fixed.png` 确认已登录访问 `/login` 会回到 `/` 并显示 Overview。
- 追加 Overview 修复后复验：React Overview 已恢复 GitHub 上线版 37 个关键 id，`Problem completion`、`Experience rhythm`、`Contribution heatmap` 不再空白；真实 in-app browser 验证 4 行进度、7 根 XP 柱、84 个热力格、无 document-level 横向溢出。截图见 `123-live-overview-restored-in-app.png`、`124-live-overview-restored-fullpage-in-app.png`。
- 追加 Overview 深测 2：真实 in-app browser 发现排行榜 `#leaderboardMetricSelect` 为空、榜单行为空，且刷新后 shell/todo bootstrap 抛 `TypeError: buildTodayStudyPlan is not a function`，会导致 route 内容短暂/持续空白。已修复：`initOverviewSlice` 将 leaderboard controller exports 传回 React page API，`initDomainSlice` 将 Overview activity/plan 函数传回 shared context 并写入 `sliceRefs`，`initShellSlice` 通过 `sliceRefs` 延迟读取 plan 函数，避免初始化顺序捕获 `undefined`。复验读数：4 行 progress、7 根 XP、84 个 heatmap cell、16 个 metric options、2 行 leaderboard、todo dock 存在且最新 error log 为空。截图见 `157-live-overview-deep-initial.png`、`161-live-overview-bootstrap-leaderboard-fixed.png`。
- 追加 Overview 新闻入口审查：真实点击 ticker 曾只跳到 `/news` 列表而不打开详情，根因是 React Overview ticker 点击没有稳定写入 pending focus，且 legacy ticker bridge 仍存在旧参数形状。已在 React `focusNews`、legacy `renderNewsTicker`、`newsFacade/provider` bridge 和 News hook 中补齐 pending focus 与延迟事件消费。2026-06-07 in-app Browser 真实点击已通过：从 Overview 可见 ticker 点击进入 `/news` 并打开 `#newsDetail`，截图 `164-live-overview-news-ticker-detail-fixed.png`。
- 追加 Todo dock 深测：真实 in-app browser 曾发现 dock button 可见但点击无响应。根因有两层：`TodoShell` 仍依赖旧 bootstrap 的 DOM 绑定时机，且 `initShellSlice` 没把 `planningActivityBundle` 的 `toggleTodoDock/closeTodoDock/handleTodoDockClick/handleTodoDockEdit/addTodoTask` 返回给最终 `services`。已改为 `TodoShell` mount 后注册原生事件监听，并补齐 shell slice exports。复验通过：真实点击打开 dock、添加 `QA Todo Dock 20260607`、完成该任务、关闭 dock；截图见 `165-live-todo-dock-open-fixed.png`、`166-live-todo-dock-add-complete-fixed.png`、`167-live-todo-dock-close-fixed.png`。
- 追加 Overview 排行榜筛选复验：真实 in-app browser 点击/键盘操作已验证 metric 从 `overall` 切到 `leetcode` 后摘要变为 `LeetCode · 全部用户...`；scope 从 `global` 切到 `country` 后国家筛选显示、地区筛选隐藏、摘要变为 `LeetCode · 中国...`，截图见 `168-live-overview-leaderboard-selects-country-fixed.png`。随后用真实 Chrome/Playwright 临时账号补齐 region scope：seed 上海/北京/California 本地榜单数据后，切到 `region` 会显示并启用国家/地区控件，上海 2 行、北京 1 行、美国 California 1 行，reload 后 `metric=leetcode/scope=region/country=unitedStates/region=California` 持久化。截图和状态 JSON 见 `259-cdp-overview-leaderboard-initial-seeded.png` 到 `264-cdp-overview-leaderboard-region-reload-persisted.png`、`264-cdp-overview-leaderboard-region-summary.json`。
- 追加 Problems 深测：真实 in-app browser 验证题卡详情、Hint/Answer reveal、完成/收藏状态在详情和列表间保持、分页下一页、LeetCode Hot 100 展开 100 题、Hot 完成状态切换和撤回均可用；期间修复 `mergeProblemStates` 调用签名、Hot 100 静态 JSON fallback、Hot 展开状态 React 化、Hot doneIds 归一化缺少题单参数、Hot 完成切换误调用 legacy DOM renderer 等问题。截图见 `129-live-problems-detail-reveal-toggle-fixed.png`、`132-live-problems-hot100-expanded-fixed.png`、`139-live-problems-hot100-toggle-react-fixed.png`、`140-live-problems-hot100-toggle-restored-react-fixed.png`。
- 追加 Skills / 全局搜索深测：真实 in-app browser 验证 Skills 雷达点击后 legend/card/tooltip 联动；全局搜索输入 `principal logarithm` 后点击 `能力值 Complex Numbers`，搜索面板关闭、输入框清空、目标技能卡 spotlight 滚动可见，且无 Vite overlay。截图见 `144-live-skills-radar-hover-react-owned-fixed.png`、`145-live-skills-global-search-skill-spotlight-fixed.png`。
- 追加 Jobs/Courses 全局搜索深测：真实 in-app browser 输入 `internship` 后点击 Jane Street internship 岗位结果，进入 `/jobs` 并滚动到 `job-jane-street-quant-intern`；输入 `StatQuest` 后点击课程结果，进入 `/courses` 并滚动到 `course-statquest-ml-stats`，两者均搜索清空、结果面板关闭、无 Vite overlay。截图见 `147-live-global-search-job-spotlight-fixed.png`、`146-live-global-search-course-spotlight-fixed.png`。
- 追加高风险模块复验：`Tools` 的 Mental Math 开始/答题/Skip/Market Quote/Poker launcher 已真实点击；题量/时间 select 已真实改为 `10` 和 `5:00` 并启动为 `Question 1/10`、5 分钟 session；`Poker` 的桌面、Fill demo、Start hand、quick bet 已真实点击。截图见 `28-live-tools-start-fixed.png` 到 `36-live-poker-quick-bet-fixed.png`、`125-live-tools-count-time-select-fixed.png`。
- 追加 Settings 复验：真实 in-app browser 确认导出/导入控件唯一存在，点击 `导出备份` 后页面无 Vite overlay、控件仍可用；随后真实 Chrome/CDP 使用临时账号补验完整 export/import：`导出备份` 下载 `quantgym-QA Settings-2026-06-08.json`，payload `version=2`、user/state 存在；通过真实 file input 导入 JSON 后跳到 `/memory`，`QA IMPORT BACKUP RESOURCE` 资源卡可见。期间修复 Runtime slice 初始化顺序导致 `clearProblemLookupCaches is not a function` 的导入失败，以及 React Settings 直接传 SyntheticEvent 给异步导入造成的 file input 竞态。截图和状态 JSON 见 `201-cdp-settings-export-import-before.png`、`202-cdp-settings-export-downloaded.png`、`203-cdp-settings-import-memory-visible.png`、`203-cdp-settings-export-import-summary.json`。
- 追加 Settings 深测 2：真实 Chrome/Playwright 临时账号验证危险操作和会话操作：seed 当前账号 entries/resources/problemStates/interviewExperiences/manual news、另一个 peer 账号资源作哨兵；点击 `resetBtn` 并接受 confirm 后当前账号训练记录清空、Memory 不再显示 `QA SETTINGS RESET RESOURCE`、peer 账号资源仍保留；点击 `logoutBtn` 后进入 `/login`，`#authShell/#loginForm` 可见，`auth.currentUserId` 为空。截图和状态 JSON 见 `265-cdp-settings-reset-before.png` 到 `268-cdp-settings-logout-auth-visible.png`、`268-cdp-settings-reset-logout-summary.json`。
- 追加 Interview 深测：真实浏览器确认语言/模式切换原本失效，已修复为 React controlled active/aria 状态；启动后 English + Live 不回退，onboarding action chips 可显示并可推进到后续 step。截图见 `38-live-interview-toggle-before-fix.png`、`45-live-interview-toggle-fixed-final.png`、`46-live-interview-start-live-english.png`、`47-live-interview-actions-fixed.png`、`53-live-interview-latest-actions-visible.png`。
- 追加 Interview 深测 2：真实 Chrome/CDP 点击验证 Live 模式进入 Q1 后 Hint/Reference 隐藏，原生 confirm 自动接受后 exit 会回到 setup 且显示 `继续上次面试`，resume 后回到同一轮 Q1/3。修复点包括 typewriter 不再覆盖 action tray、`reset/finalize/show/restart` session flow alias 回传 React page API。截图和状态 JSON 见 `181-cdp-live-ready-after-typing.png`、`182-cdp-live-exited-resume-visible.png`、`183-cdp-live-resumed-q1.png`、`183-cdp-live-exit-resume-summary.json`。
- 追加 Interview Practice 深测：真实 Chrome/CDP 点击完成 English + Practice onboarding、Q1/3、Hint、Reveal、输入答案、Submit、Save favorite。期间修复 `submitAnswer` hook 没有 return 异步 `api.submitAnswer()` 导致完成动作不稳定刷新，以及 `saveFavorite` 只写 problem state、收藏夹在部分抽题对象下为空的问题；当前复验 `completeActions=true`、`saveDisabled=false`、`interviewFavoritesSummary=1 条复盘`。截图和状态 JSON 见 `190-cdp-practice-q1-ready-after-submit-hook-fix.png` 到 `194-cdp-practice-favorite-saved.png`、`194-cdp-practice-full-flow-summary.json`。
- 追加 Interview 附件/语音/导出深测：真实 Chrome/CDP 点击语音按钮后页面稳定不冻结，真实文件 input 上传 `qa-interview-note.txt` 并提交答案后 transcript 包含 `[Attachment: qa-interview-note.txt]`，连续完成 3 题后 `重新开始` 与 `导出 PDF` 可见，点击导出会打开 `QuantGym Mock Interview Report` 报告窗口。截图和状态 JSON 见 `195-cdp-interview-voice-unsupported.png`、`196-cdp-interview-answer-file-submit.png`、`197-cdp-interview-completed-export-visible.png`、`198-cdp-interview-report-window.png`、`198-cdp-interview-attachment-voice-export-summary.json`。
- 追加 Interview PDF source 深测：真实 Chrome/CDP 展开高级设置，选择 PDF source，上传临时真实 PDF 文件，并在 file input 触发 React re-render 后重新写入 mock LLM endpoint；本地 mock endpoint 收到 `task=generate_pdf_questions`、`fileName=quantgym-pdf-fixture.pdf`、`count=3`，随后进入 `Q1/3` 且题面为 `PDF Fixture Question 1`。截图和状态 JSON 见 `199-cdp-interview-pdf-source-upload.png`、`200-cdp-interview-pdf-generated-q1.png`、`200-cdp-interview-pdf-source-summary.json`。
- 追加 Browser 工具状态：已按 Browser 插件调用 in-app browser 并设为可见，能读到当前 tab 为 `http://127.0.0.1:5179/interview?qa=interview-deep-flow`；但当前 in-app browser 的截图、DOM、坐标点击链路会在底层命令超时，不能作为稳定验收通道。本轮使用独立真实 Chrome/CDP 兜底补证；登录页真实点击 `注册` 已保存 `188-cdp-login-before-click.png`、`189-cdp-login-register-click.png`，追加复查用稳定 CDP target 流程保存 `216-cdp-login-before-real-register-click.png`、`217-cdp-login-after-real-register-click.png` 和 `217-iab-call-and-real-browser-click-screenshot-summary.json`。
- 追加 Library 深测：真实 in-app browser 已连接并设为可见；`/library` 搜索和题单筛选可用，QuantGuide 练题入口曾停在 `/library`，已修复为进入 `/problems` 并过滤到 `题源：QuantGuide 题库`。追加点击 `green-book` 阅读后，非云端 QA 账号显示正确 PDF 权限提示且无 Vite overlay；模块级模拟云端 token 验证 reader open/close 状态正确。截图见 `65-live-browser-tool-smoke.png`、`66-live-library-search-question-filter.png`、`68-debug-library-practice-still-stuck.png`、`67-live-library-practice-fixed.png`、`127-live-library-pdf-reader-auth-guard.png`。
- 追加 Library 云端 reader 深测：启动本地真实 `api-server`，用临时云端账号获取 session token，React Library 点击 `green-book` 阅读后真实调用 `/api/library/reader-token/green-book` 返回 200，PDF endpoint 返回 206/200 `application/pdf`，iframe 渲染绿皮书封面，`新窗口` href 指向带 token 的 PDF，关闭 reader 会恢复 `about:blank`，reload 后 Library 稳定无 Vite overlay。Chrome PDF viewer 自身会抛 `Cannot read properties of null (reading 'setItem')`，已作为 iframe viewer 噪声记录在 ignored errors。截图和状态 JSON 见 `275-cdp-library-cloud-reader-initial.png` 到 `278-cdp-library-cloud-reader-reload.png`、`278-cdp-library-cloud-reader-summary.json`。
- 追加 News 深测：真实浏览器确认 `/news` 曾因为 React hooks 读取 `userStateStore` 外层对象而显示 0 条新闻；已修复为读取 `state.value`，4 条 GitHub 上线版 seed 新闻恢复。旧版 News 关键 id 已补回 React JSX，主题/来源筛选、详情/返回、表单展开、刷新按钮均已点击验收。截图见 `69-live-news-initial-contract-fixed.png` 到 `76-live-news-refresh-click-fixed.png`。
- 追加 News 深测 2：真实 Chrome/Playwright 临时账号确认手动新闻表单真实输入和提交通过：保存后表单关闭、列表新增 `QA News Manual Submit 20260608`、localStorage `news` 从 4 条变 5 条、详情页标题/摘要/insight/link 正确，返回并 reload 后记录仍持久化。截图和状态 JSON 见 `254-cdp-news-before-form-submit.png` 到 `258-cdp-news-submit-reload-persisted.png`、`258-cdp-news-form-submit-summary.json`。
- 追加 Experiences 深测：真实浏览器确认 `/experiences` 已恢复 GitHub 上线版 20 个关键 id、页面标题/说明文案、完整轮次/结果枚举、侧栏统计和“查看社群面经”入口。社群入口真实点击进入 `/community`。截图见 `79-live-experiences-contract-fixed.png`、`80-live-experiences-community-link-fixed.png`。
- 追加 Experiences 深测 2：真实 Chrome/Playwright 临时账号确认新增记录、编辑记录、轮次筛选、分享至社区、`sharedPostId` 写回、返回 Experiences 后 `已分享` badge/统计同步、删除未分享记录、reload 后私有记录和社区面经动态持久化全部通过。期间修复旧分享 controller wiring：应用层现在传入 `setExperienceRecords`，并通过 `userStateRuntime.setValue` 走不可变 React user-state 写回。截图和状态 JSON 见 `247-cdp-experiences-initial.png` 到 `253-cdp-experiences-reload-persistence.png`、`253-cdp-experiences-crud-share-summary.json`。
- 追加 Community 深测：真实浏览器确认 `/community` 已恢复 GitHub 上线版 6 个关键 id，页面标题为 `社区`，`publish/communityFilterAll/communityFilterExperience` 等 raw key 已消失，点击 `面经分享` 后 active/aria-selected 状态正确。截图见 `81-live-community-contract-fixed.png`、`82-live-community-experience-filter-fixed.png`。
- 追加 Messages 深测：真实浏览器确认 `/messages` 已恢复 GitHub 上线版 7 个关键 id，空态下 thread list / conversation header / conversation body / composer form 均存在，composer 正确隐藏和禁用，`messagePlaceholder` 等 raw key 未出现。截图见 `83-live-messages-contract-fixed.png`。
- 追加 Community 深测 2：真实 Chrome/Playwright 临时账号 seed 一条远端动态，确认媒体上传预览、移除媒体、带图片发帖、点赞远端动态、评论远端动态、删除自己的动态、reload 后点赞/评论持久化且删除不回流全部通过。截图和状态 JSON 见 `240-cdp-community-initial-seeded.png` 到 `246-cdp-community-reload-persisted.png`、`246-cdp-community-post-media-like-comment-delete-summary.json`。
- 追加 Messages 深测 2：真实 Chrome/Playwright 临时账号 seed 两条私信线程和一条社群动态，确认 `/messages` 初始 unread badge 为 2，点击 Bob thread 后该 thread 标记已读且全局 badge 变 1，发送消息后 UI/localStorage 同步并 reload 持久化；从 `/community` 点击 Alice 的 `私信` 会创建/选中 thread 并进入 `/messages`。期间修复 Messages 首次进入不刷新全局未读徽标、Messages 写 community 不同步 React store、Community 私信入口仍依赖旧 `switchModule/renderMessages` 的迁移残留。截图和状态 JSON 见 `234-cdp-messages-initial-seeded.png` 到 `239-cdp-messages-after-community-private.png`、`239-cdp-messages-thread-send-unread-summary.json`。
- 追加 Network 深测：真实浏览器确认 `/network` 已恢复 GitHub 上线版 11 个关键 id，空态与表单 placeholder 无 raw key，表单初始隐藏，点击添加按钮后表单展开且默认状态为 `To reach out`；追加创建 `QA NET` 临时联系人，编辑备注为 `CRUD TEST EDIT` 并 reload 验证持久化，随后删除并 reload 确认空态恢复。截图见 `84-live-network-contract-fixed.png`、`85-live-network-add-form-fixed.png`、`149-live-network-crud-edit-persisted.png`、`150-live-network-crud-delete-persisted.png`。
- 追加 Resume 深测：真实浏览器确认 `/resume` 已恢复 GitHub 上线版 6 个关键 id，页面标题/说明/textarea placeholder/按钮文案/review 空态无 raw key；追加输入 QA smoke 简历文本后点击 `保存简历`，reload 稳定后文本持久化；点击 `LLM 修改简历` 后在无 endpoint 情况下走本地 fallback，生成 3 条修改建议，reload 后文本和 review 均恢复。截图见 `86-live-resume-contract-fixed.png`、`148-live-resume-save-review-fixed.png`。
- 追加 Memory 深测：真实浏览器确认 `/memory` 已恢复 GitHub 上线版 10 个关键 id，资料表单初始隐藏，点击添加后展开并自动聚焦标题；文件 input、资料类型、内容/来源 placeholder 均对齐旧版且无 raw key。随后用真实键盘输入 `QA MEM` / `MEMORY NOTE SAVE RELOAD`，点击保存后资源卡出现，reload 稳定后仍保留。追加 Chrome/CDP 使用临时本地账号补验 `.tex` 文件读取、小图片 dataURL 保存、大图片文件名 fallback、3 条资源 reload 持久化，以及 `clearTodayBtn` 删除最新训练记录后 UI 和 localStorage 都只剩 1 条历史；期间修复 Memory 页把 undo 直接透传旧 DOM controller、没有走不可变 React user-state patch 的迁移残留。截图和状态 JSON 见 `91-live-memory-contract-fixed.png`、`92-live-memory-add-form-fixed.png`、`151-live-memory-resource-save-persisted.png`、`225-cdp-memory-initial-seeded.png` 到 `230-cdp-memory-undo-latest-entry.png`、`230-cdp-memory-file-upload-undo-summary.json`。
- 追加 Account 深测：真实浏览器确认 `/account` 已恢复 GitHub 上线版 17 个关键 id，头像/昵称/邮箱/国家/地区/毕业时间/简历/当前密码/账户 meta 均无 raw key；国家切换到美国后地区选项联动为 51 项。追加 Chrome/CDP 使用临时本地账号完整补验保存、头像真实 file input 上传、简历真实 file input 上传、国家/地区/毕业时间保存、reload 持久化、清除头像后保存、无当前密码改邮箱拦截、正确当前密码改邮箱、再次 reload 和退出登录回 AuthShell，全部断言通过。截图和状态 JSON 见 `93-live-account-contract-fixed.png`、`94-live-account-country-region-fixed.png`、`218-cdp-account-before-edit.png` 到 `224-cdp-account-logout-auth-visible.png`、`224-cdp-account-full-flow-summary.json`。
- 追加 Plan 深测：真实浏览器确认 `/plan` 已恢复 GitHub 上线版 5 个关键 id，setup form 常驻 DOM，dashboard/edit 按钮隐藏状态正确；目标方向和每周投入 select 可真实切换。随后创建 QA 计划、完成空 baseline submit 校验、提交 8 题 baseline、编辑目标为 `Quant Developer / 12 小时`、勾选任务并 reload 验证 `1/5` 持久化；修复 Plan 任务 `开始` 在 React route 下仍依赖旧 `problemSearch/renderProblems` 的问题，改为设置 Problems theme filter，最终点击 LeetCode 任务进入 `/problems` 并显示 active theme `leetcode`、`LeetCode · 156 题`。截图见 `95-live-plan-contract-fixed.png`、`96-live-plan-selects-fixed.png`、`153-live-plan-create-edit-diagnostic-todo-persisted.png`、`154-live-plan-todo-open-problems-theme-fixed.png`。
- 追加 Companies 深测：真实浏览器确认 `/companies` 已恢复 GitHub 上线版 4 个关键 id，13 张公司卡、13 个刷题按钮、13 个官网按钮均存在；点击 `Tier S` 后收窄为 5 家 Tier S 公司；点击 Jane Street 的 `刷该公司题` 后进入 `/problems`，active company 为 `jane-street`，题库过滤为 133 题。2026-06-07 追加复验确认当前点击仍成功，console 中 `renderProblems is not a function` 为旧时间戳历史日志，未新增错误。截图见 `97-live-companies-contract-fixed.png` 到 `99-live-companies-practice-entry-fixed.png`、`128-live-companies-practice-current-reverify.png`。
- 追加 Jobs 深测：真实浏览器确认 `/jobs` 已恢复 GitHub 上线版 3 个关键 id，6 条岗位卡、岗位类型筛选和刷新按钮均存在；点击 `Internship` 后收窄为 3 条 internship 岗位；刷新按钮真实点击后无 runtime error / Vite overlay，当前筛选状态保留。截图见 `100-live-jobs-contract-fixed.png` 到 `102-live-jobs-refresh-click-fixed.png`。
- 追加 Courses 深测：真实浏览器确认 `/courses` 已恢复 GitHub 上线版 5 个关键 id，8 张课程卡、学习路径、source buttons、notes 和外部链接均存在；点击 `加入路径` 后路径出现 1 条并卡片 active；切换 StatQuest 备用来源后 active source 更新且 player/fallback 存在；随后已移出路径恢复空态。截图见 `103-live-courses-contract-fixed.png` 到 `105-live-courses-source-switch-fixed.png`。
- 追加 PK 深测：真实浏览器确认 `/pk` 已恢复 GitHub 上线版 9 个关键 id；点击 `匹配在线 Quant` 后生成对手、题目和 feed；填写答案并提交后比分、XP feed 和清空答案均正确；点击 reveal 后显示参考答案，无 runtime error / Vite overlay。截图见 `106-live-pk-contract-fixed.png` 到 `109-live-pk-reveal-fixed.png`。
- 追加 Poker 合同/深测：React Poker 保持最新 view-model 结构，同时补回 GitHub 上线版 35 个关键 id 与 `data-poker-*` 自动化属性；真实浏览器确认旧 id 缺失 0，空座 `SIT` 可点击并让 `1/10` 变为 `2/10`，settings tab 可保存 small blind / big blind / starting stack / max players，盲注从 `10 / 20` 变为 `15 / 30`、座位数从 `2/10` 变为 `2/9`，随后已恢复默认设置。截图见 `114-live-poker-contract-ids-fixed.png` 到 `116-live-poker-settings-save-fixed.png`。
- 追加 Poker online fallback 深测：真实 Chrome/Playwright 临时账号写入有效本地 auth + 失效 cloud endpoint/token，确认 URL join 和点击 `New` 两条线上路径都观察到云端请求失败后降级为 Local，本地 Demo/Fill/Start/action 可继续使用，地址栏归一到 `?pokerRoom=QG-MAIN`，reload 后仍稳定无 Vite overlay。期间修复 React-owned Poker table 下旧 controller 异步 `renderGame()` 只刷新 icon、不触发 React re-render 的问题，并在云端失败时替换回本地单桌 URL。截图和状态 JSON 见 `269-cdp-poker-online-fallback-initial.png` 到 `274-cdp-poker-online-fallback-reload-persisted.png`、`274-cdp-poker-online-fallback-summary.json`。

## 2. 总结判断

迁移结构已经完成，但 release readiness 没有完成。

当前最大问题不是“有没有迁到 React”，而是 React 页面没有完整继承 GitHub 上线版的 UI 结构、CSS scope 和旧功能钩子。现在处于一种混合状态：

- 路由和页面 ownership 已全部进入 React。
- Shell、全局搜索、语言、部分统计、部分页面行为仍通过旧 bootstrap/controller 体系绑定 DOM id。
- 旧版 `styles.css` 中大量规则仍然绑定 `[data-module-view="<page>"]`、旧 DOM 层级或旧 id；React route 现在挂在 `.module-view[data-module-view="route"] > .app-route-root > <Page>` 下。
- 部分页面已经改成 React controlled UI，但没有为旧控制器残留依赖做“删除依赖 / 保留 id / React 替代逻辑”的逐项裁决。

因此，脚本层面通过不代表 UI/功能等价。后续修复应保持最新 React 结构，不回退到旧的大 HTML/CSS 文件，但必须按页面恢复旧版上线体验和功能契约。

真实浏览器本轮结论：

- `/problems` 桌面：Overview 的“打开题库”按钮真实点击后进入 `/problems`，渲染 24 张题卡。
- `/problems` 桌面：输入 `probability` 后题卡变为概率相关题，搜索有效。
- `/problems` 桌面：点击 `Medium` 后列表变为 Medium 概率题，并显示 `第 1 / 31 页 · 共 741 题`，筛选有效。
- 全局搜索：输入 `Jane Street` 后出现 14 条结果；点击第一条公司结果后进入 `/companies`，active tab 为 `companies`。
- 移动端 Overview：`390x844` 下无 document-level 横向溢出。
- 移动端 Problems：`390x844` 下无 document-level 横向溢出，滚动到题卡区域后确认 DOM 中有 24 张题卡。
- 已修复：已登录状态访问 `/login` 时 URL 会重定向到 `/`，AppShell/Overview 可见，隐藏 auth shell 为 `display: none`。
- 发现：搜索 `probability` 后难度 chip 数字仍显示全库计数，例如 `Medium 1438`；点击后列表确实变为筛选结果。是否要让 chip 数字随搜索 query 缩小，需要产品确认。
- 追加复验：in-app browser 真实点击 Overview 的 `打开题库` 后 URL 为 `/problems`，题卡 DOM 数量为 24。
- 追加复验：in-app browser 再次点击 `Problem completion` 的 `打开题库` 后 URL 为 `/problems`，active nav 为 `题目`；React route lazy render 完成后题卡 DOM 数量为 24。截图见 `163-live-overview-problem-progress-click.png`。
- 已修复：Overview 刷新时 `buildTodayStudyPlan is not a function` 会打断 shell/todo bootstrap，导致 route 内容读取为空。原因是 `initShellSlice` 早于 `initDomainSlice` 初始化，却直接闭包捕获了尚未生成的 `buildTodayStudyPlan/renderTodayPlan`；现改为通过 `sliceRefs` 延迟读取，并让 `initDomainSlice` 返回/登记 Overview activity 函数。
- 已修复：Overview 排行榜指标 select 为空、榜单为空。原因是 `initOverviewSlice` 创建了 leaderboard controller，却没有把 `getLeaderboardMetricOptions/getLeaderboardRowsForSettings/keepCurrentLeaderboardRow/computeLeaderboardRankChanges` 等 exports 返回给 React page API；现已补回，真实 DOM 读数为 16 个指标 options、2 行 leaderboard。
- 已补验：Overview news ticker 从真实浏览器点击可见 ticker item 后进入 `/news` 并打开 `#newsDetail`；跑马灯点击瞬间可能命中相邻 item，但同一路径已验证 focus detail 成功。
- 追加复验：in-app browser 真实点击 `Medium 1438` 后 `aria-pressed="true"` 落在 Medium，题卡 DOM 数量仍为当前页 24，无 document-level 横向溢出。
- 已修复：Overview hero 标题末尾蓝色光标/插入符残留来自旧 typewriter `h2::after` 样式；React route 覆盖层已关闭该伪元素，浏览器复验 `content: none`、`display: none`、右边框 `0px`。
- 追加说明：本次工具层面的 `locator.fill()` 触发 in-app browser 虚拟剪贴板限制，因此本轮没有重跑搜索输入；搜索有效性仍以前序 `03-problems-search-probability.png`、`04-problems-search-medium-filter.png` 为证据。
- 已修复：`/tools` Mental Math 真实点击“开始”曾无响应。根因是 `toolsPageApi` 内部方法调用了未定义的闭包 `getViewModel()`，点击时抛 `ReferenceError`；现已提取闭包函数，并让 React hook 以本地 view state 驱动刷新。复验显示开始后 5 个选项 enabled、计时器推进、答题后进到下一题、Skip 可推进、Market Quote 可得分。
- 已修复：`/tools` 的旧版 DOM contract 缺失。React 组件已恢复 `drillScore/drillAccuracy/drillTimer/drillCountSelect/drillTimeSelect/startDrillSessionBtn/drillProgressText/drillTimeLeftText/drillProgressFill/drillQuestion/drillForm/drillOptions/drillInput/skipDrillBtn/nextDrillBtn/drillFeedback/mentalBestScore/mentalSparkline/mentalRecordList/mentalLeaderboardList/marketGameScore/marketGamePrompt/marketBidInput/marketAskInput/submitMarketQuoteBtn/nextMarketGameBtn/marketGameFeedback`，并补回 `data-drill` 与 Poker launcher 的 `data-jump-module="poker"`。
- 已修复：`/poker` 从 Tools launcher 进入时曾只显示右侧 lobby 和 `No room data.`，桌面不渲染。根因是 Poker hook 在 `api.mount()` 创建 game 后没有触发 React re-render；现已在 mount 后 bump，一刷新就渲染 table、10 个 seat、HUD 和 panel。复验显示 Fill demo 后 10 个玩家、Start hand 后进入 Preflop，action buttons 与 quick bets enabled。
- 已修复：`/interview` 的语言/模式 segmented buttons 曾在点击 English/真实面试后仍显示中文/训练练习 active。根因是 React JSX 写死 active class，且 page API 没保存 setup mode；现已用 React state/view model 驱动 active 与 `aria-pressed`，并让旧 setup controller 优先读取迁移后的 state/runtime。
- 已修复：`/interview` 启动后 onboarding action chips 曾缺失或显示后点击不推进。根因是 React transcript 仍依赖旧 DOM 冒泡 handler，且 action 过滤过度依赖 current step checker；现已增加显式 `handleTranscriptActionValue(value)`，并为最新 action message 加兜底显示。复验显示 focus actions、difficulty actions、scope actions 均可出现，点击 Probability/Medium 能推进 step。
- 已修复：`/settings` 曾显示原始 i18n key（例如 `settingsMessage`、`settingsPreferences`、`exportData`），并缺失上线版 14 个关键 id 和退出登录按钮。现已在 React JSX 保留 `settingsForm/settingsLanguageSelect/settingsCountrySelect/settingsRegionSelect/settingsLlmEndpointInput/settingsLlmModelInput/settingsCloudApiInput/settingsGoogleClientIdInput/settingsMessage/exportBtn/importInput/resetBtn/syncCloudBtn/logoutBtn`，并恢复上线版按钮文案与数据区结构。
- 已修复：`/settings` 的云同步按钮曾无状态反馈，点击后仍停在“设置已保存。”。现已在 React 侧补 `syncCloud` 状态反馈；无云端会话时真实浏览器显示“云端还没有登录会话，请先用邮箱密码登录一次。”。
- 已修复：`/library` 的 QuantGuide 练题入口曾真实点击后仍停留在 `/library`。根因是 React page API 仍依赖旧 `openLibraryPractice` 跳转路径，未可靠写入 React Problems filter state / browser route；现已在 `libraryPageApi` 内按 `sourceSlug` 设置 Problems filter、重置分页/详情，并调用 shell route 进入 `/problems`。复验显示 URL 为 `/problems`，页面出现 `题源：QuantGuide 题库`，列表过滤为 1204 题。
- 已修复：多个 React hook 通过 `useUserStateStore((state) => state || {})` 读到了 store 外壳 `{ value }`，而不是实际用户状态。这直接导致 News 显示空列表，也会削弱 Overview/Skills/Tools/Companies/Network/Resume/Memory/Plan/Problems/Courses/Interview/Experiences 等页面的 state 订阅。现已统一改为 `state.value || {}`。
- 已修复：`/news` 的旧版 DOM contract 缺失。React 组件已恢复 `newsUpdatedAt/addNewsBtn/refreshNewsBtn/newsIntelTitle/newsIntelSummary/newsIntelStats/newsTopicFilter/newsSourceFilter/newsSocialHint/newsForm/newsTitle/newsSource/newsUrl/newsSourceType/newsPrimarySkill/newsTags/newsSummary/newsInsight/newsList/newsDetail/newsBackBtn/newsDetailReadBadge/newsDetailMeta/newsDetailTitle/newsDetailSummary/newsDetailInsight/newsDetailPills/newsDetailLink`，同时保留动态 `data-news-id`。
- 已修复：`/experiences` 的旧版 DOM contract 缺失。React 组件已恢复 `newExperienceBtn/experienceForm/experienceFormTitle/experienceId/experienceFirm/experienceRole/experienceStage/experienceSeason/experienceDate/experienceOutcome/experienceTags/experienceSummaryInput/experienceTopics/experienceReflection/cancelExperienceEditBtn/experienceCount/sharedExperienceCount/openCommunityExperiencesBtn/experienceFilter/experienceList`，并将默认结果状态从旧错误枚举 `Pending` 对齐到底层 `Waiting/Advanced/Offer/Closed/Withdrawn`。
- 已修复：`/community` 从 Experiences 入口真实点击可达，但此前显示原始 i18n key，例如 `publish`、`communityFilterAll`、`communityFilterExperience`。现已补 `communityPageTitle/communityComposePlaceholder/publish/communityFilterAria/communityFilterAll/communityFilterExperience/removeMedia/experienceShare/deleteSharedExperience` 等字典项，并恢复 `communitySummary/communityForm/communityText/communityMediaPreview/communityMedia/communityList` 旧版 id。
- 已修复：`/messages` 的旧版 DOM contract 缺失。React 组件已恢复 `messagesPageTitle/messagesSummary/messageThreadList/messageConversationHeader/messageConversationBody/messageComposerForm/messageComposerInput`，并修复 composer placeholder 读取不存在的 `messagePlaceholder` key 的问题。无线程时也保留旧 header/body/form 节点，composer 处于隐藏/禁用状态。
- 已修复：`/network` 的旧版 DOM contract 缺失。React 组件已恢复 `networkSummary/addNetworkBtn/networkForm/networkName/networkCompany/networkRole/networkStatus/networkChannel/networkNextStep/networkNotes/networkList`，补齐 `networkName/networkCompany/networkRole/networkStatusLabel/networkChannel/networkNextStep/networkNotes/editNetworkContact/deleteNetworkContact` 等字典项，并保留 `data-network-id` 供搜索定位/自动化使用。
- 已修复：`/resume` 的旧版 DOM contract 缺失和 raw key 问题。React 组件已恢复 `resumeSummary/resumeForm/resumeText/reviewResumeBtn/saveResumeBtn/resumeReview`，并将错误的 `resumeModuleTitle/resumeReviewAction/resumeSave` key 改回上线版已有 `resumeModule/reviewResume/saveResume`。
- 已修复：`/memory` 的旧版 DOM contract 缺失。React 组件已恢复 `addResourceBtn/resourceForm/resourceTitle/resourceType/resourceFile/resourceContent/resourceSources/resourceList/clearTodayBtn/historyList`，表单改为保留 DOM + `hidden` 切换，并迁入旧版文件读取规则：小图片保存 dataURL，大图片保留文件名和大小，TeX/txt 读入文本。
- 已修复：`/account` 的旧版 DOM contract 缺失和 raw key 问题。React 组件已恢复 `accountMessage/accountForm/accountAvatarPreview/accountAvatarUrl/accountAvatarFile/accountClearAvatarBtn/accountNameInput/accountEmailInput/accountCountrySelect/accountRegionSelect/accountGraduationTermInput/accountResumeFile/accountResumeMeta/accountCurrentPassword/accountProviderText/accountCreatedText/accountRankText`，并修复清除头像后再输入头像 URL 仍被保存为清空头像的状态 bug。
- 已修复：`/plan` 的旧版 DOM contract 缺失。React 组件已恢复 `editPrepPlanBtn/prepPlanSetupForm/prepRoleSelect/prepHoursSelect/prepPlanDashboard`，setup/dashboard/edit button 改为旧版常驻 DOM + `hidden` 切换，并补回 `data-prep-toggle-task/data-prep-open/data-prep-query` 任务按钮属性。
- 已修复：`/companies` 的旧版 DOM contract 缺失。React 组件已恢复 `companiesPageTitle/companiesSummary/companyTierFilter/companyOverviewList`，并补回公司卡上的 `data-company-practice/data-company-careers` 动作属性；Tier 筛选和公司刷题入口已真实浏览器点击通过。
- 已修复：`/jobs` 的旧版 DOM contract 缺失。React 组件已恢复 `jobsSummary/refreshJobsBtn/jobsList`，岗位类型按钮补回 `data-job-filter` 与 active/aria 状态，刷新按钮使用上线版 `refreshJobs` 文案；岗位卡保留 `data-job-id`、外部申请 `href` 和 link role。
- 已修复：`/courses` 的旧版 DOM contract 缺失。React 组件已恢复 `coursesSummary/learningPathTitle/learningPathHint/coursePathList/courseList`，课程卡和路径按钮补回 `data-course-id/data-course-action/data-source-id/data-course-note`；学习路径和 source 切换已真实浏览器通过。
- 已修复：React page API 写用户状态时原地修改 `userState.value`，导致 `useUserStateStore((state) => state.value)` 拿到同一对象引用而不 re-render。`setUserPatch` 已改为不可变 `setValue(nextState)`，修复 Courses 路径点击不刷新，也降低 Network/Memory/Resume/Experiences 等页面的同类风险。
- 已修复：公司刷题入口在 React route 下虽然能进入 `/problems`，但旧 `showCompanyProblems` 仍硬调用可能不存在的 `renderProblems()`，console 会出现 `TypeError: renderProblems is not a function`。现已改为可选调用，React route 由 filter state + navigation 自行渲染。
- 已修复：`/pk` 的旧版 DOM contract 缺失。React 组件已恢复 `startPkBtn/pkUserScore/pkOpponentName/pkOpponentScore/pkProblem/pkForm/pkAnswer/pkRevealBtn/pkFeed`，并将 PK feed 的 category formatter 映射到现有 `formatCategoryLabel`；开始、提交和 reveal 已真实浏览器通过。
- 已修复：`/plan` 任务 `开始` 曾在 React route 下只尝试写旧 `problemSearch` DOM 和调用旧 `renderProblems()`，没有可靠设置 React Problems 的可见筛选状态。现在 Plan API 会在跳转前设置 Problems `theme` filter、重置分页/详情并清空搜索；真实浏览器点击 LeetCode 任务后 `/problems` 显示 active theme `leetcode`、`LeetCode · 156 题`，无 error log。

## 3. 已确认或高置信问题

### 3.1 总览页 UI 与上线版不一致

证据：

- 用户截图显示：总览页 hero、鲨鱼大小/位置、右侧阶段卡、下方卡片布局与上线版不一致；还出现过旧版“进入备战计划”相关内容回流。
- GitHub 上线版 `public/pages/overview.html` 与当前 `src/features/overview/OverviewPageContent.jsx` 的 DOM 并不完全一致。
- 旧样式大量绑定 `body.is-authenticated [data-module-view="overview"] ...`，当前 React 总览页实际挂在 `body.is-authenticated .app-route-root .overview-route-page ...`。
- 已追加过一层 `styles.css` 的 React overview compatibility layer，后续又新增 React bundle 侧覆盖样式以避免旧 selector scope 漂移；当前真实截图显示巨大鲨鱼、summary carousel 式错位和 hero 标题 caret 残留均已缓解/修复。

影响：

- Hero 的尺寸、文字换行、鲨鱼视觉比例可能持续漂移。
- `summary-band`、`overview-effect-grid`、`overview-ranking-grid` 等旧版布局可能只部分命中。
- 旧版 overview 的隐藏/辅助功能 DOM 没有完整迁入 React。
- 已解决的具体回归：标题末尾的蓝色 caret 会让页面看起来像文本正在被编辑；当前 React route 覆盖层已显式关闭该 `h2::after`。

需要优先修复：

- 保持 React 页面结构，但逐段对齐 GitHub 上线版：`news-ticker`、`quanty-hero`、`summary-band`、`problem-progress-panel`、`daily-xp-panel`、`contribution-panel`、`leaderboard-panel`。
- 不再手动凭感觉调样式；每个 selector 都要能解释为“保留上线版视觉”或“React 结构必要替代”。
- 用真实浏览器截图验证 desktop 和 mobile。

### 3.2 题目页曾出现卡片、搜索、主题、难度全部失效

证据：

- 用户截图显示 `/problems` 列表为 0、搜索输入后无结果、主题为空、难度数量全为 0。
- 当前代码中 `src/features/problems/*` 已经保留了旧版 34 个关键 id，静态 DOM 覆盖为 `missingIds = 0`。
- 当前 `src/app/services/problemsPageApi.js` 已使用 `problemMatchesTheme`、`problemMatchesDifficulty`、catalog fallback 等逻辑，静态看已覆盖此前缺失点。

当前判断：

- 这是已修复但必须回归验证的问题。
- 不能仅凭静态检查确认，因为用户看到的问题发生在真实浏览器 runtime。

必须浏览器验收：

- 打开 `/problems` 后题卡数量 > 0。（2026-06-07 已通过：桌面 24 张，移动端 DOM 24 张）
- 输入 `probability` 后列表实时变化。（2026-06-07 已通过）
- 主题 chip 有非零数量，点击主题后列表/数量变化。
- Easy / Medium / Hard 点击后列表/数量变化。（2026-06-07 已通过：Medium）
- 打开题卡详情、返回列表、收藏、完成、分页均可用。

### 3.3 Shell / 全局搜索处于混合控制器风险区

证据：

- `src/components/shell/AppShellMain.jsx` 仍渲染 `globalSearchInput`、`globalSearchResults`、`data-module-tab`、`data-jump-module`。
- `src/ui/bootstrap.js` 仍执行 `bindElements()`、`bindEvents()`、`initRouter()`、`renderSession()`。
- `src/ui/appEvents.js` 仍通过 `elements.globalSearchInput` 绑定输入、focus、keydown。
- `src/ui/globalSearch.js` 仍通过 DOM 创建 `.global-search-result` 并调用 `switchModule`、`openProblem`、`focusNews`、`spotlightElement`。

当前判断：

- 搜索框本身应该可以绑定，因为 shell id 仍存在。
- 但搜索结果点击后的 spotlight / 页面定位依赖目标页面 selector，例如 `data-job-id`、`data-company-card`、`data-course-id`、skills hover 等。React 页面若没有保留这些属性，结果点击会导航但无法定位。
- 用户此前反馈“搜索框输入完没有反应”，需要真实浏览器重新验证，不应只看代码。

必须浏览器验收：

- 在顶部搜索输入 `Jane Street`，出现结果面板。（2026-06-07 已通过：14 条结果）
- 点击 company / job / problem / course / skill / news 类型结果，能导航并定位目标。（2026-06-07 已通过：company -> `/companies`；其他类型未测）
- Escape、Enter、ArrowUp/ArrowDown 可用。
- 移动端搜索框不溢出、不遮挡 nav。

### 3.4 多数页面缺少 GitHub 上线版关键 id，需逐项裁决

静态扫描将 GitHub `public/pages/*.html` 的 id 与当前 React JSX 静态 id 对比，结果如下。

这些 missing id 不自动等于 bug：如果 React 页面已经用 state/props/onSubmit 替代旧 DOM 控制器，这是可以接受的。但每一个 missing id 都必须被 coding agent 标成以下三类之一：

- 保留：上线 CSS、搜索定位或外部控制器仍依赖，React JSX 必须补回 id/data 属性。
- 替代：旧 DOM 控制器依赖已删除，React 组件有等价功能。
- 删除：旧功能不再需要，且产品确认可以移除。

| 页面 | GitHub 旧 id 数 | 当前静态缺失 id | 风险判断 |
|---|---:|---:|---|
| `overview` | 37 | 0 | 中-高。旧 DOM contract 已恢复；进度、XP、热力图空白已修复并真实浏览器通过。Leaderboard metric/country/region 选择、地区控件显隐、行过滤和 reload 持久化已真实浏览器通过；Hero/summary/leaderboard 视觉细节仍需继续对照上线版。 |
| `problems` | 34 | 0 | 中。静态契约最好，但必须浏览器验证搜索/筛选/详情。 |
| `interview` | 43 | 0 | 中。静态 id 完整，但面试流复杂，需浏览器深测。 |
| `library` | 16 | 0 | 中。静态 id 完整；search/kind filter/practice 已真实浏览器通过，非云端 PDF reader 权限提示已真实浏览器通过；真实本地 cloud API reader-token + PDF iframe open/close/reload 已用临时云端账号 Chrome/Playwright 深测通过。 |
| `skills` | 17 | 0 | 低-中。静态 id 完整；radar 点击 hover、legend/card/tooltip 联动、全局搜索 skill result spotlight 已真实浏览器通过。 |
| `poker` | 35 | 0 | 中-高。旧 DOM id 已补回 React，table/bot/start/action/manual seat/settings 已真实浏览器通过；online room fallback 已用失效 cloud endpoint/token 真实浏览器验证，失败后降级 Local、URL 归一、Fill demo/Start/action/reload 均可用。 |
| `tools` | 27 | 0 | 中。旧 Mental Math / Market id 已补回 React；drill mode/start/answer/skip/next/market quote/poker launcher 已真实浏览器通过，count/time select 真实改值也已通过。 |
| `news` | 32 | 0 | 中。旧关键 id 已恢复，4 条 seed 新闻恢复；筛选、详情/返回、表单展开、真实输入提交、详情打开、reload 持久化、刷新、Overview ticker -> News detail 已真实浏览器通过。 |
| `experiences` | 20 | 0 | 中。旧新增/编辑/分享表单 id 已恢复；表单 contract、枚举、侧栏统计、社群入口、新增、编辑、轮次筛选、分享社区、sharedPostId 写回、删除未分享记录和 reload 持久化均已真实浏览器通过。 |
| `account` | 17 | 0 | 中。旧账号表单 id 已恢复，首屏/国家地区联动/raw key 已真实浏览器通过；保存、头像上传/清除、简历上传、改邮箱密码、reload 持久化、退出登录均已用临时本地账号 Chrome/CDP 深测通过。真实 Google provider account login 已由 production-boundary / release-readiness 证据签收。 |
| `settings` | 14 | 0 | 中。旧设置表单 id 已恢复；保存、语言、国家地区联动、云同步提示、导出真实下载、导入真实 file input、reset 当前测试账号、peer 账号不误删、logout 回 AuthShell 均已真实浏览器通过。 |
| `network` | 11 | 0 | 中。旧人脉表单 id 已恢复；空态/表单展开/raw key、新增保存、编辑回填、编辑持久化、删除和删除后 reload 空态均已真实浏览器通过。 |
| `memory` | 10 | 0 | 中。旧资料笔记 id 已恢复，首屏/表单展开/raw key、文本资料新增保存和 reload 持久化已真实浏览器通过；`.tex` 文件读取、小图片 dataURL、大图片文件名 fallback、reload 持久化和撤销最新记录也已用临时本地账号 Chrome/CDP 深测通过。 |
| `pk` | 9 | 0 | 中。旧 PK 表单/score/feed id 已恢复；开始、提交、reveal 和 feed 已真实浏览器通过。本轮提交写入 1 条 QA PK 训练记录。 |
| `messages` | 7 | 0 | 中。旧聊天 DOM id 已恢复；空态、有效 thread fallback、thread 切换、标记已读、全局 unread badge、发送、reload 持久化、Community 私信入口创建 thread 均已用临时账号 Chrome/Playwright 深测通过。 |
| `community` | 6 | 0 | 中。旧社区 form/list id 已恢复，raw i18n key 已修复；筛选、媒体预览/移除、带图片发帖、点赞、评论、私信入口、删除自己的动态、reload 持久化均已通过临时账号 Chrome/Playwright 深测。 |
| `resume` | 6 | 0 | 中。旧简历 textarea/review/save id 已恢复，首屏 raw key、保存、无 endpoint 本地 review fallback、reload 持久化和兼容 endpoint POST/render contract 已真实浏览器通过；生产 LLM/PDF endpoint 可用性仍需真实服务补验。 |
| `plan` | 5 | 0 | 中。旧 plan setup/dashboard id 已恢复；setup contract、role/hours select、制定计划、编辑目标、baseline 校验/提交、任务完成 reload 持久化、任务跳转到 Problems theme filter 均已真实浏览器通过。本轮写入 QA 备战计划。 |
| `companies` | 4 | 0 | 中。旧 company/tier/list id 已恢复；Tier 筛选、practice company 和 careers 外链新标签已真实 Chrome 通过。 |
| `courses` | 5 | 0 | 中。旧 summary/path/list id 已恢复；学习路径、source 切换、临时状态清理和全局搜索 course spotlight 已真实浏览器通过。 |
| `jobs` | 3 | 0 | 中。旧 summary/refresh/list id 已恢复；filter、refresh、全局搜索 job spotlight 和外部申请链接新标签已真实 Chrome 通过。 |

## 4. 页面级审查清单

### 4.1 Overview

UI 必查：

- `news-ticker` 与 GitHub 上线版同一行高、同一卡片边框、文字截断一致。
- Hero 中 `Welcome back, Quant`、`Sharpen your quant edge today.`、鲨鱼位置和比例与上线版一致。
- 右侧 summary/rank 卡不被裁切，不出现 carousel 式错位。
- `Problem completion`、`Experience rhythm`、`Contribution heatmap`、`排行榜` 与上线版布局一致。（2026-06-07 已通过基础 DOM/数据复验：4/7/84/2；视觉细节仍需和截图逐段对齐）
- 手机宽度下 hero 不横向溢出，鲨鱼不遮挡文字。

功能必查：

- 新闻 ticker 点击能进入/聚焦新闻。（2026-06-07 已通过：`164-live-overview-news-ticker-detail-fixed.png`）
- Problem completion 的跳转按钮进入 `/problems`。（2026-06-07 已通过：URL `/problems`，24 张题卡，`163-live-overview-problem-progress-click.png`）
- Leaderboard metric/scope/country/region 切换生效。（2026-06-07 已修复 metric options/rows 缺失；metric options 16、rows 2。真实 in-app browser 已验证 metric -> `leetcode`、scope -> `country`、国家筛选显示、地区筛选隐藏、摘要变为 `LeetCode · 中国...`，截图 `168-live-overview-leaderboard-selects-country-fixed.png`；2026-06-08 真实 Chrome/Playwright 已补验 scope -> `region`、地区控件显隐/启用、上海/北京/美国 California 行过滤和 reload 持久化，截图 `259-cdp-overview-leaderboard-initial-seeded.png` 到 `264-cdp-overview-leaderboard-region-reload-persisted.png`）
- 今日待办 dock 打开/关闭/新增/完成仍可用。（2026-06-07 已通过：真实 in-app browser 点击 `今日待办 4` 后 `aria-expanded=true`、panel 可见；输入并添加 `QA Todo Dock 20260607` 后计数变为 5；点击该自定义任务 toggle 后 row 为 `todo-task done`、button label 为 `标为未完成`、待办计数回到 4；关闭后 `aria-expanded=false`、panel hidden。截图 `165-live-todo-dock-open-fixed.png`、`166-live-todo-dock-add-complete-fixed.png`、`167-live-todo-dock-close-fixed.png`）
- 如果继续保留今日计划入口，需要明确入口位置；如果产品决定隐藏“进入备战计划”，不要再由旧 HTML 或旧 CSS 回流。

### 4.2 Problems

UI 必查：

- 页面首屏必须显示题卡，不允许出现全 0 空状态。
- 搜索框输入后列表、summary、pagination 同步更新。
- 主题筛选 chip 和难度 chip 数字非零且点击有视觉 active 状态。
- 题目详情页标题、meta、hint、answer、收藏/完成按钮布局稳定。

功能必查：

- 搜索 `probability`。
- 点击一个主题，再点 Medium/Hard。
- 打开题目详情，Reveal hint / answer。
- Toggle completed / saved，返回列表后状态保留。
- 分页上一页/下一页/跳页。
- Hot 100 展开、完成状态切换。

2026-06-07 追加真实浏览器深测结果：

- 已通过：`probabilityExpectation` + `Medium` 筛选后为 603 题，当前页 24 张题卡，active theme/difficulty 正确。
- 已通过：打开第一张题卡详情，Hint/Answer 初始锁定；点击 `显示 Hint` 和 `显示答案` 后两块内容显示，按钮消失，无 Vite overlay。
- 已通过：详情页完成/收藏按钮切换为 `已完成` / `已收藏`，返回列表后同一题卡状态保持；随后列表按钮可切回 `标记完成` / `收藏到复习本`。修复点：`updateProblemStates` 调用 `mergeProblemStates([old, next])`，避免重复 toggle 被丢弃。
- 已通过：分页下一页后 active page 为 2，第一张题卡从 `green-book-problem-001` 变为 `green-book-problem-025`，上一页按钮启用。
- 已通过：LeetCode Hot 100 题卡展开后保留 active 状态，`#leetcodeHotList` 显示 100 个 `.leetcode-hot-item`，第一题为 `Two Sum`。
- 已通过：Hot 100 第一题完成按钮可切换为 `leetcode-hot-item is-done` 和 `已完成`，再次点击可撤回为未完成；撤回后集合区仍保留 6 个 collection buttons，Hot 卡仍存在，100 条 Hot 题目仍存在，无 Vite overlay。修复点：React page API 自持 Hot 展开状态，doneIds 归一化传入 Hot 题单，Hot 完成切换改为 React 状态更新，不再调用 legacy DOM renderer。

### 4.3 Shell / Navigation / Search

UI 必查：

- 顶部 nav dropdown 不遮挡、不漂移。
- 顶部搜索框宽度和 placeholder 与上线版一致。
- account chip、chat pill、settings button 位置稳定。
- 移动端无 document-level horizontal overflow。

功能必查：

- nav 点击每个 module 后 URL 为 path route，不再写 hash。
- `/#jobs` 兼容跳转到 `/jobs`。
- 全局搜索输入、结果展示、键盘操作、点击跳转。
- 未登录访问 protected route 能进 auth，登录后回到目标页。

2026-06-07 追加 Skills / 全局搜索真实浏览器结果：

- 已通过：`/skills` 页面旧版 17 个关键 id 仍全部存在，15 张 skill card、15 行 radar legend 和 radar canvas 正常渲染。
- 已通过：点击 `data-skill-radar-key="probabilityExpectation"` 后，雷达 legend 和对应 skill card 同时进入 `is-active`，`#skillRadarTooltip` 显示 `Probability/Expectation` 数据，无 Vite overlay。修复点：hover/tooltip 改为 React-owned state，避免旧 DOM runtime mutation 被 React re-render 覆盖。
- 已通过：全局搜索输入 `principal logarithm` 后出现 `能力值 Complex Numbers` 结果；真实点击后搜索面板关闭、输入框清空、`Complex Numbers` 技能卡和 legend 进入 `is-active`，页面 spotlight 滚动到目标卡片，无 Vite overlay。修复点：skill 搜索结果点击后派发 `quantgym:skill-focus`，React Skills hook 接管目标技能激活。

### 4.4 Auth / Cover

UI 必查：

- `/login` 封面图、品牌、表单布局与当前产品期望一致。
- 如果要对齐 GitHub 上线版，需要明确 GitHub 版本的 auth cover 是目标；如果最近封面改版是新目标，则此页不按旧版回退。

功能必查：

- login/register tab 切换。
- 本地注册和登录。
- Google placeholder / disabled 状态。
- logout 后 shell 隐藏、auth shell 显示。

### 4.5 Account

功能必查：

- 旧版 Account DOM contract 必须存在，供旧样式、语言文本、头像/简历文件处理和自动化验收使用。（2026-06-07 已通过：`accountMessage/accountForm/accountAvatarPreview/accountAvatarUrl/accountAvatarFile/accountClearAvatarBtn/accountNameInput/accountEmailInput/accountCountrySelect/accountRegionSelect/accountGraduationTermInput/accountResumeFile/accountResumeMeta/accountCurrentPassword/accountProviderText/accountCreatedText/accountRankText` 缺失 0，`93-live-account-contract-fixed.png`）
- 页面标题、说明、头像 URL placeholder、上传/清除头像、昵称/邮箱/国家/地区/毕业时间/简历/当前密码、保存按钮和账户 meta 不得显示 raw i18n key。（2026-06-07 已通过）
- 简历 meta 空态必须显示上线版说明 `上传 txt/md 简历可直接分析；PDF 会先保存文件名。`，不得显示 `resumeEmptyMeta`。（2026-06-07 已通过）
- 国家/地区联动必须可用。（2026-06-07 已通过：真实浏览器将国家切到 `unitedStates` 后地区选项为 51 项，前几项为 Alabama/Alaska/Arizona/Arkansas/California/Colorado，`94-live-account-country-region-fixed.png`；随后已切回中国，未保存账户）
- 保存账户、头像 URL 保存、头像上传/清除后保存、简历上传、改邮箱需要当前密码、退出登录仍需在专门测试账户补验，避免破坏当前 QA 会话或账户资料。

备注：

- 这次修复保持当前 React `accountPageApi` / auth store 数据流，没有回退旧 `src/modules/account/index.js`。
- 同步修复一个迁移 bug：清除头像后再输入头像 URL 时，React 状态原本仍保留 `avatarCleared=true`，保存会继续清空头像。现在输入头像 URL 会取消清除状态并清掉旧 dataURL。
- 本轮没有点击保存、上传本地文件或退出登录。

### 4.6 Settings

功能必查：

- 语言保存后 reload 仍保留。（2026-06-07 已通过：切到 English 保存后 heading/save button/message 变英文，再恢复中文，`57-live-settings-language-sync-restore.png`）
- 国家/地区联动保存。（2026-06-07 已通过：中国/上海 -> 美国/Alabama 保存，状态显示“设置已保存。”，再恢复中国/上海，`56-live-settings-save-us.png`、`57-live-settings-language-sync-restore.png`）
- LLM endpoint/model 保存。
- Cloud API / Google client id 保存。
- sync cloud 按钮可用。（2026-06-07 已通过：无云端会话时显示明确提示，`58-live-settings-sync-feedback-fixed.png`）
- export/import/reset 按钮可用。（2026-06-07 已通过 export/import：真实 Chrome/CDP 使用临时账号点击导出，下载文件为 `quantgym-QA Settings-2026-06-08.json`，payload `version=2`、user/state 存在；随后通过真实 `#importInput` file input 导入 JSON，Memory 页面出现 `QA IMPORT BACKUP RESOURCE`。2026-06-08 已通过 reset：临时账号点击 `resetBtn` 并接受 confirm 后 entries/resources/problemStates/interviewExperiences 清空，Memory 不再显示重置前资源，peer 账号资源保留。）
- logout 按钮存在且文案/旧 id 恢复。（2026-06-08 已通过：临时账号点击 `#logoutBtn` 后进入 `/login`，`#authShell/#loginForm` 可见，`auth.currentUserId` 为空。）

备注：

- 当前 module-level smoke 已覆盖 `saveSettingsFromValues`；追加模块级脚本已覆盖 `mergeBackupFile` / `mergeImportedState`、导入后 `userStateRuntime.setValue` store 同步、`createBackupDownload` payload 和 filename。
- 2026-06-07 已补真实浏览器交互：旧 id 全部恢复、原始 i18n key 消失、语言和国家/地区保存成功、云同步无会话提示成功。
- 2026-06-07 追加真实 in-app browser 点击：`导出备份` 按钮唯一匹配，点击后无 Vite overlay，`导出备份` / `导入备份` 控件仍 enabled，见 `126-live-settings-export-click-no-crash.png`。
- 2026-06-07 追加真实 Chrome/CDP export/import：临时本地账号注册后进入 Settings，导出下载真实 JSON 文件；导入测试 JSON 后，跳转 `/memory` 可见导入资源卡。复验 summary 见 `203-cdp-settings-export-import-summary.json`。
- 已修复：Runtime slice 初始化时早于 Shell slice，`backupController.importState` 闭包捕获的 `clearProblemLookupCaches` 为 `undefined`，真实导入时弹出 `备份文件无法读取。`；现改为 Shell 将 `clearProblemLookupCaches/renderAll` 写入 `sliceRefs`，Runtime 导入时延迟读取。React Settings 也改为在 `onChange` 同步取出 `File` 再传给 controller，避免异步读取 event/input 的竞态。
- in-app Browser 明确不支持 downloads，也不适合证明真实 file picker 导入；对应深测已改用 Chrome/CDP 兜底完成。
- 2026-06-08 已补危险操作 `resetBtn` 与会话操作 `logoutBtn`：使用 disposable account，不污染当前人工 QA 会话。reset 后 `news` 仍为 4 条是 seed 新闻基线，不是手动新闻残留。

### 4.7 Interview

功能必查：

- 语言切换。（2026-06-07 已通过：点击 English 后 English active、中文 inactive，`45-live-interview-toggle-fixed-final.png`）
- 类型、时长、题源、PDF input。（2026-06-07 已部分通过：English + Practice、3 questions onboarding 真实通过；PDF source 真实上传临时 PDF，mock LLM endpoint 收到 `generate_pdf_questions` 请求并生成 `PDF Fixture Question 1`，截图 `199-cdp-interview-pdf-source-upload.png`、`200-cdp-interview-pdf-generated-q1.png`。注意：PDF input change 会触发 React 重新同步高级设置，测试脚本必须在上传 PDF 后重新写入 `#llmEndpointInput`，否则 endpoint 会回到默认 `8787`）
- 模式切换。（2026-06-07 已通过：点击真实面试后 live active、practice inactive，`45-live-interview-toggle-fixed-final.png`）
- start。（2026-06-07 已通过：English + Live 启动后进入 `session-only`，transcript 显示 `Live mock in English`，`46-live-interview-start-live-english.png`）
- onboarding 快捷选项。（2026-06-07 已通过：focus actions 显示 12 项，点击 Probability 推进到 difficulty；Medium 推进到 scope；scope actions 显示 3/5/10 questions 和 30 minutes，`47-live-interview-actions-fixed.png`、`49-live-interview-action-advances-fixed.png`、`53-live-interview-latest-actions-visible.png`）
- hint / reveal / submit / favorite。（2026-06-07 已通过：真实 Chrome/CDP 选择 English + Practice、完成 onboarding 到 `Q1/3`，点击 Hint 后 transcript 出现 `Hint:`，点击 reveal 后出现 `Reference answer`，输入答案并提交后 `#interviewCompleteActions` 可见、`#saveInterviewFavoriteBtn` enabled，点击收藏后 `#interviewFavoritesSummary` 为 `1 条复盘` 且列表出现 favorite item。截图 `190-cdp-practice-q1-ready-after-submit-hook-fix.png`、`191-cdp-practice-hint-after-submit-hook-fix.png`、`192-cdp-practice-reveal-after-submit-hook-fix.png`、`193-cdp-practice-submit-complete-actions.png`、`194-cdp-practice-favorite-saved.png`）
- exit 后 resume。（2026-06-07 已通过：真实 Chrome/CDP 进入 English + Live Q1/3，Hint/Reveal 隐藏；点击 Exit 并自动接受原生 confirm 后 setup 可见、resume button 可见；点击 Resume 后恢复 `Live mock · Technical Interview` 和 `Q1/3`，截图 `181-cdp-live-ready-after-typing.png`、`182-cdp-live-exited-resume-visible.png`、`183-cdp-live-resumed-q1.png`）
- 语音或文本模式切换后不会卡死。（2026-06-07 已部分通过：真实 Chrome/CDP 点击 `#voiceAnswerBtn` 后页面稳定，`voiceActive=false`、按钮仍可见、answer/file 控件仍可用；headless 环境无法证明真实麦克风识别或系统权限弹窗）
- answer file 上传和随答案提交。（2026-06-07 已通过：通过真实浏览器 file input 上传 `qa-interview-note.txt` 后提交答案，transcript 包含 `[Attachment: qa-interview-note.txt]`，评分和下一题按钮正常出现，截图 `196-cdp-interview-answer-file-submit.png`）
- 导出报告。（2026-06-07 已部分通过：完成 3 题后 `#exportInterviewReportBtn` 可见，点击后打开 `QuantGym Mock Interview Report` 报告窗口，报告包含 `Interview completed`、Overall score 和 Q1/Q2/Q3 review，截图 `197-cdp-interview-completed-export-visible.png`、`198-cdp-interview-report-window.png`；还未证明浏览器原生打印/下载成文件）

备注：

- 静态 id 覆盖为 0 缺失，但面试模块仍属于复杂交互，不能省略深测。
- 已修复：`messageController` typewriter 只更新 `.message > .rich-text`，不再清掉 onboarding action tray；Interview slice 补齐 `resetInterview/finalizeInterviewOnboarding/showInterviewQuestion/restartInterviewWithSameConfig` 回传；React hook 的 `submitAnswer` 返回异步 API promise，完成评测后能触发 revision；`saveFavorite` 同时写入 `userState.interviewFavorites` 和当前题目 problem state，避免部分抽题对象没有稳定 problem id 时收藏夹为空。
- 仍未完成的边界：真实麦克风语音识别、系统麦克风权限弹窗、报告打印/下载为本地文件、连接真实远程 LLM endpoint 的 PDF 生成仍需后续补验。本轮 PDF source 使用的是真实浏览器上传 + 本地 mock endpoint，因此能证明 React 文件上传和请求 contract，但不能证明生产 endpoint 可用性。
- 工具限制：本轮已调用 in-app browser，但当前 in-app browser 的截图/DOM/点击链路会在 CDP 底层命令超时；Interview 深测改用真实 Chrome/CDP，脚本通过 `Input.dispatchMouseEvent` 和 `Input.insertText` 执行真实点击/输入。

### 4.8 Poker

功能必查：

- 打开 `/poker` 后 table/lobby 不空白。（2026-06-07 已通过：`33-live-poker-table-fixed.png`）
- take seat、add bot、fill bots、start hand。（2026-06-07 已通过：Fill demo + Start hand，`34-live-poker-fill-demo-fixed.png`、`35-live-poker-start-hand-fixed.png`；空座 `SIT` 手动坐下已通过，`115-live-poker-manual-seat-click-fixed.png`）
- call / raise / all-in / fold button disabled 状态正确。（2026-06-07 已通过：Start hand 后四个 action button 均 enabled）
- quick bet 正确更新 raise amount。（2026-06-07 已通过：`1/2 pot` 后 raise input 从 `300` 变为 `315`）
- settings panel 保存 blind/stack/max players。（2026-06-07 已通过：`10 / 20` -> `15 / 30`，starting stack `2000` -> `2500`，max players `10` -> `9`，`116-live-poker-settings-save-fixed.png`；验收后已恢复默认设置）
- online room / local fallback 不互相破坏。（2026-06-08 已通过：失效 cloud endpoint/token 下 URL join 与 `New` 建桌失败都会降级 Local，Fill demo/Start/action/reload 稳定，`269-cdp-poker-online-fallback-initial.png` 到 `274-cdp-poker-online-fallback-reload-persisted.png`）

备注：

- GitHub 旧 DOM id 已在 React 组件中补回，静态扫描 `35/35` 覆盖，真实浏览器缺失 0。
- React view-model 仍是当前实现来源；补回 id/data 属性只用于上线版 CSS、旧搜索定位和自动化验收，不回退旧 HTML。
- 当前桌面/开局/手动坐下/settings 主流程已恢复；online room fallback 已补齐真实浏览器深测。

### 4.9 Tools

功能必查：

- Mental Math drill count/time select。（2026-06-07 已通过：真实浏览器把题量改为 `10`、时间改为 `5:00`，点击开始后进度为 `Question 1/10`，计时从 5 分钟 session 开始运行；截图见 `125-live-tools-count-time-select-fixed.png`）
- start session 后 timer、score、accuracy、progress 更新。（2026-06-07 已通过：`28-live-tools-start-fixed.png`）
- options answer / skip / next。（2026-06-07 已通过：答题后 score 变为 `-1` 并推进到 Question 2；Skip 后推进到 Question 3；合同复验见 `119-live-tools-answer-market-fixed.png`）
- Market making bid/ask quote。（2026-06-07 已通过：默认 bid/ask 提交后 Market score `19`/`20`，`31-live-tools-market-quote-fixed.png`、`119-live-tools-answer-market-fixed.png`）
- Poker launcher 进入 `/poker`。（2026-06-07 已通过：进入 `/poker?pokerRoom=QG-MAIN`，并经 Poker 修复后桌面渲染）

备注：

- 已修复 `toolsPageApi.getViewModel` 闭包缺失导致的按钮点击无响应。
- 已将 `useToolsPageModel` 改为本地 `viewState` 驱动，避免可变 pageApi 状态改变后 React 不刷新的问题。
- GitHub 旧 DOM id 已在 React 组件中补回，静态扫描 `27/27` 覆盖，真实浏览器缺失 0。补 id/data 只用于上线版 CSS、旧搜索定位和自动化验收，不回退旧 HTML。

- 旧 drill DOM id 静态全缺失，必须确认 React 页面有完整替代。

### 4.10 Library

功能必查：

- 搜索框输入后 books/question sets/continue shelf 同步更新。（2026-06-07 已通过：`probability` 搜索后题单筛选截图见 `66-live-library-search-question-filter.png`）
- kind filter `全部/书籍/题单` 有正确 active 状态，且列表数量随筛选变化。（2026-06-07 已通过：`questionSet` active，books 为 0、question sets 为 3）
- practice 入口进入 `/problems`，并带入题源 filter。（2026-06-07 已修复并通过：点击 QuantGuide 练题后 URL 为 `/problems`，页面显示 `题源：QuantGuide 题库`，列表过滤为 1204 题，`67-live-library-practice-fixed.png`）
- PDF reader auth guard。（2026-06-07 已通过：非云端 QA 账号点击 `green-book` 阅读后显示 `请先用云端账号登录或注册后再阅读 PDF。`，overlay 保持 hidden，无 Vite overlay，见 `127-live-library-pdf-reader-auth-guard.png`）
- reader open/close。（2026-06-07 已模块级通过：模拟云端 reader token 和 PDF range probe 后，`openReader('green-book')` 返回 `open=true`、`isOpening=false`、iframe URL 带 `#toolbar=0...` 参数，`closeReader()` 后 `open=false`；真实云端 iframe 仍需云端账号补验）
- external read link 仍需补验。

备注：

- 修复前截图 `68-debug-library-practice-still-stuck.png` 记录了真实点击 QuantGuide 练题后仍停在 `/library` 的回归。
- 根因是 React `libraryPageApi` 仍依赖旧 `openLibraryPractice` 进行页面跳转。现已改为在 React page API 内直接写入 Problems filter state、重置 page/detail，并调用 shell route 进入 `/problems`。
- in-app Browser 某次 `locator.fill()` 因虚拟剪贴板限制失败；最终练题点击验收绕开输入清空，直接点击当前可见卡片完成。搜索/筛选截图已在前一次成功交互中产出。

### 4.11 News

功能必查：

- 页面必须保留 GitHub 上线版 seed 新闻，不允许空列表。（2026-06-07 已修复并通过：4 条 seed 新闻恢复，`69-live-news-initial-contract-fixed.png`）
- 旧版 News DOM contract 必须存在，供旧语言文本、搜索定位、样式和自动化验收使用。（2026-06-07 已通过：关键 id 缺失 0）
- 主题筛选可用。（2026-06-07 已通过：点击 `AI/算力` 后 activeTopic 为 `aiInfra`，列表从 4 条收窄到 2 条，`70-live-news-topic-filter-fixed.png`）
- 来源筛选可用。（2026-06-07 已通过：点击 `官方` 后 activeSource 为 `official`，当前 seed 下显示空态文案，`71-live-news-source-filter-fixed.png`）
- 点击新闻卡进入详情，详情页旧 id 存在，来源链接保留。（2026-06-07 已通过：`72-live-news-detail-fixed.png`）
- 详情返回列表可用。（2026-06-07 已通过：返回后 `#newsList` 恢复，4 条卡片可见，`73-live-news-back-to-list-fixed.png`）
- 添加新闻表单展开后旧 id 和按钮文案存在。（2026-06-07 已通过：`74-live-news-form-contract-fixed.png`）
- 手动新闻表单真实输入和提交必须写入 React 用户状态，列表新增、详情可打开、来源链接保留，并在 reload 后持久化。（2026-06-08 已通过：`254-cdp-news-before-form-submit.png` 到 `258-cdp-news-submit-reload-persisted.png`、`258-cdp-news-form-submit-summary.json`）
- 刷新按钮可点击且不破坏列表。（2026-06-07 已通过：点击后 4 条新闻保留、无 Vite overlay、无 console error，`76-live-news-refresh-click-fixed.png`）

备注：

- 根因之一是多个 React hook 读错 `userStateStore` 外层对象，导致 News 的 `userState.news` 为 `undefined`。这次已统一改为读取 `state.value`，属于跨模块底层修复。
- in-app Browser 输入动作曾触发“virtual clipboard is not installed”限制；后续已用独立真实 Chrome/Playwright 补齐表单真实输入/提交验收。
- 本轮未打开外部新闻链接，避免在验收中跳出本地应用；已验证 `#newsDetailLink` 保留真实 `href`。

### 4.12 Experiences

功能必查：

- 页面标题/说明必须恢复 GitHub 上线版语义，不显示原始 i18n key。（2026-06-07 已通过：标题为 `面经记录`，说明为 `按轮次沉淀面试过程、考察主题和复盘行动，建立自己的面试档案。`，`79-live-experiences-contract-fixed.png`）
- 旧版 Experiences DOM contract 必须存在，供旧样式、搜索定位和自动化验收使用。（2026-06-07 已通过：20 个关键 id 缺失 0）
- 表单默认值必须和底层 normalize/formatOutcome 枚举一致。（2026-06-07 已通过：role=`Quant Trading`、stage=`OA / Assessment`、season=`2027 Summer`、outcome=`Waiting`）
- 轮次、季次、结果状态选项必须完整。（2026-06-07 已通过：stage 6 项、season 4 项、outcome 5 项、filter 7 项）
- 侧栏统计必须显示私有记录数和已分享到社群数。（2026-06-07 已通过：当前 QA 账户 0/0）
- “查看社群面经”必须真实进入 `/community`。（2026-06-07 已通过：点击 `#openCommunityExperiencesBtn` 后 URL 为 `/community`，`80-live-experiences-community-link-fixed.png`）
- 新增/保存、编辑、轮次筛选、删除未分享记录、分享至社群、`sharedPostId` 写回、返回 Experiences 后 `已分享` badge/统计同步、reload 持久化必须通过临时测试账户验收。（2026-06-08 已通过：`247-cdp-experiences-initial.png` 到 `253-cdp-experiences-reload-persistence.png`、`253-cdp-experiences-crud-share-summary.json`）

备注：

- 这次修复保留最新 React state/API 保存逻辑，没有回退旧 HTML；只恢复旧 DOM 合约、选项枚举、侧栏和卡片结构，并补齐旧分享 controller 到 React user-state runtime 的写回。
- 早前真实点击社群入口时发现 `/community` 显示原始 key；Community 自身 i18n/UI 和 CRUD/media 已在后续深测中通过。

### 4.13 Community

功能必查：

- 页面标题/说明必须恢复 GitHub 上线版语义，不显示导航名或原始 i18n key。（2026-06-07 已通过：标题为 `社区`，说明为 `像朋友圈一样分享训练动态，也可以点赞评论。`，`81-live-community-contract-fixed.png`）
- 旧版 Community DOM contract 必须存在。（2026-06-07 已通过：`communitySummary/communityForm/communityText/communityMediaPreview/communityMedia/communityList` 缺失 0）
- 发布按钮、筛选按钮和 textarea placeholder 不得显示 raw key。（2026-06-07 已通过：`publish/communityFilterAll/communityFilterExperience/communityComposePlaceholder` 均未出现在 body text）
- `全部动态` / `面经分享` filter 必须有正确 active 和 `aria-selected` 状态。（2026-06-07 已通过：点击 `面经分享` 后该按钮 active=true、aria-selected=true，`82-live-community-experience-filter-fixed.png`）
- 发帖、媒体预览/移除、点赞、评论、私信、删除动态必须在专门测试账户里补验，避免污染当前 QA 账户。（2026-06-08 已通过：临时本地账号上传小 PNG 后预览可见，点击 `移除媒体` 后预览隐藏；再次上传并发布 `QA COMMUNITY POST WITH IMAGE 20260608` 后新动态含图片和删除按钮；真实点击远端 Bob 动态点赞后显示 `已赞 - 1` 且 storage likes 包含当前用户；真实键盘输入评论后评论可见、count=1、storage 持久化；删除自己的动态后 UI/storage 均移除，reload 后点赞/评论仍在且被删动态不回流。截图 `240-cdp-community-initial-seeded.png` 到 `246-cdp-community-reload-persisted.png`）

备注：

- 这次修复根因是 `t()` 对缺失 key 会返回 key 本身，导致 JSX 中的 `model.t("publish") || "发布"` fallback 不会生效。已通过补完整 i18n key 修复。
- `segment.active` 的视觉差异在截图中较轻，DOM 状态已正确；后续 UI polish 可增强 active segment 的可见度。

### 4.14 Messages

功能必查：

- 旧版 Messages DOM contract 必须存在，即使当前账户没有任何私信线程。（2026-06-07 已通过：`messagesPageTitle/messagesSummary/messageThreadList/messageConversationHeader/messageConversationBody/messageComposerForm/messageComposerInput` 缺失 0，`83-live-messages-contract-fixed.png`）
- 页面标题、说明、空态、composer placeholder 和发送按钮不得显示 raw i18n key。（2026-06-07 已通过：raw key 列表为空）
- 无线程时 composer 必须隐藏并禁用，避免用户误以为可以发送到空 thread。（2026-06-07 已通过：`composerHidden=true`、`composerInputDisabled=true`）
- 存在线程时应自动选择第一条有效 thread；如果旧 selected thread 已不存在，应回落到第一条有效 thread。（2026-06-08 已通过：seed 两条有效 thread 后默认选中最新 Carol thread，`234-cdp-messages-initial-seeded.png`）
- thread 切换、发送消息、标记已读、未读数刷新、从 Community 私信入口创建 thread。（2026-06-08 已通过：点击 Bob thread 后 localStorage `readBy` 更新且 global badge 2 -> 1；发送 `Thanks, let us compare notes tomorrow.` 后 UI 和 localStorage 同步，reload 后仍存在；点击 Community 中 Alice 的 `私信` 后创建 `thread-qa-current-messages-qa-peer-alice` 并进入 `/messages`。截图 `235-cdp-messages-after-bob-read.png` 到 `239-cdp-messages-after-community-private.png`）

备注：

- 根因之一是 React 无线程分支直接渲染 `EmptyState`，导致旧版 header/body/form id 消失；现已改为始终渲染旧结构。
- 原 React composer 使用 `t("messagePlaceholder")`，但字典里实际 key 是 `messageComposerPlaceholder`；现已改正并补充 `messageThreadListLabel/messageCountLabel`。
- 本轮新增修复：Messages 页面进入时主动刷新 `commandUnreadCount/has-unread`；Messages 写 community 时同步 React community store 并派发 `quantgym:community-updated`；Community React page API 直接创建/保存私信 thread，并通过 `quantgym:navigate-module` 进入 `/messages`，不再依赖旧 DOM renderer。

### 4.15 Network

功能必查：

- 旧版 Network DOM contract 必须存在，供旧样式、搜索定位和自动化验收使用。（2026-06-07 已通过：`networkSummary/addNetworkBtn/networkForm/networkName/networkCompany/networkRole/networkStatus/networkChannel/networkNextStep/networkNotes/networkList` 缺失 0，`84-live-network-contract-fixed.png`）
- 页面标题、说明、空态、表单 placeholder、按钮 title/aria-label 不得显示 raw i18n key。（2026-06-07 已通过：raw key 列表为空）
- 表单初始应隐藏，点击 `#addNetworkBtn` 后展开。（2026-06-07 已通过：初始 `formHidden=true`，点击后 `formHidden=false`，`85-live-network-add-form-fixed.png`）
- 状态 select 选项必须保留上线版五项：`To reach out / Contacted / Follow-up / Warm / Archived`。（2026-06-07 已通过）
- 新增保存、编辑回填、删除联系人必须可用。（2026-06-07 已通过：创建 `QA NET` 临时联系人后 summary 变为 `1 个联系人 - 1 活跃跟进`；编辑回填 `QA NET / QG LAB / ALUM / CRUD TEST`，保存为 `CRUD TEST EDIT` 后 reload 仍保留；随后删除并 reload 后回到空态，临时数据已清理。截图 `149-live-network-crud-edit-persisted.png`、`150-live-network-crud-delete-persisted.png`）

备注：

- 这次修复保持当前 React state / page API 保存逻辑，没有回退旧 vanilla controller。
- React 侧新增 `data-network-id`，用于后续全局搜索 spotlight 或浏览器自动化定位联系人卡。

### 4.16 Resume

功能必查：

- 旧版 Resume DOM contract 必须存在，供旧样式、旧 controller 迁移验证和自动化验收使用。（2026-06-07 已通过：`resumeSummary/resumeForm/resumeText/reviewResumeBtn/saveResumeBtn/resumeReview` 缺失 0，`86-live-resume-contract-fixed.png`）
- 页面标题、说明、textarea placeholder、review/save 按钮、review 空态不得显示 raw i18n key。（2026-06-07 已通过：raw key 列表为空）
- 首屏应显示 `简历模块`、`LLM 修改简历`、`保存简历` 和 review 空态文案。（2026-06-07 已通过）
- 保存简历、本地 review fallback、LLM review 请求/失败回退必须可用。（2026-06-07 已部分通过：真实浏览器输入 `BUILT DASHBOARD EXCEL / ANALYZED MARKET NOTES` QA smoke 文本后点击 `保存简历`，reload 稳定后文本保留；点击 `LLM 修改简历` 后在无 endpoint 情况下走本地 fallback，生成 3 条建议并持久化。截图 `148-live-resume-save-review-fixed.png`。2026-06-08 已追加通过：in-app Browser 在 Settings 保存临时兼容 endpoint `http://127.0.0.1:8787/interview` 后，Resume 点击 `LLM 修改简历` 真实 POST `/interview`，服务端日志包含 `task=resume_review/model/language/graduationTerm/resume`，返回 3 条 `Endpoint smoke` 建议并渲染到 `#resumeReview`，无 overlay/overflow。截图 `298-iab-settings-llm-endpoint-saved.png`、`299-iab-resume-live-endpoint-review.png`、状态 `299-iab-resume-live-endpoint-summary.json`。）

备注：

- 根因是 React 组件用了不存在的 `resumeModuleTitle/resumeReviewAction/resumeSave` key；由于 `t()` 会返回 key 本身，fallback 不会触发。现已改回上线版已有 `resumeModule/reviewResume/saveResume`。
- 这次只恢复 UI/DOM contract，不触发 LLM review 或保存当前 QA 账户简历。

### 4.17 Memory

功能必查：

- 旧版 Memory DOM contract 必须存在，供旧样式、搜索定位、文件读取和自动化验收使用。（2026-06-07 已通过：`addResourceBtn/resourceForm/resourceTitle/resourceType/resourceFile/resourceContent/resourceSources/resourceList/clearTodayBtn/historyList` 缺失 0，`91-live-memory-contract-fixed.png`）
- 页面标题必须保留上线版语义：资源区为 `资料`，历史区为 `记忆`，不得显示 `memoryResources/resourceTitle/resourceContent` 等 raw key。（2026-06-07 已通过）
- 资料表单必须默认保留在 DOM 中但隐藏，点击 `#addResourceBtn` 后展开并自动聚焦 `#resourceTitle`。（2026-06-07 已通过：初始 `formHidden=true`，点击后 `formHidden=false` 且 `activeElementId=resourceTitle`，`92-live-memory-add-form-fixed.png`）
- 表单字段必须恢复旧版结构：标题、类型 select、文件 input、内容 textarea、来源 URL textarea、保存按钮。（2026-06-07 已通过：`resourceFile` accept 为 `.tex,.txt,text/*,image/*`，类型选项为 `tex/image/link/note`）
- 文本资料新增保存必须写入 `userState.resources` 并在 reload 后持久化。（2026-06-07 已通过：真实键盘输入 `QA MEM` / `MEMORY NOTE SAVE RELOAD`，点击保存后表单收起并出现资源卡；reload 稳定后 `data-resource-id` 卡片仍存在，10 个旧 id 缺失 0，`151-live-memory-resource-save-persisted.png`）
- TeX/txt 读取、小图片 dataURL 保存、大图片文件名 fallback、历史撤销必须走当前 React user-state 数据流。（2026-06-07 已通过：临时本地账号通过真实 file input 上传 `qa-memory-formula.tex`、`qa-memory-small.png`、`qa-memory-large.png`，reload 后 3 条资源仍存在；点击 `clearTodayBtn` 后历史从 2 条变 1 条、latest entry 不再显示，localStorage 也只剩 old entry，`230-cdp-memory-file-upload-undo-summary.json`）

备注：

- 这次修复保持当前 React `pageApi.memory` / Zustand user state 数据流，没有回退旧 `src/modules/memory/index.js`。
- 旧版文件读取行为已迁到 React 组件：小图片读为 dataURL，超过 1.5MB 的图片只写入文件名和 KB，其他文本文件按 TeX/txt 读取到内容区。
- 当前 in-app Browser 已提交一条 `QA MEM` 文本资料用于验证保存链路；React/GitHub 旧版均没有资料删除 UI，因此这条 QA 资源会留在当前 QA 账户中。后续 Memory 仍可继续补测外部链接 embed 细节，但本地文件上传和历史撤销主流程已经由临时账号覆盖。

### 4.18 Plan

功能必查：

- 旧版 Plan DOM contract 必须存在，供旧样式、语言文本、今日待办/计划控制器和自动化验收使用。（2026-06-07 已通过：`editPrepPlanBtn/prepPlanSetupForm/prepRoleSelect/prepHoursSelect/prepPlanDashboard` 缺失 0，`95-live-plan-contract-fixed.png`）
- 无计划状态下 setup form 必须显示，dashboard 和 edit button 必须常驻 DOM 但隐藏。（2026-06-07 已通过：`setupHidden=false`、`dashboardHidden=true`、`editHidden=true`）
- setup 默认值必须对齐上线版：`prepTrack=internship`、`prepSeason=2027-summer`、`prepRole=quantTrading`、`prepHours=8`、`prepDiagnostic=take`。（2026-06-07 已通过）
- 目标方向和每周投入 select 必须可真实切换。（2026-06-07 已通过：切到 `quantResearch` 和 `12` 后 DOM value 更新，截图 `96-live-plan-selects-fixed.png`；追加深测中提交编辑为 `quantDeveloper` / `12`）
- 有计划状态下必须验证 edit button 展开表单、dashboard 显示、任务完成 toggle、任务 `开始` 跳转、diagnostic start/skip/submit、Todo dock 同步。（2026-06-07 已通过：真实点击 `制定计划` 后 dashboard 显示 4 个任务和 8 题 baseline；空提交显示 `还有 8 题未作答。`；勾选 8 题后提交变为 `Baseline 0/8`；点击 `调整目标` 后 setup 回填当前计划，改为 `quantDeveloper` / `12` 并提交后 dashboard 为 `2027 Summer · Quant Developer`、`12 小时/周`、5 个任务；勾选第一条任务后显示 `1/5`，reload 后仍为 `1/5`；Todo dock 同步当前 prep 今日计划，可新增并完成自定义任务。截图 `153-live-plan-create-edit-diagnostic-todo-persisted.png`、`165-live-todo-dock-open-fixed.png`、`166-live-todo-dock-add-complete-fixed.png`、`167-live-todo-dock-close-fixed.png`）
- 任务 `开始` 必须在 React route 下进入目标模块并设置可见筛选状态。（2026-06-07 已通过：修复后点击 Plan 的 LeetCode 任务进入 `/problems`，active theme 为 `leetcode`，summary 为 `LeetCode · 156 题`，分页 `第 1 / 7 页 · 共 156 题`，无 Vite overlay/error log。截图 `154-live-plan-todo-open-problems-theme-fixed.png`）

备注：

- 这次修复保持当前 React `planPageApi` / prepPlan 数据流，没有回退旧 `src/modules/plan/index.js`。
- React 任务按钮也补回旧版 `data-prep-toggle-task/data-prep-open/data-prep-query` 属性，方便旧自动化和搜索定位复用。
- 本轮为了验证完整链路，当前 QA 账户已写入一条 `2027 Summer · Quant Developer`、`12 小时/周`、`Baseline 0/8`、`1/5` 今日完成的备战计划。

### 4.19 Companies

功能必查：

- 旧版 Companies DOM contract 必须存在，供旧样式、全局搜索 spotlight 和自动化验收使用。（2026-06-07 已通过：`companiesPageTitle/companiesSummary/companyTierFilter/companyOverviewList` 缺失 0，`97-live-companies-contract-fixed.png`）
- 页面标题、summary、tier filter aria label、全部公司按钮和公司卡按钮不得显示 raw i18n key。（2026-06-07 已通过）
- 公司列表必须显示真实数据，且每张公司卡保留 `data-company-card`、`data-company-practice`、`data-company-careers`。（2026-06-07 已通过：13 张卡、13 个刷题按钮、13 个官网按钮）
- Tier 筛选必须可点击并更新 active/aria 状态与列表数量。（2026-06-07 已通过：点击 `Tier S` 后 activeTier=`s`、`aria-pressed=true`、列表为 5 家 Tier S 公司，`98-live-companies-tier-filter-fixed.png`）
- `刷该公司题` 必须进入 `/problems` 并带入公司 filter。（2026-06-07 已通过：点击 Jane Street 后 URL 为 `/problems`，active company 为 `jane-street`，分页显示 133 题，`99-live-companies-practice-entry-fixed.png`；追加复验显示当前点击后 `/problems` 有 24 张题卡且 active company 仍为 `jane-street`，无 Vite overlay，`128-live-companies-practice-current-reverify.png`）
- `打开官网` 保留真实 `data-company-careers` 和 click handler；2026-06-08 已用独立临时 profile 的 Google Chrome 验证 Jane Street careers button 打开新标签，popup URL 为 `https://www.janestreet.com/join-jane-street/open-roles/`，原 `/companies` 页面保持稳定且无 overlay/overflow。

备注：

- 这次修复保持最新 React `companiesHooks` / `problemNavigationBundle` 数据流，没有回退旧 `src/modules/companies/index.js`。
- 判断公司 filter 是否生效时，不要用 `#problemCompanyClearBtn` 的文本作为唯一信号；该按钮即使 filter 生效也显示 `全部公司`。应以 active company card、清除按钮 hidden 状态、分页总数和题卡公司标记为准。

### 4.20 Jobs

功能必查：

- 旧版 Jobs DOM contract 必须存在，供旧样式、语言文本、全局搜索 spotlight 和自动化验收使用。（2026-06-07 已通过：`jobsSummary/refreshJobsBtn/jobsList` 缺失 0，`100-live-jobs-contract-fixed.png`）
- 页面标题、summary、岗位类型 aria label、刷新按钮 title/aria label、筛选按钮不得显示 raw i18n key。（2026-06-07 已通过）
- 岗位列表必须显示真实 seed / saved 数据，且每张岗位卡保留 `data-job-id`、`role="link"`、`aria-label` 和申请链接 `href`。（2026-06-07 已通过：6 条岗位，前 5 条申请链接均为真实外部 URL）
- `全部 / Internship / Full-time` 筛选必须可点击并更新 active/aria 状态与列表数量。（2026-06-07 已通过：点击 `Internship` 后 activeFilter=`internship`，列表从 6 条收窄到 3 条，`101-live-jobs-filter-fixed.png`）
- `#refreshJobsBtn` 必须可点击，且不触发 runtime error / Vite overlay。（2026-06-07 已通过：点击后仍保留 `internship` 筛选和 3 条卡片，`102-live-jobs-refresh-click-fixed.png`）
- 外部申请链接保留真实 `href`；本轮未点击打开，避免验收中跳出本地应用。

备注：

- 这次修复保持当前 React `jobsPageApi` / jobs facade 数据流，没有回退旧 `src/modules/jobs/index.js`。
- React 侧补回 `data-job-filter` 是为了让旧语言文本、全局搜索/自动化和浏览器验收有稳定 selector；实际筛选仍由 React state 驱动。

### 4.21 Courses

功能必查：

- 旧版 Courses DOM contract 必须存在，供旧样式、语言文本、全局搜索 spotlight 和自动化验收使用。（2026-06-07 已通过：`coursesSummary/learningPathTitle/learningPathHint/coursePathList/courseList` 缺失 0，`103-live-courses-contract-fixed.png`）
- 页面标题、summary、学习路径标题/提示、空态、课程按钮不得显示 raw i18n key。（2026-06-07 已通过）
- 课程列表必须显示 seed / saved 数据，且每张课程卡保留 `data-course-id`、source/action buttons、note textarea 和外部链接。（2026-06-07 已通过：8 张课程卡，前 5 张均有 `data-course-action`，notes 绑定 `data-course-note`）
- `加入路径` 必须更新学习路径和卡片 active 状态。（2026-06-07 已通过：点击 AtypicalQuant 后 `#coursePathList` 出现 1 条，卡片 path button active，`104-live-courses-add-path-fixed.png`）
- source 切换必须更新 active source，并保留播放器 iframe 或 fallback。（2026-06-07 已通过：StatQuest 切到备用 source 后 activeSource 更新，player/fallback 存在，`105-live-courses-source-switch-fixed.png`）
- 验收结束后应移出临时路径，避免污染 QA 账户学习路径。（2026-06-07 已执行：pathCount 回到 0）
- 外部课程链接保留真实 `href`；本轮未点击打开，避免跳出本地应用。

备注：

- 这次修复保持当前 React `coursesPageApi` / course state 数据流，没有回退旧 `src/modules/courses/index.js`。
- Courses 暴露了一个底层状态更新问题：原 `setUserPatch` 原地修改 `userState.value`，React external store snapshot 引用不变，点击后不刷新。该底层修复会同时改善其他通过 page API 写 user state 的 React 页面。

### 4.22 PK

功能必查：

- 旧版 PK DOM contract 必须存在，供旧样式、旧 runtime 迁移验证和自动化验收使用。（2026-06-07 已通过：`startPkBtn/pkUserScore/pkOpponentName/pkOpponentScore/pkProblem/pkForm/pkAnswer/pkRevealBtn/pkFeed` 缺失 0，`106-live-pk-contract-fixed.png`）
- 初始状态必须显示 `Online Quant`、比分 0/0、提示 `点击匹配开始。`、textarea placeholder 和 reveal button title。（2026-06-07 已通过）
- 点击 `匹配在线 Quant` 必须生成对手、题目、`?` 对手分和 feed。（2026-06-07 已通过，`107-live-pk-start-fixed.png`）
- 填写答案并提交后必须更新用户分、对手分、结果 feed、XP feed，并清空答案。（2026-06-07 已通过：示例比分 49-83，feed 显示 `获得 Option +10 XP`，`108-live-pk-submit-fixed.png`）
- Reveal 必须显示参考答案 feed，且不触发 runtime error / Vite overlay。（2026-06-07 已通过，`109-live-pk-reveal-fixed.png`）

备注：

- 这次修复保持当前 React `pkPageApi` 和 `modules/pk/session.js` 逻辑，没有回退旧 `src/modules/pk/index.js`。
- 本轮真实提交会写入 1 条 QA PK 训练记录和对应 XP，用于验证保存链路；没有额外提交多局。

### 4.23 Content / Social Pages

需要逐页跑基本 CRUD / navigation：

- `news`：seed/list/filter/detail/back/form submit/reload persistence/refresh、Overview ticker 聚焦详情已通过；4 个原站链接均为安全 `https`、`target="_blank"`、`rel="noreferrer"`。2026-06-08 独立 Google Chrome 已验证第一条 News 原站点击打开新标签，popup host 为 `m.investing.com`，原 `/news` 页面保持稳定且无 overlay/overflow/significant console log。
- `jobs`：contract/filter/refresh/global-search spotlight 已通过；6 个申请链接均为安全 `https`、`target="_blank"`、`rel="noreferrer"`。2026-06-08 独立 Google Chrome 已验证 Jane Street 申请链接打开新标签，popup host 为 `www.janestreet.com`，原 `/jobs` 页面保持稳定且无 overlay/overflow/significant console log。
- `companies`：contract/tier filter/practice company 已通过；官网入口是 React button + `openExternalUrl`。2026-06-08 独立 Google Chrome 已验证 Jane Street careers button 打开新标签，popup host 为 `www.janestreet.com`，原 `/companies` 页面保持稳定且无 overlay/overflow/significant console log。
- `courses`：contract/path/source switch/global-search spotlight 已通过；8 个课程原站链接均为安全 `https`、`target="_blank"`、`rel="noreferrer"`。2026-06-08 独立 Google Chrome 已验证 AtypicalQuant 原站链接打开新标签，popup host 为 `www.youtube.com`，原 `/courses` 页面保持稳定且无 overlay/overflow/significant console log。
- `library`：search/kind filter/practice 已通过；PDF auth guard 已真实浏览器通过；真实本地 cloud API reader-token、PDF iframe 打开/关闭、open-new href 和 reload 稳定性均已通过。
- `experiences`：contract/枚举/侧栏/社群入口/create/edit/stage filter/share community/sharedPostId/delete/reload persistence 已通过。
- `community`：contract/raw key/filter/私信入口/媒体预览/发帖/点赞/评论/删除/reload persistence 已通过。
- `messages`：contract/空态/composer disabled/thread 切换/发送/标记已读/未读徽标/reload 持久化/Community 私信入口已通过。
- `network`：contract/表单展开/raw key/create/edit/delete/reload persistence 已通过。
- `resume`：contract/raw key/save/local fallback review/reload persistence 已通过；in-app Browser 已通过临时兼容 endpoint 验证真实 POST `/interview`、返回 review item 解析、UI 渲染和无 overlay/overflow。
- `memory`：contract/表单展开/raw key/text resource save/reload persistence、`.tex`/小图片/大图片文件上传、撤销最新记录均已通过。
- `plan`：contract/role-hours select/create/edit/diagnostic validation+submit/task completion reload persistence/task open to Problems theme 已通过；Todo dock 已通过真实浏览器 open/add/complete/close，同步显示当前 prep 今日计划和自定义任务。
- `account`：contract/国家地区联动/raw key、保存、头像上传/清除、简历上传、改邮箱密码、reload 持久化和 logout 均已通过。
- `pk`：contract/start/submit/reveal/feed 已通过。

## 5. 修复原则

后续 coding agent 必须遵守：

1. 不要回退到旧的大 HTML 或旧的大 vanilla module。
2. 保持最新 React route/page 结构。
3. 每个旧 id / class / data attribute 都要有明确处理结论：保留、React 替代、删除。
4. 不要继续“凭截图调 CSS”。先确认旧版 selector 为什么没有命中，再做最小映射。
5. 不要把旧 HTML 整块塞进 JSX。只迁需要的结构和功能契约。
6. 对还由旧 bootstrap 控制的功能，要么保留 DOM contract，要么把控制器依赖迁到 React state/ref。
7. 每修一个页面，必须同步补一条浏览器验收记录到本文档或 `docs/SMOKE_CHECKS.md`。

## 6. 推荐修复顺序

第一批，修用户已看到的明显问题：

1. `overview`：恢复上线版视觉和 layout，解决鲨鱼/hero/cards/ticker。
2. `problems`：做完整浏览器回归，确认搜索/主题/难度/题卡不再归零。
3. `shell + global search`：确认搜索输入、结果、跳转和 spotlight。
4. `auth cover`：确认当前封面目标到底是新版还是 GitHub 上线版。

第二批，修最高风险复杂功能：

5. `poker`
6. `tools`
7. `settings`
8. `interview`
9. `library`

第三批，补齐 CRUD / 内容页：

10. `news`
11. `experiences`
12. `community`
13. `messages`
14. `network`
15. `resume`
16. `plan`
17. `companies`
18. `jobs`
19. `courses`
20. `memory`
21. `account`
22. `pk`

## 7. 浏览器验收矩阵

后续修复时建议启动：

```bash
npm run dev -- --host 127.0.0.1 --port 5179
```

每条验收都记录：

- URL
- viewport：desktop `1440x900`、mobile `390x844`
- console error：0
- Vite overlay：无
- document horizontal overflow：无
- 页面首屏截图与 GitHub 上线版差异说明
- 点击/输入步骤和结果

最低必须跑的 8 条深测：

1. Auth：logout -> login -> register tab -> login success -> protected route restore。
2. Overview：ticker、hero、summary、problem completion、leaderboard、todo dock。
3. Problems：cards/search/theme/difficulty/detail/favorite/completed/pagination。
4. Global search：module/problem/job/company/course/skill/news result click。
5. Settings：language/country-region/LLM/cloud/google id/export-import/reload。
6. Interview：start/hint/reveal/submit/favorite/exit/resume。
7. Poker：seat/bot/start/action/settings/local or online fallback。
8. Library/Tools：reader/practice、mental math drill、market making。

## 8. 当前 release 状态

不能标记 release-ready。

可以标记为：

- React route migration：完成。
- Static gates：通过。
- Browser parity QA：接近完成。已覆盖 Overview contract/进度卡/XP/热力图、Problems、全局搜索、Tools、Poker local + online fallback、Interview setup/onboarding、Settings 保存/同步/export/import/reset/logout/Google Client ID save+clear、Library search/filter/practice、News seed/filter/detail/form submit/reload/refresh、外部链接新标签、Experiences contract/枚举/侧栏/社群入口/create/edit/filter/share/delete/reload persistence、Community contract/raw key/filter/私信入口/media/post/like/comment/delete/reload persistence、Messages contract/空态/composer disabled/thread/send/unread/reload persistence、Network contract/表单展开、Resume contract/raw key/local fallback/真实 endpoint review、Memory contract/表单展开/文本/文件/undo、Account contract/国家地区联动/save/upload/password/logout、Plan contract/create/edit/diagnostic/task persistence/task navigation、Companies contract/tier filter/practice entry、Jobs contract/filter/refresh、Courses contract/path/source switch、PK contract/start/submit/reveal、移动端无横向溢出、以及全部 21 个 route 的桌面/移动端视觉冒烟。
- UI parity with GitHub online version：route-level 首屏等价已完成。全部 21 个 route 已与临时运行的 GitHub 上线基准做 baseline/current 对照截图和 active-route scoped DOM 检查，actionable issues 为 0。仍未穷尽所有交互后状态的 pixel-level 对照，因此后续 polish 应以具体交互截图为单位补验。
- Function parity with GitHub online version：接近完成；本地 OpenAI-backed LLM resume review 和 PDF question generation 已通过，Google Sign-In iframe 初始化也已通过最新 in-app Browser 复验，真实 Google provider 账号登录边界已由 production-boundary / release-readiness 证据签收，静态 build 产物 runtime config 已不再丢失本地公开 endpoint。剩余主要是部署环境下的生产 URL 复验。外部链接新标签行为已用独立 Google Chrome 通过。

下一位 coding agent 的目标不是继续迁移页面数量，也不是重复首屏 route parity；应只在具体交互截图出现新差异时做定点修复。最终 release-ready 已由真实 Google provider token、生产边界脚本和 release-readiness gate 签收；后续生产复验应针对新的部署变更或新交互差异。

## 9. 真实浏览器截图记录

截图目录：`docs/browser-audit-screenshots/`

| 截图 | 验收点 |
|---|---|
| `01-login-url-showing-overview.png` | 已登录状态访问 `/login`，实际显示 AppShell/Overview，URL 未重定向到 `/`。 |
| `02-problems-after-overview-click.png` | 从 Overview 点击“打开题库”后进入 `/problems`。 |
| `03-problems-search-probability.png` | Problems 搜索 `probability` 后列表更新。 |
| `04-problems-search-medium-filter.png` | Problems 在搜索状态下点击 `Medium`，列表筛选为 Medium 概率题。 |
| `05-global-search-jane-street.png` | 顶部全局搜索输入 `Jane Street`，出现结果面板。 |
| `06-global-search-click-company.png` | 点击全局搜索第一条公司结果后进入 `/companies`。 |
| `07-mobile-overview.png` | `390x844` 移动端 Overview，无 document-level 横向溢出。 |
| `08-mobile-problems.png` | `390x844` 移动端 Problems 首屏。 |
| `09-mobile-problems-cards-scrolled.png` | `390x844` 移动端 Problems 滚动到题卡区域，确认题卡可见。 |
| `10-desktop-overview.png` | `1440x900` 桌面 Overview 当前视觉状态。 |
| `18-live-current-browser-state.png` | 追加 in-app browser 当前总览截图；确认 Overview 可见，同时记录 hero 标题 caret 残留。 |
| `19-live-click-open-problems.png` | 追加 in-app browser 点击 `打开题库` 后进入 `/problems`，题单和题卡区域可见。 |
| `20-live-click-medium-filter.png` | 追加 in-app browser 点击 `Medium 1438` 后，Medium 筛选 active，题卡区域显示 Medium 题。 |
| `129-live-problems-detail-reveal-toggle-fixed.png` | Problems 深测：题卡详情 Hint/Answer 已 reveal，完成/收藏状态可在详情页切换并显示 active。 |
| `132-live-problems-hot100-expanded-fixed.png` | Problems 深测：LeetCode Hot 100 题卡真实点击展开，列表显示 100 条题目且无 Vite overlay。 |
| `139-live-problems-hot100-toggle-react-fixed.png` | Problems 深测：Hot 100 第一题完成按钮切换为 `is-done`，显示 `已完成`，Hot 卡和 100 条列表保持存在。 |
| `140-live-problems-hot100-toggle-restored-react-fixed.png` | Problems 深测：再次点击 Hot 100 第一题完成按钮后恢复未完成，集合区和 Hot 列表未被 legacy renderer 覆盖。 |
| `144-live-skills-radar-hover-react-owned-fixed.png` | Skills 深测：点击 radar skill 后 React-owned hover 生效，legend/card/tooltip 同步显示 active。 |
| `145-live-skills-global-search-skill-spotlight-fixed.png` | 全局搜索深测：搜索 `principal logarithm` 并点击 `能力值 Complex Numbers` 后，目标技能卡 spotlight 滚动可见且保持 active。 |
| `21-live-overview-caret-fixed.png` | 修复后 Overview 截图；hero 标题末尾不再显示蓝色 caret。 |
| `22-live-login-redirect-fixed.png` | 修复后已登录访问 `/login` 的截图；URL 为 `/`，显示 Overview。 |
| `123-live-overview-restored-in-app.png` | 追加 in-app browser 截图；Overview 首屏渲染正常，hero/summary 可见。 |
| `124-live-overview-restored-fullpage-in-app.png` | 追加 in-app browser fullPage 截图；Problem completion、Experience rhythm、Contribution heatmap 和排行榜可见。 |
| `23-live-tools-initial.png` | Tools 首屏截图；Mental Math UI 可见，但修复前开始按钮无响应。 |
| `24-live-tools-after-start.png` | 修复前点击开始后选项仍 disabled，用于记录回归。 |
| `28-live-tools-start-fixed.png` | 修复后点击开始，Mental Math 计时开始，5 个选项 enabled。 |
| `29-live-tools-answer-fixed.png` | 修复后点击答案，分数/题号推进。 |
| `30-live-tools-skip-fixed.png` | 修复后点击 Skip，题号继续推进。 |
| `31-live-tools-market-quote-fixed.png` | 修复后 Market Making 默认报价提交并得分。 |
| `32-live-tools-open-poker-fixed.png` | Tools 的 Open table 进入 `/poker`；修复前暴露 Poker No room data。 |
| `125-live-tools-count-time-select-fixed.png` | Tools 真实浏览器选择题量 `10` 和时间 `5:00` 后启动，session 显示 `Question 1/10` 且计时运行。 |
| `33-live-poker-table-fixed.png` | 修复后 `/poker` 桌面、座位、HUD 和 lobby 渲染。 |
| `34-live-poker-fill-demo-fixed.png` | Poker 点击 Fill demo 后填满 demo 玩家，Start hand 可用。 |
| `35-live-poker-start-hand-fixed.png` | Poker 点击 Start hand 后进入 Preflop，action buttons 可用。 |
| `36-live-poker-quick-bet-fixed.png` | Poker 点击 quick bet 后 Raise 输入值更新。 |
| `37-live-interview-initial.png` | Interview 初始 setup 截图，语言/模式控件和高级设置可见。 |
| `38-live-interview-toggle-before-fix.png` | 修复前点击 English/真实面试后 active 仍停在中文/训练练习，用于记录回归。 |
| `41-live-browser-tool-smoke-current.png` | in-app Browser 工具烟测截图，当前 `/interview` 可截图。 |
| `42-live-browser-tool-click-english.png` | 修复前/烟测阶段点击 English 后 DOM 仍显示中文 active，用于记录回归。 |
| `43-live-interview-toggle-fixed.png` | 修复后点击 English，语言 active/aria 状态正确。 |
| `44-live-interview-mode-fixed.png` | 调试期模式切换截图；暴露 page API mode defs 未透出问题。 |
| `45-live-interview-toggle-fixed-final.png` | 最终修复后 English 与真实面试均 active，DOM 为 `data-interview-lang="en"`、`data-interview-mode="live"`。 |
| `46-live-interview-start-live-english.png` | English + Live 点击进入模拟面试后，session-only console 可见，transcript 显示 Live mock in English。 |
| `47-live-interview-actions-fixed.png` | 修复后 focus onboarding actions 显示 12 项。 |
| `48-live-interview-action-next-step.png` | 修复前 action 点击不推进，用于记录回归。 |
| `49-live-interview-action-advances-fixed.png` | 修复后点击 Probability & stats 推进到 difficulty step。 |
| `51-live-interview-difficulty-action-advances.png` | 点击 Medium 推进到 scope step 的中间截图。 |
| `52-live-interview-scope-actions-visible.png` | 修复前/中间态 scope 文案出现但 actions 未显示，用于记录回归。 |
| `53-live-interview-latest-actions-visible.png` | 最终修复后 scope actions 显示 3/5/10 questions 和 30 minutes。 |
| `170-live-interview-persona-actions-restored.png` | Interview typewriter 修复后，persona action chips 不再被 `.message` 覆盖清空。 |
| `171-live-interview-finalize-question-fixed.png` | Interview onboarding 最后一项后成功 finalize 并进入 Q1，修复 `finalizeInterviewOnboarding is not a function`。 |
| `181-cdp-live-ready-after-typing.png` | Chrome/CDP Live 深测：English + Live 进入 Q1/3，Hint/Reveal 隐藏，answer 可输入。 |
| `182-cdp-live-exited-resume-visible.png` | Chrome/CDP Live 深测：点击 Exit 并接受 confirm 后回到 setup，`继续上次面试` 可见。 |
| `183-cdp-live-resumed-q1.png` | Chrome/CDP Live 深测：点击 Resume 后恢复同一轮 Live Q1/3。 |
| `183-cdp-live-exit-resume-summary.json` | Chrome/CDP Live 深测状态 JSON：记录 ready/exited/resumed 三段 DOM 状态。 |
| `188-cdp-login-before-click.png` | in-app browser 当前截图/点击通道超时后的真实 Chrome/CDP fallback，登录页点击前截图。 |
| `189-cdp-login-register-click.png` | 真实 Chrome/CDP fallback 点击 `注册` 后，注册表单字段出现。 |
| `189-cdp-login-click-summary.json` | 真实 Chrome/CDP fallback 登录页点击摘要，记录点击坐标、文本和页面状态。 |
| `216-cdp-login-before-real-register-click.png` | Browser 插件复查：`iab` 可连接/显示但截图和 DOM 超时；真实 Chrome/CDP 稳定 target 流程中点击 `注册` 前截图。 |
| `217-cdp-login-after-real-register-click.png` | Browser 插件复查：真实 Chrome/CDP 坐标点击 `注册` 后，注册表单可见。 |
| `217-iab-call-and-real-browser-click-screenshot-summary.json` | Browser 插件复查状态 JSON：记录 `iab` 超时边界、CDP fallback target、点击坐标和 `activeTab=register/registerVisible=true`。 |
| `190-cdp-practice-q1-ready-after-submit-hook-fix.png` | Chrome/CDP Practice 深测：English + Practice onboarding 完成后进入 Q1/3，Hint/Reveal 可见，stale chips 清空。 |
| `191-cdp-practice-hint-after-submit-hook-fix.png` | Chrome/CDP Practice 深测：点击 Hint 后 transcript 追加 `Hint:`。 |
| `192-cdp-practice-reveal-after-submit-hook-fix.png` | Chrome/CDP Practice 深测：点击 Reveal 后 transcript 显示 `Reference answer`。 |
| `193-cdp-practice-submit-complete-actions.png` | Chrome/CDP Practice 深测：输入答案并 submit 后显示评分和 complete actions，收藏按钮 enabled。 |
| `194-cdp-practice-favorite-saved.png` | Chrome/CDP Practice 深测：点击 Save favorite 后按钮变为 Saved，收藏夹 summary 为 `1 条复盘` 且列表出现 item。 |
| `194-cdp-practice-full-flow-summary.json` | Chrome/CDP Practice 深测状态 JSON：记录 Q1/Hint/Reveal/Submit/Favorite 的 DOM 状态和点击坐标。 |
| `195-cdp-interview-voice-unsupported.png` | Chrome/CDP Interview 深测：点击语音按钮后页面稳定，语音按钮和 answer/file 控件仍可用；headless 环境不证明真实麦克风识别。 |
| `196-cdp-interview-answer-file-submit.png` | Chrome/CDP Interview 深测：通过真实 file input 上传 `qa-interview-note.txt` 并提交答案，transcript 包含 `[Attachment: qa-interview-note.txt]`。 |
| `197-cdp-interview-completed-export-visible.png` | Chrome/CDP Interview 深测：连续完成 3 题后 `重新开始` 和 `导出 PDF` 可见。 |
| `198-cdp-interview-report-window.png` | Chrome/CDP Interview 深测：点击 `导出 PDF` 后打开 `QuantGym Mock Interview Report` 报告窗口，包含完成状态、总分和 Q1/Q2/Q3 review。 |
| `198-cdp-interview-attachment-voice-export-summary.json` | Chrome/CDP Interview 深测状态 JSON：记录语音按钮、附件提交、3 题完成、导出报告窗口的 DOM 状态和点击坐标。 |
| `199-cdp-interview-pdf-source-upload.png` | Chrome/CDP Interview PDF source 深测：高级设置中选择 PDF source，上传临时 PDF，并在上传触发 re-render 后写入 mock endpoint。 |
| `200-cdp-interview-pdf-generated-q1.png` | Chrome/CDP Interview PDF source 深测：mock endpoint 根据上传 PDF 返回题目，页面进入 `Q1/3` 并显示 `PDF Fixture Question 1`。 |
| `200-cdp-interview-pdf-source-summary.json` | Chrome/CDP Interview PDF source 状态 JSON：记录上传状态、生成后 DOM 状态，以及 mock endpoint 收到的 `generate_pdf_questions` 请求。 |
| `54-live-settings-before-contract-fix.png` | Settings 修复前截图/探针；首次固定等待时未读到 section，后续确认原始 key 和 id 缺失。 |
| `55-live-settings-contract-fixed.png` | Settings 修复后旧版 14 个关键 id 全部存在，文案不再显示原始 i18n key。 |
| `56-live-settings-save-us.png` | Settings 国家/地区真实保存：切到 United States / Alabama 后显示“设置已保存。”。 |
| `57-live-settings-language-sync-restore.png` | Settings 语言真实保存：English 保存后 UI 文案变英文，再恢复中文/中国/上海。 |
| `58-live-settings-sync-feedback-fixed.png` | Settings 云同步按钮真实点击：无云端会话时显示明确提示。 |
| `126-live-settings-export-click-no-crash.png` | Settings 真实 in-app browser 点击 `导出备份` 后无 Vite overlay，导出/导入控件仍 enabled；该工具不支持 download event，后续已用 Chrome/CDP 补齐真实导出/导入。 |
| `201-cdp-settings-export-import-before.png` | Chrome/CDP Settings export/import 深测：临时账号进入 Settings，导出/导入控件和旧 id 可见。 |
| `202-cdp-settings-export-downloaded.png` | Chrome/CDP Settings export 深测：点击 `导出备份` 后真实下载 JSON，summary 记录文件名、payload version/user/state。 |
| `203-cdp-settings-import-memory-visible.png` | Chrome/CDP Settings import 深测：通过真实 file input 导入 JSON 后跳转 Memory，`QA IMPORT BACKUP RESOURCE` 资源卡可见。 |
| `203-cdp-settings-export-import-summary.json` | Chrome/CDP Settings export/import 状态 JSON：记录临时账号、点击坐标、下载文件 path、payload keys、导入资源和截图路径。 |
| `265-cdp-settings-reset-before.png` | Settings reset/logout 深测：临时当前账号含 entries/resources/problemStates/interviewExperiences/manual news，peer 账号含保留资源。 |
| `266-cdp-settings-reset-after.png` | Settings reset/logout 深测：点击 `resetBtn` 并接受 confirm 后，当前账号训练记录清空，仍保持登录，peer 账号资源未被误删。 |
| `267-cdp-settings-reset-memory-cleared.png` | Settings reset/logout 深测：reset 后进入 `/memory`，`QA SETTINGS RESET RESOURCE` 不再渲染且资源列表为空。 |
| `268-cdp-settings-logout-auth-visible.png` | Settings reset/logout 深测：点击 `logoutBtn` 后进入 `/login`，`#authShell/#loginForm` 可见，`auth.currentUserId` 为空。 |
| `268-cdp-settings-reset-logout-summary.json` | Settings reset/logout 深测状态 JSON：记录 before reset、after reset、Memory cleared、logout shell/auth 的所有断言，status 为 pass。 |
| `65-live-browser-tool-smoke.png` | in-app Browser 工具烟测：可见窗口连接到 `http://127.0.0.1:5179/library` 并成功截图。 |
| `66-debug-library-missing-search.png` | 调试截图：刷新竞态期 DOM snapshot 未读到 `#librarySearch`，后续确认 route root 已挂载且旧 id 存在。 |
| `66-live-library-search-question-filter.png` | Library 搜索 `probability` 并点击 `题单` filter，题单列表正确收窄。 |
| `67-debug-blank-after-build.png` | 调试截图：重新 build 后短暂 route 内容未读到，后续确认为刷新竞态而非源码缺失。 |
| `68-debug-library-practice-still-stuck.png` | 修复前真实点击 QuantGuide 练题后仍停在 `/library`，用于记录回归。 |
| `67-live-library-practice-fixed.png` | 修复后真实点击 QuantGuide 练题进入 `/problems`，页面显示 `题源：QuantGuide 题库` 且题库过滤为 1204 题。 |
| `127-live-library-pdf-reader-auth-guard.png` | Library 非云端 QA 账号点击 `green-book` 阅读后显示云端账号权限提示，reader overlay 保持关闭且无 Vite overlay。 |
| `275-cdp-library-cloud-reader-initial.png` | Library 云端 reader 深测：临时云端账号登录态进入 `/library`，绿皮书卡片和阅读按钮可见。 |
| `276-cdp-library-cloud-reader-open.png` | Library 云端 reader 深测：真实点击绿皮书阅读后，reader-token 200、PDF endpoint 206/200，iframe 渲染绿皮书 PDF 封面。 |
| `277-cdp-library-cloud-reader-closed.png` | Library 云端 reader 深测：点击关闭后 overlay 隐藏，body reader class 移除，iframe 回到 `about:blank`。 |
| `278-cdp-library-cloud-reader-reload.png` | Library 云端 reader 深测：reload 后 Library 和绿皮书卡片稳定可见，无 Vite overlay。 |
| `278-cdp-library-cloud-reader-summary.json` | Library 云端 reader 状态 JSON：记录 cloud auth、reader-token、PDF iframe、open-new href、close、reload 和 ignored Chrome PDF viewer storage error，status 为 pass。 |
| `69-debug-news-list-wait.png` | News 修复前调试截图：`/news` 显示“还没有新闻。”，记录 seed 新闻丢失回归。 |
| `69-debug-news-after-store-fix.png` | 修复 userStateStore selector 后，News 4 条 seed 新闻恢复。 |
| `69-live-news-initial-contract-fixed.png` | News 初始页真实浏览器验收：旧关键 id 缺失 0、4 条新闻、无 raw i18n key、无横向溢出。 |
| `70-live-news-topic-filter-fixed.png` | News 点击 `AI/算力` 主题筛选后 activeTopic 为 `aiInfra`，列表收窄到 2 条。 |
| `71-live-news-source-filter-fixed.png` | News 点击 `官方` 来源筛选后 activeSource 为 `official`，显示筛选空态。 |
| `72-live-news-detail-fixed.png` | News 点击第一条新闻进入详情，详情页旧 id 存在且来源链接保留。 |
| `73-live-news-back-to-list-fixed.png` | News 详情返回列表，`#newsList` 恢复且 4 条卡片可见。 |
| `74-live-news-form-contract-fixed.png` | News 点击添加按钮后表单展开，旧表单字段 id、保存/取消文案可见。 |
| `76-live-news-refresh-click-fixed.png` | News 点击刷新按钮后列表保留、无 Vite overlay、无 console error。 |
| `254-cdp-news-before-form-submit.png` | News 深测：临时本地账号进入 `/news`，旧列表 contract 缺失 0，4 条 seed 新闻可见。 |
| `255-cdp-news-form-filled.png` | News 深测：真实点击添加并填入标题、来源、URL、source type、skill、tags、summary、insight。 |
| `256-cdp-news-after-submit-list.png` | News 深测：提交后表单关闭，列表新增 `QA News Manual Submit 20260608`，localStorage `news` 为 5 条。 |
| `257-cdp-news-submit-detail.png` | News 深测：点击新新闻进入详情，标题、摘要、insight 和 `#newsDetailLink` href 均正确。 |
| `258-cdp-news-submit-reload-persisted.png` | News 深测：返回列表并 reload 后，新手动新闻仍可见且 localStorage 持久化。 |
| `258-cdp-news-form-submit-summary.json` | News 深测状态 JSON：记录 initial contract、submit persisted、detail view 和 reload persistence 的所有断言，status 为 pass。 |
| `77-in-app-browser-smoke-current.png` | in-app Browser 工具可见连接烟测，当前本地应用页面可截图。 |
| `78-in-app-browser-click-ai-filter.png` | in-app Browser 真实点击 News `AI/算力` 筛选，`aria-selected=true` 且列表为 2 条。 |
| `164-live-overview-news-ticker-detail-fixed.png` | in-app Browser 真实点击 Overview 快讯 ticker 后进入 `/news` 并打开 `#newsDetail`。 |
| `168-live-overview-leaderboard-selects-country-fixed.png` | Overview 排行榜真实下拉验收：metric 为 `LeetCode`，scope 为 `按国家`，国家筛选显示，摘要为 `LeetCode · 中国...`。 |
| `169-debug-overview-leaderboard-native-select-open.png` | 调试截图：in-app Browser 可聚焦 macOS 原生 `<select>`，但原生菜单不进入截图层，导致 `region` 项无法稳定点击验收。 |
| `259-cdp-overview-leaderboard-initial-seeded.png` | Overview leaderboard region 深测：临时账号 seed 上海/北京/California 本地榜单数据后，global view 显示 16 个 metric options 和 4 行榜单。 |
| `260-cdp-overview-leaderboard-country.png` | Overview leaderboard region 深测：metric=`leetcode`、scope=`country` 后国家控件显示/启用，地区控件隐藏/禁用，中国范围显示 3 行。 |
| `261-cdp-overview-leaderboard-region-shanghai.png` | Overview leaderboard region 深测：scope=`region` 后国家/地区控件均显示启用，默认上海范围显示 2 行并包含当前用户。 |
| `262-cdp-overview-leaderboard-region-beijing.png` | Overview leaderboard region 深测：地区切到北京后摘要为 `LeetCode · 中国 · 北京...`，榜单仅显示北京 seed 用户。 |
| `263-cdp-overview-leaderboard-region-us-california.png` | Overview leaderboard region 深测：国家切到 United States 后地区 options 为 51 项并归一到 California，榜单仅显示 California seed 用户。 |
| `264-cdp-overview-leaderboard-region-reload-persisted.png` | Overview leaderboard region 深测：reload 后 `metric=leetcode/scope=region/country=unitedStates/region=California` 和榜单行保持。 |
| `264-cdp-overview-leaderboard-region-summary.json` | Overview leaderboard region 深测状态 JSON：记录 initial/country/Shanghai/Beijing/US California/reload persistence 的所有断言，status 为 pass。 |
| `79-live-experiences-contract-fixed.png` | Experiences 修复后真实浏览器验收：旧 20 个关键 id 缺失 0、标题/说明无 raw key、默认枚举对齐底层数据。 |
| `80-live-experiences-community-link-fixed.png` | Experiences 点击 `查看社群面经` 后进入 `/community`。 |
| `247-cdp-experiences-initial.png` | Experiences 深测：临时本地账号初始进入 `/experiences`，旧 20 个关键 id 缺失 0，计数和已分享计数为 0。 |
| `248-cdp-experiences-after-create.png` | Experiences 深测：真实表单输入并保存 `QA Optiver Deep Flow` 后，卡片可见、计数为 1、localStorage 写入记录和标签。 |
| `249-cdp-experiences-after-edit.png` | Experiences 深测：真实点击编辑后修改 firm/outcome/reflection 并保存，UI 和 localStorage 均显示 `QA Optiver Edited Flow` / `Offer`。 |
| `250-cdp-experiences-after-share-community.png` | Experiences 深测：真实点击分享并确认后进入 `/community`，社区面经动态可见且 localStorage `community.posts` 持久化。 |
| `251-cdp-experiences-return-shared-badge.png` | Experiences 深测：返回 `/experiences` 后已分享统计为 1，卡片显示 `已分享` badge。 |
| `252-cdp-experiences-after-delete.png` | Experiences 深测：创建第二条未分享记录后真实删除并接受 confirm，UI 和 localStorage 中该记录移除。 |
| `253-cdp-experiences-reload-persistence.png` | Experiences 深测：reload 后只保留已分享的编辑记录，社区面经动态也仍然存在。 |
| `253-cdp-experiences-crud-share-summary.json` | Experiences 深测状态 JSON：记录 contract、create、edit、stage filter、share、return shared state、delete 和 reload persistence 的所有断言，status 为 pass。 |
| `81-live-community-contract-fixed.png` | Community 修复后真实浏览器验收：旧 6 个关键 id 缺失 0、页面标题/说明/发布按钮/筛选文案无 raw key。 |
| `82-live-community-experience-filter-fixed.png` | Community 点击 `面经分享` filter 后 active/aria-selected 状态正确。 |
| `240-cdp-community-initial-seeded.png` | Community 深测：临时本地账号进入 `/community`，seed 的 Bob 远端动态可见，页面标题/旧 id/raw key 状态正确。 |
| `241-cdp-community-media-preview.png` | Community 深测：真实 file input 上传小 PNG 后，`communityMediaPreview` 显示图片预览。 |
| `242-cdp-community-publish-media.png` | Community 深测：移除预览后再次上传并发布 `QA COMMUNITY POST WITH IMAGE 20260608`，新动态含图片、composer 清空、预览隐藏。 |
| `243-cdp-community-like-clicked.png` | Community 深测：真实坐标点击远端 Bob 动态点赞后，按钮 active、文案为 `已赞 - 1`，storage likes 包含当前用户。 |
| `244-cdp-community-comment-persisted.png` | Community 深测：真实键盘输入评论并提交后，Bob 动态渲染新评论，评论数为 1，storage comments 持久化。 |
| `245-cdp-community-delete-own-post.png` | Community 深测：真实点击自己动态的删除按钮并接受 confirm 后，新发 QA 动态从 UI 和 storage 移除。 |
| `246-cdp-community-reload-persisted.png` | Community 深测：reload 后 Bob 动态点赞/评论仍持久化，被删除的 QA 动态没有回流。 |
| `246-cdp-community-post-media-like-comment-delete-summary.json` | Community 深测状态 JSON：记录媒体预览/移除、发帖、点赞、评论、删除和 reload persistence 的所有断言，status 为 pass。 |
| `83-live-messages-contract-fixed.png` | Messages 修复后真实浏览器验收：旧 7 个关键 id 缺失 0、空态 raw key 为 0、无 thread 时 composer 隐藏并禁用。 |
| `234-cdp-messages-initial-seeded.png` | Messages 深测：临时本地账号 seed 两条私信 thread，页面默认选中最新 Carol thread，thread unread badges 为 1/1，全局聊天 badge 为 2。 |
| `235-cdp-messages-after-bob-read.png` | Messages 深测：真实点击 Bob thread 后 Bob 消息标记已读，Bob thread unread badge 消失，全局聊天 badge 2 -> 1。 |
| `236-cdp-messages-after-send.png` | Messages 深测：真实输入并发送 `Thanks, let us compare notes tomorrow.`，mine 消息可见，Bob thread 排到顶部，全局 unread 保持 1。 |
| `237-cdp-messages-after-reload.png` | Messages 深测：reload 后已发送消息、Bob read state 和全局 unread badge 均持久化。 |
| `238-cdp-community-private-entry.png` | Messages/Community 深测：Community 中 Alice 的远端动态显示 `私信` 按钮。 |
| `239-cdp-messages-after-community-private.png` | Messages/Community 深测：点击 Community `私信` 后进入 `/messages`，创建并选中 Alice thread。 |
| `239-cdp-messages-thread-send-unread-summary.json` | Messages 深测状态 JSON：记录 thread fallback、mark-read、send、reload persistence、Community 私信入口创建 thread 的所有断言，status 为 pass。 |
| `84-live-network-contract-fixed.png` | Network 修复后真实浏览器验收：旧 11 个关键 id 缺失 0、空态/placeholder 无 raw key、表单初始隐藏。 |
| `85-live-network-add-form-fixed.png` | Network 点击添加联系人后表单展开，默认状态为 `To reach out`，字段可见。 |
| `149-live-network-crud-edit-persisted.png` | Network CRUD 深测：创建 QA 联系人并编辑备注后，reload 仍显示 `QA NET` 卡片和 `CRUD TEST EDIT`。 |
| `150-live-network-crud-delete-persisted.png` | Network CRUD 深测：删除 QA 联系人并 reload 后，列表恢复空态且临时联系人不存在。 |
| `86-live-resume-contract-fixed.png` | Resume 修复后真实浏览器验收：旧 6 个关键 id 缺失 0、页面文案/placeholder/按钮/review 空态无 raw key。 |
| `148-live-resume-save-review-fixed.png` | Resume 深测：QA smoke 简历文本保存后 reload 持久化，`LLM 修改简历` 在无 endpoint 情况下生成本地 fallback review 并持久化。 |
| `91-live-memory-contract-fixed.png` | Memory 修复后真实浏览器验收：旧 10 个关键 id 缺失 0、资料/记忆标题和表单 placeholder 无 raw key、表单初始隐藏。 |
| `92-live-memory-add-form-fixed.png` | Memory 点击添加资料后表单展开，标题输入自动聚焦，文件 input 和类型 select 可见。 |
| `151-live-memory-resource-save-persisted.png` | Memory 文本资料保存深测：真实键盘输入 `QA MEM` / `MEMORY NOTE SAVE RELOAD`，保存后资源卡出现，reload 后仍持久化且无浏览器 error log。 |
| `225-cdp-memory-initial-seeded.png` | Memory 深测：临时本地账号进入 `/memory`，seed 的两条历史记录可见，资料表单默认隐藏。 |
| `226-cdp-memory-tex-file-saved.png` | Memory 深测：真实 file input 上传 `qa-memory-formula.tex`，标题自动填充、类型为 `TEX`、内容读取并保存为资源卡。 |
| `227-cdp-memory-small-image-dataurl-saved.png` | Memory 深测：真实 file input 上传小 PNG 后保存，资源卡渲染 `.resource-image`，localStorage 资源含 `data:image...`。 |
| `228-cdp-memory-large-image-fallback-saved.png` | Memory 深测：真实 file input 上传超过 1.5MB 的 PNG 后走文件名/KB fallback，不新增图片预览。 |
| `229-cdp-memory-reload-file-resources-persisted.png` | Memory 深测：reload 后 `.tex`、小图片和大图片 fallback 三条资源仍持久化。 |
| `230-cdp-memory-undo-latest-entry.png` | Memory 深测：滚动到 `clearTodayBtn` 并真实点击后，历史从 2 条变 1 条，latest entry 不再显示。 |
| `230-cdp-memory-file-upload-undo-summary.json` | Memory 深测状态 JSON：记录文件上传、reload 持久化、undo 最新历史记录和技能分回退断言，所有 assertions 为 true。 |
| `93-live-account-contract-fixed.png` | Account 修复后真实浏览器验收：旧 17 个关键 id 缺失 0、头像/资料/履历/密码/meta 文案无 raw key。 |
| `94-live-account-country-region-fixed.png` | Account 国家/地区联动真实点击：切到 United States 后地区选项为 51 项，未保存账户并切回中国。 |
| `218-cdp-account-before-edit.png` | Account 深测：临时本地账号进入 `/account`，表单从 seeded auth 载入昵称、邮箱、国家/地区和 meta。 |
| `219-cdp-account-avatar-resume-save.png` | Account 深测：真实 file input 上传头像和 `qa-account-resume.txt`，修改昵称/国家/地区/毕业时间并保存成功。 |
| `220-cdp-account-reload-persisted.png` | Account 深测：reload 后头像 data URL、简历 meta、昵称、美国/California 和毕业时间仍持久化。 |
| `221-cdp-account-clear-avatar-saved.png` | Account 深测：点击清除头像并保存后，预览回到 initials，auth 中 picture 为空。 |
| `222-cdp-account-email-password-required.png` | Account 深测：未填当前密码改本地邮箱时显示“更改本地账户邮箱需要输入当前密码。”且 auth email 未变。 |
| `223-cdp-account-email-changed.png` | Account 深测：输入正确当前密码后邮箱改为 `qa.account.deep.20260608.updated@example.com`，auth password hash 同步迁移。 |
| `224-cdp-account-logout-auth-visible.png` | Account 深测：再次 reload 确认新邮箱/清空头像/简历持久化后点击退出登录，AuthShell 可见且 currentUserId 为空。 |
| `224-cdp-account-full-flow-summary.json` | Account 深测状态 JSON：记录保存、上传、reload、清除、改邮箱、退出登录的断言，所有 critical assertions 为 true。 |
| `95-live-plan-contract-fixed.png` | Plan 修复后真实浏览器验收：旧 5 个关键 id 缺失 0，无计划状态 setup 显示、dashboard/edit 隐藏。 |
| `96-live-plan-selects-fixed.png` | Plan 目标方向/每周投入真实切换到 Quant Research / 12 小时，随后恢复默认且未提交计划。 |
| `153-live-plan-create-edit-diagnostic-todo-persisted.png` | Plan 深测：创建 QA 计划、baseline 校验/提交、编辑为 Quant Developer / 12 小时、勾选任务后 reload 仍显示 `1/5` 和 `Baseline 0/8`。 |
| `154-live-plan-todo-open-problems-theme-fixed.png` | Plan 任务跳转修复后真实验收：点击 LeetCode 任务进入 `/problems`，active theme 为 `leetcode`，summary 为 `LeetCode · 156 题`。 |
| `97-live-companies-contract-fixed.png` | Companies 修复后真实浏览器验收：旧 4 个关键 id 缺失 0，13 张公司卡、13 个刷题按钮、13 个官网按钮存在。 |
| `98-live-companies-tier-filter-fixed.png` | Companies 点击 `Tier S` 后 active/aria 状态正确，列表收窄到 5 家 Tier S 公司。 |
| `99-live-companies-practice-entry-fixed.png` | Companies 点击 Jane Street `刷该公司题` 后进入 `/problems`，active company 为 `jane-street`，题库过滤为 133 题。 |
| `128-live-companies-practice-current-reverify.png` | Companies 追加复验：当前 Jane Street `刷该公司题` 仍进入 `/problems`，active company 为 `jane-street`，24 张题卡可见；旧 console error 仅为历史时间戳。 |
| `100-live-jobs-contract-fixed.png` | Jobs 修复后真实浏览器验收：旧 3 个关键 id 缺失 0，6 条岗位卡、筛选按钮和刷新按钮存在。 |
| `101-live-jobs-filter-fixed.png` | Jobs 点击 `Internship` 后 active/aria 状态正确，列表从 6 条收窄到 3 条。 |
| `102-live-jobs-refresh-click-fixed.png` | Jobs 点击刷新按钮后无 Vite overlay/runtime error，仍保留 internship 筛选和 3 条卡片。 |
| `147-live-global-search-job-spotlight-fixed.png` | 全局搜索深测：搜索 `internship` 并点击 Jane Street internship 结果后进入 `/jobs`，目标岗位卡滚动到视口内。 |
| `103-live-courses-contract-fixed.png` | Courses 修复后真实浏览器验收：旧 5 个关键 id 缺失 0，8 张课程卡、source/action/note/link contract 存在。 |
| `104-live-courses-add-path-fixed.png` | Courses 点击 AtypicalQuant `加入路径` 后学习路径出现 1 条，卡片 path button active。 |
| `105-live-courses-source-switch-fixed.png` | Courses 切换 StatQuest 备用来源后 active source 更新，播放器 iframe 或 fallback 保留；随后已恢复来源并移出临时路径。 |
| `146-live-global-search-course-spotlight-fixed.png` | 全局搜索深测：搜索 `StatQuest` 并点击课程结果后进入 `/courses`，目标课程卡滚动到视口内。 |
| `285-iab-news-route-loaded.png` | in-app Browser 外链盘点：`/news` 路由正文加载，4 个原站链接为安全 `https` + `_blank` + `noreferrer`。 |
| `286-iab-jobs-route-loaded.png` | in-app Browser 外链盘点：`/jobs` 路由正文加载，6 个申请链接为安全 `https` + `_blank` + `noreferrer`。 |
| `287-iab-companies-route-loaded.png` | in-app Browser 外链盘点：`/companies` 路由正文加载，官网入口为 `data-company-careers` button + `openExternalUrl`。 |
| `288-iab-courses-route-loaded.png` | in-app Browser 外链盘点：`/courses` 路由正文加载，8 个课程原站链接为安全 `https` + `_blank` + `noreferrer`。 |
| `291-iab-news-open-original-click.png` | in-app Browser 点击 News 原站链接后本地页仍保持 `/news`，无 Vite overlay/overflow；该浏览器未暴露新标签。 |
| `292-iab-jobs-apply-click.png` | in-app Browser 点击 Jobs 申请链接后本地页仍保持 `/jobs`，无 Vite overlay/overflow；该浏览器未暴露新标签。 |
| `293-iab-companies-careers-click.png` | in-app Browser 点击 Companies 官网 button 后本地页仍保持 `/companies`，无 Vite overlay/overflow；该浏览器未暴露新标签。 |
| `294-iab-courses-open-original-click.png` | in-app Browser 点击 Courses 原站链接后本地页仍保持 `/courses`，无 Vite overlay/overflow；该浏览器未暴露新标签。 |
| `294-iab-external-link-click-summary.json` | in-app Browser 外链点击状态 JSON：记录 News/Jobs/Companies/Courses selector 唯一性、目标 URL、本地页稳定性和未观察到新标签的环境限制。 |
| `304-chrome-news-open-original-local-stable.png` | 独立 Google Chrome 外链 sign-off：News 原站链接打开新标签到 `m.investing.com`，原 `/news` 页面稳定且无 overlay/overflow。 |
| `305-chrome-jobs-apply-local-stable.png` | 独立 Google Chrome 外链 sign-off：Jobs 申请链接打开新标签到 Jane Street open roles，原 `/jobs` 页面稳定且无 overlay/overflow。 |
| `306-chrome-companies-careers-local-stable.png` | 独立 Google Chrome 外链 sign-off：Companies careers button 通过 `openExternalUrl` 打开新标签到 Jane Street open roles，原 `/companies` 页面稳定且无 overlay/overflow。 |
| `307-chrome-courses-open-original-local-stable.png` | 独立 Google Chrome 外链 sign-off：Courses 原站链接打开新标签到 AtypicalQuant YouTube，原 `/courses` 页面稳定且无 overlay/overflow。 |
| `307-chrome-external-link-click-summary.json` | 独立 Google Chrome 外链 sign-off 状态 JSON：News/Jobs/Companies/Courses popup 均打开、host 匹配、local route 不变、significant console log 为 0，status 全部为 pass。 |
| `311-chrome-visual-desktop-contact-sheet.jpg` | 独立 Google Chrome 全路由桌面视觉冒烟 contact sheet：21 个 manifest route 在 `1440x900` 下全部非空、关键 selector 可见、无 overlay、无横向溢出。 |
| `312-chrome-visual-mobile-contact-sheet.jpg` | 独立 Google Chrome 全路由移动端视觉冒烟 contact sheet：21 个 manifest route 在 `390x844` 下全部非空、关键 selector 可见、无 overlay、无横向溢出。 |
| `312-chrome-visual-route-smoke-summary.json` | 全路由视觉冒烟状态 JSON：desktop 21/21 pass、mobile 21/21 pass、significant console logs 为 0；逐页截图按 `311-chrome-visual-desktop-<route>.png` 与 `312-chrome-visual-mobile-<route>.png` 保存。 |
| `314-github-parity-baseline-current-contact-sheet.jpg` | GitHub 基准 vs 当前 React 全 21 route side-by-side contact sheet：左列为 `origin/main` 基准，右列为当前 React 迁移页，route-level parity 21/21 pass。 |
| `314-github-visual-parity-all-routes-summary.json` | GitHub 基准对照状态 JSON：active-route scoped key selector 可见、当前页无 overlay/横向溢出/pageerror、actionable issues 为 0；逐页截图按 `314-parity-baseline-<route>.png` 与 `314-parity-current-<route>.png` 保存。 |
| `315-external-boundary-login-no-google.png` | 空配置外部边界 smoke：无 auth、无 Google Client ID 时 Login/AuthShell 稳定显示，无 overlay/横向溢出。 |
| `316-external-boundary-settings-empty-config.png` | 空配置外部边界 smoke：Settings 显示本地 fallback LLM/Cloud endpoint，Google Client ID 为空，页面稳定。 |
| `317-external-boundary-resume-local-fallback.png` | 空配置外部边界 smoke：Resume 在无 LLM 服务时走本地 fallback，`#resumeReview` 渲染建议。 |
| `317-external-boundary-empty-config-summary.json` | 空配置外部边界状态 JSON：Login/Settings/Resume checks 全部 pass，无 pageerror。 |
| `318-resume-real-llm-proxy-review.png` | 配置本地 OpenAI-backed LLM proxy 后，Resume UI 真实 POST 到 `127.0.0.1:8787/interview` 并渲染 LLM review items。 |
| `318-resume-real-llm-proxy-review-summary.json` | Resume 真实 LLM UI 状态 JSON：1 次 8787 request、5 条 review item、无 overlay/横向溢出；该早期日志曾记录 Google OAuth origin 未授权，后续 `320` 已复验 iframe 初始化不再复现。 |
| `319-production-boundaries-local-services-summary.json` | 生产边界脚本本地服务状态 JSON：cloud health、Google provider config、真实 Google provider login、LLM resume review、LLM PDF question generation 全部通过，5 pass / 0 skip / 0 fail。 |
| `320-iab-google-config-summary.json` | 最终 config 更新后 in-app Browser 复验：Google Sign-In iframe 使用当前 Client ID 渲染，未再捕获 origin 未授权 warning；真实 provider login 后续由 `319`/`327` 完成签收。 |
| `321-static-build-config-summary.json` | 静态 build config 复验：`dist/config.js` 包含本地公开 endpoint/Google Client ID，不包含 OpenAI key；strict mode 拒绝本地非 HTTPS endpoint。 |
| `322-ui-contract-gate-summary.json` | UI contract gate 复验：`npm run check:ui-contracts` 覆盖 21 个 React route、3 个 shell 合约、30 个关键 JSON 证据文件和 92 个非空截图证据文件。 |
| `323-release-readiness-summary.json` | Local release-readiness 总闸门：git diff、Stage 1、Stage 2 bridge/full/strict、Browser evidence、Migration completion audit、Route integrity、Route interactions、Browser route smoke、Module ownership、Chrome store readiness、Chrome store publication fixture、Browser extension runtime smoke、Media storage runtime smoke、Media storage production fixture、Ops alert runtime smoke、Ops alert production fixture、Jobs source runtime smoke、Jobs source production fixture、Question-bank rights、Question-bank rights public smoke、Question-bank rights release blockers、External launch blockers、Postgres cutover export smoke、Postgres cutover、static build、Production boundaries、UI contracts；带新鲜 Google token 时为最终 pass，否则允许明确的 production-token-only partial。 |
| `324-google-token-helper-summary.json` | Google provider login handoff：`npm run google:token-helper` 生成被 Git 忽略的本地 helper，用当前 Client ID 获取短时 Google ID token，供最终 production-boundary 验收使用。 |
| `325-google-token-helper-browser.png` | Google token helper 真实 Chrome 截图：helper 页面、Google 登录按钮、token textarea、copy 按钮和 `Ready.` 状态可见。 |
| `325-google-token-helper-browser-summary.json` | Google token helper 真实 Chrome 状态 JSON：127.0.0.1:5179 helper 页面 200、非空、关键 UI 元素可见；短时 ID token 已用于后续真实 provider login 验收。 |
| `326-browser-evidence-manifest-summary.json` | Browser evidence manifest：审查和 smoke 文档中的 276 个 browser-audit 证据引用全部存在，229 张图非空，47 个 JSON 合法。 |
| `327-migration-completion-audit-summary.json` | Migration completion audit：10 项迁移签收要求中 10 pass、0 pending、0 fail；真实 Google provider account login 已签收。 |
| `328-browser-route-smoke-summary.json` | Browser route smoke：真实 Chrome 覆盖 21 个登录后 route、未登录 protected route 跳转、本地邮箱注册/退出/重登/密码重置闭环和 Overview CTA/Overview leaderboard controls and news ticker navigation/Skills radar hover and global search spotlight/Global search module, problem, job, company, course, and news navigation/Problems detail/reveal/save/Problems social no-cloud guard/LeetCode Hot 100 tracking persistence/Tools drill/Tools market game quote validation, scoring, and persistence/Poker demo table starts, acts, and persists room state/PK match, submit, reveal, and record persistence/Plan create, edit, task persistence, and navigation/Interview onboarding, practice answer, favorite, exit, and resume/Todo/Community post persistence/Community image post fallback persistence/Messages thread persistence/Experiences create/edit/share/delete persistence/News manual submit, filter, detail, read, and reload persistence/Memory resource persistence/Memory image upload fallback persistence/Network contact persistence/Resume text persistence/Resume LLM review request/render/reload persistence/Jobs filter and apply-link behavior/Companies tier filter, practice navigation, and careers-link behavior/Library search, kind filter, practice navigation, and reader guard/Cross-module Library -> Problems -> Todo -> Resume -> Settings persistence/Courses path, source switch, note, and reload persistence/Account profile persistence/Account local email password guard and reauthentication/Account avatar/resume file upload persistence/Settings runtime config persistence/Settings backup export, import, and reset state 关键交互，当前 35/35 interactions pass。 |
| `329-media-storage-runtime-smoke-summary.json` | Media storage runtime smoke：临时 API 真实注册、上传、下载、文件/DB/audit 持久化，MIME/文件名后缀不一致时按内容类型存储对象后缀，以及未登录/unsupported/oversize 失败码全部通过。 |
| `330-jobs-source-runtime-smoke-summary.json` | Jobs source runtime smoke：临时 feed/API 验证 bearer token、source/local merge、duplicate source precedence、unsafe URL 清洗、未知 type 归一、invalid postedAt 清洗、cache、POST filter 和 catalog fallback 全部通过。 |
| `331-postgres-cutover-export-smoke-summary.json` | Postgres cutover export smoke：临时 API/SQLite 生成真实 fixture，验证默认导出脱敏、full export 保留迁移输入，redacted export 与 row-limited/truncated include-sensitive export 都不能通过 cutover checker，并验证 complete cutover signoff 正例及错误签收反例，包括 private/raw-IP/malformed target host、unsafe database、private/credential/query evidence URL。 |
| `332-browser-extension-runtime-smoke-summary.json` | Browser extension runtime smoke：Node VM 执行真实 `popup.js`，验证默认 Board URL、active tab 捕获、popup 渲染、复制 JSON、正常打开 QuantGym capture URL、非法/insecure remote Board URL 回退、loopback HTTP 开发 URL 允许和长题 clipboard fallback。 |
| `333-production-boundaries-deployed-services-summary.json` | 部署版生产边界签收：从 `beta.quantgym.app/config.js` 读取真实 API/LLM URL，带 QuantGym cloud session token 后部署版 LLM resume review 和 PDF question generation 均通过；本轮未提供新鲜 Google ID token，因此真实 Google provider login 保持跳过。 |
| `334-ops-alert-runtime-smoke-summary.json` | Ops alert runtime smoke：临时 webhook/API 验证 404、两次 auth 401 和 auth 429 rate-limit 四条告警均送达、Bearer token 正确、payload 全量脱敏。 |
| `335-question-bank-rights-public-smoke-summary.json` | Question-bank rights public smoke：临时 fixture 验证 public/commercial approved source 正例通过，并验证缺 `commercial-use` scope、placeholder/private/raw-IP evidence URL、过期 review、缺 direct-permission grantor 和 unsupported scope 均被拒。 |
| `336-ops-alert-production-fixture-summary.json` | Ops alert production fixture：隔离生产 env 正例通过，short/placeholder webhook token、placeholder/local/private/raw-IP/incomplete signoff 反例被拒，本地 webhook `--smoke` 投递通过且输出不暴露 token 或完整 dashboard URL。 |
| `337-media-storage-production-fixture-summary.json` | Media storage production fixture：隔离生产 env 正例通过，local/HTTP/private/raw-IP/placeholder/raw public base/URL credential/weak credential/unsafe bucket 或 prefix 等反例被拒，fake S3/CDN `--live` 正例和 public GET 失败清理路径通过。 |
| `338-jobs-source-production-fixture-summary.json` | Jobs source production fixture：隔离生产 env 正例通过，source URL/token/cache/timeout/max-bytes/catalog 反例被拒，包括 embedded credentials、query URL 和 short token；fake live feed 正例和包含 invalid/future postedAt 的坏 feed 反例通过。 |
| `339-chrome-store-publication-fixture-summary.json` | Chrome store publication fixture：本地发布 handoff 正例通过，published-signoff fixture 绑定 Chrome item id、detail listing URL、published 状态、manifest version 和 upload SHA-256，且 malformed/HTTP/non-store/non-detail/mismatched/placeholder/credential/query 反例均被拒；真实 Chrome Web Store 发布仍需 `npm run check:chrome-store-publication:published` 带开发者账号产生的 listing 证据通过。 |
| `340-question-bank-rights-release-blockers-summary.json` | Question-bank rights release blockers：当前 private-beta 权限通过，但真实 public/commercial gate 均因 15 个 active source 的 `publicCommercial.status="needs-review"` 被拒，且 active public/commercial approvals 为 0；正式 public/commercial 发布仍需逐源补齐授权证据并让 `npm run check:question-bank-rights:public` 与 `npm run check:question-bank-rights:commercial` 通过。 |
| `355-apex-www-domain-summary.json` | Apex/WWW domain smoke：实时诊断 `quantgym.app`、`www.quantgym.app`、`beta.quantgym.app` 的 DNS/HTTPS 状态；当前 beta 入口健康，裸域和 WWW 均分类为 Cloudflare 525，`npm run check:apex-www-domain -- --require-clear` 是域名清场命令。 |
| `341-external-launch-blockers-summary.json` | External launch blockers：统一跟踪 6 个剩余正式外部 blocker、1 个已清掉的 jobs feed 项和 1 个 browser journey 持续扩展项；默认 tracking pass 但 `launchReadiness` 保持 `blocked`，`--require-clear` 会在 blocker 未清空时失败；release-readiness 内嵌运行时会跳过旧 `323` 自引用并保持独立 `341` summary 不被覆盖。 |
| `298-iab-settings-llm-endpoint-saved.png` | Resume endpoint 深测前置：Settings UI 保存 `http://127.0.0.1:8787/interview` LLM endpoint 成功。 |
| `299-iab-resume-live-endpoint-review.png` | Resume endpoint 深测：点击 `LLM 修改简历` 后临时兼容 endpoint 返回的三条 review item 渲染到 `#resumeReview`。 |
| `299-iab-resume-live-endpoint-summary.json` | Resume endpoint 状态 JSON：记录 settings endpoint save、POST `/interview` UI 结果、无 overlay/overflow 和 console error，status 为 pass。 |
| `300-iab-settings-google-client-id-saved.png` | Settings Google config 深测：保存测试 Google Client ID 后 reload 仍显示该值。 |
| `303-iab-settings-google-client-id-keyboard-cleared.png` | Settings Google config 深测：真实键盘全选删除 Google Client ID，保存并 reload 后输入为空。 |
| `303-iab-settings-google-keyboard-clear-summary.json` | Settings Google config 状态 JSON：记录保存、键盘清空、reload 持久化和无 overlay，status 为 pass。 |
| `106-live-pk-contract-fixed.png` | PK 修复后真实浏览器验收：旧 9 个关键 id 缺失 0，初始比分、题面提示、表单和 feed contract 存在。 |
| `107-live-pk-start-fixed.png` | PK 点击 `匹配在线 Quant` 后生成对手、题目和匹配 feed。 |
| `108-live-pk-submit-fixed.png` | PK 填写答案并提交后比分和结果/XP feed 更新，答案框清空。 |
| `109-live-pk-reveal-fixed.png` | PK 点击 reveal 后 feed 显示参考答案，无 Vite overlay/runtime error。 |
| `114-live-poker-contract-ids-fixed.png` | Poker 补回上线版 35 个关键 id 后真实浏览器验收：旧 id 缺失 0、table/lobby/seat/action/settings 合同存在。 |
| `115-live-poker-manual-seat-click-fixed.png` | Poker 点击空座 `SIT` 后玩家数从 `1/10` 变为 `2/10`，Start hand 变为可用，无 Vite overlay。 |
| `116-live-poker-settings-save-fixed.png` | Poker Settings 保存 small blind / big blind / starting stack / max players 后盲注变 `15 / 30`、座位数变 `2/9`，随后已恢复默认。 |
| `269-cdp-poker-online-fallback-initial.png` | Poker online fallback 深测：带失效 cloud token 的 URL join 路径请求云端失败后，页面显示 Local fallback，Fill demo/Add bot 可用。 |
| `270-cdp-poker-online-create-fallback.png` | Poker online fallback 深测：点击 `New` 触发线上建桌失败后，React UI 不再卡在 Connecting，反馈为 `Local table is still available`。 |
| `271-cdp-poker-online-fallback-fill-demo.png` | Poker online fallback 深测：降级后的本地桌可点击 Fill demo，10 个玩家入座，Start hand 可用。 |
| `272-cdp-poker-online-fallback-start-hand.png` | Poker online fallback 深测：降级本地桌可开始手牌，HUD 为 Local/In hand/Preflop，行动按钮可用。 |
| `273-cdp-poker-online-fallback-local-action.png` | Poker online fallback 深测：真实点击本地 action 后局面继续推进，无 Vite overlay。 |
| `274-cdp-poker-online-fallback-reload-persisted.png` | Poker online fallback 深测：reload 后地址栏和房间链接归一到 `QG-MAIN`，继续显示稳定 Local fallback。 |
| `274-cdp-poker-online-fallback-summary.json` | Poker online fallback 状态 JSON：记录云端失败、Local label、URL normalization、Fill demo、Start hand、action、reload 和 error filter 断言，status 为 pass。 |
| `117-live-tools-contract-ids-fixed.png` | Tools 补回上线版 27 个关键 id 后真实浏览器验收：旧 id 缺失 0，drill mode/select/start/options/market 合同存在。 |
| `118-live-tools-start-contract-fixed.png` | Tools 点击 `Arithmetic` 和 `开始` 后 active drill 变为 arithmetic，5 个答案按钮 enabled，题目和反馈更新。 |
| `119-live-tools-answer-market-fixed.png` | Tools 点击答案后推进到 `Question 2/20`，再提交 Market Quote 后 market score 变为 `20` 且反馈正常。 |
