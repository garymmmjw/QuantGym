# QuantGym 内测上线清单

这份清单面向小范围、邀请制内测。当前仓库已经有静态网页、SQLite API、LLM/news 代理和可打包的 Chrome Collector 扩展；内测最小架构可以先保持这三项服务，不必先把前端重写成完整工程。

## 你需要准备

1. 一个内测域名或子域名，至少能给网页、API 和 LLM 代理提供 HTTPS。当前使用 `quantgym.app`。
2. 一台能长期运行 Python 3 和 Node.js、带持久化磁盘和备份能力的服务器，或者等价的托管组合。当前 API 和 LLM 代理部署在 Render。
3. 一个 OpenAI API key，放在 LLM 代理服务端，不要写进前端文件。
4. 一份测试用户邮箱名单。封闭内测建议先只放行这些邮箱。
5. 可选的 Google OAuth Web Client ID。暂时不测 Google 登录时，让 `QUANTGYM_WEB_GOOGLE_CLIENT_ID` 为空，并设置 `QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=0`。
6. 题源分发权限确认。当前题库会导入 15 个 active sources、2,997 条题目，其中 `quantguide` 在 catalog 中保持 `private` visibility，并已由项目 owner 确认可用于这轮邀请制内测；跑 `npm run check:question-bank-rights` 确认 private beta 边界。未来扩大公开发布或商业分发前必须先让 `npm run check:question-bank-rights:public` 通过。

## 推荐拓扑

- 静态网页：`https://beta.quantgym.app`，Cloudflare Pages 只发布构建后的 `dist/` 目录
- API：`https://api.quantgym.app/api`，Render service `quantgym-api`
- LLM 代理：`https://llm.quantgym.app/interview`，Render service `quantgym-llm`
- SQLite：放在 API 服务的持久化磁盘上，并做定时备份

网页部署时不要直接发布仓库根目录。用构建脚本生成 `dist/`，脚本会写入部署用 `dist/config.js`：

```bash
QUANTGYM_WEB_API_ENDPOINT="https://api.quantgym.app/api" \
QUANTGYM_WEB_LLM_ENDPOINT="https://llm.quantgym.app/interview" \
QUANTGYM_WEB_LLM_MODEL="gpt-5-nano" \
QUANTGYM_WEB_GOOGLE_CLIENT_ID="" \
QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=0 \
node scripts/build-static-site.mjs --strict
```

静态托管平台的 publish directory 设置为 `dist`。这样不会把 `data/question-banks/quantguide/raw-export/`、`artifacts/`、`docs/ui-reference/`、脚本或后端代码暴露成可访问静态文件。

## API 服务

API 部署前至少设置这些环境变量：

```bash
export PORT=8790
export QUANTGYM_HOST=0.0.0.0
export QUANTGYM_DB="/var/data/quantgym.sqlite3"
export QUANTGYM_MEDIA_ROOT="/var/data/media"
export QUANTGYM_MEDIA_MAX_BYTES=5242880
# 小规模封闭 beta 可以先用持久化 QUANTGYM_MEDIA_ROOT；正式生产签收必须改成真实 S3/R2 + CDN。
# export QUANTGYM_MEDIA_STORAGE="r2"
# export QUANTGYM_MEDIA_S3_ENDPOINT="https://<account-id>.r2.cloudflarestorage.com"
# export QUANTGYM_MEDIA_S3_BUCKET="quantgym-media"
# export QUANTGYM_MEDIA_S3_ACCESS_KEY_ID="<real object-storage access key>"
# export QUANTGYM_MEDIA_S3_SECRET_ACCESS_KEY="<real object-storage secret key>"
# export QUANTGYM_MEDIA_S3_PREFIX="media"
# export QUANTGYM_MEDIA_PUBLIC_BASE_URL="https://media.quantgym.app"
# 生产职位源需要真实 HTTPS crawler/vendor feed；非公开 feed 建议配置 24+ 字符 bearer token。
# export QUANTGYM_JOBS_SOURCE_URL="https://jobs.vendor.example/quantgym/jobs.json"
# export QUANTGYM_JOBS_SOURCE_TOKEN="<24+ character feed bearer token>"
export QUANTGYM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export QUANTGYM_BETA_EMAIL_ALLOWLIST="tester1@example.com,tester2@example.com"
export QUANTGYM_ADMIN_EMAILS="miaojiawei1108@gmail.com"
export QUANTGYM_RATE_LIMIT_WINDOW_SECONDS=60
export QUANTGYM_AUTH_RATE_LIMIT_MAX=30
export QUANTGYM_AUTH_VERIFICATION_RATE_LIMIT_MAX=5
export QUANTGYM_ALERT_WEBHOOK_URL="https://alerts.example.com/quantgym-alerts"
# Generate a real value with: openssl rand -base64 32
export QUANTGYM_ALERT_WEBHOOK_TOKEN="<32+ character random bearer token>"
export QUANTGYM_ALERT_MIN_STATUS_CODE=500
# 只在 Cloudflare/Render/反向代理边缘限流已配置后取消注释并填入真实证据。
# export QUANTGYM_EDGE_RATE_LIMIT_CONFIRMED=1
# export QUANTGYM_EDGE_RATE_LIMIT_PROVIDER="cloudflare"
# export QUANTGYM_EDGE_RATE_LIMIT_NOTES="Cloudflare edge rule covers /api/auth/* bursts by IP."
# export QUANTGYM_EDGE_RATE_LIMIT_EVIDENCE_URL="https://dash.cloudflare.com/account/rulesets/rule"
export QUANTGYM_REQUIRE_EMAIL_VERIFICATION=1
export QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0
export QUANTGYM_SMTP_HOST="smtp.resend.com"
export QUANTGYM_SMTP_PORT=587
export QUANTGYM_SMTP_USERNAME="resend"
export QUANTGYM_SMTP_PASSWORD="<Resend API key>"
export QUANTGYM_SMTP_FROM="QuantGym <no-reply@quantgym.app>"
```

如果部署平台要求进程监听公网网卡，再把 `QUANTGYM_HOST` 改为 `0.0.0.0`，并由平台或反向代理提供 HTTPS。

要启用 Google 云端登录，再补：

```bash
export QUANTGYM_GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
```

这个 Client ID 必须和网页 `config.js` 里的 `googleClientId` 一致。API 会本地解码前端送来的 Google ID token，使用 Google JWKS 校验 RS256 签名，并检查 issuer、audience、过期时间、subject 和已验证邮箱，然后只从已验证 claims 推导 Google 用户 id 和邮箱。

## LLM 代理

LLM 代理部署前至少设置：

```bash
export OPENAI_API_KEY="<OpenAI API key>"
export PORT=8787
export LLM_PROXY_HOST=0.0.0.0
export LLM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export LLM_AUTH_API_BASE="https://api.quantgym.app/api"
export LLM_MAX_BODY_BYTES=12582912
```

`LLM_AUTH_API_BASE` 会要求模拟面试和学习记录分类请求带有效的 QuantGym 云端 session；封闭内测建议打开它，避免未在 allowlist 的纯本地用户直接消耗 OpenAI key。`LLM_MAX_BODY_BYTES` 默认是 12 MiB。网页支持 PDF 面试材料和答案附件，反向代理的请求体上限也要同步检查。

## 上线步骤

1. 生成并部署静态网页 `dist/`，确认 `dist/config.js` 指向 HTTPS API 和 HTTPS LLM endpoint。
2. 部署 API，确认 SQLite 路径在持久化磁盘；小规模封闭 beta 的媒体可先用持久化 `QUANTGYM_MEDIA_ROOT`，本地用 `npm run check:media-storage:runtime-smoke` 验证真实上传/下载路径。正式生产签收需要配置 S3/R2 兼容对象存储和 `QUANTGYM_MEDIA_PUBLIC_BASE_URL`，先跑 `npm run check:media-storage:production` 确认变量完整、HTTPS endpoint 和 public base URL 都合格，再跑 `npm run check:media-storage:production -- --live` 写入、读取、公开获取并删除一个 tiny readiness object。
3. 部署 LLM 代理，确认 OpenAI key 只存在服务端环境变量，并打开 `LLM_AUTH_API_BASE`。
4. 在反向代理或托管平台开启 HTTPS、访问日志、请求体上限和边缘 rate limit；API 自身也会对 auth 入口做基础内存限流，并提供 admin-only metrics/audit endpoints，管理员登录后可在账户页看到小型运维概览。本地先跑 `npm run check:ops-alerts:runtime-smoke` 确认 API 运行时告警链路；Cloudflare Worker 告警接收器在 `workers/quantgym-alert-receiver/worker.mjs`，部署前跑 `npm run check:ops-alerts:worker-fixture`；配置真实 alert receiver 后跑 `npm run check:ops-alerts:production`；需要实发测试时加 `-- --smoke`。
5. 访问 `GET /api/health` 和 `GET /health`，确认 API 和 LLM 代理在线。
6. 跑一次只读 SQLite preflight：`python3 scripts/export-api-sqlite.py --db "$QUANTGYM_DB" --summary-only`，确认 integrity 和 foreign-key 检查通过；同时跑 `npm run check:postgres-cutover:export-smoke` 确认默认导出脱敏、full export 才能作为迁移输入；如需迁移/备份，再把 `--include-sensitive` 导出写到受保护位置。
7. 跑 `npm run check:repo-hygiene`，确认没有把 `.env`、SQLite、`dist/`、`artifacts/`、raw-export、大型私有文件或 secret-shaped 内容纳入 Git。
8. 重启 API，让它从已提交的 `data/problem-catalog.json` 导入 SQLite；确认 `GET /api/problems` 返回 2,997 条 catalog 题目。只有在重新抽取本地书籍题源时，才运行 `node scripts/import-quant-books.mjs`。
9. 跑 `npm run check:jobs-source:runtime-smoke` 确认本地 feed ingest/cache/fallback 路径，再跑 `npm run check:jobs-source:production`；清除真实 feed blocker 前必须再跑 `npm run check:jobs-source:production -- --live`，确认 feed 同时包含 internship/fulltime、唯一 id、HTTP(S) 职位 URL、真实 company/title/postedAt 和非未来日期，然后确认 `GET /api/jobs` 返回职位 catalog、`source: "catalog+source"` 并包含 feed 岗位。
10. 用 allowlist 里的邮箱走一遍验证码收信、注册、登录、题库读取、状态同步、模拟面试和新闻/岗位刷新。
11. 拉 3 到 10 个测试用户先跑一轮，收集浏览器、设备、失败步骤和 LLM 成本。

## 内测前仍要知道的限制

- 邮箱注册验证码和密码重置/找回流程已经可用；API 已有 admin-only metrics/audit endpoints，账户页也有管理员专用运维概览，但还不是完整后台系统。
- Google 云端登录已经走服务端 JWT/JWKS 签名校验；仍要在上线前保留真实 Google provider token 的 production-boundary 签收。
- 题源授权边界已有 `data/question-banks/source-rights-manifest.json` 和 `npm run check:question-bank-rights` gate；当前仅签收到邀请制 private beta。公开或商业分发前，逐源写入 public/commercial approval 并让 `npm run check:question-bank-rights:public` 通过。
- API 自身已有 auth 入口基础内存限流、admin-only metrics、audit events、24h HTTP 错误观测和可选 webhook 告警出口；`npm run check:ops-alerts:runtime-smoke` 会在本地触发 API 404 并验证 webhook payload 安全送达。封闭内测仍建议在反向代理或托管平台保留边缘限流，并用 `npm run check:ops-alerts:production` 验证真实外部告警接收器和边缘限流签收。
- Jobs 已有只读 API catalog、静态 fallback、可配置 crawler/vendor JSON feed 接入、`npm run check:jobs-source:runtime-smoke` 本地 runtime 验收和 `npm run check:jobs-source:production` 生产配置验收；生产还需要配置并运营真实 feed。
- 社区图片/视频、账户头像、Memory 资源图片和面试作答附件会优先上传到 `/api/media` 并在 JSON 中保存 URL；API 已支持本地持久化磁盘和 S3/R2 兼容对象存储，并有 `npm run check:media-storage:runtime-smoke` 验证本地真实上传/下载路径、`npm run check:media-storage:production` 检查生产变量。正式生产仍需要真实 bucket/CDN 的 `--live` 签收；LLM 面试评测请求仍可能临时携带附件内容用于评分。
- SQLite 适合这轮小规模内测；仓库已有只读 preflight/导出脚本、`api-server/postgres/schema.sql`、`npm run check:postgres-cutover` 和 `npm run check:postgres-cutover:export-smoke`，可用于备份和未来 Postgres cutover 准备，但公开多人版本仍应完成真实 Postgres 迁移与部署。
- `beta.quantgym.app` 是当前内测入口；裸域 `quantgym.app` 和 `www.quantgym.app` 仍要单独修 Cloudflare/源站 SSL 或配置正式跳转，目前先放入待解决清单。
- Chrome Collector 扩展已可用 `npm run check:browser-extension` 校验、`npm run check:browser-extension:runtime-smoke` 验证 popup 捕获/复制/打开/长题回退行为、`npm run check:chrome-store-readiness` 检查商店材料，并用 `npm run package:browser-extension` 打包；Chrome Web Store 真实提交和审核仍是单独上线步骤，发布后还要带真实 item id、listing URL、published 状态、submitted version 和 upload SHA-256 跑 `npm run check:chrome-store-publication:published`。
