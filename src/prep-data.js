export const prepRoleDefs = {
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

export const prepSeasonDefs = {
  "2026-summer": { label: "2026 Summer", startDate: "2026-06-01", applicationDate: "2025-07-01" },
  "2027-summer": { label: "2027 Summer", startDate: "2027-06-01", applicationDate: "2026-07-01" },
  "2028-summer": { label: "2028 Summer", startDate: "2028-06-01", applicationDate: "2027-07-01" }
};

export const prepProcessStages = [
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

export const prepSourceLinks = [
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

export const prepDiagnosticQuestions = [
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

export const locationDefs = {
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

export const regionEnLabels = {
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
