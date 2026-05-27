# QuantGym

QuantGym 是一个面向 Quant 面试准备、刷题训练、求职准备和能力追踪的本地训练工作台。当前版本由四部分组成：

- 网页主应用：备战计划、面经、模拟面试、题库、社群、求职、简历、人脉、能力值、速算、新闻和资料笔记。
- SQLite 后端 API：邮箱账户、登录 session、用户状态、社区数据和云端同步。
- 本地 LLM 代理：保护 OpenAI API key，提供模拟面试、学习记录分类和新闻聚合。
- Chrome 插件雏形：从 LeetCode 或题目网页收集题目并导入 QuantGym。

当前项目已经进入邀请制内测部署阶段。网页部署参数集中在 [config.js](./config.js)：本地开发可以留空并使用前端 fallback，部署给测试用户时由构建脚本写入 HTTPS API / LLM 地址，不用让测试用户手动改 Endpoint。

## 当前内测部署

| 模块 | 平台 | 地址 / 设置 |
| --- | --- | --- |
| GitHub 仓库 | GitHub private repo | `https://github.com/garymmmjw/QuantGym` |
| 内测网页 | Cloudflare Pages `quantgym-beta` | `https://beta.quantgym.app` |
| 后端 API | Render web service `quantgym-api` | `https://api.quantgym.app/api` |
| LLM 代理 | Render web service `quantgym-llm` | `https://llm.quantgym.app/interview` |
| DNS | Cloudflare | 管理 `quantgym.app`、`beta`、`api`、`llm` 等记录 |
| 邮件验证码 | Resend + Cloudflare DNS | `no-reply@quantgym.app` 发送注册验证码 |

已经验证过的健康检查：

```bash
curl https://api.quantgym.app/api/health
curl https://llm.quantgym.app/health
```

两个服务都应返回：

```json
{"ok":true}
```

当前前端构建应写入：

```js
window.QUANTGYM_CONFIG = {
  cloudApiEndpoint: "https://api.quantgym.app/api",
  llmEndpoint: "https://llm.quantgym.app/interview",
  llmModel: "gpt-5-nano",
  googleClientId: "",
  googleLoginEnabled: false
};
```

## 内测邮箱控制

封闭内测通过 API 环境变量 `QUANTGYM_BETA_EMAIL_ALLOWLIST` 控制。只有白名单里的邮箱可以请求验证码、注册、登录和使用需要云端 session 的功能；其他邮箱会被 API 拒绝。

Render 的 `quantgym-api` 服务里设置：

```bash
QUANTGYM_BETA_EMAIL_ALLOWLIST="tester1@example.com,tester2@example.com"
QUANTGYM_REQUIRE_EMAIL_VERIFICATION=1
QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0
```

白名单规则：

- 多个邮箱用英文逗号分隔。
- 邮箱大小写不敏感。
- 新增内测用户时，只需要在 Render 环境变量里把邮箱追加进去，然后重启或重新部署 API。
- 不要把真实测试用户邮箱名单提交进 Git；README 只保留示例。

## 线上部署流程

### 1. API: Render `quantgym-api`

Render 创建 Web Service，连接 GitHub private repo：

- Root directory 留空，也就是仓库根目录。
- Build command 可以留空，或使用 `python3 --version`。
- Start command:

```bash
python3 api-server/server.py
```

Instance Type：内测建议先用 `Starter`。如果只是非常短期测试，`Free` 也能启动，但会休眠，验证码和登录体验会慢。

如果要让 SQLite 数据不随部署丢失，需要给 API 服务加 persistent disk，并把数据库路径放到磁盘中：

```bash
QUANTGYM_DB="/var/data/quantgym.sqlite3"
```

Render 环境变量：

```bash
PORT=8790
QUANTGYM_HOST=0.0.0.0
QUANTGYM_DB=/var/data/quantgym.sqlite3
QUANTGYM_ALLOWED_ORIGINS=https://beta.quantgym.app
QUANTGYM_BETA_EMAIL_ALLOWLIST=tester1@example.com,tester2@example.com
QUANTGYM_REQUIRE_EMAIL_VERIFICATION=1
QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0
QUANTGYM_SMTP_HOST=smtp.resend.com
QUANTGYM_SMTP_PORT=587
QUANTGYM_SMTP_USERNAME=resend
QUANTGYM_SMTP_PASSWORD=<Resend API key>
QUANTGYM_SMTP_FROM="QuantGym <no-reply@quantgym.app>"
```

Custom domain 添加：

```text
api.quantgym.app
```

Render 会提示在 Cloudflare 添加 CNAME：

```text
api -> quantgym-api.onrender.com
```

Cloudflare 里这条记录建议先设为 DNS only，等 Render 验证通过后再按需要决定是否代理。

### 2. LLM: Render `quantgym-llm`

Render 创建第二个 Web Service，仍然连接同一个 GitHub repo：

- Root directory 留空。
- Build command 可以留空，或使用 `node --version`。
- Start command:

```bash
node llm-proxy/server.mjs
```

Instance Type：内测建议先用 `Starter`，避免模拟面试时服务休眠。

Render 环境变量：

```bash
OPENAI_API_KEY=<OpenAI API key>
PORT=8787
LLM_PROXY_HOST=0.0.0.0
LLM_ALLOWED_ORIGINS=https://beta.quantgym.app
LLM_AUTH_API_BASE=https://api.quantgym.app/api
LLM_MAX_BODY_BYTES=12582912
```

Custom domain 添加：

```text
llm.quantgym.app
```

Cloudflare 添加 CNAME：

```text
llm -> quantgym-llm.onrender.com
```

`LLM_AUTH_API_BASE` 会要求模拟面试请求携带有效 QuantGym 登录 session。这样只有已登录、且邮箱被 API 放行的内测用户能消耗 OpenAI key。

### 3. 前端: Cloudflare Pages `quantgym-beta`

Cloudflare Pages 连接 GitHub repo：

- Project name: `quantgym-beta`
- Production branch: `main`
- Build command:

```bash
node scripts/build-static-site.mjs --strict
```

- Output directory:

```text
dist
```

Cloudflare Pages 环境变量：

```bash
QUANTGYM_WEB_API_ENDPOINT=https://api.quantgym.app/api
QUANTGYM_WEB_LLM_ENDPOINT=https://llm.quantgym.app/interview
QUANTGYM_WEB_LLM_MODEL=gpt-5-nano
QUANTGYM_WEB_GOOGLE_CLIENT_ID=
QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=0
```

Pages 自定义域名添加：

```text
beta.quantgym.app
```

Cloudflare 会自动处理 Pages 的 DNS 记录。确认 `https://beta.quantgym.app` 能打开登录页后，再走完整注册和验证码测试。

### 4. Resend 邮箱验证码

Resend 添加 domain：

```text
quantgym.app
```

Provider 选择 Cloudflare 后，把 Resend 给出的 DKIM / SPF / DMARC 等 DNS 记录添加到 Cloudflare。Resend 显示 `Verified` 后，API 才能稳定用 `no-reply@quantgym.app` 发验证码。

发送链路验证：

1. 在 `https://beta.quantgym.app` 注册一个 allowlist 里的邮箱。
2. 确认邮箱收到 6 位验证码。
3. 输入验证码完成注册。
4. 登录后确认题库、云端同步、模拟面试都正常。

## 日常修改流程

本地仍然要保留完整代码。GitHub 是远程备份和协作中心，本地是你实际修改、运行和测试项目的地方。

每次开始修改：

```bash
cd /Users/miujiawei/Desktop/QuantGym
git checkout main
git pull origin main
git checkout -b feature/short-description
```

修改完成后：

```bash
git status
git add .
git commit -m "Describe the change"
git push -u origin HEAD
```

然后在 GitHub 上创建 Pull Request，确认没问题后 merge。合并后回到本地同步：

```bash
git checkout main
git pull origin main
git branch -d feature/short-description
```

### 改动应该去哪里做

GitHub 是代码和文档的源头；Render、Cloudflare 和 Resend 是部署、域名和密钥配置。大多数产品改动只需要改本地代码，push 到 GitHub，合并到 `main` 后由平台自动部署。

| 要修改的内容 | 应该修改哪里 | 是否需要动 Render / Cloudflare / Resend |
| --- | --- | --- |
| 前端 UI、按钮、页面文案、样式 | 本地代码 -> GitHub PR -> Cloudflare Pages 自动部署 | 通常不需要 |
| API 代码 | 本地代码 -> GitHub PR -> Render `quantgym-api` 自动部署 | 通常不需要手动改配置 |
| LLM 代理代码 | 本地代码 -> GitHub PR -> Render `quantgym-llm` 自动部署 | 通常不需要手动改配置 |
| README、部署文档、协作说明 | 本地文档 -> GitHub PR | 不需要 |
| 题库 JSON、题目来源、前端静态数据 | 本地数据/脚本 -> GitHub PR -> Cloudflare/Render 自动部署 | 通常不需要 |
| 新增或移除内测邮箱 | Render `quantgym-api` 环境变量 `QUANTGYM_BETA_EMAIL_ALLOWLIST` | 需要改 Render API，并重启/重新部署 API |
| 更换 OpenAI API key | Render `quantgym-llm` 环境变量 `OPENAI_API_KEY` | 只需要改 Render LLM |
| 更换 Resend API key | Render `quantgym-api` 环境变量 `QUANTGYM_SMTP_PASSWORD` | 只需要改 Render API |
| 更换发件邮箱或发件域名 | Resend domain、Cloudflare DNS、Render API SMTP 环境变量 | 需要同时检查 Resend、Cloudflare、Render |
| 更换 API 或 LLM 域名 | Render custom domain、Cloudflare DNS、Cloudflare Pages env | 需要改部署平台配置 |
| 更换前端域名 `beta.quantgym.app` | Cloudflare Pages custom domain / DNS | 需要改 Cloudflare |
| 更换数据库路径或持久化磁盘 | Render `quantgym-api` disk 和 `QUANTGYM_DB` | 需要改 Render API |

最常见的例外是内测邮箱白名单：加用户不是代码修改，不要为此提交 Git。直接到 Render 的 `quantgym-api` 服务里更新：

```bash
QUANTGYM_BETA_EMAIL_ALLOWLIST=email1@example.com,email2@example.com
```

保存后重启或重新部署 API，让新白名单生效。

协作规则：

- `main` 只放稳定版本。
- 每次功能、修复或文档改动都开新 branch。
- PR 描述写清楚改了什么、怎么验证、是否影响 API / LLM / 前端部署。
- `.env`、OpenAI key、GitHub token、Resend key、SQLite 数据库和真实用户数据不要提交。
- `main` 合并后，Render 和 Cloudflare Pages 会自动重新部署对应服务。

## 当前完成状态

- 已完成 cream / lavender / blue 的高级白色调 UI 系统，包含新版侧边栏、顶部搜索、状态 chip、Quant Wire 新闻条和品牌小鲨鱼视觉。
- 已接入 QuantGym 小鲨鱼吉祥物、徽章、XP、streak、奖牌、功能入口图和雷达图视觉资产。
- 已完成题库页面：公共题库数据、卡片摘要、完整题目详情、个人收藏复习本、逐题点赞评论、热门排行、上次得分与模拟面试复用。
- 已去掉页面内所有旧来源命名，题库统一叫“题库 / 所有题目 / Problems”。
- 已完成能力值页面：总分 `/100`、九项能力雷达图、hover 明细、单项练习次数、练过题目、平均得分和 XP。
- 已完成右上角 streak 打卡交互：点击火焰 chip 后天数 +1，并带燃烧和数字动画。
- 已完成“Quant 面试备战计划”：按 Internship / Full-time、目标 Summer 和岗位方向生成每日任务，可先做 baseline 测评并随能力排序训练。
- 已完成面经模块：私有保存面试轮次、主题和复盘，可经保密提示确认后分享为社群面经动态。
- 已按备战、训练、求职与社群、资源重组侧栏模块入口，首页快捷卡也显示明确目的地。
- 已完成简历模块：账户可上传/保存简历，简历页面可让 LLM 提出修改要点。
- 已完成求职模块：展示 internship / full-time 岗位卡片，可点击外部申请链接。
- 已完成中英文切换的大部分核心文案；导航、按钮、题库、能力值、简历和求职模块已纳入语言系统。
- 已整理用户提供过的 UI 设计图到 [docs/ui-reference](./docs/ui-reference/README.md)，后续可以继续用于 image-to-UI 和资产生成。

## 快速启动

建议开三个终端窗口。

### 1. 启动后端 API

```bash
cd /Users/miujiawei/Desktop/QuantGym
python3 api-server/server.py
```

成功标志：

```text
QuantGym API listening on http://127.0.0.1:8790
```

健康检查：

```text
http://127.0.0.1:8790/api/health
```

### 2. 启动网页

```bash
cd /Users/miujiawei/Desktop/QuantGym
python3 -m http.server 5176
```

浏览器打开：

```text
http://127.0.0.1:5176/index.html
```

不要用 `file://` 直接打开 `index.html`，浏览器会限制登录、存储和部分本地能力。

### 3. 启动 LLM 代理

项目根目录支持 `.env`。真实密钥放在 `.env`，示例见 `.env.example`。

```bash
OPENAI_API_KEY=sk-...
PORT=8787
```

启动：

```bash
cd /Users/miujiawei/Desktop/QuantGym
node llm-proxy/server.mjs
```

成功标志：

```text
LLM proxy listening on http://127.0.0.1:8787
```

健康检查：

```bash
curl http://127.0.0.1:8787/health
```

预期返回：

```json
{"ok":true}
```

模型不需要写进 `.env`。前端会把你在模拟面试或设置里选择的模型传给本地代理。

## 静态网页发布构建

内测部署静态网页时，不要把仓库根目录直接作为公开目录。仓库里包含题源原始导出、QA 截图、脚本和后端代码；公开静态目录应只包含前端运行必需文件。

生成安全的静态发布目录：

```bash
QUANTGYM_WEB_API_ENDPOINT="https://api.quantgym.app/api" \
QUANTGYM_WEB_LLM_ENDPOINT="https://llm.quantgym.app/interview" \
QUANTGYM_WEB_LLM_MODEL="gpt-5-nano" \
QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=0 \
node scripts/build-static-site.mjs --strict
```

输出目录：

```text
dist/
```

静态托管平台只发布 `dist/`。脚本会生成部署用 `dist/config.js`，并只复制 `index.html`、`app.js`、`styles.css`、`assets/generated/`、`data/problem-catalog.js` 和 `data/leetcode-hot-100.js`。

## 当前文件结构

```text
QuantGym/
  README.md
  BETA_LAUNCH.md
  index.html
  app.js
  styles.css
  config.js
  .env.example
  .gitignore
  assets/
    generated/
  artifacts/
    README.md
    beta-final-check/
    regression-screenshots/
    quantguide-ocr/
  data/
    question-banks/
      README.md
      catalog-manifest.json
      dudeney-puzzles/
      green-book/
      hull-derivatives/
      linalg-primer/
      probability-stochastic-10/
      quantguide/
      quantitative-primer/
      question-bank/
      red-book/
      stefanica-fe-math/
      yellow-book/
    problem-catalog.js
    problem-catalog.json
  docs/
    ui-reference/
      README.md
      2026-05-22-10-brand-direction/
      2026-05-22-11-mascot-rewards/
      2026-05-22-19-module-radar/
  scripts/
    build-static-site.mjs
    build-problem-catalog.mjs
    extract-latex-question-bank.mjs
    import-quant-books.mjs
  api-server/
    README.md
    server.py
    data/
      quantgym.sqlite3
  llm-proxy/
    README.md
    server.mjs
  browser-extension/
    README.md
    manifest.json
    popup.html
    popup.css
    popup.js
```

说明：

- `index.html`、`app.js`、`styles.css` 是网页主应用。
- `config.js` 放部署用 Endpoint、Google Client ID 和 LLM 配置默认值；字段留空时，前端会 fallback 到本地开发地址。
- `assets/generated/` 是当前实际接入 UI 的 WebP/图片资产。
- `artifacts/` 是本地 QA 截图、回归截图和导入过程产物；不作为线上 UI 运行依赖。
- `data/question-banks/` 是按书/资料源拆分的题库源数据空间；当前网页公共题库启用 10 个来源，另有一个 archived source 标记为 disabled，不进入网页题库。
- `data/problem-catalog.json` 是由所有题库源合并出来的后端公共题库数据。
- `data/problem-catalog.js` 是同一份合并题库保留给静态前端使用的数据。
- `docs/ui-reference/` 是用户提供过的 UI/品牌参考图归档，不作为线上 UI 直接依赖。
- `scripts/build-static-site.mjs` 用来生成内测静态发布目录 `dist/`，避免把题源原始导出、脚本和后端代码暴露为网页静态文件。
- `scripts/import-quant-books.mjs` 用来从本地 `量化书籍/` 批量抽取当前题库来源，并处理 Hull PDF 题面；可用 `--book-root` 或 `QUANTGYM_BOOK_ROOT` 指定书籍目录，disabled 来源重建时不会合并进网页题库。
- `scripts/extract-latex-question-bank.mjs` 保留给临时单本 LaTeX 资料导入。
- `scripts/build-problem-catalog.mjs` 用来把所有书的题目合并成 `data/problem-catalog.json` 和 `data/problem-catalog.js`。
- `api-server/server.py` 是 SQLite 后端 API。
- `llm-proxy/server.mjs` 是 OpenAI 本地代理。
- `browser-extension/` 是 Chrome 插件。
- `.env` 是你的真实本地密钥文件，已在 `.gitignore` 中忽略，不应该提交。
- `api-server/data/quantgym.sqlite3` 是本地数据库，也已忽略，不建议提交。

## UI 参考素材归档

用户提供过的设计图已经整理到：

```text
docs/ui-reference/
```

当前包含 26 张可读参考图：

- `2026-05-22-10-brand-direction/`: 第一轮品牌方向、dashboard、challenge、奖励 icon 和小鲨鱼姿态。
- `2026-05-22-11-mascot-rewards/`: QuantGym logo、Q mark、徽章、streak、XP、功能卡和小鲨鱼透明素材方向。
- `2026-05-22-19-module-radar/`: 新版雷达图、求职、简历、人脉、新闻、PK、模拟面试、题库、社区和 dashboard 插图参考。

详细清单见 [docs/ui-reference/README.md](./docs/ui-reference/README.md)。

注意：这些 PNG 大多没有 alpha 通道，棋盘格背景是图片内容的一部分。正式接入 UI 时，优先使用 `assets/generated/` 里已处理过的透明 WebP，或重新抠图/生成资产。

## 核心功能

### 产品 UI 和品牌系统

当前前端已经从原型 demo 风格改成更完整的 QuantGym 产品界面：

- 全局 cream / lavender / blue 视觉系统。
- 侧边栏导航、顶部搜索、账户 chip、设置按钮、streak chip、分数 `/100` chip。
- Quant Wire 新闻条。
- Dashboard hero、功能入口卡、社区卡、题库卡、能力值卡、简历和求职卡片。
- 小鲨鱼吉祥物用于 dashboard、能力值、题库、学习计划和品牌辅助视觉。
- 主要页面做了桌面端和移动端适配，重点修复了缩放时的重叠和横向溢出。
- 参考图和后续设计素材统一归档在 [docs/ui-reference](./docs/ui-reference/README.md)。

### 账户和同步

- 邮箱注册、登录、退出。
- 邮箱注册验证码：SMTP 配好后发送真实邮件；本地开发模式会在 API 终端打印验证码。
- Google 登录入口。
- 用户资料、毕业时间、头像、简历、训练状态、社区动态同步到 SQLite API。
- API 离线时仍可使用本地 `localStorage` fallback。
- API 恢复后可以继续同步。

本地开发 fallback Cloud API Endpoint：

```text
http://127.0.0.1:8790/api
```

### 能力值

QuantGym 追踪九项能力：

- LeetCode
- Pandas/NumPy
- Probability/Expectation
- Statistics
- Machine Learning
- Deep Learning
- Market
- Option
- Mental Math

规则：

- 训练记录会转换为不同能力的 XP。
- 每 40 XP 约等于 1 分。
- 单项最高 100 分。
- 总分是九项能力的平均。
- 能力值页面展示大号总分 `/100` 和雷达图。
- 雷达图支持 hover/click，显示练习次数、练过题目、平均得分、累计 XP 和最近训练。
- 每个能力卡片会显示单项分数、XP、进度条和子能力标签。

### 计划与每日学习

Dashboard 的主 CTA 是“进入备战计划”，侧栏也有独立“计划”模块。首次进入会选择：

- 申请 `Internship` 或 `Full-time / New Grad`。
- 目标季次：`2026 Summer`、`2027 Summer` 或 `2028 Summer`。
- 方向：`Quant Trading`、`Quant Research` 或 `Quant Developer`。
- 每周可投入小时数，以及是否先做 8 题 baseline 测评。

计划使用常见申请窗口而非只按入职日倒计时：例如在 2026 年 5 月选择 `2027 Summer`，会优先安排简历、OA 和投递准备；选择 `2026 Summer` 则进入补录与即时面试冲刺。Baseline 会评估速算、概率、统计、market/options、coding 和 ML 基础，再把低分能力提前到每日任务中。

每天的任务可直接跳转到题库、速算、模拟面试、简历或求职模块，并可勾选完成状态；Dashboard 会同步展示当天进度。计划页也说明完整招聘主线：申请定位、OA / Assessment、Recruiter / HR Screen、Technical、Behavioral / Fit、Final Day / Superday、HR Close / Offer。

流程说明以公司官方公开材料为依据，具体轮次和开放时间仍以岗位页面为准：

- [IMC Recruitment Process](https://www.imc.com/ap/careers/recruitment-process)
- [Optiver Sydney Campus FAQ](https://optiver.com/working-at-optiver/career-hub/sydney-campus-faq/)
- [Jane Street Trading Interviews](https://www.janestreet.com/trading-interviews/)
- [SIG Quantitative Trading Internship](https://careers.sig.com/quantitative-trading-internships-co-ops/jobs/10717?lang=en-us)

右上角火焰 chip 是打卡入口。点击后会增加连续天数，并播放火焰和数字增长动画。

### 面经与社群分享

“面经”位于备战分组中，用于记录实际经历过的轮次，而不是只保留模拟面试成绩。每条记录包含公司或匿名公司名、岗位方向、季次、轮次、日期、结果状态、流程概览、考察主题、复盘行动和标签。

- 记录默认保存在个人状态中，不会自动发布。
- 支持按轮次筛选、继续编辑和删除。
- 点击“分享至社群”后会先显示保密确认，提醒移除姓名、联系方式及公司要求保密的具体原题。
- 分享后的内容带有“面经分享”、轮次、季次及主题标签；社群页可切换到“面经分享”专属流。
- 删除已发布的面经动态时，个人记录会同步恢复为未分享状态。

### 模拟面试

位置：

```text
index.html
app.js
styles.css
llm-proxy/server.mjs
```

支持：

- Online Assessment、Technical Interview、Behavioral Interview。
- 文字作答、文件上传、语音作答。
- 全范围题库抽题。
- PDF 上传生成题目。
- LLM hint。
- LLM 精简评测，只返回得分和评价。
- 开始前只显示面试设置，开始后切换到答题和对话区。
- LLM 和系统固定消息都会逐字显示，节奏适合阅读。
- 题目和对话支持 Markdown 与 MathJax 公式渲染。
- 单题完成后的操作区：下一题、总结到收藏夹、分享。
- 收藏夹保存高价值题目复盘。
- 面试得分会进入训练历史，并写回题目状态以回看上次得分。
- 分享会复制当前这一题的对话，不复制整场面试。

LLM 评测现在被限制为短反馈，重点是：

```text
评分
亮点
改进
追问
```

这可以减少 token 消耗，也更适合面试复盘。

本地开发 fallback LLM Endpoint：

```text
http://127.0.0.1:8787/interview
```

### 题库

题目字段包括：

- 英文标题、中文标题
- 分类、难度、标签
- 来源链接
- 英文题干、中文题干
- 答案、解析

题库可以：

- 手动新增。
- JSON 导入。
- Chrome 插件导入。
- 通过 API 读取公共题库表；当前网页公共题库已启用 10 个来源，共 2,771 条。
- 题目卡片按 24 条渐进展示，搜索仍覆盖完整题库，避免内测账号合并大量题源后首屏卡顿。
- 将任意题目收藏到个人复习本，并用“我的收藏”单独回看；收藏不公开，也不要求该题先做错。
- 在题目详情下点赞和评论，与其他内测用户共同讨论解法和易错点；用户只能删除自己的评论。
- 在“热门排行”中按照共享点赞与讨论热度查看值得优先复习的题目。
- 被模拟面试和 PK 模块复用。

当前题库分层：

- 公共题目放在 SQLite `problems` 表；公共题库会在后端启动时从 JSON 导入这里。
- 手动新增和 JSON 导入的个人题目也放在 `problems` 表，标记为当前用户可见。
- 收藏、模拟练习次数、最近练习时间和最近面试得分放在 `user_problem_states` 表。
- 共享点赞和评论分别放在 `problem_likes` 与 `problem_comments` 表；排行榜由公开互动计数计算，不公开个人收藏。
- 浏览器仍保存个人题目和题目状态的本地 fallback；公共题目不再塞进用户状态备份。

当前公共题库源记录在：

```text
data/question-banks/catalog-manifest.json
```

批量重建当前量化书籍题库，并刷新前端/后端公共题库 JSON：

```bash
cd /Users/miujiawei/Desktop/QuantGym
node scripts/import-quant-books.mjs
```

如果书籍目录不在默认位置：

```bash
node scripts/import-quant-books.mjs --book-root /absolute/path/to/量化书籍
```

当前网页启用来源包含：

- 绿皮书 183
- 黄皮书 153
- 红宝书 240
- Hull 期权期货及其他衍生品 763
- Stefanica 金融工程数学入门 35
- Quantitative Primer 41
- Dudeney 经典挑战谜题 123
- 金融工程线性代数入门 18
- 概率与随机分析面试题 10 题 11
- QuantGuide 1,204

Archived Question Bank 128 条当前在 `data/question-banks/catalog-manifest.json` 中标记为 disabled；源 JSON 仍保留，方便之后确认授权后恢复，但不会进入 `data/problem-catalog.json`、`data/problem-catalog.js` 或 SQLite 公共题库。

注意：`quantguide/` 是本地授权账户导出的私有题源包。当前项目 owner 已确认它可以给这轮内测用户使用。若未来扩大到公开发布或商业分发，需要重新确认授权边界；如果不能继续分发，请在 `data/question-banks/catalog-manifest.json` 中给 `quantguide` 加上 `"disabled": true` 后运行 `node scripts/build-problem-catalog.mjs`。

抽取脚本会先写入 `data/question-banks/<book-slug>/problems.json`，再自动运行汇总脚本生成 `data/problem-catalog.json` 和 `data/problem-catalog.js`。重启 `api-server/server.py` 后，JSON 会被导入 SQLite 的公共题库表；若 API 已在运行，需要重新导入或重启后端，让前端通过 API 读取最新题库。

临时导入单本 LaTeX 资料仍可使用：

```bash
node scripts/extract-latex-question-bank.mjs \
  --input /absolute/path/to/book.tex \
  --slug new-book \
  --name "新书名"
```

### 简历模块

账户页可以上传或保存简历信息，简历页可以继续编辑和复盘。

支持：

- 上传或粘贴简历文本。
- 保存当前简历内容到用户状态。
- 调用 LLM 生成 quant internship / full-time 方向的修改要点。
- 没有 LLM 时也会给本地 fallback 修改建议。
- 备战计划会在申请和材料阶段把简历整理与岗位扫描排进每日任务。

### 求职模块

求职模块用于收集和展示 internship / full-time 机会：

- 支持 internship / full-time 筛选。
- 岗位卡展示职位、公司、地点、标签和发布时间。
- 每张卡提供外部申请链接。
- 当前数据结构已经为后续爬虫或 API 写入岗位做了准备。

### 社区和人脉

社区模块支持：

- 发布训练动态。
- 添加照片或视频。
- 点赞、评论、删除自己的动态。
- Dashboard 上有轻量社区入口。

人脉模块支持：

- 记录联系人、公司/学校、职位关系、状态、渠道、下一步和备注。
- 保存 follow-up 状态，适合求职 networking 管理。

### 新闻

LLM 代理提供：

```text
GET  http://127.0.0.1:8787/news
POST http://127.0.0.1:8787/news
```

新闻模块会聚合 Quant / market making / Jane Street / options / AI trading 相关 RSS，并把新闻映射到能力标签。

### Chrome 插件

目录：

```text
browser-extension/
```

安装：

1. 打开 Chrome。
2. 进入 `chrome://extensions`。
3. 打开 Developer mode。
4. 点击 Load unpacked。
5. 选择 `browser-extension` 文件夹。

使用：

1. 打开 LeetCode 或题目网页。
2. 点击 Quant Memory Collector。
3. 点击“收录到面板”。
4. 插件会打开 QuantGym 并携带题目数据。
5. 如果 URL 太长，插件会复制 JSON，之后可以在题库里粘贴导入。

## API 列表

默认 base URL：

```text
http://127.0.0.1:8790/api
```

| 方法 | 路径 | 作用 |
| --- | --- | --- |
| `GET` | `/health` | 检查 API 是否在线 |
| `POST` | `/auth/verification-code` | 发送邮箱注册验证码 |
| `POST` | `/auth/register` | 邮箱注册 |
| `POST` | `/auth/login` | 邮箱登录 |
| `POST` | `/auth/google` | Google 云端登录 |
| `GET` | `/account` | 获取当前用户资料 |
| `PATCH` | `/account` | 更新当前用户资料 |
| `GET` | `/state` | 获取当前用户训练状态 |
| `PUT` | `/state` | 覆盖保存当前用户训练状态 |
| `GET` | `/problems` | 读取公共题库和当前用户个人题目 |
| `PUT` | `/problems` | 新增或更新当前用户个人题目 |
| `DELETE` | `/problems/:id` | 删除当前用户个人题目 |
| `GET` | `/problem-states` | 获取当前用户收藏和题目练习状态 |
| `PUT` | `/problem-states` | 更新当前用户题目状态 |
| `GET` | `/problem-social` | 获取可见题目的共享互动摘要与当前用户点赞状态 |
| `GET` | `/problem-social/:id` | 获取单题点赞计数和评论列表 |
| `POST` | `/problem-social/:id/like` | 切换当前用户对题目的点赞 |
| `POST` | `/problem-social/:id/comments` | 发布单题评论 |
| `DELETE` | `/problem-social/:id/comments/:commentId` | 删除当前用户自己的评论 |
| `GET` | `/community` | 获取社区动态 |
| `PUT` | `/community` | 覆盖保存社区动态 |
| `POST` | `/sync` | 前端统一同步入口 |

需要登录的接口使用：

```text
Authorization: Bearer <token>
```

## 常用检查命令

检查前端脚本：

```bash
node --check app.js
```

检查 LLM 代理：

```bash
node --check llm-proxy/server.mjs
```

检查后端：

```bash
python3 -m py_compile api-server/server.py
```

检查插件：

```bash
node --check browser-extension/popup.js
```

检查静态发布构建：

```bash
QUANTGYM_WEB_API_ENDPOINT="https://api.quantgym.app/api" \
QUANTGYM_WEB_LLM_ENDPOINT="https://llm.quantgym.app/interview" \
node scripts/build-static-site.mjs --strict
```

## 故障排查

### 页面打不开

确认网页服务在跑：

```bash
python3 -m http.server 5176
```

打开：

```text
http://127.0.0.1:5176/index.html
```

### 云端同步失败

确认 API 在跑：

```bash
python3 api-server/server.py
```

检查：

```text
http://127.0.0.1:8790/api/health
```

确认页面设置里的 Cloud API Endpoint 是：

```text
http://127.0.0.1:8790/api
```

### 模拟面试没有 LLM 回复

确认 LLM 代理在跑：

```bash
node llm-proxy/server.mjs
```

检查：

```bash
curl http://127.0.0.1:8787/health
```

确认页面里的 LLM Endpoint 是：

```text
http://127.0.0.1:8787/interview
```

如果返回 `OPENAI_API_KEY is not set`，检查项目根目录的 `.env` 是否存在，且是否包含：

```bash
OPENAI_API_KEY=sk-...
```

### 改了前端但页面没变化

先强制刷新浏览器。当前页面通过版本号加载：

```text
styles.css?v=premium-system-13
data/problem-catalog.js?v=quant-books-1
app.js?v=premium-system-17
```

如果之后继续大改前端，可以递增这个版本号来绕过缓存。

### 8787 端口被占用

查看占用：

```bash
lsof -nP -iTCP:8787 -sTCP:LISTEN
```

如果是旧的 `node llm-proxy/server.mjs`，先在那个终端按 `Ctrl+C` 停掉，再重新启动。

### 数据重置

重置 SQLite 数据库前先停止 API 服务：

```bash
rm api-server/data/quantgym.sqlite3
python3 api-server/server.py
```

重置浏览器本地数据，在 DevTools Console 执行：

```js
localStorage.clear()
sessionStorage.clear()
```

这会清空当前浏览器里的 QuantGym 本地数据，操作前请确认已经导出备份或同步。

## 当前限制

- 邀请制内测已经具备 HTTPS、邮箱验证码和邮箱白名单；仍需要更完整的 rate limit、密码找回、管理后台和运维监控。
- Google 云端登录现在会把 ID token 送到 API 校验；要启用它，前后端都要配置同一个 Google Client ID。当前无依赖实现适合内测，公开版要换成正式 Google/JWT 验证库。
- 图片/视频仍可能以 data URL 存入 JSON，长期建议迁移到对象存储。
- SQLite 当前适合个人或小规模原型，公开多人使用时建议迁移到 Postgres。
- 前端仍是单文件主逻辑，后续可拆成 Vite + 模块化结构。
- 求职模块目前是结构和样例数据，后续需要接入真实爬虫或职位 API。
- LeetCode 目前有能力项和 Chrome 插件收集入口，Hot 100 专属页面、跳转和完成记录还没有做完。
- Chrome 插件默认打开本地网页地址，内测时需要让测试者在插件弹窗里改成 `https://beta.quantgym.app/index.html`，或暂时不作为正式内测功能。
- `docs/ui-reference/` 里的参考图多数没有 alpha，正式接入前需要重新抠图或生成透明 WebP。

## 推荐下一步

个人使用优先：

1. 多录入题库和资料。
2. 持续使用模拟面试与面经记录沉淀复盘。
3. 优化题库分类和答案解析。
4. 做 LeetCode Hot 100 页面，并把完成状态写入能力值和训练历史。

产品化优先：

1. 邀请 3 到 10 个内测用户，用白名单邮箱走完整注册、训练、同步和模拟面试流程。
2. 观察 Render 日志、Resend 邮件投递和 OpenAI 成本。
3. 补密码重置、基础限流、错误监控和简单管理后台。
4. Chrome 插件改为直接写 API。
5. 媒体迁移到对象存储。
6. 把 `app.js` 拆成现代前端工程。
7. 求职模块接入真实 internship / full-time 爬虫数据。
