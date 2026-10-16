import test from 'node:test';
import assert from 'node:assert/strict';
import {readLocalJSON} from '../src/local-json.js';
test('missing optional JSON that receives SPA HTML falls back without breaking the library',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('<!doctype html><html></html>',{headers:{'content-type':'text/html'}});
 try{assert.deepEqual(await readLocalJSON('./practice.json',{fallback:{lists:[]}}),{lists:[]});
  await assert.rejects(readLocalJSON('./library.json'),/Local data is not ready/);
 }finally{globalThis.fetch=original;}
});
test('valid captured JSON is preserved',async()=>{
 const original=globalThis.fetch;
 globalThis.fetch=async()=>new Response('{"b":{"541":0.2}}',{headers:{'content-type':'application/json'}});
 try{assert.deepEqual(await readLocalJSON('./difficulty.json'),{b:{541:0.2}});}finally{globalThis.fetch=original;}
});
test('embedded reads are served only by the parent and never fall back to private static files',async()=>{
 const originalFetch=globalThis.fetch,originalWindow=globalThis.window;
 const resources=[];let fetches=0;
 globalThis.window={QGLearnEmbed:{request:async resource=>{resources.push(resource);return{lessons:['authorized']};}}};
 globalThis.fetch=async()=>{fetches++;throw new Error('Static fetch is forbidden');};
 try{
  assert.deepEqual(await readLocalJSON('./private/library.json'),{lessons:['authorized']});
  assert.deepEqual(resources,['library']);
  await assert.rejects(readLocalJSON('./private/problems.json'),/课程数据加载失败/);
  assert.equal(fetches,0);
 }finally{
  globalThis.fetch=originalFetch;
  if(originalWindow===undefined)delete globalThis.window;else globalThis.window=originalWindow;
 }
});
