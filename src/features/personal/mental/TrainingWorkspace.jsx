import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MentalMathTrainer } from './MentalMathTrainer.jsx';
import { ReasoningTrainer } from './ReasoningTrainer.jsx';
import { TRAINER_LABELS, trainerKind } from './trainingSettings.js';
import './mental.css';
import './moduleGallery.css';

const MODULE_COPY = {
  math: {
    label: ['心算速算', 'Arithmetic'],
    description: ['加减乘除，在限时练习中找到速度与准确率的平衡。', 'Build speed and accuracy with focused, timed arithmetic practice.'],
    detail: ['自由组合四则运算，调整数字范围与练习时长。', 'Choose your operations, number ranges, and session length.'],
  },
  sequence: {
    label: ['数列与字母', 'Numbers & letters'],
    description: ['从数字与字母的变化中，找到下一个答案。', 'Find the hidden rule in a sequence of numbers or letters.'],
    detail: ['选择题型与难度，练习发现规律的速度。', 'Choose a sequence type and difficulty to sharpen your reasoning.'],
  },
  pattern: {
    label: ['图形找规律', 'Visual reasoning'],
    description: ['观察旋转、位置与组合，用图形训练推理直觉。', 'Read rotations, positions, and combinations to uncover the next pattern.'],
    detail: ['调整难度与练习时长，专注每一道图形规律。', 'Set your difficulty and session length, then focus on each visual rule.'],
  },
};

function ModuleIllustration({ kind }) {
  if (kind === 'math') return <svg className="pm-module-illustration" viewBox="0 0 360 230" fill="none" aria-hidden="true">
    <path className="pm-art-guide" d="M25 176H335M25 58H335" />
    <g className="pm-art-math">
      <text x="59" y="139" className="pm-art-number">24</text>
      <text x="141" y="136" className="pm-art-operator">×</text>
      <text x="208" y="139" className="pm-art-number">7</text>
      <path className="pm-art-stroke" d="M267 117H297M267 127H297" />
    </g>
    <path className="pm-art-accent" d="M60 162H115" />
    <circle className="pm-art-dot" cx="301" cy="176" r="4" />
  </svg>;
  if (kind === 'sequence') return <svg className="pm-module-illustration" viewBox="0 0 360 230" fill="none" aria-hidden="true">
    <path className="pm-art-guide" d="M32 179H329" />
    <path className="pm-art-stroke pm-art-sequence-line" d="M47 157L118 139L191 104L276 51" />
    {[{ x: 47, y: 157, n: '2' }, { x: 118, y: 139, n: '4' }, { x: 191, y: 104, n: '8' }].map(({ x, y, n }) => <g key={n}>
      <circle className="pm-art-point" cx={x} cy={y} r="5" />
      <text className="pm-art-small-number" x={x} y={y - 19} textAnchor="middle">{n}</text>
    </g>)}
    <circle className="pm-art-halo" cx="276" cy="51" r="22" />
    <text className="pm-art-missing" x="276" y="58" textAnchor="middle">?</text>
    <path className="pm-art-guide" strokeDasharray="3 5" d="M118 145V179M191 110V179M276 79V179" />
  </svg>;
  return <svg className="pm-module-illustration" viewBox="0 0 360 230" fill="none" aria-hidden="true">
    <path className="pm-art-guide" d="M58 115H302M138 44V188M222 44V188" />
    {[{ x: 94, y: 78, r: 0 }, { x: 180, y: 78, r: 45 }, { x: 266, y: 78, r: 90 }, { x: 94, y: 155, r: 135 }, { x: 180, y: 155, r: 180 }].map(({ x, y, r }) => <g key={`${x}-${y}`} transform={`translate(${x} ${y}) rotate(${r})`}>
      <rect className="pm-art-stroke" x="-17" y="-17" width="34" height="34" rx="3" />
      <path className="pm-art-fill" d="M-16-16H16L-16 16Z" />
    </g>)}
    <rect className="pm-art-guide" x="241" y="130" width="50" height="50" rx="7" strokeDasharray="3 5" />
    <text className="pm-art-missing" x="266" y="163" textAnchor="middle">?</text>
  </svg>;
}

export function TrainingWorkspace(props) {
  const { state, language = 'zh' } = props;
  const en = language === 'en';
  const [params, setParams] = useSearchParams();
  const active = state.activeTrial?.status === 'active' ? state.activeTrial : null;
  const requested = ['math', 'sequence', 'pattern'].includes(params.get('trainer')) ? params.get('trainer') : null;
  const selected = active ? trainerKind(active) : requested;
  const headingRef = useRef(null);
  const previousSelection = useRef(selected);
  useEffect(() => {
    if (active && requested !== trainerKind(active)) {
      const next = new URLSearchParams(params);
      next.set('trainer', trainerKind(active));
      setParams(next, { replace: true });
    }
  }, [active, requested, params, setParams]);
  useEffect(() => {
    if (previousSelection.current !== selected) headingRef.current?.focus();
    previousSelection.current = selected;
  }, [selected]);
  function selectModule(trainer) {
    const next = new URLSearchParams(params);
    if (trainer) next.set('trainer', trainer);
    else next.delete('trainer');
    setParams(next);
  }
  return <section className={`personal-mental ${selected ? 'pm-workspace-module' : 'pm-workspace-gallery'}`} aria-label="Mental Math">
    {selected && <div className="pm-module-navigation">
      <button type="button" className="pm-module-back" onClick={() => selectModule(null)} disabled={Boolean(active)} title={active ? (en ? 'Finish your session before switching modules.' : '结束本次练习后可切换模块。') : undefined}>
        <span aria-hidden="true">←</span>{en ? 'All modules' : '全部训练模块'}
      </button>
      <span className="pm-module-breadcrumb">Mental Math</span>
    </div>}
    <header className="pm-heading pm-workspace-heading">
      <div>
        <p className="pm-eyebrow">{selected ? MODULE_COPY[selected].label[en ? 1 : 0] : (en ? 'FOCUS / SPEED / REASONING' : '专注 · 速度 · 推理')}</p>
        <h2 ref={headingRef} tabIndex={-1}>{selected ? TRAINER_LABELS[selected] : 'Mental Math'}</h2>
        <p className="pm-workspace-description">{selected ? MODULE_COPY[selected].detail[en ? 1 : 0] : (en ? 'Choose a skill. Find your rhythm.' : '选一个模块，进入你的训练节奏。')}</p>
      </div>
      <span className="pm-mode-label">{selected ? (en ? 'Personal practice' : '个人练习') : (en ? '3 training modules' : '3 个训练模块')}</span>
    </header>
    {!selected ? <nav className="pm-module-gallery" aria-label={en ? 'Training modules' : '训练模块'}>
      {Object.entries(TRAINER_LABELS).map(([kind, label], index) => <button className={`pm-module-card pm-module-card-${kind}`} key={kind} type="button" onClick={() => selectModule(kind)} aria-labelledby={`pm-module-title-${kind}`} aria-describedby={`pm-module-description-${kind}`}>
        <span className="pm-module-art">
          <span className="pm-module-index">0{index + 1}</span>
          <ModuleIllustration kind={kind} />
        </span>
        <span className="pm-module-content">
          <span className="pm-module-category">{MODULE_COPY[kind].label[en ? 1 : 0]}</span>
          <span className="pm-module-title" id={`pm-module-title-${kind}`}>{label}</span>
          <span className="pm-module-description" id={`pm-module-description-${kind}`}>{MODULE_COPY[kind].description[en ? 1 : 0]}</span>
          <span className="pm-module-link">{en ? 'Enter module' : '进入训练'}<span className="pm-module-arrow" aria-hidden="true">↗</span></span>
        </span>
      </button>)}
    </nav> : selected === 'math' ? <MentalMathTrainer {...props} embedded /> : <ReasoningTrainer key={selected} {...props} trainer={selected} />}
  </section>;
}
