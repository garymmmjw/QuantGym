# QuantVault 公开评分规则的离线实现

审计快照：2026-10-15；REA 复核：2026-10-16。源文件是正常浏览器加载后保存的公开前端资源；本纯模型没有读取账户状态，不含认证、追踪、远程读写、localStorage 或计时器。独立训练首页由外层传入真实的本地自评记录；示例档案和旧计分实验室使用明确标记的合成数据，与个人档案隔离。

本文说明 **捕获源码的行为和纯模型接口**。训练首页固定 v2、本地初测录入、自评判分、推荐候选选择、备份和“未评估”展示属于本地产品政策，详见 [TRAINING-SYSTEM.md](../../TRAINING-SYSTEM.md) 与逐项 [来源核对表](../../SCORING-AUDIT.md)。不能因公式已确认而把这些输入与展示流程称为原站完整复刻。

`scoring-model.mjs` 是确定性的纯函数实现；`scoring-constants.mjs` 保存公开常量；`answer-engine.mjs` 提供逐次计算解释、正式作答记录重建和岗位权重分解。测试仅在隔离 Node VM 中执行 **recommender.js** 的纯计算分支以做一致性对照，**不执行 auth.js 或 problems.js**。核心模型原有 12 项测试包含 192 组角色、模型版本、时间及难度数据组合，对照状态、角色权重、优先级、readiness；其中一组使用两套真实公开拟合参数。新增辅助层的验证见文末。

## 对接方式

```js
import {
  createScoringModel, newState, observe, calculateLevel,
  thetaToRating, ratingToTheta, moduleStats, orderModules,
} from './scoring/scoring-model.mjs';

// 难度参数必须由调用者显式传入本地捕获文件；本模块不会自行下载。
const model = createScoringModel({ difficultyV1: null, difficultyV2: null });
const state = observe(newState(), {
  topic: 'probability', b: -0.5, c: 0, x: 1, source: 'solve',
});
const result = model.computeOfferBar({
  model: 'v1', // 模拟器提供显式 state 时使用 v1，以遵守源 readiness 对 state 的规则。
  state,
  prefs: { role: 'qt', level: 'undergrad', calibration: [] },
  progress: { 101: 'solved' }, // synthetic internal problem ID
});
```

输入格式：

| 字段 | 格式与含义 |
| --- | --- |
| `prefs.role` | `qt` / `qr` / `qd` / `unsure` |
| `prefs.level` | `beginner` / `undergrad` / `graduate` / `phd`，影响待加强项排序，不直接改变评级 |
| `prefs.rate` | 宏观自评，例如 `{prob:'strong', la:'shaky', prog:'ok', fin:'ok'}` |
| `prefs.calibration` | 初测观察 `[{topic,b?,diff?,c?,x}]`；`x` 为 0–1 |
| `prefs.targetFirms` 或 `firms` | 公司 slug 数组，至少 10 道归属题时启用公司题型权重 |
| `prefs.targets` | 重点 topic slug 数组 |
| `problemsIndex` | `[{id,di,c,d,tg,co,t}]`：内部 ID、显示 ID、分类、难度、标签、公司、标题 |
| `progress` | `{[internalId]:'solved' \| 'attempted'}`；兼容对象值仅用于能力建模，模块完成度仍只认字符串 `'solved'` |
| `solvedHistory` | `{[internalId]:{category?,diff?,xpAwarded?,firstSolvedAt?}}`；记录存在默认意味着曾完成 |
| `attempts` | `{[internalId]:{x:0\|1,at,h?,pc?,r?}}`：真实判分结果、时间戳、使用提示、部分得分、主动揭晓 |
| `state` | `{theta:{[topic]:number},nObs:{[topic]:number}}`；显式模拟分数时应填全部 17 个 topic |
| `now` | 毫秒时间戳。为纯函数可重现，省略时固定为快照日 `2026-10-15T00:00:00Z`，区别于原站 `Date.now()` |
| `model` | `'v1'` / `'v2'` / 省略（根据时间做 rollout 混合） |

`computeOfferBar` 输出：`{readiness,target:75,zone,topics,state,priorities,diagnostics,modelInfo}`。每个 topic 包含 `theta`、`rating`、`evidence`、`band`、`mastery`、`relevance`、`isCore`、`isFocus`、`barPercent`。`band.label` 是 theta 等级，`band.displayLabel` 在证据少于 4 时为 `Few solved`。原站卡片只列证据大于 0 的主题；本地可显示所有主题，但需将证据为 0 的项目标为未评估。

`observe(state, observation)` 返回新状态，不改变原状态；原公开函数会改变传入状态，这是本地实现有意改变的接口特征。观察结构为 `{topic,b,c,x,source,weight?}`。`b` 是拟合难度轴上的值，`c` 是猜测命中下限。

## 1. 题目能力：递减 K 的 Elo 风格模型

来源：[recommender.js](../../../captures/learn-2026-10-15/scoring/recommender.js)，核心常量 12–83 行，观察 174–203 行，重建状态 207–303 行。

这不是完整的贝叶斯后验模型。公开脚本使用 1PL/Rasch 风格的概率函数及 Elo 风格增量，没有找到 Beta 后验、贝叶斯置信区间或真实 offer 概率计算。

对于主题 `t` 的观察：

```text
p = c + (1 - c) × sigmoid(theta[t] - b)
K = weight × sourceReliability / sqrt(1 + nObs[t])
theta[t] += K × (x - p)
```

| source | reliability | 增加 nObs |
| --- | ---: | --- |
| onboarding | 0.90 | `weight` |
| solve | 0.90 | `weight` |
| mcq | 0.85 | `weight` |
| selfrate | 0.50 | 否 |
| status | 0.20 | 否 |
| 其他 | 0.30 | `weight` |

初始所有 `theta=0,nObs=0`。自评是弱观察：shaky 为 `x=0,b=0`，ok 为 `x=.6,b=0`，strong 为 `x=1,b=.5`；宏观项 `prob` 影响 probability、expectation、statistics、combinatorics、random-variables；`la` 影响 linear-algebra；`prog` 影响 coding；`fin` 影响 options-pricing、finance、market-microstructure。自评不增加有效证据。

重建顺序为自评、初测、题目结果。题目 ID 来自 progress、solvedHistory、attempts 的并集，以 JavaScript 对象键顺序处理；**不是按作答时间排序**。attempts 的 `x` 优先于可手动更改的 progress。没有 attempts 时 solved 对应 1、attempted 对应 0，但 source 是 status。

初测单独使用 `source=onboarding`、可靠性 0.9，每条增加一份主主题证据；`b` 优先取该条显式参数，否则仅调用 `diffB(o.diff)` 的标签后备值，`c` 默认 0。这条路径不根据题号套用 v2 拟合参数、提示或跨主题标签。初测的条数还会进入 readiness 的参与基线。独立训练提供本地人工录入入口，保存时替换 `prefs.calibration` 整批记录，不自动重复录入普通训练，不生成题目完成状态或 XP。原站初测选题、题目内容和判分入口仍未知。

标签对应的其他主题平分 `0.25` 的额外观察权重；映射完整保存在 `TAG_TOPIC`。例如 bayes-theorem → statistics、expected-value → expectation。已保留一个源实现细节：主主题即使是未判分的 status，其他主题仍以 source=solve 增加少量证据。这与其注释“真实判分才提供证据”并不完全一致，未自行修正。

### 一次作答到底加减多少

这不是固定加减分：更新方向由 `有效成绩 - p` 决定。其他条件相同，`b` 越大越难，`p` 越小，所以答对收益更大、答错损失更小；`nObs` 越大，单题步长越小。正式答错也增加一份证据，使用提示不减少主主题的证据增量。`c` 越大，预测命中率越高，同一成绩的奖励更小或惩罚更大。

以下是互相独立的控制变量示例，固定 `theta=0`、`nObs=9`、`source=solve`、`weight=1`、`c=0`，因此 `K=0.9/sqrt(10)`，显示 rating 初始为 1136。这里使用 **难度标签后备值**，并非每道真实题的拟合值。表中是更新前后各自取整后的 rating 差值，不是 XP，也不是 Readiness 百分点。

| 后备难度 | b | p | 独立答对 x=1 | 答错 x=0 | v2 提示后答对 x=0.6 |
| --- | ---: | ---: | ---: | ---: | ---: |
| Easy | -0.5 | 0.622459 | +65 | -109 | -4 |
| Medium | -0.1 | 0.524979 | +82 | -92 | +13 |
| Hard | 0.5 | 0.377541 | +108 | -66 | +38 |

因此“答对”在用了提示后不保证加分。更一般地，提示后的有效成绩若低于预测 `p`，就会降分。v2 多小题若 3/4 正确，先记 `pc=.75`，再在 `h=1` 时得到 `.75×.6=.45`；v1 忽略 pc/h，只看全对时 x=1、否则 x=0。源码的 hintCredit 当前为 .6，这表示 **成绩乘 .6**，并非“最终加分乘 .6”。

正式入账先由 `auth.js` 将 pc 四舍五入到三位小数并限制在 0–1；重建能力时才乘提示系数。例如输入 `pc=.6666`，保存 `.667`，使用提示后的有效成绩为 `.4002`。不要把单次观察工具直接输入的未舍入小数当成真实入账结果。舍入接近 1 的部分分也不自动修改原始二元正确性 `x`；本地完成和 XP 依原始完整答对条件判断。

掌握度是主题 theta 的线性映射及截断，初始 theta=0 映射约 54.76%，但证据不足 3 时不参与 Readiness 加权。它既不是正确率，也不能单独作为已掌握的证据。评级和掌握度是同一个 theta 的两种显示，不能互相再加一次。

## 2. 难度与 v1 → v2 切换

来源：recommender.js 95–170、247–303、396–423 行；[item-difficulty-v2.json](../../../captures/learn-2026-10-15/scoring/item-difficulty-v2.json) 第 1 行的 `_meta`。

- v1 使用 `item-difficulty.json` 的 `b[displayId]`。缺少拟合值则回退 easy=-0.5、medium=-0.1、hard=0.5，未知难度为 0。
- v2 优先使用 `item-difficulty-v2.json` 的 `b`，缺值再用 v1/标签。`c[displayId]` 是选择题猜测下限。
- v2 对 attempts 使用 `pc` 部分得分（限制 0–1），否则使用 x；使用提示且得分大于 0 时乘以 `hintCredit=0.6`。`r:'reveal'` 是记录元数据，Recommender 不另外读取 r 改分。
- 捕获 v2 文件模型说明为 `P = c + (1-c) sigmoid(theta-beta)`，拟合日期 2026-10-09；标记格式偏移、最小样本 n=5 等元数据只说明已有参数，不足以重新训练完整模型。
- 2026-09-29 00:00 UTC 至 2026-11-01 00:00 UTC 线性切换。状态 theta 混合 v1/v2，nObs 取 v2。
- readiness 的 rollout 规则不同：`round((1-w)*r1 + w*max(r1,r2))`，模型更新只会提高显示分；显式 model=v2 则直接返回 r2。
- 原文件定义了 softCap，但实际 readiness **未调用**，因此本实现没有额外压低 65 以上的分数。

评分捕获目录现已补齐 [item-difficulty.json](../../../captures/learn-2026-10-15/scoring/item-difficulty.json) 的 887 个 v1 拟合值及 v2 参数；来源记录在同目录 manifest.json。模拟面板显式使用 v1 拟合模式，缺少该题拟合参数时使用源标签回退，避免把直接编辑状态与 rollout 的重建规则混用。两套公开参数可用于本地复算；没有账户的真实判分输入、偏好与时间，仍不声称得到原账户的真实分数。

## 3. Role 权重、重点与每个 topic 的评级

来源：recommender.js 25–54、306–363 行；[plan.js](../../../captures/learn-2026-10-15/scoring/plan.js) 24–34、52–54、366–429 行；[profile.js](../../../captures/learn-2026-10-15/scoring/profile.js) 820–851、912–916 行确认 profile 调用同一 `Plan.skillCard`。

下表是未经归一化的 role relevance；省略项为 0，不代表最终权重为 0。

| 角色 | 原始权重 |
| --- | --- |
| qt / Quant Trader | probability 1，expectation 1，game-theory 1，brain-teaser .8，market-microstructure .8，options-pricing .7，combinatorics .6，random-variables .6，optimization .5，finance .5，statistics .4 |
| qr / Quant Researcher | statistics 1，regression 1，probability 1，machine-learning .9，linear-algebra .9，time-series .8，stochastic-process .7，expectation .7，optimization .6，random-variables .6 |
| qd / Quant Developer | coding 1，linear-algebra .8，optimization .7，machine-learning .7，probability .6，statistics .5，combinatorics .5 |
| unsure / Quant | probability .8，statistics .7，brain-teaser .7，expectation .7，combinatorics .6，coding .6，linear-algebra .6 |

最终 relevance：

```text
r = .35 × intrinsicImportance + .65 × roleRelevance
若选定公司累计有至少 10 道题：r = .6 × r + .4 × (该topic公司题占比 × 17)
若选为重点topic：r += .5
r += .05
所有 r 除以其中最大值
```

归一化后最大主题为 1，**并非所有主题权重相加等于 1**。计算 skill 时，还会在证据合格的主题里除以这些 relevance 的总和。公司题数按选中公司的并集逐题计一次，跨多家公司不会重复计数；分布只使用题目的主分类。没有选公司或匹配题不足 10 时，不启用公司混合。原注释写成 50/50，运行代码实际是 60/40。

同一套作答记录下改变角色、公司或重点主题，只改变 relevance、汇总 skill/Readiness 和推荐排序，不改变任何主题的 theta、rating、掌握度和 nObs。角色权重没有参与上面的单题 K 或 p。

intrinsicImportance 全表见常量 `INTRINSIC`。目标能力：beginner=-.3，undergrad=.3，graduate=.8，phd=1.1。推荐优先级：`need = relevance × (max(0,target-theta) + .15/sqrt(1+nObs))`，按 need 降序。

训练首页可选择这四种目标水平。只改变 level 会改变 gap/need，不改变 theta、nObs、mastery、relevance 或 readiness；将“博士目标”理解为直接增加能力分是错误的。

```text
calibratedTheta = (theta - .105) / .490
rating = round(1200 + 300 × calibratedTheta)
```

所以 theta=0 对应 1136，并非 1200。`ratingToTheta` 是为本地编辑器增加的上述代数逆变换；原站没有这一编辑输入流程。

| 原始 theta | band |
| --- | --- |
| >= .6 | Strong |
| >= .15 | Solid |
| >= -.3 | Developing |
| < -.3 | Needs work |

分数卡证据 `nObs<4` 时显示 `Few solved`，优先于上面的等级标签。卡片细条为 `clamp(round((theta+1.2)/2.4*100),5,100)`，与 readiness 的 mastery 并非同一个百分比。角色核心星号由 `ROLE_CORE`（plan.js 29–34）控制，核心且尚未 Strong 显示重点提醒；它不改变题目 theta。

## 4. Readiness 与 Typical offer bar

来源：recommender.js 365–423 行；[explore-v2.js](../../../captures/learn-2026-10-15/scoring/explore-v2.js) 1306–1317、1346–1351、1453–1455 行。

```text
mastery(topic) = clamp((theta+1.15)/2.1,0,1)
skill = relevance 加权的 mastery 均值，仅统计 nObs >= 3 的主题
assessmentCount = prefs.calibration.length
progressCount = progress 的自有键数量（solved 和 attempted 均计入）
base = .72 × assessmentCount/(assessmentCount+2)
grind = progressCount/(progressCount+130)
engagement = base + (1-base) × grind
readiness = clamp(round(skill × engagement × 100),2,99)
```

没有有效证据时返回最低显示值 2，**不是已经掌握 2%**。只有 attempts/solvedHistory 而没有 progress，不会增加 grind；课程 XP、课程完成度、阅读时间都不进入上述公式。

| readiness | 文案 |
| --- | --- |
| >=80 | Interview-sharp |
| >=65 | Interview-ready |
| >=45 | Getting there |
| >=25 | Building up |
| <25 | Early days |

Offer Bar 在源 DOM 中是固定 `left:75%` 的标记，填充长度为 readiness。它不是独立拟合的 offer 成功率，也没有公司招聘阈值数据可验证其现实准确性。

实现细节：原 `skillOf(..., nObs=null)` 注释声称全部主题有效，但代码将 n 设为 1 后又用 n<3 排除，实际返回 0。本实现保留实际行为。v2/rollout readiness 会从原始输入重建状态，并忽略 `opts.state`；只有 v1 或无 v2 参数时使用显式 state。本地面板提供直接编辑分数时应指定 model=v1。混合模式的 diagnostics 是展示状态的组成说明，不能直接相乘保证等于经过“只升不降”规则后的最终 readiness。

## 5. 模块完成度、课程与练习分数

来源：[modules.js](../../../captures/learn-2026-10-15/scoring/modules.js) 74–91 行；[modules.json](../../../captures/learn-2026-10-15/scoring/modules.json) 第 1 行。

- 11 个模块当前实际列表有 **554** 个不同的内部题目 ID。`_meta.problemCount=528` 已过时；计算必须以各模块 `problems.length` 为准。
- 模块完成度 `round(done/total*100)`，done 仅计 `progress[p.id] === 'solved'`。下载成功、看过答案或本地存在 JSON 不算完成。
- 每个模块的下一题为该模块源题目列表中第一个未完成题；全完成后返回该模块第一题。模块之间的展示顺序由 `roleOrder[role]` 决定；遗漏模块追加末尾。独立训练报告也使用该排序。没有找到另一套独立的模块综合“能力分”。
- 模块 categories 可能包含多个能力 topic，不能把模块 ID 直接当评分 topic，例如 foundations 对应 brain-teaser/combinatorics。
- 课程/章节的进度是已完成课数量占比，和题目模块进度分别计算。

课程交互来源：[slide-viewer.js](../../../captures/learn-2026-10-15/assets/slide-viewer.js) 650–737、889–901、997–1007、1740–1967、2416–2419 行。

- MC/选代码行按正确索引判断；TF 的第 0 个选项对应 true；numeric 支持数字/分数，尾随百分号容忍但不自动除 100，误差使用 `q.tolerance || .01`，所以显式 0 仍为 .01。
- match/order/sort 要全部对应正确才通过。Python 代码按运行结果 `overallPass` 判断。原渲染器负责这些交互，本评分模块不重做答题 UI。
- 每个 slide 第一次答对/代码通过奖励 5 XP，以 `sv-xp-${data.id}-${slideNum}` 去重；它是课程 bonus，结课再入账。重置题目不应清除奖励领取记录。
- explore、mmgame、predict、poll 教学控件明确不属于 graded check，不改变 quiz XP 或能力 nObs。控件里的积分/盈亏/预测结果不是账户能力分。
- Pop Quiz：`percent=round(100*correct/total)`；`bonus=round(80*correct/max(1,total))+(correct===total?20:0)`。100% → Perfect run!，>=70% → Solid.，否则 Round two?。来源 [learn.js](../../../captures/learn-2026-10-15/assets/learn.js) 1040–1056 行、[compare-cards.js](../../../captures/learn-2026-10-15/assets/compare-cards.js) 203–216 行。零题的源边界值 bonus=20，正常课程不应出现零题。

## 6. XP、等级、首次判分与 streak

来源：[auth.js](../../../captures/learn-2026-10-15/scoring/auth.js)。以下仅提取数学/数据转换，不运行认证和 Firestore 函数。

| 规则 | 源行号 |
| --- | --- |
| 首次做对题目的 XP：easy 10 / medium 25 / hard 50 | 64、1397–1423 |
| 取消完成不扣 XP，不清除 solvedHistory，避免重复领取 | 1431–1446 |
| 登录重算以 solvedHistory + learnProgress 的 xpAwarded 求和；最终 XP 取 stored 与 ledger 的较大值。旧记录缺 xpAwarded 时按题目难度补齐 | 1089–1174 |
| 每课基础 20 XP，bonus 取 parseInt 后限制 0–100 | 65–66、1622–1629 |
| 已领取课程不重复给 XP；lecture ID 正则为 `^lec-[a-z0-9][a-z0-9-]{2,48}$` | 68–70、1653–1670 |
| 原客户端最多给 60 课记账，且 cap 检查在重复检查之前；目录已扩至 99 课，该限制可能陈旧 | 67、1654–1655 |
| Level 1→2 到 10→11 每次 100 XP，Level 11 起每次 250 XP；负值以 0 计 | 1805–1825 |
| 同一题首次判分保存；30 天内重复尝试不改能力结果，满 30 天替换。pc 保留 3 位小数，h 记为 1，r 只允许 reveal | 1523–1569 |
| 写入 streak：UTC 日期，同一天不变；上次是昨天则 +1，否则变 1，并更新 longest | 1776–1801 |
| activeDays 是正常账户活动日，原站单独追踪；不等同于做对题或课程结课 | 144–163 |

`calculateLevel` 返回 `{level,currentXP,nextLevelXP,percent}`；例如 999 XP 为 Level 10 / 99/100，1000 XP 为 Level 11 / 0/250，1250 XP 为 Level 12 / 0/250。

`creditLesson` 只是纯记账工具，默认保留源 60 课限制；独立 99 课预览若决定解除这一陈旧限制，可显式传 `maxLessons:Infinity` 并说明这是本地适配。取消“已完成”状态不应清除 ledger。它不代表真实账户已经收到奖励。

streak 的显示另有源差异：auth.js 42–55 的 `deriveStreak` 返回 `max(stored,activeDays连续值)`，没有近期活动也可能保留 stored；profile.js 855–869 的局部 helper 则没有 stored 回退。两者先设本地午夜再用 UTC ISO 日期格式，存在时区混合。这里 `activeDaysStreak(days,today)` 强制调用方提供日历日期，避免暗含运行机器时区；`deriveStreak(doc,{today})` 保留 stored 最大值逻辑。`updateStreak` 保留 UTC 写入规则。未复制任何依赖真实账户的时间状态。

## 7. 徽章与未知部分

### 题目页面如何产生 x、h、pc、r（新增生产端证据）

来源：[problems.js](../../../rea-research/supplemental/problems.js)，2026-10-15 已加载题页的公开脚本，通过只读调试接口保存，未刷新题页或调用 getSolution。独立逐项审计：[problems-scoring-audit.json](../../../data/audits/problems-scoring-audit.json)。以下是题库 Problems 页的行为，不自动推断到 Mock/Playlist 或课程测验。

| 操作 / 格式 | 产生的记录及效果 | 源行号 |
| --- | --- | --- |
| 普通正式答题 | 先 `recordAttempt(id, correct?1:0, {h,...extra})`，再更新显示状态；正确可升级 solved，错误仅在没有旧状态时设 attempted | 6617–6643 |
| 单选 MCQ | 点击一个选项立即提交，与 correct_index 严格比较；无 pc；猜测 c 从难度参数表读取，不由这个入口临时按选项数计算 | 5627–5635、6472–6487 |
| 多小题 multi | 只统计可评分的 mcq / closed_form 子题，每题等权；全对 x=1，否则 x=0，同时 pc=正确数/可评分数；review 不计入分母 | 4540–4570、5122–5158 |
| 单独核对一个子题 | 只保存本地子题判定，全题 Check 时才正式写入；已经核对的子题结果被保留 | 4919–4967、5122–5158 |
| Solve 提示 | h 取记录时 `solveHintsShown>0`；整道题只乘一次 hintCredit，不按提示数量扣分，也不单独对某子题打折 | 5637–5656、6635 |
| 普通 Solve → Show solution | 首次且尚未 solved、没有任何已存 attempt 时，确认后写 x=0、r=reveal；已有 attempt 或 solved 时只展示，入口不会重新检查30天期限 | 6404–6446 |
| Study 查看解答 | 只展示及发送阅读事件，不调用 recordAttempt / saveStatus | 3869–3895 |
| 倒计时结束 → Reveal answer | 调用 solveRevealOnly，只展示及埋点，不走 x=0 的 Show solution 通路 | 5594–5595、6375–6392 |
| 无自动判分题 → Mark as done | 只 saveStatus(solved)，没有正式 attempt；界面固定“+10 XP”不是可靠规则，实际奖励由难度表决定 | 6375–6401 |
| CodingSolve 的宿主回调 | 接收 onGraded(x) 并直接记录，不传 h/pc/r；真正代码判分器尚未取得 | 200–225 |

提示记录存在原站实现缺口：h 反映当前计数，收起全部提示、切换模式或重绘会清零，因此不能将其解释成永久的“曾使用提示”。本地实验室的复选框直接模拟已写入记录的 h，不假装实现了更严格的历史追踪。

数值判分也有类型差异：整数容差 1e-9；普通数字用 `decimal_tolerance || .01`，decimal 至少 .005；表达式/分数输入使用另一套更紧的容差，比较额外允许 1e-12。符号表达式采用最多500次随机采样、目标12个有效点、至少4点且全部匹配，容差 `1e-6×max(1,abs(reference))`，不是符号证明。单题空/非法输入不写正式错误；multi 中非空但非法的子题会算错。详细边界和解析语法保存在上述审计 JSON，**当前纯评分引擎接收已判定结果，没有声称复刻完整题目判分器**。

30天内首次答错后重试答对，正式 attempts 仍保留错误，显示 progress 可以变 solved，并可按 XP 的首次完成规则领奖。满30天后新答案替换旧记录；不是在旧 theta 上追加一次观察。评分会按自评→初测→题目 ID 对象键顺序重算，所以更改一条早期记录可能改变后续记录的更新量。记录时间只用于替换资格，没有连续时间衰减。

[achievements.js](../../../captures/learn-2026-10-15/scoring/achievements.js) 6–24 行可确认徽章门槛：做对总数 1/10/50/100/500、最长 streak 7/30、easy solved 400（文案说“all easy”但代码是固定 400）、hard solved 10、Level 10、收藏 20、集合 3、课程完成 1/5/10。徽章条件来自相应 stats/ledger，不是 readiness；当前纯模块未搬运徽章 UI 与授予 API。

尚不可声称复现的部分：

1. 服务器 Firestore rules、云端校验/反作弊与私有数据，没有捕获，未知。源注释称“server-side anti-abuse”的登录重算实际位于客户端 JS，不能据此证明服务端行为。
2. 可选 `Rewards.preStreak`、freeze 等奖励扩展：auth.js 20–34 动态加载 rewards.js，1779 行先调用 preStreak。当前未捕获该扩展，`updateStreak` 只实现基础规则，不模拟 freeze。
3. v1/v2 公开拟合参数现已齐备；题目难度模型的训练数据、拟合脚本和模型校准推导仍没有源码，只能使用已公开参数，不能声称复现训练过程。
4. Offer Bar 的现实预测准确度、75% 标记来源、公司级 offer 阈值没有证据；不能表述为获得 offer 的概率。
5. 已检查的公开主链没有将 Learn/Pop Quiz 正确率转成题库 topic Elo 的调用；本地课程成绩不应人为灌入 nObs。补充捕获的 `quanta.js` 中课程/任务回调为空操作；`analytics.js` 的 `trackLessonComplete` 仅发送课程完成事件。服务端如何消费该事件仍未知。
6. 未导入账户真实能力/答题记录。页面读取到的私人评分不是模型源码，不能作为独立预览默认数据或公开静态文件。
7. 代码题真实 judge、各题型完整 answer artifact、Mock/Playlist 独立入口仍未全面核实。已观察到公开 coding-solve.js 依赖地址，但浏览器阻止直接打开；未绕过。已捕获的宿主 onGraded 回调不足以证明测试用例聚合、异常判定和首次回调条件。
8. 原站初测完整流程没有捕获。源码确认 `prefs.calibration` 如何参与计算，不等于已确认初测选题、完整题目、自动判分或服务端如何验证初测。独立训练的初测结果录入入口明确属于本地补充。

## 8. 可复用作答引擎与实验室

入口：[答题计分实验室](http://127.0.0.1:4174/?view=assessment&tab=answers)。该页使用独立人工输入，直接解释一次观察；旧“Skill ratings”页仍是可编辑 v1 场景。不要将旧场景按钮的重复增量视为生产记录规则。

`answer-engine.mjs` 导出四个无副作用接口：

| 函数 | 用途 |
| --- | --- |
| `traceAnswerUpdate({theta,nObs,b,c,x,source,weight})` | 单次观察的 p、K、deltaTheta、rating/mastery/evidence 前后值；x 需先处理部分分和提示 |
| `resolveProblemObservation({problem,attempt,modelVersion,difficultyV1,difficultyV2})` | 从内部 ID / 展示 ID、两套难度参数及 x/h/pc 解出实际主主题和次主题观察，并解释参数来自拟合还是标签后备 |
| `simulateRecordedAnswer({input,problemId,x,extra,now,difficultyV1,difficultyV2,updateProgress})` | 纯内存执行30天冻结/替换、题目显示状态更新，从原始记录重算 v1/v2/rollout 前后报告；删除外部 state，避免将手填能力混入真实重建流程 |
| `roleWeightBreakdown({prefs,problemsIndex})` | 返回17主题的 intrinsic、岗位原始权重、公司混合、重点加成、保底、归一化因子及最终 relevance |

`simulateRecordedAnswer` 的调用方必须提供内部题目 ID；难度表则按展示 ID 查找。它只模拟题库常规答题通路，不执行登录、XP结算、远端保存，也不假装所有 Reveal 入口都调用同一接口。若只研究 attempts，传 `updateProgress:false`；默认按 Problems.solveRecordResult 保留 solved、不因错误降级。它假定请求的显示状态保存成功，没有模拟 auth.js 1348–1353 的独立 3 秒 saveStatus 频率限制。可传 `input.localStatuses` 模拟 getStatus 的本地回退，但不会读取真实浏览器状态。输入和返回值可直接用 JSON 保存重放。

真实复刻必须同时保留两套 b/c 参数、TAG_TOPIC、ROLE_REL、INTRINSIC、初测、自评、progress、solvedHistory、attempts 及选定的时间/版本。只保存“正确率+题目难度标签”无法还原这套状态。

## 验证

从仓库根目录执行：

```sh
node --test QuantVault/learn-preview/src/scoring/scoring-model.test.mjs
node --test QuantVault/learn-preview/src/scoring/answer-engine.test.mjs
```

测试覆盖 192 组原模型一致性（含真实 v1/v2 参数）、不可变输入、状态/跨主题边界、3/4 次证据门槛、评级换算、rollout 时间、课程与能力隔离、等级临界点、Pop Quiz、一次性 XP、30 天冻结、streak 与真实模块列表。测试不访问网络，不读取浏览器私有状态。

新增 answer-engine 的10项测试通过，包含1296组单次观测与原计算器对照、实际拟合参数下 v1/v2/rollout 完整重建、提示与部分分、公司不足10题/达到10题、跨主题去重分配、30天边界、对象键顺序、进度不降级和不可变输入。核心与辅助层合计22项通过。浏览器另外验证了真实题 #621 的 v2 b=1.217、公司/重点偏好不改变单次 θ、3个记录时点及手机布局，证据保存在 `learn-preview/qa/answer-lab-ui-check.json`。

## REA 复核与可核算示例

本轮实际使用官方 `morluto/rea` 发布的 `rea-agents@6.5.0`，通过临时本地 CLI 执行静态分析；没有安装原生反编译器、注册全局 MCP、读取登录凭据或调用下载题目接口。分析了原捕获中的 9 个课程/评分脚本，以及正常浏览器加载后补充保存的 `quanta.js`、`analytics.js`，共 11 个脚本，语法解析失败数为 0。

REA 主分析 Evidence 为 `ev_7acb6b41de00b1b3dbaf05c6d6540fa719da329c08c55d733e36478d1e670296`，补充分析为 `ev_d80209c89bd5f659f5afa9df8c8245ec95438b995f91f792f35bc7863204ade0`。原始证据位于 `QuantVault/rea-research/`，保留源 SHA-256 与语义节点位置。自动图不是完整调用证明：9 个选定文件之外仍有未分析文件，大文件命中节点预算，动态属性关系仍有歧义。对 `readinessCore` 返回值的自动反向追踪在包含候选关系后保留 23 个节点、23 条关系，状态仍是 ambiguous/partial。因此最终数学结论结合人工源码审阅与原纯计算器离线执行，不把静态候选边当成真实执行证据。

以下均为 **v1 合成控制变量示例**：所有主题都有足够证据，并人为固定同一掌握度；练习记录数量同时包括 solved/attempted，不代表必须答对相应题数，也不是刷题后分数的承诺。

| 固定掌握度 | 初测题数 A | 练习记录数 N | base | grind | engagement | Readiness |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| 80% | 10 | 0 | 0.60 | 0 | 0.60 | 48% |
| 80% | 10 | 130 | 0.60 | 0.50 | 0.80 | 64% |
| 80% | 10 | 390 | 0.60 | 0.75 | 0.90 | 72% |
| 80% | 10 | 702 | 0.60 | 0.84375 | 0.9375 | 75% |
| 90% | 10 | 130 | 0.60 | 0.50 | 0.80 | 72% |
| 90% | 10 | 182 | 0.60 | 7/12 | 5/6 | 75% |
| 100% | 0 | 390 | 0 | 0.75 | 0.75 | 75% |

7 个例子均同时通过原捕获计算器、本地模型、显式公式三方比较；向每个输入额外加入 99 课完成、100000 XP 和账户等级后，结果保持不变。复现脚本：`QuantVault/rea-research/verify-quantification.mjs`；输出：`quantification-examples.json`。

本轮另对 problems.js 执行 REA 静态分析，Evidence 为 `ev_852e32d09e74a5a654144aa60487e10ac3e194e385e89df74f99c20e3e04d33c`：解析失败0，26435语义节点，未命中节点数量上限；由于动态调用仍有8397个未知关系，覆盖仍为 partial，不作为完整运行时执行证明。累计已分析12个脚本。摘要在 `QuantVault/rea-research/problems-rea-summary.json`，可关联人工逐行审计和新增引擎对照测试。

另一个基于真实重建路径的合成场景在 `QuantVault/rea-research/verify-readiness-isolated.mjs`：固定 102 个题目记录，Trader 结果为 24，额外加入课程/XP 后仍为 24；只改目标角色为 Researcher 结果为 17，各主题 theta 不变。这说明岗位改变汇总权重，课程 XP 不直接进入已捕获计算器。此类离线结果不能排除未取得源码的 Rewards 扩展或服务端事件后处理。

2026-10-16 再次实际运行 `rea-agents@6.5.0` 分析已捕获的 `recommender.js`，Evidence 为 `ev_ec0df1a7b35f3f01581534db74bdcb0c66d2432c50c41eae2f2a4fb3720a9f50`。解析 1 个文件、3370 个 AST 节点、0 个解析失败，定位 observe/buildStateCore/relevance/masteryOf/skillOf/readiness/readinessCore 七个关键函数；图未截断，但仍有 729 个未知关系，覆盖状态仍为 partial。复核同时确认此前五份证据哈希，并重新通过核心模型与辅助引擎的 22 项测试。可复查 [recheck-summary.json](../../../rea-research/recheck-2026-10-16/recheck-summary.json)。本轮没有向原站发请求或修改账户，以上结论的时间范围是捕获快照。
