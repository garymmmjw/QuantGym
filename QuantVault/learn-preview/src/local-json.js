// A Vite SPA fallback can return HTML with status 200 for a missing local file.
// Detect it before parsing and keep optional source resources from breaking Learn.
export async function readLocalJSON(url,options={}) {
 try {
  if(typeof window!=='undefined' && window.QGLearnEmbed){
   const resource=/\/(library|practice)\.json$/.exec(url)?.[1];
   if(!resource)throw new Error('This resource is unavailable in the embedded reader');
   return await window.QGLearnEmbed.request(resource);
  }
  const response=await fetch(url);
  if(!response.ok||!response.headers.get('content-type')?.includes('json'))throw new Error('missing');
  return await response.json();
 } catch(error) {
  if(Object.hasOwn(options,'fallback'))return options.fallback;
  if(typeof window!=='undefined'&&window.QGLearnEmbed)throw new Error('课程数据加载失败：'+error.message);
  throw new Error('Local data is not ready ('+url.split('/').pop()+'). Restart the independent preview and reload this page.');
 }
}
