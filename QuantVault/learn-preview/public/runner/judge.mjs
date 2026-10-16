// Source artefacts currently use exact and tolerance judges. Unsupported modes fail visibly.
export function exact(actual, expected) {
  if (actual === expected) return true;
  if (Array.isArray(actual) && Array.isArray(expected)) return actual.length === expected.length && actual.every((x,i)=>exact(x,expected[i]));
  if (actual && expected && typeof actual === 'object' && typeof expected === 'object' && !Array.isArray(actual) && !Array.isArray(expected)) {
    const ak=Object.keys(actual).sort(),ek=Object.keys(expected).sort();
    return exact(ak,ek) && ak.every(k=>exact(actual[k],expected[k]));
  }
  return false;
}
export function tolerance(actual,expected,config={}) {
  if(typeof actual==='number' && typeof expected==='number') {
    if(!Number.isFinite(actual) || !Number.isFinite(expected)) return false;
    const abs=config.abs_tol ?? 1e-9,rel=config.rel_tol ?? 1e-9;
    if(typeof abs!=='number' || typeof rel!=='number' || abs<0 || rel<0)throw Error('Invalid source tolerance');
    return Math.abs(actual-expected)<=Math.max(abs,rel*Math.max(Math.abs(actual),Math.abs(expected)));
  }
  if(Array.isArray(actual) && Array.isArray(expected))return actual.length===expected.length && actual.every((v,i)=>tolerance(v,expected[i],config));
  if(actual && expected && typeof actual==='object' && typeof expected==='object') {
    const ak=Object.keys(actual).sort(),ek=Object.keys(expected).sort();
    return exact(ak,ek) && ak.every(k=>tolerance(actual[k],expected[k],config));
  }
  return exact(actual,expected);
}
export function judge(actual,expected,mode='exact',config={}) {
 if(mode==='exact')return exact(actual,expected);
 if(mode==='tolerance')return tolerance(actual,expected,config);
 throw Error('Unsupported source judge: '+mode);
}
