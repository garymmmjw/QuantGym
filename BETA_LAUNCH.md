# QuantGym 内测上线清单

这份清单面向小范围、邀请制内测。当前仓库已经有静态网页、SQLite API、LLM/news 代理和 Chrome 插件原型；内测最小架构可以先保持这三项服务，不必先把前端重写成完整工程。

## 你需要准备

1. 一个内测域名或子域名，至少能给网页、API 和 LLM 代理提供 HTTPS。当前使用 `quantgym.app`。
2. 一台能长期运行 Python 3 和 Node.js、带持久化磁盘和备份能力的服务器，或者等价的托管组合。当前 API 和 LLM 代理部署在 Render。
3. 一个 OpenAI API key，放在 LLM 代理服务端，不要写进前端文件。
4. 一份测试用户邮箱名单。封闭内测建议先只放行这些邮箱。
5. 可选的 Google OAuth Web Client ID。暂时不测 Google 登录时，让 `QUANTGYM_WEB_GOOGLE_CLIENT_ID` 为空，并设置 `QUANTGYM_WEB_GOOGLE_LOGIN_ENABLED=0`。
6. 题源分发权限确认。当前公共题库会导入 10 个来源、2,771 条题目，其中 `quantguide` 已由项目 owner 确认可用于这轮内测用户；未来扩大公开发布或商业分发前需要重新确认授权边界。

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
export QUANTGYM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export QUANTGYM_BETA_EMAIL_ALLOWLIST="tester1@example.com,tester2@example.com"
export QUANTGYM_REQUIRE_EMAIL_VERIFICATION=1
export QUANTGYM_EMAIL_DEV_CODE_RESPONSE=0
export QUANTGYM_SMTP_HOST="smtp.resend.com"
export QUANTGYM_SMTP_PORT=587
export QUANTGYM_SMTP_USERNAME="resend"
export QUANTGYM_SMTP_PASSWORD="re_..."
export QUANTGYM_SMTP_FROM="QuantGym <no-reply@quantgym.app>"
```

如果部署平台要求进程监听公网网卡，再把 `QUANTGYM_HOST` 改为 `0.0.0.0`，并由平台或反向代理提供 HTTPS。

要启用 Google 云端登录，再补：

```bash
export QUANTGYM_GOOGLE_CLIENT_ID="xxxx.apps.googleusercontent.com"
```

这个 Client ID 必须和网页 `config.js` 里的 `googleClientId` 一致。API 会把前端送来的 Google ID token 交给 Google 校验，并从校验结果推导 Google 用户 id 和邮箱。这是无依赖内测实现；公开版应换成 Google/JWT 验证库，不要长期依赖 tokeninfo 校验端点。

## LLM 代理

LLM 代理部署前至少设置：

```bash
export OPENAI_API_KEY="sk-..."
export PORT=8787
export LLM_PROXY_HOST=0.0.0.0
export LLM_ALLOWED_ORIGINS="https://beta.quantgym.app"
export LLM_AUTH_API_BASE="https://api.quantgym.app/api"
export LLM_MAX_BODY_BYTES=12582912
```

`LLM_AUTH_API_BASE` 会要求模拟面试和学习记录分类请求带有效的 QuantGym 云端 session；封闭内测建议打开它，避免未在 allowlist 的纯本地用户直接消耗 OpenAI key。`LLM_MAX_BODY_BYTES` 默认是 12 MiB。网页支持 PDF 面试材料和答案附件，反向代理的请求体上限也要同步检查。

## 上线步骤

1. 生成并部署静态网页 `dist/`，确认 `dist/config.js` 指向 HTTPS API 和 HTTPS LLM endpoint。
2. 部署 API，确认 SQLite 路径在持久化磁盘，不在临时目录。
3. 部署 LLM 代理，确认 OpenAI key 只存在服务端环境变量，并打开 `LLM_AUTH_API_BASE`。
4. 在反向代理或托管平台开启 HTTPS、访问日志、请求体上限和基础 rate limit。
5. 访问 `GET /api/health` 和 `GET /health`，确认 API 和 LLM 代理在线。
6. 重启 API，让它从已提交的 `data/problem-catalog.json` 导入 SQLite；确认 `GET /api/problems` 返回 2,771 条公共题。只有在重新抽取本地书籍题源时，才运行 `node scripts/import-quant-books.mjs`。
7. 用 allowlist 里的邮箱走一遍验证码收信、注册、登录、题库读取、状态同步、模拟面试和新闻刷新。
8. 拉 3 到 10 个测试用户先跑一轮，收集浏览器、设备、失败步骤和 LLM 成本。

## 内测前仍要知道的限制

- 邮箱注册验证码已经可用；密码重置、找回流程和账号管理后台还没有做完。
- Google 云端登录当前是内测级校验路径；公开版要换成正式 ID token 验证库。
- API 自身还没有完整 rate limit、审计后台和管理后台，封闭内测应先在反向代理或托管平台限流。
- 图片/视频数据仍可能以 data URL 进入 JSON 状态；媒体多起来后要迁到对象存储。
- SQLite 适合这轮小规模内测；公开多人版本更适合迁到 Postgres。
- 不要把浏览器插件当成生产分发件，它现在仍是本地加载的原型。
