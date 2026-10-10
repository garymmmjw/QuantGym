import React, { useEffect, useRef, useState } from 'react';
import { isInterviewType, localToday } from './dataModel.js';
import DeadlineFields from './DeadlineFields.jsx';
import ProgressFields from './ProgressFields.jsx';

export default function ProgressDialog({ application, onClose, onUpdate }) {
  const dialogRef = useRef(null);
  const [progress, setProgress] = useState({ type: 'oa_received', interviewRound: '', customLabel: '' });
  const [eventDate, setEventDate] = useState(localToday);
  const [dueDate, setDueDate] = useState('');
  const [dueTime, setDueTime] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current.showModal();
    return () => {
      document.body.style.overflow = oldOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
      else document.querySelector('.qt-filter-tabs button.qt-active')?.focus();
    };
  }, []);

  function saveProgress(event) {
    event.preventDefault();
    if (!eventDate) return;
    if (progress.type === 'custom' && !progress.customLabel.trim()) {
      setError('请填写自定义进展。');
      return;
    }
    const saved = onUpdate({
      ...application,
      events: [...application.events, {
        id: crypto.randomUUID(),
        type: progress.type,
        ...(isInterviewType(progress.type) ? { interviewRound: progress.interviewRound || '1st' } : {}),
        ...(progress.type === 'custom' ? { customLabel: progress.customLabel.trim() } : {}),
        date: eventDate,
        year: Number(eventDate.slice(0, 4)),
        dueDate,
        dueTime: dueDate ? dueTime : '',
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
        <ProgressFields idPrefix="progress" values={progress} onChange={changes => {
          setProgress(current => ({ ...current, ...changes }));
          setError('');
        }} />
        <label className="qt-td-field" htmlFor="progress-date">
          <span>发生日期 <span className="qt-td-required">*</span></span>
          <input id="progress-date" type="date" required value={eventDate} onInput={event => setEventDate(event.target.value)} onChange={event => setEventDate(event.target.value)} />
        </label>
        <DeadlineFields idPrefix="progress-deadline" dueDate={dueDate} dueTime={dueTime} onChange={value => {
          setDueDate(value.dueDate);
          setDueTime(value.dueTime);
          setError('');
        }} />
        {error && <p className="qt-tracker-error" role="alert">{error}</p>}
        <footer className="qt-progress-dialog-actions">
          <button type="button" className="qt-btn" onClick={onClose}>取消</button>
          <button type="submit" className="qt-btn qt-primary">保存进展</button>
        </footer>
      </form>
    </dialog>
  );
}
