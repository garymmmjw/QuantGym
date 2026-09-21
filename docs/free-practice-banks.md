# 自由刷题题库

2026-09-20：`/problems` 以五个独立题库作为入口。

| 题库 | 可浏览题数 | 目录 |
| --- | ---: | --- |
| 紫皮书 | 140 | 原书章节 → 小节 |
| QuantGuide | 1,201 | 原始主题 |
| 小红书面经 | 878 | 公司 |
| 一亩三分地面经 | 618 | 公司 |
| Glassdoor 面经 | 316 | 公司 |
| 合计 | 3,153 | |

紫皮书已更新为 2026-09-13 Tech Interview 整理的 162 页版（含 v1.4 更新）：118 道正文题、22 道附录练习题，共 140 题均有参考解答。保留全部旧 128 个题目 ID，新增正文题使用 `catalog-problem-107` 至 `catalog-problem-118`；题目按原书编号排序。22 道附录答案是补充解答，原书没有附答案。详情分别标注原书、订正、补充或已核对解答，并保留原书答案对照及修订说明。

另有 31 条 LeetCode 阅读清单保存在独立的 `reading-list.json`，不计入 140 道完整题目。面经只导入上游审核通过的题目；保存的候选数量不等同于可刷题数量。其他书籍及微信题目仍保留在完整题目目录中。

## 浏览和进度

- 面经统一公司别名；保留无法归入既有公司表的新公司，没有明确公司的题目进入“公司未明确”。一道题可以出现在多个公司目录下，其原始 ID、笔记、收藏和练习记录共用。
- 支持题目搜索、难度、未练／已练／收藏筛选；面经还可按知识点筛选，每页 20 题。
- 题库、目录、筛选、页码及当前题目写入网址，刷新或浏览器后退可以恢复。上一题／下一题限定在当前筛选结果中；记录当前题的结果后仍可继续下一题。
- “继续刷题”优先恢复当前账号在该题库最近打开且未练的题目，否则从第一道未练题开始。
- 从书库点击“练题”直接进入对应题库；全局搜索可以直接打开题目。
- 提示和答案可随时展开，沿用原有个人笔记、收藏及旧完成记录。支持中英文、深色主题和手机布局。

## 单题计时与结果

- 打开题目自动开始计时，刷新或重新打开继续该次计时；计时采用实际经过时间，离开页面也不会重置。
- 随时可查看答案或提示，不会自动提交结果；选择「自己做对」「有思路做错」「做错」任意一项，才记一次练习并停止计时。
- 从首次选择结果的时刻起，保留选中状态 24 小时。期间允许改选，只更新同一次结果，次数、首次提交时间和用时不变，也不会延长冷冻期。
- 满 24 小时自动清除当前选中状态。在页面中会开始新一次计时；再次选择结果，历史中新增一次。冷冻期按经过的 24 小时计算，不按自然日零点刷新。
- 每道题保存每次练习的结果、开始和提交时间、用时及答案／提示查看标记；旧记录不会随冷冻期到期删除。题库「已练」统计做过的不同题目，单题显示累计练习次数。
- 记录随账号保存并进入既有备份、云同步数据。合并时保留历史，同一个 24 小时窗口内的不同设备结果合并为一次，以较新的选择为准。
- 本阶段不把新记录写入 Tech 总题量、旧面试次数或技能分数；之后再单独接入统计。

## 发布与题库更新

网页继续由 Cloudflare Pages 发布到 `https://beta.quantgym.app`，API 由 Render `quantgym-api` 提供。此功能基于最新主分支移植，保留既有力扣同步、技术练习和账号功能。

公开构建仅包含明确标为 `public` 的题目。五个自由刷题题库由登录后的 `/api/problems` 返回，私人题干不随本次代码提交或静态资源发布。

已审核题库通过服务器 CLI 导入现有数据库。每个来源独立校验、原子更新，保留稳定 ID 和完整章节、出处、答案说明；旧版题目退役时保留原有学习记录及关联内容。导入的版本优先于旧仓库种子目录，服务器重启不会恢复过时题目。原 Technical Interview 的紫皮书 Secret File 保持独立。

本地题库来源与审核过程见开发工作区；不得把运行时私有导入包加入公开 Git。通过已认证的服务器连接传入私有文件后，先校验，再导入。例如紫皮书：

```sh
python3 api-server/import_private_practice.py --source question-bank --expected-count 140 --file /tmp/question-bank.json --validate-only
python3 api-server/import_private_practice.py --source question-bank --expected-count 140 --file /tmp/question-bank.json
```

其他来源为 `quantguide`、`interview-xiaohongshu`、`interview-onepoint3acres`、`interview-glassdoor`，数量见上表。导入输出仅包含数量、摘要及退役数量；完成后移除临时传输文件，并检查匿名目录不含这些来源、登录后的各题库数量正确。

## 验证

```sh
npm run test:free-practice
python3 scripts/test-free-practice-state-api.py
python3 scripts/test-private-practice-catalog-api.py
node scripts/check-route-integrity.mjs
npm run build
```

浏览器验收使用隔离账号和浏览器上下文，不修改使用者的登录或练习记录：

```sh
FREE_PRACTICE_QA_URL=http://127.0.0.1:5176 node scripts/check-free-practice-attempts-browser.mjs
```

浏览器脚本默认使用本机 Google Chrome，可通过 `CHROME_PATH` 指定其他 Chromium。验收包括刷新、账号隔离及模拟经过 24 小时，报告和桌面、手机截图输出到 `artifacts/free-practice-attempts/`。

在公开 checkout 中运行浏览器测试时，通过 `FREE_PRACTICE_QA_CATALOG` 和 `FREE_PRACTICE_QA_PURPLE` 指向本机私有测试目录；脚本只在隔离测试浏览器中注入题库。

认证目录刷新还需在生产构建预览中验证：先让五库空目录显示，再放行模拟接口响应，确认不点击或刷新也会自动显示完整数量。此脚本拦截所有写请求，私有题目仅通过隔离浏览器内的模拟接口返回：

```sh
QA_URL=http://127.0.0.1:5178 PRIVATE_CATALOG=/path/to/private/problem-catalog.json node scripts/check-authenticated-catalog-browser.mjs
```
