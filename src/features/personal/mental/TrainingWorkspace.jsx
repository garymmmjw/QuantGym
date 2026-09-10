import { useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import { MentalMathTrainer } from './MentalMathTrainer.jsx';
import { ReasoningTrainer } from './ReasoningTrainer.jsx';
import { TRAINER_LABELS, trainerKind } from './trainingSettings.js';
import './mental.css';

export function TrainingWorkspace(props) {
  const { state, language = 'zh' } = props;
  const en = language === 'en';
  const [params, setParams] = useSearchParams();
  const active = state.activeTrial?.status === 'active' ? state.activeTrial : null;
  const requested = ['math', 'sequence', 'pattern'].includes(params.get('trainer')) ? params.get('trainer') : 'math';
  const selected = active ? trainerKind(active) : requested;
  useEffect(() => {
    if (active && requested !== trainerKind(active)) {
      const next = new URLSearchParams(params);
      next.set('trainer', trainerKind(active));
      setParams(next, { replace: true });
    }
  }, [active?.id, requested]);
  function selectModule(trainer) {
    const next = new URLSearchParams(params);
    next.set('trainer', trainer);
    setParams(next, { replace: true });
  }
  return <section className="personal-mental" aria-label="Mental Math">
    <header className="pm-heading"><div><p className="pm-eyebrow">{en ? 'FOCUS / SPEED / REASONING' : '专注 · 速度 · 推理'}</p><h2>Mental Math</h2></div><span className="pm-mode-label">{en ? 'Personal practice' : '个人练习'}</span></header>
    <nav className="pm-trainer-tabs" aria-label={en ? 'Training modules' : '训练模块'}>
      {Object.entries(TRAINER_LABELS).map(([kind, label]) => <button key={kind} type="button" aria-pressed={selected === kind} disabled={Boolean(active) && selected !== kind} onClick={() => selectModule(kind)}>
        <span>{label}</span><small>{({ math: en ? 'Arithmetic' : '心算速算', sequence: en ? 'Numbers & letters' : '数字与字母', pattern: en ? 'Visual patterns' : '图形找规律' })[kind]}</small>
      </button>)}
    </nav>
    {active && <p className="pm-note pm-module-status">{en ? 'Finish this trial or cancel preparation before switching modules.' : '结束当前试次或取消准备后，可切换训练模块。'}</p>}
    {selected === 'math' ? <MentalMathTrainer {...props} embedded /> : <ReasoningTrainer key={selected} {...props} trainer={selected} />}
  </section>;
}
