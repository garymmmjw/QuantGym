import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useSyncModuleRoute } from '../../hooks/useSyncModuleRoute.js';
import { LearningAccessGate } from './LearningAccessGate.jsx';
import { useLearningSources } from './useLearningSources.js';
import { useLearningState } from './useLearningState.js';
import { trainingTopicName } from './trainingLabels.mjs';
import { TOPICS, ROLE_REL } from './scoring/scoring-model.mjs';
import './readiness.css';

const ROLES = { qt: '量化交易', qr: '量化研究', qd: '量化开发', unsure: '综合探索' };
const LEVELS = { beginner: '入门', undergrad: '本科基础', graduate: '研究生基础', phd: '研究水平' };
const MACROS = { prob: '概率与统计', la: '线性代数', prog: '编程', fin: '金融' };
const pct = value => Math.round(Number(value || 0) * 100);
const num = value => Number(value || 0).toFixed(2).replace(/\.00$/, '');
export const wengProblemLink = problem => `/problems?bank=quantvault&question=quantvault-${problem.di ?? problem.quantvault?.displayId}&from=readiness`;

function Meter({ value, label }) {
  return <div className="qg-learning-meter" role="meter" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={value}><span style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div>;
}

export function ReadinessPage() {
  useSyncModuleRoute('readiness');
  return <LearningAccessGate title="能力与 Offer Bar"><ReadinessWorkspace /></LearningAccessGate>;
}

function ReadinessWorkspace() {
  const { sources, loading, error, refresh } = useLearningSources();
  const state = useLearningState(sources);
  const [message, setMessage] = useState('');
  const [openModule, setOpenModule] = useState('');
  const [calibrationTopic, setCalibrationTopic] = useState('probability');
  const [calibrationDiff, setCalibrationDiff] = useState('medium');
  const firms = useMemo(() => [...new Set((sources?.problemsIndex || []).flatMap(p => p.co || []))].sort(), [sources]);
  if (loading || (!sources && !error)) return <div className="qg-readiness-page" role="status">正在连接课程、翁家宝典与评分记录…</div>;
  if (error || state.error) return <div className="qg-readiness-page" role="alert"><h1>暂时无法读取评分</h1><p>{error || state.error}</p><button onClick={() => error ? refresh() : state.refresh()}>重试</button></div>;
  if (!state.report) return <div className="qg-readiness-page" role="status">正在读取当前账号的学习记录…</div>;
  const { profile, report, learnProgress } = state;
  const { topics, diagnostics } = report.bar;
  const eligible = topics.filter(t => t.evidenced).length;
  const downloaded = new Set(sources.downloadedProblemIds.map(String));
  const byId = Object.fromEntries(sources.problemsIndex.map(p => [String(p.id), p]));
  const change = async patch => {
    try { await state.updatePreferences(patch); setMessage('偏好已保存到账号云端，评分已重新计算。'); }
    catch (cause) { setMessage(cause.message); }
  };
  return <main className="qg-readiness-page">
    <header className="qg-readiness-head"><div><span className="qg-learning-kicker">翁家宝典 · 学习评估</span><h1>能力与 Offer Bar</h1><p>让每一次练习成为可解释的进步。</p></div><div className="qg-learning-links"><Link to="/learn">Learn 课程</Link><Link to="/problems?bank=quantvault">去练习 ↗</Link></div></header>
    <p className="qg-learning-note" role="status">{state.syncing ? '正在同步账号档案…' : '云端已同步 · 学习进度、作答记录与评分偏好随账号保留'}</p>
    <section className="qg-readiness-summary" aria-label="准备度总览">
      <div className="qg-readiness-offer"><div><span>面试准备度</span><strong>{eligible ? `${report.bar.readiness}%` : '未评估'}</strong></div><div className="qg-readiness-bar"><Meter value={eligible ? report.bar.readiness : 0} label="准备度" /><span className="qg-readiness-target">Offer Bar 75%</span></div><p>{eligible ? `${eligible} 个主题有足够证据参与计算。` : '先在翁家宝典记录练习结果；主题达到 3 份证据后参与综合评分。'}目标线是训练参考，不是获得 offer 的概率。</p></div>
      <div className="qg-readiness-stat"><span>已完成题目</span><strong>{report.solvedCount}<small> / {sources.records.length}</small></strong><p>已尝试 {report.attemptedCount} 道</p></div>
      <div className="qg-readiness-stat"><span>Learn 课程</span><strong>{learnProgress.completed.length}<small> / {sources.library.lessons?.length || 99}</small></strong><p>课程与能力分别记录</p></div>
      <div className="qg-readiness-stat"><span>成长等级 Lv.{report.level.level}</span><strong>{report.totalXp}<small> XP</small></strong><Meter value={report.level.percent} label="成长等级进度" /><p>课程 {report.learnXp} · 练习 {report.problemXp}</p></div>
    </section>
    <section className="qg-readiness-section"><div className="qg-readiness-section-head"><h2>选择你的方向</h2><span>改变汇总权重，不改写已有作答</span></div><fieldset className="qg-readiness-cloud-controls" disabled={state.syncing}><div className="qg-readiness-roles" role="group" aria-label="目标岗位">{Object.keys(ROLE_REL).map(role => <button type="button" key={role} aria-pressed={profile.prefs.role === role} onClick={() => change({ role })}>{ROLES[role]}<small>{role === 'unsure' ? 'Quant' : role.toUpperCase()}</small></button>)}</div>
      <details className="qg-readiness-preferences"><summary>公司、重点主题与基础偏好</summary><div className="qg-readiness-preference-grid"><label>训练目标<select value={profile.prefs.level} onChange={event => change({ level: event.target.value })}>{Object.entries(LEVELS).map(([key, text]) => <option key={key} value={key}>{text}</option>)}</select><small>只改变下一步训练的目标难度。</small></label><label>目标公司<select multiple size={5} value={profile.prefs.targetFirms} onChange={event => change({ targetFirms: [...event.target.selectedOptions].map(o => o.value) })}>{firms.map(firm => <option key={firm}>{firm}</option>)}</select><small>按住 Command / Ctrl 多选。匹配至少 10 题时应用公司权重；当前匹配 {report.roleWeights.firmMatchedCount} 题。</small></label></div><fieldset><legend>重点主题 · 每个主题在归一化前加 0.5</legend><div className="qg-readiness-checks">{TOPICS.map(topic => <label key={topic}><input type="checkbox" checked={profile.prefs.targets.includes(topic)} onChange={event => change({ targets: event.target.checked ? [...profile.prefs.targets, topic] : profile.prefs.targets.filter(t => t !== topic) })} />{trainingTopicName(topic)}</label>)}</div></fieldset><div className="qg-readiness-selfratings">{Object.entries(MACROS).map(([macro, title]) => <label key={macro}>{title}<select value={profile.prefs.rate[macro] || ''} onChange={event => { const rate = { ...profile.prefs.rate }; if (event.target.value) rate[macro] = event.target.value; else delete rate[macro]; change({ rate }); }}><option value="">未自评</option><option value="shaky">还不稳</option><option value="ok">基本熟悉</option><option value="strong">很熟悉</option></select></label>)}</div><p className="qg-learning-note">基础自评只调整能力先验，不增加答题证据。未作答的主题仍显示未评估。</p>
        <details><summary>录入个人初测结果（本地补充）</summary><p>只录入实际完成的初测结果。本地界面不自动出题或验证答案；这些记录会参与能力与准备度。</p><div className="qg-readiness-calibration"><select aria-label="初测主题" value={calibrationTopic} onChange={e => setCalibrationTopic(e.target.value)}>{TOPICS.map(topic => <option key={topic} value={topic}>{trainingTopicName(topic)}</option>)}</select><select aria-label="初测难度" value={calibrationDiff} onChange={e => setCalibrationDiff(e.target.value)}><option value="easy">基础</option><option value="medium">进阶</option><option value="hard">挑战</option></select><button onClick={() => change({ calibration: [...profile.prefs.calibration, { topic: calibrationTopic, diff: calibrationDiff, x: 1 }] })}>录入答对</button><button onClick={() => change({ calibration: [...profile.prefs.calibration, { topic: calibrationTopic, diff: calibrationDiff, x: 0 }] })}>录入答错</button></div>{profile.prefs.calibration.length > 0 && <p>已录入 {profile.prefs.calibration.length} 条初测。<button onClick={() => change({ calibration: profile.prefs.calibration.slice(0, -1) })}>撤销最近一条</button></p>}</details>
      </details></fieldset>{state.syncing && <p role="status">正在同步账号档案…</p>}{message && <p role="status">{message}</p>}
    </section>
    <section className="qg-readiness-section"><div className="qg-readiness-section-head"><h2>17 个主题的掌握度</h2><span>{eligible} / 17 可参与准备度</span></div><p>掌握度由能力值换算，并非正确率。少于 3 份证据不参与准备度，少于 4 份仍提示证据较少。</p><div className="qg-readiness-topics">{topics.map(topic => <article key={topic.topic} className="qg-readiness-topic"><div><h3>{trainingTopicName(topic.topic)}</h3><span>{!topic.assessed ? '未评估' : topic.evidence < 4 ? '证据较少' : '已评估'}</span></div><strong>{topic.assessed ? `${pct(topic.mastery)}%` : '—'}</strong><Meter value={topic.assessed ? pct(topic.mastery) : 0} label={`${trainingTopicName(topic.topic)}掌握度`} /><p>证据 {num(topic.evidence)} · 权重 {num(topic.relevance)}{topic.isCore ? ' · 岗位核心' : ''}</p><Link to={`/problems?bank=quantvault&group=${topic.topic}`}>练习这个主题 →</Link></article>)}</div></section>
    <section className="qg-readiness-section"><div className="qg-readiness-section-head"><h2>下一步练什么</h2><Link to="/learn">搭配 Learn 课程 →</Link></div><div className="qg-readiness-recommendations">{report.recommendations.map(p => <Link key={p.id} to={wengProblemLink(p)}><span>{trainingTopicName(p.topic)} · #{p.di}</span><strong>{p.title}</strong><small>{p.abilityFrozen ? '30 天内重练：保留首次能力证据' : '按主题需求与当前能力推荐'} ↗</small></Link>)}</div></section>
    <section className="qg-readiness-section"><div className="qg-readiness-section-head"><h2>11 个练习模块</h2><span>按当前岗位排序</span></div><p>完成率以模块全部题目为分母；当前本地没有正文的题目保留占位，不算已完成。</p><div className="qg-readiness-modules">{report.moduleProgress.map(module => { const original = sources.modules.modules.find(item => item.id === module.id); return <article key={module.id}><button className="qg-readiness-module-toggle" aria-expanded={openModule === module.id} onClick={() => setOpenModule(openModule === module.id ? '' : module.id)}><span><strong>{module.title}</strong><small>{module.done} / {module.total} 题完成</small></span><b>{module.pct}%</b></button><Meter value={module.pct} label={`${module.title}完成率`} />{openModule === module.id && <ul>{original.problems.map(p => <li key={p.id}><span>{profile.progress[p.id] === 'solved' ? '✓' : '○'}</span>{downloaded.has(String(p.id)) ? <Link to={wengProblemLink(p)}>#{p.di} · {p.t}</Link> : <span>#{p.di} · {p.t}<small>本地尚无正文</small></span>}</li>)}</ul>}</article>; })}</div></section>
    <section className="qg-readiness-section"><h2>最近练习记录</h2>{report.recentEvents.length ? <ol className="qg-readiness-history">{report.recentEvents.slice(0, 8).map(event => <li key={event.id}><div><strong>{event.reveal ? '未解出 · 已看解答' : event.x === 1 ? '答对' : event.pc > 0 ? `部分正确 ${pct(event.pc)}%` : '答错'}</strong><Link to={wengProblemLink(byId[event.problemId])}>#{byId[event.problemId]?.di} · {byId[event.problemId]?.t}</Link><small>{new Date(event.at).toLocaleString('zh-CN')}{event.h ? ' · 使用提示' : ''}{event.abilityFrozen ? ' · 30 天能力冻结' : ' · 能力记录已更新'}</small></div><b>+{event.deltaXp} XP</b></li>)}</ol> : <p>还没有人工自评记录。打开翁家宝典的一道题，完成后提交结果即可。</p>}</section>
    <section className="qg-readiness-section qg-readiness-rules"><h2>分数是怎样算的</h2><details><summary>REA 确认的原站规则</summary><p>依据 2026-10-15 捕获的公开客户端代码，并于 2026-10-16 使用 REA 核对。以下描述已取得代码的计算行为，未声称完整复刻原站私有后端。</p><ul><li>题目结果按难度参数更新能力：正确/错误看的是实际结果与预测答对概率的差。难题答对通常增加更多，容易题答错通常下降更多。</li><li>v2 使用拟合难度、猜测参数和部分得分；使用提示后，将结果信用值 x（或部分得分）乘 {sources.difficultyV2?._meta?.hintCredit ?? 0.6}，再与预测答对概率比较，计算能力变化。多条提示只处理一次；能力最终增量并非简单打六折。</li><li>每题 30 天内保留首次能力记录，满 30 天再作答可替换。首次全对获得 easy 10 / medium 25 / hard 50 XP，以后不重复发放。</li><li>课程首次完成基础 20 XP，测验 bonus 最多 100 XP。Learn 完成和 XP 不进入主题能力与 Offer Bar。</li><li>岗位权重 = 35% 基础重要性 + 65% 岗位重要性；匹配公司 ≥ 10 题时再混合公司分布，重点主题 +0.5、保底 +0.05，再按最大值归一化。</li><li>准备度 = 有效主题的加权掌握度 × 参与系数 × 100，四舍五入并限制 2–99；Offer Bar 固定为 75%。</li><li>参与系数 = base + (1−base) × N/(N+130)，base = 0.72 × A/(A+2)；A 为初测记录数，N 为已尝试题数。</li></ul><p>当前：加权掌握度 {pct(diagnostics.skill)}% × 参与系数 {pct(diagnostics.engagement)}%；初测 {diagnostics.assessmentCount} 条，练习 {diagnostics.progressCount} 题。</p><div className="qg-readiness-weight-table"><table><thead><tr><th>主题</th><th>基础</th><th>岗位</th><th>公司后</th><th>重点</th><th>最终</th></tr></thead><tbody>{report.roleWeights.topics.map(t => <tr key={t.topic}><td>{trainingTopicName(t.topic)}</td><td>{num(t.intrinsic)}</td><td>{num(t.rawRole)}</td><td>{num(t.afterFirmMix)}</td><td>{num(t.targetBoost)}</td><td>{num(t.final)}</td></tr>)}</tbody></table></div></details><details><summary>本地补充与边界</summary><ul><li>固定使用 v2；参数缺失时明确回退 v1。当前模型：{report.modelInfo.effectiveModel.toUpperCase()}。</li><li>开放题由你诚实自评；查看解答后提交只记「未解出」，不奖励 XP。并未接入原站自动判分或服务器反作弊。</li><li>仅完整答对且未先看解答算完成。部分正确不发完整题目 XP；答对后再看解答不撤销先前成绩。</li><li>普通练习保持原来的 24 小时计数窗口；能力使用独立的 30 天规则。同一次提交只写一条评分事件。</li><li>课程原客户端的 60 课奖励上限在本地解除，以覆盖全部 99 课；每课仍只奖励一次。</li><li>无证据显示未评估。下一题推荐、初测手工录入和账号云端同步由 QuantGym 实现。仅迁移当前账号的浏览器存档，不导入旧预览或其他账号记录。</li></ul></details></section>
    <footer className="qg-learning-note">记录已按登录账号保存到云端，换浏览器或设备登录后可恢复。课程和练习使用同一份成长档案；不会写入原网站账户。保存需要联网；未确认成功时请保留页面并重试。</footer>
  </main>;
}
