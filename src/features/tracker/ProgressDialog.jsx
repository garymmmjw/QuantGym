import React, { useEffect, useRef, useState } from 'react';
import { STATUS_META, localToday } from './dataModel.js';

const PROGRESS_TYPES = ['oa_received', 'oa_completed', 'interview', 'offer', 'rejected', 'withdrawn'];

export default function ProgressDialog({ application, onClose, onUpdate }) {
  const dialogRef = useRef(null);
  const [eventType, setEventType] = useState('oa_received');
  const [eventDate, setEventDate] = useState(localToday);
  const [dueDate, setDueDate] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
    };
  }, []);

  function saveProgress(event) {
    event.preventDefault();
    if (!eventDate) return;
    const saved = onUpdate({
      ...application,
      events: [...application.events, {
        id: crypto.randomUUID(),
        type: eventType,
        date: eventDate,
        year: Number(eventDate.slice(0, 4)),
        dueDate,
      }],
    });
    if (saved) onClose();
    else setError('保存失败，请检查浏览器存储空间后重试。');
  }

  return (
    <dialog ref={dialogRef} className="qt-progress-dialog" aria-labelledby="progress-title" aria-describedby="progress-application" onCancel={onClose} onClick={event => { if (event.target !== event.currentTarget) return; const bounds=event.currentTarget.getBoundingClientRect(); if(event.clientX<bounds.left || event.clientX>bounds.right || event.clientY<bounds.top || event.clientY>bounds.bottom) onClose(); }}>
      <header className="qt-progress-dialog-header">
        <div>
          <h2 id="progress-title">更新进展</h2>
          <p id="progress-application"><strong>{application.company.trim()}</strong><span>{application.role}</span></p>
        </div>
        <button type="button" className="qt-td-close" aria-label="关闭更新进展" onClick={onClose}>×</button>
      </header>
      <form onSubmit={saveProgress}>
        <label className="qt-td-field" htmlFor="progress-type">
          <span>进展</span>
          <select id="progress-type" autoFocus value={eventType} onChange={event => setEventType(event.target.value)}>
            {PROGRESS_TYPES.map(type => <option key={type} value={type}>{STATUS_META[type].label}</option>)}
          </select>
        </label>
        <label className="qt-td-field" htmlFor="progress-date">
          <span>发生日期 <span className="qt-td-required">*</span></span>
          <input id="progress-date" type="date" required value={eventDate} onInput={event => setEventDate(event.target.value)} onChange={event => setEventDate(event.target.value)} />
        </label>
        <label className="qt-td-field" htmlFor="progress-deadline">
          <span>截止日期 <span className="qt-td-optional">选填</span></span>
          <input id="progress-deadline" type="date" value={dueDate} onInput={event => setDueDate(event.target.value)} onChange={event => setDueDate(event.target.value)} />
        </label>
        {error && <p className="qt-tracker-error" role="alert">{error}</p>}
        <footer className="qt-progress-dialog-actions">
          <button type="button" className="qt-btn" onClick={onClose}>取消</button>
          <button type="submit" className="qt-btn qt-primary">保存进展</button>
        </footer>
      </form>
    </dialog>
  );
}
