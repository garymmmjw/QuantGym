import React from 'react';
import { STATUS_META, getCurrentStatus, getCurrentDeadlineEvent, formatDeadline, deadlineDateTime } from './dataModel.js';
import Icon from './TrackerIcon.jsx';

function EventPill({ event }) {
  if (!event) return <span className="qt-empty-step" aria-label="暂无进展">—</span>;
  const meta = STATUS_META[event.type] || { label: event.type, tone: 'neutral' };
  const shortDate = /^\d{4}-\d{2}-\d{2}$/.test(event.date || '')
    ? event.date.slice(5).replace('-', '/') : event.date;
  return (
    <span className={`qt-event-pill qt-${meta.tone}`} title={event.date}>
      <span className="qt-event-label">{meta.label}</span>
      <span className="qt-event-date">{shortDate || '日期未填'}</span>
    </span>
  );
}

export default function ApplicationRow({ application, onOpenDetails, onUpdateProgress, onEditDeadline }) {
  const { company, role, events } = application;
  const deadline = getCurrentDeadlineEvent(application);
  const archived = ['rejected', 'withdrawn'].includes(getCurrentStatus(application));
  return (
    <tr className={`qt-application-row${archived ? ' archived' : ''}${deadline ? ' qt-has-deadline' : ''}`}>
      <td className="qt-company-cell"><strong className="qt-company-name">{company.trim()}</strong></td>
      <td className="qt-role-cell">
        <button className="qt-role-link" title={role} onClick={onOpenDetails} aria-label={`查看 ${company.trim()} 的 ${role}`}>
          <span>{role}</span>
        </button>
      </td>
      <td className="qt-progress-cell"><EventPill event={events[0]} /></td>
      <td className="qt-progress-cell"><EventPill event={events[1]} /></td>
      <td className="qt-latest-cell qt-progress-cell">
        <div className="qt-latest-content">
          {events.length > 2 && (
            <button className="qt-event-link" onClick={onOpenDetails} aria-label={`查看 ${company.trim()} ${role} 的进展历史`}>
              <EventPill event={events.at(-1)} />
              {events.length > 3 && <small>+{events.length - 3} 条历史</small>}
            </button>
          )}
          <button className="qt-add-progress" onClick={onUpdateProgress} aria-label={`更新 ${company.trim()} ${role} 的进展`}>
            <Icon name="Plus" size={13} /><span>更新进展</span>
          </button>
        </div>
      </td>
      <td className="qt-deadline-cell">
        {deadline ? (
          <button className="qt-deadline-button" onClick={() => onEditDeadline(deadline)}
            title={`截止 ${formatDeadline(deadline, { fullDate: true })} · 点击修改`}
            aria-label={`修改 ${company.trim()} ${role} 的截止时间，${formatDeadline(deadline, { fullDate: true })}`}>
            <time dateTime={deadlineDateTime(deadline)}>{formatDeadline(deadline)}</time>
          </button>
        ) : <span className="qt-empty-step" aria-label="无截止时间">—</span>}
      </td>
      <td className="qt-details-cell">
        <button className="qt-row-open" onClick={onOpenDetails} title="查看申请详情" aria-label={`查看 ${company.trim()} ${role} 的申请详情`}>
          <Icon name="ChevronRight" size={17} />
        </button>
      </td>
    </tr>
  );
}
