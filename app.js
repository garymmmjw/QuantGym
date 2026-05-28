const STORAGE_KEY = "quantMemoryBoard.v1";
const AUTH_KEY = "quantMemoryBoard.auth.v1";
const USER_STATE_PREFIX = "quantMemoryBoard.userState.v1";
const LLM_CONFIG_KEY = "quantMemoryBoard.llm.v1";
const PENDING_CAPTURE_KEY = "quantMemoryBoard.pendingCapture.v1";
const APP_PREFS_KEY = "quantMemoryBoard.preferences.v1";
const COMMUNITY_KEY = "quantMemoryBoard.community.v1";
const CLOUD_CONFIG_KEY = "quantMemoryBoard.cloud.v1";
const SUPPORTED_LANGUAGES = ["zh", "en"];
const DEFAULT_LANGUAGE = "zh";
const RUNTIME_CONFIG = globalThis.QUANTGYM_CONFIG || {};
const DEFAULT_LLM_ENDPOINT = String(RUNTIME_CONFIG.llmEndpoint || "http://127.0.0.1:8787/interview").trim();
const DEFAULT_LLM_MODEL = String(RUNTIME_CONFIG.llmModel || "gpt-5-nano").trim();
const DEFAULT_GOOGLE_CLIENT_ID = String(RUNTIME_CONFIG.googleClientId || "").trim();
const GOOGLE_LOGIN_FLAG = String(RUNTIME_CONFIG.googleLoginEnabled ?? "").toLowerCase();
const GOOGLE_LOGIN_ENABLED = RUNTIME_CONFIG.googleLoginEnabled === true
  || GOOGLE_LOGIN_FLAG === "true"
  || (Boolean(DEFAULT_GOOGLE_CLIENT_ID) && !["0", "false", "off", "no"].includes(GOOGLE_LOGIN_FLAG));
const LLM_DEFAULTS_VERSION = 2;
const LLM_MODEL_OPTIONS = [
  "gpt-5-nano",
  "gpt-5-mini",
  "gpt-5",
  "gpt-5.4-mini",
  "gpt-5.4",
  "gpt-4o-mini",
  "gpt-4.1-nano"
];
const DEFAULT_CLOUD_API_ENDPOINT = String(RUNTIME_CONFIG.cloudApiEndpoint || "http://127.0.0.1:8790/api").trim();
const CLOUD_SYNC_DEBOUNCE_MS = 700;
const SCORE_XP_PER_POINT = 40;
const NEWS_AUTO_REFRESH_MS = 60 * 60 * 1000;
const NEWS_RETRY_MS = 10 * 60 * 1000;
const NEWS_TOPIC_QUERY_PACKS = {
  all: [
    '"Jane Street" quant trading',
    '"market making" "quant"',
    '"options volatility" trading',
    '"electronic trading" "hedge fund"',
    '"Citadel Securities" market making',
    '"Optiver" "market making"',
    '"IMC Trading" "quant"',
    '"Jane Street" CoreWeave AI'
  ],
  quantFirms: [
    '"Jane Street" trading revenue',
    '"Citadel Securities" market maker',
    '"Optiver" quant trading',
    '"IMC Trading" market making',
    '"Jump Trading" quant',
    '"Hudson River Trading" quant',
    '"Two Sigma" quant trading',
    '"DE Shaw" systematic trading'
  ],
  marketStructure: [
    '"market making" "exchange"',
    '"electronic trading" "liquidity"',
    '"order book" "market structure"',
    '"options volatility" "market makers"',
    '"SEC" "market structure" trading',
    '"CME" "market making"'
  ],
  aiInfra: [
    '"quant trading" "AI infrastructure"',
    '"Jane Street" CoreWeave AI',
    '"hedge fund" GPU AI',
    '"machine learning" "market making"',
    '"low latency" "machine learning" trading'
  ],
  recruiting: [
    '"quant trading" internship',
    '"Jane Street" campus recruiting',
    '"Optiver" graduate trader',
    '"Citadel Securities" internship',
    '"IMC Trading" graduate',
    '"quant researcher" "new grad"'
  ]
};
const NEWS_SOURCE_FILTERS = ["all", "news", "official", "social"];
const JOBS_AUTO_REFRESH_MS = 12 * 60 * 60 * 1000;
const JOBS_RETRY_MS = 20 * 60 * 1000;
const POKER_RANKS = ["2", "3", "4", "5", "6", "7", "8", "9", "T", "J", "Q", "K", "A"];
const POKER_SUITS = [
  { key: "s", symbol: "♠" },
  { key: "h", symbol: "♥" },
  { key: "d", symbol: "♦" },
  { key: "c", symbol: "♣" }
];
const POKER_BLIND_LEVELS = [
  { small: 10, big: 20 },
  { small: 15, big: 30 },
  { small: 25, big: 50 },
  { small: 50, big: 100 },
  { small: 75, big: 150 },
  { small: 100, big: 200 }
];
const POKER_HAND_NAMES = [
  "High card",
  "One pair",
  "Two pair",
  "Three of a kind",
  "Straight",
  "Flush",
  "Full house",
  "Four of a kind",
  "Straight flush"
];
const DEFAULT_GRADUATION_TERM = "2027-09";
const leetcodeHot100 = Array.isArray(globalThis.leetcodeHot100?.problems)
  ? globalThis.leetcodeHot100.problems
  : [];

if ("scrollRestoration" in history) history.scrollRestoration = "manual";
window.addEventListener("load", () => {
  requestAnimationFrame(() => window.scrollTo(0, 0));
  window.setTimeout(() => window.scrollTo(0, 0), 80);
}, { once: true });

const skillDefs = {
  leetcode: {
    name: "LeetCode",
    short: "LC",
    subtitle: "算法与数据结构",
    color: "#4f6274",
    soft: "#f1f4f7",
    keywords: ["leetcode", "lc", "算法", "dp", "动态规划", "graph", "图", "tree", "树", "heap", "堆", "two pointer", "双指针", "binary search", "二分", "sliding window", "滑窗", "区间", "interval"],
    subskills: ["DP", "图", "树", "堆", "双指针", "二分"]
  },
  pandasNumpy: {
    name: "Pandas/NumPy",
    short: "PN",
    subtitle: "数据处理",
    color: "#506f73",
    soft: "#eef4f4",
    keywords: ["pandas", "numpy", "np", "pd", "dataframe", "series", "merge", "groupby", "pivot", "join", "向量化", "矩阵", "数组", "数据清洗"],
    subskills: ["DataFrame", "groupby", "merge", "vectorize", "array", "cleaning"]
  },
  probabilityExpectation: {
    name: "Probability/Expectation",
    short: "PE",
    subtitle: "概率与期望",
    color: "#4d695b",
    soft: "#eff4f1",
    keywords: ["probability", "概率", "bayes", "贝叶斯", "conditional", "条件概率", "expectation", "expected", "期望", "variance", "方差", "distribution", "分布", "markov", "马尔可夫", "martingale", "鞅", "poisson", "泊松"],
    subskills: ["Bayes", "期望", "分布", "方差", "Markov", "组合"]
  },
  statistics: {
    name: "Statistics",
    short: "ST",
    subtitle: "统计推断",
    color: "#806a43",
    soft: "#f5f1e9",
    keywords: ["statistics", "stat", "统计", "hypothesis", "假设检验", "p-value", "置信区间", "confidence interval", "regression", "回归", "estimator", "估计", "mle", "ols", "sampling", "抽样"],
    subskills: ["检验", "回归", "估计", "抽样", "CI", "MLE"]
  },
  machineLearning: {
    name: "Machine Learning",
    short: "ML",
    subtitle: "机器学习",
    color: "#605a78",
    soft: "#f1f0f5",
    keywords: ["machine learning", "ml", "机器学习", "model", "模型", "feature", "特征", "classification", "分类", "regression", "回归", "cross validation", "交叉验证", "xgboost", "random forest", "svm", "overfit", "过拟合"],
    subskills: ["特征", "验证", "分类", "回归", "树模型", "过拟合"]
  },
  deepLearning: {
    name: "Deep Learning",
    short: "DL",
    subtitle: "深度学习",
    color: "#7b5a68",
    soft: "#f5eff2",
    keywords: ["deep learning", "dl", "深度学习", "neural", "神经网络", "transformer", "attention", "cnn", "rnn", "backprop", "反向传播", "gradient", "梯度", "embedding", "loss"],
    subskills: ["NN", "梯度", "CNN", "Transformer", "Embedding", "Loss"]
  },
  market: {
    name: "Market",
    short: "MK",
    subtitle: "市场与交易",
    color: "#66704f",
    soft: "#f1f3ec",
    keywords: ["market", "trading", "交易", "做市", "market making", "bid", "ask", "spread", "价差", "order book", "订单簿", "套利", "risk", "风险", "inventory", "库存"],
    subskills: ["做市", "订单簿", "风险", "价差", "套利", "库存"]
  },
  option: {
    name: "Option",
    short: "OP",
    subtitle: "期权与波动率",
    color: "#8a5650",
    soft: "#f5eeee",
    keywords: ["option", "options", "期权", "greeks", "delta", "gamma", "vega", "theta", "black scholes", "bs", "vol", "volatility", "波动率", "implied volatility", "iv", "hedge", "对冲"],
    subskills: ["Delta", "Gamma", "Vega", "IV", "BS", "对冲"]
  },
  mentalMath: {
    name: "Mental Math",
    short: "MM",
    subtitle: "速算反应",
    color: "#8c6a36",
    soft: "#f7f2e8",
    keywords: ["速算", "mental", "mental math", "口算", "百分比", "percent", "平方", "square", "估算", "approx", "复利", "compound", "乘法", "除法"],
    subskills: ["百分比", "平方", "估算", "复利", "分数", "单位换算"]
  }
};

const prepRoleDefs = {
  quantTrading: {
    label: "Quant Trading",
    focus: ["mentalMath", "probabilityExpectation", "market", "option"],
    technical: "概率、期望、做市与决策速度",
    mockType: "technical"
  },
  quantResearch: {
    label: "Quant Research",
    focus: ["probabilityExpectation", "statistics", "machineLearning", "pandasNumpy"],
    technical: "统计推断、研究设计、Python 与数据分析",
    mockType: "technical"
  },
  quantDeveloper: {
    label: "Quant Developer",
    focus: ["leetcode", "pandasNumpy", "market", "probabilityExpectation"],
    technical: "算法、代码质量、系统思维与市场背景",
    mockType: "oa"
  }
};

const prepSeasonDefs = {
  "2026-summer": { label: "2026 Summer", startDate: "2026-06-01", applicationDate: "2025-07-01" },
  "2027-summer": { label: "2027 Summer", startDate: "2027-06-01", applicationDate: "2026-07-01" },
  "2028-summer": { label: "2028 Summer", startDate: "2028-06-01", applicationDate: "2027-07-01" }
};

const prepProcessStages = [
  {
    key: "application",
    name: "申请与岗位定位",
    detail: "确定 Trading / Research / Developer；准备一页简历、项目叙事和毕业时间匹配。",
    evidence: "简历 + 岗位清单"
  },
  {
    key: "oa",
    name: "OA / Assessment",
    detail: "可能包含速算、概率、逻辑、coding 或数据题；部分岗位没有统一 OA。",
    evidence: "限时正确率"
  },
  {
    key: "hr",
    name: "Recruiter / HR Screen",
    detail: "动机、目标岗位、时间线、地点与沟通表达；准备 Why quant / Why firm。",
    evidence: "60 秒自我介绍"
  },
  {
    key: "technical",
    name: "Technical Interviews",
    detail: "按岗位练概率统计、代码、数据分析、market making 或 options，并练习说出思路。",
    evidence: "口述 mock 反馈"
  },
  {
    key: "behavioral",
    name: "Behavioral / Fit",
    detail: "协作、反馈、失败复盘、压力决策与研究/交易兴趣，用具体经历回答。",
    evidence: "STAR 故事库"
  },
  {
    key: "final",
    name: "Final Day / Superday",
    detail: "连续多轮技术和沟通评估，训练体力、节奏、纠错与主动澄清问题。",
    evidence: "整套模拟"
  },
  {
    key: "offer",
    name: "HR Close / Offer",
    detail: "沟通 offer deadline、团队匹配、地点/签证与下一步，不把 HR 只当作开场轮次。",
    evidence: "决策表"
  }
];

const prepSourceLinks = [
  {
    label: "IMC Recruitment Process",
    note: "Application -> assessment for some roles -> interviews",
    url: "https://www.imc.com/ap/careers/recruitment-process"
  },
  {
    label: "Optiver Sydney Campus FAQ",
    note: "QT / QR 的 assessment、behavioral 与 final/technical 路径",
    url: "https://optiver.com/working-at-optiver/career-hub/sydney-campus-faq/"
  },
  {
    label: "Jane Street Trading Interviews",
    note: "Phone interviews、final stage 与考察能力范围",
    url: "https://www.janestreet.com/trading-interviews/"
  },
  {
    label: "SIG Quantitative Trading Internship",
    note: "Options theory、decision science 与交易训练重点",
    url: "https://careers.sig.com/quantitative-trading-internships-co-ops/jobs/10717?lang=en-us"
  }
];

const prepDiagnosticQuestions = [
  {
    id: "mm-percent",
    skill: "mentalMath",
    prompt: "不使用计算器，250 的 17% 等于多少？",
    options: ["37.5", "40", "42.5", "47.5"],
    answer: "42.5"
  },
  {
    id: "prob-coin",
    skill: "probabilityExpectation",
    prompt: "公平硬币抛 3 次，恰好出现 2 次正面的概率是？",
    options: ["1/8", "1/4", "3/8", "1/2"],
    answer: "3/8"
  },
  {
    id: "prob-die",
    skill: "probabilityExpectation",
    prompt: "公平六面骰子的期望点数是？",
    options: ["3", "3.5", "4", "4.5"],
    answer: "3.5"
  },
  {
    id: "stats-pvalue",
    skill: "statistics",
    prompt: "p-value = 0.03 最准确的含义是？",
    options: [
      "原假设为真的概率是 3%",
      "在原假设下观察到同样或更极端结果的概率为 3%",
      "备择假设为真的概率是 97%",
      "模型准确率是 97%"
    ],
    answer: "在原假设下观察到同样或更极端结果的概率为 3%"
  },
  {
    id: "market-spread",
    skill: "market",
    prompt: "报价 bid 99 / ask 101 时，你以 101 成交意味着你做了什么？",
    options: ["向做市商卖出", "从做市商买入", "同时买卖", "没有成交"],
    answer: "从做市商买入"
  },
  {
    id: "option-call",
    skill: "option",
    prompt: "持有欧式 call 的最大亏损通常受限于什么？",
    options: ["标的价格", "行权价", "已付权利金", "波动率"],
    answer: "已付权利金"
  },
  {
    id: "code-two-sum",
    skill: "leetcode",
    prompt: "在一次遍历中求 Two Sum，常用的核心数据结构是？",
    options: ["Queue", "Hash map", "Linked list", "Heap only"],
    answer: "Hash map"
  },
  {
    id: "research-validation",
    skill: "machineLearning",
    prompt: "时间序列预测里，为避免未来信息泄漏，更合适的验证方式是？",
    options: ["随机打乱 K-fold", "按时间滚动/前向验证", "只看训练集", "重复使用测试集调参"],
    answer: "按时间滚动/前向验证"
  }
];

const locationDefs = {
  china: {
    name: "中国",
    nameEn: "China",
    regions: [
      "北京", "天津", "上海", "重庆", "河北", "山西", "辽宁", "吉林", "黑龙江", "江苏", "浙江", "安徽", "福建", "江西", "山东", "河南", "湖北", "湖南", "广东", "海南", "四川", "贵州", "云南", "陕西", "甘肃", "青海", "台湾", "内蒙古", "广西", "西藏", "宁夏", "新疆", "香港", "澳门"
    ]
  },
  unitedStates: {
    name: "美国",
    nameEn: "United States",
    regions: [
      "Alabama", "Alaska", "Arizona", "Arkansas", "California", "Colorado", "Connecticut", "Delaware", "District of Columbia", "Florida", "Georgia", "Hawaii", "Idaho", "Illinois", "Indiana", "Iowa", "Kansas", "Kentucky", "Louisiana", "Maine", "Maryland", "Massachusetts", "Michigan", "Minnesota", "Mississippi", "Missouri", "Montana", "Nebraska", "Nevada", "New Hampshire", "New Jersey", "New Mexico", "New York", "North Carolina", "North Dakota", "Ohio", "Oklahoma", "Oregon", "Pennsylvania", "Rhode Island", "South Carolina", "South Dakota", "Tennessee", "Texas", "Utah", "Vermont", "Virginia", "Washington", "West Virginia", "Wisconsin", "Wyoming"
    ]
  },
  unitedKingdom: {
    name: "英国",
    nameEn: "United Kingdom",
    regions: ["England", "Scotland", "Wales", "Northern Ireland", "Greater London"]
  },
  singapore: {
    name: "新加坡",
    nameEn: "Singapore",
    regions: ["Central Region", "East Region", "North Region", "North-East Region", "West Region"]
  }
};

const regionEnLabels = {
  北京: "Beijing",
  天津: "Tianjin",
  上海: "Shanghai",
  重庆: "Chongqing",
  河北: "Hebei",
  山西: "Shanxi",
  辽宁: "Liaoning",
  吉林: "Jilin",
  黑龙江: "Heilongjiang",
  江苏: "Jiangsu",
  浙江: "Zhejiang",
  安徽: "Anhui",
  福建: "Fujian",
  江西: "Jiangxi",
  山东: "Shandong",
  河南: "Henan",
  湖北: "Hubei",
  湖南: "Hunan",
  广东: "Guangdong",
  海南: "Hainan",
  四川: "Sichuan",
  贵州: "Guizhou",
  云南: "Yunnan",
  陕西: "Shaanxi",
  甘肃: "Gansu",
  青海: "Qinghai",
  台湾: "Taiwan",
  内蒙古: "Inner Mongolia",
  广西: "Guangxi",
  西藏: "Tibet",
  宁夏: "Ningxia",
  新疆: "Xinjiang",
  香港: "Hong Kong",
  澳门: "Macau"
};

const i18n = {
  zh: {
    appTitle: "QuantGym",
    loading: "Loading",
    navOverview: "总览",
    navGrowth: "成长",
    navTraining: "训练",
    navSocial: "社群",
    navCareer: "求职",
    navResources: "资源",
    authTitle: "登录或注册",
    authSubtitle: "同步你的题库、模拟面试复盘、简历和训练进度。",
    authOr: "或",
    authTabsLabel: "登录或注册",
    login: "登录",
    register: "注册",
    emailAddress: "电子邮件地址",
    password: "密码",
    continueAction: "继续",
    name: "名字",
    registerPasswordPlaceholder: "设置密码，至少 6 位",
    verificationCode: "邮箱验证码",
    sendVerificationCode: "发送验证码",
    sending: "发送中...",
    resendIn: "重新发送",
    createAccount: "创建账户",
    googleClientSummary: "配置 Google Client ID",
    save: "保存",
    googleContinue: "使用 Google 账号继续",
    notEnabled: "暂未启用",
    authReadyFile: "当前是 file:// 打开方式，账户/Google 登录可能被浏览器限制。请用 http://127.0.0.1:5176/index.html 打开。",
    authReadyCloud: "邮箱账户会优先尝试云端同步；注册时先发送邮箱验证码。",
    authReadyLocal: "邮箱登录已可用；注册时先发送验证码。Google 登录入口已预留，暂未启用。",
    authNeedEmail: "先填写有效的邮箱地址。",
    authDuplicateEmail: "这个邮箱已经有账户了，可以直接登录。",
    authVerificationSent: "验证码已发送到 {email}。{delivery}{devCode}",
    authDevCode: " 开发模式验证码：{code}",
    authDeliveryDev: "API 终端已打印验证码。",
    authDeliveryEmail: "请检查邮箱收件箱。",
    authCloudVerificationUnavailable: "云端 API 未连接，暂时无法发送验证码；本机测试可直接创建本地账户。",
    authMissingRegisterFields: "名字、邮箱和至少 6 位密码都要填。",
    authNeedVerificationCode: "请先发送邮箱验证码，并填写收到的 6 位数字。",
    authCreatedSynced: "账户已创建，并已同步到云端。",
    authCloudLocalCreated: "云端暂时连不上；已创建仅本机账户，稍后可从设置里同步。",
    authCloudNoLocal: "云端暂时连不上；这台浏览器里也没有这个本地账户。",
    authCloudLoginFailed: "云端没有找到这个邮箱，或密码不对。",
    authNoLocalAccount: "没有找到这个本地账户。",
    authWrongPassword: "密码不对。",
    authGoogleLoading: "Google 登录组件还在加载，稍后会自动可用。",
    authGoogleLoadFailed: "Google 登录组件没有加载成功，请检查网络或 Client ID。",
    authGoogleEnabled: "Google 登录已启用。云端同步会校验 ID token。",
    authGoogleClientMismatch: "Google token 的 Client ID 不匹配。",
    authGoogleParseFailed: "Google 登录结果无法解析。",
    verificationForbidden: "这个邮箱还不在内测名单里。",
    verificationTooSoon: "验证码刚发过，请稍后再试。",
    verificationTooMany: "验证码尝试次数太多，请稍后重新发送。",
    verificationEmailDown: "邮件服务暂时没有发出验证码，请检查 SMTP 配置后重试。",
    verificationInvalid: "验证码不正确或已过期，请重新发送后再试。",
    verificationFailed: "验证码流程暂时失败，请稍后再试。",
    authStorageFileBlocked: "浏览器限制了本地文件模式下的账户存储。请用 http://127.0.0.1:5176/index.html 打开后再创建账户。",
    authStorageBlocked: "浏览器阻止了本地存储，请检查隐私模式/站点存储权限后重试。",
    authOperationFailed: "账户操作失败，请刷新页面后再试。",
    cloudNoSession: "云端还没有登录会话，请先用邮箱密码登录一次。",
    cloudSyncing: "云端同步中...",
    cloudDisconnected: "云端未连接；本地记录仍可继续使用。",
    cloudFailed: "云端同步失败：{error}",
    cloudSynced: "云端已同步：{date}",
    cloudConnected: "云端已连接。",
    llmSaved: "LLM 连接已保存。",
    regionRankTitle: "地区排名",
    accountSettingsAria: "打开账户设置",
    openSettings: "设置",
    moduleNavLabel: "模块导航",
    commandBarLabel: "全局搜索和状态",
    searchResultsLabel: "搜索结果",
    openChat: "打开聊天",
    openAccount: "打开账号",
    newsTickerLabel: "Quant 新闻滚动条",
    todayTodo: "今日待办",
    startAfterLogin: "登录后开始",
    overview: "总览",
    plan: "计划",
    experiences: "面经",
    community: "论坛",
    messages: "聊天",
    problems: "题目",
    interview: "模拟面试",
    pk: "PK",
    news: "新闻",
    network: "人脉",
    resume: "简历",
    jobs: "求职",
    companies: "公司",
    courses: "课程",
    skills: "能力值",
    tools: "Mental Math",
    memory: "资料笔记",
    settings: "设置",
    rankLabel: "当前段位",
    scoreSuffix: "分 / 100",
    streak: "连续天数",
    records: "记录",
    weeklyXp: "7 日 XP",
    appSearchPlaceholder: "搜索题目、工作、课程、知识点或模块",
    commandStreakLabel: "连续天数",
    commandChatLabel: "聊天",
    heroKicker: "Welcome back, Quant.",
    heroTitle: "Sharpen your quant edge today.",
    designStudyPlan: "进入备战计划",
    planTitle: "今日学习计划",
    planGenerated: "已根据你的薄弱项生成今日计划。",
    todayLog: "今日记录",
    todayLogPlaceholder: "例：今天刷了 3 道 LeetCode；用 pandas 做了 groupby；复盘 Bayes 和 OLS；练了 option Greeks 和速算。",
    minutesPlaceholder: "分钟",
    difficultyNormal: "普通",
    difficultyMedium: "较难",
    difficultyHard: "很难",
    submitLog: "记录",
    leaderboard: "排行榜",
    leaderboardEmpty: "还没有排行榜数据。",
    leaderboardOverall: "总分",
    leaderboardGlobal: "全部",
    leaderboardCountry: "国家",
    leaderboardRegion: "地区",
    accountMessage: "管理昵称、邮箱、头像和地区。",
    nickname: "昵称",
    email: "邮箱",
    country: "国家",
    region: "地区",
    currentPassword: "当前密码",
    saveAccount: "保存账户",
    accountUpdated: "账户已更新。",
    language: "语言",
    preferences: "偏好",
    data: "数据",
    saveSettings: "保存设置",
    settingsSaved: "设置已保存。",
    defaultCountry: "默认国家",
    defaultRegion: "默认地区",
    exportBackup: "导出备份",
    importBackup: "导入备份",
    resetMemory: "清空训练记录",
    syncCloud: "同步云端",
    logout: "退出登录",
    communitySummary: "像朋友圈一样分享训练动态，也可以点赞评论。",
    messagesSummary: "和论坛里的同学、校友或 recruiter 继续私聊。",
    messageEmpty: "还没有聊天。可以从论坛动态里点“私信”。",
    messageComposerPlaceholder: "写一条消息",
    messageSend: "发送",
    messageDirect: "私信",
    overviewCommunitySummary: "分享进度、照片、视频和面试灵感。",
    communityPostSingular: "条动态",
    communityPostPlural: "条动态",
    communityPlaceholder: "发一条动态：照片、视频、刷题进度、面试复盘都可以。",
    overviewCommunityPlaceholder: "发一条动态：今天练了什么、遇到什么题、想问什么？",
    addMedia: "添加照片/视频",
    post: "发布",
    openCommunity: "打开社区",
    communityEmpty: "还没有动态。",
    networkModule: "人脉",
    networkSummary: "记录联系人、公司和下一步跟进。",
    networkActiveFollowups: "活跃跟进",
    networkEmpty: "还没有联系人。先添加一个内推人、校友或 recruiter。",
    networkSave: "保存联系人",
    networkCompanyFallback: "未填写公司",
    networkNotesEmpty: "暂无备注。",
    networkAdd: "添加联系人",
    like: "赞",
    unlike: "已赞",
    comment: "评论",
    deletePost: "删除动态",
    commentPlaceholder: "写评论",
    mediaTooLarge: "照片/视频太大，请选择 5MB 以下的文件。",
    writeSomething: "先写一点内容或添加照片/视频。",
    accountInfo: "账户信息",
    accountBadge: "账号",
    graduationTerm: "毕业时间",
    resumeUpload: "简历",
    resumeUploadHint: "上传 txt/md 简历可直接分析；PDF 会先保存文件名。",
    resumeModule: "简历模块",
    resumeSummary: "上传或粘贴简历，获取针对 quant internship / full-time 的修改建议。",
    resumeContent: "简历内容",
    resumePlaceholder: "粘贴简历文本，或先在账户里上传 txt/md 简历。",
    reviewResume: "LLM 修改简历",
    saveResume: "保存简历",
    resumeSaved: "简历已保存。",
    resumeReviewTitle: "修改要点",
    resumeNoContent: "先上传或粘贴简历内容。",
    jobsModule: "求职",
    jobsSummary: "追踪 quant internship / full-time 岗位，点击链接跳转申请。",
    companiesSummary: "按公司了解面试风格、tier、重点 topic 和对应题库。",
    allCompanies: "全部公司",
    companyPractice: "刷该公司题",
    companyCareers: "打开官网",
    companyQuestions: "题",
    companyProgress: "完成进度",
    allJobs: "全部",
    internship: "Internship",
    fulltime: "Full-time",
    applyNow: "打开申请",
    refreshJobs: "刷新岗位",
    coursesModule: "课程",
    coursesSummary: "精选 YouTube / Bilibili 官方播放器资源，支持备用来源、收藏、笔记和学习路径。",
    openCourse: "打开课程",
    openOriginal: "打开原站",
    officialPlayer: "官方播放器",
    previewUnavailable: "该来源暂不支持站内预览，或可能受地区/权限限制。请切换备用来源或打开原站。",
    saveCourse: "收藏",
    savedCourse: "已收藏",
    addToPath: "加入路径",
    inLearningPath: "路径中",
    markCourseDone: "标记完成",
    courseDone: "已完成",
    courseNote: "学习笔记",
    courseNotePlaceholder: "记录这节课对应的题目、公式或易错点",
    learningPathTitle: "学习路径",
    learningPathHint: "把课程加入路径后，会在这里形成你的资源学习顺序。",
    learningPathEmpty: "还没有学习路径。先把一个课程加入路径。",
    resourceSourcesPlaceholder: "可选：每行一个 YouTube / Bilibili / 原站 URL，作为备用来源",
    newsModuleTitle: "Quant 新闻",
    newsDefaultSubtitle: "Jane Street、做市、AI 算力与市场结构",
    newsIntelTitle: "信息雷达",
    newsIntelSummary: "新闻/RSS 自动同步，LinkedIn 和小红书作为人工线索入口。",
    newsIntelAria: "新闻情报控制台",
    newsTopicFilterAria: "新闻主题筛选",
    newsSourceFilterAria: "新闻来源筛选",
    newsSocialHint: "LinkedIn / 小红书目前支持粘贴公开链接、摘要和启发；不做自动爬取，点击来源回原站核验。",
    newsTopicAll: "全部",
    newsTopicQuantFirms: "公司",
    newsTopicMarketStructure: "市场结构",
    newsTopicAiInfra: "AI/算力",
    newsTopicRecruiting: "求职/社群",
    newsSourceAll: "全部来源",
    newsSourceNews: "新闻/RSS",
    newsSourceOfficial: "官方",
    newsSourceSocial: "社交线索",
    newsSourceManual: "手动",
    newsSourceLinkedIn: "LinkedIn",
    newsSourceXiaohongshu: "小红书",
    newsVerified: "可核验来源",
    newsNeedsVerify: "待核验线索",
    newsSavedCount: "收录",
    newsAutoCount: "新闻/RSS",
    newsOfficialCount: "官方",
    newsSocialCount: "社交线索",
    newsReadCount: "已读",
    newsRefreshSyncing: "新闻 API 同步中...",
    newsApiUnavailable: "API 暂不可用",
    newsNoItems: "还没有新闻。",
    newsNoFilterItems: "当前筛选没有内容，试试刷新或切换主题。",
    newsImpact: "面试启发",
    newsFallbackInsight: "把这条新闻转成一个市场、概率或系统设计追问。",
    newsSourceLabel: "来源",
    newsOpenOriginal: "打开原站",
    newsAdd: "添加新闻",
    newsSave: "保存新闻",
    refreshNews: "刷新新闻",
    newsTitlePlaceholder: "新闻标题或社交线索标题",
    newsSourcePlaceholder: "来源，例如 Reuters / Bloomberg / LinkedIn / 小红书",
    newsUrlPlaceholder: "来源链接",
    newsTagsPlaceholder: "tags: Jane Street, market making, AI",
    newsSummaryPlaceholder: "摘要：发生了什么？",
    newsInsightPlaceholder: "面试启发：这和 quant 面试有什么关系？",
    searchEmpty: "没有找到匹配内容。",
    searchOpen: "打开",
    checkInDone: "已打卡",
    todayGuide: "今日向导",
    tasksWaiting: "3 个任务待完成",
    todoButton: "今日待办",
    todoEyebrow: "TODAY",
    todoTitle: "To-do list",
    todoSummaryEmpty: "生成今日计划后，这里会同步更新。",
    todoEmpty: "还没有任务。先生成今日计划，或直接添加一个待办。",
    todoAddPlaceholder: "添加一个任务",
    todoAdd: "添加",
    todoDone: "标为未完成",
    todoUndone: "标为完成",
    problemDifficultyAll: "全部难度",
    provider: "登录方式",
    createdAt: "账户创建",
    currentRank: "当前排名"
    ,
    problemEyebrow: "题库",
    problemTitle: "题目",
    problemSubtitle: "系统练习概率、期望、博弈和 quant 面试基础题。",
    problemSearchPlaceholder: "搜索题目",
    addProblem: "添加题目",
    leetcodeHotTitle: "LeetCode Hot 100",
    leetcodeHotSummary: "从官方 Top 100 Liked 学习计划生成，跳转原题并记录完成状态。",
    leetcodeHotOpen: "打开 LeetCode",
    leetcodeHotManage: "查看题单",
    leetcodeHotCollapse: "收起题单",
    leetcodeHotProgressLabel: "完成进度",
    leetcodeHotDone: "已完成",
    leetcodeHotMarkDone: "标记完成",
    leetcodeHotUndo: "取消完成",
    viewFullProblem: "查看完整题目",
    openProblem: "查看题目",
    problemEmpty: "题目库里还没有匹配项。",
    lastScore: "上次",
    untranslatedProblemFallback: "原题暂未提供英文翻译，点进详情查看中文原文。",
    backToProblems: "返回题库",
    useForMock: "用这题模拟",
    problemQuestion: "题目",
    problemAnswer: "答案",
    problemExplanation: "解析",
    noPrompt: "暂无题干。",
    noAnswer: "暂无单独答案，请参考解析。",
    noExplanation: "暂无解析。",
    allProblems: "全部",
    savedProblems: "我的收藏",
    popularProblems: "热门排行",
    saveForReview: "收藏到复习本",
    savedForReview: "已收藏",
    removeSaved: "移出收藏",
    problemLikes: "点赞",
    problemComments: "评论",
    problemDiscussion: "讨论与收藏",
    problemDiscussionHint: "收藏只对自己可见，任意题目都可以加入复习本。",
    problemCommentPlaceholder: "写下解法思路、易错点或一道补充问题",
    problemCommentPost: "发表评论",
    problemCommentEmpty: "还没有讨论，欢迎留下第一条解题观察。",
    problemSocialCloudRequired: "连接云端账号后可参与点赞和评论。",
    problemCommentRequired: "请先写下评论内容。",
    problemSocialError: "互动保存失败，请稍后再试。",
    problemRankingTitle: "题目排行榜",
    problemRankingHint: "按点赞与讨论热度排序，找到值得优先复习的题目。",
    popularity: "热度",
    settingsMessageDefault: "应用偏好和数据管理。",
    sidebarShow: "显示模块列表",
    sidebarHide: "隐藏模块列表",
    skillPageSubtitle: "把训练记录、题目表现和面试反馈汇总成 quant readiness score。",
    quantScore: "Quant Score",
    skillScoreCopy: "分数来自九个能力维度。继续刷题、模拟面试和记录训练，能力值会自动更新。",
    practiceRecords: "训练记录",
    averageScore: "平均得分",
    weakestSkill: "优先补强",
    skillRadarTitle: "能力雷达",
    skillRadarHint: "悬停到能力点或右侧分数，查看做题情况和平均得分。",
    practicedProblems: "练过题目",
    practiceCount: "练习次数",
    skillXp: "累计 XP",
    noPracticeYet: "暂无记录",
    latestPractice: "最近训练"
  },
  en: {
    appTitle: "QuantGym",
    loading: "Loading",
    navOverview: "Overview",
    navGrowth: "Growth",
    navTraining: "Training",
    navSocial: "Community",
    navCareer: "Careers",
    navResources: "Resources",
    authTitle: "Log in or sign up",
    authSubtitle: "Sync your problem bank, mock interview reviews, resume, and training progress.",
    authOr: "or",
    authTabsLabel: "Log in or sign up",
    login: "Log in",
    register: "Sign up",
    emailAddress: "Email address",
    password: "Password",
    continueAction: "Continue",
    name: "Name",
    registerPasswordPlaceholder: "Set a password, at least 6 characters",
    verificationCode: "Email code",
    sendVerificationCode: "Send code",
    sending: "Sending...",
    resendIn: "Resend",
    createAccount: "Create account",
    googleClientSummary: "Configure Google Client ID",
    save: "Save",
    googleContinue: "Continue with Google",
    notEnabled: "Not enabled",
    authReadyFile: "You are using file://. Account and Google login may be blocked by the browser. Open http://127.0.0.1:5176/index.html instead.",
    authReadyCloud: "Email accounts will try cloud sync first. Registration starts with an email verification code.",
    authReadyLocal: "Email login is available. Registration starts with a verification code. Google login is reserved but not enabled.",
    authNeedEmail: "Enter a valid email address first.",
    authDuplicateEmail: "An account already exists for this email. You can log in directly.",
    authVerificationSent: "Code sent to {email}. {delivery}{devCode}",
    authDevCode: " Dev code: {code}",
    authDeliveryDev: "The API terminal printed the code.",
    authDeliveryEmail: "Please check your inbox.",
    authCloudVerificationUnavailable: "The cloud API is not connected, so the code cannot be sent right now. Local testing can create a local account directly.",
    authMissingRegisterFields: "Name, email, and a password with at least 6 characters are required.",
    authNeedVerificationCode: "Send the email code first, then enter the 6-digit code you received.",
    authCreatedSynced: "Account created and synced to the cloud.",
    authCloudLocalCreated: "Cloud is temporarily unreachable. A local account was created and can sync from Settings later.",
    authCloudNoLocal: "Cloud is temporarily unreachable, and this browser does not have that local account.",
    authCloudLoginFailed: "Cloud could not find this email, or the password is wrong.",
    authNoLocalAccount: "No local account found.",
    authWrongPassword: "Wrong password.",
    authGoogleLoading: "Google login is still loading and will become available shortly.",
    authGoogleLoadFailed: "Google login did not load. Check the network or Client ID.",
    authGoogleEnabled: "Google login is enabled. Cloud sync will verify the ID token.",
    authGoogleClientMismatch: "The Google token Client ID does not match.",
    authGoogleParseFailed: "Could not parse the Google login result.",
    verificationForbidden: "This email is not on the beta allowlist yet.",
    verificationTooSoon: "A code was sent recently. Please try again later.",
    verificationTooMany: "Too many verification attempts. Please try again later.",
    verificationEmailDown: "The email service did not send the code. Check SMTP configuration and retry.",
    verificationInvalid: "The code is incorrect or expired. Send a new code and try again.",
    verificationFailed: "Verification failed for now. Please try again later.",
    authStorageFileBlocked: "The browser blocked account storage in local file mode. Open http://127.0.0.1:5176/index.html and create the account there.",
    authStorageBlocked: "The browser blocked local storage. Check private browsing or site storage permissions and retry.",
    authOperationFailed: "Account operation failed. Refresh the page and try again.",
    cloudNoSession: "No cloud session yet. Log in once with email and password first.",
    cloudSyncing: "Syncing cloud...",
    cloudDisconnected: "Cloud is not connected. Local records still work.",
    cloudFailed: "Cloud sync failed: {error}",
    cloudSynced: "Cloud synced: {date}",
    cloudConnected: "Cloud connected.",
    llmSaved: "LLM connection saved.",
    regionRankTitle: "Regional rank",
    accountSettingsAria: "Open account settings",
    openSettings: "Settings",
    moduleNavLabel: "Module navigation",
    commandBarLabel: "Global search and status",
    searchResultsLabel: "Search results",
    openChat: "Open messages",
    openAccount: "Open account",
    newsTickerLabel: "Quant news ticker",
    todayTodo: "Today's tasks",
    startAfterLogin: "Start after login",
    overview: "Overview",
    plan: "Plan",
    experiences: "Interview Log",
    community: "Forum",
    messages: "Messages",
    problems: "Problems",
    interview: "Interview",
    pk: "PK",
    news: "News",
    network: "Network",
    resume: "Resume",
    jobs: "Jobs",
    companies: "Companies",
    courses: "Courses",
    skills: "Ability Score",
    tools: "Mental Math",
    memory: "Memory",
    settings: "Settings",
    rankLabel: "Current Rank",
    scoreSuffix: "pts / 100",
    streak: "Streak",
    records: "Records",
    weeklyXp: "7-Day XP",
    appSearchPlaceholder: "Search problems, jobs, courses, skills, or modules",
    commandStreakLabel: "day streak",
    commandChatLabel: "Chat",
    heroKicker: "Welcome back, quant.",
    heroTitle: "Sharpen your quant edge today.",
    designStudyPlan: "Open prep plan",
    planTitle: "Today's Study Plan",
    planGenerated: "Built from your weakest areas.",
    todayLog: "Today Log",
    todayLogPlaceholder: "Example: solved 3 LeetCode problems; practiced pandas groupby; reviewed Bayes, OLS, option Greeks, and mental math.",
    minutesPlaceholder: "minutes",
    difficultyNormal: "Normal",
    difficultyMedium: "Harder",
    difficultyHard: "Very hard",
    submitLog: "Log",
    leaderboard: "Leaderboard",
    leaderboardEmpty: "No leaderboard data yet.",
    leaderboardOverall: "Overall",
    leaderboardGlobal: "All",
    leaderboardCountry: "Country",
    leaderboardRegion: "Region",
    accountMessage: "Manage nickname, email, avatar, country, and region.",
    nickname: "Nickname",
    email: "Email",
    country: "Country",
    region: "Region",
    currentPassword: "Current password",
    saveAccount: "Save Account",
    accountUpdated: "Account updated.",
    language: "Language",
    preferences: "Preferences",
    data: "Data",
    saveSettings: "Save Settings",
    settingsSaved: "Settings saved.",
    defaultCountry: "Default country",
    defaultRegion: "Default region",
    exportBackup: "Export Backup",
    importBackup: "Import Backup",
    resetMemory: "Clear Training Data",
    syncCloud: "Sync Cloud",
    logout: "Log Out",
    communitySummary: "Share training updates, photos, videos, likes, and comments.",
    messagesSummary: "Continue private conversations with people from the forum.",
    messageEmpty: "No messages yet. Open a forum post and start a direct message.",
    messageComposerPlaceholder: "Write a message",
    messageSend: "Send",
    messageDirect: "Message",
    overviewCommunitySummary: "Share progress, media, and interview sparks.",
    communityPostSingular: "post",
    communityPostPlural: "posts",
    communityPlaceholder: "Post an update: photos, videos, practice progress, interview notes.",
    overviewCommunityPlaceholder: "Post an update: what did you train, solve, or wonder about today?",
    addMedia: "Add Photo/Video",
    post: "Post",
    openCommunity: "Open Community",
    communityEmpty: "No posts yet.",
    networkModule: "Network",
    networkSummary: "Track contacts, companies, and next follow-ups.",
    networkActiveFollowups: "active follow-ups",
    networkEmpty: "No contacts yet.",
    networkSave: "Save contact",
    networkCompanyFallback: "No company yet",
    networkNotesEmpty: "No notes yet.",
    networkAdd: "Add contact",
    like: "Like",
    unlike: "Liked",
    comment: "Comment",
    deletePost: "Delete Post",
    commentPlaceholder: "Write a comment",
    mediaTooLarge: "Photo/video is too large. Please choose a file under 5MB.",
    writeSomething: "Write something or add a photo/video first.",
    accountInfo: "Account Info",
    accountBadge: "Account",
    graduationTerm: "Graduation term",
    resumeUpload: "Resume",
    resumeUploadHint: "Upload txt/md for direct analysis. PDFs are saved by filename first.",
    resumeModule: "Resume Module",
    resumeSummary: "Upload or paste your resume and get quant internship / full-time edits.",
    resumeContent: "Resume content",
    resumePlaceholder: "Paste resume text, or upload txt/md from Account first.",
    reviewResume: "Review with LLM",
    saveResume: "Save resume",
    resumeSaved: "Resume saved.",
    resumeReviewTitle: "Revision points",
    resumeNoContent: "Upload or paste resume content first.",
    jobsModule: "Jobs",
    jobsSummary: "Track quant internship / full-time roles and open application links.",
    companiesSummary: "Understand interview style, tier, core topics, and matching problems by firm.",
    allCompanies: "All companies",
    companyPractice: "Practice questions",
    companyCareers: "Open careers",
    companyQuestions: "questions",
    companyProgress: "Progress",
    allJobs: "All",
    internship: "Internship",
    fulltime: "Full-time",
    applyNow: "Open application",
    refreshJobs: "Refresh jobs",
    coursesModule: "Courses",
    coursesSummary: "Curated YouTube / Bilibili resources with official embeds, fallback sources, saves, notes, and a learning path.",
    openCourse: "Open course",
    openOriginal: "Open original",
    officialPlayer: "Official player",
    previewUnavailable: "This source cannot be previewed here, or may be blocked by region or permissions. Switch source or open the original site.",
    saveCourse: "Save",
    savedCourse: "Saved",
    addToPath: "Add to path",
    inLearningPath: "In path",
    markCourseDone: "Mark done",
    courseDone: "Done",
    courseNote: "Notes",
    courseNotePlaceholder: "Capture related problems, formulas, or pitfalls",
    learningPathTitle: "Learning Path",
    learningPathHint: "Courses added to your path become your ordered resource queue.",
    learningPathEmpty: "No learning path yet. Add a course to your path first.",
    resourceSourcesPlaceholder: "Optional: one YouTube / Bilibili / original URL per line as fallback sources",
    newsModuleTitle: "Quant News",
    newsDefaultSubtitle: "Jane Street, market making, AI compute, and market structure",
    newsIntelTitle: "Intelligence Radar",
    newsIntelSummary: "News/RSS sync automatically; LinkedIn and Xiaohongshu are manual signal sources.",
    newsIntelAria: "News intelligence dashboard",
    newsTopicFilterAria: "News topic filter",
    newsSourceFilterAria: "News source filter",
    newsSocialHint: "LinkedIn / Xiaohongshu support public-link notes, summaries, and takeaways. No automated scraping; open the source to verify.",
    newsTopicAll: "All",
    newsTopicQuantFirms: "Firms",
    newsTopicMarketStructure: "Market Structure",
    newsTopicAiInfra: "AI/Compute",
    newsTopicRecruiting: "Careers/Social",
    newsSourceAll: "All sources",
    newsSourceNews: "News/RSS",
    newsSourceOfficial: "Official",
    newsSourceSocial: "Social Signals",
    newsSourceManual: "Manual",
    newsSourceLinkedIn: "LinkedIn",
    newsSourceXiaohongshu: "Xiaohongshu",
    newsVerified: "Verifiable source",
    newsNeedsVerify: "Signal to verify",
    newsSavedCount: "Saved",
    newsAutoCount: "News/RSS",
    newsOfficialCount: "Official",
    newsSocialCount: "Social signals",
    newsReadCount: "Read",
    newsRefreshSyncing: "Syncing news API...",
    newsApiUnavailable: "API unavailable",
    newsNoItems: "No news yet.",
    newsNoFilterItems: "No items match this filter. Refresh or switch topics.",
    newsImpact: "Interview angle",
    newsFallbackInsight: "Turn this story into a market, probability, or system-design follow-up.",
    newsSourceLabel: "Source",
    newsOpenOriginal: "Open original",
    newsAdd: "Add news",
    newsSave: "Save news",
    refreshNews: "Refresh news",
    newsTitlePlaceholder: "News or social-signal title",
    newsSourcePlaceholder: "Source, e.g. Reuters / Bloomberg / LinkedIn / Xiaohongshu",
    newsUrlPlaceholder: "Source link",
    newsTagsPlaceholder: "tags: Jane Street, market making, AI",
    newsSummaryPlaceholder: "Summary: what happened?",
    newsInsightPlaceholder: "Interview angle: why does this matter for quant interviews?",
    searchEmpty: "No matching results.",
    searchOpen: "Open",
    checkInDone: "Checked in",
    todayGuide: "Today's guide",
    tasksWaiting: "3 tasks waiting",
    todoButton: "Tasks",
    todoEyebrow: "TODAY",
    todoTitle: "To-do list",
    todoSummaryEmpty: "Generate today's plan and it will sync here.",
    todoEmpty: "No tasks yet. Generate today's plan or add one directly.",
    todoAddPlaceholder: "Add a task",
    todoAdd: "Add",
    todoDone: "Mark not done",
    todoUndone: "Mark done",
    problemDifficultyAll: "All difficulty",
    provider: "Provider",
    createdAt: "Created",
    currentRank: "Current Rank",
    problemEyebrow: "Question Bank",
    problemTitle: "Problems",
    problemSubtitle: "Practice probability, expectation, games, and quant interview fundamentals.",
    problemSearchPlaceholder: "Search problems",
    addProblem: "Add Problem",
    leetcodeHotTitle: "LeetCode Hot 100",
    leetcodeHotSummary: "Generated from the official Top 100 Liked study plan. Open the original problem and track completion here.",
    leetcodeHotOpen: "Open LeetCode",
    leetcodeHotManage: "View list",
    leetcodeHotCollapse: "Collapse list",
    leetcodeHotProgressLabel: "Progress",
    leetcodeHotDone: "Done",
    leetcodeHotMarkDone: "Mark done",
    leetcodeHotUndo: "Mark not done",
    viewFullProblem: "View full problem",
    openProblem: "Open problem",
    problemEmpty: "No matching problems yet.",
    lastScore: "Last",
    untranslatedProblemFallback: "Original Chinese statement. Open the full problem to view it.",
    backToProblems: "Back to problems",
    useForMock: "Mock with this problem",
    problemQuestion: "Question",
    problemAnswer: "Answer",
    problemExplanation: "Explanation",
    noPrompt: "No prompt yet.",
    noAnswer: "No standalone answer yet. See the explanation.",
    noExplanation: "No explanation yet.",
    allProblems: "All",
    savedProblems: "Saved",
    popularProblems: "Popular",
    saveForReview: "Save for review",
    savedForReview: "Saved",
    removeSaved: "Remove saved",
    problemLikes: "Likes",
    problemComments: "Comments",
    problemDiscussion: "Discussion and review",
    problemDiscussionHint: "Your saved list is private. Any problem can be added for review.",
    problemCommentPlaceholder: "Share a solution idea, a pitfall, or a follow-up question",
    problemCommentPost: "Post comment",
    problemCommentEmpty: "No discussion yet. Start with one useful observation.",
    problemSocialCloudRequired: "Connect a cloud account to like or comment.",
    problemCommentRequired: "Write a comment first.",
    problemSocialError: "Could not save this interaction. Try again.",
    problemRankingTitle: "Problem leaderboard",
    problemRankingHint: "Ranked by likes and discussion activity.",
    popularity: "Heat",
    settingsMessageDefault: "App preferences and data management.",
    sidebarShow: "Show module list",
    sidebarHide: "Hide module list",
    skillPageSubtitle: "A quant readiness score built from training logs, problem performance, and interview feedback.",
    quantScore: "Quant Score",
    skillScoreCopy: "Your score combines nine ability dimensions. Practice, mock interviews, and daily logs update it automatically.",
    practiceRecords: "Practice records",
    averageScore: "Average score",
    weakestSkill: "Priority gap",
    skillRadarTitle: "Ability Radar",
    skillRadarHint: "Hover an ability point or score to see practice volume and average score.",
    practicedProblems: "Problems practiced",
    practiceCount: "Practice count",
    skillXp: "Total XP",
    noPracticeYet: "No records yet",
    latestPractice: "Latest practice"
  }
};

const sampleEntries = [
  "今天刷了 3 道 LeetCode，两道 DP，一道二分；概率复盘了 Bayes 和条件期望；速算 15 分钟。",
  "用 pandas 做了 groupby 和 merge 练习；复盘了 OLS 和 p-value；整理了一个 ML 验证方案。",
  "看了一道 market making 的 bid ask 题；复盘 delta/gamma 和 implied volatility；速算练了百分比变化 20 题。"
];

const problemTagLabels = {
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

const exerciseTitleOverrides = {
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

const seedProblems = [
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

const catalogProblems = Array.isArray(globalThis.quantProblemCatalog)
  ? globalThis.quantProblemCatalog
  : [];
const disabledProblemSources = new Set(["question-bank"]);
const disabledProblemBookNames = new Set(["Archived Question Bank"]);

const seedNews = [
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

const seedJobs = [
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

const quantCompanyDefs = [
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

const seedCourses = [
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

let appPrefs = loadAppPrefs();
let community = loadCommunity();
let auth = loadAuth();
let currentUser = getCurrentUser();
let state = loadState();
let cloudConfig = loadCloudConfig();
let cloudSyncTimer = null;
let cloudSyncInFlight = false;
let cloudDirty = { state: false, community: false, account: false };
let currentDrill = null;
let drillMode = "numberLogic";
let drillSession = null;
let drillTimerId = null;
let currentMarketGame = null;
let currentPokerGame = null;
let selectedMessageThreadId = "";
let googleInitRetries = 0;
let registerCodeTimer = null;
let interviewLanguage = "zh";
let interviewMessages = [];
let selectedInterviewProblemId = "";
let selectedProblemDetailId = "";
let selectedInterviewCategories = new Set(["all"]);
let interviewSession = null;
let interviewPreparing = false;
let interviewPrepTimer = null;
let interviewQuestionTimer = null;
let interviewVoiceRecognition = null;
let interviewTypingTimers = new Map();
let interviewPanelExpandedIndex = 0;
let mathTypesetTimer = null;
let llmConfig = loadLlmConfig();
let latestClassification = null;
let classifyTimer = null;
let pkSession = null;
let newsRefreshInFlight = false;
let jobsRefreshInFlight = false;
let activeNewsDetailId = "";
let newsTopicFilter = "all";
let newsSourceFilter = "all";
let globalSearchMatches = [];
let problemCatalogRefresh = null;
let radarHitAreas = [];
let radarHoverKey = "";
let radarAnimatedValues = null;
let radarTargetValues = null;
let radarAnimationFrame = 0;
let prepPlanEditorOpen = false;
let pendingExperienceShareId = "";
let communityFilter = "all";
let problemSocial = new Map();
let problemViewMode = "all";
let problemThemeFilter = "all";
let problemDifficultyFilter = "all";
let problemCompanyFilter = "all";
let companyTierFilter = "all";
let problemSocialNotice = "";
let leetcodeHotExpanded = false;
let todoDockOpen = false;
let heroTypewriterTimer = null;
const PROBLEM_PAGE_SIZE = 24;
let problemVisibleCount = PROBLEM_PAGE_SIZE;

const els = {};

document.addEventListener("DOMContentLoaded", () => {
  window.scrollTo(0, 0);
  bindElements();
  bindEvents();
  setupButtonRipples();
  renderSession();
  initGoogleLogin();
  if (currentUser) renderMentalMath();
  window.setInterval(maybeAutoRefreshNews, NEWS_AUTO_REFRESH_MS);
  window.setInterval(maybeAutoRefreshJobs, JOBS_AUTO_REFRESH_MS);
  refreshIcons();
});

function bindElements() {
  [
    "todayLine",
    "regionRank",
    "regionMedal",
    "regionRankText",
    "authShell",
    "appShell",
    "moduleNav",
    "sidebarToggleBtn",
    "loginForm",
    "loginEmail",
    "loginPassword",
    "registerForm",
    "registerName",
    "registerEmail",
    "registerPassword",
    "registerVerificationCode",
    "sendRegisterCodeBtn",
    "googleButton",
    "googleClientIdInput",
    "saveGoogleClientBtn",
    "authMessage",
    "userChip",
    "userAvatar",
    "userName",
    "userProvider",
    "commandUserAvatar",
    "commandUserName",
    "commandUserProvider",
    "commandChatBtn",
    "commandUnreadCount",
    "languageSelect",
    "settingsBtn",
    "logoutBtn",
    "accountForm",
    "accountAvatarPreview",
    "accountAvatarUrl",
    "accountAvatarFile",
    "accountClearAvatarBtn",
    "accountNameInput",
    "accountEmailInput",
    "accountCountrySelect",
    "accountRegionSelect",
    "accountGraduationTermInput",
    "accountResumeFile",
    "accountResumeMeta",
    "accountCurrentPassword",
    "accountMessage",
    "accountProviderText",
    "accountCreatedText",
    "accountRankText",
    "rankName",
    "totalXp",
    "commandStreakCount",
    "checkInPill",
    "heroTypewriter",
    "generateStudyPlanBtn",
    "todayPlanCard",
    "overviewProblemProgress",
    "overviewXpBars",
    "overviewContributionHeatmap",
    "editPrepPlanBtn",
    "prepPlanSetupForm",
    "prepRoleSelect",
    "prepHoursSelect",
    "prepPlanDashboard",
    "newExperienceBtn",
    "experienceForm",
    "experienceFormTitle",
    "experienceId",
    "experienceFirm",
    "experienceRole",
    "experienceStage",
    "experienceSeason",
    "experienceDate",
    "experienceOutcome",
    "experienceTags",
    "experienceSummaryInput",
    "experienceTopics",
    "experienceReflection",
    "cancelExperienceEditBtn",
    "experienceCount",
    "sharedExperienceCount",
    "openCommunityExperiencesBtn",
    "experienceFilter",
    "experienceList",
    "streakCount",
    "entryCount",
    "weeklyXp",
    "overviewCommunityExpandBtn",
    "overviewCommunityForm",
    "overviewCommunityText",
    "overviewCommunityMedia",
    "overviewCommunityMediaPreview",
    "overviewCommunityList",
    "overviewCommunitySummary",
    "communityForm",
    "communityText",
    "communityMedia",
    "communityMediaPreview",
    "communityList",
    "communitySummary",
    "messagesPageTitle",
    "messagesSummary",
    "messageThreadList",
    "messageConversationHeader",
    "messageConversationBody",
    "messageComposerForm",
    "messageComposerInput",
    "logForm",
    "logText",
    "durationInput",
    "difficultyInput",
    "analysisPreview",
    "autoClassifyChips",
    "problemSearch",
    "addProblemBtn",
    "problemForm",
    "problemTitleEn",
    "problemTitleZh",
    "problemCategory",
    "problemDifficulty",
    "problemTags",
    "problemSourceUrl",
    "problemPromptEn",
    "problemPromptZh",
    "problemAnswer",
    "problemExplanation",
    "problemImportForm",
    "problemJsonInput",
    "problemInteractionStatus",
    "problemCompletionProgress",
    "problemThemeFilter",
    "problemThemeSummary",
    "problemDifficultyFilter",
    "problemCompanyPanel",
    "problemCompanyTitle",
    "problemCompanySummary",
    "problemCompanyClearBtn",
    "problemCompanyList",
    "problemRanking",
    "problemRankingList",
    "leetcodeHotTitle",
    "leetcodeHotSummary",
    "leetcodeHotProgressLabel",
    "leetcodeHotProgressText",
    "leetcodeHotProgressFill",
    "leetcodeHotToggleBtn",
    "leetcodeHotPlanLink",
    "leetcodeHotList",
    "problemList",
    "loadMoreProblemsBtn",
    "problemDetail",
    "todoDockButton",
    "todoDockButtonLabel",
    "todoDockCount",
    "todoDockPanel",
    "todoDockCloseBtn",
    "todoDockEyebrow",
    "todoDockTitle",
    "todoDockSummary",
    "todoDockList",
    "todoDockEmpty",
    "todoDockAddForm",
    "todoDockAddInput",
    "interviewSummary",
    "interviewTypeSelect",
    "interviewQuestionCount",
    "interviewQuestionTime",
    "interviewAnswerModeSelect",
    "interviewSourceSelect",
    "interviewPdfRow",
    "interviewPdfInput",
    "interviewPdfMeta",
    "interviewCategoryRow",
    "interviewCategoryPicker",
    "interviewGrid",
    "interviewSetup",
    "interviewConsole",
    "llmEndpointInput",
    "llmModelInput",
    "startInterviewBtn",
    "saveLlmConfigBtn",
    "interviewSessionTitle",
    "interviewQuestionStatus",
    "interviewTimer",
    "interviewTranscript",
    "interviewQuestionPanel",
    "interviewForm",
    "interviewAnswer",
    "interviewAnswerFileRow",
    "interviewAnswerFile",
    "interviewAnswerFileMeta",
    "interviewAttachmentPreview",
    "hintInterviewBtn",
    "revealAnswerBtn",
    "interviewCompleteActions",
    "nextInterviewQuestionBtn",
    "saveInterviewFavoriteBtn",
    "shareInterviewQuestionBtn",
    "interviewFavoritesSummary",
    "interviewFavoritesList",
    "voiceAnswerBtn",
    "clearInterviewBtn",
    "startPkBtn",
    "pkUserScore",
    "pkOpponentName",
    "pkOpponentScore",
    "pkProblem",
    "pkForm",
    "pkAnswer",
    "pkRevealBtn",
    "pkFeed",
    "newsTickerTrack",
    "newsUpdatedAt",
    "newsIntelTitle",
    "newsIntelSummary",
    "newsIntelStats",
    "newsTopicFilter",
    "newsSourceFilter",
    "newsSocialHint",
    "newsList",
    "addNewsBtn",
    "refreshNewsBtn",
    "newsForm",
    "newsTitle",
    "newsSource",
    "newsUrl",
    "newsSourceType",
    "newsPrimarySkill",
    "newsTags",
    "newsSummary",
    "newsInsight",
    "newsDetail",
    "newsBackBtn",
    "newsDetailReadBadge",
    "newsDetailMeta",
    "newsDetailTitle",
    "newsDetailSummary",
    "newsDetailInsight",
    "newsDetailPills",
    "newsDetailLink",
    "refreshJobsBtn",
    "addNetworkBtn",
    "networkForm",
    "networkName",
    "networkCompany",
    "networkRole",
    "networkStatus",
    "networkChannel",
    "networkNextStep",
    "networkNotes",
    "networkList",
    "networkSummary",
    "resumeForm",
    "resumeText",
    "reviewResumeBtn",
    "saveResumeBtn",
    "resumeSummary",
    "resumeReview",
    "jobsSummary",
    "jobsList",
    "companiesPageTitle",
    "companiesSummary",
    "companyTierFilter",
    "companyOverviewList",
    "coursesSummary",
    "courseList",
    "coursePathList",
    "skillsPageTitle",
    "skillsPageSubtitle",
    "skillsScoreLabel",
    "skillsScoreValue",
    "skillsScoreCopy",
    "skillsEntriesCount",
    "skillsEntriesLabel",
    "skillsAverageScore",
    "skillsAverageLabel",
    "skillsWeakestSkill",
    "skillsWeakestLabel",
    "skillRadarTitle",
    "skillRadarHint",
    "skillRadarLegend",
    "skillRadarTooltip",
    "skillsGrid",
    "skillTemplate",
    "historyList",
    "leaderboardList",
    "leaderboardMetricSelect",
    "leaderboardScopeSelect",
    "leaderboardCountrySelect",
    "leaderboardRegionSelect",
    "sampleBtn",
    "exportBtn",
    "importInput",
    "resetBtn",
    "refreshLeaderboardBtn",
    "clearTodayBtn",
    "skillRadar",
    "drillQuestion",
    "drillForm",
    "drillInput",
    "drillOptions",
    "drillFeedback",
    "drillScore",
    "drillAccuracy",
    "drillTimer",
    "drillProgressText",
    "drillTimeLeftText",
    "drillProgressFill",
    "drillCountSelect",
    "drillTimeSelect",
    "startDrillSessionBtn",
    "skipDrillBtn",
    "nextDrillBtn",
    "mentalBestScore",
    "mentalSparkline",
    "mentalRecordList",
    "mentalLeaderboardList",
    "marketGameScore",
    "marketGamePrompt",
    "marketBidInput",
    "marketAskInput",
    "submitMarketQuoteBtn",
    "nextMarketGameBtn",
    "marketGameFeedback",
    "pokerGameScore",
    "pokerGamePrompt",
    "pokerModeSelect",
    "pokerMatchBtn",
    "pokerTable",
    "pokerSeatGrid",
    "pokerBoard",
    "pokerPot",
    "pokerStageText",
    "pokerBlindText",
    "pokerTurnPrompt",
    "pokerRaiseInput",
    "nextPokerGameBtn",
    "resetPokerGameBtn",
    "pokerGameFeedback",
    "pokerLog",
    "resourceForm",
    "resourceTitle",
    "resourceType",
    "resourceFile",
    "resourceContent",
    "resourceSources",
    "resourceList",
    "addResourceBtn",
    "settingsForm",
    "settingsLanguageSelect",
    "settingsCountrySelect",
    "settingsRegionSelect",
    "settingsLlmEndpointInput",
    "settingsLlmModelInput",
    "settingsCloudApiInput",
    "settingsGoogleClientIdInput",
    "settingsMessage",
    "syncCloudBtn",
    "globalSearchInput",
    "globalSearchResults"
  ].forEach((id) => {
    els[id] = document.getElementById(id);
  });
}

function bindEvents() {
  document.querySelectorAll("[data-module-tab]").forEach((button) => {
    button.addEventListener("click", () => {
      clearGlobalSearch();
      switchModule(button.dataset.moduleTab);
    });
  });

  document.querySelectorAll("[data-jump-module]").forEach((button) => {
    button.addEventListener("click", () => {
      clearGlobalSearch();
      switchModule(button.dataset.jumpModule);
    });
  });

  els.sidebarToggleBtn?.addEventListener("click", toggleSidebarNav);

  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.addEventListener("click", () => switchAuthTab(button.dataset.authTab));
  });

  els.loginForm.addEventListener("submit", (event) => {
    event.preventDefault();
    loginLocal();
  });

  els.registerForm.addEventListener("submit", (event) => {
    event.preventDefault();
    registerLocal();
  });

  els.sendRegisterCodeBtn?.addEventListener("click", sendRegisterVerificationCode);
  els.saveGoogleClientBtn?.addEventListener("click", saveGoogleClientId);
  els.userChip.addEventListener("click", () => switchModule("account"));
  els.languageSelect.addEventListener("change", () => setLanguage(els.languageSelect.value));
  els.settingsBtn.addEventListener("click", () => switchModule("settings"));
  els.logoutBtn.addEventListener("click", logout);
  els.checkInPill?.addEventListener("click", handleTopCheckIn);
  els.generateStudyPlanBtn?.addEventListener("click", () => switchModule("plan"));
  els.prepPlanSetupForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    createPrepPlan();
  });
  els.editPrepPlanBtn?.addEventListener("click", () => {
    prepPlanEditorOpen = true;
    renderPrepPlan();
  });
  els.prepPlanDashboard?.addEventListener("click", handlePrepPlanAction);
  els.prepPlanDashboard?.addEventListener("submit", (event) => {
    if (!event.target.matches("#prepDiagnosticForm")) return;
    event.preventDefault();
    submitPrepDiagnostic(event.target);
  });
  els.newExperienceBtn?.addEventListener("click", resetExperienceForm);
  els.cancelExperienceEditBtn?.addEventListener("click", resetExperienceForm);
  els.experienceForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    saveInterviewExperience();
  });
  els.experienceFilter?.addEventListener("change", renderExperiences);
  els.experienceList?.addEventListener("click", handleExperienceListAction);
  els.openCommunityExperiencesBtn?.addEventListener("click", () => {
    communityFilter = "experience";
    renderCommunity();
  });

  els.accountForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveAccount();
  });
  els.accountAvatarUrl.addEventListener("input", updateAccountAvatarPreview);
  els.accountAvatarFile.addEventListener("change", handleAccountAvatarFile);
  els.accountClearAvatarBtn.addEventListener("click", clearAccountAvatar);
  els.accountCountrySelect.addEventListener("change", () => {
    renderRegionOptions(els.accountRegionSelect, els.accountCountrySelect.value);
  });
  els.accountResumeFile?.addEventListener("change", handleAccountResumeFile);
  els.saveResumeBtn?.addEventListener("click", saveResumeText);
  els.resumeForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    reviewResumeWithLlm();
  });
  document.querySelectorAll("[data-job-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-job-filter]").forEach((item) => item.classList.toggle("active", item === button));
      renderJobs(button.dataset.jobFilter || "all");
    });
  });
  els.refreshJobsBtn?.addEventListener("click", () => refreshJobsFromApi(true));
  els.companyTierFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-company-tier]");
    if (!button) return;
    companyTierFilter = button.dataset.companyTier || "all";
    renderCompanies();
  });
  els.companyOverviewList?.addEventListener("click", (event) => {
    const practice = event.target.closest("[data-company-practice]");
    if (practice) {
      showCompanyProblems(practice.dataset.companyPractice);
      return;
    }
    const careers = event.target.closest("[data-company-careers]");
    if (careers) openExternalUrl(careers.dataset.companyCareers);
  });

  els.globalSearchInput?.addEventListener("input", renderGlobalSearchResults);
  els.globalSearchInput?.addEventListener("focus", renderGlobalSearchResults);
  els.globalSearchInput?.addEventListener("keydown", handleGlobalSearchKeydown);
  document.addEventListener("click", (event) => {
    if (!event.target.closest(".app-search")) hideGlobalSearchResults();
  });

  els.logForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addEntry();
  });

  els.logText.addEventListener("input", scheduleClassificationPreview);
  els.durationInput.addEventListener("input", updatePreview);
  els.difficultyInput.addEventListener("change", updatePreview);

  els.overviewCommunityExpandBtn.addEventListener("click", () => switchModule("community"));
  bindCommunityComposer("overview");
  bindCommunityComposer("full");
  document.querySelectorAll("[data-community-filter]").forEach((button) => {
    button.addEventListener("click", () => {
      communityFilter = button.dataset.communityFilter === "experience" ? "experience" : "all";
      renderCommunity();
    });
  });
  els.messageThreadList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-message-thread]");
    if (!button) return;
    selectedMessageThreadId = button.dataset.messageThread || "";
    markThreadRead(selectedMessageThreadId);
    renderMessages();
  });
  els.messageComposerForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    sendDirectMessage();
  });

  els.sampleBtn.addEventListener("click", () => {
    els.logText.value = sampleEntries[Math.floor(Math.random() * sampleEntries.length)];
    els.durationInput.value = "45";
    updatePreview();
  });

  els.problemSearch.addEventListener("input", handleProblemSearchInput);
  els.problemSearch.addEventListener("keydown", handleProblemSearchKeydown);
  els.problemThemeFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-problem-theme]");
    if (!button) return;
    problemThemeFilter = button.dataset.problemTheme || "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemDifficultyFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-problem-difficulty]");
    if (!button) return;
    problemDifficultyFilter = normalizeDifficultyFilter(button.dataset.problemDifficulty || "all");
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemCompanyList?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-problem-company]");
    if (!button) return;
    problemCompanyFilter = button.dataset.problemCompany || "all";
    problemViewMode = "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.problemCompanyClearBtn?.addEventListener("click", () => {
    problemCompanyFilter = "all";
    problemVisibleCount = PROBLEM_PAGE_SIZE;
    returnToProblemList();
  });
  els.leetcodeHotToggleBtn?.addEventListener("click", () => {
    leetcodeHotExpanded = !leetcodeHotExpanded;
    renderLeetcodeHot100();
  });
  els.todoDockButton?.addEventListener("click", () => {
    todoDockOpen = !todoDockOpen;
    renderTodoDock();
  });
  els.todoDockCloseBtn?.addEventListener("click", () => {
    todoDockOpen = false;
    renderTodoDock();
  });
  els.todoDockPanel?.addEventListener("click", handleTodoDockClick);
  els.todoDockPanel?.addEventListener("change", handleTodoDockEdit);
  els.todoDockAddForm?.addEventListener("submit", (event) => {
    event.preventDefault();
    addTodoTask();
  });
  els.addProblemBtn.addEventListener("click", () => {
    els.problemForm.classList.toggle("hidden");
    if (!els.problemForm.classList.contains("hidden")) els.problemTitleEn.focus();
  });
  els.problemForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addProblemFromForm();
  });
  els.problemImportForm.addEventListener("submit", (event) => {
    event.preventDefault();
    importProblemJson();
  });
  document.querySelectorAll("[data-problem-view]").forEach((button) => {
    button.addEventListener("click", () => {
      problemViewMode = ["saved", "ranking"].includes(button.dataset.problemView) ? button.dataset.problemView : "all";
      problemVisibleCount = PROBLEM_PAGE_SIZE;
      returnToProblemList();
    });
  });
  els.loadMoreProblemsBtn?.addEventListener("click", () => {
    problemVisibleCount += PROBLEM_PAGE_SIZE;
    renderProblems();
  });

  document.querySelectorAll("[data-interview-lang]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-interview-lang]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      interviewLanguage = button.dataset.interviewLang;
      renderInterviewCategoryPicker();
      updateInterviewSetupVisibility();
      updateInterviewAnswerMode();
      renderInterviewTranscript();
      renderInterviewQuestionPanel();
    });
  });

  [els.interviewTypeSelect, els.interviewQuestionCount, els.interviewQuestionTime, els.interviewSourceSelect].filter(Boolean).forEach((node) => {
    node.addEventListener("change", () => {
      if (node === els.interviewTypeSelect || node === els.interviewSourceSelect) selectedInterviewCategories = new Set(["all"]);
      updateInterviewSetupVisibility();
      renderInterviewSetup();
      resetInterview({ keepSetup: true });
    });
  });
  els.interviewCategoryPicker?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-interview-category]");
    if (!button) return;
    toggleInterviewCategory(button.dataset.interviewCategory);
  });
  [els.interviewQuestionCount, els.interviewQuestionTime].filter(Boolean).forEach((node) => {
    node.addEventListener("input", updateInterviewSetupVisibility);
  });
  els.interviewAnswerModeSelect?.addEventListener("change", updateInterviewAnswerMode);
  els.interviewPdfInput?.addEventListener("change", updateInterviewPdfMeta);
  els.interviewAnswerFile?.addEventListener("change", updateInterviewAnswerFileMeta);
  els.interviewAnswer?.addEventListener("input", autoSizeInterviewAnswer);
  els.interviewAnswer?.addEventListener("keydown", handleInterviewAnswerKeydown);
  els.saveLlmConfigBtn.addEventListener("click", saveLlmConfig);
  els.startInterviewBtn.addEventListener("click", startInterview);
  els.hintInterviewBtn?.addEventListener("click", requestInterviewHint);
  els.revealAnswerBtn.addEventListener("click", revealInterviewAnswer);
  els.nextInterviewQuestionBtn?.addEventListener("click", goToNextInterviewQuestion);
  els.saveInterviewFavoriteBtn?.addEventListener("click", saveCurrentInterviewFavorite);
  els.shareInterviewQuestionBtn?.addEventListener("click", shareCurrentInterviewQuestion);
  els.voiceAnswerBtn?.addEventListener("click", toggleVoiceAnswer);
  els.clearInterviewBtn.addEventListener("click", resetInterview);
  els.interviewForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitInterviewAnswer();
  });

  els.startPkBtn.addEventListener("click", startPkMatch);
  els.pkRevealBtn.addEventListener("click", revealPkAnswer);
  els.pkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    submitPkAnswer();
  });

  els.addNewsBtn.addEventListener("click", () => {
    els.newsForm.classList.toggle("hidden");
    if (!els.newsForm.classList.contains("hidden")) els.newsTitle.focus();
  });
  els.refreshNewsBtn.addEventListener("click", () => {
    refreshNewsFromApi(true);
  });
  els.newsTopicFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-news-topic]");
    if (!button) return;
    setNewsTopicFilter(button.dataset.newsTopic);
  });
  els.newsSourceFilter?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-news-source-filter]");
    if (!button) return;
    setNewsSourceFilter(button.dataset.newsSourceFilter);
  });
  els.newsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addNewsFromForm();
  });
  els.newsBackBtn.addEventListener("click", closeNewsDetail);

  els.addNetworkBtn.addEventListener("click", () => {
    els.networkForm.classList.toggle("hidden");
    if (!els.networkForm.classList.contains("hidden")) els.networkName.focus();
  });
  els.networkForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addNetworkContact();
  });

  els.exportBtn.addEventListener("click", exportState);
  els.importInput.addEventListener("change", importState);
  els.resetBtn.addEventListener("click", resetState);
  els.refreshLeaderboardBtn.addEventListener("click", renderLeaderboard);
  [
    els.leaderboardMetricSelect,
    els.leaderboardScopeSelect,
    els.leaderboardCountrySelect,
    els.leaderboardRegionSelect
  ].forEach((select) => select.addEventListener("change", updateLeaderboardSettings));
  els.clearTodayBtn.addEventListener("click", undoLatestEntry);

  els.settingsForm.addEventListener("submit", (event) => {
    event.preventDefault();
    saveSettings();
  });
  els.syncCloudBtn?.addEventListener("click", syncCloudNow);
  els.settingsLanguageSelect.addEventListener("change", () => setLanguage(els.settingsLanguageSelect.value));
  els.settingsCountrySelect.addEventListener("change", () => {
    renderRegionOptions(els.settingsRegionSelect, els.settingsCountrySelect.value);
  });

  setupSkillRadarInteractions();

  document.querySelectorAll("[data-drill]").forEach((button) => {
    button.addEventListener("click", () => {
      document.querySelectorAll("[data-drill]").forEach((item) => item.classList.remove("active"));
      button.classList.add("active");
      drillMode = button.dataset.drill;
      startDrillSession();
    });
  });

  els.drillForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = event.submitter?.dataset?.drillOption;
    if (selected) checkDrill(selected);
  });

  els.startDrillSessionBtn?.addEventListener("click", startDrillSession);
  els.skipDrillBtn?.addEventListener("click", skipDrill);
  els.nextDrillBtn?.addEventListener("click", () => advanceDrillQuestion());
  els.drillOptions?.addEventListener("click", (event) => {
    const button = event.target.closest("[data-drill-option]");
    if (!button) return;
    checkDrill(button.dataset.drillOption);
  });
  els.submitMarketQuoteBtn?.addEventListener("click", submitMarketQuote);
  els.nextMarketGameBtn?.addEventListener("click", () => newMarketGame(true));
  document.querySelectorAll("[data-poker-action]").forEach((button) => {
    button.addEventListener("click", () => submitPokerAction(button.dataset.pokerAction));
  });
  els.nextPokerGameBtn?.addEventListener("click", () => newPokerGame(true));
  els.resetPokerGameBtn?.addEventListener("click", () => resetPokerTournament(true));
  els.pokerMatchBtn?.addEventListener("click", () => resetPokerTournament(true));
  els.pokerModeSelect?.addEventListener("change", () => resetPokerTournament(true));
  els.courseList?.addEventListener("click", handleCourseListClick);
  els.courseList?.addEventListener("change", handleCourseNoteChange);
  els.coursePathList?.addEventListener("click", handleCourseListClick);

  els.addResourceBtn.addEventListener("click", () => {
    els.resourceForm.classList.toggle("hidden");
    if (!els.resourceForm.classList.contains("hidden")) {
      els.resourceTitle.focus();
    }
  });

  els.resourceForm.addEventListener("submit", (event) => {
    event.preventDefault();
    addResource();
  });

  els.resourceFile.addEventListener("change", handleResourceFile);
}

function setupButtonRipples() {
  document.addEventListener("click", (event) => {
    const button = event.target.closest("button, .primary-button, .secondary-button, .module-tab, .segment, .feature-launch-card, .leetcode-hot-link, .leetcode-hot-done, .todo-dock-button, .todo-task-toggle");
    if (!button || button.closest(".auth-provider-stack")) return;
    const rect = button.getBoundingClientRect();
    if (!rect.width || !rect.height) return;
    const ripple = document.createElement("span");
    ripple.className = "ui-ripple";
    ripple.style.left = `${event.clientX - rect.left}px`;
    ripple.style.top = `${event.clientY - rect.top}px`;
    button.appendChild(ripple);
    ripple.addEventListener("animationend", () => ripple.remove(), { once: true });
  });
}

function createBaseState() {
  return {
    skills: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0])),
    entries: [],
    resources: [],
    network: [],
    interviewFavorites: [],
    mentalMathRecords: [],
    gameRecords: [],
    courseStates: [],
    problemStates: [],
    leetcodeHot100Done: [],
    studyPlan: null,
    prepPlan: null,
    interviewExperiences: [],
    resume: { text: "", review: [], fileName: "", fileType: "", fileSize: 0, uploadedAt: "", updatedAt: "" },
    jobs: seedJobs.map((item) => ({ ...item, tags: [...item.tags] })),
    courses: seedCourses.map((item) => ({ ...item, tags: [...item.tags] })),
    streakCount: 0,
    checkIns: [],
    leaderboard: defaultLeaderboardSettings(),
    problems: mergeProblems(catalogProblems.filter((problem) => !isDisabledProblemSource(problem)), []).map((problem) => ({ ...problem, tags: [...problem.tags] })),
    news: seedNews.map((item) => ({ ...item, tags: [...item.tags], skills: [...item.skills] })),
    newsFetchedAt: "",
    newsFetchAttemptAt: "",
    newsSyncError: "",
    jobsFetchedAt: "",
    jobsFetchAttemptAt: "",
    jobsSyncError: "",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { accounts: [], currentUserId: "", googleClientId: DEFAULT_GOOGLE_CLIENT_ID };
    const parsed = JSON.parse(raw);
    return {
      accounts: Array.isArray(parsed.accounts) ? parsed.accounts.map(normalizeAccount) : [],
      currentUserId: parsed.currentUserId || "",
      googleClientId: parsed.googleClientId || DEFAULT_GOOGLE_CLIENT_ID
    };
  } catch {
    return { accounts: [], currentUserId: "", googleClientId: DEFAULT_GOOGLE_CLIENT_ID };
  }
}

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

function getCurrentUser() {
  return auth.accounts.find((account) => account.id === auth.currentUserId) || null;
}

function userStateKey(userId) {
  return `${USER_STATE_PREFIX}.${userId}`;
}

function normalizeState(rawState) {
  const base = createBaseState();
  const legacyFavorites = Array.isArray(rawState?.interviewFavorites) ? rawState.interviewFavorites : [];
  return {
    ...base,
    ...rawState,
    skills: normalizeSkills(rawState?.skills || {}),
    entries: Array.isArray(rawState?.entries) ? rawState.entries : [],
    resources: normalizeResources(rawState?.resources),
    network: Array.isArray(rawState?.network) ? rawState.network.map(normalizeNetworkContact) : [],
    interviewFavorites: legacyFavorites.filter((favorite) => !favorite?.problemId),
    mentalMathRecords: normalizeMentalMathRecords(rawState?.mentalMathRecords),
    gameRecords: normalizeGameRecords(rawState?.gameRecords),
    courseStates: normalizeCourseStates(rawState?.courseStates),
    problemStates: mergeProblemStates(
      Array.isArray(rawState?.problemStates) ? rawState.problemStates : [],
      problemStatesFromFavorites(legacyFavorites.filter((favorite) => favorite?.problemId))
    ).filter((problemState) => !isDisabledProblemId(problemState.problemId)),
    leetcodeHot100Done: normalizeLeetcodeHot100Done(rawState?.leetcodeHot100Done),
    studyPlan: normalizeStudyPlan(rawState?.studyPlan),
    prepPlan: normalizePrepPlan(rawState?.prepPlan),
    interviewExperiences: Array.isArray(rawState?.interviewExperiences)
      ? rawState.interviewExperiences.map(normalizeInterviewExperience)
      : [],
    resume: normalizeResumeState(rawState?.resume),
    jobs: normalizeJobs(rawState?.jobs),
    courses: normalizeCourses(rawState?.courses),
    streakCount: Math.max(0, Number(rawState?.streakCount || 0)),
    checkIns: Array.isArray(rawState?.checkIns) ? rawState.checkIns.filter((item) => item?.date) : [],
    leaderboard: normalizeLeaderboardSettings(rawState?.leaderboard),
    problems: mergeProblems(
      base.problems,
      Array.isArray(rawState?.problems) ? rawState.problems.filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem)) : []
    ),
    news: mergeNews(base.news, Array.isArray(rawState?.news) ? rawState.news : []),
    newsFetchedAt: rawState?.newsFetchedAt || "",
    newsFetchAttemptAt: rawState?.newsFetchAttemptAt || "",
    newsSyncError: rawState?.newsSyncError || "",
    jobsFetchedAt: rawState?.jobsFetchedAt || "",
    jobsFetchAttemptAt: rawState?.jobsFetchAttemptAt || "",
    jobsSyncError: rawState?.jobsSyncError || "",
    updatedAt: rawState?.updatedAt || rawState?.createdAt || base.createdAt
  };
}

function normalizeStudyPlan(raw = null) {
  if (!raw || !Array.isArray(raw.items)) return null;
  const items = raw.items
    .map((item) => ({
      id: item?.id || makeId(),
      title: String(item?.title || "").trim(),
      detail: String(item?.detail || "").trim(),
      minutes: Math.max(0, Number(item?.minutes || 0)),
      skill: String(item?.skill || "").trim(),
      done: Boolean(item?.done)
    }))
    .filter((item) => item.title || item.detail);
  if (!items.length) return null;
  return {
    createdAt: raw.createdAt || new Date().toISOString(),
    summary: String(raw.summary || "").trim(),
    items
  };
}

function normalizePrepPlan(raw = null) {
  if (!raw || !prepRoleDefs[raw.role] || !prepSeasonDefs[raw.season]) return null;
  const track = raw.track === "fulltime" ? "fulltime" : "internship";
  const diagnosticStatus = ["pending", "completed", "skipped"].includes(raw.diagnosticStatus)
    ? raw.diagnosticStatus
    : "skipped";
  const diagnosticScores = raw.diagnosticScores && typeof raw.diagnosticScores === "object"
    ? Object.fromEntries(Object.entries(raw.diagnosticScores).map(([key, value]) => [key, Math.max(0, Math.min(100, Number(value || 0)))]))
    : {};
  const taskOverrides = raw.taskOverrides && typeof raw.taskOverrides === "object"
    ? Object.fromEntries(Object.entries(raw.taskOverrides).map(([key, value]) => [key, {
      title: String(value?.title || "").trim().slice(0, 120),
      detail: String(value?.detail || "").trim().slice(0, 260),
      minutes: Math.max(0, Number(value?.minutes || 0))
    }]))
    : {};
  const customTasks = Array.isArray(raw.customTasks)
    ? raw.customTasks.map((task) => ({
      id: String(task?.id || makeId()).trim(),
      date: String(task?.date || localDateKey()).slice(0, 10),
      title: String(task?.title || "").trim().slice(0, 120),
      detail: String(task?.detail || "").trim().slice(0, 260),
      minutes: Math.max(0, Number(task?.minutes || 15)),
      action: String(task?.action || "custom").trim(),
      query: String(task?.query || "").trim()
    })).filter((task) => task.id && (task.title || task.detail))
    : [];
  return {
    track,
    role: raw.role,
    season: raw.season,
    weeklyHours: [5, 8, 12, 16].includes(Number(raw.weeklyHours)) ? Number(raw.weeklyHours) : 8,
    diagnosticStatus,
    diagnosticScore: Math.max(0, Math.min(prepDiagnosticQuestions.length, Number(raw.diagnosticScore || 0))),
    diagnosticScores,
    completedTasks: raw.completedTasks && typeof raw.completedTasks === "object" ? raw.completedTasks : {},
    taskOverrides,
    customTasks,
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
}

function normalizeMentalMathRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      id: String(record?.id || makeId()),
      mode: String(record?.mode || "numberLogic"),
      label: String(record?.label || "").trim(),
      score: Number(record?.score || 0),
      correct: Math.max(0, Number(record?.correct || 0)),
      incorrect: Math.max(0, Number(record?.incorrect || 0)),
      skipped: Math.max(0, Number(record?.skipped || 0)),
      total: Math.max(0, Number(record?.total || 0)),
      accuracy: Math.max(0, Math.min(100, Number(record?.accuracy || 0))),
      durationSeconds: Math.max(0, Number(record?.durationSeconds || 0)),
      createdAt: record?.createdAt || new Date().toISOString()
    }))
    .filter((record) => record.total > 0 || record.score !== 0)
    .slice(-80);
}

function normalizeGameRecords(records = []) {
  return (Array.isArray(records) ? records : [])
    .map((record) => ({
      id: String(record?.id || makeId()),
      game: String(record?.game || "market"),
      score: Number(record?.score || 0),
      detail: String(record?.detail || "").trim().slice(0, 280),
      createdAt: record?.createdAt || new Date().toISOString()
    }))
    .filter((record) => record.game)
    .slice(-80);
}

function normalizeInterviewExperience(raw = {}) {
  return {
    id: raw.id || makeId(),
    firm: String(raw.firm || "").trim().slice(0, 120),
    role: String(raw.role || "Quant Trading").trim().slice(0, 80),
    stage: String(raw.stage || "OA / Assessment").trim().slice(0, 80),
    season: String(raw.season || "2027 Summer").trim().slice(0, 40),
    date: String(raw.date || "").slice(0, 10),
    outcome: String(raw.outcome || "Waiting").trim().slice(0, 40),
    tags: Array.isArray(raw.tags) ? raw.tags.map(String).filter(Boolean).slice(0, 12) : parseTags(raw.tags || "").slice(0, 12),
    summary: String(raw.summary || "").trim().slice(0, 3000),
    topics: String(raw.topics || "").trim().slice(0, 4000),
    reflection: String(raw.reflection || "").trim().slice(0, 4000),
    sharedPostId: String(raw.sharedPostId || ""),
    sharedAt: String(raw.sharedAt || ""),
    createdAt: raw.createdAt || new Date().toISOString(),
    updatedAt: raw.updatedAt || raw.createdAt || new Date().toISOString()
  };
}

function normalizeResumeState(raw = {}) {
  return {
    text: String(raw?.text || "").slice(0, 120_000),
    review: Array.isArray(raw?.review) ? raw.review.map(String).filter(Boolean).slice(0, 8) : [],
    fileName: String(raw?.fileName || ""),
    fileType: String(raw?.fileType || ""),
    fileSize: Math.max(0, Number(raw?.fileSize || 0)),
    uploadedAt: raw?.uploadedAt || "",
    updatedAt: raw?.updatedAt || ""
  };
}

function normalizeJobs(rawJobs) {
  const jobs = Array.isArray(rawJobs) && rawJobs.length ? rawJobs : seedJobs;
  return jobs.map((job) => ({
    id: String(job?.id || stableProblemId(`${job?.company || "job"}-${job?.title || makeId()}`, "job")),
    company: String(job?.company || "Quant Firm"),
    title: String(job?.title || "Quant Role"),
    type: String(job?.type || "internship").toLowerCase() === "fulltime" ? "fulltime" : "internship",
    location: String(job?.location || "Global"),
    url: String(job?.url || "#"),
    postedAt: String(job?.postedAt || "crawler-ready"),
    tags: Array.isArray(job?.tags) ? job.tags.map(String).filter(Boolean) : parseTags(job?.tags || "")
  }));
}

function normalizeCourses(rawCourses) {
  const courses = Array.isArray(rawCourses) && rawCourses.length ? rawCourses : seedCourses;
  return courses.map((course) => {
    const url = String(course?.url || "#").trim();
    const sources = normalizeContentSources(course?.sources, {
      title: course?.provider || course?.platform || "Original",
      provider: course?.platform || inferSource(url) || "Original",
      url
    });
    return {
      id: String(course?.id || stableCourseId(`${course?.platform || "course"}-${course?.title || makeId()}`, url)),
      title: String(course?.title || "Quant Course").trim(),
      platform: String(course?.platform || sources[0]?.provider || "Course").trim(),
      provider: String(course?.provider || course?.platform || sources[0]?.title || "Course").trim(),
      url,
      sources,
      topic: String(course?.topic || "Quant").trim(),
      level: String(course?.level || "Core").trim(),
      summary: String(course?.summary || "").trim(),
      tags: Array.isArray(course?.tags) ? course.tags.map(String).filter(Boolean) : parseTags(course?.tags || "")
    };
  });
}

function normalizeResources(rawResources) {
  return (Array.isArray(rawResources) ? rawResources : []).map((resource) => {
    const content = String(resource?.content || "").trim();
    const urlSources = normalizeContentSources(resource?.sources, {
      title: resource?.type === "link" ? "Original" : "",
      provider: resource?.type === "link" ? inferSource(content) || "Original" : "",
      url: /^https?:\/\//i.test(content) ? content : ""
    });
    return {
      id: String(resource?.id || makeId()),
      title: String(resource?.title || "").trim(),
      type: String(resource?.type || "note").trim(),
      content,
      sources: urlSources,
      dataUrl: String(resource?.dataUrl || ""),
      date: resource?.date || resource?.createdAt || new Date().toISOString()
    };
  }).filter((resource) => resource.title || resource.content || resource.dataUrl);
}

function normalizeCourseStates(rawStates = []) {
  const states = Array.isArray(rawStates) ? rawStates : [];
  return states.map((item) => ({
    courseId: String(item?.courseId || item?.id || "").trim(),
    saved: Boolean(item?.saved),
    inPath: Boolean(item?.inPath),
    done: Boolean(item?.done),
    note: String(item?.note || "").slice(0, 4000),
    selectedSourceId: String(item?.selectedSourceId || ""),
    pathAddedAt: item?.pathAddedAt || "",
    updatedAt: item?.updatedAt || item?.createdAt || new Date().toISOString()
  })).filter((item) => item.courseId);
}

function normalizeSkills(rawSkills) {
  const skills = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, Number(rawSkills[key] || 0)]));
  if (rawSkills.probability && !rawSkills.probabilityExpectation) skills.probabilityExpectation += Number(rawSkills.probability || 0);
  if (rawSkills.mental && !rawSkills.mentalMath) skills.mentalMath += Number(rawSkills.mental || 0);
  return skills;
}

function loadState() {
  if (!currentUser) return createBaseState();

  return loadStateForUser(currentUser.id);
}

function loadStateForUser(userId) {
  try {
    const raw = localStorage.getItem(userStateKey(userId));
    if (!raw) return createBaseState();
    return normalizeState(JSON.parse(raw));
  } catch {
    return createBaseState();
  }
}

function saveState(options = {}) {
  if (!currentUser) return;
  state.updatedAt = new Date().toISOString();
  localStorage.setItem(userStateKey(currentUser.id), JSON.stringify(localStatePayload(state)));
  if (options.sync !== false) queueCloudSync("state");
}

function localStatePayload(rawState) {
  return {
    ...rawState,
    problems: getUserCatalogProblems(rawState?.problems || [])
  };
}

function cloudStatePayload(rawState) {
  const payload = localStatePayload(rawState);
  delete payload.problems;
  delete payload.problemStates;
  return payload;
}

function getUserCatalogProblems(problems) {
  return (Array.isArray(problems) ? problems : []).filter((problem) => isUserProblem(problem) && isCatalogProblem(problem) && !isDisabledProblemSource(problem));
}

function mergeProblems(seed, saved) {
  const byId = new Map();
  [...seed, ...saved].forEach((problem) => {
    const normalized = normalizeProblem(problem);
    const previous = byId.get(normalized.id);
    if (!previous) {
      byId.set(normalized.id, normalized);
      return;
    }
    byId.set(normalized.id, {
      ...previous,
      ...normalized,
      tags: sanitizeProblemTags([...(previous.tags || []), ...(normalized.tags || [])]),
      companies: normalized.companies?.length ? normalized.companies : previous.companies || []
    });
  });
  return [...byId.values()];
}

function normalizeLeetcodeHot100Done(value) {
  const valid = new Set(leetcodeHot100.map((item) => item.id));
  return [...new Set(Array.isArray(value) ? value.map(String) : [])].filter((id) => valid.has(id));
}

function normalizeProblemState(raw = {}) {
  const problemId = normalizeCatalogProblemId(raw.problemId);
  return {
    ...raw,
    problemId,
    interviewCount: Math.max(0, Number(raw.interviewCount || 0)),
    favorite: Boolean(raw.favorite),
    completed: Boolean(raw.completed),
    completedAt: raw.completedAt || "",
    favorites: Array.isArray(raw.favorites) ? raw.favorites.filter((favorite) => favorite?.id) : [],
    scoreHistory: Array.isArray(raw.scoreHistory) ? raw.scoreHistory.filter((score) => score?.id) : [],
    lastPracticedAt: raw.lastPracticedAt || "",
    updatedAt: raw.updatedAt || ""
  };
}

function mergeProblemStates(...lists) {
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((raw) => {
    const next = normalizeProblemState(raw);
    if (!next.problemId) return;
    const previous = byId.get(next.problemId);
    if (!previous) {
      byId.set(next.problemId, next);
      return;
    }
    const lastScoreAt = latestIso(previous.lastScoreAt, next.lastScoreAt);
    const scoreSource = previous.lastScoreAt === lastScoreAt ? previous : next;
    const favoriteSource = latestIso(previous.updatedAt, next.updatedAt) === next.updatedAt ? next : previous;
    const completedSource = latestIso(previous.updatedAt, next.updatedAt) === next.updatedAt ? next : previous;
    byId.set(next.problemId, {
      ...previous,
      ...next,
      interviewCount: Math.max(previous.interviewCount || 0, next.interviewCount || 0),
      favorite: Boolean(favoriteSource.favorite),
      completed: Boolean(completedSource.completed),
      completedAt: completedSource.completed ? latestIso(previous.completedAt, next.completedAt) : "",
      favorites: mergeRecordsById(previous.favorites || [], next.favorites || []),
      scoreHistory: mergeRecordsById(previous.scoreHistory || [], next.scoreHistory || []),
      lastScore: scoreSource.lastScore,
      lastScoreAt,
      lastEvaluation: scoreSource.lastEvaluation || "",
      lastPracticedAt: latestIso(previous.lastPracticedAt, next.lastPracticedAt),
      updatedAt: latestIso(previous.updatedAt, next.updatedAt)
    });
  });
  return [...byId.values()];
}

function problemStatesFromFavorites(favorites) {
  const byProblem = new Map();
  (Array.isArray(favorites) ? favorites : []).forEach((favorite) => {
    const problemId = String(favorite?.problemId || "").trim();
    if (!problemId) return;
    const previous = byProblem.get(problemId) || {
      problemId,
      favorite: true,
      favorites: []
    };
    previous.favorites.push(favorite);
    previous.lastFavoriteAt = latestIso(previous.lastFavoriteAt, favorite.createdAt);
    previous.updatedAt = latestIso(previous.updatedAt, favorite.createdAt);
    byProblem.set(problemId, previous);
  });
  return [...byProblem.values()];
}

function updateProblemState(problemId, update) {
  if (!problemId) return;
  const current = (state.problemStates || []).find((item) => item.problemId === problemId) || { problemId };
  const next = normalizeProblemState({
    ...current,
    ...(typeof update === "function" ? update(current) : update),
    problemId,
    updatedAt: new Date().toISOString()
  });
  state.problemStates = mergeProblemStates(state.problemStates || [], [next]);
}

function mergeNews(seed, saved) {
  const byId = new Map();
  [...seed, ...saved].forEach((item) => {
    const normalized = normalizeNewsItem(item);
    if (isLowQualityNews(normalized)) return;
    const key = newsDedupeKey(normalized);
    const previous = byId.get(key);
    byId.set(key, previous ? mergeDuplicateNews(previous, normalized) : normalized);
  });
  return sortNews([...byId.values()]);
}

function newsDedupeKey(item) {
  const title = canonicalNewsTitle(item.titleZh || item.title);
  if (title) return `title:${title}`;
  return `id:${item.id}`;
}

function mergeDuplicateNews(previous, next) {
  const newer = newsTime(next) > newsTime(previous) ? next : previous;
  const older = newer === next ? previous : next;
  return {
    ...older,
    ...newer,
    id: older.id || newer.id,
    tags: [...new Set([...(older.tags || []), ...(newer.tags || [])])].slice(0, 8),
    skills: [...new Set([...(older.skills || []), ...(newer.skills || [])])],
    summary: (newer.summary || "").length >= (older.summary || "").length ? newer.summary : older.summary,
    insight: newer.insight || older.insight || "",
    readAt: older.readAt || newer.readAt || "",
    updatedAt: latestIso(older.updatedAt, newer.updatedAt)
  };
}

function loadLlmConfig() {
  try {
    const raw = localStorage.getItem(LLM_CONFIG_KEY);
    if (!raw) return { endpoint: DEFAULT_LLM_ENDPOINT, model: DEFAULT_LLM_MODEL };
    const parsed = JSON.parse(raw);
    const storedModel = parsed.defaultsVersion ? parsed.model : (parsed.model === "gpt-5" ? DEFAULT_LLM_MODEL : parsed.model);
    return {
      endpoint: parsed.endpoint || DEFAULT_LLM_ENDPOINT,
      model: normalizeLlmModel(storedModel)
    };
  } catch {
    return { endpoint: DEFAULT_LLM_ENDPOINT, model: DEFAULT_LLM_MODEL };
  }
}

function saveLlmConfigToStorage() {
  llmConfig = {
    endpoint: llmConfig.endpoint || DEFAULT_LLM_ENDPOINT,
    model: normalizeLlmModel(llmConfig.model),
    defaultsVersion: LLM_DEFAULTS_VERSION
  };
  localStorage.setItem(LLM_CONFIG_KEY, JSON.stringify(llmConfig));
}

function normalizeLlmModel(model) {
  const value = String(model || "").trim();
  return LLM_MODEL_OPTIONS.includes(value) ? value : DEFAULT_LLM_MODEL;
}

function normalizeLanguage(language) {
  const value = String(language || "").toLowerCase().trim();
  return SUPPORTED_LANGUAGES.includes(value) ? value : DEFAULT_LANGUAGE;
}

function getUrlLanguage() {
  const queryLanguage = new URLSearchParams(window.location.search).get("lang");
  if (SUPPORTED_LANGUAGES.includes(String(queryLanguage || "").toLowerCase())) {
    return normalizeLanguage(queryLanguage);
  }
  const localeSegment = window.location.pathname
    .split("/")
    .filter(Boolean)
    .find((segment) => SUPPORTED_LANGUAGES.includes(String(segment || "").toLowerCase()));
  return localeSegment
    ? normalizeLanguage(localeSegment)
    : "";
}

function getBrowserLanguage() {
  const browserLanguages = Array.isArray(navigator.languages) && navigator.languages.length
    ? navigator.languages
    : [navigator.language];
  const preferred = browserLanguages
    .map((language) => String(language || "").toLowerCase())
    .find((language) => language.startsWith("zh") || language.startsWith("en"));
  return preferred?.startsWith("en") ? "en" : DEFAULT_LANGUAGE;
}

function getInitialLanguage(storedLanguage = "") {
  return normalizeLanguage(getUrlLanguage() || storedLanguage || getBrowserLanguage());
}

function syncLanguageToUrl(language) {
  if (!window.history?.replaceState || !/^https?:$/.test(window.location.protocol)) return;
  const nextLanguage = normalizeLanguage(language);
  const url = new URL(window.location.href);
  const segments = url.pathname.split("/").filter(Boolean);
  const localeIndex = segments.findIndex((segment) => SUPPORTED_LANGUAGES.includes(String(segment || "").toLowerCase()));
  if (localeIndex >= 0) {
    segments[localeIndex] = nextLanguage;
    url.pathname = `/${segments.join("/")}`;
    url.searchParams.delete("lang");
  } else {
    url.searchParams.set("lang", nextLanguage);
  }
  window.history.replaceState({}, "", url);
}

function loadAppPrefs() {
  try {
    const parsed = JSON.parse(localStorage.getItem(APP_PREFS_KEY) || "{}");
    return {
      language: getInitialLanguage(parsed.language),
      sidebarCollapsed: parsed.sidebarCollapsed === true
    };
  } catch {
    return { language: getInitialLanguage(), sidebarCollapsed: false };
  }
}

function saveAppPrefs() {
  localStorage.setItem(APP_PREFS_KEY, JSON.stringify(appPrefs));
}

function getLanguage() {
  return normalizeLanguage(appPrefs.language);
}

function getLocale() {
  return getLanguage() === "en" ? "en-US" : "zh-CN";
}

function t(key, params = {}) {
  const template = i18n[getLanguage()]?.[key] || i18n.zh[key] || key;
  return Object.entries(params).reduce((text, [name, value]) => (
    text.replaceAll(`{${name}}`, String(value ?? ""))
  ), template);
}

function textMatchesI18nKeys(text, keys = []) {
  const value = String(text || "").trim();
  return keys.some((key) => SUPPORTED_LANGUAGES.some((language) => i18n[language]?.[key] === value));
}

function setLanguage(language, options = {}) {
  const nextLanguage = normalizeLanguage(language);
  appPrefs.language = nextLanguage;
  saveAppPrefs();
  if (options.updateUrl !== false) syncLanguageToUrl(nextLanguage);
  applySidebarState();
  applyLanguage();
  renderAll();
}

function applySidebarState() {
  const collapsed = appPrefs.sidebarCollapsed === true;
  document.body.classList.toggle("sidebar-collapsed", collapsed);
  if (!els.sidebarToggleBtn) return;
  const label = t(collapsed ? "sidebarShow" : "sidebarHide");
  const icon = els.sidebarToggleBtn.querySelector("i");
  els.sidebarToggleBtn.setAttribute("aria-expanded", String(!collapsed));
  els.sidebarToggleBtn.setAttribute("aria-label", label);
  els.sidebarToggleBtn.title = label;
  if (icon) icon.setAttribute("data-lucide", collapsed ? "panel-left-open" : "panel-left-close");
  refreshIcons();
}

function toggleSidebarNav() {
  appPrefs.sidebarCollapsed = appPrefs.sidebarCollapsed !== true;
  saveAppPrefs();
  applySidebarState();
}

function loadCommunity() {
  try {
    return normalizeCommunityStore(JSON.parse(localStorage.getItem(COMMUNITY_KEY) || "{}"));
  } catch {
    return { posts: [], threads: [] };
  }
}

function saveCommunity(options = {}) {
  localStorage.setItem(COMMUNITY_KEY, JSON.stringify(community));
  if (options.sync !== false) queueCloudSync("community");
}

function normalizeCommunityStore(raw = {}) {
  return {
    posts: Array.isArray(raw?.posts) ? raw.posts.map(normalizeCommunityPost) : [],
    threads: Array.isArray(raw?.threads) ? raw.threads.map(normalizeMessageThread).filter((thread) => thread.participants.length >= 2) : []
  };
}

function loadCloudConfig() {
  try {
    const parsed = JSON.parse(localStorage.getItem(CLOUD_CONFIG_KEY) || "{}");
    return {
      endpoint: parsed.endpoint || DEFAULT_CLOUD_API_ENDPOINT,
      token: parsed.token || "",
      userId: parsed.userId || "",
      lastSyncAt: parsed.lastSyncAt || "",
      lastError: parsed.lastError || ""
    };
  } catch {
    return { endpoint: DEFAULT_CLOUD_API_ENDPOINT, token: "", userId: "", lastSyncAt: "", lastError: "" };
  }
}

function saveCloudConfig() {
  localStorage.setItem(CLOUD_CONFIG_KEY, JSON.stringify(cloudConfig));
}

function getCloudApiBase() {
  return (cloudConfig.endpoint || DEFAULT_CLOUD_API_ENDPOINT).trim().replace(/\/+$/, "");
}

function canUseCloud() {
  return Boolean(cloudConfig.token && currentUser && cloudConfig.userId === currentUser.id);
}

function getLlmRequestHeaders() {
  const headers = { "Content-Type": "application/json" };
  if (cloudConfig.token) headers.Authorization = `Bearer ${cloudConfig.token}`;
  return headers;
}

async function cloudApi(path, options = {}) {
  const headers = { "Content-Type": "application/json" };
  if (options.auth !== false && cloudConfig.token) {
    headers.Authorization = `Bearer ${cloudConfig.token}`;
  }

  const response = await fetch(`${getCloudApiBase()}${path}`, {
    method: options.method || "GET",
    headers,
    body: options.body === undefined ? undefined : JSON.stringify(options.body)
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Cloud API ${response.status}`);
    error.status = response.status;
    throw error;
  }
  return data;
}

async function refreshProblemCatalog(force = false) {
  if (problemCatalogRefresh && !force) return problemCatalogRefresh;
  problemCatalogRefresh = cloudApi("/problems")
    .then((data) => {
      const problems = Array.isArray(data.problems)
        ? data.problems.filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem))
        : [];
      if (!problems.length) return;
      state.problems = mergeProblems(getUserCatalogProblems(state.problems), problems);
      state.problemStates = (state.problemStates || []).filter((problemState) => !isDisabledProblemId(problemState.problemId));
      saveState({ sync: false });
      renderProblems();
      renderInterviewSetup();
    })
    .catch(() => {})
    .finally(() => {
      problemCatalogRefresh = null;
    });
  return problemCatalogRefresh;
}

function normalizeProblemSocial(raw = {}, preserveComments = []) {
  return {
    problemId: String(raw.problemId || ""),
    likeCount: Math.max(0, Number(raw.likeCount || 0)),
    commentCount: Math.max(0, Number(raw.commentCount || 0)),
    liked: Boolean(raw.liked),
    comments: Array.isArray(raw.comments) ? raw.comments : preserveComments
  };
}

function getProblemSocial(problemId) {
  return problemSocial.get(problemId) || normalizeProblemSocial({ problemId });
}

async function refreshProblemSocial(problemId = "") {
  try {
    const path = problemId ? `/problem-social/${encodeURIComponent(problemId)}` : "/problem-social";
    const result = await cloudApi(path);
    const entries = problemId ? [result.social] : (result.problemSocial || []);
    if (!problemId) {
      const next = new Map();
      entries.forEach((raw) => {
        const previous = problemSocial.get(raw.problemId);
        next.set(raw.problemId, normalizeProblemSocial(raw, previous?.comments || []));
      });
      problemSocial = next;
    } else if (entries[0]) {
      problemSocial.set(problemId, normalizeProblemSocial(entries[0]));
    }
    if (selectedProblemDetailId && selectedProblemDetailId === problemId) {
      const problem = state.problems.find((item) => item.id === problemId);
      if (problem) renderProblemDetail(problem);
    } else {
      renderProblems();
    }
  } catch {
    if (problemId) {
      problemSocialNotice = t("problemSocialError");
      const problem = state.problems.find((item) => item.id === problemId);
      if (problem) renderProblemDetail(problem);
    }
  }
}

function upsertLocalAccount(account, localFields = {}) {
  const normalized = normalizeAccount(account);
  const existing = auth.accounts.find((item) => item.id === normalized.id);
  const merged = { ...(existing || {}), ...normalized, ...localFields };
  auth.accounts = [
    ...auth.accounts.filter((item) => item.id !== normalized.id && normalizeEmail(item.email) !== normalizeEmail(normalized.email)),
    merged
  ];
  auth.currentUserId = normalized.id;
  saveAuth();
  currentUser = getCurrentUser();
  return currentUser;
}

function mergeCloudState(remoteState, localState) {
  const remote = normalizeState(remoteState || {});
  const local = normalizeState(localState || {});
  const skills = Object.fromEntries(Object.keys(skillDefs).map((key) => [
    key,
    Math.max(Number(remote.skills?.[key] || 0), Number(local.skills?.[key] || 0))
  ]));
  const createdAt = [remote.createdAt, local.createdAt].filter(Boolean).sort()[0] || new Date().toISOString();
  const updatedCandidates = [remote.updatedAt, local.updatedAt].filter(Boolean).sort();
  const updatedAt = updatedCandidates[updatedCandidates.length - 1] || new Date().toISOString();
  return normalizeState({
    ...remote,
    ...local,
    skills,
    entries: mergeRecordsById(remote.entries, local.entries),
    resources: mergeRecordsById(remote.resources, local.resources),
    network: mergeRecordsById(remote.network, local.network),
    interviewFavorites: mergeRecordsById(remote.interviewFavorites, local.interviewFavorites),
    interviewExperiences: mergeRecordsById(remote.interviewExperiences, local.interviewExperiences).map(normalizeInterviewExperience),
    courseStates: mergeCourseStates(remote.courseStates, local.courseStates),
    problemStates: mergeProblemStates(remote.problemStates, local.problemStates),
    studyPlan: latestIso(remote.studyPlan?.createdAt, local.studyPlan?.createdAt) === remote.studyPlan?.createdAt ? remote.studyPlan : local.studyPlan,
    prepPlan: latestIso(remote.prepPlan?.updatedAt, local.prepPlan?.updatedAt) === remote.prepPlan?.updatedAt ? remote.prepPlan : local.prepPlan,
    resume: mergeResumeState(remote.resume, local.resume),
    jobs: mergeJobs(remote.jobs, local.jobs),
    courses: mergeCourses(remote.courses, local.courses),
    streakCount: Math.max(Number(remote.streakCount || 0), Number(local.streakCount || 0)),
    checkIns: mergeRecordsById(remote.checkIns, local.checkIns),
    problems: mergeProblems(remote.problems, local.problems),
    news: mergeNews(remote.news, local.news),
    leaderboard: local.leaderboard || remote.leaderboard || defaultLeaderboardSettings(),
    newsFetchedAt: latestIso(remote.newsFetchedAt, local.newsFetchedAt),
    newsFetchAttemptAt: latestIso(remote.newsFetchAttemptAt, local.newsFetchAttemptAt),
    newsSyncError: local.newsSyncError || remote.newsSyncError || "",
    jobsFetchedAt: latestIso(remote.jobsFetchedAt, local.jobsFetchedAt),
    jobsFetchAttemptAt: latestIso(remote.jobsFetchAttemptAt, local.jobsFetchAttemptAt),
    jobsSyncError: local.jobsSyncError || remote.jobsSyncError || "",
    createdAt,
    updatedAt
  });
}

function mergeRecordsById(...lists) {
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((item) => {
    const id = item.id || makeId();
    byId.set(id, { ...(byId.get(id) || {}), ...item, id });
  });
  return [...byId.values()].sort((a, b) => new Date(a.date || a.createdAt || 0) - new Date(b.date || b.createdAt || 0));
}

function mergeCourseStates(...lists) {
  const byId = new Map();
  [].concat(...lists).filter(Boolean).forEach((item) => {
    const normalized = normalizeCourseStates([item])[0];
    if (!normalized) return;
    const previous = byId.get(normalized.courseId) || {};
    const previousIsNewer = latestIso(previous.updatedAt, normalized.updatedAt) === previous.updatedAt;
    byId.set(normalized.courseId, {
      ...previous,
      ...normalized,
      saved: Boolean(previous.saved || normalized.saved),
      inPath: Boolean(previous.inPath || normalized.inPath),
      done: Boolean(previous.done || normalized.done),
      note: previousIsNewer ? previous.note || normalized.note : normalized.note || previous.note,
      pathAddedAt: previous.pathAddedAt || normalized.pathAddedAt
    });
  });
  return [...byId.values()];
}

function mergeResumeState(remoteResume, localResume) {
  const remote = normalizeResumeState(remoteResume);
  const local = normalizeResumeState(localResume);
  const latest = latestIso(remote.updatedAt, local.updatedAt);
  const winner = latest
    ? (latest === remote.updatedAt ? remote : local)
    : ((local.text || local.fileName || local.review.length) ? local : remote);
  return normalizeResumeState({
    ...remote,
    ...local,
    ...winner,
    review: winner.review?.length ? winner.review : local.review.length ? local.review : remote.review
  });
}

function mergeJobs(remoteJobs, localJobs) {
  const byId = new Map();
  [...normalizeJobs(remoteJobs), ...normalizeJobs(localJobs)].forEach((job) => {
    byId.set(job.id, { ...(byId.get(job.id) || {}), ...job });
  });
  return [...byId.values()];
}

function mergeCourses(remoteCourses, localCourses) {
  const byId = new Map();
  [...normalizeCourses(remoteCourses), ...normalizeCourses(localCourses)].forEach((course) => {
    byId.set(course.id, { ...(byId.get(course.id) || {}), ...course });
  });
  return [...byId.values()];
}

function mergeCloudCommunity(remoteCommunity, localCommunity) {
  const byId = new Map();
  const threadsById = new Map();
  [normalizeCommunityStore(remoteCommunity), normalizeCommunityStore(localCommunity)].forEach((source) => {
    source.posts.forEach((post) => {
      const existing = byId.get(post.id) || {};
      byId.set(post.id, normalizeCommunityPost({
        ...existing,
        ...post,
        likes: [...new Set([...(existing.likes || []), ...(post.likes || [])])],
        comments: mergeRecordsById(existing.comments || [], post.comments || [])
      }));
    });
    source.threads.forEach((thread) => {
      const existing = threadsById.get(thread.id);
      if (!existing) {
        threadsById.set(thread.id, thread);
        return;
      }
      const messages = mergeRecordsById(existing.messages || [], thread.messages || [])
        .map(normalizeDirectMessage)
        .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
      threadsById.set(thread.id, normalizeMessageThread({
        ...existing,
        ...thread,
        participants: [...(existing.participants || []), ...(thread.participants || [])],
        messages,
        updatedAt: latestIso(existing.updatedAt, thread.updatedAt, messages.at(-1)?.createdAt)
      }));
    });
  });
  return {
    posts: [...byId.values()].sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0)),
    threads: [...threadsById.values()].sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0))
  };
}

function latestIso(...values) {
  const sorted = values.filter(Boolean).sort();
  return sorted[sorted.length - 1] || "";
}

function applyCloudSession(payload, options = {}) {
  const account = payload.account ? normalizeAccount(payload.account) : null;
  if (!account) return;
  const localFields = options.passwordHash ? { passwordHash: options.passwordHash } : {};
  upsertLocalAccount(account, localFields);

  cloudConfig = {
    ...cloudConfig,
    token: payload.token || cloudConfig.token || "",
    userId: account.id,
    lastSyncAt: new Date().toISOString(),
    lastError: ""
  };
  saveCloudConfig();

  const localState = options.localState || loadStateForUser(account.id);
  const remoteState = {
    ...(payload.state || {}),
    problemStates: mergeProblemStates(payload.state?.problemStates || [], payload.problemStates || [])
  };
  const nextState = options.merge === false
    ? normalizeState(Object.keys(remoteState).length ? remoteState : localState)
    : mergeCloudState(remoteState, localState);
  localStorage.setItem(userStateKey(account.id), JSON.stringify(localStatePayload(nextState)));
  state = nextState;

  community = options.merge === false
    ? normalizeCommunityStore(payload.community || community)
    : mergeCloudCommunity(payload.community, options.localCommunity || community);
  saveCommunity({ sync: false });
  queueCloudSync("state", 0);
  queueCloudSync("community", 0);
  queueCloudSync("account", 0);
}

async function sendCloudVerificationCode(email, purpose = "register") {
  return cloudApi("/auth/verification-code", {
    method: "POST",
    auth: false,
    body: { email, purpose }
  });
}

async function registerCloudAccount(account, password, localState, localCommunity, verificationCode = "") {
  return cloudApi("/auth/register", {
    method: "POST",
    auth: false,
    body: {
      account: sanitizeAccountForCloud(account),
      password,
      verificationCode,
      state: cloudStatePayload(localState),
      problemStates: localState.problemStates || [],
      problems: getUserCatalogProblems(localState.problems),
      community: localCommunity
    }
  });
}

async function loginCloudAccount(email, password) {
  return cloudApi("/auth/login", {
    method: "POST",
    auth: false,
    body: { email, password }
  });
}

async function loginCloudGoogle(account, credential, localState, localCommunity) {
  return cloudApi("/auth/google", {
    method: "POST",
    auth: false,
    body: {
      account: sanitizeAccountForCloud(account),
      credential,
      state: cloudStatePayload(localState),
      problemStates: localState.problemStates || [],
      problems: getUserCatalogProblems(localState.problems),
      community: localCommunity
    }
  });
}

function sanitizeAccountForCloud(account) {
  const { passwordHash, ...publicAccount } = account || {};
  return publicAccount;
}

function queueCloudSync(scope, delay = CLOUD_SYNC_DEBOUNCE_MS) {
  if (!currentUser || !cloudConfig.token || cloudConfig.userId !== currentUser.id) return;
  cloudDirty[scope] = true;
  window.clearTimeout(cloudSyncTimer);
  cloudSyncTimer = window.setTimeout(flushCloudSync, delay);
}

async function flushCloudSync() {
  if (!canUseCloud()) return;
  if (cloudSyncInFlight) {
    window.clearTimeout(cloudSyncTimer);
    cloudSyncTimer = window.setTimeout(flushCloudSync, CLOUD_SYNC_DEBOUNCE_MS);
    return;
  }

  const dirty = { ...cloudDirty };
  if (!dirty.state && !dirty.community && !dirty.account) return;
  cloudDirty = { state: false, community: false, account: false };
  cloudSyncInFlight = true;

  try {
    const body = {};
    if (dirty.state) {
      body.state = cloudStatePayload(state);
      body.problemStates = state.problemStates || [];
      body.problems = getUserCatalogProblems(state.problems);
    }
    if (dirty.community) body.community = community;
    if (dirty.account) body.account = sanitizeAccountForCloud(currentUser);
    const result = await cloudApi("/sync", { method: "POST", body });
    cloudConfig.lastSyncAt = result.syncedAt || new Date().toISOString();
    cloudConfig.lastError = "";
    saveCloudConfig();
    renderCloudStatus();
  } catch (error) {
    cloudDirty = {
      state: cloudDirty.state || dirty.state,
      community: cloudDirty.community || dirty.community,
      account: cloudDirty.account || dirty.account
    };
    cloudConfig.lastError = error.message || "Cloud sync failed";
    saveCloudConfig();
    renderCloudStatus();
  } finally {
    cloudSyncInFlight = false;
  }
}

async function syncCloudNow() {
  if (!currentUser) return;
  if (!cloudConfig.token || cloudConfig.userId !== currentUser.id) {
    els.settingsMessage.textContent = t("cloudNoSession");
    return;
  }
  cloudDirty = { state: true, community: true, account: true };
  els.settingsMessage.textContent = t("cloudSyncing");
  await flushCloudSync();
  els.settingsMessage.textContent = getCloudStatusText();
}

function renderCloudStatus() {
  if (els.settingsMessage && !els.settingsMessage.textContent.includes("已保存")) {
    els.settingsMessage.textContent = getCloudStatusText();
  }
}

function getCloudStatusText() {
  if (!cloudConfig.token || cloudConfig.userId !== currentUser?.id) return t("cloudDisconnected");
  if (cloudConfig.lastError) return t("cloudFailed", { error: cloudConfig.lastError });
  if (cloudSyncInFlight) return t("cloudSyncing");
  if (cloudConfig.lastSyncAt) return t("cloudSynced", { date: formatDate(cloudConfig.lastSyncAt) });
  return t("cloudConnected");
}

function makeId() {
  return globalThis.crypto?.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function migrateLegacyState(userId) {
  const raw = localStorage.getItem(STORAGE_KEY);
  if (!raw || localStorage.getItem(userStateKey(userId))) return;
  try {
    const legacy = normalizeState(JSON.parse(raw));
    localStorage.setItem(userStateKey(userId), JSON.stringify(localStatePayload(legacy)));
    localStorage.removeItem(STORAGE_KEY);
  } catch {
    localStorage.removeItem(STORAGE_KEY);
  }
}

function renderSession() {
  currentUser = getCurrentUser();
  state = loadState();
  problemSocial = new Map();
  problemSocialNotice = "";
  pruneProblemCatalog();
  document.body.classList.toggle("is-authenticated", Boolean(currentUser));
  window.scrollTo(0, 0);
  consumeIncomingCapture();

  els.authShell.classList.toggle("hidden", Boolean(currentUser));
  els.appShell.classList.toggle("hidden", !currentUser);
  applySidebarState();
  els.regionRank.classList.toggle("hidden", !currentUser);
  els.userChip.classList.toggle("hidden", !currentUser);
  els.languageSelect.classList.remove("hidden");
  [els.settingsBtn, els.exportBtn, els.importInput?.parentElement, els.resetBtn, els.logoutBtn].filter(Boolean).forEach((node) => {
    node.classList.toggle("hidden", !currentUser);
  });

  if (!currentUser) {
    els.todayLine.textContent = t("startAfterLogin");
    els.authMessage.textContent = getAuthReadyMessage();
    renderGoogleClientInput();
    applyLanguage();
    return;
  }

  renderUserChip();
  renderAll();
  renderMentalMath();
  refreshProblemCatalog();
  refreshProblemSocial();
}

function renderUserChip() {
  els.userName.textContent = currentUser.name || currentUser.email || "Quant";
  els.userProvider.textContent = currentUser.provider === "google" ? "Google" : "Local";
  els.userAvatar.innerHTML = "";
  if (els.commandUserName) els.commandUserName.textContent = currentUser.name || currentUser.email || "Quant";
  if (els.commandUserProvider) els.commandUserProvider.textContent = currentUser.provider === "google" ? "Google" : t("accountBadge");
  if (els.commandUserAvatar) els.commandUserAvatar.innerHTML = "";

  if (currentUser.picture) {
    const image = document.createElement("img");
    image.src = currentUser.picture;
    image.alt = "";
    els.userAvatar.appendChild(image);
    if (els.commandUserAvatar) {
      const commandImage = image.cloneNode();
      els.commandUserAvatar.appendChild(commandImage);
    }
    return;
  }

  const image = document.createElement("img");
  image.src = "assets/generated/shark-avatar-happy.webp?v=premium-system-4";
  image.alt = "";
  els.userAvatar.appendChild(image);
  if (els.commandUserAvatar) {
    const commandImage = image.cloneNode();
    els.commandUserAvatar.appendChild(commandImage);
  }
}

function renderAccount() {
  if (!currentUser || !els.accountForm) return;
  delete els.accountForm.dataset.avatarData;
  delete els.accountForm.dataset.avatarCleared;
  els.accountNameInput.value = currentUser.name || "";
  els.accountEmailInput.value = currentUser.email || "";
  els.accountAvatarUrl.value = currentUser.picture && !currentUser.picture.startsWith("data:") ? currentUser.picture : "";
  renderCountryOptions(els.accountCountrySelect, currentUser.country);
  renderRegionOptions(els.accountRegionSelect, currentUser.country, currentUser.region);
  if (els.accountGraduationTermInput) els.accountGraduationTermInput.value = currentUser.graduationTerm || DEFAULT_GRADUATION_TERM;
  renderAccountResumeMeta();
  els.accountCurrentPassword.value = "";
  els.accountProviderText.textContent = currentUser.provider === "google" ? "Google" : "Local";
  els.accountCreatedText.textContent = currentUser.createdAt ? formatNewsDate(currentUser.createdAt) : "-";
  els.accountRankText.textContent = `${getCountryLabel(currentUser.country)} · ${getRegionLabel(currentUser.region)} · ${getRank(getQuantScore())}`;
  renderAccountAvatarPreview(currentUser.picture, currentUser.name || currentUser.email || "Q");
}

function renderAccountAvatarPreview(source, fallback) {
  if (!els.accountAvatarPreview) return;
  els.accountAvatarPreview.innerHTML = "";
  if (source) {
    const image = document.createElement("img");
    image.src = source;
    image.alt = "";
    els.accountAvatarPreview.appendChild(image);
    return;
  }
  els.accountAvatarPreview.textContent = getInitials(fallback || "Q");
}

function updateAccountAvatarPreview() {
  const source = els.accountForm.dataset.avatarData || els.accountAvatarUrl.value.trim();
  delete els.accountForm.dataset.avatarCleared;
  renderAccountAvatarPreview(source, els.accountNameInput.value || currentUser?.name || currentUser?.email || "Q");
}

function handleAccountAvatarFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (!file.type.startsWith("image/")) {
    els.accountMessage.textContent = "请选择图片文件。";
    event.target.value = "";
    return;
  }
  if (file.size > 1_800_000) {
    els.accountMessage.textContent = "头像图片太大，先换一张 1.8MB 以下的图片。";
    event.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    els.accountForm.dataset.avatarData = String(reader.result);
    delete els.accountForm.dataset.avatarCleared;
    els.accountAvatarUrl.value = "";
    renderAccountAvatarPreview(String(reader.result), els.accountNameInput.value || currentUser?.name || "Q");
  });
  reader.readAsDataURL(file);
}

function clearAccountAvatar() {
  delete els.accountForm.dataset.avatarData;
  els.accountForm.dataset.avatarCleared = "true";
  els.accountAvatarUrl.value = "";
  els.accountAvatarFile.value = "";
  renderAccountAvatarPreview("", els.accountNameInput.value || currentUser?.name || currentUser?.email || "Q");
}

async function saveAccount() {
  if (!currentUser) return;
  const name = els.accountNameInput.value.trim();
  const email = normalizeEmail(els.accountEmailInput.value);
  const country = normalizeCountry(els.accountCountrySelect.value);
  const region = normalizeRegionForCountry(els.accountRegionSelect.value, country);
  const graduationTerm = normalizeGraduationTerm(els.accountGraduationTermInput?.value);
  const avatarUrl = els.accountAvatarUrl.value.trim();
  const picture = els.accountForm.dataset.avatarCleared
    ? ""
    : els.accountForm.dataset.avatarData || avatarUrl || currentUser.picture || "";

  if (!name || !email) {
    els.accountMessage.textContent = "昵称和邮箱都要填。";
    return;
  }

  const duplicate = auth.accounts.some((account) => account.id !== currentUser.id && normalizeEmail(account.email) === email);
  if (duplicate) {
    els.accountMessage.textContent = "这个邮箱已经被另一个账户使用。";
    return;
  }

  const updates = {
    name,
    email,
    country,
    region,
    graduationTerm,
    picture,
    updatedAt: new Date().toISOString()
  };

  if (currentUser.provider === "local" && normalizeEmail(currentUser.email) !== email) {
    const password = els.accountCurrentPassword.value;
    if (!password) {
      els.accountMessage.textContent = "更改本地账户邮箱需要输入当前密码。";
      return;
    }
    const oldHash = await hashPassword(currentUser.email, password);
    if (oldHash !== currentUser.passwordHash) {
      els.accountMessage.textContent = "当前密码不对，邮箱没有更新。";
      return;
    }
    updates.passwordHash = await hashPassword(email, password);
  }

  auth.accounts = auth.accounts.map((account) => (account.id === currentUser.id ? { ...account, ...updates } : account));
  saveAuth();
  currentUser = getCurrentUser();
  state.leaderboard = normalizeLeaderboardSettings({ ...state.leaderboard, country, region });
  saveState();
  queueCloudSync("account", 0);
  renderUserChip();
  renderAll();
  switchModule("account");
  els.accountMessage.textContent = t("accountUpdated");
}

function switchAuthTab(tab) {
  document.querySelectorAll("[data-auth-tab]").forEach((button) => {
    button.classList.toggle("active", button.dataset.authTab === tab);
  });
  els.loginForm.classList.toggle("hidden", tab !== "login");
  els.registerForm.classList.toggle("hidden", tab !== "register");
  els.authMessage.textContent = "";
}

async function sendRegisterVerificationCode() {
  const email = normalizeEmail(els.registerEmail.value);
  if (!email || !email.includes("@")) {
    showAuthMessage(t("authNeedEmail"));
    return;
  }
  if (auth.accounts.some((account) => normalizeEmail(account.email) === email)) {
    showAuthMessage(t("authDuplicateEmail"));
    return;
  }

  delete els.registerForm.dataset.verificationOptional;
  setRegisterCodeButtonBusy(true, t("sending"));
  try {
    const result = await sendCloudVerificationCode(email, "register");
    startRegisterCodeCooldown(Number(result.cooldownSeconds || 60));
    const devCode = result.devCode ? t("authDevCode", { code: result.devCode }) : "";
    const delivery = result.delivery === "dev" ? t("authDeliveryDev") : t("authDeliveryEmail");
    showAuthMessage(t("authVerificationSent", { email, delivery, devCode }));
  } catch (error) {
    if (!error.status) {
      els.registerForm.dataset.verificationOptional = "true";
      showAuthMessage(t("authCloudVerificationUnavailable"));
    } else {
      showAuthMessage(getVerificationErrorMessage(error));
    }
    setRegisterCodeButtonBusy(false);
  }
}

function setRegisterCodeButtonBusy(isBusy, label = t("sendVerificationCode")) {
  if (!els.sendRegisterCodeBtn) return;
  els.sendRegisterCodeBtn.disabled = Boolean(isBusy);
  els.sendRegisterCodeBtn.textContent = label;
}

function startRegisterCodeCooldown(seconds) {
  window.clearInterval(registerCodeTimer);
  let remaining = Math.max(0, Math.floor(seconds || 0));
  const render = () => {
    if (!remaining) {
      setRegisterCodeButtonBusy(false);
      window.clearInterval(registerCodeTimer);
      registerCodeTimer = null;
      return;
    }
    setRegisterCodeButtonBusy(true, `${t("resendIn")} ${remaining}s`);
    remaining -= 1;
  };
  render();
  registerCodeTimer = window.setInterval(render, 1000);
}

async function registerLocal() {
  try {
    const name = els.registerName.value.trim();
    const email = normalizeEmail(els.registerEmail.value);
    const password = els.registerPassword.value;
    const verificationCode = els.registerVerificationCode.value.trim();
    const verificationOptional = els.registerForm.dataset.verificationOptional === "true";

    if (!name || !email || password.length < 6) {
      showAuthMessage(t("authMissingRegisterFields"));
      return;
    }
    if (!verificationCode && !verificationOptional) {
      showAuthMessage(t("authNeedVerificationCode"));
      return;
    }

    if (auth.accounts.some((account) => normalizeEmail(account.email) === email)) {
      showAuthMessage(t("authDuplicateEmail"));
      return;
    }

    const account = {
      id: makeId(),
      provider: "local",
      name,
      email,
      country: "china",
      region: "上海",
      graduationTerm: DEFAULT_GRADUATION_TERM,
      passwordHash: await hashPassword(email, password),
      createdAt: new Date().toISOString()
    };

    migrateLegacyState(account.id);
    const localState = loadStateForUser(account.id);

    if (!verificationOptional) {
      try {
        const cloudSession = await registerCloudAccount(account, password, localState, community, verificationCode);
        applyCloudSession(cloudSession, {
          localState,
          localCommunity: community,
          passwordHash: account.passwordHash
        });
        els.registerForm.reset();
        showAuthMessage(t("authCreatedSynced"));
        renderSession();
        return;
      } catch (error) {
        if (error.status) {
          showAuthMessage(getVerificationErrorMessage(error));
          return;
        }
        showAuthMessage(t("authCloudLocalCreated"));
      }
    }

    auth.accounts.push(account);
    auth.currentUserId = account.id;
    saveAuth();
    els.registerForm.reset();
    renderSession();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error));
  }
}

async function loginLocal() {
  try {
    const email = normalizeEmail(els.loginEmail.value);
    const password = els.loginPassword.value;
    const account = auth.accounts.find((item) => item.provider === "local" && normalizeEmail(item.email) === email);

    try {
      const cloudSession = await loginCloudAccount(email, password);
      const remoteAccount = normalizeAccount(cloudSession.account || {});
      const localAccount = auth.accounts.find((item) => item.id === remoteAccount.id || normalizeEmail(item.email) === email);
      const localState = localAccount ? loadStateForUser(localAccount.id) : createBaseState();
      const localFields = localAccount?.passwordHash
        ? { passwordHash: localAccount.passwordHash }
        : { passwordHash: await hashPassword(email, password) };
      applyCloudSession(cloudSession, {
        localState,
        localCommunity: community,
        ...localFields
      });
      els.loginForm.reset();
      showAuthMessage("");
      renderSession();
      return;
    } catch (error) {
      if (!account && error.status && error.status !== 401) {
        showAuthMessage(t("authCloudNoLocal"));
        return;
      }
      if (!account && error.status === 401) {
        showAuthMessage(t("authCloudLoginFailed"));
        return;
      }
    }

    if (!account) {
      showAuthMessage(t("authNoLocalAccount"));
      return;
    }

    const passwordHash = await hashPassword(email, password);
    if (passwordHash !== account.passwordHash) {
      showAuthMessage(t("authWrongPassword"));
      return;
    }

    auth.currentUserId = account.id;
    saveAuth();
    migrateLegacyState(account.id);
    const localState = loadStateForUser(account.id);
    try {
      const cloudSession = await loginCloudAccount(email, password);
      applyCloudSession(cloudSession, {
        localState,
        localCommunity: community,
        passwordHash: account.passwordHash
      });
    } catch {
      cloudConfig.lastError = getLanguage() === "en"
        ? "Cloud API is not connected; this session is using the local account."
        : "云端 API 未连接，本次使用本地账户。";
      saveCloudConfig();
    }
    els.loginForm.reset();
    showAuthMessage("");
    renderSession();
  } catch (error) {
    showAuthMessage(getAuthErrorMessage(error));
  }
}

function logout() {
  auth.currentUserId = "";
  saveAuth();
  currentUser = null;
  state = createBaseState();
  renderSession();
  initGoogleLogin();
}

function saveGoogleClientId() {
  auth.googleClientId = els.googleClientIdInput?.value.trim() || "";
  saveAuth();
  renderGoogleClientInput();
  initGoogleLogin();
}

function renderGoogleClientInput() {
  if (els.googleClientIdInput) els.googleClientIdInput.value = auth.googleClientId || "";
}

function renderGooglePlaceholder() {
  if (!els.googleButton) return;
  els.googleButton.innerHTML = `
    <button class="auth-provider-button disabled" type="button" disabled aria-disabled="true">
      <span class="google-mark" aria-hidden="true">G</span>
      <span>${escapeHtml(t("googleContinue"))}</span>
      <small>${escapeHtml(t("notEnabled"))}</small>
    </button>
  `;
}

function initGoogleLogin() {
  if (!els.googleButton) return;
  renderGoogleClientInput();
  els.googleButton.innerHTML = "";

  if (!GOOGLE_LOGIN_ENABLED) {
    googleInitRetries = 0;
    renderGooglePlaceholder();
    return;
  }

  if (!auth.googleClientId) {
    googleInitRetries = 0;
    renderGooglePlaceholder();
    return;
  }

  if (!window.google?.accounts?.id) {
    if (googleInitRetries < 12) {
      googleInitRetries += 1;
      showAuthMessage(t("authGoogleLoading"));
      window.setTimeout(initGoogleLogin, 500);
    } else {
      showAuthMessage(t("authGoogleLoadFailed"));
    }
    return;
  }

  googleInitRetries = 0;
  window.google.accounts.id.initialize({
    client_id: auth.googleClientId,
    callback: handleGoogleCredential,
    auto_select: false
  });
  window.google.accounts.id.renderButton(els.googleButton, {
    theme: "outline",
    size: "large",
    shape: "rectangular",
    text: "signin_with",
    width: Math.min(420, els.googleButton.clientWidth || 420)
  });
  showAuthMessage(t("authGoogleEnabled"));
}

async function handleGoogleCredential(response) {
  try {
    const payload = parseJwt(response.credential);
    if (payload.aud !== auth.googleClientId) {
      showAuthMessage(t("authGoogleClientMismatch"));
      return;
    }

    const id = `google:${payload.sub}`;
    const existing = auth.accounts.find((account) => account.id === id);
    const account = {
      ...(existing || {}),
      id,
      provider: "google",
      name: payload.name || payload.email || "Google User",
      email: payload.email || "",
      country: existing?.country || "china",
      region: existing?.region || "上海",
      graduationTerm: existing?.graduationTerm || DEFAULT_GRADUATION_TERM,
      picture: payload.picture || "",
      updatedAt: new Date().toISOString()
    };

    if (existing) {
      auth.accounts = auth.accounts.map((item) => (item.id === id ? account : item));
    } else {
      auth.accounts.push({ ...account, createdAt: new Date().toISOString() });
    }

    auth.currentUserId = id;
    saveAuth();
    migrateLegacyState(id);
    const localState = loadStateForUser(id);
    try {
      const cloudSession = await loginCloudGoogle(account, response.credential, localState, community);
      applyCloudSession(cloudSession, { localState, localCommunity: community });
    } catch {
      cloudConfig.lastError = getLanguage() === "en"
        ? "Google signed in locally; cloud API is not connected."
        : "Google 已本地登录；云端 API 未连接。";
      saveCloudConfig();
    }
    renderSession();
  } catch {
    showAuthMessage(t("authGoogleParseFailed"));
  }
}

function parseJwt(token) {
  const part = token.split(".")[1];
  const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
  const json = atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
  return JSON.parse(decodeURIComponent([...json].map((char) => `%${char.charCodeAt(0).toString(16).padStart(2, "0")}`).join("")));
}

async function hashPassword(email, password) {
  const value = `${normalizeEmail(email)}:${password}`;
  if (globalThis.crypto?.subtle) {
    const data = new TextEncoder().encode(value);
    const digest = await crypto.subtle.digest("SHA-256", data);
    return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, "0")).join("");
  }
  return `fallback-${fallbackHash(value)}`;
}

function fallbackHash(value) {
  let hash = 2166136261;
  for (let index = 0; index < value.length; index += 1) {
    hash ^= value.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

function getAuthReadyMessage() {
  if (location.protocol === "file:") {
    return t("authReadyFile");
  }
  return GOOGLE_LOGIN_ENABLED
    ? t("authReadyCloud")
    : t("authReadyLocal");
}

function getVerificationErrorMessage(error) {
  const raw = String(error?.message || "");
  if (error?.status === 409) return t("authDuplicateEmail");
  if (error?.status === 403) return t("verificationForbidden");
  if (error?.status === 429) return raw.includes("wait") ? t("verificationTooSoon") : t("verificationTooMany");
  if (error?.status === 502) return t("verificationEmailDown");
  if (/verification|code/i.test(raw)) return t("verificationInvalid");
  return t("verificationFailed");
}

function getAuthErrorMessage(error) {
  if (location.protocol === "file:") {
    return t("authStorageFileBlocked");
  }
  if (/quota|storage|localStorage|SecurityError/i.test(`${error?.name || ""} ${error?.message || ""}`)) {
    return t("authStorageBlocked");
  }
  return t("authOperationFailed");
}

function normalizeEmail(email) {
  return String(email || "").trim().toLowerCase();
}

function normalizeAccount(account = {}) {
  const country = normalizeCountry(account.country || inferCountryFromRegion(account.region));
  return {
    ...account,
    country,
    region: normalizeRegionForCountry(account.region, country),
    graduationTerm: normalizeGraduationTerm(account.graduationTerm)
  };
}

function normalizeGraduationTerm(value) {
  const term = String(value || "").trim();
  return /^\d{4}-\d{2}$/.test(term) ? term : DEFAULT_GRADUATION_TERM;
}

function normalizeCountry(country) {
  const key = String(country || "").trim();
  const aliases = {
    cn: "china",
    china: "china",
    "中国": "china",
    us: "unitedStates",
    usa: "unitedStates",
    "u.s.": "unitedStates",
    "united states": "unitedStates",
    unitedStates: "unitedStates",
    "美国": "unitedStates",
    uk: "unitedKingdom",
    gb: "unitedKingdom",
    britain: "unitedKingdom",
    "united kingdom": "unitedKingdom",
    unitedKingdom: "unitedKingdom",
    "英国": "unitedKingdom",
    sg: "singapore",
    singapore: "singapore",
    "新加坡": "singapore"
  };
  return locationDefs[key] ? key : aliases[key] || "china";
}

function inferCountryFromRegion(region) {
  const value = String(region || "").trim();
  if (!value) return "china";
  if (locationDefs.china.regions.includes(value) || value === "Shanghai") return "china";
  if (locationDefs.unitedStates.regions.includes(value)) return "unitedStates";
  if (locationDefs.unitedKingdom.regions.includes(value)) return "unitedKingdom";
  if (locationDefs.singapore.regions.includes(value)) return "singapore";
  return "china";
}

function normalizeRegionForCountry(region, country) {
  const normalizedCountry = normalizeCountry(country);
  const regions = locationDefs[normalizedCountry].regions;
  const aliases = {
    Shanghai: "上海",
    Beijing: "北京",
    Guangdong: "广东",
    Zhejiang: "浙江",
    Jiangsu: "江苏",
    "New York State": "New York",
    "Washington DC": "District of Columbia",
    London: "Greater London"
  };
  const raw = String(region || "").trim();
  const value = aliases[raw] || raw;
  return regions.includes(value) ? value : getDefaultRegion(normalizedCountry);
}

function getDefaultRegion(country) {
  const normalizedCountry = normalizeCountry(country);
  if (normalizedCountry === "china") return "上海";
  if (normalizedCountry === "unitedStates") return "California";
  if (normalizedCountry === "unitedKingdom") return "Greater London";
  if (normalizedCountry === "singapore") return "Central Region";
  return locationDefs[normalizedCountry].regions[0];
}

function getCountryLabel(country) {
  const def = locationDefs[normalizeCountry(country)];
  return getLanguage() === "en" ? def.nameEn || def.name : def.name;
}

function getRegionLabel(region) {
  if (getLanguage() === "en") return regionEnLabels[region] || region;
  return region;
}

function renderCountryOptions(select, selectedCountry = "china") {
  if (!select) return;
  const selected = normalizeCountry(selectedCountry);
  select.innerHTML = "";
  Object.entries(locationDefs).forEach(([key, def]) => {
    const option = document.createElement("option");
    option.value = key;
    option.textContent = getCountryLabel(key);
    option.selected = key === selected;
    select.appendChild(option);
  });
  select.value = selected;
}

function renderRegionOptions(select, country = "china", selectedRegion = "") {
  if (!select) return;
  const normalizedCountry = normalizeCountry(country);
  const selected = normalizeRegionForCountry(selectedRegion, normalizedCountry);
  select.innerHTML = "";
  locationDefs[normalizedCountry].regions.forEach((region) => {
    const option = document.createElement("option");
    option.value = region;
    option.textContent = getRegionLabel(region);
    option.selected = region === selected;
    select.appendChild(option);
  });
  select.value = selected;
}

function defaultLeaderboardSettings() {
  const country = currentUser?.country || "china";
  const region = currentUser?.region || getDefaultRegion(country);
  return {
    scope: "region",
    country: normalizeCountry(country),
    region: normalizeRegionForCountry(region, country),
    metric: "overall"
  };
}

function normalizeLeaderboardSettings(settings = {}) {
  const fallback = defaultLeaderboardSettings();
  const country = normalizeCountry(settings.country || fallback.country);
  const metric = settings.metric && (settings.metric === "overall" || skillDefs[settings.metric]) ? settings.metric : fallback.metric;
  const scope = ["global", "country", "region"].includes(settings.scope) ? settings.scope : fallback.scope;
  return {
    scope,
    country,
    region: normalizeRegionForCountry(settings.region || fallback.region, country),
    metric
  };
}

function getInitials(value) {
  const cleaned = value.trim();
  if (!cleaned) return "Q";
  const parts = cleaned.split(/\s+/).filter(Boolean);
  if (parts.length >= 2) return `${parts[0][0]}${parts[1][0]}`.toUpperCase();
  return cleaned.slice(0, 2).toUpperCase();
}

function showAuthMessage(message) {
  if (els.authMessage) els.authMessage.textContent = message;
}

function applyLanguage() {
  const language = getLanguage();
  document.documentElement.lang = language === "en" ? "en" : "zh-CN";
  document.title = t("appTitle");
  if (els.languageSelect) els.languageSelect.value = language;
  if (els.settingsLanguageSelect) els.settingsLanguageSelect.value = language;
  applyStaticTranslations();
  if (els.googleButton?.querySelector(".auth-provider-button.disabled")) renderGooglePlaceholder();
  if (!currentUser && els.authMessage && (
    !els.authMessage.textContent.trim()
    || textMatchesI18nKeys(els.authMessage.textContent, ["authReadyFile", "authReadyCloud", "authReadyLocal"])
  )) {
    els.authMessage.textContent = getAuthReadyMessage();
  }

  setButtonLabel('[data-module-tab="overview"]', t("overview"));
  setButtonLabel('[data-module-tab="plan"]', t("plan"));
  setButtonLabel('[data-module-tab="experiences"]', t("experiences"));
  setButtonLabel('[data-module-tab="community"]', t("community"));
  setButtonLabel('[data-module-tab="problems"]', t("problems"));
  setButtonLabel('[data-module-tab="interview"]', t("interview"));
  setButtonLabel('[data-module-tab="pk"]', t("pk"));
  setButtonLabel('[data-module-tab="news"]', t("news"));
  setButtonLabel('[data-module-tab="network"]', t("network"));
  setButtonLabel('[data-module-tab="messages"]', t("messages"));
  setButtonLabel('[data-module-tab="resume"]', t("resume"));
  setButtonLabel('[data-module-tab="jobs"]', t("jobs"));
  setButtonLabel('[data-module-tab="companies"]', t("companies"));
  setButtonLabel('[data-module-tab="courses"]', t("courses"));
  setButtonLabel('[data-module-tab="skills"]', t("skills"));
  setButtonLabel('[data-module-tab="tools"]', t("tools"));
  setButtonLabel('[data-module-tab="memory"]', t("memory"));
  setButtonLabel('[data-module-tab="settings"]', t("settings"));
  setText('[data-problem-view="all"]', t("allProblems"));
  setText('[data-problem-view="saved"]', t("savedProblems"));
  setText('[data-problem-view="ranking"]', t("popularProblems"));
  setText(".problem-ranking-header h3", t("problemRankingTitle"));
  setText(".problem-ranking-header p", t("problemRankingHint"));
  setText("#skillsPageTitle", t("skills"));
  setText("#skillsPageSubtitle", t("skillPageSubtitle"));
  setText("#skillsScoreLabel", t("quantScore"));
  setText("#skillsScoreCopy", t("skillScoreCopy"));
  setText("#skillsEntriesLabel", t("practiceRecords"));
  setText("#skillsAverageLabel", t("averageScore"));
  setText("#skillsWeakestLabel", t("weakestSkill"));
  setText("#skillRadarTitle", t("skillRadarTitle"));
  setText("#skillRadarHint", t("skillRadarHint"));
  setText(".sidebar-helper strong", t("todayGuide"));
  updatePrepTaskIndicator();

  setPlaceholder("globalSearchInput", t("appSearchPlaceholder"));
  setAttribute("#globalSearchInput", "aria-label", t("appSearchPlaceholder"));
  setTexts(".app-command-actions .app-stat-pill small", [t("commandStreakLabel"), t("commandChatLabel")]);
  updateCheckInPill();
  setText("#todoDockButtonLabel", t("todoButton"));
  setText("#todoDockEyebrow", t("todoEyebrow"));
  setText("#todoDockTitle", t("todoTitle"));
  setPlaceholder("todoDockAddInput", t("todoAddPlaceholder"));
  setButtonLabel("#todoDockAddForm .secondary-button", t("todoAdd"));
  setAttribute(".app-account-chip", "aria-label", t("accountInfo"));
  setAttribute(".app-settings-button", "aria-label", t("settings"));
  applySidebarState();
  setButtonLabel("#generateStudyPlanBtn", t("designStudyPlan"));

  setText(".summary-copy .rank-label", t("rankLabel"));
  setText(".total-xp span:last-child", t("scoreSuffix"));
  setTexts(".summary-metrics small", [t("streak"), t("records"), t("weeklyXp")]);
  setText(".log-panel h2", t("todayLog"));
  setPlaceholder("logText", t("todayLogPlaceholder"));
  setPlaceholder("durationInput", t("minutesPlaceholder"));
  setSelectOptionLabels("difficultyInput", [t("difficultyNormal"), t("difficultyMedium"), t("difficultyHard")]);
  setButtonLabel("#logForm .primary-button", t("submitLog"));
  setText(".leaderboard-panel h2", t("leaderboard"));
  setText(".overview-community h2", t("community"));
  setText("#overviewCommunitySummary", t("overviewCommunitySummary"));
  setText(".community-section h2", t("community"));
  setText("#communitySummary", t("communitySummary"));
  setText("#messagesPageTitle", t("messages"));
  setText("#messagesSummary", t("messagesSummary"));
  setPlaceholder("messageComposerInput", t("messageComposerPlaceholder"));
  setText(".problem-page-copy .rank-label", t("problemEyebrow"));
  setText(".problem-page-copy h2", t("problemTitle"));
  setText(".problem-page-copy p", t("problemSubtitle"));
  setPlaceholder("problemSearch", t("problemSearchPlaceholder"));
  setAttribute("#addProblemBtn", "title", t("addProblem"));
  setAttribute("#addProblemBtn", "aria-label", t("addProblem"));
  setText(".settings-section h2", t("settings"));
  if (els.settingsMessage && !/已保存|saved|同步|sync|连接|connect/i.test(els.settingsMessage.textContent)) {
    els.settingsMessage.textContent = t("settingsMessageDefault");
  }
  setTexts(".settings-panel h3", [t("preferences"), t("data")]);
  setText(".account-section h2", t("accountInfo"));
  setText(".account-meta-panel h3", t("accountInfo"));
  if (els.accountMessage && !/已更新|updated/i.test(els.accountMessage.textContent)) {
    els.accountMessage.textContent = t("accountMessage");
  }
  setTexts(".account-meta-panel dt", [t("provider"), t("createdAt"), t("currentRank")]);

  setLabelFor("accountNameInput", t("nickname"));
  setLabelFor("accountEmailInput", t("email"));
  setLabelFor("accountCountrySelect", t("country"));
  setLabelFor("accountRegionSelect", t("region"));
  setLabelFor("accountGraduationTermInput", t("graduationTerm"));
  setLabelFor("accountResumeFile", t("resumeUpload"));
  setLabelFor("accountCurrentPassword", t("currentPassword"));
  setLabelFor("settingsLanguageSelect", t("language"));
  setLabelFor("settingsCountrySelect", t("defaultCountry"));
  setLabelFor("settingsRegionSelect", t("defaultRegion"));

  setButtonLabel("#accountForm .primary-button", t("saveAccount"));
  setText(".resume-section h2", t("resumeModule"));
  setText("#resumeSummary", t("resumeSummary"));
  setLabelFor("resumeText", t("resumeContent"));
  setPlaceholder("resumeText", t("resumePlaceholder"));
  setButtonLabel("#reviewResumeBtn", t("reviewResume"));
  setButtonLabel("#saveResumeBtn", t("saveResume"));
  setText(".resume-panel h3", t("resumeReviewTitle"));
  setText(".jobs-section h2", t("jobsModule"));
  setText("#jobsSummary", t("jobsSummary"));
  setText("#companiesPageTitle", t("companies"));
  setText("#companiesSummary", t("companiesSummary"));
  setText("#problemCompanyTitle", getLanguage() === "en" ? "Prepare by Company" : "按公司刷题");
  setText("#problemCompanySummary", getLanguage() === "en"
    ? "Practice tagged interview questions from quant firms."
    : "从真实 quant firm 高频题出发，按公司题源定向练习。");
  setButtonLabel("#problemCompanyClearBtn", t("allCompanies"));
  setButtonLabel('[data-company-tier="all"]', t("allCompanies"));
  setButtonLabel('[data-company-tier="s"]', "Tier S");
  setButtonLabel('[data-company-tier="a"]', "Tier A");
  setButtonLabel('[data-company-tier="b"]', "Tier B");
  setButtonLabel('[data-job-filter="all"]', t("allJobs"));
  setButtonLabel('[data-job-filter="internship"]', t("internship"));
  setButtonLabel('[data-job-filter="fulltime"]', t("fulltime"));
  setAttribute("#refreshJobsBtn", "title", t("refreshJobs"));
  setAttribute("#refreshJobsBtn", "aria-label", t("refreshJobs"));
  setText(".news-section h2", t("newsModuleTitle"));
  setText("#newsIntelTitle", t("newsIntelTitle"));
  setText("#newsIntelSummary", t("newsIntelSummary"));
  setText("#newsSocialHint", t("newsSocialHint"));
  setAttribute("#addNewsBtn", "title", t("newsAdd"));
  setAttribute("#addNewsBtn", "aria-label", t("newsAdd"));
  setAttribute("#refreshNewsBtn", "title", t("refreshNews"));
  setAttribute("#refreshNewsBtn", "aria-label", t("refreshNews"));
  setButtonLabel('[data-news-topic="all"]', t("newsTopicAll"));
  setButtonLabel('[data-news-topic="quantFirms"]', t("newsTopicQuantFirms"));
  setButtonLabel('[data-news-topic="marketStructure"]', t("newsTopicMarketStructure"));
  setButtonLabel('[data-news-topic="aiInfra"]', t("newsTopicAiInfra"));
  setButtonLabel('[data-news-topic="recruiting"]', t("newsTopicRecruiting"));
  setButtonLabel('[data-news-source-filter="all"]', t("newsSourceAll"));
  setButtonLabel('[data-news-source-filter="news"]', t("newsSourceNews"));
  setButtonLabel('[data-news-source-filter="official"]', t("newsSourceOfficial"));
  setButtonLabel('[data-news-source-filter="social"]', t("newsSourceSocial"));
  setSelectOptionLabels("newsSourceType", [
    t("newsSourceNews"),
    t("newsSourceOfficial"),
    t("newsSourceLinkedIn"),
    t("newsSourceXiaohongshu"),
    t("newsSourceManual")
  ]);
  setPlaceholder("newsTitle", t("newsTitlePlaceholder"));
  setPlaceholder("newsSource", t("newsSourcePlaceholder"));
  setPlaceholder("newsUrl", t("newsUrlPlaceholder"));
  setPlaceholder("newsTags", t("newsTagsPlaceholder"));
  setPlaceholder("newsSummary", t("newsSummaryPlaceholder"));
  setPlaceholder("newsInsight", t("newsInsightPlaceholder"));
  setButtonLabel("#newsForm .secondary-button", t("newsSave"));
  setText(".courses-section h2", t("coursesModule"));
  setText("#coursesSummary", t("coursesSummary"));
  setText("#learningPathTitle", t("learningPathTitle"));
  setText("#learningPathHint", t("learningPathHint"));
  setPlaceholder("resourceSources", t("resourceSourcesPlaceholder"));
  setText(".network-section h2", t("networkModule"));
  setAttribute("#addNetworkBtn", "title", t("networkAdd"));
  setAttribute("#addNetworkBtn", "aria-label", t("networkAdd"));
  setButtonLabel("#networkForm .secondary-button", t("networkSave"));
  setNetworkStatusOptionLabels();
  setButtonLabel("#settingsForm .primary-button", t("saveSettings"));
  setButtonLabel("#communityForm .primary-button", t("post"));
  setButtonLabel("#overviewCommunityForm .primary-button", t("post"));
  setFileLabel("#communityForm .secondary-button", els.communityMedia, t("addMedia"));
  setButtonLabel("#exportBtn", t("exportBackup"));
  setButtonLabel("#resetBtn", t("resetMemory"));
  setButtonLabel("#syncCloudBtn", t("syncCloud"));
  setButtonLabel("#logoutBtn", t("logout"));
  setImportButtonLabel();

  setPlaceholder("communityText", t("communityPlaceholder"));
  setPlaceholder("overviewCommunityText", t("overviewCommunityPlaceholder"));

  const scopeOptions = els.leaderboardScopeSelect?.options || [];
  if (scopeOptions.length >= 3) {
    scopeOptions[0].textContent = t("leaderboardGlobal");
    scopeOptions[1].textContent = t("leaderboardCountry");
    scopeOptions[2].textContent = t("leaderboardRegion");
  }
  startHeroTypewriter();
}

function setButtonLabel(selector, label) {
  const button = document.querySelector(selector);
  if (!button) return;
  const icon = button.querySelector("svg, i");
  button.textContent = "";
  if (icon) button.append(icon, document.createTextNode(` ${label}`));
  else button.textContent = label;
}

function setImportButtonLabel() {
  setFileLabel(null, els.importInput, t("importBackup"));
}

function setFileLabel(selector, input, labelText) {
  const label = selector ? document.querySelector(selector) : input?.closest("label");
  if (!label) return;
  const icon = label.querySelector("svg, i");
  label.textContent = "";
  if (input) label.appendChild(input);
  if (icon) label.append(icon, document.createTextNode(` ${labelText}`));
  else label.append(labelText);
}

function setText(selector, text) {
  const node = document.querySelector(selector);
  if (node) node.textContent = text;
}

function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  const raw = String(value || "#").trim();
  if (!/^https?:\/\//i.test(raw)) return "#";
  return escapeHtml(raw);
}

function safeExternalUrl(value) {
  const raw = String(value || "#").trim();
  return /^https?:\/\//i.test(raw) ? raw : "#";
}

function openExternalUrl(value) {
  const url = safeExternalUrl(value);
  if (url === "#") return;
  window.open(url, "_blank", "noopener,noreferrer");
}

function normalizeContentSources(rawSources, fallback = {}) {
  const sourceList = Array.isArray(rawSources) ? rawSources : [];
  const fallbackUrl = String(fallback.url || "").trim();
  const candidates = [
    ...sourceList,
    ...(fallbackUrl ? [fallback] : [])
  ];
  const seen = new Set();
  return candidates
    .map((source, index) => normalizeContentSource(source, index))
    .filter((source) => {
      if (!source.url || safeExternalUrl(source.url) === "#") return false;
      const key = source.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
}

function normalizeContentSource(raw = {}, index = 0) {
  const url = String(raw?.url || raw?.sourceUrl || raw || "").trim();
  const provider = normalizeSourceProvider(raw?.provider || raw?.platform || inferSource(url));
  const embed = getOfficialEmbed(url, provider);
  const title = String(raw?.title || raw?.label || provider || "Original").trim();
  return {
    id: String(raw?.id || stableCourseId(`${provider}-${title}-${index}`, url)),
    title,
    provider,
    url,
    embedUrl: String(raw?.embedUrl || embed.embedUrl || "").trim(),
    videoId: String(raw?.videoId || embed.videoId || "").trim(),
    embeddable: Boolean(raw?.embedUrl || embed.embedUrl)
  };
}

function normalizeSourceProvider(value) {
  const raw = String(value || "").trim();
  const lower = raw.toLowerCase();
  if (/youtube|youtu\.be/.test(lower)) return "YouTube";
  if (/bilibili|bili|b站/.test(lower)) return "Bilibili";
  if (/ocw|mit/.test(lower)) return raw || "MIT OCW";
  return raw || "Original";
}

function getOfficialEmbed(url, provider = "") {
  const youtubeId = getYouTubeVideoId(url);
  if (youtubeId) {
    return {
      provider: "YouTube",
      videoId: youtubeId,
      embedUrl: `https://www.youtube.com/embed/${encodeURIComponent(youtubeId)}`
    };
  }
  const bvid = getBilibiliBvid(url);
  if (bvid) {
    return {
      provider: "Bilibili",
      videoId: bvid,
      embedUrl: `https://player.bilibili.com/player.html?bvid=${encodeURIComponent(bvid)}&autoplay=0`
    };
  }
  const lower = String(provider || "").toLowerCase();
  if (lower.includes("youtube") || lower.includes("bilibili")) return { provider, videoId: "", embedUrl: "" };
  return { provider, videoId: "", embedUrl: "" };
}

function getYouTubeVideoId(url) {
  try {
    const parsed = new URL(String(url || ""));
    const host = parsed.hostname.replace(/^www\./, "").toLowerCase();
    if (host === "youtu.be") return parsed.pathname.split("/").filter(Boolean)[0] || "";
    if (host.endsWith("youtube.com")) {
      if (parsed.pathname.startsWith("/embed/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      if (parsed.pathname.startsWith("/shorts/")) return parsed.pathname.split("/").filter(Boolean)[1] || "";
      return parsed.searchParams.get("v") || "";
    }
  } catch {
    return "";
  }
  return "";
}

function getBilibiliBvid(url) {
  const value = String(url || "");
  try {
    const parsed = new URL(value);
    const fromQuery = parsed.searchParams.get("bvid");
    if (fromQuery) return fromQuery;
    const match = parsed.pathname.match(/\/video\/(BV[a-zA-Z0-9]+)/i);
    return match?.[1] || "";
  } catch {
    const match = value.match(/BV[a-zA-Z0-9]+/i);
    return match?.[0] || "";
  }
}

function setAttribute(selector, attribute, value) {
  const node = document.querySelector(selector);
  if (node) node.setAttribute(attribute, value);
}

function setTexts(selector, values) {
  document.querySelectorAll(selector).forEach((node, index) => {
    if (values[index]) node.textContent = values[index];
  });
}

function applyStaticTranslations(root = document) {
  root.querySelectorAll("[data-i18n]").forEach((node) => {
    node.textContent = t(node.dataset.i18n);
  });
  root.querySelectorAll("[data-i18n-placeholder]").forEach((node) => {
    node.setAttribute("placeholder", t(node.dataset.i18nPlaceholder));
  });
  root.querySelectorAll("[data-i18n-title]").forEach((node) => {
    node.setAttribute("title", t(node.dataset.i18nTitle));
  });
  root.querySelectorAll("[data-i18n-aria-label]").forEach((node) => {
    node.setAttribute("aria-label", t(node.dataset.i18nAriaLabel));
  });
}

function setButtonLabels(selector, labels) {
  document.querySelectorAll(selector).forEach((button, index) => {
    if (!labels[index]) return;
    const icon = button.querySelector("svg, i");
    button.textContent = "";
    if (icon) button.append(icon, document.createTextNode(` ${labels[index]}`));
    else button.textContent = labels[index];
  });
}

function setSelectOptionLabels(id, labels) {
  const options = els[id]?.options || [];
  labels.forEach((label, index) => {
    if (options[index]) options[index].textContent = label;
  });
}

function setNetworkStatusOptionLabels() {
  [...(els.networkStatus?.options || [])].forEach((option) => {
    option.textContent = getNetworkStatusLabel(option.value);
  });
}

function setPlaceholder(id, text) {
  if (els[id]) els[id].placeholder = text;
}

function setLabelFor(id, text) {
  const input = els[id];
  const label = input?.closest("label");
  if (!label) return;
  const textNode = [...label.childNodes].find((node) => node.nodeType === Node.TEXT_NODE && node.textContent.trim());
  if (textNode) textNode.textContent = `\n                ${text}\n                `;
}

function switchModule(moduleName = "overview") {
  const hasTargetModule = [...document.querySelectorAll("[data-module-view]")]
    .some((view) => view.dataset.moduleView === moduleName);
  const targetModule = hasTargetModule ? moduleName : "overview";
  let activeTab = null;

  document.querySelectorAll("[data-module-tab]").forEach((button) => {
    const isActive = button.dataset.moduleTab === targetModule;
    button.classList.toggle("active", isActive);
    if (isActive) activeTab = button;
  });
  document.querySelectorAll("[data-module-view]").forEach((view) => {
    view.classList.toggle("active", view.dataset.moduleView === targetModule);
  });
  if (targetModule === "news") {
    renderNewsTicker();
    renderNews();
  }
  if (targetModule === "account") renderAccount();
  if (targetModule === "plan") renderPrepPlan();
  if (targetModule === "experiences") renderExperiences();
  if (targetModule === "community") renderCommunity();
  if (targetModule === "messages") renderMessages();
  if (targetModule === "tools") renderMentalMath();
  if (targetModule === "network") renderNetwork();
  if (targetModule === "resume") renderResume();
  if (targetModule === "jobs") renderJobs();
  if (targetModule === "companies") renderCompanies();
  if (targetModule === "courses") renderCourses();
  if (targetModule === "settings") renderSettings();
  if (targetModule === "skills") drawRadar();
  if (activeTab && window.matchMedia("(max-width: 760px)").matches) {
    window.requestAnimationFrame(() => {
      activeTab.scrollIntoView({ block: "nearest", inline: "center", behavior: "smooth" });
    });
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function renderAll() {
  renderAccount();
  renderSummary();
  consumePendingCapture();
  renderProblems();
  renderInterviewSetup();
  renderInterviewTranscript();
  renderInterviewFavorites();
  renderSkills();
  renderHistory();
  renderLeaderboard();
  renderResources();
  renderNetwork();
  renderTodayPlan();
  renderPrepPlan();
  renderTodoDock();
  renderExperiences();
  renderResume();
  renderJobs();
  renderCompanies();
  renderCourses();
  renderCommunity();
  renderMessages();
  renderMentalMath();
  renderSettings();
  renderNewsTicker();
  renderNews();
  maybeAutoRefreshNews();
  maybeAutoRefreshJobs();
  drawRadar();
  updatePreview();
  refreshIcons();
  applyLanguage();
}

function renderSummary() {
  const now = new Date();
  els.todayLine.textContent = new Intl.DateTimeFormat(getLocale(), {
    month: "long",
    day: "numeric",
    weekday: "long"
  }).format(now);

  const score = getQuantScore();
  const streak = getStreak();
  els.totalXp.textContent = formatScore(score);
  els.rankName.textContent = getRank(score);
  els.entryCount.textContent = state.entries.length;
  els.weeklyXp.textContent = getWeeklyXp();
  els.streakCount.textContent = streak;
  if (els.commandStreakCount) els.commandStreakCount.textContent = streak;
  updateUnreadMessageBadge();
  updateCheckInPill();
  renderRegionRank();
  renderOverviewProblemProgress();
  renderOverviewXpBars();
  renderOverviewContributionHeatmap();
}

function startHeroTypewriter() {
  const node = els.heroTypewriter;
  if (!node) return;
  if (heroTypewriterTimer) window.clearTimeout(heroTypewriterTimer);
  const typeDelay = 78;
  const deleteDelay = 44;
  const phrasePause = 6800;
  const nextPhraseDelay = 460;
  const phrases = [
    "Sharpen your quant edge today.",
    "Practice faster. Think clearer.",
    "Turn solved problems into signal.",
    "Build interview-ready intuition."
  ];
  let phraseIndex = 0;
  let charIndex = 0;
  let deleting = false;

  const tick = () => {
    const phrase = phrases[phraseIndex];
    node.textContent = phrase.slice(0, charIndex);
    if (!deleting && charIndex < phrase.length) {
      charIndex += 1;
      heroTypewriterTimer = window.setTimeout(tick, typeDelay);
      return;
    }
    if (!deleting) {
      deleting = true;
      heroTypewriterTimer = window.setTimeout(tick, phrasePause);
      return;
    }
    if (charIndex > 0) {
      charIndex -= 1;
      heroTypewriterTimer = window.setTimeout(tick, deleteDelay);
      return;
    }
    deleting = false;
    phraseIndex = (phraseIndex + 1) % phrases.length;
    heroTypewriterTimer = window.setTimeout(tick, nextPhraseDelay);
  };

  tick();
}

function getCatalogProblems() {
  return state.problems.filter(isCatalogProblem);
}

function isProblemCompleted(problemId) {
  return Boolean(getProblemPersonalState(problemId).completed);
}

function getProblemCompletionCount(problems = getCatalogProblems()) {
  return problems.filter((problem) => isProblemCompleted(problem.id)).length;
}

function getLeetcodeHotCompletionStats() {
  const done = normalizeLeetcodeHot100Done(state.leetcodeHot100Done).length;
  return {
    done,
    total: leetcodeHot100.length || 100
  };
}

function problemMatchesTheme(problem, theme = problemThemeFilter) {
  if (!theme || theme === "all") return true;
  return normalizeCategory(problem.category) === theme;
}

function normalizeDifficultyFilter(value = "all") {
  return ["easy", "medium", "hard"].includes(value) ? value : "all";
}

function problemMatchesDifficulty(problem, difficulty = problemDifficultyFilter) {
  const normalized = normalizeDifficultyFilter(difficulty);
  if (normalized === "all") return true;
  return difficultyClass(problem.difficulty) === normalized;
}

function companyKey(value = "") {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/&/g, "and")
    .replace(/[^a-z0-9]+/g, "");
}

function getCompanyAliases(company) {
  if (!company) return [];
  return [company.name, company.short, ...(company.aliases || [])].filter(Boolean);
}

function getCompanyDef(value) {
  const key = companyKey(value);
  if (!key) return null;
  return quantCompanyDefs.find((company) => (
    company.slug === value
    || getCompanyAliases(company).some((alias) => companyKey(alias) === key)
  )) || null;
}

function normalizeProblemCompanies(raw = {}, tags = [], source = "") {
  const explicitValues = [
    raw.company,
    raw.firm,
    raw.employer,
    raw.sourceCompany,
    ...(Array.isArray(raw.companies) ? raw.companies : parseTags(raw.companies || ""))
  ];
  const textHints = [
    ...explicitValues,
    ...(Array.isArray(tags) ? tags : []),
    source
  ].filter(Boolean);
  const companies = [];
  textHints.forEach((value) => {
    const company = getCompanyDef(value);
    if (!company || companies.includes(company.name)) return;
    companies.push(company.name);
  });
  return companies;
}

function getProblemCompanies(problem = {}) {
  const companies = Array.isArray(problem.companies) ? problem.companies : [];
  const defs = companies
    .map(getCompanyDef)
    .filter(Boolean);
  if (defs.length) return [...new Map(defs.map((company) => [company.slug, company])).values()];
  return normalizeProblemCompanies(problem, problem.tags || [], problem.source || "")
    .map(getCompanyDef)
    .filter(Boolean);
}

function problemMatchesCompany(problem, companySlug = problemCompanyFilter) {
  if (!companySlug || companySlug === "all") return true;
  return getProblemCompanies(problem).some((company) => company.slug === companySlug);
}

function getCompanyProblemStats(company, problems = getCatalogProblems()) {
  const scoped = problems.filter((problem) => problemMatchesCompany(problem, company.slug));
  const completed = getProblemCompletionCount(scoped);
  const scored = scoped
    .map((problem) => Number(getProblemPersonalState(problem.id).lastScore))
    .filter((score) => Number.isFinite(score));
  const averageScore = scored.length
    ? Math.round(scored.reduce((sum, score) => sum + score, 0) / scored.length)
    : null;
  return {
    total: scoped.length,
    completed,
    averageScore,
    percent: Math.round((completed / Math.max(scoped.length, 1)) * 100)
  };
}

function companyTierWeight(tier = "") {
  return { S: 0, A: 1, B: 2 }[String(tier).toUpperCase()] ?? 5;
}

function getCompanyJobs(company) {
  const aliases = getCompanyAliases(company).map(companyKey);
  return normalizeJobs(state.jobs).filter((job) => aliases.includes(companyKey(job.company)));
}

function createCompanyMark(company, className = "") {
  const mark = document.createElement("div");
  mark.className = `company-mark${className ? ` ${className}` : ""}`;
  mark.style.setProperty("--company-color", company.color);
  mark.style.setProperty("--company-accent", company.accent);
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = company.short || getInitials(company.name);
  return mark;
}

function showCompanyProblems(companySlug) {
  const company = getCompanyDef(companySlug);
  if (!company) return;
  problemCompanyFilter = company.slug;
  problemViewMode = "all";
  selectedProblemDetailId = "";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (els.problemSearch) els.problemSearch.value = "";
  switchModule("problems");
  renderProblems();
  window.setTimeout(() => spotlightElement(`[data-problem-company="${cssEscape(company.slug)}"]`), 80);
}

function getProblemThemeEntries(problems = getCatalogProblems()) {
  return Object.keys(skillDefs)
    .map((key) => ({
      key,
      label: skillDefs[key].name,
      count: problems.filter((problem) => normalizeCategory(problem.category) === key).length
    }))
    .filter((item) => item.count > 0);
}

function renderProblemThemeFilter(problems = getCatalogProblems()) {
  if (!els.problemThemeFilter) return;
  const isEn = getLanguage() === "en";
  const entries = [
    { key: "all", label: isEn ? "All themes" : "全部主题", count: problems.length },
    ...getProblemThemeEntries(problems)
  ];
  els.problemThemeFilter.innerHTML = "";
  entries.forEach((item) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `problem-theme-chip${problemThemeFilter === item.key ? " active" : ""}`;
    button.dataset.problemTheme = item.key;
    button.innerHTML = `<span>${escapeHtml(item.label)}</span><small>${escapeHtml(String(item.count))}</small>`;
    els.problemThemeFilter.appendChild(button);
  });
  if (els.problemThemeSummary) {
    const active = entries.find((item) => item.key === problemThemeFilter) || entries[0];
    els.problemThemeSummary.textContent = `${active.label} · ${active.count} ${isEn ? "problems" : "题"}`;
  }
}

function renderProblemDifficultyFilter(problems = getCatalogProblems()) {
  if (!els.problemDifficultyFilter) return;
  const isEn = getLanguage() === "en";
  const themeProblems = problems.filter((problem) => problemMatchesTheme(problem, problemThemeFilter));
  const entries = [
    { key: "all", label: t("problemDifficultyAll"), count: themeProblems.length },
    { key: "easy", label: "Easy", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "easy").length },
    { key: "medium", label: "Medium", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "medium").length },
    { key: "hard", label: "Hard", count: themeProblems.filter((problem) => difficultyClass(problem.difficulty) === "hard").length }
  ];
  els.problemDifficultyFilter.querySelectorAll("[data-problem-difficulty]").forEach((button) => {
    const key = normalizeDifficultyFilter(button.dataset.problemDifficulty);
    const entry = entries.find((item) => item.key === key);
    button.classList.toggle("active", key === problemDifficultyFilter);
    button.innerHTML = `${escapeHtml(entry?.label || button.textContent.trim())}<small>${escapeHtml(String(entry?.count || 0))}</small>`;
    button.setAttribute("aria-pressed", String(key === problemDifficultyFilter));
    button.title = isEn ? `${entry?.count || 0} problems` : `${entry?.count || 0} 题`;
  });
}

function buildProblemProgressItems(problems = getCatalogProblems()) {
  const isEn = getLanguage() === "en";
  const allDone = getProblemCompletionCount(problems);
  const hot = getLeetcodeHotCompletionStats();
  const activeThemeProblems = problems.filter((problem) => problemMatchesTheme(problem, problemThemeFilter));
  const themeEntries = getProblemThemeEntries(problems)
    .map((item) => {
      const themeProblems = problems.filter((problem) => normalizeCategory(problem.category) === item.key);
      return {
        key: item.key,
        label: item.label,
        done: getProblemCompletionCount(themeProblems),
        total: themeProblems.length
      };
    })
    .sort((left, right) => right.total - left.total);

  const items = [
    {
      key: "all",
      label: isEn ? "All problems" : "全部题库",
      done: allDone,
      total: problems.length
    },
    {
      key: "leetcode-hot",
      label: "LeetCode Hot 100",
      done: hot.done,
      total: hot.total
    }
  ];

  if (problemThemeFilter !== "all") {
    items.push({
      key: "active-theme",
      label: `${isEn ? "Current theme" : "当前主题"} · ${formatCategoryLabel(problemThemeFilter)}`,
      done: getProblemCompletionCount(activeThemeProblems),
      total: activeThemeProblems.length
    });
  }

  themeEntries.slice(0, problemThemeFilter === "all" ? 3 : 2).forEach((item) => items.push(item));
  return items.filter((item) => item.total > 0);
}

function renderProgressGroup(container, items) {
  if (!container) return;
  container.innerHTML = "";
  items.forEach((item, index) => {
    const percent = Math.round((Number(item.done || 0) / Math.max(Number(item.total || 0), 1)) * 100);
    const row = document.createElement("div");
    row.className = "effect-progress-row";
    row.style.setProperty("--value", String(percent));
    row.style.setProperty("--accent-index", String(index));
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(item.label)}</strong>
        <span>${escapeHtml(String(item.done))} / ${escapeHtml(String(item.total))}</span>
      </div>
      <i aria-hidden="true"><span></span></i>
    `;
    container.appendChild(row);
  });
}

function renderOverviewProblemProgress() {
  renderProgressGroup(els.overviewProblemProgress, buildProblemProgressItems(getCatalogProblems()).slice(0, 4));
}

function renderProblemCompletionDashboard(problems = getCatalogProblems()) {
  renderProgressGroup(els.problemCompletionProgress, buildProblemProgressItems(problems).slice(0, 5));
}

function getDailyXpSeries(days = 7) {
  const today = new Date();
  const totals = new Map();
  state.entries.forEach((entry) => {
    const key = dayKey(entry.date);
    totals.set(key, (totals.get(key) || 0) + Number(entry.totalXp || 0));
  });
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dayKey(date);
    return {
      key,
      label: new Intl.DateTimeFormat(getLocale(), { weekday: "short" }).format(date),
      xp: totals.get(key) || 0
    };
  });
}

function renderOverviewXpBars() {
  if (!els.overviewXpBars) return;
  const series = getDailyXpSeries(7);
  const maxXp = Math.max(20, ...series.map((item) => item.xp));
  els.overviewXpBars.innerHTML = "";
  series.forEach((item) => {
    const bar = document.createElement("div");
    bar.className = "daily-xp-bar";
    bar.style.setProperty("--h", `${Math.max(8, Math.round((item.xp / maxXp) * 100))}%`);
    bar.innerHTML = `<strong>${escapeHtml(String(item.xp))}</strong><i></i><span>${escapeHtml(item.label)}</span>`;
    els.overviewXpBars.appendChild(bar);
  });
}

function getContributionSeries(days = 35) {
  const today = new Date();
  const xpByDay = new Map();
  const completedByDay = new Map();
  state.entries.forEach((entry) => {
    const key = dayKey(entry.date);
    xpByDay.set(key, (xpByDay.get(key) || 0) + Number(entry.totalXp || 0));
  });
  (state.problemStates || []).forEach((item) => {
    if (!item.completedAt) return;
    const key = dayKey(item.completedAt);
    completedByDay.set(key, (completedByDay.get(key) || 0) + 1);
  });
  const hotDoneCount = normalizeLeetcodeHot100Done(state.leetcodeHot100Done).length;
  if (hotDoneCount) {
    const key = dayKey(today);
    completedByDay.set(key, (completedByDay.get(key) || 0) + Math.min(5, Math.ceil(hotDoneCount / 20)));
  }
  return Array.from({ length: days }, (_, index) => {
    const date = new Date(today);
    date.setDate(today.getDate() - (days - index - 1));
    const key = dayKey(date);
    const xp = xpByDay.get(key) || 0;
    const completed = completedByDay.get(key) || 0;
    const level = Math.min(5, Math.max(0, Math.ceil(xp / 24) + Math.ceil(completed)));
    return { key, date, xp, completed, level };
  });
}

function renderOverviewContributionHeatmap() {
  if (!els.overviewContributionHeatmap) return;
  els.overviewContributionHeatmap.innerHTML = "";
  getContributionSeries(35).forEach((day) => {
    const cell = document.createElement("span");
    cell.style.setProperty("--v", String(day.level));
    cell.title = `${formatNewsDate(day.key)} · ${day.xp} XP · ${Math.floor(day.completed)} completed`;
    els.overviewContributionHeatmap.appendChild(cell);
  });
}

function renderTodayPlan() {
  if (!els.todayPlanCard) return;
  const prepPlan = normalizePrepPlan(state.prepPlan);
  const plan = prepPlan ? buildTodayStudyPlan() : normalizeStudyPlan(state.studyPlan);
  els.todayPlanCard.innerHTML = "";
  els.todayPlanCard.classList.toggle("hidden", !plan);
  if (!plan) return;

  const top = document.createElement("div");
  top.className = "today-plan-top";
  const title = document.createElement("strong");
  title.textContent = t("planTitle");
  const meta = document.createElement("span");
  meta.textContent = plan.summary || t("planGenerated");
  top.append(title, meta);

  const list = document.createElement("ul");
  plan.items.slice(0, 4).forEach((item) => {
    const row = document.createElement("li");
    row.classList.toggle("done", Boolean(item.done));
    const dot = document.createElement("span");
    dot.className = "plan-dot";
    dot.textContent = item.done ? "OK" : item.minutes ? `${item.minutes}` : "Q";
    const copy = document.createElement("div");
    const rowTitle = document.createElement("strong");
    rowTitle.textContent = item.title;
    const detail = document.createElement("small");
    detail.textContent = item.detail;
    copy.append(rowTitle, detail);
    row.append(dot, copy);
    list.appendChild(row);
  });

  const open = document.createElement("button");
  open.className = "secondary-button today-plan-open";
  open.type = "button";
  open.innerHTML = `<i data-lucide="arrow-right"></i> ${prepPlan ? "查看完整备战计划" : "建立长期备战计划"}`;
  open.addEventListener("click", () => switchModule("plan"));

  els.todayPlanCard.append(top, list, open);
  renderTodoDock();
}

function generateTodayStudyPlan() {
  if (state.prepPlan) {
    switchModule("plan");
    return;
  }
  const plan = buildTodayStudyPlan();
  state.studyPlan = plan;
  saveState();
  renderTodayPlan();
  renderTodoDock();
  refreshIcons();
  els.todayPlanCard?.classList.add("just-created");
  window.setTimeout(() => els.todayPlanCard?.classList.remove("just-created"), 600);
}

function buildTodayStudyPlan() {
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    const tasks = getPrepDailyTasks(prepPlan);
    const done = tasks.filter((task) => task.done).length;
    return {
      createdAt: new Date().toISOString(),
      summary: `${prepSeasonDefs[prepPlan.season].label} · ${prepRoleDefs[prepPlan.role].label} · 今日 ${done}/${tasks.length} 完成`,
      items: tasks
    };
  }
  return buildLegacyTodayStudyPlan();
}

function buildLegacyTodayStudyPlan() {
  const isEn = getLanguage() === "en";
  const weakSkills = Object.entries(skillDefs)
    .map(([key, def]) => ({ key, def, score: getSkillScore(state.skills?.[key] || 0) }))
    .sort((a, b) => a.score - b.score)
    .slice(0, 3);
  const primary = weakSkills[0]?.def || skillDefs.probabilityExpectation;
  const secondary = weakSkills[1]?.def || skillDefs.leetcode;
  const graduationTerm = currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM;
  const resumeText = state.resume?.text || "";
  const resumeTask = resumeText.length > 300
    ? {
      id: makeId(),
      title: isEn ? "Tighten resume bullets" : "过一遍简历 bullet",
      detail: isEn
        ? "Rewrite 2 bullets with metric + action + result, then run the Resume Module."
        : "挑 2 条经历改成 metric + action + result，再用简历模块检查。",
      minutes: 20,
      skill: "resume"
    }
    : {
      id: makeId(),
      title: isEn ? "Upload resume draft" : "上传或粘贴简历",
      detail: isEn
        ? `Target graduation term: ${graduationTerm}. Add a first draft so QuantGym can review gaps.`
        : `毕业时间先按 ${graduationTerm}。先放入一版简历，方便系统检查短板。`,
      minutes: 15,
      skill: "resume"
    };

  return {
    createdAt: new Date().toISOString(),
    summary: isEn ? "Built from your lowest score areas." : "根据当前最低分能力项生成。",
    items: [
      {
        id: makeId(),
        title: isEn ? `Drill ${primary.name}` : `刷 ${primary.name}`,
        detail: isEn
          ? "Solve 3 question-bank or interview-style problems and write the clean conditioning / setup."
          : "刷 3 道题库/面试风格题，把条件、随机变量和关键等式写清楚。",
        minutes: 35,
        skill: weakSkills[0]?.key || "probabilityExpectation"
      },
      {
        id: makeId(),
        title: isEn ? `LeetCode + ${secondary.name}` : `LeetCode + ${secondary.name}`,
        detail: isEn
          ? "Do 2 LeetCode problems around the weakest pattern, then summarize the template."
          : "做 2 道相关 LeetCode，重点复盘模板、复杂度和边界条件。",
        minutes: 45,
        skill: weakSkills[1]?.key || "leetcode"
      },
      resumeTask,
      {
        id: makeId(),
        title: isEn ? "Applications scan" : "求职岗位扫描",
        detail: isEn
          ? "Open the Jobs module and save 2 internship/full-time roles worth applying to."
          : "打开求职模块，筛 2 个 internship/full-time 岗位，记录申请链接。",
        minutes: 15,
        skill: "jobs"
      }
    ]
  };
}

function createPrepPlan() {
  const form = els.prepPlanSetupForm;
  if (!form) return;
  const data = new FormData(form);
  const previous = normalizePrepPlan(state.prepPlan);
  const track = data.get("prepTrack") === "fulltime" ? "fulltime" : "internship";
  const role = prepRoleDefs[data.get("prepRole")] ? data.get("prepRole") : "quantTrading";
  const season = prepSeasonDefs[data.get("prepSeason")] ? data.get("prepSeason") : "2027-summer";
  const weeklyHours = Number(data.get("prepHours") || 8);
  const wantsDiagnostic = data.get("prepDiagnostic") !== "skip";
  const sameTarget = previous
    && previous.track === track
    && previous.role === role
    && previous.season === season;
  const diagnosticStatus = wantsDiagnostic
    ? sameTarget && previous.diagnosticStatus === "completed" ? "completed" : "pending"
    : "skipped";

  state.prepPlan = normalizePrepPlan({
    track,
    role,
    season,
    weeklyHours,
    diagnosticStatus,
    diagnosticScore: diagnosticStatus === "completed" ? previous.diagnosticScore : 0,
    diagnosticScores: diagnosticStatus === "completed" ? previous.diagnosticScores : {},
    completedTasks: sameTarget ? previous.completedTasks : {},
    taskOverrides: sameTarget ? previous.taskOverrides : {},
    customTasks: sameTarget ? previous.customTasks : [],
    createdAt: sameTarget ? previous.createdAt : new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
  state.studyPlan = buildTodayStudyPlan();
  prepPlanEditorOpen = false;
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
  refreshIcons();
}

function renderPrepPlan() {
  if (!els.prepPlanSetupForm || !els.prepPlanDashboard) return;
  const plan = normalizePrepPlan(state.prepPlan);
  const showSetup = !plan || prepPlanEditorOpen;
  els.prepPlanSetupForm.classList.toggle("hidden", !showSetup);
  els.prepPlanDashboard.classList.toggle("hidden", !plan || showSetup);
  els.editPrepPlanBtn?.classList.toggle("hidden", !plan || showSetup);
  updatePrepTaskIndicator();
  renderTodoDock();

  if (plan && showSetup) populatePrepPlanForm(plan);
  if (!plan || showSetup) return;

  const role = prepRoleDefs[plan.role];
  const season = prepSeasonDefs[plan.season];
  const tasks = getPrepDailyTasks(plan);
  const stageIndex = getPrepStageIndex(plan);
  const done = tasks.filter((task) => task.done).length;
  const diagnosticCopy = plan.diagnosticStatus === "completed"
    ? `Baseline ${plan.diagnosticScore}/${prepDiagnosticQuestions.length}`
    : plan.diagnosticStatus === "pending" ? "Baseline 待完成" : "未测评";

  els.prepPlanDashboard.innerHTML = `
    <section class="prep-status-band">
      <div class="prep-status-copy">
        <span class="prep-status-label">${escapeHtml(plan.track === "internship" ? "INTERNSHIP" : "FULL-TIME")}</span>
        <h3>${escapeHtml(season.label)} · ${escapeHtml(role.label)}</h3>
        <p>${escapeHtml(getPrepPaceText(plan))}</p>
      </div>
      <div class="prep-status-metrics">
        <div><strong>${escapeHtml(String(plan.weeklyHours))}</strong><span>小时 / 周</span></div>
        <div><strong>${escapeHtml(String(done))}/${escapeHtml(String(tasks.length))}</strong><span>今日完成</span></div>
        <div><strong>${escapeHtml(diagnosticCopy)}</strong><span>能力定位</span></div>
      </div>
    </section>
    <div class="prep-dashboard-grid">
      <section class="prep-work-panel">
        <div class="prep-panel-heading">
          <div>
            <h3>今天的训练</h3>
            <p>${escapeHtml(role.technical)} · 当前重点：${escapeHtml(prepProcessStages[stageIndex].name)}</p>
          </div>
        </div>
        <div class="prep-task-list">
          ${tasks.map(renderPrepTaskMarkup).join("")}
        </div>
      </section>
      <section class="prep-assessment-panel">
        ${renderPrepDiagnosticMarkup(plan)}
      </section>
    </div>
    <section class="prep-process-section">
      <div class="prep-panel-heading">
        <div>
          <h3>常见招聘流程</h3>
          <p>公司和岗位会调整轮次；以下是用于安排训练的共同主线。</p>
        </div>
      </div>
      <div class="prep-stage-list">
        ${prepProcessStages.map((stage, index) => `
          <article class="prep-stage${index === stageIndex ? " current" : ""}">
            <span>${String(index + 1).padStart(2, "0")}</span>
            <h4>${escapeHtml(stage.name)}</h4>
            <p>${escapeHtml(stage.detail)}</p>
            <small>${escapeHtml(stage.evidence)}</small>
          </article>
        `).join("")}
      </div>
    </section>
    <section class="prep-source-section">
      <div class="prep-panel-heading">
        <div>
          <h3>流程依据</h3>
          <p>来自公司官方招聘页面；实际申请前仍需以具体岗位描述为准。</p>
        </div>
      </div>
      <div class="prep-source-links">
        ${prepSourceLinks.map((source) => `
          <a href="${escapeAttribute(source.url)}" target="_blank" rel="noopener noreferrer">
            <strong>${escapeHtml(source.label)}</strong>
            <span>${escapeHtml(source.note)}</span>
            <i data-lucide="external-link"></i>
          </a>
        `).join("")}
      </div>
    </section>
  `;
  refreshIcons();
}

function updatePrepTaskIndicator() {
  const plan = normalizePrepPlan(state.prepPlan);
  if (!plan) {
    setText(".sidebar-helper span", t("tasksWaiting"));
    renderTodoDock();
    return;
  }
  const pending = getPrepDailyTasks(plan).filter((task) => !task.done).length;
  const label = getLanguage() === "en" ? `${pending} tasks waiting` : `${pending} 个任务待完成`;
  setText(".sidebar-helper span", label);
  renderTodoDock();
}

function getTodoDockPlan() {
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    const todayPlan = buildTodayStudyPlan();
    return {
      type: "prep",
      summary: todayPlan.summary,
      items: todayPlan.items
    };
  }
  const studyPlan = normalizeStudyPlan(state.studyPlan);
  if (!studyPlan) return null;
  return {
    type: "study",
    summary: studyPlan.summary || t("planGenerated"),
    items: studyPlan.items
  };
}

function renderTodoDock() {
  if (!els.todoDockButton || !els.todoDockPanel || !els.todoDockList) return;
  const plan = getTodoDockPlan();
  const items = plan?.items || [];
  const pending = items.filter((item) => !item.done).length;
  els.todoDockPanel.classList.toggle("hidden", !todoDockOpen);
  els.todoDockButton.classList.toggle("open", todoDockOpen);
  els.todoDockButton.setAttribute("aria-expanded", String(todoDockOpen));
  if (els.todoDockButtonLabel) els.todoDockButtonLabel.textContent = t("todoButton");
  if (els.todoDockCount) els.todoDockCount.textContent = String(pending);
  if (els.todoDockEyebrow) els.todoDockEyebrow.textContent = t("todoEyebrow");
  if (els.todoDockTitle) els.todoDockTitle.textContent = t("todoTitle");
  if (els.todoDockSummary) els.todoDockSummary.textContent = plan?.summary || t("todoSummaryEmpty");
  if (els.todoDockEmpty) {
    els.todoDockEmpty.textContent = t("todoEmpty");
    els.todoDockEmpty.classList.toggle("hidden", items.length > 0);
  }
  if (els.todoDockAddInput) els.todoDockAddInput.placeholder = t("todoAddPlaceholder");
  els.todoDockList.innerHTML = "";
  items.forEach((item) => {
    const row = document.createElement("article");
    row.className = `todo-task${item.done ? " done" : ""}`;
    row.dataset.todoId = item.id;
    row.innerHTML = `
      <button class="todo-task-toggle" type="button" data-todo-toggle="${escapeHtml(item.id)}" aria-label="${escapeHtml(item.done ? t("todoDone") : t("todoUndone"))}">
        <i data-lucide="${item.done ? "check" : "circle"}"></i>
      </button>
      <div class="todo-task-fields">
        <input type="text" value="${escapeHtml(item.title)}" data-todo-id="${escapeHtml(item.id)}" data-todo-field="title" aria-label="${escapeHtml(item.title || t("todoAddPlaceholder"))}">
        <textarea rows="2" data-todo-id="${escapeHtml(item.id)}" data-todo-field="detail" aria-label="${escapeHtml(item.title || t("todoAddPlaceholder"))} detail">${escapeHtml(item.detail || "")}</textarea>
      </div>
      <span class="todo-task-time">${escapeHtml(String(item.minutes || 0))}m</span>
    `;
    els.todoDockList.appendChild(row);
  });
  refreshIcons();
}

function handleTodoDockClick(event) {
  const toggle = event.target.closest("[data-todo-toggle]");
  if (!toggle) return;
  toggleTodoTask(toggle.dataset.todoToggle);
}

function handleTodoDockEdit(event) {
  const field = event.target.dataset.todoField;
  const taskId = event.target.dataset.todoId;
  if (!field || !taskId) return;
  updateTodoTask(taskId, field, event.target.value);
}

function addTodoTask() {
  const title = String(els.todoDockAddInput?.value || "").trim();
  if (!title) return;
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    prepPlan.customTasks = [
      ...(prepPlan.customTasks || []),
      {
        id: `custom-${makeId()}`,
        date: localDateKey(),
        title,
        detail: "",
        minutes: 15,
        action: "custom",
        query: ""
      }
    ];
    prepPlan.updatedAt = new Date().toISOString();
    state.prepPlan = prepPlan;
    state.studyPlan = buildTodayStudyPlan();
  } else {
    const plan = normalizeStudyPlan(state.studyPlan) || {
      createdAt: new Date().toISOString(),
      summary: t("planGenerated"),
      items: []
    };
    plan.items.push({
      id: `custom-${makeId()}`,
      title,
      detail: "",
      minutes: 15,
      skill: "custom",
      done: false
    });
    state.studyPlan = plan;
  }
  if (els.todoDockAddInput) els.todoDockAddInput.value = "";
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function toggleTodoTask(taskId) {
  if (!taskId) return;
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    togglePrepTask(taskId);
    return;
  }
  const plan = normalizeStudyPlan(state.studyPlan);
  if (!plan) return;
  const task = plan.items.find((item) => item.id === taskId);
  if (!task) return;
  task.done = !task.done;
  state.studyPlan = plan;
  saveState();
  renderTodayPlan();
  renderTodoDock();
}

function updateTodoTask(taskId, field, rawValue) {
  if (!["title", "detail"].includes(field) || !taskId) return;
  const value = String(rawValue || "").trim().slice(0, field === "title" ? 120 : 260);
  const prepPlan = normalizePrepPlan(state.prepPlan);
  if (prepPlan) {
    const customTask = (prepPlan.customTasks || []).find((task) => task.date === localDateKey() && task.id === taskId);
    if (customTask) {
      customTask[field] = value;
    } else {
      const key = `${localDateKey()}:${taskId}`;
      const existing = prepPlan.taskOverrides?.[key] || {};
      prepPlan.taskOverrides = {
        ...(prepPlan.taskOverrides || {}),
        [key]: {
          ...existing,
          [field]: value
        }
      };
    }
    prepPlan.updatedAt = new Date().toISOString();
    state.prepPlan = prepPlan;
    state.studyPlan = buildTodayStudyPlan();
  } else {
    const plan = normalizeStudyPlan(state.studyPlan);
    if (!plan) return;
    const task = plan.items.find((item) => item.id === taskId);
    if (!task) return;
    task[field] = value;
    state.studyPlan = plan;
  }
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function populatePrepPlanForm(plan) {
  if (!els.prepPlanSetupForm) return;
  [["prepTrack", plan.track], ["prepSeason", plan.season], ["prepDiagnostic", plan.diagnosticStatus === "skipped" ? "skip" : "take"]]
    .forEach(([name, value]) => {
      const input = els.prepPlanSetupForm.querySelector(`input[name="${name}"][value="${value}"]`);
      if (input) input.checked = true;
    });
  els.prepRoleSelect.value = plan.role;
  els.prepHoursSelect.value = String(plan.weeklyHours);
}

function getPrepStageIndex(plan) {
  const season = prepSeasonDefs[plan.season];
  const weeksToStart = weeksUntilDate(season.startDate);
  const weeksToApplications = weeksUntilDate(season.applicationDate);
  if (weeksToStart <= 6) return 5;
  if (weeksToApplications > 8) return 0;
  if (weeksToApplications > 0 || plan.diagnosticStatus !== "completed") return 1;
  if (weeksToStart <= 18) return 5;
  if (weeksToStart <= 30) return 4;
  return plan.diagnosticScore >= 6 ? 3 : 1;
}

function getPrepPaceText(plan) {
  const season = prepSeasonDefs[plan.season];
  const weeksToStart = weeksUntilDate(season.startDate);
  const weeksToApplications = weeksUntilDate(season.applicationDate);
  if (weeksToStart <= 0) return "目标 summer 已开始：以补录、面试复盘和下一周期准备为主。";
  if (weeksToStart <= 6) return `距目标开始约 ${weeksToStart} 周：以补录、整套模拟和 final-day 即时准备为主。`;
  if (weeksToApplications <= 0) return "常见申请窗口已开启：滚动投递，同时推进 OA、technical 与 behavioral 准备。";
  if (weeksToApplications <= 8) return `距常见申请窗口约 ${weeksToApplications} 周：立即准备简历、baseline 与 OA 限时训练。`;
  return `距常见申请窗口约 ${weeksToApplications} 周：先建立基础、项目表达和岗位判断，再转入限时训练。`;
}

function weeksUntilDate(dateText) {
  const target = new Date(`${dateText}T12:00:00`);
  const delta = target.getTime() - Date.now();
  return Math.ceil(delta / (7 * 24 * 60 * 60 * 1000));
}

function getPrepFocusSkills(plan) {
  const roleFocus = prepRoleDefs[plan.role].focus;
  if (plan.diagnosticStatus !== "completed") return roleFocus;
  return [...roleFocus].sort((left, right) => (
    Number(plan.diagnosticScores[left] ?? 50) - Number(plan.diagnosticScores[right] ?? 50)
  ));
}

function getPrepDailyTasks(plan) {
  const focus = getPrepFocusSkills(plan);
  const stageIndex = getPrepStageIndex(plan);
  const primary = focus[0] || "probabilityExpectation";
  const secondary = focus[1] || "leetcode";
  const tasks = [
    {
      id: "core",
      title: `${formatCategoryLabel(primary)} 基础题`,
      detail: `完成 3 道 ${formatCategoryLabel(primary)} 题并写下清晰解题结构。`,
      minutes: plan.weeklyHours >= 12 ? 45 : 35,
      action: "problems",
      query: primary
    },
    {
      id: "speed",
      title: plan.role === "quantDeveloper" ? "限时 Coding OA" : "OA 速度训练",
      detail: plan.role === "quantDeveloper"
        ? "限时完成 2 道算法题，复盘复杂度与边界情况。"
        : "完成一轮速算，再做 2 道概率或期望短题。",
      minutes: 25,
      action: plan.role === "quantDeveloper" ? "problems" : "tools",
      query: plan.role === "quantDeveloper" ? "leetcode" : ""
    },
    {
      id: "verbal",
      title: stageIndex >= 3 ? "面试口述模拟" : `${formatCategoryLabel(secondary)} 主题复盘`,
      detail: stageIndex >= 3
        ? "进行 3 题 technical mock：先澄清，再口述假设与结论。"
        : `学习 ${formatCategoryLabel(secondary)}，并把一道题讲成面试回答。`,
      minutes: 35,
      action: stageIndex >= 3 ? "interview" : "problems",
      query: secondary
    },
    {
      id: "application",
      title: stageIndex >= 3 ? "Behavioral 故事库" : "申请材料与岗位扫描",
      detail: stageIndex >= 3
        ? "整理 1 个协作或失败复盘故事，并练习 Why quant / Why firm。"
        : "完善一条量化项目 bullet，并追踪合适的目标岗位。",
      minutes: 25,
      action: stageIndex >= 3 ? "interview-behavioral" : "resume"
    },
    {
      id: "pipeline",
      title: stageIndex >= 3 ? "面经复盘归档" : "申请管线维护",
      detail: stageIndex >= 3
        ? "记录最近一次轮次的流程、考察主题和下一步训练，再决定是否分享。"
        : "核对岗位季次、毕业要求、deadline 与下一步联系人。",
      minutes: 15,
      action: stageIndex >= 3 ? "experiences" : "jobs"
    }
  ];
  const limit = plan.weeklyHours <= 5 ? 3 : plan.weeklyHours <= 8 ? 4 : 5;
  const dateKey = localDateKey();
  const preparedTasks = tasks.slice(0, limit).map((task) => {
    const key = `${dateKey}:${task.id}`;
    const override = plan.taskOverrides?.[key] || {};
    return {
      ...task,
      title: override.title || task.title,
      detail: override.detail || task.detail,
      minutes: override.minutes || task.minutes,
      skill: task.query || task.action,
      done: Boolean(plan.completedTasks[key])
    };
  });
  const customTasks = (plan.customTasks || [])
    .filter((task) => task.date === dateKey)
    .map((task) => ({
      ...task,
      skill: task.query || task.action || "custom",
      done: Boolean(plan.completedTasks[`${dateKey}:${task.id}`])
    }));
  return [...preparedTasks, ...customTasks];
}

function renderPrepTaskMarkup(task) {
  return `
    <article class="prep-task${task.done ? " done" : ""}">
      <button class="prep-task-toggle" type="button" data-prep-toggle-task="${escapeHtml(task.id)}" aria-label="${task.done ? "标为未完成" : "标为完成"}">
        <i data-lucide="${task.done ? "check" : "circle"}"></i>
      </button>
      <div>
        <h4>${escapeHtml(task.title)}</h4>
        <p>${escapeHtml(task.detail)}</p>
        <span>${escapeHtml(String(task.minutes))} min</span>
      </div>
      <button class="secondary-button prep-task-action" type="button" data-prep-open="${escapeHtml(task.action)}" data-prep-query="${escapeHtml(task.query || "")}">开始</button>
    </article>
  `;
}

function renderPrepDiagnosticMarkup(plan) {
  if (plan.diagnosticStatus === "pending") {
    return `
      <div class="prep-panel-heading">
        <div>
          <h3>Baseline 测评</h3>
          <p>8 题快速定位当前训练优先级，不影响题库进度。</p>
        </div>
        <button class="secondary-button compact" type="button" data-prep-skip-test="true">暂时跳过</button>
      </div>
      <form id="prepDiagnosticForm" class="prep-diagnostic-form">
        ${prepDiagnosticQuestions.map((question, index) => `
          <fieldset>
            <legend>${index + 1}. ${escapeHtml(question.prompt)}</legend>
            ${question.options.map((option) => `
              <label><input type="radio" name="diagnostic-${escapeHtml(question.id)}" value="${escapeHtml(option)}"> ${escapeHtml(option)}</label>
            `).join("")}
          </fieldset>
        `).join("")}
        <p class="prep-diagnostic-message" id="prepDiagnosticMessage"></p>
        <button class="primary-button" type="submit"><i data-lucide="check-circle-2"></i>提交测评</button>
      </form>
    `;
  }

  if (plan.diagnosticStatus === "skipped") {
    return `
      <div class="prep-panel-heading">
        <div>
          <h3>能力定位</h3>
          <p>当前按岗位默认路径生成任务。补做 baseline 后会调整训练排序。</p>
        </div>
      </div>
      <button class="secondary-button" type="button" data-prep-start-test="true"><i data-lucide="clipboard-check"></i>开始 8 题测评</button>
    `;
  }

  const scores = Object.entries(plan.diagnosticScores)
    .filter(([key]) => skillDefs[key])
    .sort((left, right) => left[1] - right[1]);
  const level = plan.diagnosticScore === prepDiagnosticQuestions.length
    ? "基础覆盖良好；保持速度训练并进入面试表达"
    : plan.diagnosticScore >= 7
      ? "面试热身就绪；优先补齐低分能力"
      : plan.diagnosticScore >= 4 ? "核心能力建设中；优先训练低分能力" : "从基础模块开始；优先训练低分能力";
  return `
    <div class="prep-panel-heading">
      <div>
        <h3>Baseline ${escapeHtml(String(plan.diagnosticScore))}/${prepDiagnosticQuestions.length}</h3>
        <p>${escapeHtml(level)}。</p>
      </div>
      <button class="secondary-button compact" type="button" data-prep-start-test="true">重测</button>
    </div>
    <div class="prep-score-list">
      ${scores.map(([key, score]) => `
        <div class="prep-score-row">
          <span>${escapeHtml(formatCategoryLabel(key))}</span>
          <div><i style="width: ${score}%"></i></div>
          <strong>${score}</strong>
        </div>
      `).join("")}
    </div>
  `;
}

function handlePrepPlanAction(event) {
  const toggle = event.target.closest("[data-prep-toggle-task]");
  if (toggle) {
    togglePrepTask(toggle.dataset.prepToggleTask);
    return;
  }
  if (event.target.closest("[data-prep-start-test]")) {
    state.prepPlan = { ...normalizePrepPlan(state.prepPlan), diagnosticStatus: "pending", updatedAt: new Date().toISOString() };
    saveState();
    renderPrepPlan();
    renderTodoDock();
    return;
  }
  if (event.target.closest("[data-prep-skip-test]")) {
    state.prepPlan = { ...normalizePrepPlan(state.prepPlan), diagnosticStatus: "skipped", updatedAt: new Date().toISOString() };
    state.studyPlan = buildTodayStudyPlan();
    saveState();
    renderPrepPlan();
    renderTodayPlan();
    renderTodoDock();
    return;
  }
  const open = event.target.closest("[data-prep-open]");
  if (open) openPrepTask(open.dataset.prepOpen, open.dataset.prepQuery || "");
}

function togglePrepTask(taskId) {
  const plan = normalizePrepPlan(state.prepPlan);
  if (!plan || !taskId) return;
  const key = `${localDateKey()}:${taskId}`;
  plan.completedTasks[key] = !plan.completedTasks[key];
  plan.updatedAt = new Date().toISOString();
  state.prepPlan = plan;
  state.studyPlan = buildTodayStudyPlan();
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function submitPrepDiagnostic(form) {
  const plan = normalizePrepPlan(state.prepPlan);
  if (!plan) return;
  const answers = new FormData(form);
  const missing = prepDiagnosticQuestions.filter((question) => !answers.get(`diagnostic-${question.id}`));
  if (missing.length) {
    const message = form.querySelector("#prepDiagnosticMessage");
    if (message) message.textContent = `还有 ${missing.length} 题未作答。`;
    return;
  }
  const totals = {};
  const correct = {};
  let score = 0;
  prepDiagnosticQuestions.forEach((question) => {
    totals[question.skill] = (totals[question.skill] || 0) + 1;
    if (answers.get(`diagnostic-${question.id}`) === question.answer) {
      score += 1;
      correct[question.skill] = (correct[question.skill] || 0) + 1;
    }
  });
  const scores = Object.fromEntries(Object.keys(totals).map((key) => [
    key,
    Math.round(((correct[key] || 0) / totals[key]) * 100)
  ]));
  state.prepPlan = {
    ...plan,
    diagnosticStatus: "completed",
    diagnosticScore: score,
    diagnosticScores: scores,
    updatedAt: new Date().toISOString()
  };
  state.studyPlan = buildTodayStudyPlan();
  saveState();
  renderPrepPlan();
  renderTodayPlan();
  renderTodoDock();
}

function openPrepTask(action, query = "") {
  if (action === "problems") {
    switchModule("problems");
    if (els.problemSearch) {
      els.problemSearch.value = query;
      renderProblems();
    }
    return;
  }
  if (action === "tools" || action === "resume" || action === "jobs" || action === "experiences") {
    switchModule(action);
    return;
  }
  if (action === "interview" || action === "interview-behavioral") {
    if (els.interviewTypeSelect) els.interviewTypeSelect.value = action === "interview-behavioral" ? "behavioral" : "technical";
    selectedInterviewCategories = query && skillDefs[query] ? new Set([query]) : new Set(["all"]);
    resetInterview({ keepSetup: true });
    renderInterviewSetup();
    switchModule("interview");
  }
}

function localDateKey() {
  const now = new Date();
  return [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0")
  ].join("-");
}

function saveInterviewExperience() {
  if (!els.experienceForm) return;
  const previous = state.interviewExperiences.find((item) => item.id === els.experienceId.value);
  const now = new Date().toISOString();
  const record = normalizeInterviewExperience({
    ...previous,
    id: previous?.id || makeId(),
    firm: els.experienceFirm.value,
    role: els.experienceRole.value,
    stage: els.experienceStage.value,
    season: els.experienceSeason.value,
    date: els.experienceDate.value || localDateKey(),
    outcome: els.experienceOutcome.value,
    tags: parseTags(els.experienceTags.value),
    summary: els.experienceSummaryInput.value,
    topics: els.experienceTopics.value,
    reflection: els.experienceReflection.value,
    createdAt: previous?.createdAt || now,
    updatedAt: now
  });
  if (!record.firm || !record.summary) return;
  state.interviewExperiences = [
    record,
    ...state.interviewExperiences.filter((item) => item.id !== record.id)
  ];
  pendingExperienceShareId = "";
  saveState();
  resetExperienceForm();
  renderExperiences();
}

function resetExperienceForm() {
  if (!els.experienceForm) return;
  els.experienceForm.reset();
  els.experienceId.value = "";
  els.experienceDate.value = localDateKey();
  els.experienceFormTitle.textContent = "新建面经";
  els.cancelExperienceEditBtn.classList.add("hidden");
}

function editInterviewExperience(id) {
  const record = state.interviewExperiences.find((item) => item.id === id);
  if (!record || !els.experienceForm) return;
  els.experienceId.value = record.id;
  els.experienceFirm.value = record.firm;
  els.experienceRole.value = record.role;
  els.experienceStage.value = record.stage;
  els.experienceSeason.value = record.season;
  els.experienceDate.value = record.date;
  els.experienceOutcome.value = record.outcome;
  els.experienceTags.value = record.tags.join(", ");
  els.experienceSummaryInput.value = record.summary;
  els.experienceTopics.value = record.topics;
  els.experienceReflection.value = record.reflection;
  els.experienceFormTitle.textContent = "编辑面经";
  els.cancelExperienceEditBtn.classList.remove("hidden");
  els.experienceForm.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderExperiences() {
  if (!els.experienceList) return;
  if (els.experienceDate && !els.experienceDate.value && !els.experienceId.value) {
    els.experienceDate.value = localDateKey();
  }
  const records = [...(state.interviewExperiences || [])]
    .map(normalizeInterviewExperience)
    .sort((left, right) => new Date(right.updatedAt) - new Date(left.updatedAt));
  const filter = els.experienceFilter?.value || "all";
  const visibleRecords = filter === "all" ? records : records.filter((item) => item.stage === filter);
  const sharedCount = records.filter((item) => item.sharedPostId).length;
  if (els.experienceCount) els.experienceCount.textContent = String(records.length);
  if (els.sharedExperienceCount) els.sharedExperienceCount.textContent = String(sharedCount);
  els.experienceList.innerHTML = "";
  if (!visibleRecords.length) {
    els.experienceList.appendChild(emptyBlock(records.length ? "当前筛选下还没有面经。" : "还没有面经记录。完成一次轮次后，把过程与下一步训练记下来。"));
    return;
  }
  els.experienceList.innerHTML = visibleRecords.map((record) => `
    <article class="experience-card">
      <div class="experience-card-head">
        <div class="experience-card-title">
          <div class="experience-badges">
            <span>${escapeHtml(record.stage)}</span>
            <span class="outcome">${escapeHtml(formatExperienceOutcome(record.outcome))}</span>
            ${record.sharedPostId ? '<span class="shared">已分享</span>' : '<span class="private">私有</span>'}
          </div>
          <h4>${escapeHtml(record.firm)} · ${escapeHtml(record.role)}</h4>
          <small>${escapeHtml(record.season)} · ${escapeHtml(formatExperienceDate(record.date))}</small>
        </div>
        <div class="experience-card-actions">
          <button class="icon-button ghost" type="button" data-experience-edit="${escapeHtml(record.id)}" aria-label="编辑面经" title="编辑面经"><i data-lucide="pencil-line"></i></button>
          <button class="icon-button ghost danger" type="button" data-experience-delete="${escapeHtml(record.id)}" aria-label="删除面经" title="删除面经"><i data-lucide="trash-2"></i></button>
        </div>
      </div>
      <div class="experience-card-body">
        <div><strong>流程概览</strong><p>${escapeHtml(record.summary)}</p></div>
        ${record.topics ? `<div><strong>考察主题</strong><p>${escapeHtml(record.topics)}</p></div>` : ""}
        ${record.reflection ? `<div><strong>复盘与下一步</strong><p>${escapeHtml(record.reflection)}</p></div>` : ""}
      </div>
      ${record.tags.length ? `<div class="experience-tags">${record.tags.map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}</div>` : ""}
      <div class="experience-share-row">
        <button class="secondary-button" type="button" data-experience-share="${escapeHtml(record.id)}"><i data-lucide="share-2"></i>${record.sharedPostId ? "更新社群分享" : "分享至社群"}</button>
      </div>
      ${pendingExperienceShareId === record.id ? `
        <div class="experience-share-confirm" role="alert">
          <p>确认已移除受保密要求约束的原题、姓名和联系方式后，再发布到社群。</p>
          <div>
            <button class="primary-button" type="button" data-experience-share-confirm="${escapeHtml(record.id)}">确认分享</button>
            <button class="secondary-button" type="button" data-experience-share-cancel="true">取消</button>
          </div>
        </div>
      ` : ""}
    </article>
  `).join("");
  refreshIcons();
}

function handleExperienceListAction(event) {
  const edit = event.target.closest("[data-experience-edit]");
  if (edit) {
    editInterviewExperience(edit.dataset.experienceEdit);
    return;
  }
  const remove = event.target.closest("[data-experience-delete]");
  if (remove) {
    deleteInterviewExperience(remove.dataset.experienceDelete);
    return;
  }
  const share = event.target.closest("[data-experience-share]");
  if (share) {
    pendingExperienceShareId = share.dataset.experienceShare;
    renderExperiences();
    return;
  }
  if (event.target.closest("[data-experience-share-cancel]")) {
    pendingExperienceShareId = "";
    renderExperiences();
    return;
  }
  const confirmShare = event.target.closest("[data-experience-share-confirm]");
  if (confirmShare) publishInterviewExperience(confirmShare.dataset.experienceShareConfirm);
}

function deleteInterviewExperience(id) {
  const record = state.interviewExperiences.find((item) => item.id === id);
  if (!record) return;
  const warning = record.sharedPostId
    ? "删除私有面经不会删除已经发布到社群的分享。确认删除这条私有记录？"
    : "确认删除这条面经记录？";
  if (!window.confirm(warning)) return;
  state.interviewExperiences = state.interviewExperiences.filter((item) => item.id !== id);
  if (els.experienceId?.value === id) resetExperienceForm();
  pendingExperienceShareId = "";
  saveState();
  renderExperiences();
}

function publishInterviewExperience(id) {
  const record = state.interviewExperiences.find((item) => item.id === id);
  if (!record || !currentUser) return;
  community = loadCommunity();
  const existing = community.posts.find((post) => post.id === record.sharedPostId);
  const postId = existing?.id || record.sharedPostId || makeId();
  const publishedPost = normalizeCommunityPost({
    ...existing,
    id: postId,
    kind: "experience",
    experience: record,
    authorId: currentUser.id,
    authorName: currentUser.name || currentUser.email || "Quant",
    authorAvatar: currentUser.picture || "",
    country: currentUser.country,
    region: currentUser.region,
    text: formatSharedExperienceText(record),
    likes: existing?.likes || [],
    comments: existing?.comments || [],
    createdAt: existing?.createdAt || new Date().toISOString()
  });
  community.posts = [publishedPost, ...community.posts.filter((post) => post.id !== postId)];
  const now = new Date().toISOString();
  state.interviewExperiences = state.interviewExperiences.map((item) => item.id === id
    ? normalizeInterviewExperience({ ...item, sharedPostId: postId, sharedAt: now, updatedAt: now })
    : item);
  pendingExperienceShareId = "";
  saveCommunity();
  saveState();
  communityFilter = "experience";
  renderExperiences();
  switchModule("community");
  renderCommunity();
}

function formatSharedExperienceText(record) {
  const lines = [`${record.firm} · ${record.role} · ${record.stage}`, `${record.season}${record.date ? ` · ${formatExperienceDate(record.date)}` : ""}`];
  lines.push(`流程：${record.summary}`);
  if (record.topics) lines.push(`主题：${record.topics}`);
  if (record.reflection) lines.push(`复盘：${record.reflection}`);
  return lines.join("\n");
}

function formatExperienceOutcome(outcome) {
  return {
    Waiting: "等待结果",
    Advanced: "进入下一轮",
    Offer: "Offer",
    Closed: "流程结束",
    Withdrawn: "已撤回"
  }[outcome] || outcome;
}

function formatExperienceDate(date) {
  if (!date) return "日期未记录";
  return date.replace(/-/g, "/");
}

function renderResume() {
  if (!els.resumeText || !els.resumeReview) return;
  if (document.activeElement !== els.resumeText) {
    els.resumeText.value = state.resume?.text || "";
  }
  renderResumeReview();
  renderAccountResumeMeta();
}

function renderResumeReview() {
  if (!els.resumeReview) return;
  const review = Array.isArray(state.resume?.review) ? state.resume.review : [];
  els.resumeReview.innerHTML = "";
  if (!review.length) {
    const empty = document.createElement("p");
    empty.className = "muted-empty";
    empty.textContent = getLanguage() === "en"
      ? "Run the review to get role-specific edits."
      : "点击 LLM 修改简历后，这里会显示针对岗位的修改要点。";
    els.resumeReview.appendChild(empty);
    return;
  }
  const list = document.createElement("ul");
  review.forEach((item) => {
    const row = document.createElement("li");
    row.textContent = item;
    list.appendChild(row);
  });
  els.resumeReview.appendChild(list);
}

function saveResumeText() {
  const text = els.resumeText?.value.trim() || "";
  state.resume = normalizeResumeState({
    ...state.resume,
    text,
    updatedAt: new Date().toISOString()
  });
  saveState();
  renderResume();
  if (els.accountMessage) els.accountMessage.textContent = t("resumeSaved");
}

async function handleAccountResumeFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  if (file.size > 5 * 1024 * 1024) {
    if (els.accountResumeMeta) els.accountResumeMeta.textContent = getLanguage() === "en"
      ? "Resume file is too large. Keep it under 5MB."
      : "简历文件太大，请控制在 5MB 以内。";
    event.target.value = "";
    return;
  }

  const isTextResume = /\.(txt|md|tex)$/i.test(file.name) || /text|markdown|latex/i.test(file.type);
  const nextResume = {
    ...state.resume,
    fileName: file.name,
    fileType: file.type || "application/octet-stream",
    fileSize: file.size,
    uploadedAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };

  if (isTextResume) {
    const payload = await readFilePayload(file, { preferDataUrl: false });
    nextResume.text = payload.text || "";
    if (els.resumeText) els.resumeText.value = nextResume.text;
  }

  state.resume = normalizeResumeState(nextResume);
  saveState();
  renderResume();
  event.target.value = "";
}

function renderAccountResumeMeta() {
  if (!els.accountResumeMeta) return;
  const resume = normalizeResumeState(state.resume);
  if (resume.fileName) {
    const sizeKb = Math.max(1, Math.round(resume.fileSize / 1024));
    els.accountResumeMeta.textContent = `${resume.fileName} · ${sizeKb} KB`;
    return;
  }
  els.accountResumeMeta.textContent = t("resumeUploadHint");
}

async function reviewResumeWithLlm() {
  const text = els.resumeText?.value.trim() || state.resume?.text || "";
  if (!text) {
    renderInlineReview([t("resumeNoContent")]);
    return;
  }
  state.resume = normalizeResumeState({
    ...state.resume,
    text,
    updatedAt: new Date().toISOString()
  });
  saveState();
  setButtonBusy(els.reviewResumeBtn, true, getLanguage() === "en" ? "Reviewing" : "分析中");
  let review;
  try {
    review = await requestResumeReviewFromApi(text);
  } catch {
    review = localResumeReview(text);
  }
  state.resume = normalizeResumeState({
    ...state.resume,
    review,
    updatedAt: new Date().toISOString()
  });
  saveState();
  renderResume();
  setButtonBusy(els.reviewResumeBtn, false);
}

function renderInlineReview(items) {
  state.resume = normalizeResumeState({ ...state.resume, review: items });
  renderResumeReview();
}

async function requestResumeReviewFromApi(text) {
  const endpoint = (els.llmEndpointInput?.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput?.value || llmConfig.model)
  };
  saveLlmConfigToStorage();
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "resume_review",
      model: llmConfig.model,
      language: getLanguage(),
      graduationTerm: currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM,
      target: "quant internship / full-time",
      resume: text
    })
  });
  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  const items = data.items || data.suggestions || data.review || data.reply || data.text;
  if (Array.isArray(items)) return items.map(String).filter(Boolean).slice(0, 8);
  return String(items || "")
    .split(/\n+/)
    .map((line) => line.replace(/^[-*\d.\s]+/, "").trim())
    .filter(Boolean)
    .slice(0, 8);
}

function localResumeReview(text) {
  const isEn = getLanguage() === "en";
  const lower = text.toLowerCase();
  const bullets = [];
  if (!/\b\d+%|\$\d+|\b\d+x|\b\d+\s*(ms|sec|bps|users|trades|rows)\b/i.test(text)) {
    bullets.push(isEn
      ? "Add measurable outcomes to at least 3 bullets: latency, accuracy, PnL proxy, data size, or speed-up."
      : "至少给 3 条经历补上量化结果：延迟、准确率、PnL proxy、数据规模或速度提升。");
  }
  if (!/python|pandas|numpy|sql|c\+\+|java/i.test(lower)) {
    bullets.push(isEn
      ? "Make the technical stack obvious: Python, pandas/NumPy, SQL, C++/Java, or the stack you actually used."
      : "技术栈要一眼可见：Python、pandas/NumPy、SQL、C++/Java，或你实际用过的工具。");
  }
  if (!/market|option|trading|probability|statistics|alpha|risk/i.test(lower)) {
    bullets.push(isEn
      ? "Add one quant-facing line that connects a project to markets, probability, statistics, risk, or options."
      : "补一条 quant 相关表达，把项目和市场、概率、统计、risk 或 options 联系起来。");
  }
  if (!/lead|built|designed|implemented|optimized|analyzed/i.test(lower)) {
    bullets.push(isEn
      ? "Start bullets with stronger verbs: built, optimized, analyzed, implemented, designed."
      : "bullet 开头用更强动词：built、optimized、analyzed、implemented、designed。");
  }
  bullets.push(isEn
    ? `Tune the education line for graduation term ${currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM} and put recruiting status near the top.`
    : `教育经历里明确毕业时间 ${currentUser?.graduationTerm || DEFAULT_GRADUATION_TERM}，并把求职状态放到更靠前的位置。`);
  return bullets.slice(0, 6);
}

function renderJobs(filter = getActiveJobFilter()) {
  if (!els.jobsList) return;
  const selected = filter || "all";
  document.querySelectorAll("[data-job-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.jobFilter === selected);
  });
  const jobs = normalizeJobs(state.jobs)
    .filter((job) => selected === "all" || job.type === selected)
    .sort((a, b) => jobTime(b) - jobTime(a));
  els.jobsList.innerHTML = "";
  if (!jobs.length) {
    els.jobsList.appendChild(emptyBlock(t("searchEmpty")));
    return;
  }
  jobs.forEach((job) => {
    const card = document.createElement("article");
    card.className = "job-card content-card problem-card";
    card.dataset.jobId = job.id;
    card.tabIndex = 0;
    card.setAttribute("role", "link");
    card.setAttribute("aria-label", `${t("applyNow")}: ${job.company} ${job.title}`);
    card.addEventListener("click", (event) => {
      if (event.target.closest("a")) return;
      openExternalUrl(job.url);
    });
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openExternalUrl(job.url);
    });
    const typeLabel = job.type === "fulltime" ? t("fulltime") : t("internship");

    const title = document.createElement("h3");
    title.textContent = job.title;

    const meta = document.createElement("div");
    meta.className = "problem-meta";
    addProblemTag(meta, typeLabel, `difficulty ${job.type === "fulltime" ? "medium" : "easy"}`);
    addProblemTag(meta, job.company, "topic");
    addProblemTag(meta, formatNewsDate(job.postedAt || job.createdAt || ""), "source");

    const prompt = document.createElement("div");
    prompt.className = "problem-prompt";
    prompt.textContent = `${job.company} · ${job.location}`;

    const tags = document.createElement("div");
    tags.className = "problem-meta";
    job.tags.slice(0, 4).forEach((tag) => addProblemTag(tags, tag, "skill"));

    const footer = document.createElement("div");
    footer.className = "problem-card-footer";
    const link = document.createElement("a");
    link.className = "content-card-link";
    link.href = safeExternalUrl(job.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = t("applyNow");
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "external-link");
    footer.append(link, icon);

    card.append(title, meta, prompt, tags, footer);
    els.jobsList.appendChild(card);
  });
  refreshIcons();
}

function renderCompanies() {
  if (!els.companyOverviewList) return;
  const isEn = getLanguage() === "en";
  document.querySelectorAll("[data-company-tier]").forEach((button) => {
    const tier = button.dataset.companyTier || "all";
    button.classList.toggle("active", tier === companyTierFilter);
    button.setAttribute("aria-pressed", String(tier === companyTierFilter));
  });

  const problems = getCatalogProblems();
  const entries = quantCompanyDefs
    .map((company) => ({
      company,
      stats: getCompanyProblemStats(company, problems),
      jobs: getCompanyJobs(company)
    }))
    .filter((entry) => companyTierFilter === "all" || entry.company.tier.toLowerCase() === companyTierFilter)
    .sort((left, right) => (
      companyTierWeight(left.company.tier) - companyTierWeight(right.company.tier)
      || right.stats.total - left.stats.total
      || left.company.name.localeCompare(right.company.name)
    ));

  if (els.companiesPageTitle) els.companiesPageTitle.textContent = t("companies");
  if (els.companiesSummary) {
    const questionCount = entries.reduce((sum, entry) => sum + entry.stats.total, 0);
    els.companiesSummary.textContent = isEn
      ? `${entries.length} firms · ${questionCount} tagged questions · tier, topics, careers`
      : `${entries.length} 家公司 · ${questionCount} 道标注题 · tier、考点和官网入口`;
  }

  els.companyOverviewList.innerHTML = "";
  if (!entries.length) {
    els.companyOverviewList.appendChild(emptyBlock(t("searchEmpty")));
    return;
  }

  entries.forEach(({ company, stats, jobs }) => {
    const summary = isEn ? company.summaryEn : company.summaryZh;
    const card = document.createElement("article");
    card.className = "company-overview-card";
    card.dataset.companyCard = company.slug;
    card.style.setProperty("--company-color", company.color);
    card.style.setProperty("--company-accent", company.accent);

    const head = document.createElement("div");
    head.className = "company-card-head";
    const identity = document.createElement("div");
    identity.className = "company-card-identity";
    identity.appendChild(createCompanyMark(company));
    const titleWrap = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = company.name;
    const meta = document.createElement("small");
    meta.textContent = `Tier ${company.tier} · ${company.type}`;
    titleWrap.append(title, meta);
    identity.appendChild(titleWrap);
    const count = document.createElement("div");
    count.className = "company-question-count";
    count.innerHTML = `<strong>${escapeHtml(String(stats.total))}</strong><span>${escapeHtml(t("companyQuestions"))}</span>`;
    head.append(identity, count);

    const copy = document.createElement("p");
    copy.className = "company-summary";
    copy.textContent = summary;

    const focus = document.createElement("div");
    focus.className = "company-focus-list";
    company.focus.slice(0, 4).forEach((item) => {
      const chip = document.createElement("span");
      chip.textContent = item;
      focus.appendChild(chip);
    });

    const detail = document.createElement("div");
    detail.className = "company-detail-grid";
    detail.innerHTML = `
      <span><b>${escapeHtml(String(stats.completed))}/${escapeHtml(String(stats.total))}</b><small>${escapeHtml(t("companyProgress"))}</small></span>
      <span><b>${escapeHtml(String(jobs.length))}</b><small>${escapeHtml(isEn ? "open roles" : "岗位入口")}</small></span>
      <span><b>${escapeHtml(company.locations.slice(0, 2).join(" / "))}</b><small>${escapeHtml(isEn ? "locations" : "常见地点")}</small></span>
    `;

    const progress = document.createElement("div");
    progress.className = "company-progress-track";
    progress.innerHTML = `<i style="width:${stats.percent}%"></i>`;

    const actions = document.createElement("div");
    actions.className = "company-card-actions";
    const practice = document.createElement("button");
    practice.type = "button";
    practice.className = "primary-button compact";
    practice.dataset.companyPractice = company.slug;
    practice.innerHTML = `<i data-lucide="target"></i>${escapeHtml(t("companyPractice"))}`;
    const careers = document.createElement("button");
    careers.type = "button";
    careers.className = "secondary-button compact";
    careers.dataset.companyCareers = company.website;
    careers.innerHTML = `<i data-lucide="external-link"></i>${escapeHtml(t("companyCareers"))}`;
    actions.append(practice, careers);

    const watermark = document.createElement("div");
    watermark.className = "company-watermark";
    watermark.textContent = company.short;

    card.append(watermark, head, copy, focus, detail, progress, actions);
    els.companyOverviewList.appendChild(card);
  });
  refreshIcons();
}

function jobTime(job) {
  const value = new Date(job?.postedAt || job?.createdAt || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function getActiveJobFilter() {
  return document.querySelector("[data-job-filter].active")?.dataset.jobFilter || "all";
}

function getCourseState(courseId) {
  const normalized = normalizeCourseStates(state.courseStates).find((item) => item.courseId === courseId);
  return normalized || {
    courseId,
    saved: false,
    inPath: false,
    done: false,
    note: "",
    selectedSourceId: "",
    pathAddedAt: "",
    updatedAt: ""
  };
}

function updateCourseState(courseId, patch = {}) {
  const current = getCourseState(courseId);
  const next = normalizeCourseStates([{
    ...current,
    ...patch,
    courseId,
    updatedAt: new Date().toISOString()
  }])[0];
  const without = normalizeCourseStates(state.courseStates).filter((item) => item.courseId !== courseId);
  if (next.saved || next.inPath || next.done || next.note || next.selectedSourceId) {
    state.courseStates = [...without, next];
  } else {
    state.courseStates = without;
  }
  saveState();
}

function getSelectedCourseSource(course, courseState = getCourseState(course.id)) {
  const sources = normalizeContentSources(course.sources, { title: course.provider, provider: course.platform, url: course.url });
  return sources.find((source) => source.id === courseState.selectedSourceId)
    || sources.find((source) => source.embeddable)
    || sources[0]
    || null;
}

function renderCourses() {
  if (!els.courseList) return;
  const courses = normalizeCourses(state.courses);
  els.courseList.innerHTML = "";
  renderLearningPath(courses);
  courses.forEach((course) => {
    const courseState = getCourseState(course.id);
    const selectedSource = getSelectedCourseSource(course, courseState);
    const card = document.createElement("article");
    card.className = "course-card content-card problem-card";
    card.dataset.courseId = course.id;

    const title = document.createElement("h3");
    title.textContent = course.title;

    const meta = document.createElement("div");
    meta.className = "problem-meta";
    addProblemTag(meta, course.platform, "topic");
    addProblemTag(meta, course.topic, "skill");
    addProblemTag(meta, course.level, "score");

    const prompt = document.createElement("div");
    prompt.className = "problem-prompt";
    prompt.textContent = `${course.provider} · ${course.summary}`;

    const sourceBar = document.createElement("div");
    sourceBar.className = "course-source-bar";
    course.sources.forEach((source) => {
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.courseAction = "source";
      button.dataset.courseId = course.id;
      button.dataset.sourceId = source.id;
      button.className = source.id === selectedSource?.id ? "active" : "";
      button.textContent = source.provider;
      sourceBar.appendChild(button);
    });

    const player = document.createElement("div");
    player.className = "course-player";
    if (selectedSource?.embedUrl) {
      const iframe = document.createElement("iframe");
      iframe.src = selectedSource.embedUrl;
      iframe.title = `${course.title} · ${selectedSource.provider}`;
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      player.appendChild(iframe);
    } else {
      const fallback = document.createElement("div");
      fallback.className = "course-player-fallback";
      fallback.innerHTML = `<strong>${escapeHtml(t("previewUnavailable"))}</strong>`;
      player.appendChild(fallback);
    }

    const tags = document.createElement("div");
    tags.className = "problem-meta";
    course.tags.slice(0, 4).forEach((tag) => addProblemTag(tags, tag, "skill"));

    const actions = document.createElement("div");
    actions.className = "course-actions";
    [
      ["save", courseState.saved ? t("savedCourse") : t("saveCourse"), courseState.saved ? "bookmark-check" : "bookmark"],
      ["path", courseState.inPath ? t("inLearningPath") : t("addToPath"), courseState.inPath ? "route" : "plus"],
      ["done", courseState.done ? t("courseDone") : t("markCourseDone"), courseState.done ? "check-circle-2" : "circle"]
    ].forEach(([action, label, iconName]) => {
      const button = document.createElement("button");
      button.type = "button";
      button.className = `secondary-button compact${courseState[action === "save" ? "saved" : action === "path" ? "inPath" : "done"] ? " is-active" : ""}`;
      button.dataset.courseAction = action;
      button.dataset.courseId = course.id;
      button.innerHTML = `<i data-lucide="${iconName}"></i>${escapeHtml(label)}`;
      actions.appendChild(button);
    });

    const notes = document.createElement("label");
    notes.className = "course-note-field";
    notes.innerHTML = `<span>${escapeHtml(t("courseNote"))}</span>`;
    const textarea = document.createElement("textarea");
    textarea.dataset.courseNote = course.id;
    textarea.rows = 3;
    textarea.placeholder = t("courseNotePlaceholder");
    textarea.value = courseState.note || "";
    notes.appendChild(textarea);

    const footer = document.createElement("div");
    footer.className = "problem-card-footer";
    const link = document.createElement("a");
    link.className = "content-card-link";
    link.href = safeExternalUrl(selectedSource?.url || course.url);
    link.target = "_blank";
    link.rel = "noreferrer";
    link.textContent = t("openOriginal");
    const icon = document.createElement("i");
    icon.setAttribute("data-lucide", "external-link");
    footer.append(link, icon);

    card.append(title, meta, prompt, sourceBar, player, tags, actions, notes, footer);
    els.courseList.appendChild(card);
  });
  refreshIcons();
}

function renderLearningPath(courses = normalizeCourses(state.courses)) {
  if (!els.coursePathList) return;
  const isEn = getLanguage() === "en";
  setText("#learningPathTitle", t("learningPathTitle"));
  setText("#learningPathHint", t("learningPathHint"));
  const courseById = new Map(courses.map((course) => [course.id, course]));
  const pathItems = normalizeCourseStates(state.courseStates)
    .filter((item) => item.inPath && courseById.has(item.courseId))
    .sort((a, b) => new Date(a.pathAddedAt || a.updatedAt || 0) - new Date(b.pathAddedAt || b.updatedAt || 0));
  els.coursePathList.innerHTML = "";
  if (!pathItems.length) {
    els.coursePathList.appendChild(emptyBlock(t("learningPathEmpty")));
    return;
  }
  pathItems.forEach((item, index) => {
    const course = courseById.get(item.courseId);
    const row = document.createElement("div");
    row.className = `course-path-item${item.done ? " is-done" : ""}`;
    const indexNode = document.createElement("span");
    indexNode.className = "course-path-index";
    indexNode.textContent = String(index + 1);
    const copy = document.createElement("div");
    copy.innerHTML = `<strong>${escapeHtml(course.title)}</strong><small>${escapeHtml(course.topic)} · ${escapeHtml(item.done ? t("courseDone") : (isEn ? "Queued" : "待学习"))}</small>`;
    const done = document.createElement("button");
    done.type = "button";
    done.className = "icon-button ghost";
    done.dataset.courseAction = "done";
    done.dataset.courseId = course.id;
    done.title = item.done ? t("courseDone") : t("markCourseDone");
    done.setAttribute("aria-label", done.title);
    done.innerHTML = `<i data-lucide="${item.done ? "check-circle-2" : "circle"}"></i>`;
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "icon-button ghost";
    remove.dataset.courseAction = "path";
    remove.dataset.courseId = course.id;
    remove.title = isEn ? "Remove from path" : "移出路径";
    remove.setAttribute("aria-label", remove.title);
    remove.innerHTML = '<i data-lucide="x"></i>';
    row.append(indexNode, copy, done, remove);
    els.coursePathList.appendChild(row);
  });
}

function handleCourseListClick(event) {
  const button = event.target.closest("[data-course-action]");
  if (!button) return;
  const courseId = button.dataset.courseId || "";
  const course = normalizeCourses(state.courses).find((item) => item.id === courseId);
  if (!course) return;
  const courseState = getCourseState(courseId);
  const action = button.dataset.courseAction;
  if (action === "source") {
    updateCourseState(courseId, { selectedSourceId: button.dataset.sourceId || "" });
  } else if (action === "save") {
    updateCourseState(courseId, { saved: !courseState.saved });
  } else if (action === "path") {
    const inPath = !courseState.inPath;
    updateCourseState(courseId, {
      inPath,
      pathAddedAt: inPath ? (courseState.pathAddedAt || new Date().toISOString()) : ""
    });
  } else if (action === "done") {
    updateCourseState(courseId, { done: !courseState.done, inPath: courseState.inPath || true, pathAddedAt: courseState.pathAddedAt || new Date().toISOString() });
  }
  renderCourses();
  refreshIcons();
}

function handleCourseNoteChange(event) {
  const field = event.target.closest("[data-course-note]");
  if (!field) return;
  updateCourseState(field.dataset.courseNote, { note: field.value });
  renderLearningPath();
}

function maybeAutoRefreshJobs() {
  if (!currentUser || jobsRefreshInFlight) return;
  const lastFetch = new Date(state.jobsFetchedAt || 0).getTime();
  const lastAttempt = new Date(state.jobsFetchAttemptAt || 0).getTime();
  const fetchDue = !lastFetch || Date.now() - lastFetch > JOBS_AUTO_REFRESH_MS;
  const retryDue = !lastAttempt || Date.now() - lastAttempt > JOBS_RETRY_MS;
  if (fetchDue && retryDue) refreshJobsFromApi(false);
}

async function refreshJobsFromApi(showStatus = false) {
  if (jobsRefreshInFlight) return;
  jobsRefreshInFlight = true;
  state.jobsFetchAttemptAt = new Date().toISOString();
  if (showStatus && els.jobsSummary) els.jobsSummary.textContent = getLanguage() === "en" ? "Syncing live jobs..." : "岗位同步中...";

  try {
    const items = await requestJobsFromApi();
    if (items.length) upsertJobs(items);
    state.jobsFetchedAt = new Date().toISOString();
    state.jobsSyncError = "";
    saveState();
    renderJobs();
  } catch (error) {
    state.jobsSyncError = error.message || "Jobs API failed";
    saveState();
    if (showStatus && els.jobsSummary) els.jobsSummary.textContent = getLanguage() === "en"
      ? "Live job API is unavailable. Showing saved links."
      : "岗位 API 暂不可用，先显示已保存链接。";
  } finally {
    jobsRefreshInFlight = false;
    refreshIcons();
  }
}

async function requestJobsFromApi() {
  const endpoint = getJobsEndpoint();
  if (!endpoint) throw new Error("Missing jobs endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max: 18,
      boards: ["janestreet", "optiverus", "imc", "jumptrading"]
    })
  });
  if (!response.ok) throw new Error(`Jobs API ${response.status}`);
  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || data.jobs || [];
  return items.map(normalizeJobItem);
}

function getJobsEndpoint() {
  const endpoint = (llmConfig.endpoint || DEFAULT_LLM_ENDPOINT).trim();
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/(interview|classify-log|news)\/?$/, "/jobs");
    if (!url.pathname.endsWith("/jobs")) url.pathname = "/jobs";
    url.search = "";
    return url.toString();
  } catch {
    return "http://127.0.0.1:8787/jobs";
  }
}

function normalizeJobItem(raw = {}) {
  return normalizeJobs([raw])[0];
}

function upsertJobs(items) {
  const byId = new Map(normalizeJobs(state.jobs).map((item) => [item.id, item]));
  items.map(normalizeJobItem).forEach((item) => {
    if (safeExternalUrl(item.url) === "#") return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item });
  });
  state.jobs = [...byId.values()];
  saveState();
}

function renderGlobalSearchResults() {
  if (!els.globalSearchInput || !els.globalSearchResults) return;
  const query = els.globalSearchInput.value.trim();
  globalSearchMatches = buildGlobalSearchResults(query);
  els.globalSearchResults.innerHTML = "";
  if (!query) {
    hideGlobalSearchResults();
    return;
  }

  if (!globalSearchMatches.length) {
    const empty = document.createElement("div");
    empty.className = "global-search-empty";
    empty.textContent = t("searchEmpty");
    els.globalSearchResults.appendChild(empty);
    els.globalSearchResults.classList.remove("hidden");
    return;
  }

  globalSearchMatches.forEach((result, index) => {
    const button = document.createElement("button");
    button.className = "global-search-result";
    button.type = "button";
    button.dataset.searchIndex = String(index);
    const meta = document.createElement("span");
    meta.className = "global-search-result-meta";
    meta.textContent = result.typeLabel;
    const title = document.createElement("strong");
    title.textContent = result.title;
    const detail = document.createElement("small");
    detail.textContent = result.detail;
    button.append(meta, title, detail);
    button.addEventListener("mousedown", (event) => event.preventDefault());
    button.addEventListener("click", () => activateGlobalSearchResult(index));
    els.globalSearchResults.appendChild(button);
  });
  els.globalSearchResults.classList.remove("hidden");
}

function hideGlobalSearchResults() {
  els.globalSearchResults?.classList.add("hidden");
}

function clearGlobalSearch() {
  if (els.globalSearchInput) els.globalSearchInput.value = "";
  globalSearchMatches = [];
  hideGlobalSearchResults();
}

function handleGlobalSearchKeydown(event) {
  if (event.key === "Escape") {
    hideGlobalSearchResults();
    return;
  }
  if (event.key === "Enter") {
    event.preventDefault();
    if (!globalSearchMatches.length) renderGlobalSearchResults();
    if (globalSearchMatches.length) activateGlobalSearchResult(0);
    return;
  }
  if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
  const buttons = [...(els.globalSearchResults?.querySelectorAll(".global-search-result") || [])];
  if (!buttons.length) return;
  event.preventDefault();
  const current = buttons.findIndex((button) => button === document.activeElement);
  const delta = event.key === "ArrowDown" ? 1 : -1;
  const next = current < 0 ? 0 : (current + delta + buttons.length) % buttons.length;
  buttons[next].focus();
}

function buildGlobalSearchResults(query) {
  const normalized = normalizeSearchQuery(query);
  if (!normalized) return [];
  const results = [];

  getModuleSearchDefs().forEach((item) => {
    if (!matchesQuery(item.fields, normalized)) return;
    results.push({
      type: "module",
      typeLabel: getLanguage() === "en" ? "Module" : "模块",
      title: item.label,
      detail: item.detail,
      module: item.module
    });
  });

  state.problems.filter(isCatalogProblem).forEach((problem) => {
    const isEn = getLanguage() === "en";
    const title = getProblemDisplayTitle(problem, isEn);
    const fields = [
      title,
      problem.titleEn,
      problem.titleZh,
      problem.promptEn,
      problem.promptZh,
      problem.answer,
      problem.explanation,
      problem.category,
      problem.difficulty,
      problem.tags.join(" "),
      problem.tags.map(formatProblemTag).join(" "),
      getProblemCompanies(problem).map((company) => getCompanyAliases(company).join(" ")).join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "problem",
      typeLabel: t("problems"),
      title,
      detail: `${formatCategoryLabel(problem.category)} · ${problem.difficulty}`,
      id: problem.id,
      rank: scoreProblemSearchMatch(problem, normalized)
    });
  });

  quantCompanyDefs.forEach((company) => {
    const summary = getLanguage() === "en" ? company.summaryEn : company.summaryZh;
    const stats = getCompanyProblemStats(company);
    const fields = [
      company.name,
      company.short,
      company.tier,
      company.type,
      summary,
      company.locations.join(" "),
      company.focus.join(" "),
      company.aliases.join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "company",
      typeLabel: t("companies"),
      title: company.name,
      detail: `Tier ${company.tier} · ${stats.total} ${t("companyQuestions")}`,
      id: company.slug,
      rank: company.name.toLowerCase().includes(normalized) ? 2 : 12
    });
  });

  normalizeJobs(state.jobs).forEach((job) => {
    const fields = [job.company, job.title, job.type, job.location, job.postedAt, job.tags.join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "job",
      typeLabel: t("jobs"),
      title: `${job.company} · ${job.title}`,
      detail: `${job.location} · ${job.type}`,
      id: job.id,
      url: job.url
    });
  });

  normalizeCourses(state.courses).forEach((course) => {
    const fields = [
      course.title,
      course.platform,
      course.provider,
      course.topic,
      course.level,
      course.summary,
      course.tags.join(" "),
      course.sources.map((source) => `${source.provider} ${source.title} ${source.url}`).join(" ")
    ];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "course",
      typeLabel: t("courses"),
      title: course.title,
      detail: `${course.platform} · ${course.topic}`,
      id: course.id,
      url: course.url
    });
  });

  Object.entries(skillDefs).forEach(([key, skill]) => {
    const fields = [skill.name, skill.short, skill.subtitle, skill.keywords.join(" "), skill.subskills.join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "skill",
      typeLabel: t("skills"),
      title: skill.name,
      detail: skill.subtitle,
      id: key
    });
  });

  sortNews(state.news || []).forEach((item) => {
    const fields = [item.title, item.titleZh, item.source, item.summary, item.insight, (item.tags || []).join(" ")];
    if (!matchesQuery(fields, normalized)) return;
    results.push({
      type: "news",
      typeLabel: t("news"),
      title: item.titleZh || item.title,
      detail: `${item.source || inferSource(item.sourceUrl)} · ${formatNewsDate(item.publishedAt || item.createdAt)}`,
      id: item.id
    });
  });

  return results
    .sort((a, b) => (a.rank ?? 40) - (b.rank ?? 40))
    .slice(0, 14);
}

function activateGlobalSearchResult(index) {
  const result = globalSearchMatches[index];
  if (!result) return;
  clearGlobalSearch();

  if (result.type === "module") {
    switchModule(result.module);
    return;
  }
  if (result.type === "problem") {
    switchModule("problems");
    openProblemFromSearch(result.id);
    return;
  }
  if (result.type === "job") {
    switchModule("jobs");
    window.setTimeout(() => spotlightElement(`[data-job-id="${cssEscape(result.id)}"]`), 80);
    return;
  }
  if (result.type === "company") {
    companyTierFilter = "all";
    switchModule("companies");
    window.setTimeout(() => spotlightElement(`[data-company-card="${cssEscape(result.id)}"]`), 80);
    return;
  }
  if (result.type === "course") {
    switchModule("courses");
    window.setTimeout(() => spotlightElement(`[data-course-id="${cssEscape(result.id)}"]`), 80);
    return;
  }
  if (result.type === "skill") {
    switchModule("skills");
    setRadarHover(result.id);
    return;
  }
  if (result.type === "news") {
    focusNewsItem(result.id);
  }
}

function getModuleSearchDefs() {
  return [
    { module: "overview", label: t("overview"), detail: "Dashboard / 总览", fields: [t("overview"), "overview", "dashboard", "总览", "首页", "home"] },
    { module: "plan", label: t("plan"), detail: "Interview prep plan / 备战计划", fields: [t("plan"), "plan", "计划", "备战", "schedule", "baseline"] },
    { module: "experiences", label: t("experiences"), detail: "Interview log / 面经", fields: [t("experiences"), "interview log", "面经", "复盘", "debrief", "experience"] },
    { module: "community", label: t("community"), detail: "Forum / 论坛", fields: [t("community"), "community", "forum", "论坛", "社区", "动态"] },
    { module: "messages", label: t("messages"), detail: "Messages / 聊天", fields: [t("messages"), "messages", "chat", "dm", "私信", "聊天"] },
    { module: "problems", label: t("problems"), detail: "Problem bank / 题库", fields: [t("problems"), "problems", "题目", "题库", "question bank", "problem bank", "概率题"] },
    { module: "interview", label: t("interview"), detail: "Mock interview / 模拟面试", fields: [t("interview"), "interview", "mock", "模拟面试", "面试", "oa"] },
    { module: "pk", label: t("pk"), detail: "PK", fields: [t("pk"), "pk", "对战", "battle"] },
    { module: "news", label: t("news"), detail: "Quant Wire / 新闻", fields: [t("news"), "news", "新闻", "wire", "market news"] },
    { module: "network", label: t("network"), detail: "Network / 人脉", fields: [t("network"), "network", "人脉", "networking"] },
    { module: "resume", label: t("resume"), detail: "Resume / 简历", fields: [t("resume"), "resume", "cv", "简历"] },
    { module: "jobs", label: t("jobs"), detail: "Jobs / 求职", fields: [t("jobs"), "jobs", "job", "求职", "岗位", "申请", "internship", "full-time"] },
    { module: "companies", label: t("companies"), detail: "Companies / 公司", fields: [t("companies"), "companies", "company", "firm", "公司", "tier", "quant firm", "jane street", "citadel", "optiver"] },
    { module: "courses", label: t("courses"), detail: "Courses / 课程", fields: [t("courses"), "course", "courses", "课程", "视频", "youtube", "bilibili", "b站"] },
    { module: "skills", label: t("skills"), detail: "Ability radar / 能力值", fields: [t("skills"), "skills", "ability", "能力值", "雷达", "知识点"] },
    { module: "tools", label: t("tools"), detail: "Mental math / 速算", fields: [t("tools"), "tools", "drills", "速算", "mental math"] },
    { module: "memory", label: t("memory"), detail: "Memory / 资料笔记", fields: [t("memory"), "memory", "notes", "资料", "笔记"] },
    { module: "settings", label: t("settings"), detail: "Settings / 设置", fields: [t("settings"), "settings", "设置", "config"] }
  ];
}

function normalizeSearchQuery(query) {
  return String(query || "").normalize("NFKC").trim().toLowerCase();
}

function matchesQuery(fields, normalizedQuery) {
  const text = normalizeSearchQuery(fields.filter(Boolean).join(" "));
  return normalizedQuery.split(/\s+/).filter(Boolean).every((token) => text.includes(token));
}

function spotlightElement(selector) {
  const node = document.querySelector(selector);
  if (!node) return;
  node.scrollIntoView({ behavior: "smooth", block: "center" });
  node.classList.add("spotlight");
  window.setTimeout(() => node.classList.remove("spotlight"), 900);
}

function cssEscape(value) {
  if (window.CSS?.escape) return CSS.escape(String(value));
  return String(value).replace(/"/g, '\\"');
}

function handleTopCheckIn() {
  if (hasCheckedInToday()) {
    updateCheckInPill();
    return;
  }
  const previous = getStreak();
  const today = dayKey(new Date());
  const nextCheckIns = (state.checkIns || []).filter((item) => dayKey(item.date) !== today);
  state.checkIns = [
    ...nextCheckIns,
    {
      id: `checkin-${today}`,
      date: new Date().toISOString()
    }
  ];
  const next = getStreak();
  state.streakCount = next;
  saveState();
  renderSummary();
  animateStreakCount(previous, next);
}

function hasCheckedInToday() {
  const today = dayKey(new Date());
  return (state.checkIns || []).some((item) => dayKey(item.date) === today);
}

function updateCheckInPill() {
  const pill = els.checkInPill;
  if (!pill) return;
  const checked = hasCheckedInToday();
  pill.classList.toggle("is-checked", checked);
  pill.disabled = checked;
  pill.setAttribute("aria-disabled", String(checked));
  pill.setAttribute("aria-label", checked ? t("checkInDone") : t("commandStreakLabel"));
  const label = pill.querySelector("small");
  if (label) label.textContent = checked ? t("checkInDone") : t("commandStreakLabel");
}

function animateStreakCount(previous, next) {
  const pill = els.checkInPill;
  const countNode = els.commandStreakCount;
  if (!pill || !countNode) return;
  pill.classList.remove("is-burning");
  pill.offsetWidth;
  pill.classList.add("is-burning");
  const burst = document.createElement("span");
  burst.className = "streak-burst";
  burst.textContent = "+1";
  pill.appendChild(burst);
  const start = performance.now();
  const duration = 520;
  const animate = (time) => {
    const progress = Math.min(1, (time - start) / duration);
    const value = Math.round(previous + (next - previous) * progress);
    countNode.textContent = value;
    if (progress < 1) {
      requestAnimationFrame(animate);
    } else {
      countNode.textContent = next;
      window.setTimeout(() => {
        pill.classList.remove("is-burning");
        burst.remove();
      }, 520);
    }
  };
  requestAnimationFrame(animate);
}

function renderRegionRank() {
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  const metric = settings.metric || "overall";
  const rows = getAllLeaderboardRows(metric);
  const country = currentUser?.country || "china";
  const region = currentUser?.region || getDefaultRegion(country);
  const regionalRows = rows.filter((row) => row.country === country && row.region === region);
  const place = regionalRows.findIndex((row) => row.id === currentUser?.id) + 1;
  const rank = place > 0 ? place : 1;
  const metricLabel = metric === "overall" ? "" : ` · ${getLeaderboardMetricLabel(metric)}`;
  els.regionRankText.textContent = `${getCountryLabel(country)} · ${getRegionLabel(region)}${metricLabel} #${rank}`;
  els.regionMedal.textContent = String(rank);
  els.regionMedal.className = `medal ${rank === 1 ? "gold" : rank === 2 ? "silver" : rank === 3 ? "bronze" : "plain"}`;
}

function renderSkills() {
  renderSkillScoreSummary();
  renderSkillRadarLegend();
  els.skillsGrid.innerHTML = "";
  Object.entries(skillDefs).forEach(([key, def]) => {
    const xp = state.skills[key] || 0;
    const score = getSkillScore(xp);
    const stats = getSkillPracticeStats(key);
    const node = els.skillTemplate.content.firstElementChild.cloneNode(true);
    node.dataset.skillKey = key;
    const icon = node.querySelector(".skill-icon");
    icon.textContent = def.short;
    icon.style.background = def.color;
    node.querySelector("h3").textContent = def.name;
    node.querySelector("small").textContent = def.subtitle;
    node.querySelector(".level-row strong").textContent = `${score}/100`;
    node.querySelector(".level-row span").textContent = `${xp} XP`;
    const fill = node.querySelector(".progress-fill");
    fill.style.width = `${score}%`;
    fill.style.background = def.color;
    const metricRow = document.createElement("div");
    metricRow.className = "skill-card-metrics";
    metricRow.innerHTML = `
      <span><b>${stats.practiceCount}</b><small>${escapeHtml(t("practiceCount"))}</small></span>
      <span><b>${stats.problemCount}</b><small>${escapeHtml(t("practicedProblems"))}</small></span>
      <span><b>${stats.averageScore == null ? "-" : Math.round(stats.averageScore)}</b><small>${escapeHtml(t("averageScore"))}</small></span>
    `;
    const subskills = node.querySelector(".subskills");
    def.subskills.forEach((label) => {
      const span = document.createElement("span");
      span.textContent = label;
      subskills.appendChild(span);
    });
    node.insertBefore(metricRow, subskills);
    node.addEventListener("mouseenter", (event) => setRadarHover(key, event));
    node.addEventListener("mousemove", (event) => setRadarHover(key, event));
    node.addEventListener("mouseleave", clearRadarHover);
    node.addEventListener("focusin", () => setRadarHover(key));
    node.addEventListener("focusout", clearRadarHover);
    els.skillsGrid.appendChild(node);
  });
  drawRadar();
  updateRadarLegendHighlight(radarHoverKey);
}

function renderSkillScoreSummary() {
  const score = getQuantScore();
  const stats = getAllSkillPracticeStats();
  const weakest = Object.entries(skillDefs)
    .map(([key, def]) => ({ key, def, score: getSkillScore(state.skills?.[key] || 0) }))
    .sort((a, b) => a.score - b.score)[0];
  if (els.skillsScoreValue) els.skillsScoreValue.textContent = formatScore(score);
  if (els.skillsEntriesCount) els.skillsEntriesCount.textContent = stats.practiceCount;
  if (els.skillsAverageScore) els.skillsAverageScore.textContent = stats.averageScore == null ? "-" : Math.round(stats.averageScore);
  if (els.skillsWeakestSkill) els.skillsWeakestSkill.textContent = weakest?.def.short || "-";
}

function renderSkillRadarLegend() {
  if (!els.skillRadarLegend) return;
  els.skillRadarLegend.innerHTML = "";
  Object.entries(skillDefs).forEach(([key, def]) => {
    const score = getSkillScore(state.skills?.[key] || 0);
    const row = document.createElement("button");
    row.className = "skill-radar-legend-row";
    row.type = "button";
    row.dataset.skillRadarKey = key;
    row.innerHTML = `
      <span class="legend-dot"></span>
      <span>${escapeHtml(def.name)}</span>
      <strong>${score}/100</strong>
    `;
    row.querySelector(".legend-dot").style.background = def.color;
    row.addEventListener("mouseenter", (event) => setRadarHover(key, event));
    row.addEventListener("mousemove", (event) => setRadarHover(key, event));
    row.addEventListener("click", (event) => setRadarHover(key, event));
    row.addEventListener("mouseleave", clearRadarHover);
    row.addEventListener("focus", () => setRadarHover(key));
    row.addEventListener("blur", clearRadarHover);
    els.skillRadarLegend.appendChild(row);
  });
}

function getSkillPracticeStats(skillKey) {
  const problemById = new Map((state.problems || []).map((problem) => [problem.id, problem]));
  const entries = (state.entries || []).filter((entry) => Number(entry.gains?.[skillKey] || 0) > 0);
  const relatedStates = (state.problemStates || []).filter((item) => {
    const problem = problemById.get(item.problemId);
    return problem && normalizeCategory(problem.category) === skillKey;
  });
  const problemIds = new Set(relatedStates.map((item) => item.problemId).filter(Boolean));
  entries.forEach((entry) => {
    if (entry.problemId) problemIds.add(entry.problemId);
  });

  const scoreValues = [];
  relatedStates.forEach((item) => {
    const history = Array.isArray(item.scoreHistory) ? item.scoreHistory : [];
    history.forEach((record) => {
      const score = Number(record.score);
      if (Number.isFinite(score)) scoreValues.push(clampNumber(score, 0, 100));
    });
    if (!history.length && Number.isFinite(Number(item.lastScore))) {
      scoreValues.push(clampNumber(Number(item.lastScore), 0, 100));
    }
  });
  entries.forEach((entry) => {
    if (Number.isFinite(Number(entry.interviewScore))) {
      scoreValues.push(clampNumber(Number(entry.interviewScore), 0, 100));
    }
  });

  const scoredPracticeCount = relatedStates.reduce((sum, item) => {
    const scoreCount = Array.isArray(item.scoreHistory) ? item.scoreHistory.length : 0;
    return sum + Math.max(Number(item.interviewCount || 0), scoreCount, Number.isFinite(Number(item.lastScore)) ? 1 : 0);
  }, 0);
  const practiceCount = Math.max(entries.length, scoredPracticeCount);
  const averageScore = scoreValues.length
    ? scoreValues.reduce((sum, score) => sum + score, 0) / scoreValues.length
    : null;
  const latestEntry = entries
    .slice()
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];

  return {
    score: getSkillScore(state.skills?.[skillKey] || 0),
    xp: state.skills?.[skillKey] || 0,
    practiceCount,
    problemCount: problemIds.size,
    averageScore,
    latestText: latestEntry?.text || ""
  };
}

function getAllSkillPracticeStats() {
  const stats = Object.keys(skillDefs).map(getSkillPracticeStats);
  const averageScores = stats.map((item) => item.averageScore).filter((score) => Number.isFinite(score));
  return {
    practiceCount: stats.reduce((sum, item) => sum + item.practiceCount, 0),
    averageScore: averageScores.length
      ? averageScores.reduce((sum, score) => sum + score, 0) / averageScores.length
      : null
  };
}

function renderHistory() {
  els.historyList.innerHTML = "";
  const entries = state.entries.slice().reverse();
  if (!entries.length) {
    els.historyList.appendChild(emptyBlock("还没有记录。"));
    return;
  }

  entries.slice(0, 12).forEach((entry) => {
    const item = document.createElement("article");
    item.className = "history-item";
    const top = document.createElement("div");
    top.className = "history-top";
    const date = document.createElement("strong");
    date.textContent = formatDate(entry.date);
    const xp = document.createElement("span");
    xp.textContent = `+${entry.totalXp} XP`;
    top.append(date, xp);

    const text = document.createElement("p");
    text.textContent = entry.text;

    const pills = document.createElement("div");
    pills.className = "pill-row";
    Object.entries(entry.gains).forEach(([key, value]) => {
      if (!value) return;
      const def = skillDefs[key];
      if (!def) return;
      const pill = document.createElement("span");
      pill.className = "pill";
      pill.textContent = `${def.name} +${value}`;
      pills.appendChild(pill);
    });

    item.append(top, text, pills);
    els.historyList.appendChild(item);
  });
}

function renderLeaderboard() {
  renderLeaderboardControls();
  els.leaderboardList.innerHTML = "";
  const rows = getLeaderboardRows();
  if (!rows.length) {
    els.leaderboardList.appendChild(emptyBlock(t("leaderboardEmpty")));
    return;
  }

  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = `leaderboard-item${row.isCurrent ? " current" : ""}`;

    const place = document.createElement("strong");
    const rankPosition = index + 1;
    place.className = `leaderboard-rank ${rankPosition === 1 ? "gold" : rankPosition === 2 ? "silver" : rankPosition === 3 ? "bronze" : "plain"}`;
    place.textContent = String(rankPosition);

    const identity = document.createElement("div");
    const name = document.createElement("span");
    name.textContent = row.name;
    const rankMeta = document.createElement("small");
    rankMeta.textContent = `${row.locationLabel} · ${row.rank}`;
    identity.append(name, rankMeta);

    const score = document.createElement("b");
    score.className = "leaderboard-score";
    score.innerHTML = `<span>${formatScore(row.score)}</span><img src="assets/generated/reward-xp.webp" alt="" loading="lazy">`;

    item.append(place, identity, score);
    els.leaderboardList.appendChild(item);
  });
}

function renderLeaderboardControls() {
  if (!els.leaderboardMetricSelect) return;
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  renderLeaderboardMetricOptions(settings.metric);
  els.leaderboardScopeSelect.value = settings.scope;
  renderCountryOptions(els.leaderboardCountrySelect, settings.country);
  renderRegionOptions(els.leaderboardRegionSelect, settings.country, settings.region);
  const isGlobal = settings.scope === "global";
  const isCountry = settings.scope === "country";
  els.leaderboardCountrySelect.disabled = isGlobal;
  els.leaderboardRegionSelect.disabled = isGlobal || isCountry;
}

function renderLeaderboardMetricOptions(selected = "overall") {
  els.leaderboardMetricSelect.innerHTML = "";
  [
    ["overall", t("leaderboardOverall")],
    ...Object.entries(skillDefs).map(([key, def]) => [key, def.name])
  ].forEach(([value, label]) => {
    const option = document.createElement("option");
    option.value = value;
    option.textContent = label;
    option.selected = value === selected;
    els.leaderboardMetricSelect.appendChild(option);
  });
}

function updateLeaderboardSettings() {
  const country = normalizeCountry(els.leaderboardCountrySelect.value || currentUser?.country);
  const region = normalizeRegionForCountry(els.leaderboardRegionSelect.value, country);
  if (els.leaderboardCountrySelect.value !== country) {
    renderRegionOptions(els.leaderboardRegionSelect, country, region);
  }
  state.leaderboard = normalizeLeaderboardSettings({
    metric: els.leaderboardMetricSelect.value,
    scope: els.leaderboardScopeSelect.value,
    country,
    region
  });
  saveState();
  renderLeaderboard();
  renderRegionRank();
}

function getLeaderboardRows() {
  const settings = normalizeLeaderboardSettings(state.leaderboard);
  return getAllLeaderboardRows(settings.metric)
    .filter((row) => {
      if (settings.scope === "global") return true;
      if (settings.scope === "country") return row.country === settings.country;
      return row.country === settings.country && row.region === settings.region;
    })
    .slice(0, 10);
}

function getAllLeaderboardRows(metric = "overall") {
  return auth.accounts
    .map((account) => {
      const accountState = loadStateForUser(account.id);
      const normalizedAccount = normalizeAccount(account);
      const score = getLeaderboardScore(accountState.skills, metric);
      return {
        id: normalizedAccount.id,
        name: normalizedAccount.name || normalizedAccount.email || "Quant",
        country: normalizedAccount.country,
        region: normalizedAccount.region,
        locationLabel: `${getCountryLabel(normalizedAccount.country)} · ${getRegionLabel(normalizedAccount.region)}`,
        score,
        rank: metric === "overall" ? getRank(score) : getLeaderboardMetricLabel(metric),
        isCurrent: currentUser?.id === normalizedAccount.id
      };
    })
    .sort((a, b) => b.score - a.score || a.name.localeCompare(b.name))
}

function getLeaderboardScore(skills, metric) {
  if (metric === "overall") return calculateQuantScore(skills);
  return getSkillScore(skills?.[metric] || 0);
}

function getLeaderboardMetricLabel(metric) {
  return metric === "overall" ? "总分" : skillDefs[metric]?.name || "总分";
}

function renderResources() {
  els.resourceList.innerHTML = "";
  const resources = normalizeResources(state.resources);
  if (!resources.length) {
    els.resourceList.appendChild(emptyBlock(getLanguage() === "en" ? "Resources will be saved here." : "资料会保存在这里。"));
    return;
  }

  resources.slice().reverse().forEach((resource) => {
    const item = document.createElement("article");
    item.className = "resource-item";
    const top = document.createElement("div");
    top.className = "resource-top";
    const title = document.createElement("strong");
    title.textContent = resource.title;
    const type = document.createElement("span");
    type.className = "pill";
    type.textContent = resource.type.toUpperCase();
    top.append(title, type);
    const content = document.createElement("p");
    content.textContent = resource.content;
    item.append(top, content);
    const previewSource = resource.sources.find((source) => source.embeddable);
    if (previewSource?.embedUrl) {
      const player = document.createElement("div");
      player.className = "resource-player";
      const iframe = document.createElement("iframe");
      iframe.src = previewSource.embedUrl;
      iframe.title = `${resource.title} · ${previewSource.provider}`;
      iframe.loading = "lazy";
      iframe.allow = "accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share";
      iframe.allowFullscreen = true;
      player.appendChild(iframe);
      item.appendChild(player);
    }
    if (resource.sources.length) {
      const links = document.createElement("div");
      links.className = "resource-source-links";
      resource.sources.forEach((source) => {
        const link = document.createElement("a");
        link.href = safeExternalUrl(source.url);
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = source.provider || t("openOriginal");
        links.appendChild(link);
      });
      item.appendChild(links);
    }
    if (resource.dataUrl) {
      const image = document.createElement("img");
      image.className = "resource-image";
      image.src = resource.dataUrl;
      image.alt = resource.title;
      item.appendChild(image);
    }
    els.resourceList.appendChild(item);
  });
}

function parseResourceSources(text) {
  const urls = String(text || "")
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => /^https?:\/\//i.test(line));
  return normalizeContentSources(urls.map((url) => ({ url, provider: inferSource(url), title: inferSource(url) })));
}

function renderNewsTicker() {
  if (!els.newsTickerTrack) return;
  els.newsTickerTrack.innerHTML = "";
  const news = sortNews(state.news || []).slice(0, 8);
  if (!news.length) {
    const empty = document.createElement("button");
    empty.className = "news-ticker-item";
    empty.type = "button";
    empty.textContent = "暂无新闻";
    els.newsTickerTrack.appendChild(empty);
    return;
  }

  [...news, ...news].forEach((item) => {
    const button = document.createElement("button");
    button.className = "news-ticker-item";
    button.type = "button";
    button.addEventListener("click", () => focusNewsItem(item.id));

    const source = document.createElement("span");
    source.textContent = item.source || "News";
    const title = document.createElement("strong");
    title.textContent = item.titleZh || item.title;
    button.append(source, title);
    els.newsTickerTrack.appendChild(button);
  });

  els.newsList = els.newsList || document.getElementById("newsList");
  if (els.newsList && !els.newsList.children.length) {
    try {
      renderNews();
    } catch (error) {
      els.newsList.appendChild(emptyBlock(`新闻渲染失败：${error.message || "unknown"}`));
    }
  }
}

function renderNews() {
  els.newsList = els.newsList || document.getElementById("newsList");
  els.newsUpdatedAt = els.newsUpdatedAt || document.getElementById("newsUpdatedAt");
  if (!els.newsList) return;
  try {
    els.newsList.innerHTML = "";
    const allNews = sortNews(state.news || []);
    const news = getFilteredNews(allNews);
    renderNewsIntelligence(allNews);
    const latest = allNews[0]?.publishedAt || allNews[0]?.createdAt || "";
    if (els.newsUpdatedAt) {
      const filteredText = news.length === allNews.length
        ? ""
        : ` · ${getLanguage() === "en" ? "Showing" : "当前"} ${news.length}`;
      const latestText = latest
        ? `${t("newsSavedCount")} ${allNews.length} · ${getLanguage() === "en" ? "Latest" : "最近"} ${formatNewsDate(latest)}${filteredText}`
        : t("newsDefaultSubtitle");
      const syncText = state.newsSyncError
        ? ` · ${t("newsApiUnavailable")}`
        : state.newsFetchedAt
          ? ` · API ${formatTimeOnly(state.newsFetchedAt)}`
          : "";
      els.newsUpdatedAt.textContent = `${latestText}${syncText}`;
    }

    if (!allNews.length) {
      els.newsList.appendChild(emptyBlock(t("newsNoItems")));
      return;
    }

    if (!news.length) {
      els.newsList.appendChild(emptyBlock(t("newsNoFilterItems")));
      return;
    }

    news.forEach((item) => {
      const card = document.createElement("article");
      const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
      card.className = `news-card content-card problem-card news-source-${sourceType}${item.readAt ? " read" : ""}`;
      card.dataset.newsId = item.id;
      card.tabIndex = 0;
      card.setAttribute("role", "button");
      card.setAttribute("aria-label", item.titleZh || item.title || "新闻");
      card.addEventListener("click", (event) => {
        if (event.target.closest("a")) return;
        openNewsDetail(item.id);
      });
      card.addEventListener("keydown", (event) => {
        if (event.key !== "Enter" && event.key !== " ") return;
        event.preventDefault();
        openNewsDetail(item.id);
      });

      const meta = document.createElement("div");
      meta.className = "problem-meta";
      addProblemTag(meta, formatNewsDate(item.publishedAt || item.createdAt), "source");
      addProblemTag(meta, item.source || inferSource(item.sourceUrl), "topic");
      addProblemTag(meta, getNewsSourceTypeLabel(sourceType), sourceType === "official" ? "skill" : "source");
      addProblemTag(meta, getNewsVerificationLabel(sourceType, item.sourceUrl), isSocialNewsType(sourceType) ? "score" : "source");
      if (item.readAt) addProblemTag(meta, getLanguage() === "en" ? "Read" : "已读", "score");

      const title = document.createElement("h3");
      title.textContent = item.titleZh || item.title;

      const summary = document.createElement("p");
      summary.className = "problem-prompt";
      summary.textContent = item.summary;

      const impact = document.createElement("div");
      impact.className = "content-card-note";
      const impactLabel = document.createElement("strong");
      impactLabel.textContent = t("newsImpact");
      const impactText = document.createElement("span");
      impactText.textContent = item.insight || t("newsFallbackInsight");
      impact.append(impactLabel, impactText);

      const pills = document.createElement("div");
      pills.className = "problem-meta";
      normalizeNewsSkills(item.skills).forEach((key) => {
        addProblemTag(pills, skillDefs[key].name, "skill");
      });
      (item.tags || []).slice(0, 4).forEach((tag) => {
        addProblemTag(pills, tag, "source");
      });

      const actions = document.createElement("div");
      actions.className = "problem-card-footer";

      if (item.sourceUrl) {
        const link = document.createElement("a");
        link.className = "content-card-link";
        link.href = safeExternalUrl(item.sourceUrl);
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = t("newsOpenOriginal");
        link.addEventListener("click", (event) => event.stopPropagation());
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "external-link");
        actions.append(link, icon);
      } else {
        const footerText = document.createElement("span");
        footerText.textContent = t("viewFullProblem");
        const icon = document.createElement("i");
        icon.setAttribute("data-lucide", "chevron-right");
        actions.append(footerText, icon);
      }

      card.append(meta, title, summary, impact, pills, actions);
      els.newsList.appendChild(card);
    });
    refreshIcons();
  } catch (error) {
    els.newsList.innerHTML = "";
    els.newsList.appendChild(emptyBlock(`新闻渲染失败：${error.message || "unknown"}`));
  }
}

function getFilteredNews(allNews = sortNews(state.news || [])) {
  const topic = normalizeNewsTopicFilter(newsTopicFilter);
  const source = normalizeNewsSourceFilter(newsSourceFilter);
  return allNews.filter((item) => newsMatchesTopic(item, topic) && newsMatchesSourceFilter(item, source));
}

function renderNewsIntelligence(allNews = sortNews(state.news || [])) {
  updateNewsFilterButtons();
  if (els.newsIntelTitle) els.newsIntelTitle.textContent = t("newsIntelTitle");
  if (els.newsSocialHint) els.newsSocialHint.textContent = t("newsSocialHint");
  if (els.newsIntelSummary) {
    const syncText = state.newsSyncError
      ? t("newsApiUnavailable")
      : state.newsFetchedAt
        ? `API ${formatTimeOnly(state.newsFetchedAt)}`
        : t("newsDefaultSubtitle");
    els.newsIntelSummary.textContent = `${t("newsIntelSummary")} · ${syncText}`;
  }
  if (!els.newsIntelStats) return;
  els.newsIntelStats.innerHTML = "";
  const stats = [
    { label: t("newsSavedCount"), value: allNews.length },
    { label: t("newsAutoCount"), value: allNews.filter((item) => newsMatchesSourceFilter(item, "news")).length },
    { label: t("newsOfficialCount"), value: allNews.filter((item) => newsMatchesSourceFilter(item, "official")).length },
    { label: t("newsSocialCount"), value: allNews.filter((item) => newsMatchesSourceFilter(item, "social")).length },
    { label: t("newsReadCount"), value: allNews.filter((item) => item.readAt).length }
  ];
  stats.forEach((stat) => {
    const node = document.createElement("span");
    node.className = "news-intel-stat";
    node.innerHTML = `<strong>${escapeHtml(String(stat.value))}</strong><small>${escapeHtml(stat.label)}</small>`;
    els.newsIntelStats.appendChild(node);
  });
}

function setNewsTopicFilter(value) {
  const next = normalizeNewsTopicFilter(value);
  if (next === newsTopicFilter) return;
  newsTopicFilter = next;
  if (activeNewsDetailId) closeNewsDetail();
  else renderNews();
}

function setNewsSourceFilter(value) {
  const next = normalizeNewsSourceFilter(value);
  if (next === newsSourceFilter) return;
  newsSourceFilter = next;
  if (activeNewsDetailId) closeNewsDetail();
  else renderNews();
}

function updateNewsFilterButtons() {
  document.querySelectorAll("[data-news-topic]").forEach((button) => {
    button.classList.toggle("active", button.dataset.newsTopic === normalizeNewsTopicFilter(newsTopicFilter));
  });
  document.querySelectorAll("[data-news-source-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.newsSourceFilter === normalizeNewsSourceFilter(newsSourceFilter));
  });
}

function normalizeNewsTopicFilter(value) {
  const key = String(value || "all").trim();
  return NEWS_TOPIC_QUERY_PACKS[key] ? key : "all";
}

function normalizeNewsSourceFilter(value) {
  const key = String(value || "all").trim();
  return NEWS_SOURCE_FILTERS.includes(key) ? key : "all";
}

function newsMatchesTopic(item, topic) {
  if (!topic || topic === "all") return true;
  const text = [
    item.title,
    item.titleZh,
    item.source,
    item.summary,
    item.insight,
    ...(item.tags || []),
    ...(item.skills || [])
  ].join(" ").toLowerCase();
  const matchers = {
    quantFirms: /jane street|citadel|optiver|imc|jump trading|two sigma|de shaw|d\.e\. shaw|hudson river|hrt|tower research|virtu|drw|flow traders|five rings/,
    marketStructure: /market making|market maker|electronic trading|liquidity|order book|exchange|options?|volatility|derivatives?|execution|sec|cme|nasdaq|nyse/,
    aiInfra: /\bai\b|artificial intelligence|gpu|coreweave|cloud|machine learning|deep learning|model|infrastructure|low latency|算力|模型/,
    recruiting: /intern|internship|graduate|new grad|campus|career|recruiting|job|offer|linkedin|xiaohongshu|小红书|social/
  };
  return (matchers[topic] || /./).test(text);
}

function newsMatchesSourceFilter(item, sourceFilter) {
  if (!sourceFilter || sourceFilter === "all") return true;
  const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
  if (sourceFilter === "news") return sourceType === "news" || sourceType === "rss";
  if (sourceFilter === "official") return sourceType === "official";
  if (sourceFilter === "social") return isSocialNewsType(sourceType);
  return true;
}

function maybeAutoRefreshNews() {
  if (!currentUser || newsRefreshInFlight) return;
  const lastFetch = new Date(state.newsFetchedAt || 0).getTime();
  const lastAttempt = new Date(state.newsFetchAttemptAt || 0).getTime();
  const fetchDue = !lastFetch || Date.now() - lastFetch > NEWS_AUTO_REFRESH_MS;
  const retryDue = !lastAttempt || Date.now() - lastAttempt > NEWS_RETRY_MS;
  if (fetchDue && retryDue) refreshNewsFromApi(false);
}

async function refreshNewsFromApi(showStatus = false) {
  if (newsRefreshInFlight) return;
  newsRefreshInFlight = true;
  state.newsFetchAttemptAt = new Date().toISOString();
  if (showStatus && els.newsUpdatedAt) els.newsUpdatedAt.textContent = "新闻 API 同步中...";

  try {
    const items = await requestNewsFromApi();
    if (items.length) upsertNews(items);
    state.newsFetchedAt = new Date().toISOString();
    state.newsSyncError = "";
    saveState();
    renderNewsTicker();
    renderNews();
  } catch (error) {
    state.newsSyncError = error.message || "News API failed";
    saveState();
    if (showStatus) renderNews();
  } finally {
    newsRefreshInFlight = false;
    refreshIcons();
  }
}

async function requestNewsFromApi() {
  const endpoint = getNewsEndpoint();
  if (!endpoint) throw new Error("Missing news endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      max: 24,
      topic: normalizeNewsTopicFilter(newsTopicFilter),
      queries: getNewsQueriesForTopic(newsTopicFilter)
    })
  });

  if (!response.ok) throw new Error(`News API ${response.status}`);
  const data = await response.json();
  const items = Array.isArray(data) ? data : data.items || data.news || [];
  return items.map(normalizeNewsItem);
}

function getNewsQueriesForTopic(topic) {
  return NEWS_TOPIC_QUERY_PACKS[normalizeNewsTopicFilter(topic)] || NEWS_TOPIC_QUERY_PACKS.all;
}

function getNewsEndpoint() {
  const endpoint = (llmConfig.endpoint || DEFAULT_LLM_ENDPOINT).trim();
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/(interview|classify-log)\/?$/, "/news");
    if (!url.pathname.endsWith("/news")) url.pathname = "/news";
    url.search = "";
    return url.toString();
  } catch {
    return "http://127.0.0.1:8787/news";
  }
}

function addNewsFromForm() {
  const selectedSourceType = normalizeNewsSourceType(els.newsSourceType?.value || "news");
  const item = normalizeNewsItem({
    title: els.newsTitle.value,
    titleZh: els.newsTitle.value,
    source: els.newsSource.value || getNewsSourceTypeLabel(selectedSourceType),
    sourceType: selectedSourceType,
    sourceUrl: els.newsUrl.value,
    publishedAt: new Date().toISOString(),
    tags: parseTags(els.newsTags.value),
    skills: [els.newsPrimarySkill.value],
    summary: els.newsSummary.value,
    insight: els.newsInsight.value,
    createdAt: new Date().toISOString()
  });

  if (!item.titleZh || !item.summary) return;
  upsertNews([item]);
  els.newsForm.reset();
  els.newsForm.classList.add("hidden");
  renderAll();
}

function upsertNews(items) {
  const byId = new Map((state.news || []).map((item) => [item.id, item]));
  items.map(normalizeNewsItem).forEach((item) => {
    if (isLowQualityNews(item)) return;
    byId.set(item.id, { ...(byId.get(item.id) || {}), ...item, updatedAt: new Date().toISOString() });
  });
  state.news = sortNews([...byId.values()]);
  saveState();
}

function openNewsDetail(id) {
  const item = state.news.find((newsItem) => newsItem.id === id);
  if (!item) return;
  activeNewsDetailId = id;
  renderNewsDetail(item);
  els.newsList.classList.add("hidden");
  els.newsDetail.classList.remove("hidden");
  els.newsDetail.scrollIntoView({ behavior: "smooth", block: "start" });
  refreshIcons();
}

function renderNewsDetail(item) {
  const sourceType = normalizeNewsSourceType(item.sourceType || inferNewsSourceType(item));
  els.newsDetailReadBadge.classList.toggle("hidden", !item.readAt);
  els.newsDetailMeta.textContent = [
    formatNewsDate(item.publishedAt || item.createdAt),
    item.source || inferSource(item.sourceUrl),
    getNewsSourceTypeLabel(sourceType),
    getNewsVerificationLabel(sourceType, item.sourceUrl)
  ]
    .filter(Boolean)
    .join(" · ");
  els.newsDetailTitle.textContent = item.titleZh || item.title;
  els.newsDetailSummary.textContent = item.summary;
  els.newsDetailInsight.textContent = item.insight || t("newsFallbackInsight");
  els.newsDetailPills.innerHTML = "";
  const sourcePill = document.createElement("span");
  sourcePill.className = "pill";
  sourcePill.textContent = getNewsSourceTypeLabel(sourceType);
  els.newsDetailPills.appendChild(sourcePill);
  normalizeNewsSkills(item.skills).forEach((key) => {
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = skillDefs[key].name;
    els.newsDetailPills.appendChild(pill);
  });
  (item.tags || []).slice(0, 6).forEach((tag) => {
    const pill = document.createElement("span");
    pill.className = "pill muted-pill";
    pill.textContent = tag;
    els.newsDetailPills.appendChild(pill);
  });
  els.newsDetailLink.classList.toggle("hidden", !item.sourceUrl);
  els.newsDetailLink.href = safeExternalUrl(item.sourceUrl);
  els.newsDetailLink.textContent = t("newsOpenOriginal");
}

function closeNewsDetail() {
  const readId = activeNewsDetailId;
  activeNewsDetailId = "";
  if (readId) markNewsRead(readId, { render: false });
  els.newsDetail.classList.add("hidden");
  els.newsList.classList.remove("hidden");
  renderSummary();
  renderLeaderboard();
  renderNewsTicker();
  renderNews();
  refreshIcons();
  window.setTimeout(() => focusNewsItem(readId, false), 60);
}

function markNewsRead(id, options = {}) {
  const shouldRender = options.render !== false;
  const item = state.news.find((newsItem) => newsItem.id === id);
  if (!item || item.readAt) return;

  item.readAt = new Date().toISOString();
  const skills = normalizeNewsSkills(item.skills);
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));
  skills.forEach((key) => {
    gains[key] += 8;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) + 8);
  });

  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text: `阅读新闻：${item.titleZh || item.title}`,
    gains,
    totalXp: skills.length * 8,
    duration: 0
  });

  saveState();
  if (shouldRender) renderAll();
}

function focusNewsItem(id, shouldSwitch = true) {
  if (shouldSwitch) switchModule("news");
  window.setTimeout(() => {
    const card = document.querySelector(`[data-news-id="${id}"]`);
    if (!card) return;
    card.scrollIntoView({ behavior: "smooth", block: "center" });
    card.classList.add("spotlight");
    window.setTimeout(() => card.classList.remove("spotlight"), 900);
  }, 80);
}

function bindCommunityComposer(scope) {
  const composer = getCommunityComposer(scope);
  if (!composer.form) return;
  composer.form.addEventListener("submit", (event) => {
    event.preventDefault();
    addCommunityPost(scope);
  });
  composer.media.addEventListener("change", (event) => handleCommunityMedia(scope, event));
}

function getCommunityComposer(scope) {
  const isOverview = scope === "overview";
  return {
    form: isOverview ? els.overviewCommunityForm : els.communityForm,
    text: isOverview ? els.overviewCommunityText : els.communityText,
    media: isOverview ? els.overviewCommunityMedia : els.communityMedia,
    preview: isOverview ? els.overviewCommunityMediaPreview : els.communityMediaPreview
  };
}

function normalizeCommunityPost(raw = {}) {
  const experience = raw.experience && raw.kind === "experience"
    ? normalizeInterviewExperience(raw.experience)
    : null;
  return {
    id: raw.id || makeId(),
    kind: experience ? "experience" : "update",
    experience,
    authorId: raw.authorId || "",
    authorName: raw.authorName || "Quant",
    authorAvatar: raw.authorAvatar || "",
    country: normalizeCountry(raw.country || "china"),
    region: normalizeRegionForCountry(raw.region, raw.country || "china"),
    text: String(raw.text || "").trim(),
    media: raw.media?.dataUrl ? {
      dataUrl: raw.media.dataUrl,
      type: raw.media.type === "video" ? "video" : "image",
      name: raw.media.name || ""
    } : null,
    likes: Array.isArray(raw.likes) ? raw.likes.map(String) : [],
    comments: Array.isArray(raw.comments) ? raw.comments.map(normalizeCommunityComment) : [],
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function normalizeCommunityComment(raw = {}) {
  return {
    id: raw.id || makeId(),
    authorId: raw.authorId || "",
    authorName: raw.authorName || "Quant",
    text: String(raw.text || "").trim(),
    createdAt: raw.createdAt || new Date().toISOString()
  };
}

function normalizeMessageParticipant(raw = {}) {
  return {
    id: String(raw?.id || "").trim(),
    name: String(raw?.name || "Quant").trim() || "Quant",
    avatar: String(raw?.avatar || "").trim()
  };
}

function normalizeDirectMessage(raw = {}) {
  return {
    id: String(raw?.id || makeId()),
    senderId: String(raw?.senderId || "").trim(),
    text: String(raw?.text || "").trim().slice(0, 2000),
    createdAt: raw?.createdAt || new Date().toISOString(),
    readBy: Array.isArray(raw?.readBy) ? raw.readBy.map(String) : []
  };
}

function normalizeMessageThread(raw = {}) {
  const participants = Array.isArray(raw?.participants)
    ? raw.participants.map(normalizeMessageParticipant).filter((participant) => participant.id)
    : [];
  const messages = Array.isArray(raw?.messages)
    ? raw.messages.map(normalizeDirectMessage).filter((message) => message.text)
    : [];
  return {
    id: String(raw?.id || makeMessageThreadId(participants.map((participant) => participant.id))),
    participants: [...new Map(participants.map((participant) => [participant.id, participant])).values()],
    messages,
    updatedAt: raw?.updatedAt || messages.at(-1)?.createdAt || new Date().toISOString()
  };
}

function handleCommunityMedia(scope, event) {
  const composer = getCommunityComposer(scope);
  const file = event.target.files?.[0];
  delete composer.form.dataset.mediaData;
  delete composer.form.dataset.mediaType;
  delete composer.form.dataset.mediaName;
  composer.preview.classList.add("hidden");
  composer.preview.innerHTML = "";
  if (!file) return;

  if (!file.type.startsWith("image/") && !file.type.startsWith("video/")) {
    event.target.value = "";
    return;
  }
  if (file.size > 5_000_000) {
    window.alert(t("mediaTooLarge"));
    event.target.value = "";
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    const dataUrl = String(reader.result);
    const type = file.type.startsWith("video/") ? "video" : "image";
    composer.form.dataset.mediaData = dataUrl;
    composer.form.dataset.mediaType = type;
    composer.form.dataset.mediaName = file.name;
    renderCommunityMedia(composer.preview, { dataUrl, type, name: file.name });
    composer.preview.classList.remove("hidden");
  });
  reader.readAsDataURL(file);
}

function addCommunityPost(scope) {
  if (!currentUser) return;
  const composer = getCommunityComposer(scope);
  const text = composer.text.value.trim();
  const media = composer.form.dataset.mediaData ? {
    dataUrl: composer.form.dataset.mediaData,
    type: composer.form.dataset.mediaType === "video" ? "video" : "image",
    name: composer.form.dataset.mediaName || ""
  } : null;

  if (!text && !media) {
    window.alert(t("writeSomething"));
    return;
  }

  community.posts.unshift(normalizeCommunityPost({
    authorId: currentUser.id,
    authorName: currentUser.name || currentUser.email || "Quant",
    authorAvatar: currentUser.picture || "",
    country: currentUser.country,
    region: currentUser.region,
    text,
    media,
    likes: [],
    comments: [],
    createdAt: new Date().toISOString()
  }));
  saveCommunity();
  resetCommunityComposer(scope);
  renderCommunity();
}

function resetCommunityComposer(scope) {
  const composer = getCommunityComposer(scope);
  composer.form.reset();
  delete composer.form.dataset.mediaData;
  delete composer.form.dataset.mediaType;
  delete composer.form.dataset.mediaName;
  composer.preview.innerHTML = "";
  composer.preview.classList.add("hidden");
}

function renderCommunity() {
  community = loadCommunity();
  const visiblePosts = communityFilter === "experience"
    ? community.posts.filter((post) => post.kind === "experience")
    : community.posts;
  renderCommunityList(els.overviewCommunityList, community.posts.slice(0, 3), { compact: true });
  renderCommunityList(els.communityList, visiblePosts, {
    compact: false,
    emptyText: communityFilter === "experience" ? "还没有面经分享。可以从自己的面经记录中选择一条分享。" : t("communityEmpty")
  });
  document.querySelectorAll("[data-community-filter]").forEach((button) => {
    button.classList.toggle("active", button.dataset.communityFilter === communityFilter);
  });
  if (els.overviewCommunitySummary) {
    els.overviewCommunitySummary.textContent = community.posts.length
      ? formatCommunityPostCount(community.posts.length)
      : t("overviewCommunitySummary");
  }
  if (els.communitySummary) {
    els.communitySummary.textContent = visiblePosts.length
      ? communityFilter === "experience" ? `${visiblePosts.length} 条面经分享` : formatCommunityPostCount(visiblePosts.length)
      : t("communitySummary");
  }
  refreshIcons();
}

function formatCommunityPostCount(count) {
  if (getLanguage() === "en") {
    return `${count} ${count === 1 ? t("communityPostSingular") : t("communityPostPlural")}`;
  }
  return `${count} ${t("communityPostPlural")}`;
}

function renderCommunityList(container, posts, options = {}) {
  if (!container) return;
  container.innerHTML = "";
  if (!posts.length) {
    container.appendChild(emptyBlock(options.emptyText || t("communityEmpty")));
    return;
  }

  posts.forEach((post) => {
    const card = document.createElement("article");
    card.className = "community-card";

    const head = document.createElement("div");
    head.className = "community-head";
    const avatar = document.createElement("div");
    avatar.className = "avatar";
    if (post.authorAvatar) {
      const image = document.createElement("img");
      image.src = post.authorAvatar;
      image.alt = "";
      avatar.appendChild(image);
    } else {
      avatar.textContent = getInitials(post.authorName);
    }
    const meta = document.createElement("div");
    const name = document.createElement("strong");
    name.textContent = post.authorName;
    const detail = document.createElement("small");
    detail.textContent = `${getCountryLabel(post.country)} · ${getRegionLabel(post.region)} · ${formatDate(post.createdAt)}`;
    meta.append(name, detail);
    head.append(avatar, meta);
    if (post.authorId === currentUser?.id) {
      const remove = document.createElement("button");
      remove.className = "icon-button ghost danger";
      remove.type = "button";
      remove.title = t("deletePost");
      remove.setAttribute("aria-label", t("deletePost"));
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      remove.addEventListener("click", () => deleteCommunityPost(post.id));
      head.appendChild(remove);
    }

    const text = document.createElement("p");
    text.textContent = post.text;

    card.appendChild(head);
    if (post.kind === "experience" && post.experience) {
      const experienceMeta = document.createElement("div");
      experienceMeta.className = "community-experience-meta";
      experienceMeta.innerHTML = `
        <span class="community-experience-label"><i data-lucide="notebook-pen"></i> 面经分享</span>
        <span>${escapeHtml(post.experience.stage)}</span>
        <span>${escapeHtml(post.experience.season)}</span>
        ${post.experience.tags.slice(0, 3).map((tag) => `<span>${escapeHtml(tag)}</span>`).join("")}
      `;
      card.appendChild(experienceMeta);
    }
    if (post.text) card.appendChild(text);
    if (post.media) {
      const mediaWrap = document.createElement("div");
      mediaWrap.className = "community-media";
      renderCommunityMedia(mediaWrap, post.media);
      card.appendChild(mediaWrap);
    }

    const actions = document.createElement("div");
    actions.className = "community-actions";
    const liked = post.likes.includes(currentUser?.id || "");
    const likeButton = document.createElement("button");
    likeButton.className = `secondary-button${liked ? " active-like" : ""}`;
    likeButton.type = "button";
    likeButton.innerHTML = `<i data-lucide="heart"></i> ${liked ? t("unlike") : t("like")} · ${post.likes.length}`;
    likeButton.addEventListener("click", () => toggleCommunityLike(post.id));
    actions.appendChild(likeButton);
    if (post.authorId && post.authorId !== currentUser?.id) {
      const messageButton = document.createElement("button");
      messageButton.className = "secondary-button";
      messageButton.type = "button";
      messageButton.innerHTML = `<i data-lucide="message-square-text"></i> ${t("messageDirect")}`;
      messageButton.addEventListener("click", () => startDirectMessageWithUser({
        id: post.authorId,
        name: post.authorName,
        avatar: post.authorAvatar
      }));
      actions.appendChild(messageButton);
    }

    if (!options.compact) {
      const commentCount = document.createElement("span");
      commentCount.className = "community-count";
      commentCount.textContent = `${post.comments.length} ${t("comment")}`;
      actions.appendChild(commentCount);
    }
    card.appendChild(actions);

    if (!options.compact) {
      const comments = document.createElement("div");
      comments.className = "community-comments";
      post.comments.slice(-4).forEach((comment) => {
        const item = document.createElement("div");
        item.className = "community-comment";
        const author = document.createElement("strong");
        author.textContent = comment.authorName;
        const body = document.createElement("span");
        body.textContent = comment.text;
        item.append(author, body);
        comments.appendChild(item);
      });
      const form = document.createElement("form");
      form.className = "community-comment-form";
      const input = document.createElement("input");
      input.type = "text";
      input.placeholder = t("commentPlaceholder");
      const button = document.createElement("button");
      button.className = "icon-button ghost";
      button.type = "submit";
      button.title = t("comment");
      button.setAttribute("aria-label", t("comment"));
      button.innerHTML = '<i data-lucide="send"></i>';
      form.append(input, button);
      form.addEventListener("submit", (event) => {
        event.preventDefault();
        addCommunityComment(post.id, input.value);
      });
      comments.appendChild(form);
      card.appendChild(comments);
    }

    container.appendChild(card);
  });
}

function renderCommunityMedia(container, media) {
  container.innerHTML = "";
  if (media.type === "video") {
    const video = document.createElement("video");
    video.src = media.dataUrl;
    video.controls = true;
    video.playsInline = true;
    container.appendChild(video);
    return;
  }
  const image = document.createElement("img");
  image.src = media.dataUrl;
  image.alt = media.name || "community media";
  container.appendChild(image);
}

function toggleCommunityLike(postId) {
  if (!currentUser) return;
  community.posts = community.posts.map((post) => {
    if (post.id !== postId) return post;
    const likes = post.likes.includes(currentUser.id)
      ? post.likes.filter((id) => id !== currentUser.id)
      : [...post.likes, currentUser.id];
    return { ...post, likes };
  });
  saveCommunity();
  renderCommunity();
}

function addCommunityComment(postId, text) {
  if (!currentUser) return;
  const value = String(text || "").trim();
  if (!value) return;
  community.posts = community.posts.map((post) => {
    if (post.id !== postId) return post;
    return {
      ...post,
      comments: [
        ...post.comments,
        normalizeCommunityComment({
          authorId: currentUser.id,
          authorName: currentUser.name || currentUser.email || "Quant",
          text: value,
          createdAt: new Date().toISOString()
        })
      ]
    };
  });
  saveCommunity();
  renderCommunity();
}

function deleteCommunityPost(postId) {
  const deleted = community.posts.find((post) => post.id === postId);
  if (!deleted || !window.confirm(deleted.kind === "experience" ? "确认删除这条已分享的面经动态？私有面经记录将保留。" : "确认删除这条动态？")) return;
  community.posts = community.posts.filter((post) => post.id !== postId);
  saveCommunity();
  if (deleted?.kind === "experience") {
    state.interviewExperiences = state.interviewExperiences.map((record) => record.sharedPostId === postId
      ? normalizeInterviewExperience({ ...record, sharedPostId: "", sharedAt: "", updatedAt: new Date().toISOString() })
      : record);
    saveState();
    renderExperiences();
  }
  renderCommunity();
}

function getCurrentMessageParticipant() {
  return normalizeMessageParticipant({
    id: currentUser?.id || "local-user",
    name: currentUser?.name || currentUser?.email || "Quant",
    avatar: currentUser?.picture || ""
  });
}

function makeMessageThreadId(ids = []) {
  return `thread-${[...new Set(ids.filter(Boolean).map(String))].sort().join("-")}`;
}

function getThreadOtherParticipant(thread) {
  const currentId = currentUser?.id || "local-user";
  return thread?.participants?.find((participant) => participant.id !== currentId)
    || thread?.participants?.[0]
    || normalizeMessageParticipant({ id: "unknown", name: "Quant" });
}

function getUserMessageThreads() {
  const currentId = currentUser?.id || "local-user";
  community = loadCommunity();
  return normalizeCommunityStore(community).threads
    .filter((thread) => thread.participants.some((participant) => participant.id === currentId))
    .sort((a, b) => new Date(b.updatedAt || 0) - new Date(a.updatedAt || 0));
}

function getUnreadMessageCount() {
  const currentId = currentUser?.id || "local-user";
  return getUserMessageThreads().reduce((count, thread) => (
    count + thread.messages.filter((message) => message.senderId !== currentId && !message.readBy.includes(currentId)).length
  ), 0);
}

function updateUnreadMessageBadge() {
  if (!els.commandUnreadCount) return;
  const unread = getUnreadMessageCount();
  els.commandUnreadCount.textContent = unread ? String(unread) : "0";
  els.commandChatBtn?.classList.toggle("has-unread", unread > 0);
}

function startDirectMessageWithUser(participant) {
  if (!currentUser || !participant?.id || participant.id === currentUser.id) return;
  community = loadCommunity();
  const me = getCurrentMessageParticipant();
  const other = normalizeMessageParticipant(participant);
  const id = makeMessageThreadId([me.id, other.id]);
  const existing = community.threads.find((thread) => thread.id === id);
  if (!existing) {
    community.threads.unshift(normalizeMessageThread({
      id,
      participants: [me, other],
      messages: [{
        id: makeId(),
        senderId: me.id,
        text: getLanguage() === "en" ? `Hi ${other.name}, saw your forum post and wanted to connect.` : `${other.name} 你好，我在论坛看到你的动态，想继续交流一下。`,
        createdAt: new Date().toISOString(),
        readBy: [me.id]
      }],
      updatedAt: new Date().toISOString()
    }));
    saveCommunity();
  }
  selectedMessageThreadId = id;
  switchModule("messages");
  renderMessages();
}

function markThreadRead(threadId) {
  if (!threadId || !currentUser) return;
  const currentId = currentUser.id;
  community = loadCommunity();
  community.threads = community.threads.map((thread) => {
    if (thread.id !== threadId) return thread;
    return normalizeMessageThread({
      ...thread,
      messages: thread.messages.map((message) => ({
        ...message,
        readBy: message.readBy.includes(currentId) ? message.readBy : [...message.readBy, currentId]
      }))
    });
  });
  saveCommunity();
  updateUnreadMessageBadge();
}

function renderMessages() {
  if (!els.messageThreadList) return;
  const threads = getUserMessageThreads();
  if (!selectedMessageThreadId && threads.length) selectedMessageThreadId = threads[0].id;
  if (selectedMessageThreadId && !threads.some((thread) => thread.id === selectedMessageThreadId)) {
    selectedMessageThreadId = threads[0]?.id || "";
  }
  els.messageThreadList.innerHTML = "";
  if (!threads.length) {
    els.messageThreadList.appendChild(emptyBlock(t("messageEmpty")));
  } else {
    threads.forEach((thread) => {
      const other = getThreadOtherParticipant(thread);
      const last = thread.messages.at(-1);
      const unread = thread.messages.filter((message) => message.senderId !== currentUser?.id && !message.readBy.includes(currentUser?.id || "")).length;
      const button = document.createElement("button");
      button.type = "button";
      button.className = `message-thread-item${thread.id === selectedMessageThreadId ? " active" : ""}`;
      button.dataset.messageThread = thread.id;
      button.innerHTML = `
        <span class="avatar">${other.avatar ? `<img src="${escapeAttribute(other.avatar)}" alt="">` : escapeHtml(getInitials(other.name))}</span>
        <span>
          <strong>${escapeHtml(other.name)}</strong>
          <small>${escapeHtml(last?.text || t("messageEmpty"))}</small>
        </span>
        ${unread ? `<b>${escapeHtml(String(unread))}</b>` : ""}
      `;
      els.messageThreadList.appendChild(button);
    });
  }

  const active = threads.find((thread) => thread.id === selectedMessageThreadId);
  renderMessageConversation(active);
  updateUnreadMessageBadge();
  refreshIcons();
}

function renderMessageConversation(thread) {
  if (!els.messageConversationHeader || !els.messageConversationBody || !els.messageComposerForm) return;
  els.messageConversationHeader.innerHTML = "";
  els.messageConversationBody.innerHTML = "";
  els.messageComposerForm.classList.toggle("hidden", !thread);
  if (!thread) {
    els.messageConversationHeader.innerHTML = `<strong>${escapeHtml(t("messages"))}</strong><small>${escapeHtml(t("messageEmpty"))}</small>`;
    els.messageConversationBody.appendChild(emptyBlock(t("messageEmpty")));
    return;
  }
  const other = getThreadOtherParticipant(thread);
  els.messageConversationHeader.innerHTML = `
    <span class="avatar">${other.avatar ? `<img src="${escapeAttribute(other.avatar)}" alt="">` : escapeHtml(getInitials(other.name))}</span>
    <div>
      <strong>${escapeHtml(other.name)}</strong>
      <small>${escapeHtml(thread.messages.length)} messages</small>
    </div>
  `;
  const currentId = currentUser?.id || "local-user";
  thread.messages.forEach((message) => {
    const bubble = document.createElement("div");
    bubble.className = `direct-message ${message.senderId === currentId ? "mine" : "theirs"}`;
    bubble.innerHTML = `<p>${escapeHtml(message.text)}</p><small>${escapeHtml(formatDate(message.createdAt))}</small>`;
    els.messageConversationBody.appendChild(bubble);
  });
  window.requestAnimationFrame(() => {
    els.messageConversationBody.scrollTop = els.messageConversationBody.scrollHeight;
  });
}

function sendDirectMessage() {
  if (!currentUser || !selectedMessageThreadId || !els.messageComposerInput) return;
  const text = els.messageComposerInput.value.trim();
  if (!text) return;
  community = loadCommunity();
  const now = new Date().toISOString();
  community.threads = community.threads.map((thread) => {
    if (thread.id !== selectedMessageThreadId) return thread;
    return normalizeMessageThread({
      ...thread,
      messages: [...thread.messages, {
        id: makeId(),
        senderId: currentUser.id,
        text,
        createdAt: now,
        readBy: [currentUser.id]
      }],
      updatedAt: now
    });
  });
  els.messageComposerInput.value = "";
  saveCommunity();
  renderMessages();
}

function renderNetwork() {
  if (!els.networkList) return;
  const contacts = Array.isArray(state.network) ? state.network : [];
  els.networkList.innerHTML = "";
  if (els.networkSummary) {
    const active = contacts.filter((contact) => contact.status !== "Archived").length;
    els.networkSummary.textContent = contacts.length
      ? `${contacts.length} ${getLanguage() === "en" ? "contacts" : "个联系人"} · ${active} ${t("networkActiveFollowups")}`
      : t("networkSummary");
  }

  if (!contacts.length) {
    els.networkList.appendChild(emptyBlock(t("networkEmpty")));
    return;
  }

  contacts
    .slice()
    .sort((a, b) => networkStatusWeight(a.status) - networkStatusWeight(b.status) || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
    .forEach((contact) => {
      const card = document.createElement("article");
      card.className = "network-card";

      const top = document.createElement("div");
      top.className = "network-card-top";
      const identity = document.createElement("div");
      const name = document.createElement("h3");
      name.textContent = contact.name;
      const role = document.createElement("small");
      role.textContent = [contact.role, contact.company].filter(Boolean).join(" · ") || t("networkCompanyFallback");
      identity.append(name, role);

      const remove = document.createElement("button");
      remove.className = "icon-button ghost danger";
      remove.type = "button";
      remove.title = "删除联系人";
      remove.setAttribute("aria-label", "删除联系人");
      remove.innerHTML = '<i data-lucide="trash-2"></i>';
      remove.addEventListener("click", () => deleteNetworkContact(contact.id));
      top.append(identity, remove);

      const status = document.createElement("span");
      status.className = "network-status";
      status.textContent = getNetworkStatusLabel(contact.status);

      const meta = document.createElement("div");
      meta.className = "network-meta";
      [contact.channel, contact.nextStep].filter(Boolean).forEach((item) => {
        const pill = document.createElement("span");
        pill.className = "pill muted-pill";
        pill.textContent = item;
        meta.appendChild(pill);
      });

      const notes = document.createElement("p");
      notes.textContent = contact.notes || t("networkNotesEmpty");

      card.append(top, status, meta, notes);
      els.networkList.appendChild(card);
    });
  refreshIcons();
}

function addNetworkContact() {
  const contact = normalizeNetworkContact({
    name: els.networkName.value,
    company: els.networkCompany.value,
    role: els.networkRole.value,
    status: els.networkStatus.value,
    channel: els.networkChannel.value,
    nextStep: els.networkNextStep.value,
    notes: els.networkNotes.value,
    createdAt: new Date().toISOString()
  });

  if (!contact.name) return;
  state.network = [...(state.network || []), contact];
  saveState();
  els.networkForm.reset();
  els.networkForm.classList.add("hidden");
  renderNetwork();
}

function deleteNetworkContact(id) {
  state.network = (state.network || []).filter((contact) => contact.id !== id);
  saveState();
  renderNetwork();
}

function getNetworkStatusLabel(status) {
  const labels = {
    zh: {
      "To reach out": "待联系",
      Contacted: "已联系",
      "Follow-up": "待跟进",
      Warm: "关系较热",
      Archived: "已归档"
    },
    en: {
      "To reach out": "To reach out",
      Contacted: "Contacted",
      "Follow-up": "Follow-up",
      Warm: "Warm",
      Archived: "Archived"
    }
  };
  return labels[getLanguage()]?.[status] || status || "-";
}

function networkStatusWeight(status) {
  return {
    "Follow-up": 0,
    "To reach out": 1,
    Contacted: 2,
    Warm: 3,
    Archived: 4
  }[status] ?? 5;
}

function handleProblemSearchInput() {
  selectedProblemDetailId = "";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (normalizeSearchQuery(els.problemSearch?.value)) problemViewMode = "all";
  renderProblems();
}

function handleProblemSearchKeydown(event) {
  if (event.key !== "Enter") return;
  const query = normalizeSearchQuery(els.problemSearch?.value);
  if (!query) return;
  event.preventDefault();
  const firstMatch = getProblemBrowserMatches({ forceAllView: true })[0];
  if (firstMatch) openProblemDetail(firstMatch.id);
}

function getProblemSearchFields(problem) {
  return [
    getProblemDisplayTitle(problem, true),
    getProblemDisplayTitle(problem, false),
    problem.titleEn,
    problem.titleZh,
    problem.promptEn,
    problem.promptZh,
    problem.answer,
    problem.explanation,
    problem.category,
    problem.difficulty,
    problem.source,
    problem.sourceType,
    problem.bookSlug,
    problem.bookName,
    getProblemCompanies(problem).map((company) => getCompanyAliases(company).join(" ")).join(" "),
    Array.isArray(problem.tags) ? problem.tags.map(formatProblemTag).join(" ") : "",
    Array.isArray(problem.tags) ? problem.tags.join(" ") : ""
  ];
}

function scoreProblemSearchMatch(problem, normalizedQuery) {
  const query = normalizeSearchQuery(normalizedQuery);
  if (!query) return 20;
  const titleText = normalizeSearchQuery([
    getProblemDisplayTitle(problem, true),
    getProblemDisplayTitle(problem, false),
    problem.titleEn,
    problem.titleZh
  ].filter(Boolean).join(" "));
  const promptText = normalizeSearchQuery([problem.promptEn, problem.promptZh].filter(Boolean).join(" "));
  const metaText = normalizeSearchQuery([
    problem.category,
    problem.difficulty,
    problem.bookName,
    getProblemCompanies(problem).map((company) => company.name).join(" "),
    Array.isArray(problem.tags) ? problem.tags.join(" ") : ""
  ].filter(Boolean).join(" "));
  const tokens = query.split(/\s+/).filter(Boolean);

  if (titleText === query) return 0;
  if (titleText.includes(query)) return 1;
  if (tokens.every((token) => titleText.includes(token))) return 2;
  if (promptText.includes(query)) return 5;
  if (tokens.every((token) => promptText.includes(token))) return 7;
  if (tokens.every((token) => metaText.includes(token))) return 10;
  return 20;
}

function getProblemBrowserMatches(options = {}) {
  const query = normalizeSearchQuery(els.problemSearch?.value || "");
  const forceAllView = Boolean(options.forceAllView);
  let problems = state.problems
    .filter(isCatalogProblem)
    .filter((problem) => problemMatchesCompany(problem, problemCompanyFilter))
    .filter((problem) => problemMatchesTheme(problem, problemThemeFilter))
    .filter((problem) => problemMatchesDifficulty(problem, problemDifficultyFilter))
    .filter((problem) => !query || matchesQuery(getProblemSearchFields(problem), query));

  if (!forceAllView && problemViewMode === "saved") {
    problems = problems.filter((problem) => getProblemPersonalState(problem.id).favorite);
  }
  if (query) {
    problems = problems.sort((a, b) => (
      scoreProblemSearchMatch(a, query) - scoreProblemSearchMatch(b, query)
      || getProblemDisplayTitle(a, getLanguage() === "en").localeCompare(getProblemDisplayTitle(b, getLanguage() === "en"))
    ));
  }
  return problems;
}

function openProblemFromSearch(problemId) {
  selectedProblemDetailId = "";
  problemViewMode = "all";
  problemCompanyFilter = "all";
  problemVisibleCount = PROBLEM_PAGE_SIZE;
  if (els.problemSearch) els.problemSearch.value = "";
  renderProblems();
  window.setTimeout(() => openProblemDetail(problemId), 40);
}

function renderProblems() {
  renderProblemViewTabs();
  renderLeetcodeHot100();
  const allCatalogProblems = state.problems.filter(isCatalogProblem);
  renderProblemCompanyPanel(allCatalogProblems);
  const scopedCatalogProblems = allCatalogProblems.filter((problem) => problemMatchesCompany(problem, problemCompanyFilter));
  renderProblemThemeFilter(scopedCatalogProblems);
  renderProblemDifficultyFilter(scopedCatalogProblems);
  renderProblemCompletionDashboard(scopedCatalogProblems);
  if (selectedProblemDetailId) {
    const selected = state.problems.find((item) => item.id === selectedProblemDetailId && isCatalogProblem(item));
    if (selected) {
      els.problemList.classList.add("hidden");
      els.loadMoreProblemsBtn.classList.add("hidden");
      els.problemRanking.classList.add("hidden");
      els.problemDetail.classList.remove("hidden");
      renderProblemDetail(selected);
      return;
    }
    selectedProblemDetailId = "";
  }
  els.problemDetail.classList.add("hidden");
  const isEn = getLanguage() === "en";
  let problems = getProblemBrowserMatches();

  if (problemViewMode === "ranking") {
    els.problemList.classList.add("hidden");
    els.loadMoreProblemsBtn.classList.add("hidden");
    els.problemRanking.classList.remove("hidden");
    renderProblemRanking(problems);
    return;
  }

  els.problemRanking.classList.add("hidden");
  els.problemList.classList.remove("hidden");
  els.problemList.innerHTML = "";
  if (problemViewMode === "saved") {
    problems = problems.filter((problem) => getProblemPersonalState(problem.id).favorite);
  }

  if (!problems.length) {
    els.loadMoreProblemsBtn.classList.add("hidden");
    els.problemList.appendChild(emptyBlock(problemViewMode === "saved"
      ? (isEn ? "No saved problems yet. Add any problem to your private review list." : "收藏本还没有题目。你可以把任意题目加入自己的复习本。")
      : t("problemEmpty")));
    return;
  }

  const visibleProblems = problems.slice(0, problemVisibleCount);
  visibleProblems.forEach((problem) => {
    const titleText = getProblemDisplayTitle(problem, isEn);
    const promptText = getProblemExcerptText(problem, isEn);
    const card = document.createElement("article");
    card.className = "problem-card";
    card.tabIndex = 0;
    card.setAttribute("role", "button");
    card.setAttribute("aria-label", `${t("openProblem")}: ${titleText}`);
    card.addEventListener("click", () => openProblemDetail(problem.id));
    card.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openProblemDetail(problem.id);
    });

    const title = document.createElement("h3");
    title.textContent = titleText;

    const meta = document.createElement("div");
    meta.className = "problem-meta";
    const personal = getProblemPersonalState(problem.id);
    const social = getProblemSocial(problem.id);
    const lastScore = personal.lastScore;
    if (problem.bookName) addProblemTag(meta, problem.bookName, "source");
    getProblemCompanies(problem).slice(0, 2).forEach((company) => addProblemTag(meta, company.name, "company"));
    addProblemTag(meta, formatCategoryLabel(problem.category), "topic");
    addProblemTag(meta, problem.difficulty, `difficulty ${difficultyClass(problem.difficulty)}`);
    problem.tags
      .filter((tag) => !isHiddenProblemTag(tag) && cleanProblemTagValue(tag) !== cleanProblemTagValue(problem.bookName))
      .slice(0, 2)
      .forEach((tag) => addProblemTag(meta, formatProblemTag(tag), "skill"));
    if (lastScore != null && Number.isFinite(Number(lastScore))) {
      addProblemTag(meta, `${t("lastScore")} ${Math.round(Number(lastScore))}/100`, "score");
    }

    const prompt = document.createElement("div");
    prompt.className = "problem-prompt";
    renderRichText(prompt, formatProblemExcerpt(promptText));

    const footer = document.createElement("div");
    footer.className = "problem-card-footer";
    const metrics = document.createElement("div");
    metrics.className = "problem-card-metrics";
    metrics.append(
      createProblemMetric("heart", social.likeCount),
      createProblemMetric("message-square", social.commentCount)
    );
    const save = document.createElement("button");
    save.type = "button";
    save.className = `problem-save-button${personal.favorite ? " active" : ""}`;
    save.title = personal.favorite ? t("removeSaved") : t("saveForReview");
    save.setAttribute("aria-label", save.title);
    save.innerHTML = `<i data-lucide="bookmark${personal.favorite ? "-check" : ""}"></i>`;
    save.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleProblemSaved(problem.id);
    });
    const complete = document.createElement("button");
    complete.type = "button";
    complete.className = `problem-complete-button${personal.completed ? " active" : ""}`;
    complete.title = personal.completed
      ? (isEn ? "Mark unfinished" : "标记为未完成")
      : (isEn ? "Mark completed" : "标记完成");
    complete.setAttribute("aria-label", complete.title);
    complete.innerHTML = `<i data-lucide="${personal.completed ? "check-circle-2" : "circle"}"></i>`;
    complete.addEventListener("click", (event) => {
      event.stopPropagation();
      toggleProblemCompleted(problem.id);
    });
    const open = document.createElement("span");
    open.className = "problem-card-open";
    open.innerHTML = `${t("viewFullProblem")} <i data-lucide="chevron-right"></i>`;
    footer.append(metrics, complete, save, open);

    card.append(title, meta, prompt, footer);
    els.problemList.appendChild(card);
  });
  const hiddenCount = problems.length - visibleProblems.length;
  els.loadMoreProblemsBtn.classList.toggle("hidden", hiddenCount <= 0);
  if (hiddenCount > 0) {
    const label = getLanguage() === "en"
      ? `Load more problems (${hiddenCount} remaining)`
      : `加载更多题目（剩余 ${hiddenCount}）`;
    els.loadMoreProblemsBtn.innerHTML = `<i data-lucide="chevrons-down"></i> ${label}`;
  }
  scheduleMathTypeset(els.problemList);
  refreshIcons();
}

function renderProblemCompanyPanel(problems = getCatalogProblems()) {
  if (!els.problemCompanyList) return;
  const isEn = getLanguage() === "en";
  const entries = quantCompanyDefs
    .map((company) => ({
      company,
      stats: getCompanyProblemStats(company, problems)
    }))
    .filter((entry) => entry.stats.total > 0)
    .sort((left, right) => (
      companyTierWeight(left.company.tier) - companyTierWeight(right.company.tier)
      || right.stats.total - left.stats.total
      || left.company.name.localeCompare(right.company.name)
    ));

  if (els.problemCompanyTitle) els.problemCompanyTitle.textContent = isEn ? "Prepare by Company" : "按公司刷题";
  if (els.problemCompanySummary) {
    const tagged = entries.reduce((sum, entry) => sum + entry.stats.total, 0);
    els.problemCompanySummary.textContent = isEn
      ? `${entries.length} firms · ${tagged} tagged questions from real interview sources`
      : `${entries.length} 家公司 · ${tagged} 道真实题源标注题`;
  }
  if (els.problemCompanyClearBtn) {
    els.problemCompanyClearBtn.classList.toggle("hidden", problemCompanyFilter === "all");
    els.problemCompanyClearBtn.innerHTML = `<i data-lucide="rotate-ccw"></i>${escapeHtml(t("allCompanies"))}`;
  }

  els.problemCompanyList.innerHTML = "";
  entries.forEach(({ company, stats }) => {
    const card = document.createElement("button");
    card.type = "button";
    card.className = `problem-company-card${problemCompanyFilter === company.slug ? " active" : ""}`;
    card.dataset.problemCompany = company.slug;
    card.style.setProperty("--company-color", company.color);
    card.style.setProperty("--company-accent", company.accent);
    card.setAttribute("aria-pressed", String(problemCompanyFilter === company.slug));

    const mark = createCompanyMark(company, "small");
    const main = document.createElement("span");
    main.className = "problem-company-main";
    main.innerHTML = `
      <strong>${escapeHtml(company.name)}</strong>
      <small>Tier ${escapeHtml(company.tier)} · ${escapeHtml(company.focus.slice(0, 2).join(" / "))}</small>
    `;
    const count = document.createElement("span");
    count.className = "problem-company-count";
    count.innerHTML = `
      <b>${escapeHtml(String(stats.total))}</b>
      <small>${escapeHtml(t("companyQuestions"))}</small>
    `;
    const progress = document.createElement("span");
    progress.className = "problem-company-progress";
    progress.innerHTML = `<i style="width:${stats.percent}%"></i>`;

    card.append(mark, main, count, progress);
    els.problemCompanyList.appendChild(card);
  });
  refreshIcons();
}

function renderLeetcodeHot100() {
  if (!els.leetcodeHotList) return;
  const isEn = getLanguage() === "en";
  const done = new Set(normalizeLeetcodeHot100Done(state.leetcodeHot100Done));
  const total = leetcodeHot100.length || 100;
  const doneCount = done.size;
  if (els.leetcodeHotTitle) els.leetcodeHotTitle.textContent = t("leetcodeHotTitle");
  if (els.leetcodeHotSummary) els.leetcodeHotSummary.textContent = t("leetcodeHotSummary");
  if (els.leetcodeHotProgressLabel) els.leetcodeHotProgressLabel.textContent = t("leetcodeHotProgressLabel");
  if (els.leetcodeHotProgressText) els.leetcodeHotProgressText.textContent = `${doneCount} / ${total}`;
  if (els.leetcodeHotProgressFill) els.leetcodeHotProgressFill.style.width = `${Math.round((doneCount / Math.max(total, 1)) * 100)}%`;
  const panel = els.leetcodeHotList.closest(".leetcode-hot-panel");
  panel?.classList.toggle("is-expanded", leetcodeHotExpanded);
  if (els.leetcodeHotToggleBtn) {
    els.leetcodeHotToggleBtn.setAttribute("aria-expanded", String(leetcodeHotExpanded));
    els.leetcodeHotToggleBtn.innerHTML = `<i data-lucide="${leetcodeHotExpanded ? "chevron-up" : "list-checks"}"></i>${escapeHtml(t(leetcodeHotExpanded ? "leetcodeHotCollapse" : "leetcodeHotManage"))}`;
  }
  if (els.leetcodeHotPlanLink) {
    els.leetcodeHotPlanLink.title = t("leetcodeHotOpen");
    els.leetcodeHotPlanLink.setAttribute("aria-label", t("leetcodeHotOpen"));
    els.leetcodeHotPlanLink.innerHTML = '<i data-lucide="external-link"></i>';
  }
  els.leetcodeHotList.innerHTML = "";
  els.leetcodeHotList.classList.toggle("hidden", !leetcodeHotExpanded);
  if (!leetcodeHotExpanded) {
    refreshIcons();
    return;
  }
  if (!leetcodeHot100.length) {
    els.leetcodeHotList.appendChild(emptyBlock(isEn ? "Hot 100 data is not available." : "Hot 100 数据暂不可用。"));
    return;
  }
  leetcodeHot100.forEach((item) => {
    const isDone = done.has(item.id);
    const card = document.createElement("article");
    card.className = `leetcode-hot-item${isDone ? " is-done" : ""}`;
    card.innerHTML = `
      <button class="leetcode-hot-done" type="button" data-leetcode-hot-toggle="${escapeHtml(item.id)}" aria-label="${escapeHtml(isDone ? t("leetcodeHotUndo") : t("leetcodeHotMarkDone"))}">
        <i data-lucide="${isDone ? "check" : "circle"}"></i>
      </button>
      <div class="leetcode-hot-main">
        <strong>${escapeHtml(item.number)}. ${escapeHtml(item.title)}</strong>
        <span>${escapeHtml(item.topic)} · ${escapeHtml(item.difficulty)}${isDone ? ` · ${escapeHtml(t("leetcodeHotDone"))}` : ""}</span>
      </div>
      <a class="leetcode-hot-link" href="${escapeAttribute(item.url)}" target="_blank" rel="noreferrer" aria-label="${escapeHtml(`${t("leetcodeHotOpen")}: ${item.title}`)}">
        <i data-lucide="external-link"></i>
      </a>
    `;
    els.leetcodeHotList.appendChild(card);
  });
  els.leetcodeHotList.querySelectorAll("[data-leetcode-hot-toggle]").forEach((button) => {
    button.addEventListener("click", () => toggleLeetcodeHotDone(button.dataset.leetcodeHotToggle));
  });
  refreshIcons();
}

function toggleLeetcodeHotDone(problemId) {
  const valid = new Set(leetcodeHot100.map((item) => item.id));
  if (!valid.has(problemId)) return;
  const done = new Set(normalizeLeetcodeHot100Done(state.leetcodeHot100Done));
  if (done.has(problemId)) done.delete(problemId);
  else done.add(problemId);
  state.leetcodeHot100Done = [...done];
  state.skills.leetcode = Math.max(Number(state.skills.leetcode || 0), Math.min(100, state.leetcodeHot100Done.length));
  saveState();
  renderLeetcodeHot100();
  renderSummary();
  renderProblemCompletionDashboard();
  renderSkills();
  drawRadar();
}

function renderProblemViewTabs() {
  document.querySelectorAll("[data-problem-view]").forEach((button) => {
    button.classList.toggle("active", button.dataset.problemView === problemViewMode);
  });
  if (els.problemInteractionStatus) els.problemInteractionStatus.textContent = problemSocialNotice;
}

function getProblemPersonalState(problemId) {
  return (state.problemStates || []).find((item) => item.problemId === problemId) || normalizeProblemState({ problemId });
}

function toggleProblemSaved(problemId) {
  const isSaved = getProblemPersonalState(problemId).favorite;
  updateProblemState(problemId, {
    favorite: !isSaved,
    lastFavoriteAt: isSaved ? "" : new Date().toISOString()
  });
  saveState();
  renderProblems();
}

function toggleProblemCompleted(problemId) {
  const isCompleted = getProblemPersonalState(problemId).completed;
  updateProblemState(problemId, {
    completed: !isCompleted,
    completedAt: isCompleted ? "" : new Date().toISOString()
  });
  saveState();
  renderSummary();
  renderSkills();
  renderProblems();
}

function createProblemMetric(icon, count) {
  const metric = document.createElement("span");
  metric.className = "problem-card-metric";
  metric.innerHTML = `<i data-lucide="${icon}"></i><span>${Number(count || 0)}</span>`;
  return metric;
}

function getProblemPopularity(problemId) {
  const social = getProblemSocial(problemId);
  return social.likeCount * 3 + social.commentCount * 2;
}

function renderProblemRanking(problems) {
  els.problemRankingList.innerHTML = "";
  const ranked = [...problems].sort((left, right) => {
    const socialDiff = getProblemPopularity(right.id) - getProblemPopularity(left.id);
    if (socialDiff) return socialDiff;
    const likeDiff = getProblemSocial(right.id).likeCount - getProblemSocial(left.id).likeCount;
    if (likeDiff) return likeDiff;
    return getProblemDisplayTitle(left).localeCompare(getProblemDisplayTitle(right), getLocale());
  }).slice(0, 50);
  if (!ranked.length) {
    els.problemRankingList.appendChild(emptyBlock(t("problemEmpty")));
    return;
  }
  ranked.forEach((problem, index) => {
    const social = getProblemSocial(problem.id);
    const row = document.createElement("button");
    row.type = "button";
    row.className = "problem-ranking-row";
    row.addEventListener("click", () => openProblemDetail(problem.id));
    const rank = document.createElement("strong");
    rank.className = "problem-ranking-position";
    rank.textContent = String(index + 1).padStart(2, "0");
    const copy = document.createElement("span");
    copy.className = "problem-ranking-copy";
    copy.innerHTML = `<strong></strong><small></small>`;
    copy.querySelector("strong").textContent = getProblemDisplayTitle(problem);
    copy.querySelector("small").textContent = `${formatCategoryLabel(problem.category)} · ${problem.difficulty}`;
    const stats = document.createElement("span");
    stats.className = "problem-ranking-stats";
    stats.innerHTML = `<strong>${getProblemPopularity(problem.id)}</strong><small>${t("popularity")}</small><span><i data-lucide="heart"></i> ${social.likeCount}</span><span><i data-lucide="message-square"></i> ${social.commentCount}</span>`;
    row.append(rank, copy, stats);
    els.problemRankingList.appendChild(row);
  });
  refreshIcons();
}

function formatProblemExcerpt(text) {
  const value = String(text || "")
    .replace(/\s+/g, " ")
    .trim();
  if (value.length <= 560) return value;
  const slice = value.slice(0, 560);
  const stops = ["。", ".", "？", "?", "；", ";", "，", ",", " "]
    .map((mark) => slice.lastIndexOf(mark))
    .filter((index) => index > 220);
  const boundary = stops.length ? Math.max(...stops) : 560;
  return trimDanglingMath(slice.slice(0, boundary).trim()) + " ...";
}

function trimDanglingMath(value) {
  let text = String(value || "");
  [
    ["\\[", "\\]"],
    ["\\(", "\\)"]
  ].forEach(([open, close]) => {
    const openIndex = text.lastIndexOf(open);
    const closeIndex = text.lastIndexOf(close);
    if (openIndex > closeIndex) text = text.slice(0, openIndex).trim();
  });

  const dollarPositions = [];
  for (let index = 0; index < text.length; index += 1) {
    if (text[index] === "$" && text[index - 1] !== "\\") dollarPositions.push(index);
  }
  if (dollarPositions.length % 2 === 1) {
    text = text.slice(0, dollarPositions[dollarPositions.length - 1]).trim();
  }
  return text;
}

function getProblemDisplayTitle(problem, isEn = getLanguage() === "en") {
  if (!isEn) return problem.titleZh || problem.titleEn || t("problemTitle");
  if (problem.titleEn) return problem.titleEn;
  const match = String(problem.id || "").match(/(\d+)$/);
  const number = match ? match[1].padStart(3, "0") : "";
  const categoryLabel = formatCategoryLabel(problem.category).replace(/[/&]/g, " ");
  return number ? `${categoryLabel} Challenge ${number}` : t("problemTitle");
}

function getProblemExcerptText(problem, isEn = getLanguage() === "en") {
  if (!isEn) return problem.promptZh || problem.promptEn || t("noPrompt");
  return problem.promptEn || t("untranslatedProblemFallback");
}

function addProblemTag(container, label, variant = "") {
  if (!label) return;
  const pill = document.createElement("span");
  pill.className = `problem-tag ${variant}`.trim();
  pill.textContent = label;
  container.appendChild(pill);
}

function difficultyClass(difficulty = "") {
  const normalized = String(difficulty).trim().toLowerCase();
  if (normalized === "easy") return "easy";
  if (normalized === "hard") return "hard";
  return "medium";
}

function formatProblemTag(tag) {
  if (isHiddenProblemTag(tag)) return "";
  const label = problemTagLabels[String(tag)] || {};
  return getLanguage() === "en" ? label.en || tag : label.zh || tag;
}

function isHiddenProblemTag(tag) {
  const value = String(tag || "").trim();
  return value === "question-bank" || isLegacyCatalogMarker(value);
}

function cleanProblemTagValue(value) {
  return String(value || "").trim().toLowerCase();
}

function isLegacyCatalogMarker(value) {
  const legacy = [["pu", "rple"].join(""), "book"].join("-");
  return String(value || "").includes(legacy);
}

function isDisabledProblemId(problemId) {
  const id = String(problemId || "");
  return id.startsWith("catalog-problem-") || id.startsWith("catalog-exercise-") || isLegacyCatalogMarker(id);
}

function isDisabledProblemSource(problem) {
  const source = String(problem?.source || "").trim();
  const sourceType = String(problem?.sourceType || problem?.collection || "").trim();
  const bookSlug = String(problem?.bookSlug || "").trim();
  const bookName = String(problem?.bookName || "").trim();
  const tags = Array.isArray(problem?.tags) ? problem.tags.map(String) : parseTags(problem?.tags || "");
  return isDisabledProblemId(problem?.id)
    || disabledProblemSources.has(source)
    || disabledProblemSources.has(sourceType)
    || disabledProblemSources.has(bookSlug)
    || disabledProblemBookNames.has(bookName)
    || tags.some((tag) => disabledProblemBookNames.has(String(tag).trim()) || disabledProblemSources.has(String(tag).trim()));
}

function isCatalogProblem(problem) {
  const tags = Array.isArray(problem?.tags) ? problem.tags.map(String) : parseTags(problem?.tags || "");
  const source = String(problem?.source || "").trim();
  const sourceType = String(problem?.sourceType || problem?.collection || "").trim();
  const bookSlug = String(problem?.bookSlug || "").trim();
  const id = String(problem?.id || "");
  return source === "question-bank"
    || sourceType === "book"
    || sourceType === "question-bank"
    || Boolean(bookSlug)
    || isLegacyCatalogMarker(source)
    || id.startsWith("catalog-")
    || isLegacyCatalogMarker(id)
    || tags.includes("question-bank")
    || tags.some(isLegacyCatalogMarker);
}

function pruneProblemCatalog() {
  const catalogItems = (state.problems || []).filter((problem) => isCatalogProblem(problem) && !isDisabledProblemSource(problem));
  const problemStates = (state.problemStates || []).filter((problemState) => !isDisabledProblemId(problemState.problemId));
  if (catalogItems.length === state.problems.length && problemStates.length === (state.problemStates || []).length) return;
  state.problems = catalogItems;
  state.problemStates = problemStates;
  saveState({ sync: false });
}

function openProblemDetail(problemId) {
  const problem = state.problems.find((item) => item.id === problemId && isCatalogProblem(item));
  if (!problem) return;
  selectedProblemDetailId = problemId;
  problemSocialNotice = "";
  els.problemList.classList.add("hidden");
  els.problemRanking.classList.add("hidden");
  els.problemDetail.classList.remove("hidden");
  renderProblemDetail(problem);
  refreshProblemSocial(problemId);
  const stickyOffset = (document.querySelector(".topbar")?.getBoundingClientRect().height || 0) + 14;
  const detailTop = els.problemDetail.getBoundingClientRect().top + window.scrollY - stickyOffset;
  window.scrollTo({ top: Math.max(0, detailTop), behavior: "smooth" });
}

function returnToProblemList() {
  selectedProblemDetailId = "";
  els.problemDetail.classList.add("hidden");
  els.problemList.classList.remove("hidden");
  renderProblems();
}

function renderProblemDetail(problem) {
  els.problemDetail.innerHTML = "";
  const isEn = getLanguage() === "en";

  const top = document.createElement("div");
  top.className = "problem-detail-top";

  const back = document.createElement("button");
  back.className = "secondary-button";
  back.type = "button";
  back.innerHTML = `<i data-lucide="arrow-left"></i> ${t("backToProblems")}`;
  back.addEventListener("click", returnToProblemList);

  const practice = document.createElement("button");
  practice.className = "primary-button";
  practice.type = "button";
  practice.innerHTML = `<i data-lucide="messages-square"></i> ${t("useForMock")}`;
  practice.addEventListener("click", () => selectProblemForInterview(problem.id));

  const saved = getProblemPersonalState(problem.id).favorite;
  const completed = getProblemPersonalState(problem.id).completed;
  const complete = document.createElement("button");
  complete.className = `secondary-button problem-detail-complete${completed ? " active" : ""}`;
  complete.type = "button";
  complete.innerHTML = `<i data-lucide="${completed ? "check-circle-2" : "circle"}"></i> ${completed ? (isEn ? "Completed" : "已完成") : (isEn ? "Mark completed" : "标记完成")}`;
  complete.addEventListener("click", () => toggleProblemCompleted(problem.id));

  const save = document.createElement("button");
  save.className = `secondary-button problem-detail-save${saved ? " active" : ""}`;
  save.type = "button";
  save.innerHTML = `<i data-lucide="bookmark${saved ? "-check" : ""}"></i> ${saved ? t("savedForReview") : t("saveForReview")}`;
  save.addEventListener("click", () => toggleProblemSaved(problem.id));

  const actions = document.createElement("div");
  actions.className = "problem-detail-actions";
  actions.append(complete, save, practice);
  top.append(back, actions);

  const title = document.createElement("h2");
  const titleZh = String(problem.titleZh || "").trim();
  const titleEn = String(problem.titleEn || "").trim();
  title.textContent = isEn
    ? getProblemDisplayTitle(problem, true)
    : titleZh && titleEn && cleanProblemTagValue(titleZh) !== cleanProblemTagValue(titleEn)
    ? `${titleZh} / ${titleEn}`
    : titleZh || titleEn;

  const meta = document.createElement("div");
  meta.className = "problem-meta";
  [
    formatCategoryLabel(problem.category),
    problem.difficulty,
    ...problem.tags.slice(0, 5)
  ].forEach((label) => {
    if (!label) return;
    const pill = document.createElement("span");
    pill.className = "pill";
    pill.textContent = formatProblemTag(label);
    meta.appendChild(pill);
  });

  els.problemDetail.append(
    top,
    title,
    meta,
    createProblemDetailBlock(t("problemQuestion"), (isEn ? problem.promptEn || problem.promptZh : problem.promptZh || problem.promptEn) || t("noPrompt")),
    createProblemDetailBlock(t("problemAnswer"), problem.answer || t("noAnswer")),
    createProblemDetailBlock(t("problemExplanation"), problem.explanation || t("noExplanation")),
    createProblemSocialPanel(problem)
  );
  scheduleMathTypeset(els.problemDetail);
  refreshIcons();
}

function createProblemDetailBlock(title, content) {
  const block = document.createElement("section");
  block.className = "problem-detail-block";
  const heading = document.createElement("h3");
  heading.textContent = title;
  const body = document.createElement("div");
  body.className = "problem-detail-body";
  renderRichText(body, content);
  block.append(heading, body);
  return block;
}

function createProblemSocialPanel(problem) {
  const social = getProblemSocial(problem.id);
  const panel = document.createElement("section");
  panel.className = "problem-social-panel";

  const header = document.createElement("div");
  header.className = "problem-social-header";
  const heading = document.createElement("div");
  const title = document.createElement("h3");
  title.textContent = t("problemDiscussion");
  const hint = document.createElement("p");
  hint.textContent = t("problemDiscussionHint");
  heading.append(title, hint);

  const like = document.createElement("button");
  like.type = "button";
  like.className = `problem-like-button${social.liked ? " active" : ""}`;
  like.innerHTML = `<i data-lucide="heart"></i><span>${social.liked ? t("unlike") : t("like")}</span><strong>${social.likeCount}</strong>`;
  like.addEventListener("click", () => toggleProblemLike(problem.id));
  header.append(heading, like);

  const notice = document.createElement("p");
  notice.className = `problem-social-notice${problemSocialNotice ? "" : " hidden"}`;
  notice.textContent = problemSocialNotice;

  const comments = document.createElement("div");
  comments.className = "problem-comments";
  if (!social.comments.length) {
    comments.appendChild(emptyBlock(t("problemCommentEmpty")));
  } else {
    social.comments.forEach((comment) => comments.appendChild(createProblemComment(problem.id, comment)));
  }

  const form = document.createElement("form");
  form.className = "problem-comment-form";
  const input = document.createElement("textarea");
  input.rows = 3;
  input.maxLength = 1200;
  input.placeholder = t("problemCommentPlaceholder");
  const submit = document.createElement("button");
  submit.type = "submit";
  submit.className = "primary-button";
  submit.innerHTML = `<i data-lucide="send"></i> ${t("problemCommentPost")}`;
  form.append(input, submit);
  form.addEventListener("submit", (event) => {
    event.preventDefault();
    postProblemComment(problem.id, input.value);
  });

  panel.append(header, notice, comments, form);
  return panel;
}

function createProblemComment(problemId, comment) {
  const card = document.createElement("article");
  card.className = "problem-comment";
  const top = document.createElement("div");
  const author = document.createElement("strong");
  author.textContent = comment.author || "Quant";
  const time = document.createElement("time");
  time.textContent = formatDate(comment.createdAt);
  top.append(author, time);
  if (comment.isOwn) {
    const remove = document.createElement("button");
    remove.type = "button";
    remove.className = "problem-comment-delete";
    remove.title = getLanguage() === "en" ? "Delete comment" : "删除评论";
    remove.setAttribute("aria-label", remove.title);
    remove.innerHTML = `<i data-lucide="trash-2"></i>`;
    remove.addEventListener("click", () => deleteProblemComment(problemId, comment.id));
    top.append(remove);
  }
  const text = document.createElement("p");
  text.textContent = comment.text;
  card.append(top, text);
  return card;
}

async function toggleProblemLike(problemId) {
  if (!canUseCloud()) {
    problemSocialNotice = t("problemSocialCloudRequired");
    renderProblems();
    return;
  }
  try {
    const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/like`, { method: "POST" });
    problemSocial.set(problemId, normalizeProblemSocial(result.social));
    problemSocialNotice = "";
    renderProblems();
  } catch {
    problemSocialNotice = t("problemSocialError");
    renderProblems();
  }
}

async function postProblemComment(problemId, text) {
  const content = String(text || "").trim();
  if (!content) {
    problemSocialNotice = t("problemCommentRequired");
    renderProblems();
    return;
  }
  if (!canUseCloud()) {
    problemSocialNotice = t("problemSocialCloudRequired");
    renderProblems();
    return;
  }
  try {
    const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/comments`, {
      method: "POST",
      body: { text: content }
    });
    problemSocial.set(problemId, normalizeProblemSocial(result.social));
    problemSocialNotice = "";
    renderProblems();
  } catch {
    problemSocialNotice = t("problemSocialError");
    renderProblems();
  }
}

async function deleteProblemComment(problemId, commentId) {
  const message = getLanguage() === "en" ? "Delete this comment?" : "确定删除这条评论吗？";
  if (!window.confirm(message) || !canUseCloud()) return;
  try {
    const result = await cloudApi(`/problem-social/${encodeURIComponent(problemId)}/comments/${encodeURIComponent(commentId)}`, {
      method: "DELETE"
    });
    problemSocial.set(problemId, normalizeProblemSocial(result.social));
    problemSocialNotice = "";
    renderProblems();
  } catch {
    problemSocialNotice = t("problemSocialError");
    renderProblems();
  }
}

const interviewTypeDefs = {
  oa: {
    label: "Online Assessment",
    categories: ["leetcode", "probabilityExpectation", "statistics", "pandasNumpy", "mentalMath"],
    minutes: 5
  },
  technical: {
    label: "Technical Interview",
    categories: ["leetcode", "pandasNumpy", "probabilityExpectation", "statistics", "machineLearning", "deepLearning", "market", "option"],
    minutes: 8
  },
  behavioral: {
    label: "Behavioral Interview",
    categories: [],
    minutes: 4
  }
};

const behavioralInterviewProblems = [
  {
    id: "behavioral-impact",
    titleEn: "High-impact project story",
    titleZh: "高影响力项目经历",
    category: "leetcode",
    difficulty: "Medium",
    tags: ["behavioral", "impact", "STAR"],
    promptEn: "Tell me about a project where you created measurable impact. Use a clear situation, task, action, and result structure.",
    promptZh: "讲一个你做出可量化影响的项目经历。请用 Situation、Task、Action、Result 的结构回答。",
    answer: "Use STAR. Quantify the baseline, your ownership, the technical or analytical decision, and the result.",
    explanation: "A strong answer has context, personal contribution, trade-off, metric, and reflection."
  },
  {
    id: "behavioral-conflict",
    titleEn: "Disagreement with a teammate",
    titleZh: "和队友意见不一致",
    category: "market",
    difficulty: "Medium",
    tags: ["behavioral", "teamwork"],
    promptEn: "Describe a time you disagreed with a teammate or mentor. How did you handle it and what changed afterward?",
    promptZh: "讲一次你和队友或 mentor 意见不一致的经历。你如何处理，最后有什么改变？",
    answer: "Show respect, evidence, listening, a decision process, and a concrete outcome.",
    explanation: "Interviewers look for maturity, clarity under disagreement, and ability to update beliefs."
  },
  {
    id: "behavioral-failure",
    titleEn: "Failure and learning",
    titleZh: "失败和复盘",
    category: "statistics",
    difficulty: "Medium",
    tags: ["behavioral", "reflection"],
    promptEn: "Tell me about a failure or mistake. What did you learn, and how did you change your process?",
    promptZh: "讲一次失败或犯错经历。你学到了什么，后来如何改变流程？",
    answer: "Pick a real mistake, own it, explain the root cause, then show a changed system.",
    explanation: "Avoid blaming others. The strongest signal is a repeatable prevention mechanism."
  },
  {
    id: "behavioral-pressure",
    titleEn: "Working under pressure",
    titleZh: "压力下完成任务",
    category: "option",
    difficulty: "Medium",
    tags: ["behavioral", "pressure"],
    promptEn: "Describe a time you had to make progress under time pressure or ambiguity.",
    promptZh: "讲一次你在时间压力或信息不完整的情况下推进任务的经历。",
    answer: "Explain prioritization, assumptions, communication, and what you delivered.",
    explanation: "Quant roles reward clear thinking under uncertainty and fast feedback loops."
  }
];

function renderInterviewSetup() {
  els.llmEndpointInput.value = llmConfig.endpoint || "";
  els.llmModelInput.value = llmConfig.model || "";
  renderInterviewCategoryPicker();
  updateInterviewSetupVisibility();
  updateInterviewAnswerMode();
  updateInterviewStatus();
  renderInterviewQuestionPanel();
}

function renderInterviewTranscript() {
  els.interviewTranscript.innerHTML = "";
  if (!interviewMessages.length) {
    const typeDef = interviewTypeDefs[getInterviewType()];
    const source = getInterviewSource() === "pdf" ? "PDF" : "题库";
    appendMessageNode("system", interviewLanguage === "zh"
      ? `选择 ${typeDef.label}，设置题数、主题范围和来源，然后点击开始模拟。当前来源：${source}。`
      : `Choose ${typeDef.label}, set question count, topic range, and source, then start. Source: ${source}.`);
    return;
  }

  interviewMessages.forEach((message) => appendMessageNode(message.role, message.displayText ?? message.text, {
    typing: message.typing,
    thinking: message.thinking,
    attachments: message.attachments || []
  }));
  els.interviewTranscript.scrollTop = els.interviewTranscript.scrollHeight;
  if (!interviewMessages.some((message) => message.typing)) scheduleMathTypeset(els.interviewTranscript);
}

function appendMessageNode(role, text, options = {}) {
  const typing = Boolean(options.typing);
  const thinking = Boolean(options.thinking);
  const node = document.createElement("div");
  node.className = `message ${role}`;
  if (typing) node.classList.add("typing");
  if (thinking) {
    node.classList.add("thinking");
    node.setAttribute("aria-label", interviewLanguage === "zh" ? "正在思考" : "Thinking");
    for (let index = 0; index < 3; index += 1) {
      node.appendChild(document.createElement("span"));
    }
  } else if (typing) {
    node.textContent = text;
  } else {
    renderRichText(node, text);
    appendMessageAttachments(node, options.attachments || []);
  }
  els.interviewTranscript.appendChild(node);
}

function renderRichText(node, text) {
  node.classList.add("rich-text");
  node.textContent = "";
  const lines = normalizeRichTextContent(text).replace(/\r/g, "").split("\n");
  let paragraph = [];
  let list = null;

  const flushParagraph = () => {
    if (!paragraph.length) return;
    const block = document.createElement("p");
    appendInlineRichText(block, paragraph.join("\n"));
    node.appendChild(block);
    paragraph = [];
  };

  lines.forEach((line) => {
    const heading = line.match(/^(#{1,4})\s+(.+)$/);
    const bullet = line.match(/^\s*[-*]\s+(.+)$/);
    if (!line.trim()) {
      flushParagraph();
      list = null;
      return;
    }
    if (heading) {
      flushParagraph();
      list = null;
      const level = Math.min(6, 3 + heading[1].length);
      const block = document.createElement(`h${level}`);
      appendInlineRichText(block, heading[2]);
      node.appendChild(block);
      return;
    }
    if (bullet) {
      flushParagraph();
      if (!list) {
        list = document.createElement("ul");
        node.appendChild(list);
      }
      const item = document.createElement("li");
      appendInlineRichText(item, bullet[1]);
      list.appendChild(item);
      return;
    }
    list = null;
    paragraph.push(line);
  });
  flushParagraph();
}

function normalizeRichTextContent(text) {
  return String(text || "")
    .replace(/\u00a0/g, " ")
    .replace(/\\\[/g, "\\[")
    .replace(/\\\]/g, "\\]")
    .replace(/\\\(/g, "\\(")
    .replace(/\\\)/g, "\\)");
}

function appendInlineRichText(node, text) {
  const value = String(text || "");
  const pattern = /(!\[[^\]]*\]\([^)]+\)|\[[^\]]+\]\([^)]+\)|https?:\/\/[^\s)]+?\.(?:png|jpe?g|gif|webp|svg)(?:\?[^\s)]*)?|`[^`]+`|\*\*[^*]+\*\*)/gi;
  let cursor = 0;
  for (const match of value.matchAll(pattern)) {
    if (match.index > cursor) node.appendChild(document.createTextNode(value.slice(cursor, match.index)));
    const token = match[0];
    const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    const linkMatch = token.match(/^\[([^\]]+)\]\(([^)\s]+)(?:\s+"[^"]*")?\)$/);
    if (imageMatch && isSafeRichMediaUrl(imageMatch[2])) {
      node.appendChild(createRichImage(imageMatch[2], imageMatch[1] || "Interview image"));
    } else if (linkMatch && isSafeRichMediaUrl(linkMatch[2], { allowData: false })) {
      const link = document.createElement("a");
      link.href = linkMatch[2];
      link.target = "_blank";
      link.rel = "noreferrer";
      link.textContent = linkMatch[1];
      node.appendChild(link);
    } else if (/^https?:\/\//i.test(token) && isSafeRichMediaUrl(token)) {
      node.appendChild(createRichImage(token, "Interview image"));
    } else {
      const inline = document.createElement(token.startsWith("`") ? "code" : "strong");
      inline.textContent = token.slice(token.startsWith("`") ? 1 : 2, token.startsWith("`") ? -1 : -2);
      node.appendChild(inline);
    }
    cursor = match.index + token.length;
  }
  if (cursor < value.length) node.appendChild(document.createTextNode(value.slice(cursor)));
}

function isSafeRichMediaUrl(url, options = {}) {
  const allowData = options.allowData !== false;
  const value = String(url || "").trim();
  if (!value) return false;
  if (/^https?:\/\//i.test(value)) return true;
  if (allowData && /^data:image\/(?:png|jpe?g|gif|webp|svg\+xml);base64,/i.test(value)) return true;
  return /^(?:\.{0,2}\/|assets\/|data\/)[\w./%-]+\.(?:png|jpe?g|gif|webp|svg)(?:\?.*)?$/i.test(value);
}

function createRichImage(src, alt = "") {
  const image = document.createElement("img");
  image.className = "rich-media";
  image.src = src;
  image.alt = alt;
  image.loading = "lazy";
  return image;
}

function appendMessageAttachments(node, attachments = []) {
  const safeAttachments = attachments.filter(Boolean);
  if (!safeAttachments.length) return;
  const tray = document.createElement("div");
  tray.className = "message-attachments";
  safeAttachments.forEach((attachment) => {
    const item = document.createElement("div");
    item.className = "message-attachment";
    if (isImageAttachment(attachment) && attachment.dataUrl) {
      item.appendChild(createRichImage(attachment.dataUrl, attachment.name || "Uploaded image"));
    }
    const label = document.createElement("span");
    label.textContent = [
      attachment.name || (interviewLanguage === "zh" ? "附件" : "Attachment"),
      attachment.size ? `${Math.max(1, Math.round(Number(attachment.size) / 1024))} KB` : ""
    ].filter(Boolean).join(" · ");
    item.appendChild(label);
    tray.appendChild(item);
  });
  node.appendChild(tray);
}

function scheduleMathTypeset(root) {
  if (!root || !window.MathJax?.typesetPromise || mathTypesetTimer) return;
  mathTypesetTimer = window.setTimeout(() => {
    mathTypesetTimer = null;
    window.MathJax.typesetPromise([root]).catch(() => {});
  }, 80);
}

function updateInterviewLayout() {
  const showConsole = Boolean(interviewPreparing || interviewSession);
  els.interviewSetup?.classList.toggle("hidden", showConsole);
  els.interviewConsole?.classList.toggle("hidden", !showConsole);
  els.interviewGrid?.classList.toggle("setup-only", !showConsole);
  els.interviewGrid?.classList.toggle("session-only", showConsole);
}

function renderInterviewQuestionPanel() {
  if (!els.interviewQuestionPanel) return;
  els.interviewQuestionPanel.innerHTML = "";

  if (!interviewSession?.questions?.length) {
    const empty = document.createElement("div");
    empty.className = "interview-question-panel-empty";
    empty.textContent = interviewLanguage === "zh"
      ? "开始模拟后，这里会显示本轮题目和得分。"
      : "Once the mock starts, this panel shows each question and score.";
    els.interviewQuestionPanel.appendChild(empty);
    return;
  }

  const heading = document.createElement("div");
  heading.className = "interview-question-panel-head";
  const title = document.createElement("strong");
  title.textContent = interviewLanguage === "zh" ? "本轮题目" : "Questions";
  const progress = document.createElement("span");
  progress.textContent = `${Math.max(0, interviewSession.currentIndex + 1)} / ${interviewSession.questions.length}`;
  heading.append(title, progress);
  els.interviewQuestionPanel.appendChild(heading);

  const list = document.createElement("div");
  list.className = "interview-question-accordion";
  interviewSession.questions.forEach((problem, index) => {
    const result = interviewSession.questionResults?.[index] || null;
    const expanded = index === interviewPanelExpandedIndex;
    const current = index === interviewSession.currentIndex;
    const titleText = interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
    const promptText = interviewLanguage === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;

    const item = document.createElement("article");
    item.tabIndex = 0;
    item.setAttribute("role", "button");
    item.className = [
      "interview-question-item",
      expanded ? "is-expanded" : "",
      current ? "is-current" : "",
      result?.score != null ? "is-scored" : ""
    ].filter(Boolean).join(" ");
    item.dataset.interviewQuestionIndex = String(index);
    item.setAttribute("aria-expanded", String(expanded));

    const main = document.createElement("span");
    main.className = "interview-question-main";
    const label = document.createElement("strong");
    label.textContent = `Q${index + 1}. ${titleText || (interviewLanguage === "zh" ? "未命名题目" : "Untitled question")}`;
    const meta = document.createElement("small");
    meta.textContent = [formatCategoryLabel(problem.category), problem.difficulty || ""].filter(Boolean).join(" · ");
    main.append(label, meta);

    const score = document.createElement("span");
    score.className = `interview-question-score${result?.fresh ? " score-pop" : ""}`;
    score.textContent = result?.score == null ? "--" : `${Math.round(result.score)}`;
    if (result?.score != null) score.dataset.targetScore = String(Math.round(result.score));

    item.append(main, score);

    const detail = document.createElement("div");
    detail.className = "interview-question-detail";
    const prompt = document.createElement("p");
    prompt.textContent = promptText || (interviewLanguage === "zh" ? "暂无题干。" : "No prompt.");
    detail.appendChild(prompt);
    if (result?.evaluation) {
      const evaluation = document.createElement("small");
      evaluation.textContent = result.evaluation;
      detail.appendChild(evaluation);
    }
    item.appendChild(detail);

    item.addEventListener("click", () => {
      interviewPanelExpandedIndex = expanded ? -1 : index;
      renderInterviewQuestionPanel();
    });
    item.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      interviewPanelExpandedIndex = expanded ? -1 : index;
      renderInterviewQuestionPanel();
    });
    list.appendChild(item);
  });
  els.interviewQuestionPanel.appendChild(list);
  animateInterviewScores(els.interviewQuestionPanel);
  refreshIcons();
}

function animateInterviewScores(root) {
  root.querySelectorAll("[data-target-score]").forEach((node) => {
    if (node.dataset.animatedScore === node.dataset.targetScore) return;
    const target = Math.round(clampNumber(node.dataset.targetScore, 0, 100));
    node.dataset.animatedScore = String(target);
    const start = performance.now();
    const duration = 850;
    const tick = (now) => {
      const progress = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - progress, 3);
      node.textContent = String(Math.round(target * eased));
      if (progress < 1) window.requestAnimationFrame(tick);
      else node.textContent = String(target);
    };
    node.textContent = "0";
    window.requestAnimationFrame(tick);
  });
}

function renderInterviewFavorites() {
  if (!els.interviewFavoritesList) return;
  const favorites = getInterviewFavorites();
  els.interviewFavoritesList.innerHTML = "";
  if (els.interviewFavoritesSummary) {
    els.interviewFavoritesSummary.textContent = favorites.length
      ? `${favorites.length} 条复盘`
      : "保存高价值题目复盘。";
  }
  if (!favorites.length) {
    const empty = document.createElement("small");
    empty.className = "interview-favorite-empty";
    empty.textContent = "完成一题后可以把要点收进这里。";
    els.interviewFavoritesList.appendChild(empty);
    return;
  }

  favorites.slice().reverse().slice(0, 6).forEach((favorite) => {
    const item = document.createElement("article");
    item.className = "interview-favorite-item";
    const title = document.createElement("strong");
    title.textContent = favorite.title || "Untitled";
    const meta = document.createElement("small");
    meta.textContent = [
      favorite.category ? formatCategoryLabel(favorite.category) : "",
      favorite.createdAt ? formatDate(favorite.createdAt) : ""
    ].filter(Boolean).join(" · ");
    const summary = document.createElement("p");
    summary.textContent = favorite.summary || "";
    item.append(title, meta, summary);
    els.interviewFavoritesList.appendChild(item);
  });
}

function getInterviewFavorites() {
  const legacy = Array.isArray(state.interviewFavorites) ? state.interviewFavorites : [];
  const problemFavorites = (state.problemStates || []).flatMap((item) => (
    Array.isArray(item.favorites) ? item.favorites : []
  ));
  return mergeRecordsById(legacy, problemFavorites)
    .sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
}

function updateInterviewActionPanel() {
  if (!els.interviewCompleteActions) return;
  const hasCompletedQuestion = Boolean(interviewSession && interviewSession.currentIndex >= 0 && interviewSession.answeredCurrent);
  els.interviewCompleteActions.classList.toggle("hidden", !hasCompletedQuestion);

  const hasNext = Boolean(
    interviewSession
    && interviewSession.awaitingNext
    && interviewSession.currentIndex < interviewSession.questions.length - 1
  );
  if (els.nextInterviewQuestionBtn) els.nextInterviewQuestionBtn.disabled = !hasNext;
  if (els.saveInterviewFavoriteBtn) els.saveInterviewFavoriteBtn.disabled = !hasCompletedQuestion;
  if (els.shareInterviewQuestionBtn) els.shareInterviewQuestionBtn.disabled = !hasCompletedQuestion;
}

function addProblemFromForm() {
  const problem = normalizeProblem({
    titleEn: els.problemTitleEn.value,
    titleZh: els.problemTitleZh.value,
    category: els.problemCategory.value,
    difficulty: els.problemDifficulty.value,
    tags: parseTags(els.problemTags.value),
    sourceUrl: els.problemSourceUrl.value,
    source: "manual",
    promptEn: els.problemPromptEn.value,
    promptZh: els.problemPromptZh.value,
    answer: els.problemAnswer.value,
    explanation: els.problemExplanation.value,
    createdAt: new Date().toISOString()
  });

  if (!problem.titleEn && !problem.titleZh) return;
  if (!problem.promptEn && !problem.promptZh) return;

  upsertProblems([problem]);
  els.problemForm.reset();
  els.problemForm.classList.add("hidden");
  selectedInterviewProblemId = problem.id;
  resetInterview();
  renderAll();
}

function importProblemJson() {
  const raw = els.problemJsonInput.value.trim();
  if (!raw) return;
  try {
    const parsed = JSON.parse(raw);
    const problems = Array.isArray(parsed) ? parsed : [parsed];
    upsertProblems(problems);
    selectedInterviewProblemId = normalizeProblem(problems[0]).id;
    els.problemJsonInput.value = "";
    resetInterview();
    renderAll();
  } catch {
    els.problemJsonInput.value = "";
    window.alert("题目 JSON 无法读取。");
  }
}

function upsertProblems(problems) {
  const byId = new Map(state.problems.map((problem) => [problem.id, problem]));
  problems.map(normalizeProblem).filter(isCatalogProblem).forEach((problem) => {
    byId.set(problem.id, { ...(byId.get(problem.id) || {}), ...problem, updatedAt: new Date().toISOString() });
  });
  state.problems = [...byId.values()].filter(isCatalogProblem);
  saveState();
}

async function deleteProblem(id) {
  const problem = state.problems.find((item) => item.id === id);
  if (!problem || !isUserProblem(problem)) return;
  state.problems = state.problems.filter((problem) => problem.id !== id);
  if (selectedInterviewProblemId === id) {
    selectedInterviewProblemId = "";
    resetInterview();
  }
  saveState();
  renderAll();
  if (canUseCloud()) {
    await cloudApi(`/problems/${encodeURIComponent(id)}`, { method: "DELETE" }).catch(() => {});
  }
}

function selectProblemForInterview(id) {
  selectedInterviewProblemId = id;
  const problem = state.problems.find((item) => item.id === id);
  if (problem) selectedInterviewCategories = new Set([normalizeCategory(problem.category)]);
  if (els.interviewSourceSelect) els.interviewSourceSelect.value = "full";
  renderInterviewSetup();
  resetInterview();
  switchModule("interview");
}

function normalizeCatalogProblemId(id) {
  const value = String(id || "").trim();
  const legacyPrefix = [["pu", "rple"].join(""), "book"].join("-");
  if (value.startsWith(`${legacyPrefix}-problem-`)) return value.replace(`${legacyPrefix}-problem-`, "catalog-problem-");
  if (value.startsWith(`${legacyPrefix}-exercise-`)) return value.replace(`${legacyPrefix}-exercise-`, "catalog-exercise-");
  return value;
}

function normalizeProblemSource(source) {
  return isLegacyCatalogMarker(source) ? "question-bank" : String(source || "").trim();
}

function sanitizeProblemTags(tags) {
  const cleaned = tags
    .map((tag) => String(tag || "").trim())
    .filter((tag) => tag && !isLegacyCatalogMarker(tag));
  return [...new Set(cleaned)];
}

function sanitizeProblemTitleZh(title, raw = {}) {
  const legacyLabel = ["紫", "皮", "书"].join("");
  const legacyExercisePattern = new RegExp(`${legacyLabel}练习\\s*\\d+`);
  const legacyLabelPattern = new RegExp(legacyLabel, "g");
  if (!legacyExercisePattern.test(title)) return title.replace(legacyLabelPattern, "").trim();
  const number = String(raw?.id || title).match(/(\d+)$/)?.[1]?.padStart(3, "0");
  return exerciseTitleOverrides[number]?.zh || title.replace(legacyLabelPattern, "").trim();
}

function sanitizeProblemTitleEn(title, raw = {}) {
  const legacyBookPattern = new RegExp(["pu", "rple"].join("") + "\\s+book", "i");
  if (!legacyBookPattern.test(title || "")) return title;
  const number = String(raw?.id || title).match(/(\d+)$/)?.[1]?.padStart(3, "0");
  return exerciseTitleOverrides[number]?.en || title.replace(new RegExp(legacyBookPattern.source, "ig"), "Question Bank").trim();
}

function normalizeProblem(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  let titleEn = sanitizeProblemTitleEn(String(raw?.titleEn || raw?.title || "").trim(), raw);
  const titleZh = sanitizeProblemTitleZh(String(raw?.titleZh || "").trim(), raw);
  const promptEn = String(raw?.promptEn || raw?.prompt || "").trim();
  const promptZh = String(raw?.promptZh || "").trim();
  const id = normalizeCatalogProblemId(raw?.id || stableProblemId(titleEn || titleZh || sourceUrl || makeId(), sourceUrl));
  if (!titleEn && id.startsWith("catalog-exercise-")) {
    const number = id.match(/(\d+)$/)?.[1]?.padStart(3, "0");
    titleEn = exerciseTitleOverrides[number]?.en || "";
  }
  const source = normalizeProblemSource(raw?.source || inferSource(sourceUrl));
  const sourceType = String(raw?.sourceType || raw?.collection || "").trim();
  const bookSlug = String(raw?.bookSlug || "").trim();
  const tags = sanitizeProblemTags(Array.isArray(raw?.tags) ? raw.tags.map(String).filter(Boolean) : parseTags(raw?.tags || ""));
  const visibility = raw?.visibility || (
    source === "seed" || source === "question-bank" || sourceType === "book" || bookSlug
      ? "public"
      : "user"
  );
  return {
    id,
    titleEn,
    titleZh,
    category: normalizeCategory(raw?.category || inferProblemCategory(raw)),
    difficulty: raw?.difficulty || "Medium",
    tags,
    companies: normalizeProblemCompanies(raw, tags, source),
    source,
    sourceUrl,
    sourceType,
    bookSlug,
    bookName: String(raw?.bookName || "").trim(),
    promptEn,
    promptZh,
    answer: String(raw?.answer || "").trim(),
    explanation: String(raw?.explanation || raw?.solution || "").trim(),
    visibility: visibility === "public" ? "public" : "user",
    ownerUserId: String(raw?.ownerUserId || "").trim(),
    createdAt: isLegacyCatalogMarker(raw?.createdAt) ? "catalog" : raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}

function isUserProblem(problem) {
  return normalizeProblem(problem).visibility === "user";
}

function normalizeNewsItem(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  const title = cleanNewsText(raw?.title || "");
  const titleZh = cleanNewsText(raw?.titleZh || title);
  const summary = cleanNewsText(raw?.summary || raw?.description || "");
  const publishedAt = String(raw?.publishedAt || raw?.date || raw?.createdAt || new Date().toISOString()).trim();
  const tags = parseTags(raw?.tags || "");
  const skills = normalizeNewsSkills(raw?.skills || raw?.skill || raw?.primarySkill || inferNewsSkill(`${title} ${titleZh} ${summary} ${tags.join(" ")}`));
  const id = raw?.id || stableNewsId(titleZh || title || sourceUrl || makeId(), sourceUrl);
  const sourceType = normalizeNewsSourceType(raw?.sourceType || raw?.type || raw?.platform || inferNewsSourceType({ ...raw, sourceUrl }));
  return {
    id,
    title,
    titleZh,
    source: cleanNewsSource(raw?.source, sourceUrl),
    sourceType,
    sourceUrl,
    publishedAt,
    tags,
    skills,
    summary,
    insight: cleanNewsText(raw?.insight || raw?.takeaway || ""),
    readAt: raw?.readAt || "",
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}

function normalizeNewsSourceType(value) {
  const key = String(value || "").trim().toLowerCase().replace(/[\s_-]+/g, "");
  const aliases = {
    rss: "rss",
    feed: "rss",
    news: "news",
    media: "news",
    article: "news",
    official: "official",
    company: "official",
    announcement: "official",
    linkedin: "linkedin",
    linkedinsignal: "linkedin",
    xiaohongshu: "xiaohongshu",
    rednote: "xiaohongshu",
    xhs: "xiaohongshu",
    social: "social",
    manual: "manual"
  };
  return aliases[key] || "news";
}

function inferNewsSourceType(raw) {
  const sourceUrl = String(raw?.sourceUrl || raw?.url || "").trim();
  const source = String(raw?.source || "").toLowerCase();
  let host = "";
  try {
    host = new URL(sourceUrl).hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    host = "";
  }
  const text = `${host} ${source}`.toLowerCase();
  if (/linkedin\.com/.test(text)) return "linkedin";
  if (/xiaohongshu\.com|xhslink\.com|rednote/.test(text)) return "xiaohongshu";
  if (/janestreet\.com|citadel(?:securities)?\.com|optiver\.com|imc\.com|jumptrading\.com|hudsonrivertrading\.com|twosigma\.com|deshaw\.com|virtu\.com|drw\.com|flowtraders\.com|nasdaq\.com|nyse\.com|cmegroup\.com|sec\.gov/.test(text)) {
    return "official";
  }
  if (/rss|feed|google news|news\.google\.com/.test(text)) return "rss";
  if (!sourceUrl && /linkedin|小红书|xiaohongshu|rednote|social/.test(text)) return "social";
  if (!sourceUrl && /manual|手动/.test(text)) return "manual";
  return "news";
}

function isSocialNewsType(sourceType) {
  return ["linkedin", "xiaohongshu", "social", "manual"].includes(normalizeNewsSourceType(sourceType));
}

function getNewsSourceTypeLabel(sourceType) {
  const type = normalizeNewsSourceType(sourceType);
  const labels = {
    rss: "newsSourceNews",
    news: "newsSourceNews",
    official: "newsSourceOfficial",
    linkedin: "newsSourceLinkedIn",
    xiaohongshu: "newsSourceXiaohongshu",
    social: "newsSourceSocial",
    manual: "newsSourceManual"
  };
  return t(labels[type] || "newsSourceNews");
}

function getNewsVerificationLabel(sourceType, sourceUrl = "") {
  const type = normalizeNewsSourceType(sourceType);
  if (isSocialNewsType(type)) return t("newsNeedsVerify");
  return sourceUrl ? t("newsVerified") : t("newsSourceManual");
}

function cleanNewsText(value) {
  return String(value || "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function cleanNewsSource(value, sourceUrl = "") {
  const inferred = inferSource(sourceUrl);
  const source = cleanNewsText(value || inferred || "Market News");
  const sourceAliases = {
    "news.google.com": "Google News",
    "m.investing.com": "Investing.com",
    "investing.com": "Investing.com",
    "www.msn.com": "MSN",
    "msn.com": "MSN"
  };
  if (sourceAliases[source.toLowerCase()]) return sourceAliases[source.toLowerCase()];
  const hasLatinOrCjk = /[A-Za-z\u4e00-\u9fa5]/.test(source);
  if (!hasLatinOrCjk) return inferred && inferred !== "manual" ? inferred : "Market News";
  if (source.length > 34) return `${source.slice(0, 31).trim()}...`;
  return source;
}

function canonicalNewsTitle(value) {
  return cleanNewsText(value)
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/\b(stock|shares?)\b/g, "")
    .replace(/[^a-z0-9\u4e00-\u9fa5]+/g, " ")
    .trim();
}

function normalizeNetworkContact(raw) {
  return {
    id: raw?.id || makeId(),
    name: String(raw?.name || "").trim(),
    company: String(raw?.company || "").trim(),
    role: String(raw?.role || "").trim(),
    status: String(raw?.status || "To reach out").trim(),
    channel: String(raw?.channel || "").trim(),
    nextStep: String(raw?.nextStep || "").trim(),
    notes: String(raw?.notes || "").trim(),
    createdAt: raw?.createdAt || new Date().toISOString(),
    updatedAt: raw?.updatedAt || ""
  };
}

function stableProblemId(title, sourceUrl) {
  const base = `${title}|${sourceUrl}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `problem-${base.slice(0, 80) || makeId()}`;
}

function stableNewsId(title, sourceUrl) {
  const base = `${title}|${sourceUrl}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `news-${base.slice(0, 90) || makeId()}`;
}

function stableCourseId(title, sourceUrl) {
  const base = `${title}|${sourceUrl}`.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, "-").replace(/^-|-$/g, "");
  return `course-${base.slice(0, 90) || makeId()}`;
}

function inferProblemCategory(raw) {
  const text = `${raw?.sourceUrl || ""} ${raw?.source || ""} ${raw?.title || ""} ${raw?.prompt || ""}`.toLowerCase();
  if (text.includes("leetcode")) return "leetcode";
  if (text.includes("pandas") || text.includes("numpy") || text.includes("dataframe")) return "pandasNumpy";
  if (text.includes("option") || text.includes("greeks") || text.includes("volatility")) return "option";
  if (text.includes("market") || text.includes("trading")) return "market";
  if (text.includes("statistics") || text.includes("p-value") || text.includes("hypothesis")) return "statistics";
  if (text.includes("deep learning") || text.includes("transformer") || text.includes("neural")) return "deepLearning";
  if (text.includes("machine learning") || text.includes("xgboost") || text.includes("feature")) return "machineLearning";
  if (text.includes("probability") || text.includes("expected") || text.includes("bayes")) return "probabilityExpectation";
  return "probabilityExpectation";
}

function normalizeCategory(category) {
  const key = String(category || "").trim();
  const aliases = {
    probability: "probabilityExpectation",
    expectation: "probabilityExpectation",
    mental: "mentalMath",
    mental_math: "mentalMath",
    pandas: "pandasNumpy",
    numpy: "pandasNumpy",
    ml: "machineLearning",
    machine_learning: "machineLearning",
    dl: "deepLearning",
    deep_learning: "deepLearning",
    options: "option",
    communication: "leetcode"
  };
  return skillDefs[key] ? key : aliases[key] || "probabilityExpectation";
}

function inferSource(sourceUrl) {
  try {
    return new URL(sourceUrl).hostname.replace(/^www\./, "") || "manual";
  } catch {
    return "manual";
  }
}

function parseTags(value) {
  if (Array.isArray(value)) return value.map(String).map((item) => item.trim()).filter(Boolean);
  return String(value || "").split(/[,，#\s]+/).map((item) => item.trim()).filter(Boolean);
}

function normalizeNewsSkills(value) {
  const raw = Array.isArray(value) ? value : parseTags(value || "");
  const skills = raw.map(normalizeCategory).filter((key) => skillDefs[key]);
  return [...new Set(skills.length ? skills : ["market"])];
}

function isLowQualityNews(item) {
  const id = String(item?.id || "");
  if (!id.startsWith("api-news-")) return false;
  const text = `${item.title || ""} ${item.titleZh || ""} ${item.summary || ""} ${item.source || ""}`.toLowerCase();
  if (/trading bot|stock trading bot|crypto trading bot|best ai trading|for beginners|platforms? in 2026|mexc/.test(text)) return true;
  if (/jane street|citadel|two sigma|squarepoint|optiver|imc|hudson river|jump trading|tower research/.test(text)) return false;
  return !/market making|electronic trading|options?|volatility|derivatives?|exchange|hedge fund|coreweave|gpu|liquidity|order book/.test(text);
}

function inferNewsSkill(text) {
  const lower = String(text || "").toLowerCase();
  if (/ai|gpu|cloud|coreweave|model|deep|transformer|算力|模型/.test(lower)) return "deepLearning";
  if (/option|vol|volatility|波动|期权|greeks/.test(lower)) return "option";
  if (/data|feature|machine learning|ml|机器学习/.test(lower)) return "machineLearning";
  if (/stat|regression|估计|统计/.test(lower)) return "statistics";
  if (/leetcode|system|系统|latency|低延迟/.test(lower)) return "leetcode";
  return "market";
}

function sortNews(news) {
  return [...news].sort((a, b) => newsTime(b) - newsTime(a));
}

function newsTime(item) {
  const value = new Date(item?.publishedAt || item?.createdAt || 0).getTime();
  return Number.isNaN(value) ? 0 : value;
}

function formatCategoryLabel(category) {
  const normalized = normalizeCategory(category);
  return skillDefs[normalized]?.name || category;
}

function consumeIncomingCapture() {
  const params = new URLSearchParams(window.location.search);
  const capture = params.get("capture");
  if (!capture) return;

  try {
    const payload = parseCapturePayload(capture);
    const problems = Array.isArray(payload) ? payload : [payload];
    if (currentUser) {
      upsertProblems(problems);
      selectedInterviewProblemId = normalizeProblem(problems[0]).id;
    } else {
      sessionStorage.setItem(PENDING_CAPTURE_KEY, JSON.stringify(problems));
      showAuthMessage("登录后会自动收录刚才捕获的题目。");
    }
  } catch {
    showAuthMessage("插件捕获的题目无法读取。");
  } finally {
    params.delete("capture");
    const nextQuery = params.toString();
    const nextUrl = `${window.location.pathname}${nextQuery ? `?${nextQuery}` : ""}${window.location.hash}`;
    history.replaceState(null, "", nextUrl);
  }
}

function consumePendingCapture() {
  if (!currentUser) return;
  const raw = sessionStorage.getItem(PENDING_CAPTURE_KEY);
  if (!raw) return;
  try {
    const problems = JSON.parse(raw);
    upsertProblems(Array.isArray(problems) ? problems : [problems]);
    selectedInterviewProblemId = normalizeProblem(Array.isArray(problems) ? problems[0] : problems).id;
  } catch {
    // Ignore malformed session handoff.
  } finally {
    sessionStorage.removeItem(PENDING_CAPTURE_KEY);
  }
}

function parseCapturePayload(value) {
  const normalized = value.replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(normalized.length + ((4 - (normalized.length % 4)) % 4), "=");
  const binary = atob(padded);
  const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
  return JSON.parse(new TextDecoder().decode(bytes));
}

function saveLlmConfig() {
  llmConfig = {
    endpoint: els.llmEndpointInput.value.trim() || DEFAULT_LLM_ENDPOINT,
    model: normalizeLlmModel(els.llmModelInput.value)
  };
  saveLlmConfigToStorage();
  appendInterviewMessage("system", t("llmSaved"));
}

function renderSettings() {
  if (!currentUser || !els.settingsForm) return;
  els.settingsLanguageSelect.value = getLanguage();
  renderCountryOptions(els.settingsCountrySelect, currentUser.country);
  renderRegionOptions(els.settingsRegionSelect, currentUser.country, currentUser.region);
  els.settingsLlmEndpointInput.value = llmConfig.endpoint || "";
  els.settingsLlmModelInput.value = llmConfig.model || "";
  if (els.settingsCloudApiInput) els.settingsCloudApiInput.value = cloudConfig.endpoint || DEFAULT_CLOUD_API_ENDPOINT;
  els.settingsGoogleClientIdInput.value = auth.googleClientId || "";
  renderCloudStatus();
}

function saveSettings() {
  if (!currentUser) return;
  appPrefs.language = normalizeLanguage(els.settingsLanguageSelect.value);
  saveAppPrefs();
  syncLanguageToUrl(appPrefs.language);
  const country = normalizeCountry(els.settingsCountrySelect.value);
  const region = normalizeRegionForCountry(els.settingsRegionSelect.value, country);
  llmConfig = {
    endpoint: els.settingsLlmEndpointInput.value.trim() || DEFAULT_LLM_ENDPOINT,
    model: normalizeLlmModel(els.settingsLlmModelInput.value)
  };
  auth.googleClientId = els.settingsGoogleClientIdInput.value.trim();
  cloudConfig.endpoint = els.settingsCloudApiInput?.value.trim() || DEFAULT_CLOUD_API_ENDPOINT;
  auth.accounts = auth.accounts.map((account) => (
    account.id === currentUser.id ? { ...account, country, region, updatedAt: new Date().toISOString() } : account
  ));
  saveLlmConfigToStorage();
  saveCloudConfig();
  saveAuth();
  currentUser = getCurrentUser();
  state.leaderboard = normalizeLeaderboardSettings({ ...state.leaderboard, country, region });
  saveState();
  queueCloudSync("account", 0);
  renderGoogleClientInput();
  renderAll();
  switchModule("settings");
  els.settingsMessage.textContent = `${t("settingsSaved")} ${getCloudStatusText()}`;
}

function getInterviewType() {
  return interviewTypeDefs[els.interviewTypeSelect?.value] ? els.interviewTypeSelect.value : "oa";
}

function getInterviewSource() {
  return els.interviewSourceSelect?.value === "pdf" ? "pdf" : "full";
}

function getInterviewAnswerMode() {
  return ["text", "file", "voice"].includes(els.interviewAnswerModeSelect?.value) ? els.interviewAnswerModeSelect.value : "text";
}

function getInterviewQuestionCount() {
  return Math.round(clampNumber(els.interviewQuestionCount?.value || 3, 1, 12));
}

function getInterviewQuestionSeconds() {
  return Math.round(clampNumber(els.interviewQuestionTime?.value || interviewTypeDefs[getInterviewType()].minutes, 1, 60) * 60);
}

function makeInterviewProblemPool(type = getInterviewType()) {
  const base = makeInterviewBaseProblemPool(type);
  const selectedCategories = getInterviewSelectedCategories();
  if (selectedCategories.includes("all")) return base;
  return base.filter((problem) => selectedCategories.includes(normalizeCategory(problem.category)));
}

function makeInterviewBaseProblemPool(type = getInterviewType()) {
  if (type === "behavioral") return behavioralInterviewProblems.map(normalizeProblem);
  const categories = interviewTypeDefs[type]?.categories || [];
  const filtered = state.problems.filter((problem) => categories.includes(normalizeCategory(problem.category)));
  return filtered.length ? filtered : state.problems;
}

function getInterviewAvailableCategories(type = getInterviewType()) {
  const categories = makeInterviewBaseProblemPool(type).map((problem) => normalizeCategory(problem.category)).filter((key) => skillDefs[key]);
  const unique = [...new Set(categories)];
  return unique.length ? unique : Object.keys(skillDefs);
}

function getInterviewSelectedCategories() {
  const available = getInterviewAvailableCategories();
  if (selectedInterviewCategories.has("all")) return ["all"];
  const selected = [...selectedInterviewCategories].filter((key) => available.includes(key));
  return selected.length ? selected : ["all"];
}

function renderInterviewCategoryPicker() {
  if (!els.interviewCategoryPicker) return;
  const available = getInterviewAvailableCategories();
  const selected = getInterviewSelectedCategories();
  if (selected[0] === "all") selectedInterviewCategories = new Set(["all"]);
  else selectedInterviewCategories = new Set(selected);

  els.interviewCategoryPicker.innerHTML = "";
  const items = ["all", ...available];
  items.forEach((key) => {
    const button = document.createElement("button");
    const active = key === "all" ? selectedInterviewCategories.has("all") : selectedInterviewCategories.has(key);
    button.type = "button";
    button.className = `interview-category-chip${active ? " active" : ""}`;
    button.dataset.interviewCategory = key;
    button.setAttribute("aria-pressed", String(active));
    button.textContent = key === "all"
      ? (interviewLanguage === "zh" ? "随机" : "Random")
      : formatCategoryLabel(key);
    els.interviewCategoryPicker.appendChild(button);
  });
}

function toggleInterviewCategory(category) {
  if (!category) return;
  if (category === "all") {
    selectedInterviewCategories = new Set(["all"]);
  } else {
    if (selectedInterviewCategories.has("all")) selectedInterviewCategories = new Set();
    if (selectedInterviewCategories.has(category)) selectedInterviewCategories.delete(category);
    else selectedInterviewCategories.add(category);
    if (!selectedInterviewCategories.size) selectedInterviewCategories = new Set(["all"]);
  }
  renderInterviewCategoryPicker();
  updateInterviewSetupVisibility();
  resetInterview({ keepSetup: true });
}

function getSelectedProblem() {
  if (interviewSession?.currentProblem) return interviewSession.currentProblem;
  const pool = makeInterviewProblemPool();
  return pool.find((problem) => problem.id === selectedInterviewProblemId) || pool[0] || null;
}

function updateInterviewSetupVisibility() {
  if (els.interviewPdfRow) {
    els.interviewPdfRow.classList.toggle("hidden", getInterviewSource() !== "pdf");
  }
  if (els.interviewCategoryRow) {
    els.interviewCategoryRow.classList.toggle("hidden", getInterviewSource() !== "full");
  }
  if (els.interviewSummary) {
    const typeDef = interviewTypeDefs[getInterviewType()];
    const source = getInterviewSource() === "pdf" ? "PDF 生成题目" : `全范围题库抽题 · ${formatInterviewCategorySummary()}`;
    els.interviewSummary.textContent = `${typeDef.label} · ${source} · ${getInterviewQuestionCount()} 题`;
  }
}

function formatInterviewCategorySummary() {
  const selected = getInterviewSelectedCategories();
  if (selected.includes("all")) return interviewLanguage === "zh" ? "随机主题" : "Random themes";
  return selected.map(formatCategoryLabel).join("、");
}

function updateInterviewAnswerMode() {
  els.interviewAnswerFileRow?.classList.remove("hidden");
  els.voiceAnswerBtn?.classList.remove("hidden");
  if (els.interviewAnswer) {
    els.interviewAnswer.placeholder = interviewLanguage === "zh"
      ? "输入你的回答，Enter 发送，Shift+Enter 换行"
      : "Type your answer. Enter sends, Shift+Enter adds a line";
    autoSizeInterviewAnswer();
  }
}

function updateInterviewPdfMeta() {
  const file = els.interviewPdfInput?.files?.[0];
  if (!els.interviewPdfMeta) return;
  els.interviewPdfMeta.textContent = file
    ? `${file.name} · ${Math.round(file.size / 1024)} KB`
    : "上传 PDF 后会由 LLM 总结重点并生成题目。";
}

function updateInterviewAnswerFileMeta() {
  const file = els.interviewAnswerFile?.files?.[0];
  const label = file
    ? `${file.name} · ${Math.max(1, Math.round(file.size / 1024))} KB`
    : (interviewLanguage === "zh" ? "支持图片、文本文件和 PDF。" : "Supports images, text files, and PDF.");
  if (els.interviewAnswerFileMeta) els.interviewAnswerFileMeta.textContent = label;
  if (!els.interviewAttachmentPreview) return;
  els.interviewAttachmentPreview.innerHTML = "";
  els.interviewAttachmentPreview.classList.toggle("hidden", !file);
  if (!file) return;
  const chip = document.createElement("span");
  chip.className = "interview-attachment-chip";
  chip.innerHTML = `<i data-lucide="${file.type.startsWith("image/") ? "image" : "paperclip"}"></i><span>${escapeHtml(label)}</span>`;
  els.interviewAttachmentPreview.appendChild(chip);
  refreshIcons();
}

function autoSizeInterviewAnswer() {
  if (!els.interviewAnswer) return;
  els.interviewAnswer.style.height = "auto";
  els.interviewAnswer.style.height = `${Math.min(Math.max(44, els.interviewAnswer.scrollHeight), 220)}px`;
}

function handleInterviewAnswerKeydown(event) {
  if (event.key !== "Enter" || event.shiftKey || event.isComposing) return;
  event.preventDefault();
  els.interviewForm?.requestSubmit();
}

function resetInterview(options = {}) {
  clearInterviewTimers();
  interviewSession = null;
  interviewPreparing = false;
  interviewMessages = [];
  interviewPanelExpandedIndex = 0;
  if (!options.keepSetup) renderInterviewSetup();
  if (els.interviewAnswer) els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  updateInterviewStatus();
  renderInterviewTranscript();
  renderInterviewQuestionPanel();
}

async function startInterview() {
  const source = getInterviewSource();
  const type = getInterviewType();
  const count = getInterviewQuestionCount();
  const answerMode = "chat";
  clearInterviewTimers();
  interviewMessages = [];
  interviewSession = null;
  interviewPreparing = true;
  interviewPanelExpandedIndex = 0;
  updateInterviewStatus("loading");
  setButtonBusy(els.startInterviewBtn, true, interviewLanguage === "zh" ? "准备中" : "Preparing");

  try {
    const questions = source === "pdf"
      ? await buildPdfInterviewQuestions(count, type)
      : buildFullRangeInterviewQuestions(count, type);

    if (!questions.length) {
      appendInterviewMessage("system", interviewLanguage === "zh"
        ? "没有可用题目。请先添加题库，或切换到 PDF 生成题目。"
        : "No questions available. Add problems first or switch to PDF generation.");
      interviewPreparing = false;
      updateInterviewStatus();
      return;
    }

    interviewSession = {
      id: makeId(),
      type,
      source,
      answerMode,
      questionSeconds: getInterviewQuestionSeconds(),
      questions,
      currentIndex: -1,
      currentProblem: null,
      awaitingNext: false,
      completed: false,
      questionResults: [],
      latestScoredIndex: -1,
      startedAt: new Date().toISOString()
    };
    interviewPreparing = false;

    appendInterviewMessage("coach", interviewLanguage === "zh"
      ? `已生成 ${questions.length} 道题，题目已准备。`
      : `${questions.length} questions are ready.`);
    startInterviewPrepCountdown(5);
  } catch (error) {
    appendInterviewMessage("system", interviewLanguage === "zh"
      ? `准备模拟面试失败：${error.message || "请检查 LLM 代理是否启动。"}`
      : `Failed to prepare interview: ${error.message || "Check the LLM proxy."}`);
    interviewPreparing = false;
    updateInterviewStatus();
  } finally {
    setButtonBusy(els.startInterviewBtn, false);
  }
}

function buildFullRangeInterviewQuestions(count, type) {
  const pool = makeInterviewProblemPool(type);
  const selectedProblem = pool.find((problem) => problem.id === selectedInterviewProblemId);
  const sampled = sampleInterviewQuestions(
    selectedProblem ? pool.filter((problem) => problem.id !== selectedProblem.id) : pool,
    selectedProblem ? Math.max(0, count - 1) : count
  );
  return (selectedProblem ? [selectedProblem, ...sampled] : sampled).map((problem) => normalizeProblem(problem));
}

async function buildPdfInterviewQuestions(count, type) {
  const file = els.interviewPdfInput?.files?.[0];
  if (!file) throw new Error(interviewLanguage === "zh" ? "请先上传 PDF。" : "Upload a PDF first.");
  if (file.size > 20 * 1024 * 1024) {
    throw new Error(interviewLanguage === "zh" ? "PDF 太大，请先控制在 20MB 内。" : "PDF is too large; keep it under 20MB.");
  }
  appendInterviewMessage("coach", interviewLanguage === "zh" ? "正在分析 PDF 并生成题目..." : "Analyzing PDF and generating questions...");
  const filePayload = await readFilePayload(file, { preferDataUrl: true });
  const data = await requestPdfQuestionGeneration(filePayload, count, type);
  const questions = Array.isArray(data.questions) ? data.questions : [];
  if (data.summary) {
    updateInterviewMessage(interviewMessages[interviewMessages.length - 1]?.id, data.summary);
  }
  const normalized = questions.slice(0, count).map((item, index) => normalizeGeneratedInterviewProblem(item, index, file.name, type));
  if (normalized.length) upsertProblems(normalized);
  return normalized;
}

function sampleInterviewQuestions(pool, count) {
  const source = [...pool];
  for (let index = source.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [source[index], source[swapIndex]] = [source[swapIndex], source[index]];
  }
  return source.slice(0, count);
}

function normalizeGeneratedInterviewProblem(raw, index, sourceName, type) {
  const fallbackCategory = type === "behavioral" ? "market" : "probabilityExpectation";
  return normalizeProblem({
    ...raw,
    id: raw?.id || stableProblemId(`${sourceName}-${index}-${raw?.titleEn || raw?.titleZh || raw?.promptEn || raw?.promptZh || makeId()}`, sourceName),
    source: "pdf-interview",
    sourceUrl: "",
    category: normalizeCategory(raw?.category || fallbackCategory),
    difficulty: raw?.difficulty || "Medium",
    tags: [...new Set([...parseTags(raw?.tags || ""), "pdf", interviewTypeDefs[type]?.label || "interview"])],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  });
}

function startInterviewPrepCountdown(seconds) {
  let remaining = seconds;
  setInterviewTimer(remaining);
  updateInterviewStatus("preparing");
  interviewPrepTimer = window.setInterval(() => {
    remaining -= 1;
    if (remaining <= 0) {
      window.clearInterval(interviewPrepTimer);
      interviewPrepTimer = null;
      showInterviewQuestion(0);
      return;
    }
    setInterviewTimer(remaining);
  }, 1000);
}

function showInterviewQuestion(index) {
  if (!interviewSession || index >= interviewSession.questions.length) {
    completeInterview();
    return;
  }
  clearInterviewQuestionTimer();
  const problem = interviewSession.questions[index];
  interviewSession.currentIndex = index;
  interviewSession.currentProblem = problem;
  interviewSession.awaitingNext = false;
  interviewSession.answeredCurrent = false;
  interviewSession.remainingSeconds = interviewSession.questionSeconds;
  interviewPanelExpandedIndex = index;
  if (els.interviewAnswer) els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  autoSizeInterviewAnswer();

  interviewSession.currentQuestionMessageId = appendInterviewMessage("system", formatInterviewQuestion(problem, index), { typewriter: false });
  appendInterviewMessage("coach", interviewLanguage === "zh"
    ? "请开始作答。可以先讲思路，再给结论。需要提示时点 Hint。"
    : "Start your answer. Explain your approach first, then give the conclusion. Use Hint if needed.");
  updateInterviewStatus("active");
  setInterviewTimer(interviewSession.remainingSeconds);
  interviewQuestionTimer = window.setInterval(() => {
    if (!interviewSession || interviewSession.completed) return;
    interviewSession.remainingSeconds -= 1;
    setInterviewTimer(interviewSession.remainingSeconds);
    if (interviewSession.remainingSeconds <= 0) {
      clearInterviewQuestionTimer();
      appendInterviewMessage("coach", interviewLanguage === "zh"
        ? "时间到。你仍然可以提交当前回答，我会按已有内容评测。"
        : "Time is up. You can still submit the current answer for evaluation.");
      updateInterviewStatus("timeup");
    }
  }, 1000);
  renderInterviewQuestionPanel();
  els.interviewAnswer?.focus();
}

function formatInterviewQuestion(problem, index) {
  const title = interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
  const prompt = interviewLanguage === "zh" ? problem.promptZh || problem.promptEn : problem.promptEn || problem.promptZh;
  return [
    `# Q${index + 1}/${interviewSession.questions.length} · ${interviewTypeDefs[interviewSession.type]?.label || "Interview"} · ${formatCategoryLabel(problem.category)} · ${problem.difficulty}`,
    "",
    `**${title}**`,
    "",
    prompt || "No prompt.",
    getProblemMediaMarkdown(problem, "prompt")
  ].filter(Boolean).join("\n");
}

function getProblemMediaMarkdown(problem, scope = "all") {
  const values = [];
  const pushValue = (value) => {
    if (!value) return;
    if (Array.isArray(value)) {
      value.forEach(pushValue);
      return;
    }
    if (typeof value === "object") {
      pushValue(value.url || value.src || value.href || value.dataUrl);
      return;
    }
    const url = String(value || "").trim();
    if (isSafeRichMediaUrl(url)) values.push(url);
  };

  if (scope === "prompt" || scope === "all") {
    ["image", "imageUrl", "imageUrls", "images", "diagram", "diagramUrl", "promptImage", "promptImages"].forEach((key) => pushValue(problem?.[key]));
  }
  if (scope === "answer" || scope === "all") {
    ["answerImage", "answerImages", "explanationImage", "explanationImages", "solutionImage", "solutionImages"].forEach((key) => pushValue(problem?.[key]));
  }

  return [...new Set(values)]
    .map((url, index) => `![${scope === "answer" ? "answer" : "problem"} image ${index + 1}](${url})`)
    .join("\n");
}

async function submitInterviewAnswer() {
  const problem = getSelectedProblem();
  if (!interviewSession || interviewSession.currentIndex < 0 || !problem) {
    appendInterviewMessage("system", interviewLanguage === "zh" ? "请先点击开始模拟。" : "Start the mock interview first.");
    return;
  }

  const answerPayload = await collectInterviewAnswer();
  if (!answerPayload.text && !answerPayload.attachment) {
    els.interviewAnswer.focus();
    return;
  }

  clearInterviewQuestionTimer();
  const displayAnswer = [
    answerPayload.text || "",
    answerPayload.attachment ? `[${interviewLanguage === "zh" ? "上传附件" : "Attachment"}: ${answerPayload.attachment.name}]` : ""
  ].filter(Boolean).join("\n");
  appendInterviewMessage("user", displayAnswer, {
    typewriter: false,
    attachments: answerPayload.attachment ? [answerPayload.attachment] : []
  });
  els.interviewAnswer.value = "";
  if (els.interviewAnswerFile) els.interviewAnswerFile.value = "";
  updateInterviewAnswerFileMeta();
  autoSizeInterviewAnswer();
  const thinkingId = appendInterviewMessage("coach", "", { thinking: true });
  let feedback;

  try {
    const reply = await requestInterviewFeedback(problem, answerPayload.text, answerPayload.attachment);
    feedback = normalizeInterviewFeedback(reply, problem, answerPayload.text);
  } catch {
    feedback = normalizeInterviewFeedback(localInterviewFeedback(problem, answerPayload.text), problem, answerPayload.text);
  }
  updateInterviewMessage(thinkingId, feedback.text);

  recordInterviewPractice(problem, feedback);
  interviewSession.answeredCurrent = true;
  renderInterviewQuestionPanel();
  const isLast = interviewSession.currentIndex >= interviewSession.questions.length - 1;
  if (isLast) {
    completeInterview();
  } else {
    interviewSession.awaitingNext = true;
    updateInterviewStatus("awaitingNext");
  }
}

async function collectInterviewAnswer() {
  const text = els.interviewAnswer.value.trim();
  const file = els.interviewAnswerFile?.files?.[0];
  if (!file) return { text, attachment: null };
  const attachment = await readFilePayload(file, { preferDataUrl: isBinaryInterviewAttachment(file) });
  return { text, attachment };
}

async function readFilePayload(file, options = {}) {
  const isPdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  const isImage = isImageFile(file);
  const preferDataUrl = options.preferDataUrl || isPdf;
  const content = preferDataUrl ? await readFileAsDataUrl(file) : await readFileAsText(file);
  return {
    name: file.name,
    type: file.type || (isPdf ? "application/pdf" : isImage ? "image/*" : "text/plain"),
    size: file.size,
    dataUrl: preferDataUrl ? content : "",
    text: preferDataUrl ? "" : String(content || "").slice(0, 80_000)
  };
}

function isImageFile(file) {
  return Boolean(file && (String(file.type || "").startsWith("image/") || /\.(png|jpe?g|gif|webp|svg)$/i.test(file.name || "")));
}

function isImageAttachment(attachment) {
  return Boolean(attachment && (String(attachment.type || "").startsWith("image/") || /^data:image\//i.test(attachment.dataUrl || "") || /\.(png|jpe?g|gif|webp|svg)$/i.test(attachment.name || "")));
}

function isBinaryInterviewAttachment(file) {
  return Boolean(file && (isImageFile(file) || file.type === "application/pdf" || /\.pdf$/i.test(file.name || "")));
}

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsText(file);
  });
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.addEventListener("load", () => resolve(String(reader.result || "")));
    reader.addEventListener("error", () => reject(reader.error || new Error("File read failed")));
    reader.readAsDataURL(file);
  });
}

async function requestInterviewFeedback(problem, answer, attachment = null) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");

  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model)
  };
  saveLlmConfigToStorage();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "evaluate",
      model: llmConfig.model,
      language: interviewLanguage,
      interviewType: interviewSession?.type || getInterviewType(),
      questionIndex: interviewSession?.currentIndex || 0,
      questionCount: interviewSession?.questions?.length || 1,
      problem,
      transcript: getSerializableInterviewTranscript(),
      answer,
      answerAttachment: attachment
    })
  });

  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  return data.reply || data.text || localInterviewFeedback(problem, answer);
}

function getSerializableInterviewTranscript() {
  return interviewMessages
    .filter((message) => !message.thinking)
    .map((message) => ({
      role: message.role,
      text: String(message.text || message.displayText || "").slice(0, 6000),
      attachments: (message.attachments || []).map((attachment) => ({
        name: attachment.name || "",
        type: attachment.type || "",
        size: attachment.size || 0
      }))
    }));
}

async function requestPdfQuestionGeneration(filePayload, count, type) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  llmConfig = {
    endpoint,
    model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model)
  };
  saveLlmConfigToStorage();

  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "generate_pdf_questions",
      model: llmConfig.model,
      language: interviewLanguage,
      interviewType: type,
      count,
      file: filePayload
    })
  });
  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  return response.json();
}

async function requestInterviewHint() {
  const problem = getSelectedProblem();
  if (!problem) return;
  const thinkingId = appendInterviewMessage("coach", interviewLanguage === "zh" ? "生成 hint 中..." : "Generating hint...");
  try {
    const hint = await requestInterviewHintFromApi(problem, els.interviewAnswer.value.trim());
    updateInterviewMessage(thinkingId, hint, { typewriter: true });
  } catch {
    updateInterviewMessage(thinkingId, localInterviewHint(problem), { typewriter: true });
  }
}

async function requestInterviewHintFromApi(problem, partialAnswer) {
  const endpoint = (els.llmEndpointInput.value.trim() || llmConfig.endpoint || "").trim();
  if (!endpoint) throw new Error("Missing endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      task: "hint",
      model: normalizeLlmModel(els.llmModelInput.value || llmConfig.model),
      language: interviewLanguage,
      interviewType: interviewSession?.type || getInterviewType(),
      problem,
      transcript: interviewMessages,
      partialAnswer
    })
  });
  if (!response.ok) throw new Error(`LLM endpoint ${response.status}`);
  const data = await response.json();
  return data.hint || data.reply || data.text || localInterviewHint(problem);
}

function localInterviewFeedback(problem, answer) {
  const missing = getLocalInterviewMissingSignals(problem, answer);
  const score = scoreLocalInterviewAnswer(answer, missing.length);
  const evaluation = getLocalInterviewEvaluation(answer, missing);
  const reference = getInterviewReferenceSummary(problem);
  const nextStep = missing.length
    ? (interviewLanguage === "zh"
      ? `下一步：补齐 ${missing.join("、")}，再用 60 秒重讲一遍。`
      : `Next: add ${missing.join(", ")} and restate the answer in 60 seconds.`)
    : (interviewLanguage === "zh"
      ? "下一步：把最终结论提前，并补一句复杂度、风险或边界条件。"
      : "Next: lead with the final conclusion and add one complexity, risk, or edge-case line.");
  return interviewLanguage === "zh"
    ? `得分：${score}/100\n\n评价：${evaluation}\n\n参考方向：${reference}\n\n${nextStep}`
    : `Score: ${score}/100\n\nEvaluation: ${evaluation}\n\nReference direction: ${reference}\n\n${nextStep}`;
}

function normalizeInterviewFeedback(text, problem, answer) {
  const raw = normalizeRichTextContent(text).trim();
  const local = localInterviewFeedback(problem, answer);
  const score = parseInterviewFeedbackScore(raw) ?? parseInterviewFeedbackScore(local) ?? 0;
  const evaluation = parseInterviewFeedbackEvaluation(raw) || parseInterviewFeedbackEvaluation(local);
  const displayText = raw || local;
  const hasScoreLine = parseInterviewFeedbackScore(displayText) != null;
  return {
    score,
    evaluation,
    text: hasScoreLine
      ? displayText
      : (interviewLanguage === "zh" ? `得分：${score}/100\n\n${displayText}` : `Score: ${score}/100\n\n${displayText}`)
  };
}

function parseInterviewFeedbackScore(text) {
  const source = String(text || "");
  const labeled = source.match(/(?:得分|评分|score)\s*[:：]?\s*(\d{1,3})(?:\s*\/\s*100)?/i);
  const fallback = source.match(/\b(\d{1,3})\s*\/\s*100\b/);
  const value = Number((labeled || fallback)?.[1]);
  if (!Number.isFinite(value)) return null;
  return Math.round(clampNumber(value, 0, 100));
}

function parseInterviewFeedbackEvaluation(text) {
  const lines = String(text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
  const labeled = lines.find((line) => /^(评价|evaluation)\s*[:：]/i.test(line));
  const olderLine = lines.find((line) => /^(改进|fix|亮点|good)\s*[:：]/i.test(line));
  const fallback = lines.find((line) => !/^(得分|评分|score)\s*[:：]/i.test(line));
  return stripInterviewFeedbackLabel(labeled || olderLine || fallback || "").slice(0, 900);
}

function stripInterviewFeedbackLabel(text) {
  return String(text || "").replace(/^(评价|evaluation|改进|fix|亮点|good)\s*[:：]\s*/i, "").trim();
}

function getLocalInterviewMissingSignals(problem, answer) {
  const missing = [];
  const category = normalizeCategory(problem.category);
  if (category === "leetcode" && !/(o\(|time|space|复杂度|哈希|hash|dp|binary|二分)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "复杂度或关键数据结构" : "complexity or core data structure");
  }
  if (category === "probabilityExpectation" && !/(期望|概率|条件|bayes|expect|prob|conditional|sample space)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "随机变量或条件概率结构" : "random variable or conditioning structure");
  }
  if (category === "statistics" && !/(p-value|hypothesis|置信|检验|估计|regression|回归|sample|抽样)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "统计假设、估计或样本结构" : "statistical hypothesis, estimator, or sampling setup");
  }
  if (category === "machineLearning" && !/(feature|特征|validation|验证|overfit|过拟合|metric|指标|model|模型)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "特征、验证或指标" : "features, validation, or metrics");
  }
  if (category === "deepLearning" && !/(gradient|梯度|loss|attention|transformer|backprop|反向传播|neural|神经)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "梯度、loss 或网络结构" : "gradients, loss, or architecture");
  }
  if (category === "market" && !/(risk|inventory|spread|fair|风险|库存|价差|公允)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "风险、库存或价差" : "risk, inventory, or spread");
  }
  if (category === "option" && !/(delta|gamma|vega|theta|vol|iv|波动率|期权|对冲|hedge)/i.test(answer)) {
    missing.push(interviewLanguage === "zh" ? "Greeks、波动率或对冲逻辑" : "Greeks, volatility, or hedging logic");
  }
  return missing;
}

function scoreLocalInterviewAnswer(answer, missingCount) {
  const lengthBonus = Math.min(20, Math.round(String(answer || "").trim().length / 18));
  return Math.round(clampNumber(48 + lengthBonus - missingCount * 12, 20, 92));
}

function getLocalInterviewEvaluation(answer, missing) {
  if (!missing.length && String(answer || "").trim().length > 60) {
    return interviewLanguage === "zh"
      ? "核心方向已覆盖，再把边界条件和最终结论压得更清楚。"
      : "The core direction is covered; make the edge cases and final conclusion sharper.";
  }

  return interviewLanguage === "zh"
    ? `优先补上${missing.join("、") || "更明确的中间推导"}。`
    : `Prioritize ${missing.join(", ") || "clearer intermediate reasoning"}.`;
}

function getInterviewReferenceSummary(problem) {
  const raw = [problem.answer, problem.explanation]
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
  if (!raw) {
    return interviewLanguage === "zh"
      ? "围绕题干建立变量、说明推导，再给出可验证结论。"
      : "Define the variables, explain the reasoning, then give a checkable conclusion.";
  }
  return raw.slice(0, interviewLanguage === "zh" ? 180 : 240);
}

function localInterviewHint(problem) {
  const category = normalizeCategory(problem.category);
  const hints = {
    leetcode: ["先说 brute force，再说如何优化。", "明确输入规模、时间复杂度和关键数据结构。"],
    pandasNumpy: ["先说明表结构和目标列。", "考虑 groupby、merge、pivot 或向量化。"],
    probabilityExpectation: ["先定义随机变量和样本空间。", "尝试条件期望或递推。"],
    statistics: ["先说假设、样本、估计量和评价指标。", "区分 correlation、causality 和 sampling bias。"],
    machineLearning: ["先定义 label、feature 和 validation。", "说明避免 leakage 和 overfitting 的方法。"],
    deepLearning: ["先说输入、输出、loss 和训练信号。", "如果有序列或注意力，明确 token/embedding 结构。"],
    market: ["从 fair value、spread、inventory risk 三个角度开始。", "把市场微观结构和风险约束讲清楚。"],
    option: ["先定位 payoff 和 Greeks。", "说明波动率、对冲频率和 tail risk。"],
    mentalMath: ["先做数量级估计。", "把复杂计算拆成百分比、平方或分数。"]
  };
  const pool = hints[category] || hints.probabilityExpectation;
  const translation = {
    "先说 brute force，再说如何优化。": "Start with brute force, then explain the optimization.",
    "明确输入规模、时间复杂度和关键数据结构。": "Clarify input size, time complexity, and the key data structure.",
    "先说明表结构和目标列。": "Start by describing the table schema and target columns.",
    "考虑 groupby、merge、pivot 或向量化。": "Consider groupby, merge, pivot, or vectorization.",
    "先定义随机变量和样本空间。": "Define the random variables and sample space first.",
    "尝试条件期望或递推。": "Try conditional expectation or recurrence.",
    "先说假设、样本、估计量和评价指标。": "State the hypothesis, sample, estimator, and evaluation metric.",
    "区分 correlation、causality 和 sampling bias。": "Separate correlation, causality, and sampling bias.",
    "先定义 label、feature 和 validation。": "Define labels, features, and validation.",
    "说明避免 leakage 和 overfitting 的方法。": "Explain how you avoid leakage and overfitting.",
    "先说输入、输出、loss 和训练信号。": "Start with input, output, loss, and training signal.",
    "如果有序列或注意力，明确 token/embedding 结构。": "For sequence or attention problems, clarify tokens and embeddings.",
    "从 fair value、spread、inventory risk 三个角度开始。": "Start from fair value, spread, and inventory risk.",
    "把市场微观结构和风险约束讲清楚。": "Make market microstructure and risk constraints explicit.",
    "先定位 payoff 和 Greeks。": "Identify payoff and Greeks first.",
    "说明波动率、对冲频率和 tail risk。": "Explain volatility, hedge frequency, and tail risk.",
    "先做数量级估计。": "Start with an order-of-magnitude estimate.",
    "把复杂计算拆成百分比、平方或分数。": "Break the calculation into percentages, squares, or fractions."
  };
  const hint = randomChoice(pool);
  return interviewLanguage === "zh" ? `Hint：${hint}` : `Hint: ${translation[hint] || hint}`;
}

function getCurrentQuestionMessages() {
  if (!interviewSession || interviewSession.currentIndex < 0) return [];
  const startId = interviewSession.currentQuestionMessageId;
  let startIndex = startId ? interviewMessages.findIndex((message) => message.id === startId) : -1;
  if (startIndex < 0) {
    const marker = `Q${interviewSession.currentIndex + 1}/`;
    startIndex = interviewMessages.findLastIndex((message) => message.role === "system" && String(message.text || "").startsWith(marker));
  }
  if (startIndex < 0) return [];

  const nextQuestionIndex = interviewMessages.findIndex((message, index) => (
    index > startIndex && message.role === "system" && /^Q\d+\//.test(String(message.text || ""))
  ));
  return interviewMessages
    .slice(startIndex, nextQuestionIndex < 0 ? undefined : nextQuestionIndex)
    .filter((message) => !message.thinking)
    .filter((message) => !/本题完成|Question complete|模拟面试结束|Mock interview complete/i.test(String(message.text || "")));
}

function getCurrentInterviewFavoriteSummary(messages, problem) {
  const title = interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh;
  const feedback = [...messages].reverse().find((message) => (
    message.role === "coach"
    && !/本题完成|Question complete|请开始作答|Start your answer|评测中|Evaluating|生成 hint|Generating hint/i.test(String(message.text || ""))
  ));
  const firstLine = String(feedback?.text || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .find(Boolean);
  const evaluation = parseInterviewFeedbackEvaluation(feedback?.text || "");
  return `${title || "Untitled"}：${evaluation || firstLine || "已完成一轮面试复盘。"}`.slice(0, 180);
}

function saveCurrentInterviewFavorite() {
  const problem = getSelectedProblem();
  const messages = getCurrentQuestionMessages();
  if (!problem || !messages.length) return;

  const favorite = {
    id: makeId(),
    problemId: problem.id || "",
    title: interviewLanguage === "zh" ? problem.titleZh || problem.titleEn : problem.titleEn || problem.titleZh,
    category: normalizeCategory(problem.category),
    difficulty: problem.difficulty || "",
    summary: getCurrentInterviewFavoriteSummary(messages, problem),
    conversation: formatCurrentQuestionConversation(messages),
    createdAt: new Date().toISOString()
  };

  updateProblemState(problem.id, (current) => ({
    ...current,
    favorite: true,
    lastFavoriteAt: favorite.createdAt,
    favorites: [...(current.favorites || []), favorite].slice(-80)
  }));
  saveState();
  renderInterviewFavorites();
  flashButtonLabel(els.saveInterviewFavoriteBtn, interviewLanguage === "zh" ? "已收藏" : "Saved", interviewLanguage === "zh" ? "总结到收藏夹" : "Save");
}

async function shareCurrentInterviewQuestion() {
  const messages = getCurrentQuestionMessages();
  if (!messages.length) return;
  await copyText(formatCurrentQuestionConversation(messages));
  flashButtonLabel(els.shareInterviewQuestionBtn, interviewLanguage === "zh" ? "已复制" : "Copied", interviewLanguage === "zh" ? "分享" : "Share");
}

function formatCurrentQuestionConversation(messages) {
  const roleLabels = {
    system: interviewLanguage === "zh" ? "题目" : "Prompt",
    user: interviewLanguage === "zh" ? "我" : "Me",
    coach: "Coach"
  };
  return messages.map((message) => {
    const label = roleLabels[message.role] || message.role;
    return `[${label}]\n${String(message.text || message.displayText || "").trim()}`;
  }).join("\n\n");
}

async function copyText(text) {
  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }
  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  textarea.remove();
}

function flashButtonLabel(button, temporaryText, defaultText) {
  if (!button) return;
  setButtonInlineLabel(button, temporaryText);
  window.setTimeout(() => setButtonInlineLabel(button, defaultText), 1500);
}

function setButtonInlineLabel(button, label) {
  const icon = button.querySelector("svg, i");
  button.textContent = "";
  if (icon) button.append(icon, document.createTextNode(` ${label}`));
  else button.textContent = label;
}

function recordInterviewPractice(problem, feedback = {}) {
  const category = normalizeCategory(problem.category);
  const xpGain = interviewSession?.type === "behavioral" ? 6 : 10;
  const practicedAt = new Date().toISOString();
  const entryId = makeId();
  const score = Number.isFinite(Number(feedback.score)) ? Math.round(clampNumber(Number(feedback.score), 0, 100)) : null;
  const evaluation = String(feedback.evaluation || "").trim();
  const currentIndex = interviewSession?.currentIndex ?? -1;
  state.skills[category] = Math.max(0, (state.skills[category] || 0) + xpGain);
  state.entries.push({
    id: entryId,
    date: practicedAt,
    text: [
      `模拟面试：${problem.titleZh || problem.titleEn}`,
      score == null ? "" : `得分 ${score}/100`
    ].filter(Boolean).join("，"),
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === category ? xpGain : 0])),
    totalXp: xpGain,
    duration: Math.round((interviewSession?.questionSeconds || 0) / 60),
    problemId: problem.id || "",
    interviewScore: score,
    interviewEvaluation: evaluation
  });
  updateProblemState(problem.id, (current) => ({
    ...current,
    interviewCount: Number(current.interviewCount || 0) + 1,
    lastPracticedAt: practicedAt,
    lastScore: score,
    lastScoreAt: practicedAt,
    lastEvaluation: evaluation,
    scoreHistory: score == null
      ? current.scoreHistory || []
      : [...(current.scoreHistory || []), {
        id: entryId,
        score,
        evaluation,
        scoredAt: practicedAt
      }].slice(-40)
  }));
  if (interviewSession && currentIndex >= 0) {
    interviewSession.questionResults = interviewSession.questionResults || [];
    interviewSession.questionResults = interviewSession.questionResults.map((item) => item ? { ...item, fresh: false } : item);
    interviewSession.questionResults[currentIndex] = {
      score,
      evaluation,
      scoredAt: practicedAt,
      fresh: score != null
    };
    interviewSession.latestScoredIndex = currentIndex;
  }
  saveState();
  renderSummary();
  renderSkills();
  renderHistory();
  renderProblems();
  renderInterviewQuestionPanel();
}

function goToNextInterviewQuestion() {
  if (!interviewSession || !interviewSession.awaitingNext) return;
  showInterviewQuestion(interviewSession.currentIndex + 1);
}

function completeInterview() {
  if (!interviewSession || interviewSession.completed) return;
  clearInterviewQuestionTimer();
  interviewSession.completed = true;
  interviewSession.awaitingNext = false;
  updateInterviewStatus("completed");
  appendInterviewMessage("coach", interviewLanguage === "zh"
    ? "模拟面试结束。建议复盘每题：题意、核心思路、遗漏点、60 秒答案。"
    : "Mock interview complete. Review each question: prompt, core idea, missing points, and 60-second answer.");
  renderInterviewQuestionPanel();
}

function clearInterviewTimers() {
  if (interviewPrepTimer) window.clearInterval(interviewPrepTimer);
  interviewPrepTimer = null;
  clearInterviewQuestionTimer();
  clearInterviewTypingTimers();
}

function clearInterviewQuestionTimer() {
  if (interviewQuestionTimer) window.clearInterval(interviewQuestionTimer);
  interviewQuestionTimer = null;
}

function clearInterviewTypingTimers() {
  for (const timer of interviewTypingTimers.values()) {
    window.clearInterval(timer);
  }
  interviewTypingTimers.clear();
}

function updateInterviewStatus(status = "") {
  updateInterviewLayout();
  if (!els.interviewSessionTitle || !els.interviewQuestionStatus || !els.interviewTimer) return;
  if (!interviewSession) {
    els.interviewSessionTitle.textContent = "Ready";
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "还没有开始。" : "Not started.";
    els.interviewTimer.textContent = "--:--";
    updateInterviewActionPanel();
    return;
  }

  const typeLabel = interviewTypeDefs[interviewSession.type]?.label || "Interview";
  els.interviewSessionTitle.textContent = typeLabel;
  if (status === "loading") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "正在准备题目..." : "Preparing questions...";
  } else if (status === "preparing") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "题目已准备。" : "Questions are ready.";
  } else if (status === "timeup") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "本题时间到。" : "Time is up.";
  } else if (status === "awaitingNext") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "可以进入下一题。" : "Ready for the next question.";
  } else if (status === "completed") {
    els.interviewQuestionStatus.textContent = interviewLanguage === "zh" ? "模拟面试已结束。" : "Mock interview complete.";
    els.interviewTimer.textContent = "Done";
  } else {
    els.interviewQuestionStatus.textContent = interviewSession.currentIndex >= 0
      ? `Q${interviewSession.currentIndex + 1}/${interviewSession.questions.length}`
      : interviewLanguage === "zh" ? "准备开始。" : "Ready to start.";
  }
  updateInterviewActionPanel();
}

function setInterviewTimer(seconds) {
  if (!els.interviewTimer) return;
  const safeSeconds = Math.max(0, Number(seconds || 0));
  const minutes = Math.floor(safeSeconds / 60);
  const rest = safeSeconds % 60;
  els.interviewTimer.textContent = `${String(minutes).padStart(2, "0")}:${String(rest).padStart(2, "0")}`;
}

function setButtonBusy(button, busy, label = "") {
  if (!button) return;
  button.disabled = busy;
  if (busy) {
    button.dataset.originalText = button.textContent.trim();
    setButtonLabel(`#${button.id}`, label);
  } else if (button.dataset.originalText) {
    setButtonLabel(`#${button.id}`, button.dataset.originalText);
    delete button.dataset.originalText;
  }
}

function toggleVoiceAnswer() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    appendInterviewMessage("system", interviewLanguage === "zh"
      ? "当前浏览器不支持语音识别，请使用文字作答。"
      : "Speech recognition is not supported in this browser. Use text answer instead.");
    return;
  }

  if (interviewVoiceRecognition) {
    interviewVoiceRecognition.stop();
    interviewVoiceRecognition = null;
    els.voiceAnswerBtn?.classList.remove("active-like");
    return;
  }

  const recognition = new SpeechRecognition();
  recognition.lang = interviewLanguage === "zh" ? "zh-CN" : "en-US";
  recognition.continuous = true;
  recognition.interimResults = true;
  recognition.addEventListener("result", (event) => {
    const transcript = [...event.results]
      .map((result) => result[0]?.transcript || "")
      .join(" ")
      .trim();
    if (transcript) {
      els.interviewAnswer.value = transcript;
      autoSizeInterviewAnswer();
    }
  });
  recognition.addEventListener("end", () => {
    interviewVoiceRecognition = null;
    els.voiceAnswerBtn?.classList.remove("active-like");
  });
  interviewVoiceRecognition = recognition;
  els.voiceAnswerBtn?.classList.add("active-like");
  recognition.start();
}

function revealInterviewAnswer() {
  const problem = getSelectedProblem();
  if (!problem) return;
  appendInterviewMessage("system", [
    interviewLanguage === "zh" ? "### 参考答案" : "### Reference answer",
    problem.answer || (interviewLanguage === "zh" ? "未填写" : "Not provided"),
    "",
    interviewLanguage === "zh" ? "### 解析" : "### Explanation",
    problem.explanation || (interviewLanguage === "zh" ? "未填写" : "Not provided"),
    getProblemMediaMarkdown(problem, "answer")
  ].filter(Boolean).join("\n"));
}

function startPkMatch() {
  const problem = randomChoice(state.problems);
  if (!problem) {
    els.pkProblem.textContent = "题库为空，先添加题目。";
    return;
  }
  const opponents = ["AlphaQuant", "Jane Street Trainee", "Vol Arb Intern", "Data Quant", "Options Challenger"];
  const opponent = randomChoice(opponents);
  pkSession = {
    id: makeId(),
    problem,
    opponent,
    opponentScore: randomInt(58, 92),
    userScore: 0,
    startedAt: Date.now(),
    finished: false
  };
  els.pkOpponentName.textContent = opponent;
  els.pkUserScore.textContent = "0";
  els.pkOpponentScore.textContent = "?";
  els.pkAnswer.value = "";
  els.pkProblem.textContent = formatPkProblem(problem);
  renderPkFeed([
    `已匹配 ${opponent}`,
    `题目来自：${formatCategoryLabel(problem.category)} · ${problem.difficulty}`
  ]);
  els.pkAnswer.focus();
}

function formatPkProblem(problem) {
  return [
    `${problem.titleZh || problem.titleEn}`,
    "",
    problem.promptZh || problem.promptEn || "无题干"
  ].join("\n");
}

function submitPkAnswer() {
  if (!pkSession) {
    startPkMatch();
    return;
  }
  if (pkSession.finished) return;
  const answer = els.pkAnswer.value.trim();
  if (!answer) return;

  const elapsed = Math.round((Date.now() - pkSession.startedAt) / 1000);
  const userScore = scorePkAnswer(pkSession.problem, answer, elapsed);
  pkSession.userScore = userScore;
  pkSession.finished = true;
  els.pkUserScore.textContent = String(userScore);
  els.pkOpponentScore.textContent = String(pkSession.opponentScore);

  const won = userScore >= pkSession.opponentScore;
  const category = normalizeCategory(pkSession.problem.category);
  const xpGain = won ? 18 : 10;
  state.skills[category] = Math.max(0, (state.skills[category] || 0) + xpGain);
  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text: `PK：${pkSession.problem.titleZh || pkSession.problem.titleEn}，对手 ${pkSession.opponent}，比分 ${userScore}-${pkSession.opponentScore}`,
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === category ? xpGain : 0])),
    totalXp: xpGain,
    duration: 0
  });
  saveState();

  renderPkFeed([
    won ? "你赢了这一局。" : "这局对手领先。",
    `你的得分：${userScore}`,
    `${pkSession.opponent}：${pkSession.opponentScore}`,
    `获得 ${skillDefs[category].name} +${xpGain} XP`
  ]);
  renderAll();
}

function scorePkAnswer(problem, answer, elapsed) {
  const source = `${problem.answer || ""} ${problem.explanation || ""} ${problem.promptEn || ""} ${problem.promptZh || ""}`;
  const keywords = extractKeywords(source);
  const lower = answer.toLowerCase();
  const hits = keywords.filter((keyword) => lower.includes(keyword.toLowerCase())).length;
  const coverage = keywords.length ? hits / keywords.length : 0.35;
  const lengthScore = Math.min(1, answer.length / 280);
  const timeBonus = elapsed <= 180 ? 8 : elapsed <= 300 ? 4 : 0;
  return Math.round(Math.min(100, 35 + coverage * 42 + lengthScore * 15 + timeBonus));
}

function extractKeywords(text) {
  const words = String(text || "")
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, " ")
    .split(/\s+/)
    .filter((word) => word.length >= 3)
    .filter((word) => !["the", "and", "for", "with", "that", "this", "from", "return", "given", "what", "your"].includes(word));
  return [...new Set(words)].slice(0, 18);
}

function revealPkAnswer() {
  if (!pkSession) return;
  renderPkFeed([
    "参考答案",
    pkSession.problem.answer || "未填写",
    pkSession.problem.explanation || "未填写"
  ]);
}

function renderPkFeed(items) {
  els.pkFeed.innerHTML = "";
  items.forEach((text) => {
    const item = document.createElement("div");
    item.className = "pk-feed-item";
    item.textContent = text;
    els.pkFeed.appendChild(item);
  });
}

function appendInterviewMessage(role, text, options = {}) {
  const id = makeId();
  const attachments = Array.isArray(options.attachments) ? options.attachments : [];
  if (options.thinking) {
    interviewMessages.push({ id, role, text: "", displayText: "", typing: false, thinking: true, attachments });
    renderInterviewTranscript();
    return id;
  }
  const typewriter = options.typewriter ?? role === "coach";
  interviewMessages.push(typewriter
    ? { id, role, text: String(text || ""), displayText: "", typing: true, attachments }
    : { id, role, text: String(text || ""), displayText: String(text || ""), typing: false, attachments });
  renderInterviewTranscript();
  if (typewriter) startInterviewTyping(id, text);
  return id;
}

function updateInterviewMessage(id, text, options = {}) {
  stopInterviewTyping(id);
  if (options.typewriter) {
    startInterviewTyping(id, text);
    return;
  }
  interviewMessages = interviewMessages.map((message) => (
    message.id === id ? { ...message, text, displayText: text, typing: false, thinking: false, attachments: options.attachments || message.attachments || [] } : message
  ));
  renderInterviewTranscript();
}

function startInterviewTyping(id, text) {
  const fullText = String(text || "");
  let index = 0;
  const step = Math.max(1, Math.ceil(fullText.length / 160));

  interviewMessages = interviewMessages.map((message) => (
    message.id === id ? { ...message, text: fullText, displayText: "", typing: true, thinking: false } : message
  ));
  renderInterviewTranscript();

  const timer = window.setInterval(() => {
    index = Math.min(fullText.length, index + step);
    const displayText = fullText.slice(0, index);
    const done = index >= fullText.length;

    interviewMessages = interviewMessages.map((message) => (
      message.id === id ? { ...message, displayText, typing: !done } : message
    ));
    renderInterviewTranscript();

    if (done) stopInterviewTyping(id);
  }, 24);
  interviewTypingTimers.set(id, timer);
}

function stopInterviewTyping(id) {
  const timer = interviewTypingTimers.get(id);
  if (!timer) return;
  window.clearInterval(timer);
  interviewTypingTimers.delete(id);
}

async function addEntry() {
  const text = els.logText.value.trim();
  if (!text) {
    els.analysisPreview.textContent = "先写一点内容。";
    els.logText.focus();
    return;
  }

  els.analysisPreview.textContent = "AI 分类中...";
  const result = await classifyEntry(text);
  const difficulty = Number(els.difficultyInput.value || 1);
  const gains = Object.fromEntries(
    Object.entries(result.gains).map(([key, value]) => [key, Math.round(value * difficulty)])
  );
  const totalXp = Object.values(gains).reduce((sum, value) => sum + value, 0);

  Object.entries(gains).forEach(([key, value]) => {
    if (!skillDefs[key]) return;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) + value);
  });

  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text,
    gains,
    totalXp,
    duration: Number(els.durationInput.value || 0)
  });

  saveState();
  latestClassification = null;
  els.logText.value = "";
  els.durationInput.value = "";
  renderAll();
}

async function classifyEntry(text) {
  const local = analyzeEntry(text);
  try {
    const remote = await requestLogClassification(text, local);
    return normalizeClassification(remote, local);
  } catch {
    return local;
  }
}

async function requestLogClassification(text, localResult) {
  const endpoint = getClassifyEndpoint();
  if (!endpoint) throw new Error("Missing classify endpoint");
  const response = await fetch(endpoint, {
    method: "POST",
    headers: getLlmRequestHeaders(),
    body: JSON.stringify({
      model: normalizeLlmModel(llmConfig.model),
      text,
      duration: Number(els.durationInput?.value || 0),
      difficulty: Number(els.difficultyInput?.value || 1),
      skills: Object.fromEntries(Object.entries(skillDefs).map(([key, def]) => [key, def.name])),
      localGains: localResult.gains
    })
  });
  if (!response.ok) throw new Error(`Classify endpoint ${response.status}`);
  return response.json();
}

function getClassifyEndpoint() {
  const endpoint = (llmConfig.endpoint || "").trim();
  if (!endpoint) return "";
  try {
    const url = new URL(endpoint);
    url.pathname = url.pathname.replace(/\/interview\/?$/, "/classify-log");
    if (!url.pathname.endsWith("/classify-log")) url.pathname = "/classify-log";
    return url.toString();
  } catch {
    return "";
  }
}

function normalizeClassification(remote, fallback) {
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));
  const source = remote?.gains || remote?.classification || {};
  Object.entries(source).forEach(([key, value]) => {
    const normalized = normalizeCategory(key);
    if (!skillDefs[normalized]) return;
    gains[normalized] += clampNumber(value, 0, 120);
  });
  if (Object.values(gains).every((value) => value === 0)) return fallback;
  return { gains, hits: {}, summary: remote?.summary || "LLM" };
}

function analyzeEntry(text) {
  const lower = text.toLowerCase();
  const gains = Object.fromEntries(Object.keys(skillDefs).map((key) => [key, 0]));
  const hits = {};

  Object.entries(skillDefs).forEach(([key, def]) => {
    const matched = def.keywords.filter((word) => lower.includes(word.toLowerCase()));
    hits[key] = matched;
    if (matched.length) gains[key] += 12 + matched.length * 5;
  });

  const duration = Number(els.durationInput?.value || 0);
  if (duration > 0) {
    const active = Object.keys(gains).filter((key) => gains[key] > 0);
    const targets = active.length ? active : [getLowestSkillKey()];
    const durationXp = Math.min(60, Math.round(duration * 0.9));
    targets.forEach((key) => {
      gains[key] += Math.ceil(durationXp / targets.length);
    });
  }

  const problemCount = extractProblemCount(lower);
  if (problemCount > 0) {
    if (hits.leetcode.length) gains.leetcode += problemCount * 12;
    if (hits.probabilityExpectation.length) gains.probabilityExpectation += problemCount * 12;
    if (hits.statistics.length) gains.statistics += problemCount * 10;
    if (hits.machineLearning.length) gains.machineLearning += problemCount * 10;
    if (hits.deepLearning.length) gains.deepLearning += problemCount * 10;
    if (hits.option.length) gains.option += problemCount * 10;
  }

  if (Object.values(gains).every((value) => value === 0)) {
    gains[getLowestSkillKey()] = 12;
  }

  return { gains, hits };
}

function updatePreview() {
  if (!els.logText) return;
  const text = els.logText.value.trim();
  if (!text) {
    els.analysisPreview.textContent = "";
    return;
  }
  const result = latestClassification?.text === text ? latestClassification.result : analyzeEntry(text);
  const difficulty = Number(els.difficultyInput.value || 1);
  const parts = Object.entries(result.gains)
    .filter(([, value]) => value > 0)
    .map(([key, value]) => `${skillDefs[key].name} +${Math.round(value * difficulty)}`);
  els.analysisPreview.textContent = parts.length ? `自动分类：${parts.join(" | ")}` : "自动分类中";
  renderAutoClassifyChips(result.gains, difficulty);
}

function scheduleClassificationPreview() {
  latestClassification = null;
  updatePreview();
  window.clearTimeout(classifyTimer);
  const text = els.logText.value.trim();
  if (!text) return;
  classifyTimer = window.setTimeout(async () => {
    try {
      const result = await classifyEntry(text);
      latestClassification = { text, result };
      updatePreview();
    } catch {
      updatePreview();
    }
  }, 700);
}

function renderAutoClassifyChips(gains = {}, difficulty = 1) {
  if (!els.autoClassifyChips) return;
  els.autoClassifyChips.innerHTML = "";
  Object.entries(skillDefs).forEach(([key, def]) => {
    const value = Math.round((gains[key] || 0) * difficulty);
    const chip = document.createElement("span");
    chip.className = `auto-chip${value > 0 ? " active" : ""}`;
    chip.textContent = value > 0 ? `${def.name} +${value}` : def.name;
    els.autoClassifyChips.appendChild(chip);
  });
}

function getLowestSkillKey() {
  return Object.keys(skillDefs).sort((a, b) => (state.skills[a] || 0) - (state.skills[b] || 0))[0] || "leetcode";
}

function extractProblemCount(text) {
  const matches = [...text.matchAll(/(\d+)\s*(道|题|problems?|questions?)/gi)];
  if (!matches.length) return 0;
  return matches.reduce((sum, match) => sum + Number(match[1]), 0);
}

function addResource() {
  const title = els.resourceTitle.value.trim();
  const content = els.resourceContent.value.trim();
  if (!title || !content) return;
  const sources = parseResourceSources(els.resourceSources?.value || content);

  state.resources.push({
    id: makeId(),
    title,
    type: els.resourceType.value,
    content,
    sources,
    dataUrl: els.resourceForm.dataset.previewData || "",
    date: new Date().toISOString()
  });

  saveState();
  els.resourceForm.reset();
  delete els.resourceForm.dataset.previewData;
  els.resourceForm.classList.add("hidden");
  renderResources();
  refreshIcons();
}

function handleResourceFile(event) {
  const file = event.target.files?.[0];
  if (!file) return;

  if (!els.resourceTitle.value.trim()) els.resourceTitle.value = file.name;
  delete els.resourceForm.dataset.previewData;

  if (file.type.startsWith("image/")) {
    els.resourceType.value = "image";
    if (file.size > 1_500_000) {
      els.resourceContent.value = `${file.name} (${Math.round(file.size / 1024)} KB)`;
      return;
    }
    const reader = new FileReader();
    reader.addEventListener("load", () => {
      els.resourceForm.dataset.previewData = String(reader.result);
      els.resourceContent.value = file.name;
    });
    reader.readAsDataURL(file);
    return;
  }

  const reader = new FileReader();
  reader.addEventListener("load", () => {
    els.resourceType.value = file.name.toLowerCase().endsWith(".tex") ? "tex" : "note";
    els.resourceContent.value = String(reader.result);
  });
  reader.readAsText(file);
}

function undoLatestEntry() {
  const entry = state.entries.pop();
  if (!entry) return;
  Object.entries(entry.gains).forEach(([key, value]) => {
    if (!skillDefs[key]) return;
    state.skills[key] = Math.max(0, (state.skills[key] || 0) - value);
  });
  saveState();
  renderAll();
}

function resetState() {
  const ok = window.confirm("清空当前账户的训练记录？已连接云端时也会同步为空。");
  if (!ok) return;
  if (currentUser) localStorage.removeItem(userStateKey(currentUser.id));
  state = loadState();
  saveState();
  renderAll();
}

function exportState() {
  const payload = {
    version: 2,
    exportedAt: new Date().toISOString(),
    user: currentUser ? { name: currentUser.name, email: currentUser.email, provider: currentUser.provider } : null,
    state: localStatePayload(state)
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `quantgym-${currentUser?.name || "backup"}-${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  URL.revokeObjectURL(url);
}

function importState(event) {
  const file = event.target.files?.[0];
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener("load", () => {
    try {
      const parsed = JSON.parse(String(reader.result));
      const importedState = parsed.state || parsed;
      const next = {
        skills: { ...state.skills, ...(importedState.skills || {}) },
        entries: Array.isArray(importedState.entries) ? importedState.entries : [],
        resources: Array.isArray(importedState.resources) ? importedState.resources : [],
        network: Array.isArray(importedState.network) ? importedState.network : [],
        interviewFavorites: Array.isArray(importedState.interviewFavorites) ? importedState.interviewFavorites : [],
        mentalMathRecords: normalizeMentalMathRecords(importedState.mentalMathRecords),
        gameRecords: normalizeGameRecords(importedState.gameRecords),
        problemStates: mergeProblemStates(
          state.problemStates || [],
          Array.isArray(importedState.problemStates) ? importedState.problemStates : [],
          problemStatesFromFavorites(Array.isArray(importedState.interviewFavorites) ? importedState.interviewFavorites : [])
        ),
        leaderboard: importedState.leaderboard || state.leaderboard || defaultLeaderboardSettings(),
        problems: mergeProblems(state.problems, Array.isArray(importedState.problems) ? importedState.problems : []),
        news: mergeNews(state.news || [], Array.isArray(importedState.news) ? importedState.news : []),
        newsFetchedAt: importedState.newsFetchedAt || state.newsFetchedAt || "",
        newsFetchAttemptAt: importedState.newsFetchAttemptAt || state.newsFetchAttemptAt || "",
        newsSyncError: importedState.newsSyncError || "",
        createdAt: importedState.createdAt || state.createdAt || new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      state = normalizeState(next);
      saveState();
      renderAll();
    } catch {
      window.alert("备份文件无法读取。");
    } finally {
      event.target.value = "";
    }
  });
  reader.readAsText(file);
}

function getDrillModeLabel(mode = drillMode) {
  const labels = {
    numberLogic: "Number Logic",
    arithmetic: "Arithmetic",
    percent: getLanguage() === "en" ? "Percent" : "百分比",
    square: getLanguage() === "en" ? "Squares" : "平方",
    ev: "EV"
  };
  return labels[mode] || labels.numberLogic;
}

function createDrillSession(running = false) {
  const total = Math.max(1, Number(els.drillCountSelect?.value || 20));
  const durationSeconds = Math.max(60, Number(els.drillTimeSelect?.value || 1500));
  return {
    id: makeId(),
    mode: drillMode,
    total,
    index: 0,
    score: 0,
    correct: 0,
    incorrect: 0,
    skipped: 0,
    durationSeconds,
    remainingSeconds: durationSeconds,
    running,
    answered: false,
    completed: false,
    startedAt: Date.now()
  };
}

function ensureDrillSession() {
  if (drillSession && currentDrill) return;
  drillSession = createDrillSession(false);
  currentDrill = makeDrill(drillSession.mode);
}

function startDrillSession() {
  stopDrillTimer();
  drillSession = createDrillSession(true);
  currentDrill = makeDrill(drillSession.mode);
  startDrillTimer();
  renderMentalMath();
}

function startDrillTimer() {
  stopDrillTimer();
  drillTimerId = window.setInterval(() => {
    if (!drillSession?.running) return;
    drillSession.remainingSeconds = Math.max(0, drillSession.remainingSeconds - 1);
    renderDrillStatus();
    if (drillSession.remainingSeconds <= 0) finishDrillSession("time");
  }, 1000);
}

function stopDrillTimer() {
  if (drillTimerId) window.clearInterval(drillTimerId);
  drillTimerId = null;
}

function renderMentalMath() {
  if (!els.drillQuestion) return;
  ensureDrillSession();
  document.querySelectorAll("[data-drill]").forEach((button) => {
    button.classList.toggle("active", button.dataset.drill === drillMode);
  });
  renderDrillStatus();
  renderDrillQuestion();
  renderMentalRecords();
  renderMentalLeaderboard();
  if (!currentMarketGame) currentMarketGame = makeMarketGameRound();
  if (!currentPokerGame) currentPokerGame = makePokerGameRound();
  renderMarketGame();
  renderPokerGame();
  refreshIcons();
}

function renderDrillStatus() {
  if (!drillSession) return;
  const answered = drillSession.correct + drillSession.incorrect;
  const accuracy = answered ? Math.round((drillSession.correct / answered) * 100) : 0;
  const timeText = formatDuration(drillSession.remainingSeconds);
  if (els.drillScore) els.drillScore.textContent = String(drillSession.score);
  if (els.drillAccuracy) els.drillAccuracy.textContent = `${accuracy}%`;
  if (els.drillTimer) els.drillTimer.textContent = timeText;
  if (els.drillProgressText) els.drillProgressText.textContent = `${drillSession.completed ? "Finished" : "Question"} ${Math.min(drillSession.index + 1, drillSession.total)}/${drillSession.total}`;
  if (els.drillTimeLeftText) els.drillTimeLeftText.textContent = `Time left: ${timeText}`;
  if (els.drillProgressFill) {
    const percent = Math.round((Math.min(drillSession.index, drillSession.total) / Math.max(drillSession.total, 1)) * 100);
    els.drillProgressFill.style.width = `${percent}%`;
  }
}

function renderDrillQuestion() {
  if (!currentDrill || !els.drillQuestion || !els.drillOptions) return;
  els.drillQuestion.textContent = currentDrill.question;
  els.drillOptions.innerHTML = "";
  currentDrill.options.forEach((option) => {
    const button = document.createElement("button");
    const selected = currentDrill.selected != null && Number(option) === Number(currentDrill.selected);
    const correct = Math.abs(Number(option) - Number(currentDrill.answer)) <= currentDrill.tolerance;
    button.type = "button";
    button.className = [
      "drill-option",
      currentDrill.answered && correct ? "correct" : "",
      currentDrill.answered && selected && !correct ? "incorrect" : ""
    ].filter(Boolean).join(" ");
    button.dataset.drillOption = String(option);
    button.disabled = Boolean(!drillSession?.running || currentDrill.answered || drillSession?.completed);
    button.textContent = formatNumber(option);
    els.drillOptions.appendChild(button);
  });
  if (els.drillFeedback) {
    els.drillFeedback.textContent = currentDrill.feedback || (drillSession?.running
      ? (getLanguage() === "en" ? "Choose one answer or skip if unsure." : "选择一个答案；不确定就跳过。")
      : (getLanguage() === "en" ? "Press Start to begin a timed set." : "点击开始进入限时训练。"));
  }
}

function checkDrill(rawAnswer) {
  if (!currentDrill || !drillSession?.running || drillSession.completed || currentDrill.answered) return;
  const answer = Number(rawAnswer);
  if (!Number.isFinite(answer)) return;
  const correct = Math.abs(answer - currentDrill.answer) <= currentDrill.tolerance;
  currentDrill.answered = true;
  currentDrill.selected = answer;
  currentDrill.feedback = correct
    ? `Correct. ${currentDrill.explain}`
    : `Answer: ${formatNumber(currentDrill.answer)}. ${currentDrill.explain}`;
  drillSession.answered = true;
  if (correct) {
    drillSession.correct += 1;
    drillSession.score += 1;
  } else {
    drillSession.incorrect += 1;
    drillSession.score -= 1;
  }
  renderMentalMath();
  if (drillSession.running) window.setTimeout(() => advanceDrillQuestion({ countSkip: false }), 520);
}

function skipDrill() {
  if (!currentDrill || !drillSession?.running || drillSession.completed) return;
  if (currentDrill.answered) {
    advanceDrillQuestion({ countSkip: false });
    return;
  }
  currentDrill.answered = true;
  currentDrill.skipped = true;
  currentDrill.feedback = `Skipped. Answer: ${formatNumber(currentDrill.answer)}. ${currentDrill.explain}`;
  drillSession.skipped += 1;
  drillSession.answered = true;
  renderMentalMath();
  if (drillSession.running) window.setTimeout(() => advanceDrillQuestion({ countSkip: false }), 420);
}

function advanceDrillQuestion(options = {}) {
  if (!drillSession || drillSession.completed) return;
  if (!drillSession.running) return;
  if (!currentDrill?.answered && options.countSkip !== false) {
    drillSession.skipped += 1;
  }
  if (drillSession.index + 1 >= drillSession.total) {
    finishDrillSession("complete");
    return;
  }
  drillSession.index += 1;
  drillSession.answered = false;
  currentDrill = makeDrill(drillSession.mode);
  renderMentalMath();
}

function finishDrillSession(reason = "complete") {
  if (!drillSession || drillSession.completed) return;
  stopDrillTimer();
  drillSession.completed = true;
  drillSession.running = false;
  const answered = drillSession.correct + drillSession.incorrect;
  const accuracy = answered ? Math.round((drillSession.correct / answered) * 100) : 0;
  const usedSeconds = Math.max(0, drillSession.durationSeconds - drillSession.remainingSeconds);
  const record = normalizeMentalMathRecords([{
    id: drillSession.id,
    mode: drillSession.mode,
    label: getDrillModeLabel(drillSession.mode),
    score: drillSession.score,
    correct: drillSession.correct,
    incorrect: drillSession.incorrect,
    skipped: drillSession.skipped,
    total: drillSession.total,
    accuracy,
    durationSeconds: usedSeconds,
    createdAt: new Date().toISOString()
  }])[0];
  if (record && !state.mentalMathRecords.some((item) => item.id === record.id)) {
    state.mentalMathRecords = normalizeMentalMathRecords([...(state.mentalMathRecords || []), record]);
    const xpGain = Math.max(4, record.correct * 3 + Math.max(0, record.score));
    state.skills.mentalMath = Math.max(0, (state.skills.mentalMath || 0) + xpGain);
    state.entries.push({
      id: makeId(),
      date: new Date().toISOString(),
      text: `Mental Math ${record.label}: ${record.score} (${record.correct}/${record.total}, ${reason})`,
      gains: { leetcode: 0, pandasNumpy: 0, probabilityExpectation: 0, statistics: 0, machineLearning: 0, deepLearning: 0, market: 0, option: 0, mentalMath: xpGain },
      totalXp: xpGain,
      duration: Math.round(usedSeconds / 60)
    });
    saveState();
    renderSummary();
    renderSkills();
    renderHistory();
  }
  if (currentDrill) currentDrill.feedback = `Session complete. Score ${drillSession.score}, accuracy ${accuracy}%.`;
  renderMentalMath();
}

function makeDrill(mode) {
  if (mode === "numberLogic") return makeNumberLogicDrill();
  if (mode === "arithmetic") return makeArithmeticDrill();
  if (mode === "square") {
    const n = randomInt(12, 45);
    const answer = n * n;
    return makeChoiceDrill(`${n}² = ?`, answer, `${n}² = ${answer}`, { spread: Math.max(8, n), integer: true });
  }
  if (mode === "ev") {
    const p = randomChoice([0.1, 0.2, 0.25, 0.3, 0.4, 0.5, 0.6, 0.75]);
    const win = randomInt(20, 90);
    const lose = randomInt(5, 35);
    const answer = p * win - (1 - p) * lose;
    return makeChoiceDrill(`${Math.round(p * 100)}% win ${win}, otherwise lose ${lose}. EV = ?`, answer, `${p} x ${win} - ${formatNumber(1 - p)} x ${lose}`, { spread: 8, tolerance: 0.15 });
  }
  const base = randomInt(40, 240);
  const pct = randomChoice([5, 8, 10, 12, 15, 18, 20, 25, 30, 35]);
  const direction = Math.random() > 0.5 ? "increase" : "decrease";
  const answer = direction === "increase" ? base * (1 + pct / 100) : base * (1 - pct / 100);
  const word = direction === "increase" ? "up" : "down";
  return makeChoiceDrill(`${base} ${word} ${pct}% = ?`, answer, `${base} x ${formatNumber(direction === "increase" ? 1 + pct / 100 : 1 - pct / 100)}`, { spread: Math.max(5, base * 0.08), tolerance: 0.1 });
}

function makeNumberLogicDrill() {
  const type = randomChoice(["arithmetic", "geometric", "alternating", "fibonacci"]);
  let sequence = [];
  let answer = 0;
  let explain = "";
  if (type === "geometric") {
    const start = randomChoice([1, 2, 3, 4, 5]);
    const ratio = randomChoice([2, 3, 4]);
    sequence = Array.from({ length: 5 }, (_, index) => start * ratio ** index);
    answer = start * ratio ** 5;
    explain = `Multiply by ${ratio}.`;
  } else if (type === "alternating") {
    const start = randomInt(8, 24);
    const up = randomInt(4, 12);
    const down = randomInt(1, 5);
    sequence = [start];
    for (let index = 1; index < 6; index += 1) {
      sequence.push(sequence[index - 1] + (index % 2 ? up : -down));
    }
    answer = sequence.pop();
    explain = `Alternate +${up}, -${down}.`;
  } else if (type === "fibonacci") {
    const a = randomInt(1, 6);
    const b = randomInt(2, 9);
    sequence = [a, b];
    while (sequence.length < 6) sequence.push(sequence.at(-1) + sequence.at(-2));
    answer = sequence.pop();
    explain = "Each value is the sum of the previous two.";
  } else {
    const start = randomInt(2, 28);
    const step = randomInt(2, 13);
    sequence = Array.from({ length: 5 }, (_, index) => start + step * index);
    answer = start + step * 5;
    explain = `Add ${step} each step.`;
  }
  return makeChoiceDrill(`${sequence.join("   ")}   ?`, answer, explain, { spread: Math.max(6, Math.abs(answer) * 0.2), integer: true });
}

function makeArithmeticDrill() {
  const type = randomChoice(["multiply", "divide", "add", "fraction"]);
  if (type === "divide") {
    const divisor = randomInt(3, 12);
    const answer = randomInt(8, 36);
    const dividend = divisor * answer;
    return makeChoiceDrill(`${dividend} ÷ ${divisor} = ?`, answer, `${divisor} x ${answer} = ${dividend}`, { spread: 8, integer: true });
  }
  if (type === "fraction") {
    const denominator = randomChoice([4, 5, 8, 10, 12, 16]);
    const numerator = randomInt(1, denominator - 1);
    const base = randomChoice([80, 96, 120, 160, 200, 240]);
    const answer = (base * numerator) / denominator;
    return makeChoiceDrill(`${numerator}/${denominator} of ${base} = ?`, answer, `${base} ÷ ${denominator} x ${numerator}`, { spread: 10, tolerance: 0.1 });
  }
  if (type === "add") {
    const a = randomInt(120, 980);
    const b = randomInt(80, 760);
    const sign = Math.random() > 0.45 ? "+" : "-";
    const answer = sign === "+" ? a + b : a - b;
    return makeChoiceDrill(`${a} ${sign} ${b} = ?`, answer, `${a} ${sign} ${b}`, { spread: 30, integer: true });
  }
  const a = randomInt(11, 29);
  const b = randomInt(6, 24);
  const answer = a * b;
  return makeChoiceDrill(`${a} × ${b} = ?`, answer, `${a} x ${b} = ${answer}`, { spread: 18, integer: true });
}

function makeChoiceDrill(question, answer, explain, options = {}) {
  const tolerance = options.tolerance ?? 0;
  return {
    question,
    answer,
    tolerance,
    explain,
    options: makeAnswerOptions(answer, options),
    answered: false,
    selected: null,
    feedback: ""
  };
}

function makeAnswerOptions(answer, options = {}) {
  const integer = options.integer !== false && Math.abs(answer - Math.round(answer)) < 0.001;
  const spread = Math.max(1, Number(options.spread || Math.abs(answer) * 0.12 || 6));
  const normalize = (value) => integer ? Math.round(value) : Number(value.toFixed(1));
  const values = new Set([String(normalize(answer))]);
  const offsets = [-2, -1, 1, 2, 3, -3, 4, -4];
  offsets.forEach((offset) => {
    if (values.size >= 5) return;
    values.add(String(normalize(answer + offset * spread * randomChoice([0.45, 0.7, 1, 1.35]))));
  });
  while (values.size < 5) {
    values.add(String(normalize(answer + randomInt(-5, 5) * spread || answer + values.size + 1)));
  }
  return [...values].map(Number).sort(() => Math.random() - 0.5).slice(0, 5);
}

function formatDuration(seconds) {
  const safe = Math.max(0, Math.floor(Number(seconds || 0)));
  const minutes = Math.floor(safe / 60);
  const rest = String(safe % 60).padStart(2, "0");
  return `${minutes}:${rest}`;
}

function renderMentalRecords() {
  const records = normalizeMentalMathRecords(state.mentalMathRecords);
  if (els.mentalBestScore) {
    const best = records.length ? Math.max(...records.map((record) => record.score)) : 0;
    els.mentalBestScore.textContent = `Best ${best}`;
  }
  renderSparkline(els.mentalSparkline, records.map((record) => record.score));
  if (!els.mentalRecordList) return;
  els.mentalRecordList.innerHTML = "";
  if (!records.length) {
    els.mentalRecordList.appendChild(emptyBlock(getLanguage() === "en" ? "No sessions yet." : "还没有训练记录。"));
    return;
  }
  records.slice(-5).reverse().forEach((record) => {
    const row = document.createElement("div");
    row.className = "mental-record-row";
    row.innerHTML = `
      <div>
        <strong>${escapeHtml(record.label || getDrillModeLabel(record.mode))}</strong>
        <small>${escapeHtml(formatDate(record.createdAt))} · ${escapeHtml(formatDuration(record.durationSeconds))}</small>
      </div>
      <span>${escapeHtml(String(record.score))}</span>
      <small>${escapeHtml(String(record.correct))}/${escapeHtml(String(record.total))} · ${escapeHtml(String(record.accuracy))}%</small>
    `;
    els.mentalRecordList.appendChild(row);
  });
}

function renderSparkline(svg, values = []) {
  if (!svg) return;
  svg.innerHTML = "";
  const series = values.slice(-18);
  if (series.length < 2) {
    svg.innerHTML = '<text x="16" y="42">No trend yet</text>';
    return;
  }
  const min = Math.min(...series);
  const max = Math.max(...series);
  const range = Math.max(1, max - min);
  const points = series.map((value, index) => {
    const x = 10 + (index / Math.max(series.length - 1, 1)) * 240;
    const y = 58 - ((value - min) / range) * 44;
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  }).join(" ");
  svg.innerHTML = `
    <polyline class="sparkline-area" points="10,62 ${points} 250,62"></polyline>
    <polyline class="sparkline-line" points="${points}"></polyline>
    ${series.map((value, index) => {
      const [x, y] = points.split(" ")[index].split(",");
      return `<circle cx="${x}" cy="${y}" r="2.8"><title>${escapeHtml(String(value))}</title></circle>`;
    }).join("")}
  `;
}

function renderMentalLeaderboard() {
  if (!els.mentalLeaderboardList) return;
  const records = normalizeMentalMathRecords(state.mentalMathRecords);
  const best = records.length ? Math.max(...records.map((record) => record.score)) : 0;
  const rows = [
    { name: currentUser?.name || "You", score: best, self: true },
    { name: "Ari Chen", score: 22 },
    { name: "Mina Patel", score: 18 },
    { name: "Leo Wang", score: 15 },
    { name: "Sofia Kim", score: 12 }
  ].sort((a, b) => b.score - a.score);
  els.mentalLeaderboardList.innerHTML = "";
  rows.forEach((row, index) => {
    const item = document.createElement("div");
    item.className = `mental-leaderboard-row${row.self ? " self" : ""}`;
    item.innerHTML = `
      <span>${index + 1}</span>
      <strong>${escapeHtml(row.name)}</strong>
      <b>${escapeHtml(String(row.score))}</b>
    `;
    els.mentalLeaderboardList.appendChild(item);
  });
}

function makeMarketGameRound() {
  const fairValue = randomInt(82, 118);
  const volatility = randomChoice([1.5, 2, 2.5, 3.5, 4]);
  const news = randomChoice(["thin book", "fast tape", "wide client flow", "quiet auction", "late imbalance"]);
  return {
    id: makeId(),
    fairValue,
    volatility,
    news,
    score: Number(currentMarketGame?.score || 0),
    quoted: false,
    feedback: ""
  };
}

function renderMarketGame() {
  if (!currentMarketGame || !els.marketGamePrompt) return;
  if (els.marketGameScore) els.marketGameScore.textContent = String(Math.round(currentMarketGame.score || 0));
  els.marketGamePrompt.innerHTML = `
    <span>Indicative fair: <b>${escapeHtml(String(currentMarketGame.fairValue))}</b></span>
    <span>Vol: ${escapeHtml(String(currentMarketGame.volatility))} · ${escapeHtml(currentMarketGame.news)}</span>
    <small>Quote a two-sided market. Tight and centered quotes score best; crossed markets are rejected.</small>
  `;
  if (els.marketBidInput && !currentMarketGame.quoted) els.marketBidInput.value = String(Math.round(currentMarketGame.fairValue - currentMarketGame.volatility));
  if (els.marketAskInput && !currentMarketGame.quoted) els.marketAskInput.value = String(Math.round(currentMarketGame.fairValue + currentMarketGame.volatility));
  if (els.marketGameFeedback) els.marketGameFeedback.textContent = currentMarketGame.feedback || "";
}

function newMarketGame(renderAfter = true) {
  currentMarketGame = makeMarketGameRound();
  if (renderAfter) renderMentalMath();
}

function submitMarketQuote() {
  if (!currentMarketGame) return;
  if (currentMarketGame.quoted) {
    currentMarketGame.feedback = "Round already scored. Start a new market.";
    renderMarketGame();
    return;
  }
  const bid = Number(els.marketBidInput?.value);
  const ask = Number(els.marketAskInput?.value);
  if (!Number.isFinite(bid) || !Number.isFinite(ask) || bid >= ask) {
    currentMarketGame.feedback = "Bid must be below ask.";
    renderMarketGame();
    return;
  }
  const fair = currentMarketGame.fairValue;
  const mid = (bid + ask) / 2;
  const width = ask - bid;
  const centerPenalty = Math.abs(mid - fair) * 2.2;
  const widthPenalty = Math.max(0, width - currentMarketGame.volatility * 2.2);
  const score = Math.round(20 - centerPenalty - widthPenalty + Math.max(0, currentMarketGame.volatility * 2 - width));
  currentMarketGame.score = Number(currentMarketGame.score || 0) + score;
  currentMarketGame.quoted = true;
  currentMarketGame.feedback = `Round ${score >= 0 ? "+" : ""}${score}. Mid ${formatNumber(mid)}, width ${formatNumber(width)}, fair ${fair}.`;
  recordGameResult("market", score, `Market making quote ${bid}/${ask}; fair ${fair}`);
  renderMarketGame();
  renderSkills();
}

function makePokerGameRound() {
  const game = createPokerTournament(getPokerMode());
  startNextPokerHand(game);
  return game;
}

function getPokerMode() {
  return els.pokerModeSelect?.value === "local" ? "local" : "bots";
}

function createPokerTournament(mode = "bots") {
  return {
    id: makeId(),
    mode,
    players: createPokerPlayers(mode),
    dealerIndex: -1,
    handNumber: 0,
    handsPlayed: 0,
    blindInterval: 3,
    level: 0,
    levelIncreasedAt: -1,
    smallBlind: POKER_BLIND_LEVELS[0].small,
    bigBlind: POKER_BLIND_LEVELS[0].big,
    stage: "waiting",
    board: [],
    deck: [],
    pot: 0,
    currentBet: 0,
    minRaise: POKER_BLIND_LEVELS[0].big,
    actionIndex: -1,
    handActive: false,
    handComplete: true,
    tournamentOver: false,
    heroStackAtHandStart: 0,
    showdown: null,
    feedback: "Match a robot table or a local human table, then play real Hold'em streets.",
    log: []
  };
}

function createPokerPlayers(mode = "bots") {
  const names = mode === "local"
    ? [
      { id: "hero", name: "You", type: "human" },
      { id: "guest", name: "Guest", type: "human" },
      { id: "bot-ivy", name: "Ivy Bot", type: "bot" },
      { id: "bot-max", name: "Max Bot", type: "bot" }
    ]
    : [
      { id: "hero", name: "You", type: "human" },
      { id: "bot-ivy", name: "Ivy Bot", type: "bot" },
      { id: "bot-max", name: "Max Bot", type: "bot" },
      { id: "bot-rio", name: "Rio Bot", type: "bot" }
    ];
  return names.map((player, index) => ({
    ...player,
    seat: index,
    stack: 1000,
    cards: [],
    currentBet: 0,
    committed: 0,
    inHand: false,
    folded: false,
    allIn: false,
    acted: false,
    eliminated: false,
    lastAction: ""
  }));
}

function renderPokerGame() {
  if (!currentPokerGame || !els.pokerGamePrompt) return;
  const game = currentPokerGame;
  const hero = getPokerHero(game);
  if (els.pokerModeSelect && els.pokerModeSelect.value !== game.mode) els.pokerModeSelect.value = game.mode;
  if (els.pokerGameScore) els.pokerGameScore.textContent = hero ? String(Math.round(hero.stack)) : "0";
  if (els.pokerStageText) els.pokerStageText.textContent = getPokerStageLabel(game.stage);
  if (els.pokerBlindText) {
    const nextBlind = Math.max(0, game.blindInterval - (game.handsPlayed % game.blindInterval));
    els.pokerBlindText.textContent = `Blinds ${game.smallBlind}/${game.bigBlind} · level ${game.level + 1} · up in ${nextBlind}`;
  }
  renderPokerSeats(game);
  renderPokerBoard(game);
  renderPokerActions(game);
  renderPokerLog(game);
  if (els.pokerPot) els.pokerPot.textContent = `Pot ${game.pot}`;
  const active = getCurrentPokerPlayer(game);
  const toCall = active ? getPokerToCall(game, active) : 0;
  els.pokerGamePrompt.innerHTML = `
    <span>${escapeHtml(game.mode === "local" ? "Local human table" : "Robot match")} · hand <b>#${escapeHtml(String(game.handNumber || 1))}</b></span>
    <span>${escapeHtml(getPokerStageLabel(game.stage))} · pot ${escapeHtml(String(game.pot))} · current bet ${escapeHtml(String(game.currentBet))}</span>
    <small>${escapeHtml(game.handComplete ? "Hand finished. Deal the next hand when ready." : `Action on ${active?.name || "table"}${toCall ? `, call ${toCall}` : ", check is available"}.`)}</small>
  `;
  if (els.pokerGameFeedback) els.pokerGameFeedback.textContent = game.feedback || "";
}

function renderPokerSeats(game) {
  if (!els.pokerSeatGrid) return;
  els.pokerSeatGrid.innerHTML = "";
  game.players.forEach((player, index) => {
    const seat = document.createElement("div");
    const isTurn = index === game.actionIndex && game.handActive && !game.handComplete;
    seat.className = [
      "poker-seat",
      player.type === "human" ? "human" : "bot",
      isTurn ? "active" : "",
      player.folded ? "folded" : "",
      player.allIn ? "all-in" : "",
      player.eliminated || player.stack <= 0 && !player.inHand ? "eliminated" : ""
    ].filter(Boolean).join(" ");
    const badges = [];
    if (index === game.dealerIndex) badges.push("D");
    if (player.allIn) badges.push("ALL-IN");
    if (player.folded) badges.push("FOLD");
    seat.innerHTML = `
      <div class="poker-seat-top">
        <strong>${escapeHtml(player.name)}</strong>
        <span>${badges.map(escapeHtml).join(" · ") || escapeHtml(player.type === "human" ? "Human" : "Bot")}</span>
      </div>
      <div class="poker-hole-cards">${renderPokerHoleCards(game, player)}</div>
      <div class="poker-seat-stack">
        <span>Stack ${escapeHtml(String(Math.max(0, Math.round(player.stack))))}</span>
        <span>Bet ${escapeHtml(String(Math.round(player.currentBet || 0)))}</span>
      </div>
      <small>${escapeHtml(player.lastAction || (player.inHand ? "Waiting" : "Out"))}</small>
    `;
    els.pokerSeatGrid.appendChild(seat);
  });
}

function renderPokerHoleCards(game, player) {
  const shouldReveal = player.type === "human" || game.handComplete || game.stage === "showdown";
  const cards = player.cards.length ? player.cards : [null, null];
  return cards.map((card) => shouldReveal && card ? pokerCardHtml(card) : '<span class="poker-card back">?</span>').join("");
}

function renderPokerBoard(game) {
  if (!els.pokerBoard) return;
  els.pokerBoard.innerHTML = "";
  const cards = [...game.board];
  while (cards.length < 5) cards.push(null);
  cards.forEach((card) => {
    const slot = document.createElement("span");
    slot.className = card ? `poker-card ${isRedPokerCard(card) ? "red" : ""}` : "poker-card empty";
    slot.textContent = card ? pokerCardLabel(card) : "";
    els.pokerBoard.appendChild(slot);
  });
}

function renderPokerActions(game) {
  const active = getCurrentPokerPlayer(game);
  const canAct = Boolean(active && active.type === "human" && game.handActive && !game.handComplete && !game.tournamentOver);
  const toCall = active ? getPokerToCall(game, active) : 0;
  document.querySelectorAll("[data-poker-action]").forEach((button) => {
    const action = button.dataset.pokerAction;
    button.disabled = !canAct;
    if (action === "call") button.textContent = toCall ? `Call ${toCall}` : "Check";
    if (action === "raise") button.textContent = "Raise";
    if (action === "allin") button.textContent = "All-in";
  });
  if (els.pokerRaiseInput) {
    const minRaiseTo = active ? getMinimumPokerRaiseTo(game, active) : 0;
    const maxRaiseTo = active ? active.currentBet + active.stack : 0;
    els.pokerRaiseInput.disabled = !canAct;
    els.pokerRaiseInput.min = String(minRaiseTo);
    els.pokerRaiseInput.max = String(maxRaiseTo);
    els.pokerRaiseInput.step = String(game.bigBlind);
    if (canAct && (!Number(els.pokerRaiseInput.value) || Number(els.pokerRaiseInput.value) < minRaiseTo)) {
      els.pokerRaiseInput.value = String(Math.min(maxRaiseTo, minRaiseTo));
    }
  }
  if (els.pokerTurnPrompt) {
    els.pokerTurnPrompt.textContent = canAct
      ? `${active.name} to act · ${toCall ? `call ${toCall}` : "check or bet"} · stack ${active.stack}`
      : game.handComplete
        ? "Hand complete."
        : "Bots are acting...";
  }
  if (els.nextPokerGameBtn) {
    els.nextPokerGameBtn.disabled = Boolean(game.handActive && !game.handComplete && !game.tournamentOver);
    els.nextPokerGameBtn.textContent = game.tournamentOver ? "New tournament" : "Next hand";
  }
}

function renderPokerLog(game) {
  if (!els.pokerLog) return;
  els.pokerLog.innerHTML = "";
  game.log.slice(-7).reverse().forEach((line) => {
    const row = document.createElement("div");
    row.textContent = line;
    els.pokerLog.appendChild(row);
  });
}

function newPokerGame(renderAfter = true) {
  if (!currentPokerGame || currentPokerGame.tournamentOver) {
    resetPokerTournament(false);
  } else if (currentPokerGame.handActive && !currentPokerGame.handComplete) {
    currentPokerGame.feedback = "Finish the current hand before dealing the next one.";
  } else {
    startNextPokerHand(currentPokerGame);
  }
  if (renderAfter) renderMentalMath();
}

function resetPokerTournament(renderAfter = true) {
  currentPokerGame = makePokerGameRound();
  if (renderAfter) renderMentalMath();
}

function startNextPokerHand(game) {
  if (!game) return;
  maybeIncreasePokerBlinds(game);
  game.players.forEach((player) => {
    player.eliminated = player.stack <= 0;
    player.cards = [];
    player.currentBet = 0;
    player.committed = 0;
    player.inHand = !player.eliminated;
    player.folded = false;
    player.allIn = false;
    player.acted = false;
    player.lastAction = player.eliminated ? "Eliminated" : "";
  });
  const livePlayers = game.players.filter((player) => !player.eliminated);
  if (livePlayers.length <= 1) {
    game.tournamentOver = true;
    game.handActive = false;
    game.handComplete = true;
    game.feedback = livePlayers[0] ? `${livePlayers[0].name} wins the tournament.` : "Tournament complete.";
    addPokerLog(game, game.feedback);
    return;
  }
  game.handNumber += 1;
  game.stage = "preflop";
  game.board = [];
  game.deck = shufflePokerDeck(createPokerDeck());
  game.pot = 0;
  game.currentBet = 0;
  game.minRaise = game.bigBlind;
  game.showdown = null;
  game.handActive = true;
  game.handComplete = false;
  game.heroStackAtHandStart = getPokerHero(game)?.stack || 0;
  game.dealerIndex = nextPokerSeatWithStack(game, game.dealerIndex);
  const blindSeats = getPokerBlindSeats(game);
  dealPokerHoleCards(game);
  postPokerBlind(game, blindSeats.small, game.smallBlind, "small blind");
  postPokerBlind(game, blindSeats.big, game.bigBlind, "big blind");
  game.actionIndex = nextPokerActionSeat(game, blindSeats.big);
  addPokerLog(game, `Hand #${game.handNumber}: blinds ${game.smallBlind}/${game.bigBlind}.`);
  game.feedback = `${game.players[game.dealerIndex].name} has the button.`;
  continuePokerHand(game);
}

function submitPokerAction(action) {
  const game = currentPokerGame;
  if (!game || !action || game.handComplete || game.tournamentOver) return;
  const player = getCurrentPokerPlayer(game);
  if (!player || player.type !== "human") return;
  const raiseTo = action === "raise" ? Number(els.pokerRaiseInput?.value || 0) : 0;
  performPokerAction(game, game.actionIndex, action, raiseTo);
  continuePokerHand(game);
  renderPokerGame();
  renderSkills();
}

function continuePokerHand(game) {
  let guard = 0;
  while (game.handActive && !game.handComplete && !game.tournamentOver && guard < 80) {
    guard += 1;
    const contenders = getPokerContenders(game);
    if (contenders.length <= 1) {
      awardPokerPot(game, contenders[0], "Everyone else folded.");
      break;
    }
    const eligible = getPokerEligiblePlayers(game);
    if (!eligible.length) {
      runPokerBoardToShowdown(game);
      break;
    }
    if (isPokerBettingRoundComplete(game)) {
      advancePokerStreet(game);
      continue;
    }
    if (!isPokerActionSeat(game, game.actionIndex)) {
      game.actionIndex = nextPokerActionSeat(game, game.actionIndex);
      continue;
    }
    const player = game.players[game.actionIndex];
    if (player.type === "human") break;
    const botDecision = choosePokerBotAction(game, player);
    performPokerAction(game, game.actionIndex, botDecision.action, botDecision.raiseTo);
  }
  if (guard >= 80) {
    game.feedback = "Poker engine paused after too many automatic actions. Start a new hand.";
    game.handComplete = true;
    game.handActive = false;
  }
}

function performPokerAction(game, playerIndex, action, raiseTo = 0) {
  const player = game.players[playerIndex];
  if (!player || !player.inHand || player.folded || player.allIn) return;
  const toCall = getPokerToCall(game, player);
  if (action === "fold") {
    player.folded = true;
    player.acted = true;
    player.lastAction = "Fold";
    addPokerLog(game, `${player.name} folds.`);
    game.actionIndex = nextPokerActionSeat(game, playerIndex);
    return;
  }
  if (action === "allin") {
    raiseTo = player.currentBet + player.stack;
    action = raiseTo > game.currentBet ? "raise" : "call";
  }
  if (action === "raise") {
    const previousBet = game.currentBet;
    const maxTotal = player.currentBet + player.stack;
    const minTotal = getMinimumPokerRaiseTo(game, player);
    const targetTotal = Math.min(maxTotal, Math.max(minTotal, Math.round(Number(raiseTo || minTotal))));
    const paid = commitPokerChips(player, targetTotal - player.currentBet);
    if (targetTotal > previousBet) {
      const raiseSize = targetTotal - previousBet;
      game.currentBet = targetTotal;
      game.minRaise = Math.max(game.bigBlind, raiseSize);
      game.players.forEach((other) => {
        if (other.inHand && !other.folded && !other.allIn && other.id !== player.id) other.acted = false;
      });
    }
    player.acted = true;
    player.lastAction = player.allIn ? "All-in" : `Raise to ${player.currentBet}`;
    game.pot += paid;
    addPokerLog(game, `${player.name} raises to ${player.currentBet}${player.allIn ? " and is all-in" : ""}.`);
    game.actionIndex = nextPokerActionSeat(game, playerIndex);
    return;
  }
  const paid = commitPokerChips(player, toCall);
  game.pot += paid;
  player.acted = true;
  player.lastAction = toCall ? `Call ${paid}` : "Check";
  addPokerLog(game, toCall ? `${player.name} calls ${paid}${player.allIn ? " and is all-in" : ""}.` : `${player.name} checks.`);
  game.actionIndex = nextPokerActionSeat(game, playerIndex);
}

function commitPokerChips(player, amount) {
  const paid = Math.min(Math.max(0, Math.round(Number(amount || 0))), player.stack);
  player.stack -= paid;
  player.currentBet += paid;
  player.committed += paid;
  if (player.stack <= 0) {
    player.stack = 0;
    player.allIn = true;
  }
  return paid;
}

function advancePokerStreet(game) {
  if (game.stage === "river") {
    showdownPokerHand(game);
    return;
  }
  game.stage = game.stage === "preflop" ? "flop" : game.stage === "flop" ? "turn" : "river";
  const cardsToDeal = game.stage === "flop" ? 3 : 1;
  for (let index = 0; index < cardsToDeal; index += 1) {
    const card = drawPokerCard(game);
    if (card) game.board.push(card);
  }
  resetPokerStreetBets(game);
  game.actionIndex = nextPokerActionSeat(game, game.dealerIndex);
  addPokerLog(game, `${getPokerStageLabel(game.stage)}: ${game.board.map(pokerCardLabel).join(" ")}.`);
}

function runPokerBoardToShowdown(game) {
  while (game.stage !== "river") advancePokerStreet(game);
  showdownPokerHand(game);
}

function showdownPokerHand(game) {
  const contenders = getPokerContenders(game);
  const results = contenders.map((player) => ({
    player,
    hand: evaluatePokerHand([...player.cards, ...game.board])
  }));
  results.sort((a, b) => comparePokerHands(b.hand, a.hand));
  const best = results[0]?.hand;
  const winners = results.filter((result) => best && comparePokerHands(result.hand, best) === 0);
  const share = winners.length ? Math.floor(game.pot / winners.length) : 0;
  winners.forEach((result) => {
    result.player.stack += share;
  });
  const winnerNames = winners.map((result) => result.player.name).join(", ");
  const bestName = best ? `${best.name} (${best.cards.map(pokerCardLabel).join(" ")})` : "best hand";
  game.showdown = { winners: winners.map((result) => result.player.id), results };
  finishPokerHand(game, `${winnerNames} wins ${game.pot} with ${bestName}.`);
}

function awardPokerPot(game, winner, reason = "") {
  if (winner) winner.stack += game.pot;
  finishPokerHand(game, `${winner?.name || "Nobody"} wins ${game.pot}. ${reason}`.trim());
}

function finishPokerHand(game, message) {
  game.feedback = message;
  game.handComplete = true;
  game.handActive = false;
  game.stage = game.showdown ? "showdown" : game.stage;
  game.actionIndex = -1;
  game.handsPlayed += 1;
  game.players.forEach((player) => {
    player.eliminated = player.stack <= 0;
    if (player.eliminated) player.lastAction = "Eliminated";
  });
  addPokerLog(game, message);
  recordPokerHandResult(game, message);
  const livePlayers = game.players.filter((player) => !player.eliminated);
  if (livePlayers.length <= 1) {
    game.tournamentOver = true;
    game.feedback = `${livePlayers[0]?.name || "Winner"} wins the tournament.`;
    addPokerLog(game, game.feedback);
  }
}

function recordPokerHandResult(game, message) {
  if (game.recordedHandId === `${game.id}:${game.handNumber}`) return;
  game.recordedHandId = `${game.id}:${game.handNumber}`;
  const hero = getPokerHero(game);
  if (!hero) return;
  const chipDelta = hero.stack - game.heroStackAtHandStart;
  const score = clampNumber(Math.round(chipDelta / Math.max(game.bigBlind, 1)), -24, 36);
  recordGameResult("poker", score, `Poker hand #${game.handNumber}: ${message} Hero ${chipDelta >= 0 ? "+" : ""}${chipDelta} chips`);
}

function choosePokerBotAction(game, player) {
  const toCall = getPokerToCall(game, player);
  const strength = getPokerDecisionStrength(game, player) + randomInt(-8, 8);
  const potOddsPressure = toCall ? (toCall / Math.max(game.pot + toCall, 1)) * 100 : 0;
  if (toCall > 0) {
    if (strength < 28 + potOddsPressure * 0.8 && toCall > game.bigBlind * 0.5) return { action: "fold" };
    if (strength > 76 && player.stack > toCall + game.bigBlind * 2) {
      return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.currentBet + game.minRaise * randomChoice([1, 2, 3])) };
    }
    return { action: "call" };
  }
  if (strength > 72 && player.stack > game.bigBlind * 2) {
    return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.bigBlind * randomChoice([2, 3, 4])) };
  }
  if (strength > 58 && Math.random() < 0.2 && player.stack > game.bigBlind * 2) {
    return { action: "raise", raiseTo: Math.min(player.currentBet + player.stack, game.bigBlind * 2) };
  }
  return { action: "call" };
}

function getPokerDecisionStrength(game, player) {
  if (!game.board.length) return estimatePreflopStrength(player.cards);
  const evaluated = evaluatePokerHand([...player.cards, ...game.board]);
  const base = evaluated.rank * 12 + (evaluated.tiebreakers[0] || 0) * 1.4;
  const boardPressure = game.board.length < 5 ? 6 : 0;
  return clampNumber(Math.round(base + boardPressure), 0, 100);
}

function estimatePreflopStrength(cards) {
  if (!cards || cards.length < 2) return 0;
  const [a, b] = [...cards].sort((left, right) => right.value - left.value);
  const pair = a.value === b.value;
  const suited = a.suit === b.suit;
  const gap = Math.abs(a.value - b.value);
  let score = a.value * 3 + b.value * 2 - gap * 2;
  if (pair) score += 34 + a.value * 2;
  if (suited) score += 7;
  if (gap <= 1) score += 6;
  if (a.value === 14) score += 8;
  return clampNumber(Math.round(score), 8, 98);
}

function evaluatePokerHand(cards) {
  const sorted = [...cards].filter(Boolean).sort((a, b) => b.value - a.value);
  const groups = new Map();
  sorted.forEach((card) => {
    if (!groups.has(card.value)) groups.set(card.value, []);
    groups.get(card.value).push(card);
  });
  const groupsByCount = [...groups.entries()]
    .map(([value, valueCards]) => ({ value: Number(value), cards: valueCards, count: valueCards.length }))
    .sort((a, b) => b.count - a.count || b.value - a.value);
  const flushCards = POKER_SUITS
    .map((suit) => sorted.filter((card) => card.suit === suit.key))
    .find((suitedCards) => suitedCards.length >= 5);
  const straightHigh = findPokerStraightHigh([...groups.keys()].map(Number));
  const straightFlushHigh = flushCards ? findPokerStraightHigh([...new Set(flushCards.map((card) => card.value))]) : 0;
  if (straightFlushHigh) return buildPokerEval(8, [straightFlushHigh], straightCards(sorted, straightFlushHigh, flushCards?.[0]?.suit));
  const quads = groupsByCount.find((group) => group.count === 4);
  if (quads) {
    const kicker = sorted.find((card) => card.value !== quads.value);
    return buildPokerEval(7, [quads.value, kicker?.value || 0], [...quads.cards, kicker].filter(Boolean));
  }
  const trips = groupsByCount.filter((group) => group.count >= 3);
  const pairs = groupsByCount.filter((group) => group.count >= 2 && group.value !== trips[0]?.value);
  if (trips.length && (pairs.length || trips.length > 1)) {
    const pairGroup = pairs[0] || trips[1];
    return buildPokerEval(6, [trips[0].value, pairGroup.value], [...trips[0].cards.slice(0, 3), ...pairGroup.cards.slice(0, 2)]);
  }
  if (flushCards) return buildPokerEval(5, flushCards.slice(0, 5).map((card) => card.value), flushCards.slice(0, 5));
  if (straightHigh) return buildPokerEval(4, [straightHigh], straightCards(sorted, straightHigh));
  if (trips.length) {
    const kickers = sorted.filter((card) => card.value !== trips[0].value).slice(0, 2);
    return buildPokerEval(3, [trips[0].value, ...kickers.map((card) => card.value)], [...trips[0].cards.slice(0, 3), ...kickers]);
  }
  const madePairs = groupsByCount.filter((group) => group.count >= 2);
  if (madePairs.length >= 2) {
    const topPairs = madePairs.slice(0, 2);
    const kicker = sorted.find((card) => !topPairs.some((pair) => pair.value === card.value));
    return buildPokerEval(2, [topPairs[0].value, topPairs[1].value, kicker?.value || 0], [...topPairs[0].cards.slice(0, 2), ...topPairs[1].cards.slice(0, 2), kicker].filter(Boolean));
  }
  if (madePairs.length === 1) {
    const kickers = sorted.filter((card) => card.value !== madePairs[0].value).slice(0, 3);
    return buildPokerEval(1, [madePairs[0].value, ...kickers.map((card) => card.value)], [...madePairs[0].cards.slice(0, 2), ...kickers]);
  }
  return buildPokerEval(0, sorted.slice(0, 5).map((card) => card.value), sorted.slice(0, 5));
}

function buildPokerEval(rank, tiebreakers, cards) {
  return {
    rank,
    name: POKER_HAND_NAMES[rank] || "Hand",
    tiebreakers,
    cards: cards.filter(Boolean).slice(0, 5)
  };
}

function comparePokerHands(a, b) {
  if ((a?.rank || 0) !== (b?.rank || 0)) return (a?.rank || 0) - (b?.rank || 0);
  const left = a?.tiebreakers || [];
  const right = b?.tiebreakers || [];
  for (let index = 0; index < Math.max(left.length, right.length); index += 1) {
    const diff = (left[index] || 0) - (right[index] || 0);
    if (diff) return diff;
  }
  return 0;
}

function findPokerStraightHigh(values) {
  const unique = [...new Set(values)].sort((a, b) => b - a);
  if (unique.includes(14)) unique.push(1);
  for (let index = 0; index <= unique.length - 5; index += 1) {
    const run = unique.slice(index, index + 5);
    if (run.every((value, runIndex) => runIndex === 0 || value === run[runIndex - 1] - 1)) return run[0] === 1 ? 5 : run[0];
  }
  return 0;
}

function straightCards(cards, high, suit = "") {
  const values = high === 5 ? [5, 4, 3, 2, 14] : [high, high - 1, high - 2, high - 3, high - 4];
  return values.map((value) => cards.find((card) => card.value === value && (!suit || card.suit === suit))).filter(Boolean);
}

function createPokerDeck() {
  return POKER_SUITS.flatMap((suit) => POKER_RANKS.map((rank, index) => ({
    rank,
    value: index + 2,
    suit: suit.key,
    suitSymbol: suit.symbol,
    id: `${rank}${suit.key}`
  })));
}

function shufflePokerDeck(deck) {
  const cards = [...deck];
  for (let index = cards.length - 1; index > 0; index -= 1) {
    const swapIndex = randomInt(0, index);
    [cards[index], cards[swapIndex]] = [cards[swapIndex], cards[index]];
  }
  return cards;
}

function drawPokerCard(game) {
  return game.deck.pop();
}

function dealPokerHoleCards(game) {
  for (let round = 0; round < 2; round += 1) {
    game.players.forEach((player) => {
      if (player.inHand) player.cards.push(drawPokerCard(game));
    });
  }
}

function postPokerBlind(game, playerIndex, amount, label) {
  const player = game.players[playerIndex];
  const paid = commitPokerChips(player, amount);
  player.acted = false;
  player.lastAction = `${label} ${paid}`;
  game.currentBet = Math.max(game.currentBet, player.currentBet);
  game.pot += paid;
  addPokerLog(game, `${player.name} posts ${label} ${paid}.`);
}

function resetPokerStreetBets(game) {
  game.currentBet = 0;
  game.minRaise = game.bigBlind;
  game.players.forEach((player) => {
    player.currentBet = 0;
    player.acted = false;
  });
}

function maybeIncreasePokerBlinds(game) {
  if (game.handsPlayed > 0 && game.handsPlayed % game.blindInterval === 0 && game.levelIncreasedAt !== game.handsPlayed) {
    game.level = Math.min(POKER_BLIND_LEVELS.length - 1, game.level + 1);
    game.levelIncreasedAt = game.handsPlayed;
    const level = POKER_BLIND_LEVELS[game.level];
    game.smallBlind = level.small;
    game.bigBlind = level.big;
    game.minRaise = level.big;
    addPokerLog(game, `Blinds increase to ${game.smallBlind}/${game.bigBlind}.`);
  }
}

function getPokerBlindSeats(game) {
  const liveCount = game.players.filter((player) => !player.eliminated).length;
  if (liveCount === 2) {
    return {
      small: game.dealerIndex,
      big: nextPokerSeatWithStack(game, game.dealerIndex)
    };
  }
  const small = nextPokerSeatWithStack(game, game.dealerIndex);
  return {
    small,
    big: nextPokerSeatWithStack(game, small)
  };
}

function nextPokerSeatWithStack(game, fromIndex) {
  for (let step = 1; step <= game.players.length; step += 1) {
    const index = (fromIndex + step + game.players.length) % game.players.length;
    if (game.players[index].stack > 0) return index;
  }
  return 0;
}

function nextPokerActionSeat(game, fromIndex) {
  for (let step = 1; step <= game.players.length; step += 1) {
    const index = (fromIndex + step + game.players.length) % game.players.length;
    if (isPokerActionSeat(game, index)) return index;
  }
  return -1;
}

function isPokerActionSeat(game, index) {
  const player = game.players[index];
  return Boolean(player && player.inHand && !player.folded && !player.allIn && player.stack > 0);
}

function getPokerContenders(game) {
  return game.players.filter((player) => player.inHand && !player.folded);
}

function getPokerEligiblePlayers(game) {
  return game.players.filter((player) => player.inHand && !player.folded && !player.allIn && player.stack > 0);
}

function isPokerBettingRoundComplete(game) {
  const eligible = getPokerEligiblePlayers(game);
  if (!eligible.length) return true;
  return eligible.every((player) => player.acted && player.currentBet === game.currentBet);
}

function getPokerToCall(game, player) {
  return Math.max(0, game.currentBet - (player?.currentBet || 0));
}

function getMinimumPokerRaiseTo(game, player) {
  if (!player) return 0;
  if (game.currentBet <= 0) return Math.min(player.stack, game.bigBlind);
  return Math.min(player.currentBet + player.stack, game.currentBet + game.minRaise);
}

function getCurrentPokerPlayer(game) {
  return game.players[game.actionIndex] || null;
}

function getPokerHero(game) {
  return game.players.find((player) => player.id === "hero") || game.players[0];
}

function getPokerStageLabel(stage) {
  const labels = {
    waiting: "Waiting",
    preflop: "Preflop",
    flop: "Flop",
    turn: "Turn",
    river: "River",
    showdown: "Showdown"
  };
  return labels[stage] || "Hand";
}

function addPokerLog(game, line) {
  if (!line) return;
  game.log = [...(game.log || []), line].slice(-24);
  game.feedback = line;
}

function pokerCardLabel(card) {
  return `${card.rank}${card.suitSymbol}`;
}

function pokerCardHtml(card) {
  return `<span class="poker-card ${isRedPokerCard(card) ? "red" : ""}">${escapeHtml(pokerCardLabel(card))}</span>`;
}

function isRedPokerCard(card) {
  return card?.suit === "h" || card?.suit === "d";
}

function recordGameResult(game, score, detail) {
  state.gameRecords = normalizeGameRecords([...(state.gameRecords || []), {
    id: makeId(),
    game,
    score,
    detail,
    createdAt: new Date().toISOString()
  }]);
  const skillKey = game === "market" ? "market" : "probabilityExpectation";
  const xpGain = Math.max(2, Math.abs(score));
  state.skills[skillKey] = Math.max(0, (state.skills[skillKey] || 0) + xpGain);
  state.entries.push({
    id: makeId(),
    date: new Date().toISOString(),
    text: detail,
    gains: Object.fromEntries(Object.keys(skillDefs).map((key) => [key, key === skillKey ? xpGain : 0])),
    totalXp: xpGain,
    duration: 0
  });
  saveState();
  renderSummary();
}

function setupSkillRadarInteractions() {
  const canvas = els.skillRadar;
  if (!canvas || canvas.dataset.radarReady) return;
  canvas.dataset.radarReady = "true";
  canvas.addEventListener("mousemove", handleSkillRadarMove);
  canvas.addEventListener("mouseleave", clearRadarHover);
  canvas.addEventListener("focus", () => setRadarHover(Object.keys(skillDefs)[0] || ""));
  canvas.addEventListener("blur", clearRadarHover);
}

function handleSkillRadarMove(event) {
  const canvas = els.skillRadar;
  if (!canvas) return;
  const rect = canvas.getBoundingClientRect();
  const x = (event.clientX - rect.left) * (canvas.width / rect.width);
  const y = (event.clientY - rect.top) * (canvas.height / rect.height);
  const hit = radarHitAreas
    .map((area) => ({ ...area, distance: Math.hypot(area.x - x, area.y - y) }))
    .filter((area) => area.distance <= area.radius)
    .sort((a, b) => a.distance - b.distance)[0];
  if (!hit) {
    clearRadarHover();
    return;
  }
  setRadarHover(hit.key, event);
}

function setRadarHover(skillKey, event) {
  if (!skillDefs[skillKey]) return;
  const changed = radarHoverKey !== skillKey;
  radarHoverKey = skillKey;
  if (changed) drawRadar(skillKey);
  updateRadarLegendHighlight(skillKey);
  showSkillRadarTooltip(skillKey, event);
}

function clearRadarHover() {
  if (!radarHoverKey) {
    hideSkillRadarTooltip();
    return;
  }
  radarHoverKey = "";
  drawRadar();
  updateRadarLegendHighlight("");
  hideSkillRadarTooltip();
}

function updateRadarLegendHighlight(skillKey) {
  document.querySelectorAll("[data-skill-radar-key]").forEach((row) => {
    row.classList.toggle("is-active", row.dataset.skillRadarKey === skillKey);
  });
  document.querySelectorAll("[data-skill-key]").forEach((card) => {
    card.classList.toggle("is-active", card.dataset.skillKey === skillKey);
  });
}

function showSkillRadarTooltip(skillKey, event) {
  const tooltip = els.skillRadarTooltip;
  const canvas = els.skillRadar;
  if (!tooltip || !canvas) return;
  const def = skillDefs[skillKey];
  const stats = getSkillPracticeStats(skillKey);
  tooltip.innerHTML = `
    <strong>${escapeHtml(def.name)} · ${stats.score}/100</strong>
    <span>${escapeHtml(t("practiceCount"))}: ${stats.practiceCount}</span>
    <span>${escapeHtml(t("practicedProblems"))}: ${stats.problemCount}</span>
    <span>${escapeHtml(t("averageScore"))}: ${stats.averageScore == null ? escapeHtml(t("noPracticeYet")) : `${Math.round(stats.averageScore)}/100`}</span>
    <span>${escapeHtml(t("skillXp"))}: ${stats.xp}</span>
    <em>${escapeHtml(stats.latestText ? `${t("latestPractice")}: ${stats.latestText}` : t("noPracticeYet"))}</em>
  `;
  tooltip.classList.remove("hidden");
  const wrapperRect = canvas.parentElement.getBoundingClientRect();
  const left = event ? event.clientX - wrapperRect.left + 14 : wrapperRect.width * 0.56;
  const top = event ? event.clientY - wrapperRect.top : wrapperRect.height * 0.45;
  tooltip.style.left = `${Math.min(Math.max(16, left), wrapperRect.width - 260)}px`;
  tooltip.style.top = `${Math.min(Math.max(18, top), wrapperRect.height - 126)}px`;
}

function hideSkillRadarTooltip() {
  if (els.skillRadarTooltip) els.skillRadarTooltip.classList.add("hidden");
}

function drawRadar(highlightKey = radarHoverKey, options = {}) {
  const canvas = els.skillRadar;
  if (!canvas) return;
  const keys = Object.keys(skillDefs);
  const targets = keys.map((key) => getSkillScore(state.skills?.[key] || 0) / 100);
  const shouldAnimate = options.animate !== false && (!radarTargetValues || !sameRadarValues(targets, radarTargetValues));
  radarTargetValues = targets;
  if (!radarAnimatedValues) radarAnimatedValues = targets.map(() => 0);
  if (shouldAnimate) {
    const from = [...radarAnimatedValues];
    const start = performance.now();
    const duration = 720;
    if (radarAnimationFrame) cancelAnimationFrame(radarAnimationFrame);
    const animate = (time) => {
      const progress = easeOutCubic(Math.min(1, (time - start) / duration));
      radarAnimatedValues = targets.map((target, index) => from[index] + (target - from[index]) * progress);
      renderRadarCanvas(highlightKey, radarAnimatedValues);
      if (progress < 1) {
        radarAnimationFrame = requestAnimationFrame(animate);
      } else {
        radarAnimationFrame = 0;
        radarAnimatedValues = [...targets];
        renderRadarCanvas(highlightKey, radarAnimatedValues);
      }
    };
    radarAnimationFrame = requestAnimationFrame(animate);
    return;
  }
  renderRadarCanvas(highlightKey, radarAnimatedValues || targets);
}

function sameRadarValues(a = [], b = []) {
  return a.length === b.length && a.every((value, index) => Math.abs(value - b[index]) < 0.001);
}

function easeOutCubic(value) {
  return 1 - Math.pow(1 - value, 3);
}

function renderRadarCanvas(highlightKey, values) {
  const canvas = els.skillRadar;
  if (!canvas) return;
  const ctx = canvas.getContext("2d");
  const width = canvas.width;
  const height = canvas.height;
  ctx.clearRect(0, 0, width, height);
  radarHitAreas = [];

  const keys = Object.keys(skillDefs);
  const center = { x: width / 2, y: height / 2 + 2 };
  const radius = Math.min(width, height) * 0.35;
  const time = performance.now() / 1000;

  const panelGradient = ctx.createRadialGradient(center.x, center.y, 12, center.x, center.y, radius * 1.72);
  panelGradient.addColorStop(0, "rgba(255,255,255,0.96)");
  panelGradient.addColorStop(0.48, "rgba(247,244,255,0.88)");
  panelGradient.addColorStop(1, "rgba(255,252,247,0.98)");
  ctx.fillStyle = panelGradient;
  roundRect(ctx, 10, 10, width - 20, height - 20, 26);
  ctx.fill();
  ctx.save();
  ctx.shadowColor = "rgba(99, 91, 255, 0.18)";
  ctx.shadowBlur = 28;
  ctx.strokeStyle = "rgba(222, 216, 255, 0.74)";
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.arc(center.x, center.y, radius * 1.18, 0, Math.PI * 2);
  ctx.stroke();
  ctx.restore();

  for (let ring = 1; ring <= 4; ring += 1) {
    const points = keys.map((_, index) => radarPoint(index, keys.length, radius * (ring / 4), center));
    ctx.strokeStyle = ring === 4 ? "rgba(167, 139, 250, 0.58)" : "rgba(185, 174, 228, 0.26)";
    ctx.lineWidth = ring === 4 ? 2 : 1;
    drawPolygon(ctx, points, false);
  }

  keys.forEach((key, index) => {
    const outer = radarPoint(index, keys.length, radius, center);
    const orbit = radarPoint(index, keys.length, radius * 1.18, center);
    const pulse = 1 + Math.sin(time * 2.8 + index) * 0.08;
    ctx.beginPath();
    ctx.moveTo(center.x, center.y);
    ctx.lineTo(outer.x, outer.y);
    ctx.strokeStyle = key === highlightKey ? "rgba(99, 91, 255, 0.92)" : "rgba(154, 156, 175, 0.28)";
    ctx.lineWidth = key === highlightKey ? 2 : 1;
    ctx.stroke();

    ctx.save();
    ctx.shadowColor = key === highlightKey ? "rgba(99, 91, 255, 0.36)" : "rgba(99, 91, 255, 0.14)";
    ctx.shadowBlur = key === highlightKey ? 18 : 10;
    ctx.fillStyle = "#ffffff";
    ctx.strokeStyle = key === highlightKey ? "#9f8cff" : "rgba(222, 216, 255, 0.9)";
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(orbit.x, orbit.y, (key === highlightKey ? 13 : 10) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = skillDefs[key].color;
    ctx.beginPath();
    ctx.arc(orbit.x, orbit.y, (key === highlightKey ? 4.5 : 3.4) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();

    const score = getSkillScore(state.skills?.[key] || 0);
    const label = radarPoint(index, keys.length, radius + 65, center);
    ctx.fillStyle = key === highlightKey ? "#17171f" : skillDefs[key].color;
    ctx.font = `${key === highlightKey ? "900" : "800"} 16px Inter, system-ui, sans-serif`;
    ctx.textAlign = label.x < center.x - 5 ? "right" : label.x > center.x + 5 ? "left" : "center";
    ctx.textBaseline = "bottom";
    ctx.fillText(skillDefs[key].short, label.x, label.y);
    ctx.fillStyle = key === highlightKey ? "#635bff" : "#64677a";
    ctx.font = "800 12px Inter, system-ui, sans-serif";
    ctx.textBaseline = "top";
    ctx.fillText(`${score}/100`, label.x, label.y + 5);
    radarHitAreas.push({ key, x: label.x, y: label.y, radius: 54 });
    radarHitAreas.push({ key, x: orbit.x, y: orbit.y, radius: 24 });
  });

  const referenceValues = keys.map((_, index) => 0.78 - (index % 3) * 0.08);
  const referencePoints = referenceValues.map((value, index) => radarPoint(index, keys.length, radius * value, center));
  ctx.fillStyle = "rgba(99, 91, 255, 0.035)";
  ctx.strokeStyle = "rgba(99, 91, 255, 0.18)";
  ctx.lineWidth = 1.5;
  drawPolygon(ctx, referencePoints, true);

  const points = values.map((value, index) => radarPoint(index, keys.length, radius * Math.max(value, 0.08), center));
  ctx.save();
  ctx.shadowColor = "rgba(99, 91, 255, 0.36)";
  ctx.shadowBlur = 22;
  const fillGradient = ctx.createLinearGradient(center.x - radius, center.y - radius, center.x + radius, center.y + radius);
  fillGradient.addColorStop(0, "rgba(94, 204, 255, 0.34)");
  fillGradient.addColorStop(0.46, "rgba(99, 91, 255, 0.31)");
  fillGradient.addColorStop(1, "rgba(207, 101, 255, 0.38)");
  ctx.fillStyle = fillGradient;
  ctx.strokeStyle = "rgba(255, 255, 255, 0.94)";
  ctx.lineWidth = 4;
  drawPolygon(ctx, points, true);
  ctx.restore();

  ctx.strokeStyle = "rgba(99, 91, 255, 0.82)";
  ctx.lineWidth = 2;
  drawPolygon(ctx, points, false);

  points.forEach((point, index) => {
    const key = keys[index];
    const pulse = 1 + Math.sin(time * 4 + index * 0.8) * 0.08;
    radarHitAreas.push({ key, x: point.x, y: point.y, radius: 28 });
    ctx.save();
    ctx.shadowColor = key === highlightKey ? "rgba(99, 91, 255, 0.48)" : "rgba(113, 142, 255, 0.22)";
    ctx.shadowBlur = key === highlightKey ? 20 : 12;
    ctx.beginPath();
    ctx.fillStyle = "#ffffff";
    ctx.arc(point.x, point.y, (key === highlightKey ? 10 : 7) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.lineWidth = key === highlightKey ? 4 : 3;
    ctx.strokeStyle = key === highlightKey ? "#9f8cff" : "rgba(255,255,255,0.94)";
    ctx.stroke();
    ctx.fillStyle = key === highlightKey ? "#635bff" : skillDefs[key].color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, (key === highlightKey ? 4.2 : 3.2) * pulse, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  });
}

function radarPoint(index, count, radius, center) {
  const angle = -Math.PI / 2 + (index * Math.PI * 2) / count;
  return {
    x: center.x + Math.cos(angle) * radius,
    y: center.y + Math.sin(angle) * radius
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + width - r, y);
  ctx.quadraticCurveTo(x + width, y, x + width, y + r);
  ctx.lineTo(x + width, y + height - r);
  ctx.quadraticCurveTo(x + width, y + height, x + width - r, y + height);
  ctx.lineTo(x + r, y + height);
  ctx.quadraticCurveTo(x, y + height, x, y + height - r);
  ctx.lineTo(x, y + r);
  ctx.quadraticCurveTo(x, y, x + r, y);
  ctx.closePath();
}

function drawPolygon(ctx, points, fill) {
  ctx.beginPath();
  points.forEach((point, index) => {
    if (index === 0) ctx.moveTo(point.x, point.y);
    else ctx.lineTo(point.x, point.y);
  });
  ctx.closePath();
  if (fill) ctx.fill();
  ctx.stroke();
}

function getTotalXp() {
  return Object.keys(skillDefs).reduce((sum, key) => sum + (state.skills[key] || 0), 0);
}

function getSkillScore(xp) {
  return Math.min(100, Math.floor((xp || 0) / SCORE_XP_PER_POINT));
}

function getQuantScore() {
  return calculateQuantScore(state.skills);
}

function calculateQuantScore(skills) {
  const scores = Object.keys(skillDefs).map((key) => getSkillScore(skills?.[key] || 0));
  if (!scores.length) return 0;
  const average = scores.reduce((sum, score) => sum + score, 0) / scores.length;
  return Math.round(average * 10) / 10;
}

function formatScore(score) {
  return Number.isInteger(score) ? String(score) : score.toFixed(1);
}

function getLevelInfo(xp) {
  const level = Math.floor(Math.sqrt(xp / 55)) + 1;
  const previous = Math.pow(level - 1, 2) * 55;
  const nextTotal = Math.pow(level, 2) * 55;
  const current = Math.max(0, xp - previous);
  const next = Math.max(1, nextTotal - previous);
  return {
    level,
    current,
    next,
    percent: Math.min(100, Math.round((current / next) * 100))
  };
}

function getRank(score) {
  if (score >= 100) return "World-Class Quant PM";
  if (score >= 90) return "Head of Quant";
  if (score >= 75) return "Senior Quant Trader";
  if (score >= 60) return "Quant Researcher";
  if (score >= 40) return "Junior Quant";
  if (score >= 20) return "Quant Intern";
  if (score >= 10) return "Analyst II";
  return "Analyst I";
}

function getWeeklyXp() {
  const cutoff = Date.now() - 7 * 24 * 60 * 60 * 1000;
  return state.entries
    .filter((entry) => new Date(entry.date).getTime() >= cutoff)
    .reduce((sum, entry) => sum + entry.totalXp, 0);
}

function getStreak() {
  const days = new Set([
    ...state.entries.map((entry) => dayKey(entry.date)),
    ...(state.checkIns || []).map((item) => dayKey(item.date))
  ]);
  let streak = 0;
  const cursor = new Date();
  while (days.has(dayKey(cursor))) {
    streak += 1;
    cursor.setDate(cursor.getDate() - 1);
  }
  return streak;
}

function dayKey(date) {
  const d = new Date(date);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function formatDate(date) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

function formatNewsDate(date) {
  const dateOnly = String(date || "").match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (dateOnly) return `${dateOnly[1]}/${dateOnly[2]}/${dateOnly[3]}`;
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return String(date || "");
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).format(parsed);
}

function formatTimeOnly(date) {
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", {
    hour: "2-digit",
    minute: "2-digit"
  }).format(parsed);
}

function emptyBlock(text) {
  const item = document.createElement("div");
  item.className = "history-item";
  const p = document.createElement("p");
  p.textContent = text;
  item.appendChild(p);
  return item;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function randomChoice(items) {
  return items[Math.floor(Math.random() * items.length)];
}

function clampNumber(value, min, max) {
  const number = Number(value);
  if (Number.isNaN(number)) return min;
  return Math.min(max, Math.max(min, number));
}

function formatNumber(value) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2).replace(/\.?0+$/, "");
}

function refreshIcons() {
  if (window.lucide) window.lucide.createIcons();
}
