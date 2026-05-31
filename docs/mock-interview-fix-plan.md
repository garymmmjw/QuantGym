# 模拟面试：问题清单 + 修复方案

> 基于当前已合并版本（commit `a2cb33b Upgrade mock interview experience`）的实机截图与代码定位。
> 日期：2026-05-30。目标：先修显示/排版 bug，再把整体体验拉向「干净的单列 LLM 对话」。
> 工作方式：本文档为问题清单 + 修复方案，确认后再改代码。

总体判断：后端逻辑（AI-led onboarding 状态机、converse、practice/live 分流、persona）其实已基本就绪，
问题集中在**前端显示、布局和对话质感**。很多 bug 的共同根因是：新样式/新结构追加在旧结构之上，
两套 CSS 与「做题卡片」时代的双栏布局没有清掉。

---

## 第一部分：显示 / 排版 Bug（实机确认）

### P0-1 右侧面板公式不渲染，显示原始 LaTeX
现象：训练面板 Q1 卡片直接显示 `Let $W_t$ be ... $\text{Var}\left(\displaystyle\int_0^t W_s ds\right)$ ... $kt^3$`。
根因：`renderInterviewQuestionPanel`（src/main.js:9483-9485）用 `prompt.textContent = promptText` 纯文本写入；
而 `scheduleMathTypeset` 只在 transcript / 题库 / 题目详情处调用（main.js:8120、8577、8988），**从未对
`els.interviewQuestionPanel` 调用**。
修复：面板题干改用富文本渲染并在渲染后对面板根节点 `scheduleMathTypeset(els.interviewQuestionPanel)`；
或在面板里仅显示标题、不显示题干（见 P0-3，更推荐）。

### P0-2 顶部状态泄漏：onboarding 阶段就显示「本题时间到。」+ 00:00 计时
现象：还在问语言/模式时，头部小字已是「本题时间到。」，计时器显示 00:00。
根因：`updateInterviewStatus` 的状态没有在 onboarding 阶段正确置位；timeup/active 文案（main.js:12104-12105）
在没有进入答题时被命中或残留。
修复：onboarding 阶段头部状态固定为「配置中…」类文案，计时器隐藏；只有 `finalizeInterviewOnboarding`
进入第一题后才显示题号/计时。用 `isInterviewOnboarding()` 统一 gate。

### P0-3 onboarding 阶段右侧面板剧透全部题目
现象：刚开始配置，右侧已列出 Q1–Q10（含题干），并显示 `1/10`、`0/10`、方向「混合」。
根因：题目在进入对话前/中已生成，`renderInterviewQuestionPanel` 未按阶段 gate；
且 live 模式剧透题目会直接破坏「真实面试」前提。
修复：
- onboarding 阶段：面板只显示占位（「完成配置后这里显示进度」），不渲染题目。
- live 模式：面板只显示进度/剩余，**不显示题干、不显示未来题目**（方案 C 已定）。
- practice 模式：可显示题号与状态，但默认**不展开题干**（点开当前题才显示），避免剧透。

### P0-4 输入框悬浮在空白区中间、placeholder 被裁切
现象：输入框浮在左侧大片空白中部，没有钉在底部；placeholder「Enter 发送，Shift+Enter 换行」第二行被切掉。
根因：
- `interview-workspace`/`interview-transcript` 与 `interview-form` 的 flex 布局没有让 transcript 撑满、
  表单吸底；空对话时 transcript 高度塌陷，输入框上浮。
- `textarea#interviewAnswer rows="1"`（index.html:1193）高度只够一行，两行 placeholder 被裁。
修复：
- 对话区改为 `flex-direction:column`，transcript `flex:1; min-height:0; overflow:auto`，表单 `position:sticky; bottom:0`
  或作为 flex 末项吸底。
- placeholder 缩短为一行（如「输入你的回答…」），快捷键提示移到输入框下方的小字或 tooltip；textarea
  最小高度按内容自适应（已有 `autoSizeInterviewAnswer`，需保证初始 min-height）。

### P0-5 CSS 新旧规则重叠冲突
现象：`.interview-console`/`.interview-grid`/`.interview-setup`/`.interview-form` 在 styles.css 的
~820–1000 与 ~9700–9880 两处都有定义。
根因：升级时新样式整体追加到文件末尾，旧的「做题卡片」样式没删，导致覆盖顺序混乱、间距不可控。
修复：合并为单一权威区块，删除过时旧规则；用一处变量（圆角、间距、气泡色）统一控制。建议在改动前
先 `grep -n "\.interview" styles.css` 列出全部规则做去重表。

### P0-6 背景照片外溢 + 「今日待办」悬浮按钮压住面板
现象：内容卡片右侧/边缘露出葡萄园/树林照片；右下「今日待办 4」浮层压在面板/输入框上。
根因：模块内容容器未铺满视口宽度，露出 app 背景图；全局悬浮待办的 z-index/位置与面试区冲突。
修复：面试模块容器铺满可用区并用纯色/极淡渐变背景，盖住照片；面试区激活时给悬浮待办让位
（下移或降低层级），避免遮挡输入框与面板。

### P1-7 题目标题是书本导入的原始名，未清洗
现象：面板显示「Q8. Question 29.24 – in 2 y...」「Q9. Question 5.6 – futures ...」。
根因：题库导入时标题保留了书本编号（Question X.Y），未生成可读标题。
修复：导入/抽样时为这类题目生成简洁标题（按类别+主题），或在面板用类别+难度替代裸编号。

### P1-8 底部全宽「收藏夹」割裂对话
现象：对话下方还有一整块「收藏夹 / 完成一题后可以把要点收进这里」。
根因：沿用旧版做题区结构。
修复：收藏夹移出主对话流（收进右侧面板的折叠区，或结束报告里），保持对话区聚焦。

---

## 第二部分：「不像 LLM 对话」的体验问题

### E1 双栏布局破坏单列对话感（最关键）
现状：左对话 + 右题目面板的双栏，像「做题工作台」而非聊天。
方案（已选「单列 ChatGPT 式」）：
- 主体改为**居中单列对话流**（最大宽度约 720–820px，水平居中）。
- 题目作为对话里的**消息卡片**出现（面试官「发」出题目），而非常驻右栏。
- 进度/计时收进顶部细条（live 仅进度；practice 可显示题号+均分），不再占用右栏。
- practice 的题目导航/低分复盘改为**可收起的抽屉**或结束报告，而非常驻分栏。

### E2 消息整段直出，「像打印」不像 AI 输出
现状：onboarding 与题目消息用 `{typewriter:false}` 一次性渲染（main.js:handleOnboardingAnswer 等）。
方案（已选「打字机/流式」）：
- AI 面试官消息默认走逐字/分段流式渲染（已有 typing 通道与 `is-streaming`、thinking-dots，
  需要真正启用并控制节奏）。
- AI 回复前先显示 thinking-dots（已实现），随后流式吐字；用户消息即时显示。
- 流式速度可配置，长消息分段出现，避免瞬间刷屏。
- 注意：流式期间不要触发 MathJax 抖动，typeset 在该条消息完成后再跑（已有「无 typing 才 typeset」判断，
  需扩展到逐条完成时 typeset）。

### E3 输入框图标过多、拥挤
现状：输入框一行塞了 附件 / 语音 / Hint / 参考答案 / 清空 / 发送 6 个图标。
方案（已选「更干净的输入框」）：
- 只保留高频按钮在外：发送 + 语音 + 附件。
- Hint / 参考答案 / 清空 收进「更多」菜单（或 practice 才显示 Hint/参考答案，live 直接隐藏——与模式边界一致）。
- 发送按钮风格统一，hover/disabled 状态明确。

### E4 头像与气泡质感粗糙
现状：AI 头像是文字「Q」方块，用户「你」，系统「i」；每条都重复「AI 面试官」标签。
方案：
- AI 头像换成统一品牌图标（小圆形 logo/图标），用户用首字母/简洁色块；系统消息用更低存在感样式（无头像、居中细字）。
- 「AI 面试官」标签只在连续消息的第一条显示，连续同角色消息合并视觉分组。
- 用户的快捷选项（中文/训练练习等）改为更像「已选 chip」的右对齐气泡，不要像悬空药丸。

### E5 AI 主动开场已实现，但被表单气质拖累
现状：onboarding 对话其实在跑，但页面仍带「连接与题源」表单、旧 setup 残留，整体不够「进来就是对话」。
方案：
- 进入面试模块**直接是对话**（AI 第一句问语言），表单（endpoint/model/题源/类别）全部收进
  设置图标后的「高级」弹层，普通用户看不到。
- 「打开 AI 面试官」这种中间按钮去掉，进入即开始。

---

## 第三部分：修复优先级与落地顺序

阶段一（显示 bug 急修，纯前端，低风险）：
- P0-1 公式渲染、P0-2 状态泄漏、P0-4 输入框吸底+placeholder、P0-5 CSS 去重、P0-6 背景/浮层遮挡。
- 价值：页面立刻「不破」。

阶段二（对话质感，中风险）：
- E1 单列布局重构、E3 输入框精简、E4 头像/气泡、P0-3 面板按模式 gate、P1-8 收藏夹移位。
- 价值：从「做题台」变「对话」。

阶段三（流式与细节）：
- E2 流式逐字、E5 进入即对话/表单收纳、P1-7 题目标题清洗。
- 价值：补齐「像 LLM」的最后一层质感。

建议顺序：阶段一 → 阶段二 → 阶段三。阶段一+二即可解决你说的绝大部分「显示问题」和「不像对话」。

---

## 第四部分：验收清单（改完逐条自测）

显示：
1. 面板/对话里的公式正确渲染，无裸 `$...$`、`\text{}`。
2. onboarding 阶段头部不显示「本题时间到」，无计时；进入第一题后才出现题号与计时。
3. onboarding 阶段右侧不剧透题目；live 全程不显示未来题目与题干。
4. 输入框吸底、placeholder 不被裁切、空对话时不上浮。
5. styles.css 中 `.interview-*` 无重复冲突规则。
6. 无背景照片外溢；「今日待办」浮层不遮挡输入框/面板。

对话质感：
7. 主体为居中单列对话；题目以消息卡片出现。
8. AI 消息流式逐字出现，回复前有 thinking 状态。
9. 输入框只露 发送/语音/附件，其余收纳；live 隐藏 Hint/参考答案。
10. 头像/气泡统一；连续同角色消息不重复标签。
11. 进入模块即进入 AI 对话，无中间表单按钮。

静态检查：
- `node --check src/main.js`、`node --check llm-proxy/server.mjs`、`python3 -m py_compile api-server/server.py`。

---

## 附：实机观察来源
- 截图 1：onboarding 进行中，头部「本题时间到。」+00:00，右侧训练面板已列 Q1–Q10 且 Q1 显示原始 LaTeX。
- 截图 2：输入框悬浮左侧空白中部、placeholder 被裁，右侧面板 Q7–Q10 为书本原始题名，底部全宽收藏夹，
  右下「今日待办」浮层。
