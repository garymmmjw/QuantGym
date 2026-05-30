# QuantGym 模拟面试全面优化方案

> 目标：把当前「单题一次性作答 → 打分 → 下一题」的练习器，升级为接近真人面试的多轮对话式模拟，同时强化 AI 反馈深度、语音/多模态体验和题目覆盖。
> 交付定位：**方案文档（先确认方向，再改代码）**。对标方向：**通用 / 全覆盖**。
> 关键决策（已确认）：交互模式 = 多轮对话式追问（作为新的「真实面试模式」，保留现有单题模式作为「练习模式」）。

---

## 1. 现状盘点（基于代码）

**前端 `src/main.js`**

- 面试类型 `interviewTypeDefs`：`oa` / `technical` / `behavioral`。其中 `behavioral` 只有 4 道硬编码 STAR 题（`behavioralInterviewProblems`）。
- 配置项：类型、来源（题库 `full` / 上传 `pdf`）、作答方式（text / file / voice）、题数（1–12，`getInterviewQuestionCount`）、单题时间（1–60 分钟，`getInterviewQuestionSeconds`）、主题范围（`renderInterviewCategoryPicker`）。
- 主流程：`startInterview` → 生成题目 → 5 秒准备倒计时（`startInterviewPrepCountdown`）→ `showInterviewQuestion`（单题计时器）→ `submitInterviewAnswer` → `requestInterviewFeedback` → 记录 → 下一题或 `completeInterview`。
- **`submitInterviewAnswer` 是一次性的**：提交即评分并立即进入下一题，没有任何追问回合。`startInterview` 里 `answerMode` 实际被写死成 `"chat"`，而 setup 暴露的 text/file/voice 选项并未真正驱动流程。
- 语音：`SpeechRecognition`（Web Speech API），continuous + interimResults，zh-CN / en-US，只是把识别文本灌进 `els.interviewAnswer` 文本框；**没有读题 TTS，没有对话轮转**。
- 反馈：`requestInterviewFeedback` 调用 proxy 的 `evaluate`，返回**单一 0–100 分 + 四段**（评价/遗漏/参考方向/下一步）；离线兜底 `localInterviewFeedback`。
- 其他：Hint（`requestInterviewHint`，不泄答案）、参考答案 reveal（`revealInterviewAnswer`）、收藏、PK 模式。

**LLM 代理 `llm-proxy/server.mjs`**

- 仅 3 个 task：`evaluate` / `hint` / `generate_pdf_questions`。
- `evaluate`：强制「单一总分」，刻意压缩到约 120–220 中文字 / 90–160 英文词；支持题目图片与作答附件（image / pdf）。

---

## 2. 核心差距（对照你的四个目标）

| 目标 | 现状 | 差距 |
|---|---|---|
| 多轮对话式追问 | 单题一次性提交即评分 | **完全缺失**，无追问、无澄清、无动态深挖 |
| AI 反馈质量与深度 | 单一总分 + 四段紧凑文本 | 无分维度评分、无评分细则(rubric)、无与参考解法并排对比、无整场报告卡/趋势 |
| 语音与多模态体验 | 语音仅作输入灌入文本框 | 无读题 TTS、无连续语音轮转、无白板/手写/公式录入（仅文件上传）、Web Speech 脆弱无 Whisper 兜底 |
| 题目内容与覆盖 | 行为面 4 题硬编码 | 行为题库太薄、无公司/岗位定制、无难度分层与去重/新鲜度、缺脑筋急转弯/做市/心算的交互题型 |

---

## 3. 优化方案

四大支柱，按你确认的优先级排序（多轮对话 > AI 反馈 > 语音多模态 > 内容覆盖）。每条给出**目标 / 前端改动 / 代理改动 / 验收标准**。

### 支柱 A：多轮对话式面试官（最高优先级）

**目标**：每道题进入一段真实对话——面试官读题 → 候选人作答 → 面试官根据回答**追问 / 要求澄清 / 深挖边界条件 / 适度施压**，在判定「问够了」后再给小结并进入下一题。整场结束给总评。

**新增一个「真实面试模式」，与现有「练习模式」并存（用户可在 setup 切换）。**

前端改动（`src/main.js`）：

- Setup 增加模式开关：`practice`（保留现状）/ `live`（新对话流）。`getInterviewMode()`。
- 新增对话状态机，替换 live 模式下的 `submitInterviewAnswer` 单次逻辑：
  - 每道题维护 `turns`（本题对话历史）、`followupCount`、`maxFollowups`（按难度/时间预算，建议 1–4）、`interviewerSatisfied`。
  - 提交回答 → 调用新代理 task `converse` → 返回结构化结果：`{ action: "followup" | "wrap", message, runningAssessment, coverage }`。`followup` 时把面试官追问 append 到 transcript 并等待下一次作答；`wrap` 时给本题小结并 `showInterviewQuestion(next)`。
  - 超时 / 用户点「我答完了，进入下一题」可强制 `wrap`。
- 面试官「人设」（persona）：在 setup 暴露风格（友好引导 / 中性 / 高压快节奏），注入到 system prompt。
- UI：把现有 transcript 渲染区适配多轮气泡（面试官追问与候选人作答交替），保留 Hint。

代理改动（`llm-proxy/server.mjs`）：

- 新增 `createInterviewConversation(payload)`（task `converse`），在 `createInterviewReply` 路由里挂上。
- system prompt：扮演面试官；输入题目 ground truth + 完整 turns + persona + 已用追问数 + 时间预算；要求**只输出一条**面试官发言（追问或收尾），并附 `action` 与一份**累积评估**（覆盖了哪些点、还缺哪些）。返回紧凑 JSON。
- 收尾时复用/合并 `evaluate` 逻辑，产出该题最终分与维度分（见支柱 B）。

验收标准：live 模式下一道概率题能产生 2–4 轮自然追问；面试官不会泄露答案；超时与「跳过追问」均能优雅收尾；整场结束有总评。

---

### 支柱 B：AI 反馈质量与深度

**目标**：从「一个总分 + 四段」升级为**分维度评分 + 评分细则 + 参考解法对比 + 整场报告卡**，且仍可一眼读完。

代理改动（`evaluate` 与新 `converse` 收尾共用）：

- 输出结构化 JSON（不再是纯文本）：
  - `overall`（0–100）
  - `dimensions`：`correctness` / `reasoning` / `communication` / `speed`（各 0–5 + 一句话）
  - `missing`：要点清单（数组）
  - `referenceDelta`：候选人解法 vs 参考解法的关键差异（而非复述参考答案）
  - `nextStep`：1–2 条可执行建议
- 保留紧凑约束（每段一句话），靠结构而非长度承载深度。

前端改动：

- `normalizeInterviewFeedback` 改为解析结构化 JSON（保留纯文本兜底，兼容旧 `evaluate`）。
- 反馈渲染：维度雷达/条形 + 要点 chips + 「你的解法 vs 参考」对比块。可复用 `animateInterviewScores`。
- **整场报告卡**（`completeInterview` 增强）：各题分数、维度均值、按主题的强弱项、用时分布、最该补的 3 个点；可一键存为练习记录/导出。
- 评分细则透明化：把 rubric（每维度 0–5 的含义）展示给用户，减少「为什么是这个分」的困惑。

验收标准：单题反馈能看到四个维度分与「缺失要点」；整场结束有按主题的强弱项汇总；旧版纯文本反馈仍能正常显示（向后兼容）。

---

### 支柱 C：语音与多模态体验

**目标**：让「说」成为一等公民——面试官**读题（TTS）**、候选人**连续语音作答并自动轮转**，并支持**公式/手写**这类 quant 高频的表达方式。

前端改动：

- 读题 TTS：`showInterviewQuestion` / 面试官追问时用 `speechSynthesis` 朗读（可开关、可调语速、zh/en 跟随语言）。
- 连续语音轮转（live 模式）：当前 `SpeechRecognition` 只灌文本框；增加「静音自动断句 → 提交本轮 → 听面试官追问 → 再次开麦」的循环，做到准免手操作。保留可视化录音状态与「停止说话」。
- 兜底与稳健性：Web Speech 在非 Chrome 不可用，增加「录音上传 → 服务端转写」通道（新代理 task `transcribe`，走 Whisper/兼容 STT），失败时回退文本输入并提示。
- 多模态录入：
  - LaTeX/公式：作答框支持 `$...$` 渲染（KaTeX），让概率/期权推导可读。
  - 手写白板：轻量 canvas 让用户画推导/树图，提交时作为图片附件（已有 `answerAttachment` 图片通道，proxy 端 `createAttachmentInputPart` 已支持 image）。
- 表达力评估：当走语音时，`communication` 维度纳入「口头讲解结构是否清晰」（面试官最看重的信号之一）。

代理改动：

- 新增 `transcribe` task（音频 → 文本），供前端语音兜底调用。
- `converse` / `evaluate` 接收手写图片附件参与评估（复用现有图片输入逻辑）。

验收标准：面试官能朗读题目；live 模式可全程语音问答并自动轮转；上传一张手写推导能被纳入评分；非 Chrome 浏览器至少可走录音上传或文本兜底。

---

### 支柱 D：题目内容与覆盖（通用/全覆盖）

**目标**：在保持现有全方向覆盖的前提下补齐薄弱处，并支持轻量定制。

- **行为面扩库**：4 题 → 一个有结构的行为题库（按主题：影响力/冲突/失败/抗压/领导力/为什么量化/为什么我们），支持 STAR 追问（天然契合支柱 A 的多轮）。
- **难度分层与抽样**：`sampleInterviewQuestions` 增加按 `difficulty` 配比（Easy/Medium/Hard），让一场面试有梯度；live 模式可「答得好就加难」。
- **去重与新鲜度**：记录近期出过的题，抽样时降权，避免重复刷到同题。
- **交互题型增强**：心算/做市/脑筋急转弯做成限时快问快答（与现有 Mental Math 模块打通），而非纯文本评测。
- **轻量定制（非强对标某家）**：setup 增加可选「岗位侧重」标签（如 算法 / 概率统计 / ML / 市场直觉），影响抽样配比与面试官提问偏好；不绑定特定公司，保持通用。

验收标准：行为面有 ≥15 道且能被追问；一场技术面包含明显难度梯度；连续两场不会大量重题；可按岗位侧重调整题目分布。

---

## 4. 分阶段路线图

| 阶段 | 内容 | 价值 | 改动量 | 风险 |
|---|---|---|---|---|
| **P0 地基** | 引入 `interviewMode`（practice/live）开关；`evaluate` 改结构化 JSON + 前端兼容解析；行为题库扩充 | 立刻提升反馈深度，且不破坏现状 | 中 | 低（向后兼容） |
| **P1 多轮对话** | 新增代理 `converse` task + 前端对话状态机 + persona + 强制收尾/超时 | 你的最高优先级，体验质变 | 大 | 中（prompt 调优、状态机边界） |
| **P2 反馈报告** | 维度评分 UI + rubric 透明化 + 整场报告卡/趋势 | 让练习「可复盘」 | 中 | 低 |
| **P3 语音轮转** | 读题 TTS + 连续语音轮转 + `transcribe` 兜底 | 沉浸式真实感 | 中大 | 中（浏览器兼容、STT 成本） |
| **P4 多模态与题型** | KaTeX 公式 + 手写白板 + 难度分层/去重 + 心算做市交互 | 锦上添花、覆盖补齐 | 中 | 低 |

建议落地顺序：**P0 → P1 → P2 → P3 → P4**。P0+P1 完成后即可获得「多轮对话 + 更深反馈」的核心升级。

---

## 5. 技术风险与注意点

- **向后兼容**：`converse`/结构化 `evaluate` 上线时，前端解析必须保留旧纯文本兜底（`localInterviewFeedback` 路径不变），避免 proxy 未更新时白屏。
- **成本与延迟**：多轮对话会显著增加 LLM 调用次数；建议对追问数设上限（按难度 1–4）、对模型用更快档位（沿用 `DEFAULT_MODEL` 可配），并对 `converse` 输出做 token 预算。
- **Prompt 越权**：面试官追问时容易「不小心给答案」；system prompt 要明确禁止泄答案，并在收尾前不输出参考解法。
- **语音兼容**：Web Speech 仅 Chromium 稳定；`transcribe` 兜底与文本回退是必需项，不能默认所有用户能用浏览器 STT。
- **状态机边界**：超时、用户中途切题、刷新丢失会话——live 模式要把 `interviewSession` 的多轮状态纳入持久化与恢复。
- **i18n**：所有新文案需同时进 `src/i18n.js` 的 zh/en。

---

## 6. 验收与测试

- 静态检查：`node --check src/main.js`、`node --check llm-proxy/server.mjs`、`python3 -m py_compile api-server/server.py`。
- 本地冒烟（README「Local UI QA」）：补充 live 模式用例——概率题完成 2–4 轮追问、超时收尾、语音轮转、整场报告卡。
- 反馈正确性回归：对同一题构造「好答案 / 漏要点 / 答错」三类输入，核对维度分与缺失要点是否合理。
- 兼容性回归：proxy 仍返回旧纯文本时前端不报错；非 Chrome 浏览器语音降级正常。

---

## 7. 待你确认的开放问题

1. **新增模式命名/取舍**：是否同意「练习模式（保留现状）+ 真实面试模式（多轮）」双模式并存？还是直接把多轮设为默认？
2. **追问强度上限**：每题最多追问几轮（建议按难度 1–4，可全局调）？
3. **语音 STT 兜底**：是否接受引入服务端转写（如 Whisper，会有额外 API 成本）？还是先只做读题 TTS + Web Speech？
4. **报告卡落点**：整场报告卡是否需要导出（PDF/记录）并接入现有练习记录系统？

> 确认以上后，建议从 **P0 + P1** 开始落地。
