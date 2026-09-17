import React, { useState, useEffect, useRef } from 'react';
import { STATUS_META, deadlineDateTime, formatDeadline } from './dataModel.js';

function readableDate(date) {
  if (!date) return '日期待补充';
  return /^\d{4}-\d{2}-\d{2}$/.test(date) ? date.replaceAll('-', '.') : date;
}

export default function DetailDrawer({ application, phases, onClose, onUpdate, onEditDeadline }) {
  const [company, setCompany] = useState('');
  const [role, setRole] = useState('');
  const [prepPhase, setPrepPhase] = useState('');
  const [savedMessage, setSavedMessage] = useState('');
  const dialogRef = useRef(null);
  const closeRef = useRef(onClose);
  const isOpen = Boolean(application);
  closeRef.current = onClose;

  useEffect(() => {
    if (!application) return;
    setCompany(application.company || '');
    setRole(application.role || '');
    setPrepPhase(application.prepPhase || '');
    setSavedMessage('');
  }, [application?.id]);

  useEffect(() => {
    if (!isOpen) return;
    const previouslyFocused = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    function handleKeyDown(event) {
      // Native dialogs own keyboard focus while editing a deadline above this drawer.
      if (document.querySelector('dialog[open]')) return;
      if (event.key === 'Escape') {
        event.preventDefault();
        closeRef.current();
        return;
      }
      if (event.key !== 'Tab') return;
      const dialog = dialogRef.current;
      if (!dialog) return;
      const focusable = Array.from(
        dialog.querySelectorAll(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex="0"]',
        ),
      ).filter((element) => element.getClientRects().length > 0);
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (!first) {
        event.preventDefault();
        dialog.focus();
      } else if (event.shiftKey && (document.activeElement === first || document.activeElement === dialog)) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !dialog.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = oldOverflow;
      if (previouslyFocused instanceof HTMLElement && previouslyFocused.isConnected) {
        previouslyFocused.focus();
      }
    };
  }, [isOpen]);

  if (!application) return null;

  const events = application.events || [];
  const missingYear = events.some((event) => /^\d{1,2}\/\d{1,2}$/.test(event.date || ''));
  const normalizedPhases = (phases || []).map((phase) =>
    typeof phase === 'string' ? { id: phase, label: phase } : phase,
  );
  const phaseOptions = normalizedPhases.some((phase) => phase.id === prepPhase)
    ? normalizedPhases
    : [{ id: prepPhase, label: prepPhase || '未分组' }, ...normalizedPhases];

  function updateField(setter, value) {
    setter(value);
    setSavedMessage('');
  }

  function saveDetails(event) {
    event.preventDefault();
    if (!company.trim() || !role.trim()) return;
    const saved = onUpdate({
      ...application,
      company: company.trim(),
      role: role.trim(),
      prepPhase,
    });
    setSavedMessage(saved ? '更改已保存' : '保存失败，请检查浏览器存储空间后重试。');
  }

  return (
    <div
      className="qt-td-overlay"
      onMouseDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <aside
        className="qt-td-drawer"
        role="dialog"
        aria-modal="true"
        aria-labelledby="td-title"
        aria-describedby="td-role"
        tabIndex={-1}
        ref={dialogRef}
      >
        <header className="qt-td-header">
          <div>
            <p className="qt-td-eyebrow">APPLICATION{application.season ? ` / ${application.season}` : ''}</p>
            <h2 id="td-title">{application.company}</h2>
            <p className="qt-td-role" id="td-role">{application.role}</p>
          </div>
          <button type="button" className="qt-td-close" onClick={onClose} aria-label="关闭申请详情">×</button>
        </header>

        <div className="qt-td-body">
          <section className="qt-td-section" aria-labelledby="td-timeline-heading">
            <div className="qt-td-section-heading">
              <h3 id="td-timeline-heading">申请进展</h3>
              <span className="qt-td-count">{events.length} 条记录</span>
            </div>
            {missingYear && <p className="qt-td-date-context">原表日期未标年份</p>}
            {events.length ? (
              <ol className="qt-td-timeline">
                {events.map((event, index) => (
                  <li className={`qt-td-event qt-td-event-${event.type}`} key={event.id || `${event.type}-${index}`}>
                    <span className="qt-td-event-dot" aria-hidden="true" />
                    <div className="qt-td-event-content">
                      <div className="qt-td-event-top">
                        <strong>{STATUS_META[event.type]?.label || event.type}</strong>
                        <span className="qt-td-event-date">{readableDate(event.date)}</span>
                      </div>
                      {event.dueDate && <p className="qt-td-event-deadline">
                        <span>截止 <time dateTime={deadlineDateTime(event)}>{formatDeadline(event, { fullDate: true })}</time></span>
                        {onEditDeadline && <button type="button" className="qt-deadline-edit-link" onClick={() => onEditDeadline(event)}>修改截止时间</button>}
                      </p>}
                    </div>
                  </li>
                ))}
              </ol>
            ) : <p className="qt-td-empty">还没有记录进展。</p>}


          </section>

          <form className="qt-td-details-form" onSubmit={saveDetails}>
            <section className="qt-td-section" aria-labelledby="td-details-heading">
              <div className="qt-td-section-heading"><h3 id="td-details-heading">申请信息</h3></div>
              <div className="qt-td-field-row">
                <label className="qt-td-field" htmlFor="td-company">
                  <span>公司</span>
                  <input id="td-company" value={company} maxLength={120} required onChange={(event) => updateField(setCompany, event.target.value)} />
                </label>
                <label className="qt-td-field" htmlFor="td-prep-phase">
                  <span>投递时的准备阶段</span>
                  <select id="td-prep-phase" value={prepPhase} onChange={(event) => updateField(setPrepPhase, event.target.value)}>
                    {phaseOptions.map((phase) => <option key={phase.id} value={phase.id}>{phase.label}</option>)}
                  </select>
                </label>
              </div>
              <label className="qt-td-field" htmlFor="td-position">
                <span>岗位</span>
                <input id="td-position" value={role} maxLength={400} required onChange={(event) => updateField(setRole, event.target.value)} />
              </label>

            </section>
            <footer className="qt-td-save-footer">
              <p className="qt-td-save-feedback" role="status" aria-live="polite">{savedMessage}</p>
              <button className="qt-td-button qt-td-button-primary" type="submit">保存更改</button>
            </footer>
          </form>
        </div>
      </aside>
    </div>
  );
}
