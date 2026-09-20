import React, { useMemo, useRef, useState } from 'react';
import { getApplicationView, getProgressColumnCount, getSummary } from './dataModel.js';
import ApplicationRow from './ApplicationRow.jsx';
import Icon from './TrackerIcon.jsx';
import { formatStagePeriod } from '../careerStages/stagePractice.js';

export default function ApplicationList({ applications, stages, status, onStatusChange, saveError, onOpenDetails, onUpdateProgress, onEditEvent, onEditDeadline, onAddApplication }) {
  const [view, setView] = useState('table');
  const [collapsed, setCollapsed] = useState({});
  const [query, setQuery] = useState('');
  const searchInput = useRef(null);
  const hasQuery = Boolean(query.trim());
  const search = value => { setQuery(value); setCollapsed({}); };
  const clearSearch = () => { search(''); searchInput.current?.focus(); };
  const summary = getSummary(applications);
  const progressColumnCount = Math.max(3, getProgressColumnCount(applications));
  const progressColumns = Array.from({ length: progressColumnCount }, (_, index) => index);
  const columnCount = progressColumnCount + 4;
  const { applications: visible, groups } = useMemo(() => getApplicationView(applications, stages, status, query), [applications, stages, status, query]);
  const views = [
    ['all', '全部', summary.total],
    ['ddl', 'DDL', summary.ddl],
    ['awaiting', '等待回复', summary.awaiting],
    ['oa', 'OA', summary.oa],
    ['interview', '面试', summary.interview],
    ['offer', 'Offer', summary.offer],
    ['closed', '已结束', summary.closed],
    ['company', '按公司'],
  ];
  const renderRow = application => <ApplicationRow
    key={application.id}
    application={application}
    progressColumnCount={progressColumnCount}
    onOpenDetails={() => onOpenDetails(application)}
    onUpdateProgress={() => onUpdateProgress(application)}
    onEditEvent={event => onEditEvent(application, event)}
    onEditDeadline={event => onEditDeadline(application, event)}
  />;

  return <section className="qt-tracker-panel" aria-label="投递记录">
    {saveError && <p className="qt-tracker-error" role="alert">{saveError}</p>}
    <div className="qt-table-toolbar">
      <div className="qt-filter-tabs" aria-label="申请视图">
        {views.map(([id, label, count]) => <button
          type="button"
          key={id}
          className={[id === 'ddl' ? 'qt-ddl-tab' : '', id === 'company' ? 'qt-company-tab' : '', status === id ? 'qt-active' : ''].filter(Boolean).join(' ')}
          onClick={() => onStatusChange(id)}
          aria-pressed={status === id}
        >{label}{count !== undefined && <span>{count}</span>}</button>)}
      </div>
      <div className="qt-toolbar-controls">
        <div className="qt-search"><Icon name="Search" size={16}/><span className="qt-sr-only">搜索公司或岗位</span><input ref={searchInput} aria-label="搜索公司或岗位" type="search" value={query} onChange={event => search(event.target.value)} placeholder="搜索公司或岗位…" />{query && <button type="button" aria-label="清空搜索" onClick={clearSearch}><Icon name="X" size={14}/></button>}</div>
        <div className="qt-view-switch" aria-label="显示方式">
          <button type="button" aria-label="表格视图" title="表格视图" aria-pressed={view === 'table'} className={view === 'table' ? 'qt-active' : ''} onClick={() => setView('table')}><Icon name="Table2" size={16}/></button>
          <button type="button" aria-label="紧凑视图" title="紧凑视图" aria-pressed={view === 'compact'} className={view === 'compact' ? 'qt-active' : ''} onClick={() => setView('compact')}><Icon name="List" size={16}/></button>
        </div>
      </div>
    </div>
    <div className={`qt-table-scroll qt-${view}`} tabIndex={0} aria-label="横向滚动查看申请进展">
      <table className="qt-progress-table" style={{ '--qt-progress-column-count': progressColumnCount }}>
        <colgroup><col className="qt-col-company"/><col className="qt-col-role"/>{progressColumns.map(index => <col className="qt-col-event" key={index}/>)}<col className="qt-col-update"/><col className="qt-col-deadline"/></colgroup>
        <thead><tr><th scope="col">公司</th><th scope="col">岗位</th>{progressColumns.map(index => <th scope="col" key={index}>{index === 0 ? '投递' : `阶段 ${index + 1}`}</th>)}<th scope="col">更新进展</th><th scope="col">DDL</th></tr></thead>
        {groups ? groups.map(({ stage, applications: rows }) => {
          if (!rows.length && (status !== 'all' || hasQuery)) return null;
          return <tbody key={stage.id}>
            <tr className="qt-phase-row"><th colSpan={columnCount} scope="rowgroup">
              <button type="button" aria-expanded={!collapsed[stage.id]} onClick={() => setCollapsed(value => ({ ...value, [stage.id]: !value[stage.id] }))}>
                <Icon name={collapsed[stage.id] ? 'ChevronRight' : 'ChevronDown'} size={16}/>
                <span className="qt-phase-badge">{stage.label}</span>
                <span className="qt-phase-description">{stage.description}</span>
                <span className="qt-phase-count">{rows.length} 份申请</span>
                <span className="qt-phase-caption" title={stage.countSourceNote}>{stage.id ? <>{formatStagePeriod(stage)} · {stage.countStatus === 'partial' && stage.questionCount !== null ? '已确认刷题' : '阶段刷题'} <strong>{stage.questionCount ?? '—'}</strong> 题</> : '投递时的准备阶段'}</span>
              </button>
            </th></tr>
            {!collapsed[stage.id] && (rows.length ? rows.map(renderRow) : <tr className="qt-empty-phase-row"><td colSpan={columnCount}>这个阶段还没有投递，添加申请时可选择此 Stage。</td></tr>)}
          </tbody>;
        }) : <tbody>{visible.map(renderRow)}</tbody>}
      </table>
      {!visible.length && <div className="qt-empty-state">
        <Icon name={applications.length ? 'SearchX' : 'BriefcaseBusiness'} size={30}/>
        <h3>{hasQuery ? '没有匹配的公司或岗位' : applications.length ? (status === 'ddl' ? '目前没有待截止的申请' : '这个状态下还没有申请') : '从第一份申请开始'}</h3>
        <p>{hasQuery ? '试试其他关键词，或清空搜索。' : applications.length ? '切回全部，查看所有投递记录。' : '记录公司、岗位和每一次进展。'}</p>
        <button type="button" className="qt-btn" onClick={() => hasQuery ? clearSearch() : applications.length ? onStatusChange('all') : onAddApplication()}>{hasQuery ? '清空搜索' : applications.length ? '查看全部申请' : '添加申请'}</button>
      </div>}
    </div>
    <div className="qt-table-footer"><span role="status" aria-live="polite">显示 {visible.length} / {applications.length} 份申请</span><span><Icon name="MousePointer2" size={13}/>点击进展修改 · 点击岗位查看详情</span></div>
  </section>;
}
