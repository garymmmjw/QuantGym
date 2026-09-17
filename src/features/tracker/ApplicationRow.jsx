import React from 'react';
import { STATUS_META, getCurrentStatus, getCurrentDeadlineEvent, formatDeadline, deadlineDateTime } from './dataModel.js';
import Icon from './TrackerIcon.jsx';

function EventPill({ event }) {
  if (!event) return <span className="qt-empty-step" aria-label="暂无进展">—</span>;
  const meta = STATUS_META[event.type] || { label: event.type, tone: 'neutral' };
  const shortDate = /^\d{4}-\d{2}-\d{2}$/.test(event.date || '')
    ? event.date.slice(5).replace('-', '/') : event.date;
  return (
    <span className={`qt-event-pill qt-${meta.tone}`} title={`${event.date} · 点击修改记录`}>
      <span className="qt-event-label">{meta.label}</span>
      <span className="qt-event-date">{shortDate || '日期未填'}</span>
    </span>
  );
}

export default function ApplicationRow({ application, progressColumnCount, onOpenDetails, onUpdateProgress, onEditEvent, onEditDeadline }) {
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
      {Array.from({ length: progressColumnCount }, (_, index) => <td className="qt-progress-cell" key={index}>
        {events[index] ? <button
          type="button"
          className="qt-edit-progress"
          onClick={() => onEditEvent(events[index])}
          title="点击修改这条记录"
          aria-label={`修改 ${company.trim()} ${role} 的${index === 0 ? '投递' : `阶段 ${index + 1}`}记录`}
        ><EventPill event={events[index]}/></button> : <EventPill/>}
      </td>)}
      <td className="qt-update-cell">
        <button type="button" className="qt-add-progress" onClick={onUpdateProgress} aria-label={`更新 ${company.trim()} ${role} 的进展`}>
          <Icon name="Plus" size={13} /><span>更新进展</span>
        </button>
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
    </tr>
  );
}
