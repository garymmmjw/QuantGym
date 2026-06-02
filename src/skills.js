export const skillDefs = {
  leetcode: {
    name: "LeetCode",
    short: "LC",
    subtitle: "算法与数据结构",
    color: "#4f6274",
    soft: "#f1f4f7",
    keywords: ["leetcode", "lc", "算法", "dp", "动态规划", "graph", "图", "tree", "树", "heap", "堆", "two pointer", "双指针", "binary search", "二分", "sliding window", "滑窗", "区间", "interval"],
    subskills: ["DP", "图", "树", "堆", "双指针", "二分"]
  },
  cppProgramming: {
    name: "C++ Programming",
    short: "C++",
    subtitle: "C++ 与系统编程",
    color: "#536b8e",
    soft: "#eef2f7",
    keywords: ["c++", "cpp", "virtual", "const", "static", "pointer", "reference", "strcmp", "class", "inheritance", "polymorphism", "abstract class", "destructor", "memory", "C++", "虚函数", "常量", "静态", "指针", "引用", "类", "继承", "多态", "抽象类", "内存"],
    subskills: ["语义", "OOP", "指针", "引用", "const", "内存"]
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
  calculus: {
    name: "Calculus",
    short: "CA",
    subtitle: "微积分与分析",
    color: "#6c5b8b",
    soft: "#f2eff7",
    keywords: ["calculus", "analysis", "limit", "limits", "derivative", "integral", "integration", "l'hospital", "ordinary differential equation", "differential equation", "ode", "微积分", "分析", "极限", "导数", "积分", "洛必达", "微分方程", "常微分"],
    subskills: ["极限", "导数", "积分", "ODE", "不等式", "级数"]
  },
  algebra: {
    name: "Algebra",
    short: "AL",
    subtitle: "代数与不等式",
    color: "#6f6248",
    soft: "#f4f1ea",
    keywords: ["algebra", "inequality", "bernoulli inequality", "polynomial", "binomial", "induction", "proof", "代数", "不等式", "伯努利不等式", "多项式", "二项式", "归纳法", "证明"],
    subskills: ["不等式", "归纳", "多项式", "二项式", "方程", "证明"]
  },
  linearAlgebra: {
    name: "Linear Algebra",
    short: "LA",
    subtitle: "线性代数",
    color: "#476a8a",
    soft: "#eef3f7",
    keywords: ["linear algebra", "matrix", "matrices", "determinant", "eigenvalue", "eigenvector", "cholesky", "positive semidefinite", "positive definite", "rank", "vector space", "线性代数", "矩阵", "行列式", "特征值", "特征向量", "正半定", "正定", "秩", "向量空间"],
    subskills: ["矩阵", "行列式", "特征值", "正定", "分解", "秩"]
  },
  optimization: {
    name: "Optimization",
    short: "OPT",
    subtitle: "优化与运筹",
    color: "#5f6f45",
    soft: "#f1f4ec",
    keywords: ["optimization", "linear program", "linear programming", "lp", "quadratic program", "quadratic programming", "qp", "network flow", "min-cost flow", "max flow", "dual variable", "simplex", "convex", "最优化", "优化", "线性规划", "二次规划", "网络流", "最小费用流", "最大流", "对偶变量", "凸优化"],
    subskills: ["LP", "QP", "网络流", "对偶", "凸优化", "建模"]
  },
  complexNumbers: {
    name: "Complex Numbers",
    short: "CN",
    subtitle: "复数与欧拉公式",
    color: "#4f6f67",
    soft: "#eef4f2",
    keywords: ["complex number", "complex numbers", "complex analysis", "imaginary", "euler formula", "euler's formula", "polar form", "principal logarithm", "i^i", "复数", "虚数", "欧拉公式", "极形式", "主值对数"],
    subskills: ["复数", "欧拉公式", "极形式", "主值", "指数", "对数"]
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
