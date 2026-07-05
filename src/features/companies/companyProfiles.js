// Design-spec presentation copy for the Companies master-detail page.
// Content for the six design-listed firms is copied verbatim from the
// "QuantGym 公司.dc.html" design source (data() block); the remaining
// catalog firms follow the same editorial format. Live numbers (question
// stats, open roles) still come from the real store — this module only
// carries static profile copy the catalog does not provide.

export const COMPANY_PROFILES = {
  "jane-street": {
    heroColor: "#1b1a38",
    focusZh: "交易 / 研究",
    founded: "2000",
    hqZh: "纽约",
    hqEn: "New York",
    match: 88,
    taglineZh: "OCaml 驱动的自营交易巨头",
    taglineEn: "OCaml-powered proprietary trading giant",
    aboutZh: "以概率直觉、脑筋急转弯和「出声思考」文化著称，重视第一性原理与团队协作，技术栈以 OCaml 为核心。",
    rounds: [
      { zh: "在线测评 · 概率 + 逻辑", en: "Online test · probability + logic", tagZh: "OA", tagEn: "OA" },
      { zh: "电话面 · 脑筋急转弯", en: "Phone screen · brainteasers", tagZh: "思维", tagEn: "Logic" },
      { zh: "Superday · 市场直觉题", en: "Superday · market intuition", tagZh: "终面", tagEn: "Final" },
      { zh: "交易游戏 · EV 决策", en: "Trading game · EV decisions", tagZh: "实战", tagEn: "Live" }
    ],
    topicsZh: ["醉酒乘客", "期望博弈", "对称性", "市场直觉"],
    resources: [
      { zh: "Jane Street 面经合集 · 42 篇", en: "Jane Street interview digest · 42 posts", module: "experiences" },
      { zh: "脑筋急转弯专题 · 绿皮书", en: "Brainteaser special · Green Book", module: "library" }
    ]
  },
  optiver: {
    heroColor: "#e0562e",
    focusZh: "做市 · 速算",
    founded: "1986",
    hqZh: "阿姆斯特丹",
    hqEn: "Amsterdam",
    match: 92,
    taglineZh: "速算为王的欧洲做市商",
    taglineEn: "Europe's mental-math-first market maker",
    aboutZh: "以严苛的限时心算测试闻名，强调压力下的计算稳定性与做市报价直觉，是速算训练者的头号目标。",
    rounds: [
      { zh: "8 分钟限时速算 · 80 题", en: "8-minute timed math · 80 Qs", tagZh: "速算", tagEn: "Math" },
      { zh: "概率与期望口算", en: "Mental probability & EV", tagZh: "概率", tagEn: "Prob" },
      { zh: "做市模拟报价", en: "Market-making simulation", tagZh: "做市", tagEn: "MM" },
      { zh: "终面 · Motivation", en: "Final · motivation", tagZh: "文化", tagEn: "Culture" }
    ],
    topicsZh: ["限时速算", "两位数乘法", "做市报价", "期望"],
    resources: [
      { zh: "Optiver 速算轮真题 · 去练", en: "Optiver speed-math drills · practice", module: "problems" },
      { zh: "Mental Math 冲刺计划", en: "Mental math sprint plan", module: "library" }
    ]
  },
  citadel: {
    heroColor: "#0b6ea8",
    focusZh: "做市 · 统计",
    founded: "2002",
    hqZh: "纽约",
    hqEn: "New York",
    match: 81,
    taglineZh: "全球最大电子做市商之一",
    taglineEn: "One of the largest electronic market makers",
    aboutZh: "偏重统计、随机过程与机器学习，注重数据处理与建模的严谨性，工程与研究并重。",
    rounds: [
      { zh: "在线测评 · 统计 + 编程", en: "Online test · stats + coding", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · 随机过程", en: "Technical · stochastic processes", tagZh: "技术", tagEn: "Tech" },
      { zh: "建模案例 · 回归诊断", en: "Modeling case · regression diagnostics", tagZh: "案例", tagEn: "Case" },
      { zh: "终面 · 系统与协作", en: "Final · systems & collaboration", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["布朗运动", "鞅", "回归诊断", "Python"],
    resources: [
      { zh: "Stat 110 战略练习 · 184 题", en: "Stat 110 drills · 184 Qs", module: "problems" },
      { zh: "随机过程学习路径", en: "Stochastic processes study path", module: "library" }
    ]
  },
  imc: {
    heroColor: "#c8102e",
    focusZh: "做市 · 交易游戏",
    founded: "1989",
    hqZh: "阿姆斯特丹",
    hqEn: "Amsterdam",
    match: 79,
    taglineZh: "交易游戏文化浓厚的做市商",
    taglineEn: "Market maker with a trading-game culture",
    aboutZh: "群面速算加扑克式博弈决策，考察压力下的 EV 计算、风险偏好与仓位管理纪律。",
    rounds: [
      { zh: "群面速算", en: "Group mental math", tagZh: "速算", tagEn: "Math" },
      { zh: "扑克博弈决策", en: "Poker game decisions", tagZh: "博弈", tagEn: "Games" },
      { zh: "交易游戏", en: "Trading game", tagZh: "实战", tagEn: "Live" },
      { zh: "终面 · 复盘", en: "Final · debrief", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["扑克 EV", "仓位管理", "速算", "风险偏好"],
    resources: [
      { zh: "Poker 训练场 · 去练", en: "Poker gym · practice", module: "poker" },
      { zh: "IMC 面经 · 交易游戏", en: "IMC interviews · trading games", module: "experiences" }
    ]
  },
  drw: {
    heroColor: "#2f9be0",
    focusZh: "自营 · 工程",
    founded: "1992",
    hqZh: "芝加哥",
    hqEn: "Chicago",
    match: 74,
    taglineZh: "工程驱动的多元自营交易",
    taglineEn: "Engineering-driven diversified prop trading",
    aboutZh: "偏工程与数据：时间序列特征、回测框架、低延迟系统设计，对 C++ 与系统能力要求较高。",
    rounds: [
      { zh: "编程测评 · C++/Python", en: "Coding test · C++/Python", tagZh: "OA", tagEn: "OA" },
      { zh: "时间序列 + 回测", en: "Time series + backtesting", tagZh: "技术", tagEn: "Tech" },
      { zh: "系统设计 · 低延迟", en: "System design · low latency", tagZh: "系统", tagEn: "Systems" },
      { zh: "终面", en: "Final round", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["时间序列", "回测框架", "C++", "低延迟"],
    resources: [
      { zh: "市场微观结构讲义", en: "Market microstructure notes", module: "library" },
      { zh: "DRW 面经 · 系统设计", en: "DRW interviews · system design", module: "experiences" }
    ]
  },
  sig: {
    heroColor: "#16a06a",
    focusZh: "期权 · 扑克",
    founded: "1987",
    hqZh: "费城",
    hqEn: "Philadelphia",
    match: 83,
    taglineZh: "把扑克写进培训手册的期权做市商",
    taglineEn: "The options market maker that trains with poker",
    aboutZh: "以扑克文化训练概率与决策直觉，期权定价与 EV 思维是核心，新人培训包含大量博弈训练。",
    rounds: [
      { zh: "在线测评 · 概率", en: "Online test · probability", tagZh: "OA", tagEn: "OA" },
      { zh: "扑克 & EV 决策", en: "Poker & EV decisions", tagZh: "博弈", tagEn: "Games" },
      { zh: "期权定价直觉", en: "Options pricing intuition", tagZh: "期权", tagEn: "Options" },
      { zh: "终面", en: "Final round", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["扑克 EV", "期权定价", "概率", "决策"],
    resources: [
      { zh: "Poker 训练场 · 去练", en: "Poker gym · practice", module: "poker" },
      { zh: "期权定价 · Hull", en: "Options pricing · Hull", module: "library" }
    ]
  },
  hrt: {
    focusZh: "量化交易 · 高频",
    founded: "1998",
    hqZh: "纽约",
    hqEn: "New York",
    match: 85,
    taglineZh: "算法驱动的高频交易先锋",
    taglineEn: "Algorithm-driven HFT pioneer",
    rounds: [
      { zh: "在线测评 · 算法 + 概率", en: "Online test · algorithms + probability", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · 算法与数据结构", en: "Technical · algorithms & data structures", tagZh: "技术", tagEn: "Tech" },
      { zh: "系统设计 · 低延迟", en: "System design · low latency", tagZh: "系统", tagEn: "Systems" },
      { zh: "终面 · 工程协作", en: "Final · engineering collaboration", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["算法复杂度", "C++", "并发", "系统设计"],
    resources: [
      { zh: "HRT 面经合集", en: "HRT interview digest", module: "experiences" },
      { zh: "算法专题 · 绿皮书", en: "Algorithms special · Green Book", module: "library" }
    ]
  },
  "two-sigma": {
    focusZh: "研究 · 数据",
    founded: "2001",
    hqZh: "纽约",
    hqEn: "New York",
    match: 80,
    taglineZh: "数据科学驱动的量化对冲基金",
    taglineEn: "Data-science-driven quant hedge fund",
    rounds: [
      { zh: "在线测评 · 统计 + 编程", en: "Online test · stats + coding", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · ML 与统计", en: "Technical · ML & statistics", tagZh: "技术", tagEn: "Tech" },
      { zh: "研究案例 · 估计与验证", en: "Research case · estimation & validation", tagZh: "案例", tagEn: "Case" },
      { zh: "终面 · 研究品味", en: "Final · research taste", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["估计量", "偏差与方差", "特征工程", "交叉验证"],
    resources: [
      { zh: "Two Sigma 面经合集", en: "Two Sigma interview digest", module: "experiences" },
      { zh: "Stat 110 战略练习 · 184 题", en: "Stat 110 drills · 184 Qs", module: "problems" }
    ]
  },
  "de-shaw": {
    focusZh: "研究 · 系统化",
    founded: "1988",
    hqZh: "纽约",
    hqEn: "New York",
    match: 78,
    taglineZh: "系统化投资的先驱基金",
    taglineEn: "Pioneer of systematic investing",
    rounds: [
      { zh: "在线测评 · 概率 + 编程", en: "Online test · probability + coding", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · 严谨推导", en: "Technical · rigorous derivations", tagZh: "技术", tagEn: "Tech" },
      { zh: "研究案例 · 实验设计", en: "Research case · experiment design", tagZh: "案例", tagEn: "Case" },
      { zh: "终面", en: "Final round", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["严谨推导", "实验设计", "概率", "代码基本功"],
    resources: [
      { zh: "D. E. Shaw 面经合集", en: "D. E. Shaw interview digest", module: "experiences" },
      { zh: "实验设计学习路径", en: "Experiment design study path", module: "library" }
    ]
  },
  "jump-trading": {
    focusZh: "高频 · 系统",
    founded: "1999",
    hqZh: "芝加哥",
    hqEn: "Chicago",
    match: 72,
    taglineZh: "低延迟基础设施的极致玩家",
    taglineEn: "Relentless about low-latency infrastructure",
    rounds: [
      { zh: "编程测评 · C++/Python", en: "Coding test · C++/Python", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · 系统与网络", en: "Technical · systems & networking", tagZh: "技术", tagEn: "Tech" },
      { zh: "系统设计 · 低延迟", en: "System design · low latency", tagZh: "系统", tagEn: "Systems" },
      { zh: "终面", en: "Final round", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["低延迟系统", "C++", "网络", "概率"],
    resources: [
      { zh: "Jump 面经 · 系统设计", en: "Jump interviews · system design", module: "experiences" },
      { zh: "低延迟系统讲义", en: "Low-latency systems notes", module: "library" }
    ]
  },
  virtu: {
    focusZh: "做市 · 风控",
    founded: "2008",
    hqZh: "纽约",
    hqEn: "New York",
    match: 76,
    taglineZh: "全球电子做市巨头",
    taglineEn: "Global electronic market-making giant",
    rounds: [
      { zh: "在线测评 · 概率", en: "Online test · probability", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · 做市与风控", en: "Technical · market making & risk", tagZh: "技术", tagEn: "Tech" },
      { zh: "报价模拟 · 库存管理", en: "Quoting sim · inventory management", tagZh: "实战", tagEn: "Live" },
      { zh: "终面", en: "Final round", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["做市报价", "库存风险", "概率", "风控"],
    resources: [
      { zh: "Virtu 面经合集", en: "Virtu interview digest", module: "experiences" },
      { zh: "做市与风控专题", en: "Market making & risk special", module: "library" }
    ]
  },
  "five-rings": {
    focusZh: "自营 · Puzzle",
    founded: "2001",
    hqZh: "纽约",
    hqEn: "New York",
    match: 77,
    taglineZh: "Puzzle 风格浓厚的自营交易",
    taglineEn: "Prop trading with a puzzle-heavy style",
    rounds: [
      { zh: "在线测评 · 概率 + Puzzle", en: "Online test · probability + puzzles", tagZh: "OA", tagEn: "OA" },
      { zh: "电话面 · 小样本推理", en: "Phone screen · small-case reasoning", tagZh: "思维", tagEn: "Logic" },
      { zh: "现场面 · 博弈与口述", en: "Onsite · games & talk-through", tagZh: "终面", tagEn: "Final" },
      { zh: "交易游戏 · EV 决策", en: "Trading game · EV decisions", tagZh: "实战", tagEn: "Live" }
    ],
    topicsZh: ["小样本推理", "Puzzle", "概率", "口述结构"],
    resources: [
      { zh: "Five Rings 面经合集", en: "Five Rings interview digest", module: "experiences" },
      { zh: "Puzzle 专题 · 绿皮书", en: "Puzzle special · Green Book", module: "library" }
    ]
  },
  akuna: {
    focusZh: "期权 · 做市",
    founded: "2011",
    hqZh: "芝加哥",
    hqEn: "Chicago",
    match: 73,
    taglineZh: "期权做市的新锐力量",
    taglineEn: "Fast-rising options market maker",
    rounds: [
      { zh: "在线测评 · 速算 + 概率", en: "Online test · mental math + probability", tagZh: "OA", tagEn: "OA" },
      { zh: "技术面 · 期权基础", en: "Technical · options fundamentals", tagZh: "期权", tagEn: "Options" },
      { zh: "做市模拟", en: "Market-making simulation", tagZh: "做市", tagEn: "MM" },
      { zh: "终面", en: "Final round", tagZh: "终面", tagEn: "Final" }
    ],
    topicsZh: ["期权基础", "速算", "概率", "希腊字母"],
    resources: [
      { zh: "Akuna 面经合集", en: "Akuna interview digest", module: "experiences" },
      { zh: "期权定价 · Hull", en: "Options pricing · Hull", module: "library" }
    ]
  }
};

export function getCompanyProfile(slug) {
  return COMPANY_PROFILES[slug] || null;
}
