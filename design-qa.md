# 登录封面视觉 QA

**Findings**

当前没有未关闭的 P0/P1/P2 问题。第一轮发现的标题字重与小字对比度问题，在第二轮新截图中已确认修复；具体证据见比较历史。保留以下非阻断改进：

- **[P3] 表单辅助文字略轻、小于定稿。** 位置：注册切换行和顶部标语。源图这些文字略饱满，当前桌面截图稍小；仍可辨识且没有改变信息顺序。可做光学字重微调，不建议整体放大表单，以免重新造成 1280×800 底部溢出。品牌字标本轮已改用 Space Grotesk，不再保留上一轮“字标偏细”的问题。

- **[P3] 表单下半段节奏存在少量偏移。** 同尺寸对照中，实装 Google 按钮和监护入口大约比源图低十余像素，面板整体略宽、略靠右。输入框、主按钮、说明文字没有碰撞，主要区域比例仍成立。可选择微调 divider 上下间距，当前不需要改动整体栅格。

- **[P3] 极窄手机的副标题尾行较短。** 位置：320×740 的“和 Quanty 一起，把练习变成进步。”。末尾“进步。”独占第二行；字没有被遮挡，欢迎标题、两项字段和登录/Google 按钮完整可用，因此不阻断验收。若继续打磨，可在 340px 以下缩短副标题为“和 Quanty 一起，每天进步。”，保持原含义并改善行长。

**Comparison evidence**

- 源视觉真值：[approved-design.png](/Users/miujiawei/Desktop/QuantGym/.worktrees/login-cover/artifacts/login-cover/approved-design.png)。图像元数据实际为 **1586×992**，任务描述为 1586×991；底部相差 1 像素，不作为视觉问题。
- 桌面实装：[desktop.png](/Users/miujiawei/Desktop/QuantGym/.worktrees/login-cover/artifacts/login-cover/desktop.png)，**1586×991**；实现者报告 CSS 视口同尺寸。
- 小笔记本：[laptop.png](/Users/miujiawei/Desktop/QuantGym/.worktrees/login-cover/artifacts/login-cover/laptop.png)，**1280×800**；实现者报告 CSS 视口同尺寸。
- 手机：[mobile.png](/Users/miujiawei/Desktop/QuantGym/.worktrees/login-cover/artifacts/login-cover/mobile.png)，**390×844**；实现者报告 CSS 视口同尺寸。
- 新增极窄手机：[mobile-narrow.png](/Users/miujiawei/Desktop/QuantGym/.worktrees/login-cover/artifacts/login-cover/mobile-narrow.png)，**320×740**。
- 展开状态补证：[mobile-other-login.png](/Users/miujiawei/Desktop/QuantGym/.worktrees/login-cover/artifacts/login-cover/mobile-other-login.png)，**390×844**，已亲自打开。页面滚动至下方后，“其他登录方式”展开说明与页脚均可见。
- 状态：中文、未登录、浅色封面、登录表单为空。主对照图的监护入口与其他登录方式折叠；展开状态补图单独记录，不与源图默认状态作精确位置比较。均为页面内容截图，没有浏览器外框或设备边框。
- 源图与第一轮桌面实装、源图与第二轮修复后桌面实装，分别已在**各自同一次工具输入中同时打开、按原始分辨率比较**。未缩放或生成合成图；按源图和实装相同的横向像素比例进行判断。设备像素比没有独立日志，本次依据实现者报告的 CSS 视口与图像元数据按 1 图像像素≈1 CSS 像素比较，不声称已独立测量 DPR。
- 全图对比检查了左右区域比例、标题换行、吉祥物位置、表单到页脚的顺序。随后在同一原始图片中逐项检查左上标题、右侧字段/按钮、监护入口与底部小字。上述区域在原始 1586 像素图片中可直接辨读，本次无需另写裁剪图；没有把单独打开的两个截图冒充并列比较。

**五项必查表面与响应式结果**

| 表面 | 实际观察 | 判断 |
| --- | --- | --- |
| 字体与排版 | 本轮重截标题笔画已与定稿的厚重黑体层级接近，两行换行和左对齐保持，未与吉祥物碰撞。实现者的实际 glyph 检查为 Noto Sans SC ExtraBold；字标为 Space Grotesk。辅助文字仍略小。 | 标题 P2 已关闭；辅助文字 P3 |
| 间距与布局 | 桌面左右结构、控件宽度和主要垂直顺序接近定稿；按钮没有旧版厚重阴影。1280×800 图内能看到底部说明，没有内容碰撞。 | 无布局阻断；细小节奏差 P3 |
| 色彩与视觉变量 | 浅紫白背景、蓝紫主色、暗色标题整体一致。按钮实装更接近纯色，源图有轻微颜色起伏，可接受。底部说明和监护副文案已加深为 #72718e，对 #fbfbff 约 4.55:1。新截图中两处说明可辨读。 | 对比度 P2 已关闭 |
| 图片与图标 | 使用真实栅格 Q 标记、Google 图标和高质量 Quanty 插图。插图主体、挥手姿势、衣服、地面投影及手写装饰与源图方向一致；未发现明显锯齿、拉伸或透明边缘光晕。图像层没有遮住标题。通用表单/盾牌/箭头图标风格一致。 | 可接受；非逐像素同一插图的细部差异不影响识别 |
| 文案与内容 | 标题、Quanty 说明、训练类型、注册入口、监护码入口与定稿一致。隐私条款之间从点号改为“与”语义成立，没有开发说明或提示词泄漏。 | 可接受 |
| 响应式 | 小笔记本保留两栏且页脚在截图内。390px 手机单栏且字段完整，监护入口在首屏下沿；320px 的字段和两个主要按钮同样未横向裁切。手机向下滚动后的展开补图可见完整说明与页脚；实现者测得390px下scrollWidth=390。 | 可接受；320px 副标题换行 P3 |

**Interactions and scope**

本次审查使用实现者提供的真实 CUA 截图，没有独立操作浏览器。以下是实现者提供的验证记录，不能与本审查者亲自验证混淆：注册/登录切换、找回密码预填与返回、密码显示切换、监护展开及空码禁用已检查；Google SDK 的真实点击层已测得与整个外观等宽高。没有发送验证码、发送邮件或实际登录。实现者已补查其他登录方式展开、监护空码禁用与填码启用；最终浏览器 warning/error 日志为 `[]`。实现者还测得 1280×800 下 `scrollHeight=800`、`scrollWidth=1280`，与新截图中的完整布局一致。实现者已报告最终构建及差异检查通过。当前截图没有验证码、错误、冷却、完整键盘焦点或放大文字状态，未对这些状态作视觉通过结论。

此前代码审查和已有账户测试不能替代本次视觉比较：账户 66 项、监护客户端 5 项、外壳结构检查和 25 路由检查已通过；全局 UI 契约检查在改版树与未改版基线上各有 27 项失败，实际完整输出一致。这些是独立的工程验证信息，不计作视觉迭代次数。

**Comparison history**

1. 此次 QA 开始时收到的截图已是实现者进行若干修正后的状态。实现者说明此前修正了标题居中、按钮厚阴影、手机双栏、底图遮挡、Google 点击范围和小笔记本底部溢出；旧版本截图未提供，因此不杜撰前后对比证据。当前截图确实可见左对齐、无重阴影、手机单栏、图文层级分离、小笔记本完整页脚；Google 点击范围只能引用实现者的交互测量。
2. 第一轮独立比较：当时打开的 `desktop.png` 文件时间为 2026-09-14 18:05:32。发现 P2 标题偏细（继承/回退字形）及 P2 小字颜色偏浅（legal 约 2.98:1、监护副文案约 3.68:1），记录为 blocked，并即时告知实现者。
3. 实现者修复：旧全局样式给所有 `span` 设置了 `font-family: ... !important`，使 h1 的子 span 仍使用 PingFangSC-Semibold。修正子节点字体继承后，实际 glyph 经实现者的 `CSS.getPlatformFontsForNode` 核对为 **Noto Sans SC ExtraBold**；桌面字号由 4.55vw 调为 4.8vw并保持可控行高。字标指定 Space Grotesk，说明文字改为 `#72718e`，实现者最终 computed color 核对两处均为 `rgb(114, 113, 142)`。
4. 第二轮独立复核：再次把定稿与新 `desktop.png` 在同一工具输入同时打开。新桌面图时间 **18:10:06**，新 laptop/mobile 时间 **18:10:07**，新增 narrow mobile 时间 **18:10:08**。标题厚重度和第二行宽度已明显回到定稿层级；两处小字已加深，CSS 声明色对背景约4.55:1。复看 1280×800、390×844、320×740，未发现新增 P0/P1/P2。上述两项 P2 关闭。
5. 原图片文件被新截图覆盖，没有另存历史快照。本报告保留首次亲自查看后的发现与文件时间，不伪造可重新打开的“修改前截图”路径；当前链接均指向第二轮修复后证据。

**Open Questions**

- 没有阻断视觉验收的未决问题。没有实际发送验证码、发送邮件或登录账户，因此这些服务端成功流程不属于本次视觉通过范围。
- 本轮只亲自检查截图；交互测量、实际字体 glyph 与最终控制台日志明确归属于实现者提供的证据。

**Implementation Checklist**

- [x] 在同一输入对照定稿与实装，分别完成初审与修复后复审。
- [x] 修正中文标题实际字体及字重，重截验证。
- [x] 提升底部说明和监护副文案对比度，重截验证。
- [x] 复核桌面、小笔记本、普通手机及极窄手机。
- [x] 记录注册/找回密码/密码显示/监护/本机入口的验证范围，以及最终空 warning/error 日志。
- [ ] 可选：微调辅助字重、表单下半段间距与320px副标题行长；均为 P3。
- [x] 已记录实现者报告的最终构建及差异检查通过；这两项不替代视觉证据。

**Production follow-up**

生产环境的 Google 个性化按钮使用原生 288×44 iframe，其有效按钮为 268×40。保留原生 iframe 视口与负边距，通过缩放将有效点击范围贴合视觉按钮，并响应尺寸变化。用真实组件内的本地 iframe 布局夹具验证：电脑有效范围与外观均为 429.99×52，手机均为 338×53，坐标偏差小于 0.01px。测试页已关闭，没有触发真实登录。账户 66 项测试与构建再次通过。

**Narrow-screen iframe follow-up**

线上 Google 原生按钮还可能为 400×40（iframe 420×44）。手机上旧样式的 max-width:100% 会在缩放前压缩 iframe，裁掉右侧点击区域。已为拟合后的 iframe 取消该宽度上限。真实组件内使用 420×44 iframe 验证：390px 屏幕下有效按钮 338×53，320px 屏幕下为 268×53；位置与外观相同且页面无横向溢出。独立代码复核未发现最小尺寸冲突，桌面不受此限制影响。构建通过，测试页已关闭。

final result: passed

---

# Tracker v7 上线前视觉 QA（2026-09-19）

以上登录封面报告为历史记录；以下为本轮 Tracker 的最新验收结果。本轮只验证本地实现，没有声称已发布到生产环境。

**Findings**

当前没有未关闭的 P0/P1/P2。早期字号/首屏密度问题及不完整截图证据已在重新捕获后关闭，详见比较历史。
- **[P3] 字体字面与参考图仍有轻微差别。** 最终实装的表格英文采用系统无衬线，源图字面更窄、带更强的紫色倾向；实装岗位和小标签更偏灰紫。当前字号、层级、行距与可读性成立，属于轻微光学差异。后续可小幅调整岗位字重和灰紫色，不建议整体放大表格或压缩公司列。
- **[P3] 手机窄屏下日期偏小。** 390px 图中日期保持在标题右侧，未遮挡编辑按钮；相对 15px 的阶段说明显得偏小。可后续将窄屏日期从 11px 调到 12px，并复核长年份和自定义 Stage 名称。本轮没有因此丢失信息或控件。

**Comparison evidence**

- 视觉真值：[tracker-final-review-v7-aligned-counts.png](/Users/miujiawei/Desktop/QuantGym/artifacts/tracker-ui-concepts-2026-09-19/tracker-final-review-v7-aligned-counts.png)，1536×1024。
- 最新桌面：[desktop-verified.png](/Users/miujiawei/.codex/worktrees/tracker-final-ui-release/QuantGym/artifacts/tracker-ui-qa/desktop-verified.png)，1536×1024，唯一证据路径的文件时间为2026-09-19 19:26:07；与19:24:22有效 `desktop-final.png` 内容相同，另存用于避免同路径缓存歧义。实现者报告 CSS 视口1536×1024、DPR 1。
- 历史桌面：[desktop.png](/Users/miujiawei/.codex/worktrees/tracker-final-ui-release/QuantGym/artifacts/tracker-ui-qa/desktop.png)，1536×1024；保留了字号较小、表格页脚尚未入屏的早期状态。
- 手机初始：[mobile.png](/Users/miujiawei/.codex/worktrees/tracker-final-ui-release/QuantGym/artifacts/tracker-ui-qa/mobile.png)，390×844。
- 手机搜索：[mobile-search.png](/Users/miujiawei/.codex/worktrees/tracker-final-ui-release/QuantGym/artifacts/tracker-ui-qa/mobile-search.png)，390×844，页面滚动到表格，搜索词为 `Brevan`，两条同公司不同岗位结果。
- 桌面对照状态：中文、浅色、已进入 Tracker、空搜索、全部分类、默认表格密度、Stage 展开；合成夹具共20条申请，日期固定本地 2026-09-19，Stage 倒序题数为0/37/34。没有读取真实账户数据。
- 本次审查亲自打开了源图和最终桌面图，并在**同一次工具输入中同时展示两图**进行比较。首先出现的错误密度截图已拒绝作为验收依据；随后再次同输入打开源图与重截结果。最终有效截图按1图像像素对应约1 CSS像素比较；本审查者检查了文件像素尺寸，DPR和DOM测量来自实现者，不冒称独立浏览器测量。
- 对照以 Tracker 内容区为准。源图侧栏简化，实际页面保留线上 `AppShellMain` 的导航分组、全局搜索、账户入口和底部导航；这是保留原功能的明确要求，不将完整导航和因此产生的内容起点差异列为视觉缺陷。
- 全图检查了标题、统计条、三条阶段记录、单行筛选/搜索工具栏、进展表及页脚。随后在同一原尺寸图中逐项检查阶段日期/刷题列、状态标签与 DDL、岗位文本、搜索框；这些区域可直接辨读，无需另生成裁剪图。手机搜索图单独补足了窄屏输入焦点、同公司多岗位与表格页脚，不能当作桌面默认状态的精确坐标对照。

**五项 Fidelity Surfaces**

| 表面 | 图像观察与实现证据 | 判断 |
| --- | --- | --- |
| 字体与排版 | 标题深色、统计数字和 Stage3 分级突出，Stage1/2 黑色；三行日期与右侧数字可扫读。实现者 DOM 字号记录为标题32px、统计36px、Stage3 30px、日期15px、表格14px，与读取到的最终 CSS 一致。系统字体与参考字面略有差别；未把旧错误密度截图的模糊当成字体问题。最新重截中所有可见岗位均完整，Goldman及BlackRock岗位在实装为单行，源图为两行，属于实际系统字面和列宽共同导致的可接受差异，没有截去信息。 | 整体层级可接受；轻微字面差异 P3 |
| 间距与布局 | 最终图为紧凑横向阶段记录，统一日期列、描述列及右侧“本阶段刷题 / 数字 / 题”列。实现者测得日期列 x=506、刷题列 x=1282，三行一致。工具栏筛选与搜索同一行；最终页脚在屏内，底边约 y=1006。表格独立滚动。 | 早期字号/首屏密度问题已修正；保留现有外壳属预期差异 |
| 色彩与视觉变量 | 白底浅紫背景、低饱和灰紫结构、绿蓝状态标签、浅紫更新按钮和红色 DDL 语义保留。Stage3灰紫、Stage1/2黑色；DDL文字和数字均红。边框细、小圆角、没有旧的大块高饱和背景。实装比生成参考更克制，符合用户与线上调性结合的要求。 | 可接受；未执行完整 WCAG 对比度审计 |
| 图片与图标 | 保留已有 QuantGym 品牌图像和线上外壳。当前 Tracker 的编辑、添加、搜索、表格密度、DDL等控件使用统一的 Lucide 图标；本轮读取代码确认没有用手绘内联路径替换新图标。页面不需要新增插图或产品位图。最终标准截图无初次密度错误导致的放大裁切。 | 可接受；手机图轻微采样模糊不作为产品资产缺陷 |
| 文案与内容 | 删除 MY PREPARATION、求职准备阶段标题、持续积累及重复投递记录标题/总数；保留语义统计标签。阶段时间段为9/19–至今、9/13–9/19、8/21–9/13，题数0/37/34；Stage2表格分组也显示9/13–9/19和37题。公司/岗位独立列、同公司多岗位分行。Goldman岗位已在最新图中亲自确认完整。 | 符合要求 |

**响应式与交互证据**

本审查者亲自查看截图和代码，没有操作浏览器。390px图中，Stage 按标题/日期、说明、刷题三层排列，编辑入口与时间段完整；统计条和筛选标签容器允许横向滚动，搜索控件独立成行。手机搜索图显示两条 Brevan Howard 岗位、结果计数及完整页脚。实现者测得页面无整页水平溢出，表格内部 `scrollWidth=1140`，属于有意保留完整进展列的独立滚动。

以下交互为主实现者提供的真实 CUA 验证记录，明确区别于本审查者的截图审查：

- `Black` 公司搜索两条，与 DDL 分类交叉后仍为两条；`Masters` 岗位搜索一条。
- 无匹配关键词显示0条；清空后保留 DDL 分类、恢复两条，并将焦点放回搜索输入框。此前代码审查提出的清空焦点问题已修复。
- 修改 Stage2 描述并保存，自动题数仍为37。
- Blackstone 追加面试进展后，OA/Interview/DDL统计对应更新；删除与10秒内撤销可恢复原记录。
- 详情抽屉保留历史 DDL，Escape可关闭。
- 新建本地 QA 申请可保存并被搜索找到。
- 手机 `Brevan` 搜索返回两条独立岗位，紧凑显示切换正常。
- DDL 时间编辑为09:30并保存成功；新增 Stage 表单打开显示自动预览0题，取消正常。
- 实现者补查1024×768与768×1024平板视口，文档 `scrollWidth` 分别为1024与768，未发现整页横向溢出。本审查者未拿到这两个尺寸截图，因此仅记录该测量，不把它们当成独立视觉比较。
- 最终新开干净页面的控制台 error/warn 为 `[]`。开发时安装 Lucide 曾使旧页热更新临时出现重复 React 错误，刷新及干净页已消失；此历史不当成最终运行错误，也不隐去其发生。

独立工程验证：本审查者此前运行34项 Stage/Tracker 针对性测试与差异检查，均通过；已读取实现者保存的 `artifacts/tracker-ui-qa/unit-tests.txt`，其中完整84项数据测试通过。新统计按逻辑 Stage 顺序建立“本阶段日期之后至下一阶段日期当日”的左开右闭区间，最后一段至本地今天；不修改源记录，保留同题去重及部分来源不可用时未知值保护。这些工程检查不能代替图像比较。

**Comparison history**

1. 早期桌面 `desktop.png` 中 Stage 字号偏小，右侧数值、日期和正文整体较细，表格下沿及页脚超出同尺寸视口；属于影响层级和首屏密度的 P2。实现者增加统计/Stage/日期字号，统一日期与刷题网格，并收紧表格滚动高度。
2. 本次首次收到的 `desktop-final.png` 元数据虽为1536×1024，内容却是约两倍放大的左上部分，右侧计数和整块表格缺失。已立即拒绝该证据；这是捕获密度错误，未认定为产品界面放大。实现者说明原始CDP捕获在视口切换后密度错误，改用标准截图接口重截。
3. 19:22:38有效重截后，源图与实装再次在同一次工具输入中比较。全幅内容恢复，阶段字号和日期可辨，三行右侧计数与时间对齐，工具栏为一行，页脚进入首屏。上述早期 P2 字号/密度问题关闭；截图密度阻碍关闭。
4. 19:22:38重截中 Goldman Sachs 岗位单元格呈空白，曾作为待核实 P2 阻止通过。实现者检查 DOM 文本完整，尺寸270.94×18.9、字号14px、行高18.9px、visibility为visible，判断是热更新期间过早捕获造成部分文字缺失。重载后先读取页面状态，再单独调用标准截图接口，得到19:24:22最新图。
5. 再次在同一次工具输入同时打开源图与19:24:22最终图。本审查者已亲自确认 Goldman 岗位完整可见、所有其他可见行内容稳定，阶段计数/日期和页脚未回退，关闭该待核实 P2。早先 `desktop-final.png` 被覆盖，本文保留真实查看记录及时间，不伪造可再次打开的旧截图文件。未发现新增 P0/P1/P2。
6. 实现者将有效最终结果另存为唯一新路径 `desktop-verified.png`，本审查者再次将该图与源图放在同一次工具输入比较；确认Goldman完整岗位、整体布局与已通过的有效截图一致。报告的最新实现证据改为此唯一新路径。

**Open Questions**

- 没有阻断本轮视觉验收的未决问题。
- 本轮未覆盖200%文字缩放、320px极窄屏、深色模式、所有错误/加载状态及真实云账户成功流程，不对这些状态作视觉通过结论。
- 当前是本地发布前验收；线上可用性和生产版本仍需主任务发布后确认。

**Implementation Checklist**

- [x] 源图与有效最终桌面截图同输入对照。
- [x] 复核字体、布局、颜色、资产图标、文案五项表面。
- [x] 复核390px默认与搜索状态，记录独立表格横滚。
- [x] 修正早期字号和页脚首屏密度，重截关闭对应 P2。
- [x] 记录交互、84项测试和最终干净控制台证据的提供者及范围。
- [x] 核实 Goldman Sachs 岗位单元格，并在源图/最新实装同输入比较中确认完整可见。
- [ ] 可选后续：微调系统字体字面及手机日期大小，均为 P3。

final result: passed


## Tracker selected palette 8 — 2026-09-19

Scope: apply the user's eighth option (third from last in ten), bright violet `#8657DB`, to the existing Tracker. This is a palette-only acceptance; existing functionality, wording, typography, dimensions, semantic status colors, and global navigation remain unchanged.

Reference: `/Users/miujiawei/.codex/generated_images/01a0bc02-57f7-7322-bb98-433e25031250/exec-105367cd-a8c3-44c0-ab9a-fa44383af12d.png` (1672×941). Implementation evidence: `/Users/miujiawei/.codex/visualizations/2026/09/19/tracker-palette-options/option8-implementation.png` and `option8-table.png` (1280×720). Root and independent reviewer each viewed all three in the same comparison input. Comparison uses corresponding regions and proportional visual scale, not pixel identity. The local fixture has 20 synthetic applications and an account-verification banner; differences from the reference's authenticated 51-application state are expected fixture differences.

- Color: selected accent is `rgb(134, 87, 219)` on Stage 3, its current count, active tab, phase badge, progress action, and add-application button. Pale surfaces use `#F4EFFC`. Navigation retains its existing blue-violet gradient. DDL remains red and submission/OA status colors remain green/blue. The generated reference appears slightly more saturated than the precise palette token; implementation uses the selected palette's documented hex values.
- Typography: current count remains 28px; historical 37/34 remain black `#1C1C1C` at 20px. All three measured right edges are 1204px. No font or size changes in the diff.
- Layout: stage columns, black first divider, table height, and toolbar preserved. Document width equals viewport width at 1280px. No layout properties changed.
- Assets/icons: existing icon assets and controls remain intact. No assets added or replaced.
- Copy: no product wording changed. Fixture data and authentication copy are not part of the palette diff.

Interaction verification: add-application dialog opened and cancelled successfully; its primary button inherits the same violet and derived shadow. Searching Blackstone returned that company only, with violet focus border; clearing restored the full list. Final browser error/warning logs were empty.

Engineering verification: strict production build passed after the final CSS edit; independent diff review found no missing removed-token references or blocking issues. No automated tests added for this CSS-only change. This acceptance covers the desktop palette and sampled dialog/search states; it is not a new full responsive or account-system certification.

final result: passed


## Mobile five-section navigation — 2026-09-19

Scope: replace the phone hamburger/More sheet and shortcut bar with Overview, Career, Training, Resources, and Me. Desktop navigation and page presentation stay unchanged. Existing 860px shell breakpoint is retained; no routes or user data are migrated.

### Visual and interaction evidence

- Screenshots and structured results: `/Users/miujiawei/.codex/visualizations/2026/09/19/mobile-navigation/` (`desktop-before.png`, `desktop-after.png`, `career-390.png`, `training-390.png`, `account-390.png`, `navigation-qa.json`).
- Desktop 1280×720: sidebar, command bar, Tracker heading, summary, stages, and table have identical before/after bounding boxes. Pixel comparison differs only inside the existing animated brand wordmark at (63,15)–(168,48); remaining pixels are identical.
- Phone: all ten real page components opened successfully through the five categories and their child navigation at 390px. Overview, Tracker, Calendar, Technical Interview, Behavioral Interview, LeetCode, Mental Math, Problems, Experiences, and Account each resolve to the correct category with document width exactly 390px.
- Responsive boundary checks at 320, 768, and 860px show no document overflow, no sidebar, and the five-item bottom bar. At 861px the desktop rail returns and both new mobile navigation blocks are hidden. The old hamburger, sheet, and shortcut bar are absent.
- Back and forward between Mental Math and LeetCode retain the Training category and restore the child selection. Current-item links preserve the full address and replace history instead of adding duplicate entries.
- Native Tracker edit dialog remains above the bottom bar. Deleting a synthetic OA event showed its undo notice 12px above the navigation (notice bottom 756px, bar top 768px), and Undo successfully restored the event.
- Existing personal-workspace cross-category navigation is hidden only on mobile; its sync status, export, restore, and page content remain. Account padding is reduced only on mobile.
- Onboarding step 2 presents the five-section instructions on mobile; resizing to desktop shows its unchanged original copy. Mobile step 3 explains the search button instead of a keyboard shortcut.

### Validation and limitations

Seven navigation tests, route integrity (26 routes), shell checks, and the strict production build pass. Independent read-only review found no blocking navigation, layout, or desktop regressions. The broad historical UI-contract gate still reports 64 pre-existing failures; substituting the four modified tracked files with their HEAD baseline contents yields identical output. Those stale contracts and historical screenshot requirements are outside this mobile change.

Browser validation uses isolated local fixture records and real production shell/page components. The fixture intentionally shows an account-verification banner and empty cloud-only content; it does not certify live-account or cloud-write flows. Missing Account/Experiences fixture adapters caused early fixture-only errors; after using the production page API models, the final clean-tab ten-page sweep has zero error/warning logs. Screenshots show fixture data rather than a production account.

final result: passed

## Overview activity dashboard — September 19, 2026

- Replaced the overview hero's streak/XP/rank/plan content with the signed-in account name and six cumulative metrics; retained Quanty.
- Overview Stage now has application, LeetCode, Tech, Behavioral and Mental Math average columns. Existing Tracker Stage component and date semantics remain unchanged.
- Five real daily task links derive completion from account records. Activity uses 2/5/10/10/5 points; question counts deduplicate per day, Math counts complete trials.
- Explicit Behavioral completion and first-read experience markers persist through the shared owner-scoped personal store and cloud merge. Old unowned Mock history stays unknown.
- Verified real full-shell local fixtures at 1440, 390 and 320 pixels with no horizontal overflow. Checked five task routes, problem progress link, removed sections, bottom navigation clearance and zero browser console errors.
- Behavioral completion updated the cumulative count, daily check and today's score by 10; the read marker survived reload and counted once. Fixture data and screenshots remain local and are not shipped.
- 278 related Node tests passed; one API activity round-trip/owner-isolation regression passed. Strict static build, route integrity, shell and growth checks passed.
- Existing broad legacy contract checks still reference old routes and historical evidence: their unrelated failures were not hidden. Overview assertions now match the new page.
- Local screenshots: /Users/miujiawei/.codex/visualizations/2026/09/19/overview-dashboard/desktop.png, desktop-detail.png, mobile.png, mobile-detail.png.

Final result: passed for this change.

## Daily task list restoration — September 20, 2026

Restored the former vertical quest layout, target illustration, progress bar, points pills and circular completion marks while retaining the five current task links and real activity counts. Reused the existing quest styles and removed the newer card-grid overrides. Desktop 1440px and mobile 390/320px checks confirmed five full-width rows, correct 1/5 completion state, no horizontal overflow or label/badge overlap, a working task link and no console errors. Strict build, growth check and diff check passed. No data or scoring changes.

## Interactive activity panel — September 20, 2026

Refreshed activity with a blue-violet tonal surface, prominent weekly score, today's score, confirmed active-day count, selectable daily bars and a per-category count × points breakdown. Retained existing activity data and weights. The bar scale remains linear; zero has no filled height. Future days are disabled, unknown values remain dashes and partial-source values are labeled as recorded. Desktop 1440px and mobile 390/320px passed visual/overflow checks. Clicking a past day and Enter-key selection updated the details and aria-pressed state; future selection was disabled. No console errors. All 17 activity tests, the growth check, strict build and diff check passed. Independent review found no P1/P2 issues.

## Training calendar header cleanup — September 20, 2026

Removed the shared preparation header/navigation and persistent cloud-status copy from the four personal training pages; retained the automatic account-scoped data connection, real save-error recovery, dirty-page protection and backup controls. Removed the backup footer's implementation copy. Calendar now has a smaller title, light shortcut links and reduced top spacing, without its English eyebrow or slogan. Existing main desktop/mobile navigation covers every removed duplicate link.

Local full-shell fixtures at 1440, 390 and 320px show no calendar document overflow or removed copy. Previous-day and Today controls work; the Technical Interview shortcut and mobile Behavioral/Mental Math navigation render their pages. No browser warnings/errors. The fixture's account-verification notice is synthetic and unrelated to the removed normal sync status. All 77 calendar, cloud, registry and mobile-navigation tests, strict build, route integrity and diff checks passed. Independent review found no P1/P2 issues. Updated the existing personal browser check to target the main navigation rather than the deleted header.

## Calendar copy reduction — September 20, 2026

Removed the remaining decorative English labels, date swipe hint, unlinked LeetCode promotional text and generic empty-state instructions. Kept direct action links and concise empty-state status. Moved existing counting/date definitions into a collapsed native disclosure; data caveats, errors, special empty states and all counting behavior remain unchanged. Local full-shell desktop 1280px and mobile 390px checks show no overflow or removed text; date navigation and mouse/keyboard disclosure toggles work, with no console warnings/errors. Strict production build and diff checks passed. No new tests were added for this copy/presentation-only change.
