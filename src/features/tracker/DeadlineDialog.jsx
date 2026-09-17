import React, { useEffect, useRef, useState } from 'react';
import DeadlineFields from './DeadlineFields.jsx';

export default function DeadlineDialog({ application, event, onClose, onSave }) {
  const dialogRef = useRef(null);
  const [deadline, setDeadline] = useState(() => ({
    dueDate: event.dueDate || '',
    dueTime: event.dueDate ? event.dueTime || '' : '',
  }));
  const [error, setError] = useState('');

  useEffect(() => {
    const previouslyFocused = document.activeElement;
    const fallbackFocus = previouslyFocused instanceof HTMLElement
      ? previouslyFocused.closest('.qt-td-drawer') || previouslyFocused.closest('.qt-application-row')?.querySelector('.qt-row-open')
      : null;
    const oldOverflow = document.body.style.overflow;
    const dialog = dialogRef.current;
    document.body.style.overflow = 'hidden';
    dialog.showModal();
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) previouslyFocused.focus();
      else if (fallbackFocus instanceof HTMLElement && fallbackFocus.isConnected) fallbackFocus.focus();
    };
  }, []);

  function updateDeadline(value) {
    setDeadline(value);
    setError('');
  }

  function saveDeadline(formEvent) {
    formEvent.preventDefault();
    const saved = onSave({ ...deadline, dueTime: deadline.dueDate ? deadline.dueTime : '' });
    if (saved) onClose();
    else setError('保存失败，请检查浏览器存储空间后重试。');
  }

  return (
    <dialog
      ref={dialogRef}
      className="qt-progress-dialog qt-deadline-dialog"
      aria-labelledby="deadline-title"
      aria-describedby="deadline-application"
      onCancel={onClose}
      onClick={clickEvent => {
        if (clickEvent.target !== clickEvent.currentTarget) return;
        const bounds = clickEvent.currentTarget.getBoundingClientRect();
        if (clickEvent.clientX < bounds.left || clickEvent.clientX > bounds.right || clickEvent.clientY < bounds.top || clickEvent.clientY > bounds.bottom) onClose();
      }}
    >
      <header className="qt-progress-dialog-header">
        <div>
          <h2 id="deadline-title">修改截止时间</h2>
          <p id="deadline-application"><strong>{application.company.trim()}</strong><span>{application.role}</span></p>
        </div>
        <button type="button" className="qt-td-close" aria-label="关闭修改截止时间" onClick={onClose}>×</button>
      </header>
      <form onSubmit={saveDeadline}>
        <DeadlineFields idPrefix="deadline-edit" {...deadline} onChange={updateDeadline} autoFocus />
        {error && <p className="qt-tracker-error" role="alert">{error}</p>}
        <footer className="qt-progress-dialog-actions">
          <button type="button" className="qt-btn qt-deadline-clear" disabled={!deadline.dueDate && !deadline.dueTime} onClick={() => updateDeadline({ dueDate: '', dueTime: '' })}>清除</button>
          <button type="button" className="qt-btn" onClick={onClose}>取消</button>
          <button type="submit" className="qt-btn qt-primary">保存截止时间</button>
        </footer>
      </form>
    </dialog>
  );
}
