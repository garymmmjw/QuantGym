// Shared interview definitions and built-in prompt pools.
export const interviewTypeDefs = {
  oa: {
    label: "Online Assessment",
    categories: ["leetcode", "probabilityExpectation", "statistics", "calculus", "algebra", "linearAlgebra", "optimization", "complexNumbers", "pandasNumpy", "mentalMath"],
    minutes: 5
  },
  technical: {
    label: "Technical Interview",
    categories: ["leetcode", "cppProgramming", "pandasNumpy", "probabilityExpectation", "statistics", "calculus", "algebra", "linearAlgebra", "optimization", "complexNumbers", "machineLearning", "deepLearning", "market", "option"],
    minutes: 8
  },
  behavioral: {
    label: "Behavioral Interview",
    categories: [],
    minutes: 4
  }
};

export const interviewModeDefs = {
  practice: {
    labelZh: "训练练习",
    labelEn: "Practice",
    descriptionZh: "即时评分、Hint、参考答案和复盘面板都会开启。",
    descriptionEn: "Immediate scoring, hints, reference answer, and review panel stay on."
  },
  live: {
    labelZh: "真实面试",
    labelEn: "Live mock",
    descriptionZh: "过程中隐藏分数和答案，只通过追问推进，结束后统一反馈。",
    descriptionEn: "Scores and answers stay hidden; follow-ups drive the interview until the final report."
  }
};

export const interviewPersonaDefs = {
  friendly: {
    labelZh: "友好引导",
    labelEn: "Friendly",
    prompt: "Patient, warm, and Socratic. Give small footholds without revealing the answer."
  },
  neutral: {
    labelZh: "中性专业",
    labelEn: "Professional",
    prompt: "Concise and professional. Ask precise follow-ups and keep the candidate accountable."
  },
  pressure: {
    labelZh: "高压快节奏",
    labelEn: "Pressure",
    prompt: "Fast-paced and exacting. Challenge vague reasoning, but remain fair and interview-realistic."
  }
};

export const interviewDifficultyDefs = {
  easy: { labelZh: "简单", labelEn: "Easy", values: ["Easy"] },
  medium: { labelZh: "中等", labelEn: "Medium", values: ["Medium"] },
  hard: { labelZh: "困难", labelEn: "Hard", values: ["Hard"] },
  adaptive: { labelZh: "自适应", labelEn: "Adaptive", values: [] }
};

export const interviewFocusDefs = {
  mixed: {
    labelZh: "混合",
    labelEn: "Mixed",
    categories: ["leetcode", "cppProgramming", "pandasNumpy", "probabilityExpectation", "statistics", "calculus", "algebra", "linearAlgebra", "optimization", "complexNumbers", "machineLearning", "deepLearning", "market", "option", "mentalMath"],
    type: "technical"
  },
  probability: {
    labelZh: "概率统计",
    labelEn: "Probability & stats",
    categories: ["probabilityExpectation", "statistics", "mentalMath"],
    type: "technical"
  },
  math: {
    labelZh: "数学基础",
    labelEn: "Math foundations",
    categories: ["calculus", "algebra", "linearAlgebra", "optimization", "complexNumbers", "probabilityExpectation", "statistics"],
    type: "technical"
  },
  optimization: {
    labelZh: "优化建模",
    labelEn: "Optimization",
    categories: ["optimization", "linearAlgebra", "market"],
    type: "technical"
  },
  algorithms: {
    labelZh: "算法",
    labelEn: "Algorithms",
    categories: ["leetcode", "pandasNumpy"],
    type: "oa"
  },
  cpp: {
    labelZh: "C++",
    labelEn: "C++ programming",
    categories: ["cppProgramming", "leetcode"],
    type: "technical"
  },
  ml: {
    labelZh: "ML",
    labelEn: "Machine learning",
    categories: ["machineLearning", "deepLearning", "statistics"],
    type: "technical"
  },
  market: {
    labelZh: "市场直觉",
    labelEn: "Trading intuition",
    categories: ["market", "option", "mentalMath"],
    type: "technical"
  },
  marketMaking: {
    labelZh: "做市",
    labelEn: "Market making",
    categories: ["market", "mentalMath", "option"],
    type: "technical"
  },
  behavioral: {
    labelZh: "行为面",
    labelEn: "Behavioral",
    categories: [],
    type: "behavioral"
  },
  resume: {
    labelZh: "简历深挖",
    labelEn: "Resume deep dive",
    categories: [],
    type: "behavioral"
  },
  research: {
    labelZh: "研究项目深挖",
    labelEn: "Research project",
    categories: [],
    type: "behavioral"
  }
};

export const interviewOnboardingSteps = ["language", "mode", "focus", "difficulty", "scope", "persona"];

export const behavioralInterviewTopics = [
  ["behavioral-impact", "High-impact project story", "高影响力项目经历", "Tell me about a project where you created measurable impact. Use a clear situation, task, action, and result structure.", "讲一个你做出可量化影响的项目经历。请用 Situation、Task、Action、Result 的结构回答。", "impact", "Medium", "leetcode"],
  ["behavioral-conflict", "Disagreement with a teammate", "和队友意见不一致", "Describe a time you disagreed with a teammate or mentor. How did you handle it and what changed afterward?", "讲一次你和队友或 mentor 意见不一致的经历。你如何处理，最后有什么改变？", "teamwork", "Medium", "market"],
  ["behavioral-failure", "Failure and learning", "失败和复盘", "Tell me about a failure or mistake. What did you learn, and how did you change your process?", "讲一次失败或犯错经历。你学到了什么，后来如何改变流程？", "reflection", "Medium", "statistics"],
  ["behavioral-pressure", "Working under pressure", "压力下完成任务", "Describe a time you had to make progress under time pressure or ambiguity.", "讲一次你在时间压力或信息不完整的情况下推进任务的经历。", "pressure", "Medium", "option"],
  ["behavioral-why-quant", "Why quant finance", "为什么选择量化", "Why are you interested in quant finance, and what evidence shows you are prepared for it?", "你为什么想做量化？有哪些经历证明你准备好了？", "motivation", "Easy", "market"],
  ["behavioral-why-firm", "Why this firm", "为什么选择这家公司", "Why are you interested in this firm or desk? Give a specific reason beyond prestige.", "你为什么对这家公司或这个 desk 感兴趣？请给出具体原因，而不是只说名气。", "motivation", "Easy", "market"],
  ["behavioral-leadership", "Leading without authority", "无职权领导", "Tell me about a time you led a group without formal authority.", "讲一次你在没有正式职权时推动团队前进的经历。", "leadership", "Medium", "leetcode"],
  ["behavioral-fast-learning", "Learning a hard topic fast", "快速学习陌生领域", "Describe a time you had to learn a difficult technical topic quickly.", "讲一次你必须快速掌握一个困难技术主题的经历。", "learning", "Medium", "machineLearning"],
  ["behavioral-ambiguous-data", "Ambiguous data decision", "数据不完整时做判断", "Tell me about a time you made a decision with incomplete or noisy data.", "讲一次你在数据不完整或噪声很大时做判断的经历。", "judgment", "Hard", "statistics"],
  ["behavioral-ethical-tradeoff", "Ethical tradeoff", "伦理或合规取舍", "Describe a time you faced an ethical, fairness, or compliance tradeoff.", "讲一次你面对伦理、公平或合规取舍的经历。", "judgment", "Hard", "market"],
  ["behavioral-feedback", "Receiving tough feedback", "接受尖锐反馈", "Tell me about tough feedback you received and what changed afterward.", "讲一次你收到尖锐反馈，以及之后实际改变了什么。", "reflection", "Medium", "statistics"],
  ["behavioral-give-feedback", "Giving difficult feedback", "给别人困难反馈", "Describe a time you had to give difficult feedback to a teammate.", "讲一次你需要给队友困难反馈的经历。", "communication", "Medium", "leetcode"],
  ["behavioral-prioritization", "Prioritizing under constraint", "资源有限时排序", "Tell me about a time you had more work than time. How did you prioritize?", "讲一次任务多于时间时，你如何排序和取舍。", "execution", "Medium", "market"],
  ["behavioral-ownership", "Taking ownership", "主动承担责任", "Describe a time you took ownership of a problem nobody clearly owned.", "讲一次你主动承担一个没人明确负责的问题。", "ownership", "Medium", "leetcode"],
  ["behavioral-missed-deadline", "Missed deadline", "错过截止日期", "Tell me about a time you missed a deadline or almost missed one.", "讲一次你错过或差点错过截止日期的经历。", "execution", "Medium", "statistics"],
  ["behavioral-quality-speed", "Quality versus speed", "质量和速度取舍", "Describe a time you had to trade off speed and rigor.", "讲一次你必须在速度和严谨性之间取舍的经历。", "tradeoff", "Hard", "market"],
  ["behavioral-risk-taking", "Calculated risk", "有计算的冒险", "Tell me about a calculated risk you took. What made it worth taking?", "讲一次你做过的有计算的冒险。为什么值得？", "risk", "Medium", "option"],
  ["behavioral-change-mind", "Changing your mind", "改变观点", "Describe a time evidence made you change your mind.", "讲一次证据让你改变观点的经历。", "humility", "Medium", "statistics"],
  ["behavioral-deep-work", "Deep focus", "深度专注", "Tell me about a period when you needed sustained focus to solve a hard problem.", "讲一段你需要长时间深度专注解决难题的经历。", "execution", "Easy", "leetcode"],
  ["behavioral-simplify", "Simplifying complexity", "把复杂问题讲清楚", "Describe a time you simplified a complex idea for someone else.", "讲一次你把复杂问题解释给别人听的经历。", "communication", "Medium", "machineLearning"],
  ["behavioral-cross-functional", "Working across functions", "跨团队协作", "Tell me about a time you worked with people from a different background or function.", "讲一次你和不同背景或职能的人协作的经历。", "teamwork", "Medium", "market"],
  ["behavioral-mentoring", "Mentoring someone", "辅导他人", "Describe a time you helped someone else improve technically or analytically.", "讲一次你帮助别人提升技术或分析能力的经历。", "leadership", "Easy", "leetcode"],
  ["behavioral-competition", "Competitive pressure", "竞争压力", "Tell me about a time you were in a competitive environment. How did you respond?", "讲一次你处于竞争环境时如何应对。", "pressure", "Medium", "mentalMath"],
  ["behavioral-bug", "Hard-to-find bug", "难定位的问题", "Describe the hardest bug or error you found. How did you isolate it?", "讲一次你定位过的最难 bug 或错误。你如何隔离问题？", "debugging", "Medium", "leetcode"],
  ["behavioral-model-risk", "Model did not work", "模型效果不佳", "Tell me about a model, analysis, or strategy that did not work as expected.", "讲一次模型、分析或策略效果不如预期的经历。", "reflection", "Hard", "machineLearning"],
  ["behavioral-data-quality", "Data quality issue", "数据质量问题", "Describe a time a data quality issue changed your conclusion.", "讲一次数据质量问题改变你结论的经历。", "data", "Hard", "statistics"],
  ["behavioral-independent", "Independent initiative", "独立发起项目", "Tell me about something useful you built or investigated without being asked.", "讲一次你在没人要求的情况下主动做出的有价值项目或研究。", "initiative", "Medium", "leetcode"],
  ["behavioral-resilience", "Resilience after setback", "挫折后的恢复", "Describe a setback and how you recovered operationally, not just emotionally.", "讲一次挫折，以及你如何在行动上恢复，而不只是情绪上恢复。", "resilience", "Medium", "statistics"],
  ["behavioral-detail", "Attention to detail", "细节把关", "Tell me about a time attention to detail materially changed the outcome.", "讲一次细节把关明显改变结果的经历。", "rigor", "Medium", "option"],
  ["behavioral-disagree-senior", "Disagreeing with a senior person", "反对更资深的人", "Describe a time you disagreed with someone more senior than you.", "讲一次你和更资深的人意见不同的经历。", "communication", "Hard", "market"],
  ["behavioral-unclear-goal", "Unclear goal", "目标不清晰", "Tell me about a time the goal was unclear. How did you define success?", "讲一次目标不清晰时，你如何定义成功标准。", "execution", "Medium", "statistics"],
  ["behavioral-scope-cut", "Reducing scope", "削减范围", "Describe a time you reduced scope to ship something useful.", "讲一次你为了交付有用结果而缩小范围的经历。", "execution", "Medium", "leetcode"],
  ["behavioral-research-defense", "Defending a conclusion", "捍卫结论", "Tell me about a time you had to defend an analysis against skeptical questions.", "讲一次你必须面对质疑捍卫分析结论的经历。", "defense", "Hard", "statistics"],
  ["behavioral-help-request", "Asking for help", "主动求助", "Describe a time you asked for help effectively.", "讲一次你有效求助的经历。", "humility", "Easy", "leetcode"],
  ["behavioral-calibration", "Calibrating confidence", "校准信心", "Tell me about a time you were overconfident or underconfident. How did you recalibrate?", "讲一次你过度自信或不够自信，以及你如何校准。", "reflection", "Hard", "statistics"],
  ["behavioral-user-impact", "User or stakeholder impact", "用户或利益相关方影响", "Describe a time you changed your work after understanding a user or stakeholder better.", "讲一次你更理解用户或利益相关方后改变工作方式的经历。", "impact", "Medium", "market"],
  ["behavioral-long-term", "Long-term commitment", "长期投入", "Tell me about a long project where motivation was hard to maintain.", "讲一次长期项目中你如何保持推进。", "resilience", "Medium", "leetcode"],
  ["behavioral-trade-idea", "Market idea communication", "表达交易想法", "Describe a time you explained a market or investment idea clearly.", "讲一次你清晰表达市场或投资想法的经历。", "market", "Medium", "market"],
  ["behavioral-automation", "Automation impact", "自动化带来的影响", "Tell me about a task you automated. What did it save and what new risk did it create?", "讲一次你自动化某个任务。它节省了什么，又带来了什么新风险？", "automation", "Medium", "leetcode"],
  ["behavioral-noisy-feedback", "Conflicting feedback", "反馈相互矛盾", "Describe a time different people gave conflicting feedback. How did you decide what to do?", "讲一次不同人给出矛盾反馈时，你如何决定怎么做。", "judgment", "Hard", "statistics"],
  ["behavioral-team-failure", "Team failure", "团队失败", "Tell me about a team failure. What was your role in the outcome?", "讲一次团队失败。你在结果中承担什么责任？", "ownership", "Hard", "market"],
  ["behavioral-culture-add", "Culture add", "你能带来什么文化增量", "What would teammates learn from working with you?", "队友和你共事会从你身上学到什么？", "self-awareness", "Easy", "leetcode"],
  ["behavioral-last-minute", "Last-minute change", "最后一刻变化", "Describe a time requirements changed late. What did you do first?", "讲一次需求在最后阶段改变时，你第一步做了什么。", "adaptability", "Medium", "market"],
  ["behavioral-technical-debt", "Technical debt", "技术债", "Tell me about a time you chose to accept or repay technical debt.", "讲一次你选择接受或偿还技术债的经历。", "tradeoff", "Hard", "leetcode"],
  ["behavioral-bias", "Bias in your own analysis", "发现自己的分析偏差", "Describe a time you discovered bias in your own analysis.", "讲一次你发现自己分析中存在偏差的经历。", "rigor", "Hard", "statistics"],
  ["behavioral-low-data", "Small sample decision", "小样本决策", "Tell me about a time you had to reason from a small sample.", "讲一次你必须基于小样本进行推理的经历。", "judgment", "Medium", "statistics"],
  ["behavioral-presentation", "High-stakes presentation", "高压汇报", "Describe a high-stakes presentation or demo. How did you prepare?", "讲一次高压汇报或 demo。你如何准备？", "communication", "Medium", "machineLearning"],
  ["behavioral-repetitive-task", "Staying sharp on repetitive work", "重复任务中保持准确", "Tell me about a repetitive task where accuracy mattered.", "讲一次重复性任务中准确性很重要的经历。", "rigor", "Easy", "mentalMath"],
  ["behavioral-open-ended", "Open-ended problem", "开放问题", "Describe the most open-ended problem you have worked on.", "讲一次你做过的最开放的问题。", "ambiguity", "Hard", "machineLearning"],
  ["behavioral-values", "Values under pressure", "压力下坚持原则", "Tell me about a time pressure tested one of your values.", "讲一次压力考验你某个原则的经历。", "values", "Hard", "market"],
  ["behavioral-interviewer-question", "Question for interviewer", "反问面试官", "What is one thoughtful question you would ask a quant interviewer at the end?", "如果面试最后让你反问，你会问一个什么有含金量的问题？", "closing", "Easy", "market"],
  ["behavioral-weakness", "Current weakness", "当前短板", "What is one weakness you are actively working on, and what evidence shows progress?", "你正在改进的一个短板是什么？有什么证据说明你在进步？", "self-awareness", "Medium", "statistics"]
];

export const behavioralInterviewProblems = behavioralInterviewTopics.map(([id, titleEn, titleZh, promptEn, promptZh, tag, difficulty, category]) => ({
  id,
  titleEn,
  titleZh,
  category,
  difficulty,
  tags: ["behavioral", "STAR", tag],
  promptEn,
  promptZh,
  answer: "Use a concrete STAR structure. Name your role, quantify the situation when possible, explain the tradeoff, and end with learning.",
  explanation: "Strong behavioral answers are specific, personally owned, evidence-based, and reflective without sounding rehearsed."
}));

export const resumeDeepDiveProblems = [
  ["resume-ownership", "Ownership of a resume project", "简历项目 ownership", "Pick one resume project. What exactly was your personal contribution, and what would not have happened without you?", "选一个简历项目。你具体负责哪一部分？如果没有你，哪些结果不会发生？", "ownership"],
  ["resume-hardest-detail", "Hardest technical detail", "最难技术细节", "Choose a project and explain the hardest technical detail at implementation level.", "选一个项目，把最难的技术细节讲到实现层面。", "technical-depth"],
  ["resume-metric", "Project success metric", "项目成功指标", "How did you measure whether this project worked? What baseline did you compare against?", "你如何衡量这个项目是否成功？和什么 baseline 比较？", "metric"],
  ["resume-tradeoff", "Design tradeoff", "设计取舍", "What was the most important design tradeoff in this project?", "这个项目里最重要的设计取舍是什么？", "tradeoff"],
  ["resume-bug-risk", "Failure mode", "失败模式", "What could break this project in production or under real market data?", "这个项目在生产环境或真实市场数据下可能哪里会坏？", "risk"],
  ["resume-reproduce", "Reproducibility", "可复现性", "If I asked you to reproduce the result from scratch, what steps and dependencies matter most?", "如果我让你从零复现结果，哪些步骤和依赖最关键？", "reproducibility"],
  ["resume-critique", "Self critique", "自我质疑", "What is the strongest critique of this project, and how would you respond?", "对这个项目最强的质疑是什么？你会如何回应？", "defense"],
  ["resume-next-version", "Next version", "下一版改进", "If you had two more weeks, what would you change first and why?", "如果你还有两周，最先改什么？为什么？", "iteration"]
].map(([id, titleEn, titleZh, promptEn, promptZh, tag]) => ({
  id,
  titleEn,
  titleZh,
  category: "machineLearning",
  difficulty: "Hard",
  tags: ["resume", "deep-dive", tag],
  promptEn,
  promptZh,
  answer: "Anchor the answer in a specific project. Show ownership, technical depth, measurement, risk awareness, and honest reflection.",
  explanation: "Resume deep dives test whether the candidate truly built and understood the work on the page."
}));

export const researchDeepDiveProblems = [
  ["research-hypothesis", "Research hypothesis", "研究假设", "What hypothesis did your research project test, and why was it plausible?", "你的研究项目检验了什么假设？为什么这个假设有合理性？", "hypothesis"],
  ["research-data", "Data construction", "数据构造", "How did you construct the dataset, and what data quality issue worried you most?", "你如何构造数据集？最担心的数据质量问题是什么？", "data"],
  ["research-method", "Method choice", "方法选择", "Why did you choose this method over a simpler baseline?", "为什么选择这个方法，而不是更简单的 baseline？", "method"],
  ["research-bias", "Look-ahead or selection bias", "前视偏差或选择偏差", "If I accuse the project of look-ahead bias or selection bias, how do you check that?", "如果我质疑这个项目有前视偏差或选择偏差，你怎么检查？", "bias"],
  ["research-robustness", "Robustness check", "稳健性检验", "What robustness check would make you trust the result more?", "什么稳健性检验会让你更相信结果？", "robustness"],
  ["research-economics", "Economic intuition", "经济直觉", "What is the economic or behavioral intuition behind the result?", "结果背后的经济或行为直觉是什么？", "intuition"],
  ["research-live-market", "Live market translation", "落到真实市场", "What would change if this research were deployed in a live trading setting?", "如果这个研究要落到真实交易环境，什么会改变？", "deployment"],
  ["research-negative-result", "Negative result", "负结果", "Tell me about the strongest negative result or failed experiment in this project.", "讲一个这个项目里最强的负结果或失败实验。", "negative-result"]
].map(([id, titleEn, titleZh, promptEn, promptZh, tag]) => ({
  id,
  titleEn,
  titleZh,
  category: "statistics",
  difficulty: "Hard",
  tags: ["research", "deep-dive", tag],
  promptEn,
  promptZh,
  answer: "Give the hypothesis, data construction, baseline, validation, failure mode, and economic intuition.",
  explanation: "Research deep dives test rigor, ownership, robustness, and ability to defend assumptions."
}));
