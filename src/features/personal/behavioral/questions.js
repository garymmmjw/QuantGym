export const BEHAVIORAL_PREP_QUESTIONS = [
  {
    id: 'general-introduction', section: 'general', title: 'Tell me about yourself.', label: 'Quick introduction', titleZh: '简短介绍一下你自己', duration: '45–60 sec',
    guide: ['现在：用一句话介绍你的学习或工作方向。', '过去：选一段与目标岗位最相关的真实经历，讲清你做了什么。', '未来：说明这段经历如何引向你现在申请的岗位。'],
    guideEn: ['Present: introduce your current academic or professional focus in one sentence.', 'Past: choose one relevant experience and explain your own contribution.', 'Future: connect that experience to the role you are pursuing.'],
    cue: 'Present → relevant experience → why this role',
  },
  {
    id: 'general-strength', section: 'general', title: 'What is your greatest strength?', label: 'Your strength', titleZh: '你最大的优势是什么？', duration: '60–90 sec',
    guide: ['只选一个与岗位相关的优势，例如拆解问题、沟通或执行。', '用一个真实的小例子说明你的行动和可观察的结果。', '结尾解释这个优势会如何帮助你胜任岗位。'],
    guideEn: ['Choose one strength relevant to the role, such as problem solving, communication, or execution.', 'Use one real example with your actions and an observable result.', 'Explain how this strength will help you contribute in the role.'],
    cue: 'Strength → evidence → relevance',
  },
  {
    id: 'general-weakness', section: 'general', title: 'What is a weakness you are working on?', label: 'Your weakness', titleZh: '你正在改进的不足是什么？', duration: '60–90 sec',
    guide: ['选择真实、具体的不足，说明它曾造成什么影响。', '讲清你已经采取的改进措施，而非只说“我会努力”。', '用近期的变化证明进步，也可以坦诚还有哪些地方需要练习。'],
    guideEn: ['Name a genuine, specific weakness and describe its impact.', 'Explain the concrete steps you have already taken to improve.', 'Show recent evidence of progress and what you are still working on.'],
    cue: 'Weakness → impact → action → progress',
  },
  {
    id: 'general-conflict', section: 'general', title: 'Tell me about a time you handled a conflict.', label: 'Handling a conflict', titleZh: '讲述一次你处理分歧的经历', duration: '90–120 sec',
    guide: ['Situation / Task：简述分歧是什么、双方为什么持不同意见，以及共同目标。', 'Action：重点说你如何倾听、澄清假设、提出证据或推动折中方案。', 'Result：交代决定、结果和你学到的东西，避免把对方写成反派。'],
    guideEn: ['Situation / Task: describe the disagreement, both perspectives, and the shared goal.', 'Action: focus on how you listened, clarified assumptions, used evidence, or proposed a compromise.', 'Result: explain the decision, outcome, and lesson without blaming the other person.'],
    cue: 'Situation → task → action → result',
  },
  {
    id: 'general-leadership', section: 'general', title: 'Tell me about a time you demonstrated leadership.', label: 'Showing leadership', titleZh: '讲述一次你发挥领导力的经历', duration: '90–120 sec',
    guide: ['选一个你主动推动事情的真实场景，不一定需要正式头衔。', '说明你如何明确目标、分工、帮助队友或处理关键障碍。', '区分“我做了什么”和“团队完成了什么”，最后总结结果与反思。'],
    guideEn: ['Choose a real situation where you took initiative; a formal title is not required.', 'Explain how you set direction, coordinated work, supported others, or removed a key obstacle.', 'Distinguish your contribution from the team’s outcome, then share the result and lesson.'],
    cue: 'Shared goal → initiative → team impact → lesson',
  },
  {
    id: 'bofa-why', section: 'company', company: 'Bank of America', title: 'Why Bank of America?', label: 'Why BofA?', titleZh: '为什么选择美国银行？', duration: '75–90 sec',
    cue: 'Business breadth → responsible growth → learning & contribution',
    guide: ['业务应用：从 BofA 的 Global Markets 业务切入，把量化分析与定价、对冲和风险管理联系起来。', '风险意识：用自己的语言解释 Responsible Growth 对你的吸引力，落到模型假设、局限和清晰沟通。', '个人连接：目前是 Quant 方向初稿；练习时补充一段你真实的项目或研究经历，让动机更具体。'],
    guideEn: ['Business relevance: connect BofA’s Global Markets business to your interest in pricing, hedging, and risk management.', 'Risk awareness: explain what Responsible Growth means to you through assumptions, limitations, and clear communication.', 'Personal connection: this is a draft for a quant role. Add one real project or research experience to make your motivation specific.'],
    answer: `I'm interested in Bank of America because I want to apply quantitative thinking to decisions that matter for clients and the business. Three things stand out to me.

First, the breadth of its Global Markets business. BofA works across equities, fixed income, currencies, and commodities, so what appeals to me is the connection between quantitative analysis and practical questions around pricing, hedging, and risk. I want to understand how a model becomes a useful decision tool.

Second, the bank's focus on Responsible Growth resonates with me. For a quant, I see that as a reason to understand a model's assumptions, test where it can fail, and communicate its limitations clearly. That is the kind of judgment I want to develop alongside my technical skills.

Finally, I'm attracted to the opportunity to learn from people with different market and technical perspectives. Early in my career, I want to build a strong foundation while contributing careful analysis and a willingness to ask questions. That combination of practical impact, risk awareness, and learning is why BofA appeals to me.`,
    sources: [
      { label: 'Global Markets', url: 'https://careers.bankofamerica.com/en-us/company/organization/global-markets' },
      { label: 'Responsible Growth', url: 'https://about.bankofamerica.com/en/our-company/responsible-growth' },
    ],
  },
];

export function getBehavioralAnswer(question, answers = []) {
  return answers.find(answer => answer.id === question.id)?.text ?? question.answer ?? '';
}
