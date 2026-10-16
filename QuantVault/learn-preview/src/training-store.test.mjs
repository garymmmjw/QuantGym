import test from 'node:test';
import assert from 'node:assert/strict';
import {createTrainingProfile} from './scoring/training-system.mjs';
import {normalizeProgress,completeLocalLesson} from './local-progress.mjs';
import {trainingKey,LEARN_KEY,recoveryKey,rawRecoveryKey,saveTrainingProfile,readTrainingProfile,createBackup,validateBackup,applyBackup,readLearnProgress,validateLearnProgress} from './training-store.mjs';
const sources = {problemsIndex: []};
const profile = id => createTrainingProfile({now:1000,id});
class MemoryStorage {
  data = new Map();
  getItem(k) { return this.data.get(k) ?? null; }
  setItem(k,v) { this.data.set(k,String(v)); }
  removeItem(k) { this.data.delete(k); }
}
test('personal and demo records stay isolated across reloads',()=>{
  const storage=new MemoryStorage();
  saveTrainingProfile(storage,'personal',profile('personal'),sources);
  saveTrainingProfile(storage,'demo',profile('demo'),sources);
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'personal');
  assert.equal(readTrainingProfile(storage,'demo',sources).id,'demo');
});
test('complete backup roundtrip keeps learning award ledger and recovery snapshot',()=>{
  const storage=new MemoryStorage();
  saveTrainingProfile(storage,'personal',profile('old'),sources);
  const learn=completeLocalLesson(normalizeProgress(),'lec-probability-intro',40,2000).progress;
  const backup=createBackup(profile('new'),learn);
  applyBackup(storage,'personal',backup,sources,['lec-probability-intro']);
  assert.deepEqual(readLearnProgress(storage,['lec-probability-intro']),learn);
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'new');
  const previous=validateBackup(storage.getItem(recoveryKey('personal')),sources,['lec-probability-intro']);
  applyBackup(storage,'personal',previous,sources,['lec-probability-intro']);
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'old');
  assert.equal(readLearnProgress(storage).xp,0);
});
test('invalid, unknown, malicious and wrong-version imports do not change saved records',()=>{
  const storage=new MemoryStorage(); saveTrainingProfile(storage,'personal',profile('old'),sources);
  const original=storage.getItem(trainingKey('personal'));
  for(const bad of ['{','{"__proto__":{}}',JSON.stringify({...createBackup(profile('new')),version:2}),JSON.stringify(createBackup(profile('new'),{...normalizeProgress(),xp:-1})),JSON.stringify(createBackup(profile('new'),{...normalizeProgress(),completed:['lec-unknown']}))]) {
    assert.throws(()=>validateBackup(bad,sources,['lec-probability-intro']));
    assert.equal(storage.getItem(trainingKey('personal')),original);
  }
});
test('partial write failure rolls back both stores, preserving a recovery backup',()=>{
  const storage=new MemoryStorage(); saveTrainingProfile(storage,'personal',profile('old'),sources);
  storage.setItem(LEARN_KEY,JSON.stringify(normalizeProgress()));
  const actualSet=storage.setItem.bind(storage); let failed=false;
  storage.setItem=(k,v)=>{if(k===LEARN_KEY&&!failed){failed=true;throw Error('quota');}actualSet(k,v);};
  assert.throws(()=>applyBackup(storage,'personal',createBackup(profile('new'),normalizeProgress()),sources),/原记录已保留/);
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'old');
  assert.ok(storage.getItem(recoveryKey('personal')));
});
test('reset only replaces training; demo refuses personal learning imports',()=>{
  const storage=new MemoryStorage(); const learn=completeLocalLesson(normalizeProgress(),'lec-probability-intro',0,2000).progress;
  storage.setItem(LEARN_KEY,JSON.stringify(learn));
  applyBackup(storage,'personal',createBackup(profile('reset')),sources);
  assert.equal(readLearnProgress(storage).xp,20);
  assert.throws(()=>applyBackup(storage,'demo',createBackup(profile('demo'),learn),sources),/个人课程/);
  assert.equal(storage.getItem(trainingKey('demo')),null);
});
test('corrupt persisted data surfaces an error rather than erasing records',()=>{
  const storage=new MemoryStorage(); storage.setItem(trainingKey('personal'),'{bad');
  assert.throws(()=>readTrainingProfile(storage,'personal',sources));
  assert.equal(storage.getItem(trainingKey('personal')),'{bad');
});

test('learning XP must match known awards, or remain within an explicit legacy migration range',()=>{
  const id='lec-probability-intro', legacyId='lec-legacy-intro';
  const known=completeLocalLesson(normalizeProgress(),id,40,2000).progress;
  assert.equal(validateLearnProgress(known).xp,60);
  for(const xp of [0,59,61,120000]) assert.throws(()=>validateLearnProgress({...known,xp}),/XP.*奖励/);
  assert.throws(()=>validateLearnProgress({...normalizeProgress(),xp:20}),/XP.*奖励/);
  const mixed={...known,completed:[id,legacyId],awards:{...known.awards,[legacyId]:{migrated:true,xpAwarded:null}}};
  for(const xp of [60,110,180]) assert.equal(validateLearnProgress({...mixed,xp}).xp,xp);
  for(const xp of [59,181]) assert.throws(()=>validateLearnProgress({...mixed,xp}),/XP.*奖励/);
  const legacy={completed:[legacyId],xp:50,days:[],notes:[]};
  assert.deepEqual(validateLearnProgress(legacy).awards[legacyId],{migrated:true,xpAwarded:null});
  assert.throws(()=>validateLearnProgress({...legacy,xp:121}),/XP.*奖励/);
  const uncompleted={...known,completed:[]};
  assert.equal(validateLearnProgress(uncompleted).xp,60,'permanent award remains valid after uncomplete');
});

test('valid backup restores corrupt storage after preserving exact raw strings in a distinct rescue format',()=>{
  const storage=new MemoryStorage();
  const oldTraining='{broken \"note\":\"line\\n二\"',oldLearn='{"xp":999,"completed":[],"days":[],"notes":[]}';
  storage.setItem(trainingKey('personal'),oldTraining); storage.setItem(LEARN_KEY,oldLearn);
  const existingRecovery=JSON.stringify(createBackup(profile('older'),normalizeProgress()));
  storage.setItem(recoveryKey('personal'),existingRecovery);
  const notes=[{lessonId:'lec-probability-intro',text:'第一行\n"quoted" \\ tail',tags:['review'],extra:{math:'x^2',checked:true}},'legacy plain note',null];
  const learn={...completeLocalLesson(normalizeProgress(),'lec-probability-intro',0,2000).progress,notes};
  const restored=applyBackup(storage,'personal',createBackup(profile('restored'),learn),sources,['lec-probability-intro']);
  assert.equal(restored.id,'restored');
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'restored');
  assert.deepEqual(readLearnProgress(storage).notes,notes);
  const raw=JSON.parse(storage.getItem(rawRecoveryKey('personal')));
  assert.equal(raw.format,'quantvault-local-training-raw-recovery');
  assert.equal(raw.oldTraining,oldTraining); assert.equal(raw.oldLearn,oldLearn);
  assert.deepEqual(raw.validationErrors.map(row=>row.record),['training','learn']);
  assert.throws(()=>validateBackup(JSON.stringify(raw),sources),/受支持/);
  assert.equal(storage.getItem(recoveryKey('personal')),existingRecovery,'bad old state never overwrites a valid prior backup');
});

test('profile-only restore repairs corrupt training while retaining valid Learn bytes and JSON notes',()=>{
  const storage=new MemoryStorage();
  storage.setItem(trainingKey('personal'),'not JSON');
  const learn={...normalizeProgress(),notes:[{text:'Keep \n these notes',payload:{a:1,b:[false,null,'x']}}]};
  const oldLearn=JSON.stringify(learn,null,2); storage.setItem(LEARN_KEY,oldLearn);
  applyBackup(storage,'personal',createBackup(profile('restored')),sources);
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'restored');
  assert.equal(storage.getItem(LEARN_KEY),oldLearn);
  assert.equal(JSON.parse(storage.getItem(rawRecoveryKey('personal'))).oldLearn,oldLearn);
});

test('corrupt Learn cannot be silently cleared by a profile-only backup, and raw data is retained',()=>{
  const storage=new MemoryStorage(); saveTrainingProfile(storage,'personal',profile('old'),sources);
  storage.setItem(LEARN_KEY,'broken lesson data');
  assert.throws(()=>applyBackup(storage,'personal',createBackup(profile('new')),sources),/不含课程记录/);
  assert.equal(readTrainingProfile(storage,'personal',sources).id,'old');
  assert.equal(storage.getItem(LEARN_KEY),'broken lesson data');
  assert.equal(JSON.parse(storage.getItem(rawRecoveryKey('personal'))).oldLearn,'broken lesson data');
});

test('rescue-write and later restore-write failures retain corrupt original data',()=>{
  for(const failureTarget of [rawRecoveryKey('personal'),LEARN_KEY]) {
    const storage=new MemoryStorage(); storage.setItem(trainingKey('personal'),'{bad training'); storage.setItem(LEARN_KEY,'bad learn');
    const oldTraining=storage.getItem(trainingKey('personal')),oldLearn=storage.getItem(LEARN_KEY);
    const originalSet=storage.setItem.bind(storage);let failed=false;
    storage.setItem=(key,value)=>{if(key===failureTarget&&!failed){failed=true;throw Error('quota');}originalSet(key,value);};
    assert.throws(()=>applyBackup(storage,'personal',createBackup(profile('new'),normalizeProgress()),sources));
    assert.equal(storage.getItem(trainingKey('personal')),oldTraining);
    assert.equal(storage.getItem(LEARN_KEY),oldLearn);
    if(failureTarget===LEARN_KEY) assert.equal(JSON.parse(storage.getItem(rawRecoveryKey('personal'))).oldLearn,oldLearn);
  }
});

test('demo rescue never reads or copies personal Learn data',()=>{
  const storage=new MemoryStorage(); storage.setItem(trainingKey('demo'),'bad demo');
  storage.setItem(LEARN_KEY,'private lesson text');
  const get=storage.getItem.bind(storage);storage.getItem=key=>{if(key===LEARN_KEY)throw Error('must not read personal Learn');return get(key);};
  applyBackup(storage,'demo',createBackup(profile('demo-restored')),sources);
  const raw=JSON.parse(storage.getItem(rawRecoveryKey('demo')));
  assert.equal(raw.oldLearn,null);assert.equal(raw.learnKey,null);
  assert.equal(get(LEARN_KEY),'private lesson text');
});

test('non-JSON notes and accessors are rejected instead of being serialized away',()=>{
  const bad={...normalizeProgress(),notes:[{value:undefined}]};
  assert.throws(()=>validateLearnProgress(bad),/无效数据/);
  const withGetter={...normalizeProgress(),notes:[{}]};
  Object.defineProperty(withGetter.notes[0],'text',{enumerable:true,get(){throw Error('must not evaluate');}});
  assert.throws(()=>validateLearnProgress(withGetter),/JSON/);
  const storage=new MemoryStorage();
  assert.throws(()=>applyBackup(storage,'personal',createBackup(profile('new'),bad),sources),/无效数据/);
  assert.equal(storage.getItem(trainingKey('personal')),null);
});
