# 翁家宝典、Learn 与评分系统：本地验证和私有 VIP 部署

主站已接入 Learn 课程、能力与 Offer Bar 页面，并与 VIP「翁家宝典」练习联通。主导航的「学习」替换原「资源」入口；旧 `/resources` 地址重定向至 `/learn`。独立 Learn 预览仍保留，主站使用单独构建的嵌入课件，不读取旧预览账号的学习存档。

当前接入 **860 道已下载的 QuantVault 题目**，覆盖 **17 个原始主题**，包含 **2579 条提示及 860 份完整解答**，并保留公司、难度、标签和来源信息。已捕获的目录共有 3469 条，所以这是 **860 / 3469** 的完整正文子集，不是全站题库。题干与解答保留原始英文，未伪造中文翻译。

## 课程与关联练习覆盖

Learn 已导入 **99 节课程**，包含课件、测验及笔记本内容。课程内容已捕获，不意味着每节课的关联题目均有完整正文。

| 覆盖口径 | 数量 |
| --- | ---: |
| 有配套练习列表的课程 | 39 |
| 课程练习引用次数 | 551 |
| 已下载正文的引用次数 | 137 |
| 尚无正文的引用次数 | 414 |
| 练习列表去重后的题目 | 550 |
| 去重后已下载 / 缺失题目 | 137 / 413 |
| 至少有一道已下载关联题的课程 | 31 |

引用与题目数不同，是因为一题同时被两门课程引用。另有一条 internal ID 为 `744` 的源引用无法在捕获目录中解析；它不会误跳到展示编号 `744` 的另一道题。关联使用源 internal ID，链接使用独立核对过的 display ID，未下载或无法映射的题保留占位，不计为已完成。详细审计报告位于 `artifacts/weng-local-preview/learning-coverage.json`。

## 本地启动与查看

在 QuantGym 项目根目录运行：

```sh
python3 scripts/preview-weng-local.py
```

启动后打开：

- [Learn 课程](http://127.0.0.1:5188/learn)
- [能力与 Offer Bar](http://127.0.0.1:5188/readiness)
- [翁家宝典](http://127.0.0.1:5188/problems?bank=quantvault)

默认网页端口为 **5188**，API 端口为 **8894**，均只监听本机。启动脚本先准备本地私有内容，再构建主站；主构建自动包含 Learn 嵌入课件，全部成功后才启动预览。嵌入构建输出到 `artifacts/weng-local-preview/web/learn-embed/`。代码未变化时可用 `--no-build` 复用已有构建。端口被占用时可使用现有预览，或通过 `--web-port` 和 `--api-port` 指定其他端口。终端按 `Ctrl+C` 停止。

| 本地账号 | 邮箱 | 密码 |
| --- | --- | --- |
| VIP | `vip@preview.invalid` | `LocalPreview1234` |
| 普通账号 | `reader@preview.invalid` | `LocalPreview1234` |

登录 VIP 账号可以进入题库、查看提示和完整解答。普通账号用于验证会员锁定；题目正文由 API 的会员检查控制。可用 `quantvault-14`（Optimal Stopping: Three-Roll Dice Game）检查数学公式、三条提示和解答展示。

课程联动可从 `lec-q-prob-slides-03`（Counting Principles & Combinatorics）验收：该课 20 道配套题中有 7 道正文，第 3 张课件的数字测验答案为 `15600`。进入关联练习后可打开 `quantvault-426`（Grid Path Counting），提交人工自评，再查看能力页和返回课程链接。只有明确提交自评才产生练习成绩；阅读题目或解答本身不提交成绩。

## 本地数据与隔离

演示账户与练习记录使用独立数据库 `artifacts/weng-local-preview/demo.sqlite3`，不会修改正式账号数据库。重新启动沿用这份本地记录；构建与运行日志也在 `artifacts/weng-local-preview/` 中。

**Learn 进度、课程 XP 和能力评分档案保存在当前浏览器，按登录账号隔离。** 它们不会同步到 QuantVault，也尚未实现跨浏览器、跨设备同步。刷新页面或重新登录同一账号会读取该浏览器的已有记录；不同浏览器或不同网页端口属于不同存储空间。不会自动导入独立 Learn 预览的旧存档。

本地补充保存课内测验已提交的答案与反馈，重新打开课程时恢复，且不重复奖励 XP。原客户端只保存页码与奖励标记；历史版本未保存的具体答案需要重新提交一次。

课程进度支持同账号多标签冲突检测：同一课件的保存请求排队，并在浏览器用户级锁内比较最新存档。若另一标签已更新进度，旧标签的写入会被拒绝，页面提示并重新加载最新进度，要求重试刚才的操作；不会用旧快照覆盖完成记录或 XP。此保护针对课程进度保存，不代表所有业务都具备跨设备协作能力。

会员控制使用真实 API 和会员数据库，前端没有模拟 VIP 开关。本地启动脚本设置 `QUANTGYM_ENABLE_LOCAL_QUANTVAULT=1`、回环地址 `QUANTGYM_HOST=127.0.0.1`，以及指向课件目录的 `QUANTGYM_LOCAL_LEARN_ROOT`。这个旧本地开关在非回环监听时无效；网络部署使用下面单独的显式生产开关，不能靠本地开关放行。

Learn 内容接口为 `/api/learning/content/{resource}`，只允许 `library`、`practice`、`modules`、`problems-index`、`item-difficulty`、`item-difficulty-v2` 六类资源。匿名返回 `401`，非会员返回 `403`；会员在功能未启用时返回 `404`，已启用但未配置内容目录时返回 `503`。内容响应使用 `private, no-store`，会员撤销后新请求立即受限。

课程、练习、题目与评分 JSON，以及课程插图，都不进入嵌入课件静态包。课件通过同源父页面取得已认证读取的数据；题目正文仍使用原 `/api/problems` 权限路径。

若提示缺少本地题库文件，先运行：

```sh
node scripts/import-quantvault.mjs
```

导入只读取已经下载的文件，不向原站发送请求。可用以下命令核对生成结果与原始记录是否一致：

```sh
node scripts/import-quantvault.mjs --check
node --test scripts/test-import-quantvault.mjs
```

## 生产私有 VIP 发布方式

目标沿用现有服务：Cloudflare Pages `quantgym-beta` 提供 `https://beta.quantgym.app`，Render `quantgym-api` 提供 `https://api.quantgym.app`。本节记录发布步骤和目标，不表示这些步骤已经在线上完成。

前端继续使用 `npm install && node scripts/build-static-site.mjs --strict`，只发布 `dist/`。主构建自动生成 `dist/learn-embed/`，使用根目录依赖和经过筛选的 renderer 代码、样式、通用图标；不需要私有 captures、课程导出或独立预览的依赖目录。嵌入静态目录唯一允许的 JSON 是 Python 运行时的依赖锁文件。不要发布独立预览的 `dist/` 或 `public/private/`，不要将私有发布包加入 Git。

将本次私有数据包通过受保护的操作员会话上传至 Render 持久盘：`/var/data/quantvault/uploads/learning-7fe209e0965971a6.tar.gz`。它包含 99 节课、六类 Learn 资源和 860 道题目；9 张课程插图只内联到受会员鉴权保护的课程 JSON。上传目录不属于网页根目录，也不建立公开下载链接。

在 Render 服务的仓库根目录执行安装，保留现有服务的数据库环境配置：

```sh
python3 api-server/install_learning_release.py \
  --file /var/data/quantvault/uploads/learning-7fe209e0965971a6.tar.gz \
  --root /var/data/quantvault
```

安装器核验清单、数量和文件哈希，并将资源放入版本目录，不替换旧发布目录或操作账号数据库。本包预期版本为 `ca7677f34c438b728dc3`；确认安装摘要一致后，导入题目：

```sh
python3 api-server/import_private_practice.py \
  --source quantvault \
  --expected-count 860 \
  --file /var/data/quantvault/ca7677f34c438b728dc3/weng/problems.json
```

导入使用服务已配置的数据库（现有 SQLite 配置为 `QUANTGYM_DB=/var/data/quantgym.sqlite3`），不要指定本地演示数据库或改动现有账号、会员配置。题目作为私有来源写入；成功导入并不会授予任何账号 VIP。

随后在 Render API 服务设置并部署：

```text
QUANTGYM_ENABLE_QUANTVAULT=1
QUANTGYM_LEARN_ROOT=/var/data/quantvault/ca7677f34c438b728dc3/learn
```

生产开关默认关闭，必须显式开启。`QUANTGYM_LEARN_ROOT` 只能指向受保护的持久目录；生产不回退到开发机的 `QUANTGYM_LOCAL_LEARN_ROOT`。保留原有邀请、登录、会员和来源访问检查，不把示例 VIP 账号或本地测试密码带到生产。需要撤回功能时关闭生产开关并重新部署，保留私有数据及已有学习记录用于排查。

发布后分别验证匿名、普通账号、VIP 三种权限，以及 `/learn`、`/readiness` 和 `/problems?bank=quantvault` 的课程到练习联动。确认课程插图可见、静态地址无法读取私有 JSON、题目导入数量为 860，并核对前后端部署版本。Learn 和能力记录仍保存在当前浏览器，按账号隔离；上线不会把本机预览记录自动迁移到正式域名，也不提供跨设备同步。

## 评分规则与实现标注

能力页下方「分数是怎样算的」分成 **REA 确认的原站规则** 与 **本地补充与边界**。实现摘要位于 [`src/features/learning/scoring/RULES.md`](../src/features/learning/scoring/RULES.md)，完整取证记录保留在 [`QuantVault/learn-preview/src/scoring/RULES.md`](../QuantVault/learn-preview/src/scoring/RULES.md)。

源规则包括难度与猜测参数、提示折扣、30 天能力记录窗口、岗位及公司权重、模块完成率和 Offer Bar 计算。主站评分核心沿用此前审计的独立实现，集成测试校验核心文件一致。课程 XP 计入成长记录，但不直接增加主题能力或 Offer Bar。

本地补充包括开放题人工自评、已看解答后按未解出处理、账号隔离存储、推荐与初测录入界面，以及解除原客户端 60 节课奖励上限以覆盖 99 节课程。每课仍只奖励一次。题目自评会连接既有练习记录和能力档案；不是原站服务器判分，也不表示真实 offer 概率。

## 验证命令

在项目根目录执行：

```sh
python3 scripts/test-learning-content-api.py
python3 scripts/test-learning-release.py
python3 scripts/test-memberships-api.py
node --test scripts/test-learn-production-build.mjs scripts/test-static-catalog-privacy.mjs
node --test scripts/test-learning-integration.mjs scripts/test-learn-bridge.mjs scripts/test-learn-progress-concurrency.mjs
node --test QuantVault/learn-preview/tests/embed-bridge.test.mjs QuantVault/learn-preview/tests/quiz-progress.test.mjs
node --test QuantVault/learn-preview/src/scoring/scoring-model.test.mjs QuantVault/learn-preview/src/scoring/answer-engine.test.mjs QuantVault/learn-preview/src/scoring/training-system.test.mjs
```

这些检查覆盖真实 HTTP 会员与功能开关边界、私有发布包校验、账号隔离、题号映射、题目成绩到能力/模块/XP 的联动、提示与部分正确、重复提交、课程奖励不抬高能力，以及多标签旧快照不得覆盖新进度。构建测试在没有私有 captures 和数据目录的隔离环境中构建嵌入课件，检查私有内容 JSON 和课程图片不会静态发布。独立预览的源规则对照测试仍需本地私有 captures；浏览器中的课件操作和布局仍需实际验收。

## 内容来源和授权范围

这套代码同时支持回环本地验证和显式启用的私有 VIP 部署。正文不进入静态页面包或浏览器公共题库文件，服务端始终检查会员权限。实际线上状态应以部署记录、服务版本和发布后验收为准。

“翁家宝典”是产品展示名称，原始内容来源仍标记为 QuantVault。已有账号下载记录和 VIP 访问限制均不代表取得公开或商业再分发授权；私有部署也必须遵守实际已取得的内容许可与授权范围。这份发布说明不扩大或确认来源授权。
