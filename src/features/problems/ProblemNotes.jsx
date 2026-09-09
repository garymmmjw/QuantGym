import { useEffect, useState } from 'react';
import { createProblemNoteStore } from './problemNotes.js';
import { subscribeLocalRecovery } from '../../state/localRecovery.js';
export function ProblemNotes({ ownerId, problemId, isEnglish }) {
  const [store] = useState(() => createProblemNoteStore({ ownerId, problemId }));
  const [draft, setDraft] = useState(store.get);
  useEffect(() => subscribeLocalRecovery(() => setDraft(store.get())), [store]);
  return <div>
    <textarea className="qg-detail-notes" aria-label={isEnglish ? 'Private problem notes' : '个人题目笔记'} placeholder={isEnglish ? 'Jot a note…' : '写点笔记…'} disabled={!ownerId} value={draft.value} onChange={event => { store.save(event.target.value); setDraft(store.get()); }} />
    <small role="status">{draft.error ? (isEnglish ? 'Not saved. Your draft is retained in this tab; use the recovery controls above.' : '尚未保存。草稿保留在当前页面，请使用上方恢复操作。') : (isEnglish ? 'Saved on this browser for your account.' : '按账户保存在此浏览器。')}</small>
    {draft.legacyAvailable && !draft.legacyImported && <details><summary>{isEnglish ? 'Recover an older note' : '恢复旧版笔记'}</summary><p>{isEnglish ? 'This browser has an older note with no recorded owner. Only import it if it is yours. Your current note will be kept.' : '此浏览器有未标注账户的旧笔记。请仅在确认属于自己时导入；当前笔记会保留。'}</p><button type="button" onClick={() => { store.adoptLegacy(true); setDraft(store.get()); }}>{isEnglish ? 'This is my note; merge it into my account' : '这是我的笔记，合并到当前账户'}</button></details>}
  </div>;
}
