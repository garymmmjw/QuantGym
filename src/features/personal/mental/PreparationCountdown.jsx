export function PreparationCountdown({ trial, now, language = 'zh', onCancel }) {
  const en = language === 'en';
  const count = Math.max(1, Math.ceil((Date.parse(trial.startedAt) - now) / 1000));
  return <div className="pm-arena pm-preparation" aria-label={en ? 'Preparation countdown' : '准备倒计时'}>
    <div className="pm-ready">
      <p>{en ? 'Get ready' : '准备开始'}</p>
      <p className="pm-ready-clock" role="status" aria-live="polite" aria-atomic="true">{count}</p>
      <p>{en ? `${trial.settings.durationSeconds}s of training starts after the countdown.` : `倒计时结束后，开始 ${trial.settings.durationSeconds} 秒正式训练。`}</p>
      <button type="button" className="pm-text-button" onClick={onCancel}>{en ? 'Cancel start' : '取消开始'}</button>
      <p className="pm-note">{en ? 'Preparation does not count toward your score or question time.' : '准备时间不计入训练时长和单题耗时。'}</p>
    </div>
  </div>;
}
