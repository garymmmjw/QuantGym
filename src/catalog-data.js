
export const sampleEntries = [
  "今天刷了 3 道 LeetCode，两道 DP，一道二分；概率复盘了 Bayes 和条件期望；速算 15 分钟。",
  "用 pandas 做了 groupby 和 merge 练习；复盘了 OLS 和 p-value；整理了一个 ML 验证方案。",
  "看了一道 market making 的 bid ask 题；复盘 delta/gamma 和 implied volatility；速算练了百分比变化 20 题。"
];

export const problemTagLabels = {
  "概率与期望": { en: "Probability & Expectation" },
  "基本方法与技巧": { en: "Core Methods" },
  "练习题": { en: "Practice" },
  "exercise": { zh: "练习题", en: "Practice" },
  "概率统计": { en: "Probability & Statistics" },
  "条件概率与条件期望": { en: "Conditional Probability" },
  "期望的线性性": { en: "Linearity of Expectation" },
  "递推方法": { en: "Recursion" },
  "博弈论": { en: "Game Theory" },
  "最优停止问题": { en: "Optimal Stopping" },
  "随机过程:Markov 链": { en: "Markov Chains" },
  "Markov 链的基本概念": { en: "Markov Chains" },
  "随机过程:布朗运动": { en: "Brownian Motion" },
  "布朗运动的基本概念": { en: "Brownian Motion" },
  "鞅与停时": { en: "Martingales & Stopping Times" },
  "随机游走": { en: "Random Walk" },
  "次序统计量": { en: "Order Statistics" },
  "线性回归": { en: "Linear Regression" },
  "OLS 回归": { en: "OLS Regression" },
  "Lasso 回归与岭回归": { en: "Lasso & Ridge Regression" },
  "算法类题目": { en: "Algorithms" },
  "数学深度洞察": { en: "Mathematical Insight" },
  "Brainteaser 及竞赛型题目": { en: "Brainteasers" },
  "其他题目": { en: "Other" }
};

export const exerciseTitleOverrides = {
  "001": { zh: "十枚硬币奇偶性", en: "Odd Heads With Ten Coins" },
  "002": { zh: "混合硬币奇偶性", en: "Odd Heads With Mixed Coins" },
  "003": { zh: "圆内随机点距离", en: "Random Point Distance in a Disk" },
  "004": { zh: "阶乘末尾零", en: "Trailing Zeros in a Factorial" },
  "005": { zh: "阶乘末位非零数字", en: "Last Nonzero Digit of a Factorial" },
  "006": { zh: "连续双六等待时间", en: "Waiting Time for Double Sixes" },
  "007": { zh: "随机三角形包含圆心", en: "Random Triangle Contains the Center" },
  "008": { zh: "HTT 首次出现等待时间", en: "Waiting Time for First HTT" },
  "009": { zh: "条件正态象限概率", en: "Conditional Normal Half-Plane Probability" },
  "010": { zh: "正态半径条件期望", en: "Conditional Expectation Given Normal Radius" },
  "011": { zh: "菱形区域整数点计数", en: "Lattice Points in a Diamond" },
  "012": { zh: "偏置多边形随机游走", en: "Biased Walk on a Polygon" },
  "013": { zh: "绳上两点距离分布", en: "Distance Between Two Random Points" },
  "014": { zh: "有序整数分拆极限", en: "Asymptotic Ordered Integer Splits" },
  "015": { zh: "根式幂个位数字", en: "Unit Digit of a Radical Power" },
  "016": { zh: "均匀次序统计协方差", en: "Covariance of Uniform Order Statistics" },
  "017": { zh: "相关正态条件概率", en: "Correlated Normal Conditional Probability" },
  "018": { zh: "余弦无理性证明", en: "Irrationality of a Cosine Value" },
  "019": { zh: "三人硬币转移链", en: "Three-Person Coin Transfer Chain" },
  "020": { zh: "球面短弧期望", en: "Expected Short Arc on a Sphere" },
  "021": { zh: "数字乘积最小数", en: "Smallest Number With Digit Product" },
  "022": { zh: "男女相邻对数期望", en: "Expected Adjacent Mixed Pairs" }
};

export const seedProblems = [
  {
    id: "seed-two-sum",
    titleEn: "Two Sum",
    titleZh: "两数之和",
    category: "leetcode",
    difficulty: "Easy",
    tags: ["hash-map", "array"],
    source: "seed",
    sourceUrl: "",
    promptEn: "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
    promptZh: "给定整数数组 nums 和整数 target，返回两个数的下标，使它们的和等于 target。",
    answer: "Use a hash map from value to index. For each value x, check whether target - x has appeared before.",
    explanation: "One pass is enough. At index i, if complement exists in the map, return the saved index and i. Otherwise store nums[i]. Time O(n), space O(n).",
    createdAt: "seed"
  },
  {
    id: "seed-bayes-positive-test",
    titleEn: "Bayes Positive Test",
    titleZh: "贝叶斯阳性检测",
    category: "probabilityExpectation",
    difficulty: "Medium",
    tags: ["bayes", "conditional-probability"],
    source: "seed",
    sourceUrl: "",
    promptEn: "A disease affects 1% of people. A test has 95% sensitivity and 90% specificity. If someone tests positive, what is the probability they have the disease?",
    promptZh: "某疾病患病率为 1%。检测灵敏度 95%，特异度 90%。若检测阳性，实际患病概率是多少？",
    answer: "About 8.8%.",
    explanation: "P(D|+) = P(+|D)P(D) / [P(+|D)P(D) + P(+|not D)P(not D)] = 0.95*0.01 / (0.95*0.01 + 0.10*0.99) ≈ 0.0876.",
    createdAt: "seed"
  },
  {
    id: "seed-dice-ev",
    titleEn: "Dice Expected Value",
    titleZh: "骰子期望",
    category: "probabilityExpectation",
    difficulty: "Easy",
    tags: ["expected-value", "dice"],
    source: "seed",
    sourceUrl: "",
    promptEn: "You roll one fair die. You may either keep the result or pay 1 dollar to reroll once and keep the second result. What is the optimal expected value?",
    promptZh: "掷一枚公平骰子。你可以保留结果，也可以付 1 美元重掷一次并保留第二次结果。最优期望是多少？",
    answer: "Keep 3, 4, 5, 6; reroll 1, 2. The optimal net expected value is 23/6 ≈ 3.83.",
    explanation: "The reroll option is worth E[die] - 1 = 2.5, so keep any first roll above 2.5. EV = (1/6)(2.5+2.5+3+4+5+6)=23/6.",
    createdAt: "seed"
  },
  {
    id: "seed-market-making",
    titleEn: "Simple Market Making",
    titleZh: "简单做市",
    category: "market",
    difficulty: "Medium",
    tags: ["market-making", "inventory"],
    source: "seed",
    sourceUrl: "",
    promptEn: "A fair coin pays 100 if heads and 0 if tails. You are asked to make a two-sided market for one contract. What bid and ask would you quote, and how do you adjust after buying inventory?",
    promptZh: "一个公平硬币合约：正面支付 100，反面支付 0。请给出双边报价。若你买入库存后，应如何调整报价？",
    answer: "Fair value is 50. Quote around it, for example 49/51 or wider depending on risk. After buying inventory, lower the quote to reduce further buying and encourage selling.",
    explanation: "The key interview signal is not one magic spread, but inventory-aware pricing: fair value, spread for adverse selection/risk, and skew based on current position.",
    createdAt: "seed"
  }
];

const runtimeGlobal = typeof globalThis !== "undefined" ? globalThis : {};
const runtimeWindow = runtimeGlobal.window || {};
const runtimeProblemCatalog = runtimeGlobal.quantProblemCatalog || runtimeWindow.quantProblemCatalog;

export const catalogProblems = Array.isArray(runtimeProblemCatalog)
  ? runtimeProblemCatalog
  : [];

export function getRuntimeCatalogProblems() {
  const value = runtimeGlobal.quantProblemCatalog || runtimeWindow.quantProblemCatalog;
  return Array.isArray(value) ? value : catalogProblems;
}
export const disabledProblemSources = new Set(["question-bank"]);
export const disabledProblemBookNames = new Set(["Archived Question Bank"]);

export const seedNews = [
  {
    id: "news-jane-street-q1-2026",
    title: "Jane Street reports a record Q1 trading haul",
    titleZh: "Jane Street Q1 交易收入创纪录",
    source: "Reuters / Investing.com",
    sourceUrl: "https://m.investing.com/news/stock-market-news/jane-street-posts-big-jump-in-trading-revenue-for-first-quarter-with-161-billion-haul-sources-say-4673532?ampMode=1",
    publishedAt: "2026-05-08",
    tags: ["Jane Street", "volatility", "market making"],
    skills: ["market", "option", "deepLearning"],
    summary: "Reuters 报道称，Jane Street 2026 年第一季度交易收入达到 161 亿美元，市场波动、机器辅助中频策略和 AI 公司持仓表现是关键词。",
    insight: "面试启发：为什么波动率上升会利好做市和多资产交易？可以用 bid-ask spread、inventory risk、holding period 和模型定价来解释。",
    createdAt: "seed"
  },
  {
    id: "news-jane-street-coreweave-2026",
    title: "Jane Street signs a large AI cloud capacity deal with CoreWeave",
    titleZh: "Jane Street 与 CoreWeave 签下 AI 云算力协议",
    source: "Data Center Dynamics",
    sourceUrl: "https://www.datacenterdynamics.com/en/news/quantative-trading-firm-jane-street-signs-6bn-ai-cloud-deal-with-coreweave/",
    publishedAt: "2026-04-16",
    tags: ["AI infrastructure", "CoreWeave", "GPU"],
    skills: ["deepLearning", "machineLearning", "market"],
    summary: "Data Center Dynamics 报道，Jane Street 与 CoreWeave 签下 60 亿美元 AI 云容量协议，并进行了 10 亿美元股权投资。",
    insight: "面试启发：现代 quant 不只是数学题，也越来越像大规模 ML 系统题。可以联想到特征工程、噪声数据、训练成本和低延迟部署。",
    createdAt: "seed"
  },
  {
    id: "news-jane-street-2025-haul",
    title: "Jane Street posts a record 2025 trading revenue figure",
    titleZh: "Jane Street 2025 年交易收入刷新纪录",
    source: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com/news/articles/2026-04-24/jane-street-snatches-wall-street-crown-with-record-39-6-billion-trading-haul?srnd=phx-industries-finance",
    publishedAt: "2026-04-24",
    tags: ["trading revenue", "banks", "competition"],
    skills: ["market", "statistics"],
    summary: "Bloomberg 报道，Jane Street 2025 年交易收入达到 396 亿美元，并与大型投行交易业务形成直接比较。",
    insight: "面试启发：这类新闻适合练习 market structure：为什么自营做市商能和投行交易台竞争？资本、技术、风险约束分别扮演什么角色？",
    createdAt: "seed"
  },
  {
    id: "news-squarepoint-stg-2026",
    title: "Squarepoint affiliate starts an electronic market-making arm",
    titleZh: "Squarepoint 关联方启动电子做市业务",
    source: "Bloomberg",
    sourceUrl: "https://www.bloomberg.com/news/articles/2026-03-04/squarepoint-affiliate-starts-market-making-arm-to-rival-citadel",
    publishedAt: "2026-03-04",
    tags: ["Squarepoint", "STG Securities", "market making"],
    skills: ["market", "statistics", "leetcode"],
    summary: "Bloomberg 报道，Squarepoint 关联方将成立电子交易/做市业务 STG Securities，体现 hedge fund 与 market maker 模式的融合。",
    insight: "面试启发：可以比较 hedge fund alpha、market making spread capture 和 execution technology 的差异，顺带复习 order book 与实时系统。",
    createdAt: "seed"
  }
];

export const seedJobs = [
  {
    id: "job-jane-street-quant-intern",
    company: "Jane Street",
    title: "Quantitative Trading / Research Internship",
    type: "internship",
    location: "New York / London / Hong Kong",
    url: "https://www.janestreet.com/join-jane-street/open-roles/",
    postedAt: "crawler-ready",
    tags: ["trading", "probability", "market making"]
  },
  {
    id: "job-citadel-securities-intern",
    company: "Citadel Securities",
    title: "Quantitative Research Internship",
    type: "internship",
    location: "New York / Chicago",
    url: "https://www.citadelsecurities.com/careers/open-opportunities/",
    postedAt: "crawler-ready",
    tags: ["research", "statistics", "market"]
  },
  {
    id: "job-optiver-trading-intern",
    company: "Optiver",
    title: "Quantitative Trading Internship",
    type: "internship",
    location: "Chicago / Amsterdam / Sydney",
    url: "https://optiver.com/working-at-optiver/career-opportunities/",
    postedAt: "crawler-ready",
    tags: ["mental math", "options", "trading"]
  },
  {
    id: "job-imc-quant-trader",
    company: "IMC",
    title: "Graduate Quant Trader / Researcher",
    type: "fulltime",
    location: "Chicago / Amsterdam / Sydney",
    url: "https://www.imc.com/us/careers/jobs/",
    postedAt: "crawler-ready",
    tags: ["full-time", "trading", "coding"]
  },
  {
    id: "job-drw-researcher",
    company: "DRW",
    title: "Quantitative Researcher",
    type: "fulltime",
    location: "Chicago / New York / London",
    url: "https://drw.com/work-at-drw/listings/",
    postedAt: "crawler-ready",
    tags: ["research", "data", "markets"]
  },
  {
    id: "job-jump-trading-campus",
    company: "Jump Trading",
    title: "Campus Quantitative Research / Trading",
    type: "fulltime",
    location: "Chicago / New York / London",
    url: "https://www.jumptrading.com/careers/",
    postedAt: "crawler-ready",
    tags: ["campus", "systems", "probability"]
  }
];

export const quantCompanyDefs = [
  {
    slug: "jane-street",
    name: "Jane Street",
    short: "JS",
    tier: "S",
    type: "Prop trading / market making",
    color: "#6f5a2f",
    accent: "#d3a632",
    aliases: ["Jane Street", "JaneStreet"],
    website: "https://www.janestreet.com/join-jane-street/open-roles/",
    locations: ["New York", "London", "Hong Kong"],
    focus: ["Probability", "Game theory", "Trading intuition", "OCaml / systems"],
    summaryZh: "强概率、博弈和交易直觉，题目常要求把不确定性讲成清晰策略。",
    summaryEn: "Probability-heavy, game-oriented interviews that reward clean strategy under uncertainty."
  },
  {
    slug: "citadel",
    name: "Citadel Securities",
    short: "C",
    tier: "S",
    type: "Market maker / quant research",
    color: "#27376f",
    accent: "#4f80ff",
    aliases: ["Citadel", "Citadel Securities"],
    website: "https://www.citadelsecurities.com/careers/open-opportunities/",
    locations: ["New York", "Chicago", "London"],
    focus: ["Statistics", "Market microstructure", "Research design", "Coding"],
    summaryZh: "更偏研究、统计和市场结构，适合把假设、数据和风险讲严谨。",
    summaryEn: "Research-heavy interviews around statistics, market structure, data, and risk."
  },
  {
    slug: "optiver",
    name: "Optiver",
    short: "O",
    tier: "A",
    type: "Options market maker",
    color: "#6d3d1b",
    accent: "#f08b24",
    aliases: ["Optiver"],
    website: "https://optiver.com/working-at-optiver/career-opportunities/",
    locations: ["Chicago", "Amsterdam", "Sydney"],
    focus: ["Mental math", "Options", "Probability", "Market making"],
    summaryZh: "速算、期权、做市和风险反应速度很重要，适合限时训练。",
    summaryEn: "Fast-paced trading screens with mental math, options, probability, and market making."
  },
  {
    slug: "imc",
    name: "IMC",
    short: "IMC",
    tier: "A",
    type: "Market maker",
    color: "#13576a",
    accent: "#1fb4d1",
    aliases: ["IMC", "IMC Trading"],
    website: "https://www.imc.com/us/careers/jobs/",
    locations: ["Chicago", "Amsterdam", "Sydney"],
    focus: ["Probability", "Mental math", "Trading", "Coding"],
    summaryZh: "常见概率、速算和交易推理，强调把思路快速说完整。",
    summaryEn: "Probability, mental math, and trading reasoning with clear communication under time pressure."
  },
  {
    slug: "drw",
    name: "DRW",
    short: "DRW",
    tier: "A",
    type: "Trading / research",
    color: "#254447",
    accent: "#39b7aa",
    aliases: ["DRW", "DRW OA"],
    website: "https://drw.com/work-at-drw/listings/",
    locations: ["Chicago", "New York", "London"],
    focus: ["Probability", "Markets", "Data", "Systems"],
    summaryZh: "覆盖交易、研究和系统思维，题目常把概率和市场背景结合。",
    summaryEn: "Trading, research, and systems interviews with probability tied back to markets."
  },
  {
    slug: "jump-trading",
    name: "Jump Trading",
    short: "JT",
    tier: "A",
    type: "Low-latency trading / research",
    color: "#74333d",
    accent: "#ff6b6b",
    aliases: ["Jump", "Jump Trading"],
    website: "https://www.jumptrading.com/careers/",
    locations: ["Chicago", "New York", "London"],
    focus: ["Systems", "Probability", "Research", "Coding"],
    summaryZh: "偏系统、研究和高频交易背景，适合同时准备 coding 与概率。",
    summaryEn: "Systems and research oriented, often blending coding depth with probability."
  },
  {
    slug: "hrt",
    name: "HRT",
    short: "HRT",
    tier: "S",
    type: "Quant trading / HFT",
    color: "#184559",
    accent: "#27c6e8",
    aliases: ["HRT", "Hudson River Trading"],
    website: "https://www.hudsonrivertrading.com/careers/",
    locations: ["New York", "London", "Singapore"],
    focus: ["Algorithms", "Probability", "C++", "Systems"],
    summaryZh: "算法和系统要求高，适合把复杂度、边界和工程权衡讲清楚。",
    summaryEn: "Algorithmic and systems-heavy interviews with strong emphasis on engineering tradeoffs."
  },
  {
    slug: "two-sigma",
    name: "Two Sigma",
    short: "2S",
    tier: "S",
    type: "Quant research / hedge fund",
    color: "#155f66",
    accent: "#28b5bc",
    aliases: ["Two Sigma", "2 Sigma"],
    website: "https://www.twosigma.com/careers/",
    locations: ["New York", "London"],
    focus: ["Statistics", "ML", "Research", "Data"],
    summaryZh: "偏统计、机器学习和研究设计，适合准备 estimator、bias 和验证。",
    summaryEn: "Statistics, ML, and research design with emphasis on estimators, bias, and validation."
  },
  {
    slug: "de-shaw",
    name: "D. E. Shaw",
    short: "DES",
    tier: "S",
    type: "Quant hedge fund",
    color: "#44355d",
    accent: "#b776ff",
    aliases: ["D.E. Shaw", "D. E. Shaw", "DE Shaw"],
    website: "https://www.deshaw.com/careers",
    locations: ["New York", "London", "Hong Kong"],
    focus: ["Statistics", "Research", "Probability", "Coding"],
    summaryZh: "研究型题目较多，重视严谨推导、实验设计和代码基本功。",
    summaryEn: "Research-oriented interviews around rigorous reasoning, experiments, and coding fundamentals."
  },
  {
    slug: "virtu",
    name: "Virtu Financial",
    short: "V",
    tier: "A",
    type: "Market maker",
    color: "#18403b",
    accent: "#2abf8f",
    aliases: ["Virtu", "Virtu Financial"],
    website: "https://www.virtu.com/careers/",
    locations: ["New York", "Austin", "London"],
    focus: ["Market making", "Probability", "Risk", "Coding"],
    summaryZh: "偏电子做市和风险控制，常把概率题落到报价与库存直觉。",
    summaryEn: "Electronic market making and risk control, often tying probability back to quotes and inventory."
  },
  {
    slug: "sig",
    name: "SIG",
    short: "SIG",
    tier: "A",
    type: "Options trading / decision science",
    color: "#3f4c62",
    accent: "#8fb3ff",
    aliases: ["SIG", "Susquehanna", "Susquehanna International Group"],
    website: "https://careers.sig.com/",
    locations: ["Philadelphia", "New York", "Dublin"],
    focus: ["Decision science", "Options", "Probability", "Games"],
    summaryZh: "决策科学和期权风格强，适合训练条件概率、博弈和风险偏好。",
    summaryEn: "Decision science and options-heavy interviews with conditional probability and games."
  },
  {
    slug: "five-rings",
    name: "Five Rings",
    short: "5R",
    tier: "A",
    type: "Proprietary trading",
    color: "#4c3c5f",
    accent: "#b39ddb",
    aliases: ["Five Rings", "5 Rings"],
    website: "https://fiverings.com/careers/",
    locations: ["New York", "London"],
    focus: ["Probability", "Puzzles", "Trading", "Coding"],
    summaryZh: "题型偏概率和 puzzle，适合练习小样本推理和口述结构。",
    summaryEn: "Probability and puzzle-heavy interviews that reward crisp small-case reasoning."
  },
  {
    slug: "akuna",
    name: "Akuna Capital",
    short: "AK",
    tier: "B",
    type: "Options market maker",
    color: "#59364c",
    accent: "#f25f9c",
    aliases: ["Akuna", "Akuna Capital"],
    website: "https://akunacapital.com/careers/",
    locations: ["Chicago", "Sydney"],
    focus: ["Options", "Mental math", "Probability", "Coding"],
    summaryZh: "期权、速算和交易基础占比高，适合做入门到中阶题单。",
    summaryEn: "Options, mental math, and trading basics across beginner-to-intermediate screens."
  }
];

export const seedCourses = [
  {
    id: "course-atypicalquant-interview",
    title: "AtypicalQuant Quant Interview Questions",
    platform: "YouTube",
    provider: "AtypicalQuant",
    url: "https://www.youtube.com/@atypicalquant",
    topic: "Quant Interview",
    level: "Interview",
    summary: "可视化讲解 quant 面试题，覆盖概率、统计、算法和交易思维。",
    tags: ["probability", "statistics", "interview", "brainteaser"]
  },
  {
    id: "course-mit-probability",
    title: "MIT Introduction to Probability: Stochastic Processes",
    platform: "YouTube",
    provider: "MIT OpenCourseWare",
    url: "https://ocw.mit.edu/courses/res-6-012-introduction-to-probability-spring-2018/resources/stochastic-processes/",
    topic: "Probability",
    level: "Core",
    summary: "概率论和随机过程核心课，适合补马尔可夫链、条件期望和过程直觉。",
    tags: ["probability", "stochastic-process", "markov", "expectation"]
  },
  {
    id: "course-statquest-ml-stats",
    title: "StatQuest: Statistics and Machine Learning",
    platform: "YouTube",
    provider: "StatQuest",
    url: "https://www.youtube.com/@statquest/search?query=probability%20statistics%20machine%20learning",
    sources: [
      {
        provider: "YouTube",
        title: "Probability Distributions",
        url: "https://www.youtube.com/watch?v=oI3hZJqXJuc"
      },
      {
        provider: "StatQuest",
        title: "Video index",
        url: "https://statquest.org/video-index/"
      }
    ],
    topic: "Statistics / ML",
    level: "Foundation",
    summary: "统计、回归、机器学习概念拆解清楚，适合面试前补知识点。",
    tags: ["statistics", "machine-learning", "regression", "hypothesis"]
  },
  {
    id: "course-bili-harvard-fat-chance",
    title: "哈佛通识概率课 Fat Chance",
    platform: "Bilibili",
    provider: "HarvardX / Bilibili",
    url: "https://www.bilibili.com/video/BV1qs411A75n/",
    topic: "Probability",
    level: "Foundation",
    summary: "从 counting 到概率直觉，适合系统补概率基础。",
    tags: ["概率", "counting", "foundation", "Harvard"]
  },
  {
    id: "course-bili-wharton-quant-modeling",
    title: "沃顿商学院量化建模基础",
    platform: "Bilibili",
    provider: "Wharton / Bilibili",
    url: "https://www.bilibili.com/video/BV18u4y1B7FE/",
    topic: "Quant Modeling",
    level: "Foundation",
    summary: "量化建模、概率分类模型和数据分析基础，适合建立业务建模框架。",
    tags: ["quant-modeling", "finance", "data-analysis", "Wharton"]
  },
  {
    id: "course-bili-mit-quant-finance",
    title: "MIT 量化金融数学方法",
    platform: "Bilibili",
    provider: "MIT / Bilibili",
    url: "https://www.bilibili.com/list/ml505060308",
    topic: "Quant Finance",
    level: "Advanced",
    summary: "覆盖概率、离散/连续时间随机过程、资产定价和优化。",
    tags: ["quant-finance", "stochastic-process", "asset-pricing", "optimization"]
  },
  {
    id: "course-bili-green-book",
    title: "量化面试绿皮书题解",
    platform: "Bilibili",
    provider: "quantcamp.ai",
    url: "https://www.bilibili.com/video/BV1if421B7ta/",
    topic: "Interview Problems",
    level: "Interview",
    summary: "量化面试脑筋急转弯和概率题视频题解，适合配合题库复盘。",
    tags: ["interview", "brainteaser", "probability", "green-book"]
  },
  {
    id: "course-bili-market-making",
    title: "Quant 面试知识点：CLT、Market Making、Monte Carlo",
    platform: "Bilibili",
    provider: "Bilibili",
    url: "https://www.bilibili.com/video/BV1vK4y1Z7Wu/",
    topic: "Market Making",
    level: "Interview",
    summary: "把中心极限定理、做市和 Monte Carlo 串成面试知识点。",
    tags: ["market-making", "monte-carlo", "clt", "interview"]
  }
];
