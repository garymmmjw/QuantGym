import test from 'node:test';
import assert from 'node:assert/strict';
import {createScoringModel,TOPICS} from '../src/scoring/scoring-model.mjs';
import {buildV1Explanation} from '../src/assessment-explanation.mjs';
const model=createScoringModel();
const stateWith=(theta,n)=>({theta:Object.fromEntries(TOPICS.map(t=>[t,theta])),nObs:Object.fromEntries(TOPICS.map(t=>[t,n]))});
const close=(a,b)=>assert(Math.abs(a-b)<1e-12,`${a} differs from ${b}`);

test('v1 explanation resolves empty evidence to skill 0 and the display floor 2 without dividing by zero',()=>{
 const trace=buildV1Explanation(model.computeOfferBar({model:'v1',state:stateWith(0,0)}));
 assert.equal(trace.weightSum,0);assert.equal(trace.skill,0);assert.equal(trace.beforeRounding,0);
 assert.equal(trace.rounded,0);assert.equal(trace.final,2);assert.equal(trace.matchesModel,true);
});
test('current explanation independently reconciles source base, grind and weighted-skill arithmetic',()=>{
 const state=stateWith(0.2,6);state.nObs.coding=2;
 const progress=Object.fromEntries(Array.from({length:130},(_,i)=>[i,i%2?'attempted':'solved']));
 const calibration=Array.from({length:4},()=>({topic:'probability',x:1}));
 for(const role of ['qr','qt','qd','unsure']){
  const bar=model.computeOfferBar({model:'v1',state,progress,prefs:{role,calibration}}),trace=buildV1Explanation(bar);
  assert.equal(trace.eligible.length,16);assert.equal(trace.assessmentCount,4);assert.equal(trace.progressCount,130);
  close(trace.base,.48);close(trace.grind,.5);close(trace.engagement,.74);
  close(trace.weightedSum/trace.weightSum,bar.diagnostics.skill);
  assert.equal(trace.contributions.length,17);assert.equal(trace.contributions.find(t=>t.topic==='coding').included,false);
  assert.equal(trace.contributions.find(t=>t.topic==='coding').contribution,0);
  close(trace.contributionTotal,bar.diagnostics.skill);
  close(trace.beforeRounding,bar.diagnostics.skill*.74*100);
  assert.equal(trace.final,bar.readiness);assert.equal(trace.matchesModel,true);
 }
});
test('two-decimal display formatting does not alter raw rounding or the 99 percent upper cap',()=>{
 const progress=Object.fromEntries(Array.from({length:20000},(_,i)=>[i,'solved']));
 const bar=model.computeOfferBar({model:'v1',state:stateWith(2,6),progress,prefs:{calibration:Array(1000).fill({topic:'probability',x:1})}});
 const trace=buildV1Explanation(bar);assert(trace.beforeRounding>99.5);assert.equal(trace.rounded,100);assert.equal(trace.final,99);
 assert.equal(trace.beforeRounding,trace.skill*trace.engagement*100);
});
test('rollout diagnostics are explicitly not presented as a verified v1 arithmetic trace',()=>{
 const bar=model.computeOfferBar({state:stateWith(.2,6)});
 assert.equal(buildV1Explanation(bar).matchesModel,false);
});
test('fixed 80 percent mastery with 10 calibration records yields the displayed controlled examples',()=>{
 const state=stateWith(.8*2.1-1.15,6),calibration=Array(10).fill({topic:'probability',x:1});
 for(const [n,expected]of[[130,64],[390,72],[702,75]]){
  const progress=Object.fromEntries(Array.from({length:n},(_,i)=>[i,'attempted']));
  const trace=buildV1Explanation(model.computeOfferBar({model:'v1',state,progress,prefs:{calibration}}));
  close(trace.skill,.8);close(trace.base,.6);assert.equal(trace.final,expected);
 }
});
