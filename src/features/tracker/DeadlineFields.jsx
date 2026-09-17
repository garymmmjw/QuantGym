import React from 'react';

export default function DeadlineFields({ idPrefix, dueDate, dueTime, onChange, autoFocus = false }) {
  function changeDate(event) {
    const nextDate = event.target.value;
    onChange({ dueDate: nextDate, dueTime: nextDate ? dueTime : '' });
  }

  function changeTime(event) {
    onChange({ dueDate, dueTime: dueDate ? event.target.value : '' });
  }

  return (
    <div className="qt-deadline-fields">
      <label className="qt-td-field" htmlFor={`${idPrefix}-date`}>
        <span>截止日期 <span className="qt-td-optional">选填</span></span>
        <input id={`${idPrefix}-date`} type="date" autoFocus={autoFocus} value={dueDate} onInput={changeDate} onChange={changeDate} />
      </label>
      <label className="qt-td-field" htmlFor={`${idPrefix}-time`}>
        <span>截止时间 <span className="qt-td-optional">选填</span></span>
        <input id={`${idPrefix}-time`} type="time" step="60" value={dueTime} disabled={!dueDate} onInput={changeTime} onChange={changeTime} />
      </label>
    </div>
  );
}
