import test from 'node:test';
import assert from 'node:assert/strict';
import {normalizeProgress,progressProfile,completeLocalLesson,uncompleteLocalLesson} from '../src/local-progress.mjs';
const now=Date.UTC(2026,9,15);
test('uncomplete and retry never award the same lesson twice',()=>{
 const first=completeLocalLesson({},'lec-quiz-field-guide',30,now);
 assert.equal(first.result.total,50);
 const removed=uncompleteLocalLesson(first.progress,'lec-quiz-field-guide');
 assert.equal(removed.completed.length,0);
 assert.equal(removed.xp,50);
 assert.equal(removed.awards['lec-quiz-field-guide'].xpAwarded,50);
 const retry=completeLocalLesson(removed,'lec-quiz-field-guide',100,now+86400000);
 assert.equal(retry.result.total,0);
 assert.equal(retry.result.alreadyEarned,true);
 assert.equal(retry.progress.xp,50);
 assert.deepEqual(retry.progress.completed,['lec-quiz-field-guide']);
});
test('legacy completion migrates without duplicating XP',()=>{
 const migrated=normalizeProgress({completed:['lec-rates'],xp:50,days:[]});
 const retry=completeLocalLesson(uncompleteLocalLesson(migrated,'lec-rates'),'lec-rates',100,now);
 assert.equal(retry.progress.xp,50);
 assert.equal(retry.result.alreadyEarned,true);
 assert.equal(retry.progress.awards['lec-rates'].migrated,true);
});
test('reward result and profile use the 1000 XP level boundary and 250 XP higher levels',()=>{
 const crossing=completeLocalLesson({xp:980},'lec-rates',0,now);
 assert.equal(crossing.result.level,11);
 assert.equal(crossing.result.levelXp,0);
 assert.equal(crossing.result.nextLevelXp,250);
 assert.equal(crossing.result.leveledUp,true);
 assert.equal(progressProfile({xp:1249},now).level,11);
 assert.equal(progressProfile({xp:1250},now).level,12);
 assert.equal(progressProfile({xp:1125},now).percent,50);
});
test('all 99 local courses can earn credit once without the obsolete source 60-course cap',()=>{
 let progress={};for(let i=0;i<99;i++)progress=completeLocalLesson(progress,'lec-course-'+i,0,now).progress;
 assert.equal(progress.completed.length,99);
 assert.equal(Object.keys(progress.awards).length,99);
 assert.equal(progress.xp,1980);
});
