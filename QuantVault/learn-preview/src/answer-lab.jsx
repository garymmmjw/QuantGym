import React,{useEffect,useMemo,useState} from 'react';
import {B,TOPICS,TOPIC_LABELS,ROLE_LABELS,thetaToRating,ratingToTheta} from './scoring/scoring-model.mjs';
import {traceAnswerUpdate,resolveProblemObservation,roleWeightBreakdown} from './scoring/answer-engine.mjs';
import {readLocalJSON} from './local-json.js';
import './answer-lab.css';
import {AttemptLedgerDemo} from './attempt-ledger-demo.jsx';

const KEY='qvl-answer-lab-v1';
const DEFAULT={modelVersion:'v2',abilityMode:'theta',ability:'0',nObs:'0',b:'-0.1',c:'0',x:1,hint:false,pcEnabled:false,pc:'0.5',reveal:false,topic:'probability',paramMode:'manual',problemId:'',lookupTopic:'probability',focus:[],firm:''};
const n=value=>value!==''&&Number.isFinite(Number(value))?Number(value):null;
const f=(value,digits=4)=>Number(value).toFixed(digits);
const percent=value=>f(value*100,2)+'%';
const sign=(value,digits=4)=>(value>0?'+':'')+f(value,digits);
const title=topic=>TOPIC_LABELS[topic]||topic;
function readConfig(){try{const value=JSON.parse(localStorage.getItem(KEY));return{...DEFAULT,...value,focus:Array.isArray(value?.focus)?value.focus.filter(t=>TOPICS.includes(t)):[]};}catch{return{...DEFAULT};}}
function attemptFor(cfg,override={}){return{x:Number(cfg.x),...(cfg.hint?{h:1}:{}),...(cfg.pcEnabled?{pc:n(cfg.pc)}:{}),...(cfg.reveal?{r:'reveal'}:{}),...override};}

export function AnswerLab({problemsIndex,difficultyV1}) {
 const [cfg,setCfg]=useState(readConfig),[difficultyV2,setDifficultyV2]=useState(undefined);
 useEffect(()=>{readLocalJSON('./private/scoring/item-difficulty-v2.json',{fallback:null}).then(setDifficultyV2);},[]);
 useEffect(()=>{localStorage.setItem(KEY,JSON.stringify(cfg));},[cfg]);
 const selectedProblem=problemsIndex.find(p=>String(p.id)===String(cfg.problemId));
 const lookup=problemsIndex.filter(p=>p.c===cfg.lookupTopic);
 const companies=useMemo(()=>{const counts={};for(const p of problemsIndex)for(const co of new Set(p.co||[]))counts[co]=(counts[co]||0)+1;return Object.entries(counts).sort((a,b)=>a[0].localeCompare(b[0]));},[problemsIndex]);
 const weights=useMemo(()=>Object.fromEntries(Object.keys(ROLE_LABELS).map(role=>[role,roleWeightBreakdown({prefs:{role,targets:cfg.focus,targetFirms:cfg.firm?[cfg.firm]:[]},problemsIndex})])),[cfg.focus,cfg.firm,problemsIndex]);
 const calculation=useMemo(()=>{
  if(difficultyV2===undefined)return null;
  try{
   const ability=n(cfg.ability),nObs=n(cfg.nObs),partial=n(cfg.pc);
   if(ability===null||nObs===null||nObs<0)throw Error('请填写有效能力值及非负 nObs。');
   if(cfg.pcEnabled&&(partial===null||partial<0||partial>1))throw Error('部分分 pc 必须介于 0 与 1 之间。');
   const theta=cfg.abilityMode==='rating'?ratingToTheta(ability):ability;
   function resolve(override={}){
    const manual=override.b!==undefined||cfg.paramMode!=='problem';
    const problem=manual?{id:'local-answer-lab',di:'local-answer-lab',c:cfg.topic,d:override.difficulty||'medium',tg:[]}:selectedProblem;
    if(!problem)throw Error('请先选择一题，或切回手动参数。');
    const b=override.b??n(cfg.b),c=override.c??n(cfg.c);
    if(manual&&(b===null||c===null||c<0||c>1))throw Error('b 必须是有限数字；c 必须介于 0 与 1 之间。');
    const id=problem.di;
    const v1=manual?{b:{[id]:b}}:difficultyV1;
    const v2=manual?{b:{[id]:b},c:{[id]:c},_meta:{hintCredit:difficultyV2?._meta?.hintCredit??0.6}}:difficultyV2;
    const attempt=override.attempt||attemptFor(cfg);
    const resolved=resolveProblemObservation({problem,attempt,modelVersion:override.modelVersion||cfg.modelVersion,difficultyV1:v1,difficultyV2:v2});
    if(!resolved.eligible)throw Error('这个输入没有产生可评分观测。');
    const trace=traceAnswerUpdate({theta,nObs,...resolved.observation});
    return{problem,resolved,trace,attempt};
   }
   const main=resolve();
   const comparisons=Object.entries(B).flatMap(([difficulty,b])=>[1,0].flatMap(x=>[false,true].map(hint=>({difficulty,hint,x,...resolve({b,c:main.resolved.c,difficulty,modelVersion:main.resolved.modelVersion,attempt:{x,...(hint?{h:1}:{})}})}))));
   return{...main,comparisons};
  }catch(error){return{error:error.message};}
 },[cfg,difficultyV1,difficultyV2,selectedProblem]);
 const set=(key,value)=>setCfg(s=>({...s,[key]:value}));
 function setManual(key,value){setCfg(s=>({...s,paramMode:'manual',topic:calculation?.resolved?.topic||s.topic,b:String(calculation?.resolved?.b??s.b),c:String(calculation?.resolved?.c??s.c),[key]:value}));}
 function switchAbility(mode){const value=n(cfg.ability);setCfg(s=>({...s,abilityMode:mode,ability:value===null?'0':String(mode==='rating'?thetaToRating(value):ratingToTheta(value))}));}
 function toggleFocus(topic){setCfg(s=>({...s,focus:s.focus.includes(topic)?s.focus.filter(t=>t!==topic):[...s.focus,topic]}));}
 const trace=calculation?.trace,resolved=calculation?.resolved;
 const firmInfo=weights.qt;
 return <section className="answer-lab" lang="zh-CN" aria-labelledby="answer-lab-title">
  <header className="answer-lab-heading"><div><span className="assessment-eyebrow">独立本地计算 · 不写账户</span><h1 id="answer-lab-title">答题计分实验室</h1><p>检查同一份能力状态遇到不同题目、提示与部分分时，θ、评级和掌握度怎样变化。这里的输入单独保存，不修改原有 Offer Bar 场景或 Learn 进度。</p></div><button className="answer-lab-reset" onClick={()=>setCfg({...DEFAULT})}>重置实验参数</button></header>
  <div className="answer-lab-workbench">
   <section className="answer-lab-inputs" aria-labelledby="answer-input-title"><h3 id="answer-input-title">单次观测输入</h3>
    <div className="answer-lab-form-grid">
     <label>计分版本<select value={cfg.modelVersion} onChange={e=>set('modelVersion',e.target.value)}><option value="v1">v1：二元结果</option><option value="v2">v2：部分分／提示／猜测率</option></select></label>
     <label>输入能力的方式<select value={cfg.abilityMode} onChange={e=>switchAbility(e.target.value)}><option value="theta">潜在能力 θ</option><option value="rating">显示评级 Elo</option></select></label>
     <label>{cfg.abilityMode==='theta'?'作答前 θ':'作答前评级'}<input type="number" step="any" value={cfg.ability} onChange={e=>set('ability',e.target.value)} data-testid="answer-ability"/></label>
     <label>此前观察次数 nObs<input type="number" min="0" step="any" value={cfg.nObs} onChange={e=>set('nObs',e.target.value)} data-testid="answer-nobs"/></label>
     <label>题目难度 b<input type="number" step="any" value={cfg.paramMode==='problem'&&resolved?resolved.b:cfg.b} onChange={e=>setManual('b',e.target.value)} data-testid="answer-b"/></label>
     <label>猜测命中下限 c<input type="number" min="0" max="1" step="0.01" disabled={cfg.modelVersion==='v1'} value={cfg.modelVersion==='v1'?0:cfg.paramMode==='problem'&&resolved?resolved.c:cfg.c} onChange={e=>setManual('c',e.target.value)} data-testid="answer-c"/></label>
    </div>
    <div className="answer-lab-param-source">{cfg.paramMode==='problem'&&selectedProblem?<><b>来源：真实题 #{selectedProblem.di}</b><span>{selectedProblem.t}</span><span>b：{resolved?.bSource||'等待计算'}；c：{resolved?.cSource||'等待计算'}</span></>:<><b>来源：手动控制参数</b><span>修改 b / c 后进入手动模式；不是这道题真实的拟合参数。</span></>}</div>
    <details className="answer-lab-source-picker"><summary>载入真实题目的拟合参数</summary><label>题目分类<select value={cfg.lookupTopic} onChange={e=>set('lookupTopic',e.target.value)}>{TOPICS.map(t=><option value={t} key={t}>{title(t)}</option>)}</select></label><label>选择已捕获元数据中的题目<select value={lookup.some(p=>String(p.id)===String(cfg.problemId))?cfg.problemId:''} onChange={e=>setCfg(s=>({...s,problemId:e.target.value,paramMode:'problem'}))}><option value="" disabled>选择一题…</option>{lookup.map(p=><option key={p.id} value={p.id}>#{p.di} · {p.t}</option>)}</select></label><p>使用捕获的 v1/v2 拟合 b；没有拟合值时按原模型回退。真实题只提供题目参数，这里的作答前能力仍由你输入。</p></details>
    <fieldset className="answer-lab-verdict"><legend>已记录的二元结果 x</legend><label><input type="radio" name="answer-lab-x" checked={Number(cfg.x)===1} onChange={()=>set('x',1)}/>答对 x = 1</label><label><input type="radio" name="answer-lab-x" checked={Number(cfg.x)===0} onChange={()=>set('x',0)}/>答错 x = 0</label></fieldset>
    <label className="answer-lab-check"><input type="checkbox" checked={cfg.hint} onChange={e=>set('hint',e.target.checked)} data-testid="answer-hint"/>提交时仍有展开的提示 h = 1</label>
    <div className="answer-lab-partial"><label className="answer-lab-check"><input type="checkbox" checked={cfg.pcEnabled} onChange={e=>set('pcEnabled',e.target.checked)}/>提供部分分 pc</label><input aria-label="部分分 pc" type="number" min="0" max="1" step="0.01" disabled={!cfg.pcEnabled} value={cfg.pc} onChange={e=>set('pc',e.target.value)}/></div>
    <label className="answer-lab-check"><input type="checkbox" checked={cfg.reveal} onChange={e=>set('reveal',e.target.checked)}/>记录揭晓标记 r = reveal</label>
    <p className="answer-lab-small">此处直接构造已记录的 x / h / pc / r，不代表原界面会产生每一种组合。v1 使用二元 x；部分分、提示折扣和猜测率由有效 v2 分支处理。</p>
   </section>
   <section className="answer-lab-trace" aria-labelledby="answer-trace-title"><h3 id="answer-trace-title">这一次更新的完整算式</h3>
    {!calculation?<p>正在读取本地参数…</p>:calculation.error?<p className="answer-lab-error" role="status">{calculation.error}</p>:<>
     <p className="answer-lab-small">有效版本：{resolved.modelVersion} · source = {trace.source} · weight = {f(trace.weight,2)}。θ 是内部能力，评级是它的显示换算，mastery 是用于准备度的有界掌握度。</p>
     <div className="answer-lab-before-after"><div><span>评级</span><strong>{trace.before.rating} → {trace.after.rating}</strong><small>{sign(trace.after.rating-trace.before.rating,0)}</small></div><div><span>掌握度 mastery</span><strong>{percent(trace.before.mastery)} → {percent(trace.after.mastery)}</strong><small>{sign((trace.after.mastery-trace.before.mastery)*100,2)} 个百分点</small></div></div>
     <ol className="answer-lab-equations">
      <li><span>01 · 模型预测命中率 p</span><code>p = c + (1 − c) × sigmoid(θ − b)</code><output data-testid="answer-p">{f(trace.c)} + (1 − {f(trace.c)}) × sigmoid({f(trace.before.theta)} − {f(trace.b)}) = <b>{f(trace.p)}</b></output><small>sigmoid(z) = 1 / (1 + exp(−z))；p 是模型预测，不是本次实际得分。</small></li>
      <li><span>02 · 随证据量递减的步长 K</span><code>K = weight × sourceK / √(1 + nObs)</code><output data-testid="answer-k">{f(trace.weight)} × {f(trace.sourceK)} ÷ √(1 + {f(trace.before.nObs)}) = <b>{f(trace.K)}</b></output><small>本实验使用 solve 观测；历史观察越多，单次更新越小。</small></li>
      <li><span>03 · 实际计入的有效得分</span><code>effectiveX = {resolved.modelVersion==='v2'?'(有 pc ? pc : x) × 提示折扣（得分 > 0 时）':'x'}</code><output data-testid="answer-effective-x">原始 x = {f(resolved.rawX)}{cfg.pcEnabled?`；pc = ${f(n(cfg.pc))}`:''}；effectiveX = <b>{f(trace.effectiveX)}</b></output><small>{resolved.modelVersion==='v2'?`使用提示且得分大于 0 时，按捕获参数乘 ${f(difficultyV2?._meta?.hintCredit??0.6,2)}。`:'v1 不读取 pc / h；c 固定为 0。'}r 本身不是单独的扣分项。</small></li>
      <li><span>04 · 能力变化与新证据量</span><code>Δθ = K × (effectiveX − p)</code><output data-testid="answer-delta">{f(trace.K)} × ({f(trace.effectiveX)} − {f(trace.p)}) = <b>{sign(trace.deltaTheta)}</b></output><output>θ：{f(trace.before.theta)} → {f(trace.after.theta)}；nObs：{f(trace.before.nObs,2)} → {f(trace.after.nObs,2)}</output><small>有效得分高于预测值时上调，低于预测值时下调。因此带提示或部分分的结果也可能使评级下降。</small></li>
     </ol>
     <details className="answer-lab-details"><summary>评级与 mastery 的换算</summary><code>rating = round(1200 + 300 × (θ − 0.105) / 0.490)</code><code>mastery = clamp((θ + 1.15) / 2.10, 0, 1)</code><p>θ = 0 的显示评级为 1136，并非 1200。岗位偏好不参与这两个换算，也不参与单次 θ 更新。</p></details>
     <p className="answer-lab-small">p / K / θ 显示四位小数，百分比两位；计算使用未舍入值。这个单次实验不执行真实账户的首次记录或冷却门槛。</p>
    </>}
   </section>
  </div>

  <section className="answer-lab-section"><h3>同一能力与证据量，难度和提示怎样改变结果？</h3><p>下面固定当前 θ、nObs、有效 c 与模型版本，只改二元结果、提示和标签回退难度：easy = −0.50、medium = −0.10、hard = 0.50。此表不使用真实题的拟合 b，也不附加 pc。</p>{calculation?.comparisons&&<div className="answer-lab-table-scroll" tabIndex="0" role="region" aria-label="难度与提示对照表，可横向滚动"><table className="answer-lab-comparison" data-testid="answer-comparison"><thead><tr><th>难度／b</th><th>结果</th><th>提示</th><th>p</th><th>K</th><th>effectiveX</th><th>Δθ</th><th>新评级</th><th>新掌握度</th></tr></thead><tbody>{calculation.comparisons.map(row=><tr key={`${row.difficulty}-${row.x}-${row.hint}`}><th scope="row">{row.difficulty} / {f(B[row.difficulty],2)}</th><td>{row.x?'答对':'答错'}</td><td>{row.hint?'有':'无'}</td><td>{f(row.trace.p)}</td><td>{f(row.trace.K)}</td><td>{f(row.trace.effectiveX)}</td><td>{sign(row.trace.deltaTheta)}</td><td>{row.trace.after.rating}</td><td>{percent(row.trace.after.mastery)}</td></tr>)}</tbody></table></div>}<p className="answer-lab-small">v1 的“有提示／无提示”行应相同。v2 对正得分应用提示折扣；原本为 0 的错误得分仍为 0。难度越高，模型原本预期越低，所以同条件答对通常增幅更大。</p></section>

  <section className="answer-lab-section answer-lab-weights"><h3>17 个能力主题 × 4 种岗位：权重到底是什么？</h3><p>每格显示<strong>原始岗位相关度 → 最终归一权重</strong>，旁边是主题固有重要度 intrinsic。岗位、目标公司和重点偏好改变汇总权重与优先级，<strong>不会回改同一次作答的 θ</strong>。这 17 个能力主题与 18 个 Learn 章节、11 个题目模块不同。</p>
   <div className="answer-lab-preferences"><label>目标公司（可选）<select value={cfg.firm} onChange={e=>set('firm',e.target.value)}><option value="">不使用公司偏好</option>{companies.map(([co,count])=><option value={co} key={co}>{co} · {count} 题</option>)}</select></label><p>{cfg.firm?`当前公司在索引匹配 ${firmInfo.firmMatchedCount} 题；公司混合${firmInfo.firmMixApplied?'已启用':'未启用（少于 10 题）'}。`:'未选公司，当前只使用主题固有重要度、岗位偏好与下方重点。'}</p></div>
   <details className="answer-lab-details"><summary>选择重点主题（每项在归一化前加 0.50） · 当前 {cfg.focus.length} 项</summary><div className="answer-lab-focus">{TOPICS.map(t=><label key={t}><input type="checkbox" checked={cfg.focus.includes(t)} onChange={()=>toggleFocus(t)}/>{title(t)}</label>)}</div></details>
   <div className="answer-lab-table-scroll" tabIndex="0" role="region" aria-label="17主题4岗位完整权重表，可横向滚动"><table className="answer-lab-role-table" data-testid="answer-role-weights"><thead><tr><th>能力主题</th><th>intrinsic</th>{Object.entries(ROLE_LABELS).map(([role,name])=><th key={role}>{role.toUpperCase()}<small>{name}</small></th>)}</tr></thead><tbody>{TOPICS.map(t=><tr key={t} data-topic={t}><th scope="row">{title(t)}{cfg.focus.includes(t)&&<small>重点 +0.50</small>}</th><td>{f(weights.qt.topics.find(row=>row.topic===t).intrinsic,2)}</td>{Object.keys(ROLE_LABELS).map(role=>{const row=weights[role].topics.find(row=>row.topic===t);return <td key={role}>{f(row.rawRole,2)} <span>→</span> <b>{f(row.normalizedRel,3)}</b></td>;})}</tr>)}</tbody></table></div>
   <div className="answer-lab-weight-formula"><code>r = 0.35 × intrinsic + 0.65 × 原始岗位相关度</code><code>若所选公司至少匹配 10 题：r = 0.60 × r + 0.40 × (该主题公司题占比 × 17)</code><code>若选为重点：r += 0.50；然后所有主题 r += 0.05</code><code>最终 relevance = r / 所有 17 主题中最大的 r</code></div><p className="answer-lab-small">未列在原岗位映射里的主题原始相关度为 0；固有重要度与 0.05 底值仍可给它非零最终权重。全表最终权重不要求加和为 1；计算 skill 时，会在证据合格的主题之间再归一。</p>
  </section>

  <AttemptLedgerDemo/>
  <section className="answer-lab-section answer-lab-boundaries"><h3>从一次答案到真实记录，还隔着哪些规则？</h3>
   <dl>
    <dt>首次记录与 30 天冷却</dt><dd>公开客户端保存首次判分。同一道题距上次记录不足 30 天时冻结能力记录；满 30 天后替换旧记录，不新增第二份证据。能力记录冻结时，答对仍可把 attempted 提升为 solved；答错只会在原状态为空时写 attempted，不会把 solved 降级。已有 progress 键仅从 attempted 变为 solved，并不会增加参与度计数；新增键才可能影响参与度。</dd>
    <dt>跨主题分配：额外 0.25</dt><dd>源标签映射出的其他主题去重后，共分 0.25 的观察权重；若有 m 个其他主题，每个使用 0.25 / m。它们各自用已有 θ 与 nObs 计算，且次级主题 c = 0，所以不是把主主题的 Δθ 简单乘 0.25。{resolved?.secondaryObservations?.length>0&&<span>当前真实题关联：{resolved.secondaryObservations.map(o=>`${title(o.topic)}（weight ${f(o.weight,4)}）`).join('、')}。</span>}</dd>
    <dt>提示 h 与部分分 pc 如何产生</dt><dd>Solve 提交结果时写 x = 正确 ? 1 : 0，h 取当时展开的提示数量是否大于 0。它不是“历史上看过提示”的永久标记：收起全部提示后，当前计数会归零。多部分题的 pc = 答对的可评分子题数 ÷ 全部可评分子题数。代码题的已捕获提交路径只传 x，不传 h / pc / r。</dd>
    <dt>查看答案不是同一种计分动作</dt><dd>Solve 中首次、尚未 solved 且没有已存 attempt 时，确认 Show solution 会写 x = 0、r = reveal；已有 attempt 或 solved 则只展示，且此入口不重新检查30天期限。Study 模式的 revealSolution 只显示解答并记录分析事件；倒计时弹窗的 Reveal answer 走仅揭晓路径，不写 attempt。r = reveal 本身是记录元信息，能力模型不单独读取它扣分；真正参与更新的是该路径写入的 x / pc / h。不能把所有“查看答案”都理解成一次扣分。</dd>
    <dt>v2 参数与 rollout</dt><dd>v1 使用 x；有效 v2 先用存在的 pc，否则用 x；若 h 存在且得分大于 0，再乘提示系数。v2 使用拟合 b 和猜测下限 c；单题没有 v2 难度时仅 b 回退到 v1 拟合值或难度标签，其他 v2 处理仍有效。完全没有 v2.b 参数表时，整个分支才退回 v1。生产过渡期的 theta 与 readiness 有不同混合规则：readiness 使用 max(r1, r2) 参与混合；这不是保证分数随新答案永不下降，不能把本实验的一次 v1/v2 更新直接当作线上最终 Offer Bar。</dd>
   </dl><p className="answer-lab-small">本页读取已保存的公开源码参数和本地题目元数据。所有输入与计算留在此浏览器，不调用 QuantVault 账户接口。已核对 problems.js 的 solveRecordResult、multi-result、solveReveal、Study reveal 和倒计时仅揭晓路径；这里只说明已捕获客户端主链，不推测服务器内部行为。</p>
  </section>
 </section>;
}
