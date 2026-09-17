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
