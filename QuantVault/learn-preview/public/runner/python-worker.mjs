import {loadPyodide} from '../private/pyodide/pyodide.mjs';
import {judge} from './judge.mjs';

// This module only runs inside a browser Worker. No host Python process, shell,
// login session, or source-site service participates in execution.
let runtime;
let loading;
async function boot(){
 if(runtime)return runtime;
 if(!loading)loading=loadPyodide({indexURL:new URL('../private/pyodide/',import.meta.url).href,fullStdLib:false,stdout:()=>{},stderr:()=>{}}).then(p=>(runtime=p));
 return loading;
}
const harness=String.raw`
import json as _json, contextlib as _contextlib
class _LimitedOutput:
    def __init__(self): self.value = ''
    def write(self, text):
        self.value = (self.value + str(text))[:4000]
        return len(str(text))
    def flush(self): pass
_input = _json.loads(_qvl_input)
_namespace = {'__name__': '__exercise__'}
_output = _LimitedOutput()
_results = []
with _contextlib.redirect_stdout(_output), _contextlib.redirect_stderr(_output):
    exec(compile(_input['code'], '<local exercise>', 'exec'), _namespace)
    _fn = _namespace.get(_input['entry'])
    if not callable(_fn):
        raise ValueError('Expected a function named ' + _input['entry'])
    for _test in _input['tests']:
        try:
            _args = _json.loads(_json.dumps(_test.get('args', [])))
            _kwargs = _json.loads(_json.dumps(_test.get('kwargs', {})))
            _got = _fn(*_args, **_kwargs)
            _got = _json.loads(_json.dumps(_got, allow_nan=False))
            _results.append({'got': _got})
        except BaseException as _error:
            _results.append({'error': type(_error).__name__ + ': ' + str(_error)[:500]})
_qvl_output = _json.dumps({'results': _results, 'stdout': _output.value}, allow_nan=False)
`;

self.onmessage=async event=>{
 const request=event.data||{};
 try {
  if(request.language && request.language!=='python')throw Error('This local runner currently supports Python only.');
  self.postMessage({type:'loading'});
  const py=await boot();
  if(request.mode==='warmup'){self.postMessage({type:'warm'});return;}
  const art=JSON.parse(request.artifactJson||'{}');
  if(!/^[A-Za-z_]\w*$/.test(art.entry||''))throw Error('Unsupported or missing function entry in the source exercise.');
  if(!Array.isArray(art.tests)||!art.tests.length)throw Error('No source tests available; no pass can be awarded.');
  if(!['exact','tolerance'].includes(art.judge||'exact'))throw Error('Unsupported source judge: '+art.judge);
  if(typeof request.code!=='string' || request.code.length>200000)throw Error('Code must be text below 200,000 characters.');
  self.postMessage({type:'ready'});
  py.globals.set('_qvl_input',JSON.stringify({code:request.code,entry:art.entry,tests:art.tests}));
  // Synchronous Python execution is isolated to this worker; the UI watchdog
  // terminates the entire worker after 30 seconds, including infinite loops.
  py.runPython(harness);
  const output=JSON.parse(py.globals.get('_qvl_output'));
  const results=output.results.map((r,i)=>({name:art.tests[i].name||'Test '+(i+1),hidden:!!art.tests[i].hidden,expected:art.tests[i].expected,...r,pass:!r.error && judge(r.got,art.tests[i].expected,art.judge||'exact',art.judge_config||{})}));
  self.postMessage({type:'done',results,overallPass:results.length===art.tests.length && results.every(r=>r.pass),stdout:output.stdout,runtime:'Pyodide 314.0.7 · local browser worker'});
 }catch(error){self.postMessage({type:'error',error:String(error?.message||error)});}
};
