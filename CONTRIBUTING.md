# QuantGym 协作流程

这份文件用于统一 QuantGym 的日常更新方式。当前仓库是 private repo，`main` 分支保护规则不强制生效，所以需要所有协作者自觉遵守 branch + pull request 流程。

## 核心原则

- `main` 只放稳定版本。
- 不直接往 `main` push。
- 每次修改都从最新 `main` 开新分支。
- 改完后 push 分支，并在 GitHub 上创建 Pull Request。
- PR 合并后，本地重新同步最新 `main`。
- 不提交 `.env`、真实密钥、本地数据库、用户数据或临时缓存。

## 每次开始修改

```bash
cd /Users/miujiawei/Desktop/QuantGym
git checkout main
git pull origin main
git checkout -b feature/short-description
```

分支命名建议：

- `feature/...`：新功能
- `fix/...`：bug 修复
- `docs/...`：文档修改
- `data/...`：题库或资料数据更新
- `chore/...`：配置、清理、脚本等维护工作

示例：

```bash
git checkout -b feature/leetcode-hot-100
git checkout -b fix/mobile-sidebar-overlap
git checkout -b docs/beta-deploy-notes
```

## 修改完成后

先检查有哪些文件被修改：

```bash
git status
```

如果确认这些改动都属于本次任务：

```bash
git add .
git commit -m "Describe the change"
git push -u origin feature/short-description
```

然后打开 GitHub，点击 `Compare & pull request`，创建 Pull Request。

## Pull Request 规则

PR 描述里建议写清楚：

- 改了什么
- 为什么改
- 如何验证
- 是否影响 API、LLM proxy、题库或部署配置

PR 合并前至少做一次自查：

```bash
git status
node --check app.js
node --check llm-proxy/server.mjs
node --check browser-extension/popup.js
python3 -m py_compile api-server/server.py
```

如果本次影响部署配置、前端入口或静态资源，再检查静态发布构建：

```bash
QUANTGYM_WEB_API_ENDPOINT="https://api.quantgym.app/api" \
QUANTGYM_WEB_LLM_ENDPOINT="https://llm.quantgym.app/interview" \
node scripts/build-static-site.mjs --strict
```

如果本次只改文档，可以只检查 `git status`。

## PR 合并后

回到本地同步 `main`：

```bash
git checkout main
git pull origin main
git branch -d feature/short-description
```

如果远程分支已经不需要，也可以在 GitHub PR 页面删除该分支。

## 如果 push 被拒绝

通常说明远程有新提交，先同步：

```bash
git checkout main
git pull origin main
```

如果你正在功能分支上开发，可以把最新 `main` 合进来：

```bash
git checkout feature/short-description
git merge main
```

如出现冲突，解决冲突后：

```bash
git add .
git commit
git push
```

## 敏感文件和数据

不要提交：

- `.env`
- OpenAI API key
- GitHub token
- SMTP 密码
- Google OAuth secret
- `api-server/data/*.sqlite3`
- 真实用户数据
- 本地日志和缓存
- `dist/`

可以提交：

- `.env.example`
- README 和部署说明
- 前端、API、LLM proxy、插件和脚本代码
- 已确认可用于内测分发的题库数据
- UI 资产和文档素材

当前 `quantguide` 题源已由项目 owner 确认可用于内测用户。若未来要扩大公开发布范围，需要重新确认分发权限。

## 常用命令速查

查看状态：

```bash
git status
```

查看当前分支：

```bash
git branch --show-current
```

同步最新 `main`：

```bash
git checkout main
git pull origin main
```

创建新分支：

```bash
git checkout -b feature/short-description
```

提交修改：

```bash
git add .
git commit -m "Describe the change"
```

推送当前分支：

```bash
git push -u origin HEAD
```
