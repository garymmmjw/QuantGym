import React, {useState} from 'react';
import {LEVEL_TARGET,TOPICS} from './scoring/scoring-model.mjs';
import {resolveProblemObservation} from './scoring/answer-engine.mjs';
import {trainingTopicName} from './training-labels.mjs';
import './training-explanations.css';

const fmt = value => Number(value).toLocaleString('zh-CN',{maximumFractionDigits:4});
const percent = value => `${fmt(value*100)}%`;

export function TrainingRules({profile,report,sources}) {
  const [topic,setTopic]=useState('probability');
  const diagnostics=report.bar.diagnostics,weights=report.roleWeights;
  const row=weights.topics.find(item=>item.topic===topic),skill=report.bar.topics.find(item=>item.topic===topic);
  const base=0.72*diagnostics.assessmentCount/(diagnostics.assessmentCount+2);
  const grind=diagnostics.progressCount/(diagnostics.progressCount+130);
  const target=LEVEL_TARGET[profile.prefs.level];
  const event=report.recentEvents[0],problem=event&&sources.problemsIndex.find(item=>String(item.id)===String(event.problemId));
  const recorded=problem&&profile.attempts[String(problem.id)];
  const observation=recorded&&resolveProblemObservation({problem,attempt:recorded,modelVersion:report.modelInfo.effectiveModel,difficultyV1:sources.difficultyV1,difficultyV2:sources.difficultyV2});
  const hintCredit=sources.difficultyV2?._meta?.hintCredit??0.6;
  return <section className="training-rules training-section" id="training-rules">
    <div className="training-section-title"><div><span className="training-eyebrow">SCORING · EVIDENCE & POLICY</span><h2>分数怎么算，规则从哪里来</h2></div><span className="training-count">当前 {report.modelInfo.effectiveModel} · 本地档案</span></div>
    <p className="training-section-intro">原站规则来自保存的浏览器脚本与 REA 分析，已用本地公式交叉核对。以下数字使用你当前的档案；不代表已验证原站服务器判分。</p>
    <details className="training-rule-details" open><summary>当前准备度 · 原站公式，本地固定模型</summary>
      <div className="training-formula-values"><div><span>有效主题掌握度 S</span><b>{percent(diagnostics.skill)}</b></div><div><span>独立初测 A</span><b>{diagnostics.assessmentCount} 条</b></div><div><span>不同练习题 N</span><b>{diagnostics.progressCount} 题</b></div><div><span>参与系数</span><b>{percent(diagnostics.engagement)}</b></div></div>
      <p className="training-equation">初测基线 = 0.72 × A / (A + 2) = {fmt(base)}<br/>参与系数 = 基线 + (1 − 基线) × N / (N + 130) = {fmt(base)} + {fmt(1-base)} × {fmt(grind)}<br/>准备度 = 限制在 2–99 之间的 round(100 × S × 参与系数) = <b>{report.bar.readiness}%</b></p>
      <p>只有证据 ≥ 3 的主题进入 S；按其综合权重求加权均值。答错也计入不同练习题 N，但不会自动提升主题能力。75% 是原站参考线。Learn、XP 和模块完成率均不直接进入此式。</p>
      {!report.bar.topics.some(item=>item.evidenced)&&<p><span className="training-source-tag training-source-tag--local">本地展示</span> 当前没有主题达到证据门槛，首页显示“未评估”；上面的 {report.bar.readiness}% 只是公式保底值。</p>}
    </details>
    <details className="training-rule-details"><summary>答对、答错、难度、提示与冷却 · 原站规则</summary>
      <p className="training-equation">预期得分 p = c + (1 − c) × sigmoid(θ − b)<br/>更新幅度 K = 0.9 × 主题分配权重 / √(1 + 已有证据)<br/>新能力 θ = 旧能力 θ + K × (有效得分 − p)</p>
      <ul><li>答对为 1、答错为 0；v2 的部分分先保留三位小数再使用。使用提示后，正向得分再乘 {hintCredit}。例如 1/3 分入账 0.333，使用提示后为 {fmt(0.333*hintCredit)}。</li><li>同样的能力下，难度 b 越高，预期 p 越低：答对提升更大，答错下降更小。得分低于预期时能力会下降，即使用提示完成也可能下降。c 为题目猜测下限。</li><li>主主题获得 1 份证据；映射出的次要主题共同分配 0.25，次要主题不加猜测下限。掌握度 = clamp((θ + 1.15) / 2.1, 0, 1)。评级 = round(1200 + 300 × (θ − 0.105) / 0.49)。</li><li>同题不足 30 天保留旧能力记录；到期替换，不叠加。完成状态和首次 XP 独立更新。记录按“自评 → 初测 → 题号对象顺序”重算，不能把新结果简单追加到总分。</li></ul>
      {observation?.eligible&&<div className="training-record-explanation"><b>最近提交 #{problem.di} · {problem.t}</b><p>当前用于能力计算的记录：{recorded.pc!==undefined?`部分分 ${fmt(recorded.pc)}`:recorded.x===1?'答对 1':'答错 0'}{recorded.h?'，使用提示':''} → 有效得分 {fmt(observation.effectiveX)}。难度 b = {fmt(observation.b)}，猜测下限 c = {fmt(observation.c)}。</p><p>{event.abilityFrozen?'最近一次提交处于冷却期，上面仍是首次保留的能力记录，并非这次新输入。':'最近一次提交已更新本题能力记录。'} 这次提交 XP +{event.deltaXp}。</p></div>}
      <small>依据：recommender.js 的 observe / buildStateCore；auth.js 的 recordAttempt。v1 回退时不应用提示或部分分折扣。</small>
    </details>
    <details className="training-rule-details"><summary>岗位、公司、重点与推荐目标 · 原站权重</summary>
      <label className="training-rule-topic-select">拆解一个主题<select value={topic} onChange={event=>setTopic(event.target.value)}>{TOPICS.map(id=><option key={id} value={id}>{trainingTopicName(id)}</option>)}</select></label>
      <p className="training-equation">基础权重 = 0.35 × {fmt(row.intrinsic)}（主题重要性）+ 0.65 × {fmt(row.rawRole)}（岗位相关性）= {fmt(row.rawBlend)}<br/>{weights.firmMixApplied?<>公司混合 = 0.6 × {fmt(row.rawBlend)} + 0.4 × ({row.firmCount} / {weights.firmMatchedCount} × 17) = {fmt(row.afterFirmMix)}</>:<>公司混合未启用：{weights.firmMatchedCount} 道匹配题，需至少 10 道。</>}<br/>综合权重 = ({fmt(row.afterFirmMix)} + {row.targetBoost} 重点加分 + 0.05 底值) / {fmt(weights.normalization)} = <b>{fmt(row.final)}</b></p>
      <p>多个目标公司按题目并集合计，不重复统计同一道题；归一化除以 17 个主题中的最大权重，因此权重之和不必为 1。调整岗位、公司或重点不改变能力 θ，只改变汇总权重和推荐。</p>
      <p className="training-equation">推荐目标 θ = {target}；当前 {trainingTopicName(topic)} θ = {fmt(skill.theta)}<br/>缺口 = max(0, {target} − {fmt(skill.theta)}) = {fmt(Math.max(0,target-skill.theta))}<br/>优先级分 = 综合权重 × (缺口 + 0.15 / √(1 + 证据))</p>
      <p>目标学习程度只改变推荐缺口；本地再从已下载未完成题中挑选合适难度。模块顺序使用原站 roleOrder，完成率为已完成题数 / 模块总题数。</p>
      <small>依据：recommender.js 的 relevance / priorities；modules.js 的 orderForRole / stats。</small>
    </details>
    <details className="training-rule-details"><summary>来源边界 · 哪些是我们补充的</summary>
      <div className="training-provenance-grid"><div><h3><span className="training-source-tag">原站代码确认</span></h3><p>能力更新、难度与猜测参数、提示和部分分、次要主题证据、30 天能力账本、初测计入能力及准备度、岗位权重、3 / 4 份证据门槛、75% 参考线、模块顺序和完成率、题目 10 / 25 / 50 XP 与等级公式。</p></div><div><h3><span className="training-source-tag training-source-tag--local">本地补充 / 取舍</span></h3><p>固定使用 v2；缺参数回退 v1。人工记录题目和独立初测、完整非揭晓答案才完成及发 XP 的统一约束、证据不足显示“未评估”、已下载题推荐、个人 / 示例隔离、UTC 连续天数、备份恢复。新初测按难度标签选 b、c = 0；导入的显式参数保留。</p></div></div>
      <p>原站有按日期逐步混合 v1 / v2 的机制，本地有意固定模型，便于稳定使用。原站初测题目、自动判分细节和服务器私有实现尚未取得。</p>
      <small>证据：2026-10-15 保存的 recommender.js、auth.js、modules.js、explore-v2.js 与 problems.js；REA 6.5.0 分析及 2026-10-16 复查。REA 的调用图存在未解析动态项，不能用来证明未知的服务器行为。</small>
      <a className="training-local-link" href="?view=assessment&tab=answers">打开独立公式实验室（不使用当前训练档案） ↗</a>
    </details>
  </section>;
}
