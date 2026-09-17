import React, { useMemo, useState } from 'react';
import { getApplicationView, getSummary } from './dataModel.js';
import ApplicationRow from './ApplicationRow.jsx';
import Icon from './TrackerIcon.jsx';

export default function ApplicationList({ applications, stages, status, onStatusChange, saveError, onOpenDetails, onUpdateProgress, onEditDeadline, onAddApplication }) {
  const [view, setView] = useState('table');
  const [collapsed, setCollapsed] = useState({});
  const summary = getSummary(applications);
  const { applications: visible, groups } = useMemo(() => getApplicationView(applications, stages, status), [applications, stages, status]);
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
    onOpenDetails={() => onOpenDetails(application)}
    onUpdateProgress={() => onUpdateProgress(application)}
    onEditDeadline={event => onEditDeadline(application, event)}
  />;

  return <section className="qt-tracker-panel" aria-label="投递记录">
    <div className="qt-panel-header">
      <div className="qt-panel-title"><Icon name="Table2" size={19}/><h2>投递记录</h2><span>{applications.length}</span></div>
      <div className="qt-view-switch" aria-label="显示方式">
        <button type="button" aria-label="表格视图" title="表格视图" aria-pressed={view === 'table'} className={view === 'table' ? 'qt-active' : ''} onClick={() => setView('table')}><Icon name="Table2" size={16}/></button>
        <button type="button" aria-label="紧凑视图" title="紧凑视图" aria-pressed={view === 'compact'} className={view === 'compact' ? 'qt-active' : ''} onClick={() => setView('compact')}><Icon name="List" size={16}/></button>
      </div>
    </div>
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
    </div>
    <div className={`qt-table-scroll qt-${view}`} tabIndex={0} aria-label="横向滚动查看申请进展">
      <table>
        <colgroup><col className="qt-col-company"/><col className="qt-col-role"/><col className="qt-col-event"/><col className="qt-col-event"/><col className="qt-col-latest"/><col className="qt-col-deadline"/><col className="qt-col-open"/></colgroup>
        <thead><tr><th scope="col">公司</th><th scope="col">岗位</th><th scope="col"><span className="qt-step-number">01</span>投递</th><th scope="col"><span className="qt-step-number">02</span>后续进展</th><th scope="col"><span className="qt-step-number">03</span>最新进展</th><th scope="col">DDL</th><th scope="col"><span className="qt-sr-only">详情</span></th></tr></thead>
        {groups ? groups.map(({ stage, applications: rows }) => {
          if (!rows.length && status !== 'all') return null;
          return <tbody key={stage.id}>
            <tr className="qt-phase-row"><th colSpan={7} scope="rowgroup">
              <button type="button" aria-expanded={!collapsed[stage.id]} onClick={() => setCollapsed(value => ({ ...value, [stage.id]: !value[stage.id] }))}>
                <Icon name={collapsed[stage.id] ? 'ChevronRight' : 'ChevronDown'} size={16}/>
                <span className="qt-phase-badge">{stage.label}</span>
                <span className="qt-phase-description">{stage.description}</span>
                <span className="qt-phase-count">{rows.length} 份申请</span>
                <span className="qt-phase-caption">{stage.recordedDate || stage.usesTodayBoundary ? `${stage.usesTodayBoundary ? '截至今天' : stage.recordedDate.replaceAll('-', '.')} · 阶段刷题 ${stage.questionCount ?? '—'} 题` : '投递时的准备阶段'}</span>
              </button>
            </th></tr>
            {!collapsed[stage.id] && (rows.length ? rows.map(renderRow) : <tr className="qt-empty-phase-row"><td colSpan={7}>这个阶段还没有投递，添加申请时可选择此 Stage。</td></tr>)}
          </tbody>;
        }) : <tbody>{visible.map(renderRow)}</tbody>}
      </table>
      {!visible.length && <div className="qt-empty-state">
        <Icon name={applications.length ? 'SearchX' : 'BriefcaseBusiness'} size={30}/>
        <h3>{applications.length ? (status === 'ddl' ? '目前没有待截止的申请' : '这个状态下还没有申请') : '从第一份申请开始'}</h3>
        <p>{applications.length ? '切回全部，查看所有投递记录。' : '记录公司、岗位和每一次进展。'}</p>
        <button type="button" className="qt-btn" onClick={() => applications.length ? onStatusChange('all') : onAddApplication()}>{applications.length ? '查看全部申请' : '添加申请'}</button>
      </div>}
    </div>
    <div className="qt-table-footer"><span>显示 {visible.length} / {applications.length} 份申请</span><span><Icon name="MousePointer2" size={13}/>点击岗位查看完整进展</span></div>
  </section>;
}
