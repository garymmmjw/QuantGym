import { useEffect, useMemo, useRef, useState } from 'react';
import { APPLICATION_STATUSES, getApplications } from './applicationModel.js';
import { createApplicationDraft, persistApplicationDraft, persistApplicationArchive } from './applicationDraft.js';
import './applications.css';

const labels = {
  zh: { wishlist: '准备投递', applied: '已投递', oa: '笔试 / OA', interview: '面试中', offer: '已获 Offer', rejected: '未通过', withdrawn: '已撤回' },
  en: { wishlist: 'Wishlist', applied: 'Applied', oa: 'OA', interview: 'Interview', offer: 'Offer', rejected: 'Rejected', withdrawn: 'Withdrawn' },
};
const fields = {
  zh: { company: '公司', role: '岗位', location: '工作地点', url: '职位链接', deadline: '截止日期', nextAction: '下一步行动', nextActionDate: '下一步日期', notes: '申请备注' },
  en: { company: 'Company', role: 'Role', location: 'Location', url: 'Job link', deadline: 'Deadline', nextAction: 'Next action', nextActionDate: 'Action date', notes: 'Notes' },
};
const limits = { company: 200, role: 300, location: 300, url: 2048, nextAction: 2000, notes: 20000 };

export function ApplicationTracker({ state, update, language = 'zh', prefill = null, focusApplicationId = '' }) {
  const en = language === 'en', lang = en ? 'en' : 'zh';
  const all = useMemo(() => getApplications(state, { includeArchived: true }), [state.applicationEvents]);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [showArchived, setShowArchived] = useState(false);
  const [editor, setEditor] = useState(() => prefill ? createApplicationDraft({ prefill }) : null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState(null);
  const openedFocus = useRef('');
  const visible = all.filter(row => row.archived === showArchived && (filter === 'all' || row.status === filter)
    && [row.company, row.role, row.location, row.nextAction, row.notes].join(' ').toLocaleLowerCase().includes(search.toLocaleLowerCase()));
  const live = all.filter(row => !row.archived);
  function open(application = null) {
    setError('');
    setEditor(createApplicationDraft({ application }));
  }
  function updateField(field, value) {
    setEditor(previous => previous ? { ...previous, values: { ...previous.values, [field]: value } } : previous);
  }
  useEffect(() => {
    if (!focusApplicationId || openedFocus.current === focusApplicationId) return;
    const application = all.find(row => row.id === focusApplicationId);
    if (!application) return;
    openedFocus.current = focusApplicationId;
    setShowArchived(application.archived);
    open(application);
  }, [focusApplicationId, all]);
  function save(event) {
    event.preventDefault();
    try {
      const result = persistApplicationDraft(update, editor);
      if (!result.ok) {
        setEditor(result.draft);
        setNotice(null);
        setError(en ? 'This application is only kept in this open page; saving failed. Keep this page open and click Save application to retry.' : '保存失败，申请目前仅保留在当前页面。请保持页面打开，再点“保存申请”重试。');
        return;
      }
      setEditor(null);
      setError('');
      setNotice({ text: en ? 'Application saved.' : '申请记录已保存。' });
    } catch {
      setError(en ? 'Check the company, role, dates and http(s) link. Your form is kept.' : '请检查公司、岗位、日期和 http(s) 链接。填写内容已保留。');
    }
  }
  function archive(application, archived) {
    try {
      const result = persistApplicationArchive(update, application.id, archived);
      if (!result.ok) {
        setNotice({ text: en ? 'This change is only kept in this open page; saving failed. Keep this page open and retry.' : '保存失败，此次改动目前仅保留在当前页面。请保持页面打开并重试。', retryArchive: { application, archived } });
        return;
      }
      setNotice(archived ? { text: en ? `${application.company} archived.` : `已归档 ${application.company}。`, undoId: application.id } : { text: en ? 'Application restored.' : '申请记录已恢复。' });
    } catch { setNotice({ text: en ? 'Unable to update this application; its record is kept.' : '暂时无法更新，原申请记录已保留。' }); }
  }
  return <section className="personal-applications">
    <header className="pa-heading"><div><p className="pa-eyebrow">{en ? 'YOUR NEXT OPPORTUNITY' : '追踪下一次机会'}</p><h1>{en ? 'My applications' : '我的申请'}</h1><p>{en ? 'Keep each role, deadline and next step in one place.' : '把每个岗位、截止日期和下一步，记在一起。'}</p></div><button type="button" className="pa-primary" onClick={() => open()}>{en ? '+ Add application' : '+ 新增申请'}</button></header>
    <div className="pa-summary" aria-label={en ? 'Application summary' : '申请概览'}><span><strong>{live.length}</strong>{en ? 'tracked' : '份申请'}</span><span><strong>{live.filter(row => ['applied', 'oa', 'interview'].includes(row.status)).length}</strong>{en ? 'in progress' : '正在进行'}</span><span><strong>{live.filter(row => row.status === 'offer').length}</strong>Offer</span></div>

    {notice && <div className="pa-notice" role={notice.retryArchive ? 'alert' : 'status'}><span>{notice.text}</span>{notice.retryArchive && <button type="button" onClick={() => archive(notice.retryArchive.application, notice.retryArchive.archived)}>{en ? 'Retry saving' : '重试保存'}</button>}{notice.undoId && <button type="button" onClick={() => archive(all.find(row => row.id === notice.undoId) || { id: notice.undoId }, false)}>{en ? 'Undo archive' : '撤销归档'}</button>}<button type="button" aria-label={en ? 'Dismiss notice' : '关闭提示'} onClick={() => setNotice(null)}>×</button></div>}

    {editor && <form className="pa-editor" onSubmit={save}>
      <div className="pa-editor-heading"><h2>{editor.id ? en ? 'Edit application' : '编辑申请' : en ? 'Add an application' : '新增申请'}</h2><button type="button" className="pa-text-button" onClick={() => { setEditor(null); setError(''); }}>{en ? 'Cancel' : '取消'}</button></div>
      <div className="pa-form-grid">
        {['company', 'role', 'location', 'url'].map(field => <label key={field}>{fields[lang][field]}{['company', 'role'].includes(field) && <span className="pa-required"> *</span>}<input name={field} type={field === 'url' ? 'url' : 'text'} required={['company', 'role'].includes(field)} maxLength={limits[field]} placeholder={field === 'url' ? 'https://' : undefined} value={editor.values[field]} onChange={event => updateField(field, event.target.value)} /></label>)}
        <label>{en ? 'Status' : '当前阶段'}<select name="status" value={editor.values.status} onChange={event => updateField('status', event.target.value)}>{APPLICATION_STATUSES.map(status => <option key={status} value={status}>{labels[lang][status]}</option>)}</select></label>
        <label>{fields[lang].deadline}<input name="deadline" type="date" value={editor.values.deadline} onInput={event => updateField('deadline', event.target.value)} onChange={event => updateField('deadline', event.target.value)} /></label>
        <label>{fields[lang].nextAction}<input name="nextAction" type="text" maxLength={limits.nextAction} value={editor.values.nextAction} onChange={event => updateField('nextAction', event.target.value)} /></label>
        <label>{fields[lang].nextActionDate}<input name="nextActionDate" type="date" value={editor.values.nextActionDate} onInput={event => updateField('nextActionDate', event.target.value)} onChange={event => updateField('nextActionDate', event.target.value)} /></label>
        <label className="pa-field-wide">{fields[lang].notes}<textarea name="notes" rows="4" maxLength={limits.notes} value={editor.values.notes} onChange={event => updateField('notes', event.target.value)} /></label>
      </div>
      {error && <p className="pa-error" role="alert">{error}</p>}
      <div className="pa-editor-footer"><p>{en ? 'Saved privately to your personal workspace.' : '保存在你的个人工作区，仅当前账户可见。'}</p><button type="submit" className="pa-primary">{en ? 'Save application' : '保存申请'}</button></div>
    </form>}

    <div className="pa-filters"><label className="pa-search"><span className="pa-visually-hidden">{en ? 'Search applications' : '搜索申请'}</span><input type="search" placeholder={en ? 'Search company, role or notes…' : '搜索公司、岗位或备注…'} value={search} onChange={event => setSearch(event.target.value)} /></label><label><span className="pa-visually-hidden">{en ? 'Filter by status' : '按阶段筛选'}</span><select value={filter} onChange={event => setFilter(event.target.value)}><option value="all">{en ? 'All statuses' : '全部阶段'}</option>{APPLICATION_STATUSES.map(status => <option key={status} value={status}>{labels[lang][status]}</option>)}</select></label><label className="pa-archive-filter"><input type="checkbox" checked={showArchived} onChange={event => setShowArchived(event.target.checked)} />{en ? 'Archived' : '已归档'}</label></div>
    <div className="pa-list" aria-label={en ? 'Applications' : '申请记录'}>
      {visible.map(application => <article key={application.id} className="pa-application"><div className="pa-application-main"><div className="pa-application-title"><h2>{application.company}</h2><span className={`pa-status pa-status-${application.status}`}>{labels[lang][application.status]}</span></div><p className="pa-role">{application.role}{application.location && <span> · {application.location}</span>}</p>{application.url && <a className="pa-link" href={application.url} target="_blank" rel="noopener noreferrer">{en ? 'View job posting' : '打开职位链接'} <span aria-hidden="true">↗</span></a>}
        {application.notes && <details className="pa-notes"><summary>{en ? 'Application notes' : '申请备注'}</summary><p>{application.notes}</p></details>}
      </div><div className="pa-application-next"><span className="pa-label">{en ? 'Next action' : '下一步'}</span><p>{application.nextAction || (en ? 'No action planned' : '尚未安排')}</p>{application.nextActionDate && <time dateTime={application.nextActionDate}>{application.nextActionDate}</time>}{application.deadline && <p className="pa-deadline">{en ? 'Deadline' : '截止'} <time dateTime={application.deadline}>{application.deadline}</time></p>}</div><div className="pa-application-actions"><button type="button" className="pa-text-button" onClick={() => open(application)}>{en ? 'Edit' : '编辑'}</button><button type="button" className="pa-text-button" onClick={() => archive(application, !application.archived)}>{application.archived ? en ? 'Restore' : '恢复' : en ? 'Archive' : '归档'}</button></div></article>)}
      {!visible.length && <div className="pa-empty"><h2>{search || filter !== 'all' ? en ? 'No matching applications' : '没有匹配的申请' : showArchived ? en ? 'No archived applications' : '暂无归档申请' : en ? 'Start with your next application' : '从你的下一份申请开始'}</h2><p>{search || filter !== 'all' ? en ? 'Try another search or status.' : '试试其他关键词或阶段。' : showArchived ? en ? 'Archived records can be restored at any time.' : '归档后的记录可以随时恢复。' : en ? 'Add a real role you plan to apply for, then record its next step.' : '添加一个你准备申请的真实岗位，再记下下一步。'}</p>{!showArchived && !search && filter === 'all' && <button type="button" className="pa-primary" onClick={() => open()}>{en ? 'Add first application' : '添加第一份申请'}</button>}</div>}
    </div>
  </section>;
}
