import React, { useEffect, useRef, useState } from 'react';
import { STATUS_META } from './dataModel.js';
import DeadlineFields from './DeadlineFields.jsx';

const PROGRESS_TYPES = ['oa_received', 'oa_completed', 'interview', 'offer', 'rejected', 'withdrawn'];

function validOccurrenceDate(value, allowYearless) {
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    if (Number(value.slice(0, 4)) < 1) return false;
    const date = new Date(`${value}T12:00:00Z`);
    return Number.isFinite(date.getTime()) && date.toISOString().slice(0, 10) === value;
  }
  if (!allowYearless || !/^\d{1,2}\/\d{1,2}$/.test(value)) return false;
  const [month, day] = value.split('/').map(Number);
  return month >= 1 && month <= 12 && day >= 1 && day <= [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}

export default function EventEditDialog({ application, event, onClose, onSave }) {
  const dialogRef = useRef(null);
  const original = useRef({
    type: event.type,
    date: event.date || '',
    dueDate: event.dueDate || '',
    dueTime: event.dueDate ? event.dueTime || '' : '',
  });
  const [values, setValues] = useState(original.current);
  const [error, setError] = useState('');
  const isSubmission = application.events[0]?.id === event.id;
  const usesYearlessDate = /^\d{1,2}\/\d{1,2}$/.test(original.current.date);

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const drawer = previouslyFocused instanceof HTMLElement ? previouslyFocused.closest('.qt-td-drawer') : null;
    const rowLink = previouslyFocused instanceof HTMLElement ? previouslyFocused.closest('.qt-application-row')?.querySelector('.qt-role-link') : null;
    const tracker = dialogRef.current.closest('.quantgym-tracker');
    const oldOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      const fallbackFilter = tracker?.querySelector('.qt-filter-tabs button.qt-active');
      const focusTarget = [previouslyFocused, drawer, rowLink, fallbackFilter].find(element =>
        element instanceof HTMLElement && element.isConnected && element.getClientRects().length > 0,
      );
      focusTarget?.focus();
    };
  }, []);

  function updateValues(changes) {
    setValues(current => ({ ...current, ...changes }));
    setError('');
  }

  function saveEvent(formEvent) {
    formEvent.preventDefault();
    const date = values.date.trim();
    if (!validOccurrenceDate(date, usesYearlessDate)) {
      setError(usesYearlessDate ? '请填写有效日期，例如 09/17 或 2026-09-17。' : '请填写有效的发生日期。');
      return;
    }
    const next = { ...values, type: isSubmission ? 'submitted' : values.type, date, dueTime: values.dueDate ? values.dueTime : '' };
    const changes = Object.fromEntries(Object.entries(next).filter(([key, value]) => value !== original.current[key]));
    try {
      if (onSave(changes)) onClose();
      else setError('没有保存成功，请检查记录信息后重试。');
    } catch (failure) {
      setError(failure.message || '没有保存成功，请重试。');
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="qt-progress-dialog qt-event-edit-dialog"
      aria-labelledby="event-edit-title"
      aria-describedby="event-edit-application"
      onCancel={onClose}
      onClick={clickEvent => {
        if (clickEvent.target !== clickEvent.currentTarget) return;
        const bounds = clickEvent.currentTarget.getBoundingClientRect();
        if (clickEvent.clientX < bounds.left || clickEvent.clientX > bounds.right || clickEvent.clientY < bounds.top || clickEvent.clientY > bounds.bottom) onClose();
      }}
    >
      <header className="qt-progress-dialog-header">
        <div>
          <h2 id="event-edit-title">修改记录</h2>
          <p id="event-edit-application"><strong>{application.company.trim()}</strong><span>{application.role}</span></p>
        </div>
        <button type="button" className="qt-td-close" aria-label="关闭修改记录" onClick={onClose}>×</button>
      </header>
      <form onSubmit={saveEvent}>
        <label className="qt-td-field" htmlFor="event-edit-type">
          <span>进展</span>
          <select id="event-edit-type" disabled={isSubmission} autoFocus={!isSubmission} value={values.type} onChange={change => updateValues({ type: change.target.value })}>
            {(isSubmission ? ['submitted'] : PROGRESS_TYPES).map(type => <option key={type} value={type}>{STATUS_META[type].label}</option>)}
          </select>
        </label>
        <label className="qt-td-field" htmlFor="event-edit-date">
          <span>发生日期 <span className="qt-td-required">*</span></span>
          <input
            id="event-edit-date"
            type={usesYearlessDate ? 'text' : 'date'}
            required
            autoFocus={isSubmission}
            value={values.date}
            maxLength={usesYearlessDate ? 10 : undefined}
            placeholder={usesYearlessDate ? 'MM/DD 或 YYYY-MM-DD' : undefined}
            aria-describedby={usesYearlessDate ? 'event-edit-date-hint' : undefined}
            onInput={change => updateValues({ date: change.target.value })}
            onChange={change => updateValues({ date: change.target.value })}
          />
        </label>
        {usesYearlessDate && <p id="event-edit-date-hint" className="qt-event-date-hint">原记录未标年份，可保留月/日，或填写完整日期（YYYY-MM-DD）。</p>}
        <DeadlineFields idPrefix="event-edit-deadline" dueDate={values.dueDate} dueTime={values.dueTime} onChange={updateValues} />
        {error && <p className="qt-tracker-error" role="alert">{error}</p>}
        <footer className="qt-progress-dialog-actions">
          <button type="button" className="qt-btn qt-deadline-clear" disabled={!values.dueDate && !values.dueTime} onClick={() => updateValues({ dueDate: '', dueTime: '' })}>清除截止时间</button>
          <button type="button" className="qt-btn" onClick={onClose}>取消</button>
          <button type="submit" className="qt-btn qt-primary">保存修改</button>
        </footer>
      </form>
    </dialog>
  );
}
