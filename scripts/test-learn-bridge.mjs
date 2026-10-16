import test from 'node:test';
import assert from 'node:assert/strict';
import { lessonQuery, lessonProblem, questionHref } from '../src/features/learning/learnBridge.mjs';
const records = [{id:'quantvault-744',source:'quantvault',titleEn:'Different question',quantvault:{id:2080,displayId:744}},
  {id:'quantvault-426',source:'quantvault',titleEn:'Grid Path Counting',promptEn:'Grid',hints:['hint'],explanation:'Solution',quantvault:{id:4719,displayId:426,categorySlug:'combinatorics'}}];

test('raw course references never fall back to a similarly numbered display question',()=>{
  assert.equal(lessonProblem(records,744),null);
  assert.equal(lessonProblem(records,4719).id,426);
  assert.equal(questionHref(records,426,'lec-q-prob-slides-03'),'/problems?bank=quantvault&question=quantvault-426&from=learn&lesson=lec-q-prob-slides-03');
  assert.equal(questionHref(records,'not-downloaded'),null);
});
test('embedded navigation only preserves valid lesson keys and cannot carry credentials or URLs',()=>{
  assert.equal(lessonQuery('?track=quant&lecture=lec-q-prob-slides-03&token=secret&view=assessment'), 'track=quant&lecture=lec-q-prob-slides-03');
  assert.equal(lessonQuery('?lecture=https://example.com&topic=probability'), 'topic=probability');
});
