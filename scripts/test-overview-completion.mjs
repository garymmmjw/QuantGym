import test from 'node:test';
import assert from 'node:assert/strict';
import { getContributionStatsByDay } from '../src/modules/overview/data.js';
import { dayKey } from '../src/lib/date.js';

test('completion heatmap excludes old Hot100 flags, trainer records, draws and undone questions', () => {
  const today = new Date('2026-09-14T18:00:00Z');
  const at = '2026-09-14T12:00:00Z';
  const records = [
    { problemId:'confirmed', completed:true, completedAt:at },
    { problemId:'confirmed', completed:true, completedAt:at },
    { problemId:'undone', completed:false, completedAt:at },
    { problemId:'draw-only', lastViewedAt:at },
    { problemId:'mental', completed:true, completedAt:at },
    { problemId:'lc', completed:true, completedAt:at },
    { problemId:'bad-date', completed:true, completedAt:'not-a-date' },
    { problemId:'future', completed:true, completedAt:'2026-09-15T12:00:00Z' },
  ];
  const stats = getContributionStatsByDay({ today, problemStates:records,
    problems:[{id:'mental',category:'mentalMath'},{id:'lc',sourceUrl:'https://leetcode.cn/problems/two-sum/'}],
    leetcodeHot100Done:['two-sum'], entries:[{date:at,totalXp:10}] });
  assert.equal(stats.get(dayKey(at)).completed,1);
  assert.equal(stats.get(dayKey(at)).xp,10);
  assert.equal(stats.size,1);
  const oldFlagsOnly = getContributionStatsByDay({today,leetcodeHot100Done:['two-sum']});
  assert.equal(oldFlagsOnly.size,0);
});

test('league milestones cannot be unlocked by trainer, local LeetCode or undated completion flags', async () => {
  const { createLeaguePageApi } = await import('../src/app/services/leaguePageApi.js');
  const problems = Array.from({length:100},(_,i)=>({id:`problem-${i}`,category:i<40?'mentalMath':i<80?'leetcode':'statistics'}));
  const at='2026-09-14T12:00:00Z';
  const api=createLeaguePageApi({getState:()=>({problems}),getProblemPersonalState:id=>({completed:true,completedAt:Number(id.split('-')[1])<80?at:''})});
  const milestone=api.getMapModel().nodes.find(node=>node.id==='combinatorics');
  assert.notEqual(milestone.status,'done');
});
