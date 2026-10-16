import test from 'node:test';
import assert from 'node:assert/strict';
import {judge} from '../public/runner/judge.mjs';
test('exact judge distinguishes wrong values and types and compares nested results',()=>{
 assert.equal(judge(2,2),true);assert.equal(judge(0,2),false);assert.equal(judge(true,1),false);
 assert.equal(judge({b:[2,3],a:1},{a:1,b:[2,3]}),true);assert.equal(judge([1,2],[2,1]),false);
});
test('source Treasury exercise absolute tolerance is respected without relative slack',()=>{
 const expected=0.04757345487700282,c={rel_tol:0,abs_tol:1e-7};
 assert.equal(judge(expected+0.5e-7,expected,'tolerance',c),true);
 assert.equal(judge(expected+2e-7,expected,'tolerance',c),false);
 assert.equal(judge(0.0425,expected,'tolerance',c),false);
});
test('tolerance recursively compares arrays and rejects non-finite results',()=>{
 assert.equal(judge([1,2],[1.00000001,2],'tolerance',{abs_tol:1e-6}),true);
 assert.equal(judge(NaN,0,'tolerance'),false);assert.equal(judge(Infinity,Infinity,'tolerance'),false);
 assert.throws(()=>judge(1,1,'unknown'),/Unsupported/);
});
