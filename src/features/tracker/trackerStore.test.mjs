import test from 'node:test';
import assert from 'node:assert/strict';
import { createTrackerStore, trackerStorageKey, validateTrackerImport, importTrackerPayload } from './trackerStore.js';
import { createCareerStageStore, stageStorageKey } from '../careerStages/stageStore.js';
import { filterApplications, getSummary, sortApplications } from './dataModel.js';

function memoryStorage() {
  const values = new Map();
  return { values, getItem:key => values.get(key) ?? null, setItem:(key,value) => values.set(key,value) };
}
function application(id = 'a1', role = 'Research Intern') {
  return { id, company:'Example Company', role, prepPhase:'stage-1', events:[{id:`${id}-submitted`,type:'submitted',date:'2026-09-17',dueDate:''}] };
}
function stores(storage = memoryStorage(), ownerId = 'alice', namespace = '') {
  return { storage, trackerStore:createTrackerStore({ownerId,namespace,storage,eventTarget:null}), stageStore:createCareerStageStore({ownerId,namespace,storage,eventTarget:null}) };
}

test('fresh accounts are empty and never read local preview or another account', () => {
  const storage=memoryStorage();
  storage.setItem('quantgym.tracker.preview.v1',JSON.stringify([application('preview')]));
  const alice=stores(storage); alice.trackerStore.addApplication(application());
  assert.deepEqual(stores(storage,'bob').trackerStore.getSnapshot().applications,[]);
  assert.deepEqual(stores(storage,'alice','qa').trackerStore.getSnapshot().applications,[]);
  assert.equal(stores(storage,'alice').trackerStore.getSnapshot().applications.length,1);
  assert.throws(()=>trackerStorageKey('guest'),/登录/);
});

test('one company can have independent roles and histories; latest persisted rows survive another tab adding', () => {
  const storage=memoryStorage(); const first=stores(storage).trackerStore; const second=stores(storage).trackerStore;
  first.addApplication(application('a1','Research Intern'));
  second.addApplication(application('a2','Trading Intern'));
  first.updateApplication({...application('a1'),events:[...application('a1').events,{id:'oa',type:'oa_received',date:'2026-09-18',dueDate:'2026-09-22'}]});
  const rows=first.getSnapshot().applications;
  assert.equal(rows.length,2);
  assert.equal(rows.find(row=>row.id==='a2').events.length,1);
  assert.equal(getSummary(rows).oa,1);
  assert.equal(filterApplications(rows,{query:'trading'}).length,1);
});

test('a stale details or progress form preserves another tab\'s events and durable event ID conflicts', () => {
  const storage=memoryStorage();
  const first=stores(storage).trackerStore;
  const second=stores(storage).trackerStore;
  first.addApplication(application());
  const stale=first.getSnapshot().applications[0];
  const received={id:'oa-received',type:'oa_received',date:'2026-09-18',dueDate:'2026-09-22'};
  second.updateApplication({...stale,events:[...stale.events,received]});
  first.updateApplication({...stale,role:'Updated Research Role'});
  assert.equal(first.getSnapshot().applications[0].role,'Updated Research Role');
  assert.deepEqual(first.getSnapshot().applications[0].events.map(event=>event.id),['a1-submitted','oa-received']);
  first.updateApplication({...stale,events:[...stale.events,{...received,dueDate:'2026-09-30'},{id:'oa-completed',type:'oa_completed',date:'2026-09-19',dueDate:''}]});
  const events=first.getSnapshot().applications[0].events;
  assert.deepEqual(events.map(event=>event.id),['a1-submitted','oa-received','oa-completed']);
  assert.equal(events.find(event=>event.id==='oa-received').dueDate,'2026-09-22');
});

test('invalid owner envelope and corrupted data are preserved, never silently reset', () => {
  const storage=memoryStorage(); const key=trackerStorageKey('alice');
  storage.setItem(key,JSON.stringify({version:1,ownerId:'bob',applications:[application()]}));
  const original=storage.getItem(key); const {trackerStore}=stores(storage);
  assert.match(trackerStore.getSnapshot().error,/账户/);
  assert.throws(()=>trackerStore.addApplication(application('new')),/账户/);
  assert.equal(storage.getItem(key),original);
  storage.setItem(key,'{broken'); trackerStore.refresh();
  assert.match(trackerStore.getSnapshot().error,/无法读取/);
  assert.throws(()=>trackerStore.mergeApplications([application()]),/无法读取/);
  assert.equal(storage.getItem(key),'{broken');
});

test('failed writes do not appear saved or remove existing records', () => {
  const storage=memoryStorage(); const {trackerStore}=stores(storage); trackerStore.addApplication(application());
  storage.setItem=()=>{throw new Error('Storage full');};
  assert.throws(()=>trackerStore.addApplication(application('new')),/Storage full/);
  assert.equal(trackerStore.getSnapshot().applications.length,1);
  assert.ok(trackerStore.getSnapshot().error);
});

test('import validates the entire file before writing either store', () => {
  const context=stores();
  const payload={applications:[application()],stages:[{id:'stage-1',label:'Stage 1',recordedDate:'2026-02-30'}]};
  assert.throws(()=>importTrackerPayload({...context,payload}),/日期/);
  assert.equal(context.storage.values.size,0);
  assert.throws(()=>validateTrackerImport({applications:[{...application(),events:[{id:'bad',type:'oa_received',date:'2026-09-17'}]}]}),/第一条/);
  assert.throws(()=>validateTrackerImport({applications:[{...application(),events:[{id:'bad',type:'submitted',date:''}]}]}),/日期/);
  assert.throws(()=>validateTrackerImport({applications:[{...application(),events:[{id:'bad',type:'submitted',date:'2026-09-17',dueDate:'tomorrow'}]}]}),/日期/);
});

test('import preserves existing IDs and metadata, merges missing rows, and deduplicates repeat transfers', () => {
  const context=stores();
  const current=context.stageStore.addStage({label:'Stage 1',description:'Already edited',recordedDate:'2026-09-16'});
  context.trackerStore.addApplication({...application(),company:'Edited Company'});
  const payload={applications:[application(),application('a2','Trading')],stages:[{id:'stage-1',label:'Stage 1',description:'Old description',recordedDate:'2026-09-15'},{id:'stage-2',label:'Stage 2',description:'Ready',recordedDate:'2026-09-17'}]};
  assert.equal(importTrackerPayload({...context,payload}),1);
  assert.equal(importTrackerPayload({...context,payload}),0);
  const stages=context.stageStore.getSnapshot().stages;
  assert.equal(stages.find(stage=>stage.id===current.id).recordedDate,'2026-09-16');
  assert.equal(stages.find(stage=>stage.id===current.id).description,'Already edited');
  assert.deepEqual(stages.find(stage=>stage.id===current.id).importedIds,['stage-1']);
  assert.equal(stages.find(stage=>stage.id==='stage-2').recordedDate,'2026-09-17');
  assert.equal(context.trackerStore.getSnapshot().applications.find(row=>row.id==='a1').company,'Edited Company');
});

test('legacy month/day dates remain yearless and imported aliases still point to a stage', () => {
  const validated=validateTrackerImport({applications:[{...application(),prepPhase:'old-stage',events:[{id:'old',type:'submitted',date:'9/17',year:null,note:'Old note'}]}],stages:[{id:'stage-1',label:'Stage 1',importedIds:['old-stage']}]});
  assert.equal(validated.applications[0].events[0].date,'9/17');
  assert.equal(validated.applications[0].events[0].year,undefined);
  assert.equal(validated.applications[0].events[0].note,undefined);
  assert.equal(validated.applications[0].prepPhase,'stage-1');
  assert.equal(validated.stages[0].recordedDate,null);
  assert.equal(sortApplications(validated.applications,'recent').length,1);
});

test('an interrupted stage import reports partial completion and retry restores the pending date', () => {
  const context=stores(); const original=context.storage.setItem;
  let stageWrites=0;
  context.storage.setItem=(key,value)=>{
    if(key===stageStorageKey('alice') && ++stageWrites===2) throw new Error('Quota');
    original(key,value);
  };
  const payload={applications:[application()],stages:[{id:'stage-1',label:'Stage 1',recordedDate:'2026-09-17'}]};
  assert.throws(()=>importTrackerPayload({...context,payload}),/导入尚未完成/);
  assert.equal(context.trackerStore.getSnapshot().applications.length,0);
  assert.equal(context.stageStore.getSnapshot().stages[0].recordedDate,null);
  context.storage.setItem=original;
  assert.equal(importTrackerPayload({...context,payload}),1);
  assert.equal(context.stageStore.getSnapshot().stages[0].recordedDate,'2026-09-17');
});

test('StrictMode subscribe/cleanup reconnects without leaked listeners', () => {
  const handlers=new Map();
  const target={addEventListener(type,callback){const set=handlers.get(type)||new Set();set.add(callback);handlers.set(type,set);},removeEventListener(type,callback){handlers.get(type)?.delete(callback);}};
  const storage=memoryStorage(); const tracker=createTrackerStore({ownerId:'alice',storage,eventTarget:target});
  assert.equal(handlers.size,0);
  const cleanup=tracker.subscribe(()=>{});
  assert.equal(handlers.get('storage').size,1);
  cleanup();tracker.dispose();assert.equal(handlers.get('storage').size,0);
  const replay=tracker.subscribe(()=>{}); assert.equal(handlers.get('storage').size,1);
  tracker.addApplication(application());assert.equal(tracker.getSnapshot().applications.length,1);
  replay();assert.equal(handlers.get('storage').size,0);
});

test('deadline clock times survive import, storage and reload; legacy dates remain time-free', () => {
  const context = stores();
  const timed = application('timed');
  timed.events.push({ id: 'oa', type: 'oa_received', date: '2026-09-18', dueDate: '2026-09-22', dueTime: '00:05' });
  const legacy = application('legacy');
  legacy.events[0].dueDate = '2026-09-22';
  const payload = { applications: [timed, legacy] };
  assert.equal(importTrackerPayload({ ...context, payload }), 2);
  const reloaded = stores(context.storage).trackerStore.getSnapshot().applications;
  assert.equal(reloaded[0].events[1].dueTime, '00:05');
  assert.equal(reloaded[0].events[1].dueDate, '2026-09-22');
  assert.equal(reloaded[1].events[0].dueTime, '');
  const next = { id: 'interview', type: 'interview', date: '2026-09-19', dueDate: '2026-09-25', dueTime: '23:59' };
  context.trackerStore.updateApplication({ ...reloaded[0], events: [...reloaded[0].events, next] });
  assert.equal(stores(context.storage).trackerStore.getSnapshot().applications[0].events.at(-1).dueTime, '23:59');
  assert.equal(JSON.parse(context.storage.getItem(context.trackerStore.key)).version, 2);
});

test('version 1 date-only records upgrade in place only after a successful save', () => {
  const storage = memoryStorage();
  const key = trackerStorageKey('alice');
  const legacy = application();
  legacy.events[0].dueDate = '2026-09-20';
  const original = JSON.stringify({ version: 1, ownerId: 'alice', applications: [legacy] });
  storage.setItem(key, original);
  const { trackerStore } = stores(storage);
  assert.equal(trackerStore.getSnapshot().error, '');
  assert.equal(trackerStore.getSnapshot().applications[0].events[0].dueDate, '2026-09-20');
  assert.equal(trackerStore.getSnapshot().applications[0].events[0].dueTime, '');
  assert.equal(storage.getItem(key), original);
  trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueTime: '13:45' });
  const envelope = JSON.parse(storage.getItem(key));
  assert.equal(envelope.version, 2);
  assert.equal(envelope.ownerId, 'alice');
  assert.equal(envelope.applications.length, 1);
  assert.equal(envelope.applications[0].events[0].dueDate, '2026-09-20');
  assert.equal(envelope.applications[0].events[0].dueTime, '13:45');
  assert.equal(stores(storage).trackerStore.getSnapshot().applications[0].events[0].dueTime, '13:45');
  assert.deepEqual([...storage.values.keys()], [key]);
});

test('unknown storage versions reject reads and writes without changing the original envelope', () => {
  for (const version of [0, 3, '2', null]) {
    const storage = memoryStorage();
    const key = trackerStorageKey('alice');
    const original = JSON.stringify({ version, ownerId: 'alice', applications: [application()] });
    storage.setItem(key, original);
    const { trackerStore } = stores(storage);
    assert.match(trackerStore.getSnapshot().error, /版本/);
    assert.throws(() => trackerStore.addApplication(application('new')), /版本/);
    assert.throws(() => trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueDate: '2026-09-19', dueTime: '14:30' }), /版本/);
    assert.equal(storage.getItem(key), original);
  }
});

test('invalid deadline times reject the entire import before either store writes', () => {
  for (const dueTime of ['24:00', '12:60', '9:30', '09:3', '09:30:00', ' 09:30', '09:30Z', 930, 0, false]) {
    const context = stores();
    const invalid = application();
    invalid.events[0] = { ...invalid.events[0], dueDate: '2026-09-19', dueTime };
    const payload = { applications: [invalid], stages: [{ id: 'stage-1', label: 'Stage 1' }] };
    assert.throws(() => importTrackerPayload({ ...context, payload }), /截止时间/);
    assert.equal(context.storage.values.size, 0);
  }
  const orphan = application();
  orphan.events[0].dueTime = '12:30';
  assert.throws(() => validateTrackerImport({ applications: [orphan] }), /截止时间/);
});

test('editing a deadline reads the latest row and preserves concurrent progress and application changes', () => {
  const storage = memoryStorage();
  const first = stores(storage).trackerStore;
  const second = stores(storage).trackerStore;
  first.addApplication(application());
  const stale = first.getSnapshot().applications[0];
  second.updateApplication({ ...stale, role: 'Changed in another tab', events: [...stale.events,
    { id: 'oa', type: 'oa_received', date: '2026-09-18', dueDate: '2026-09-22', dueTime: '14:30' },
  ] });
  first.updateEventDeadline('a1', 'a1-submitted', { dueDate: '2026-09-20', dueTime: '09:45', type: 'rejected' });
  const latest = first.getSnapshot().applications[0];
  assert.equal(latest.role, 'Changed in another tab');
  assert.deepEqual(latest.events.map(event => event.id), ['a1-submitted', 'oa']);
  assert.equal(latest.events[0].type, 'submitted');
  assert.equal(latest.events[0].date, '2026-09-17');
  assert.equal(latest.events[0].dueTime, '09:45');
  assert.equal(latest.events[1].dueTime, '14:30');
  // A stale append-only form must also keep the explicitly edited deadline.
  second.updateApplication(stale);
  assert.equal(second.getSnapshot().applications[0].events[0].dueTime, '09:45');
  assert.equal(second.getSnapshot().applications[0].events.length, 2);
});

test('deadline edits preserve omitted fields and explicit date removal also clears the clock time', () => {
  const { trackerStore, storage } = stores();
  trackerStore.addApplication(application());
  trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueDate: '2026-09-20', dueTime: '09:45' });
  trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueTime: '10:00' });
  let event = trackerStore.getSnapshot().applications[0].events[0];
  assert.equal(event.dueDate, '2026-09-20');
  assert.equal(event.dueTime, '10:00');
  trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueDate: '2026-09-21' });
  assert.equal(trackerStore.getSnapshot().applications[0].events[0].dueTime, '10:00');
  trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueDate: '', dueTime: '10:00' });
  event = stores(storage).trackerStore.getSnapshot().applications[0].events[0];
  assert.equal(event.dueDate, '');
  assert.equal(event.dueTime, '');
});

test('invalid or missing-target deadline edits leave saved records untouched', () => {
  const { trackerStore, storage } = stores();
  trackerStore.addApplication(application());
  const saved = storage.getItem(trackerStore.key);
  assert.throws(() => trackerStore.updateEventDeadline('missing', 'a1-submitted', { dueDate: '' }), /申请/);
  assert.throws(() => trackerStore.updateEventDeadline('a1', 'missing', { dueDate: '' }), /进展/);
  assert.throws(() => trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueDate: '2026-02-30', dueTime: '10:00' }), /日期/);
  assert.throws(() => trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueDate: '2026-09-19', dueTime: '25:00' }), /截止时间/);
  assert.throws(() => trackerStore.updateEventDeadline('a1', 'a1-submitted', { dueTime: '12:30' }), /截止时间/);
  assert.equal(storage.getItem(trackerStore.key), saved);
});
