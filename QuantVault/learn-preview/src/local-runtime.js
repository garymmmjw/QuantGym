import {normalizeProgress,progressProfile,completeLocalLesson,uncompleteLocalLesson} from './local-progress.mjs';
import {createQuizProgress} from './quiz-progress.mjs';
window.LocalQuizProgress=createQuizProgress(window.QGLearnStorage||localStorage);
const KEY='qvl-progress-v1';
function read(){try{return normalizeProgress(window.QGLearnEmbed?window.QGLearnEmbed.readProgress():JSON.parse(localStorage.getItem(KEY))||{});}catch{return normalizeProgress();}}
function write(value){if(window.QGLearnEmbed)window.QGLearnEmbed.writeProgress(value);else localStorage.setItem(KEY,JSON.stringify(value));window.dispatchEvent(new Event('user-data-changed'));}
function profile(){return progressProfile(read());}
function toast(message){const el=document.createElement('div');el.className='qr-toast qr-toast--show';el.role='status';el.textContent=message;document.body.appendChild(el);setTimeout(()=>el.remove(),4500);}
function complete(id,bonus=0){const {progress,result}=completeLocalLesson(read(),id,bonus);if(!result.error){write(progress);document.dispatchEvent(new CustomEvent('local-lesson-complete',{detail:{id}}));}return result;}
window.LocalProgress={read,profile,complete,toast,isCompleted:id=>read().completed.includes(id),toggle(id){if(!read().completed.includes(id)){complete(id);return true;}write(uncompleteLocalLesson(read(),id));return false;},note(note){const p=read();p.notes.push({...note,at:new Date().toISOString()});write(p);}};
// The renderer's profile surface is deliberately local. No login token or site API exists here.
window.LocalProfile={isLoggedIn:()=>true,getUserDoc:profile};
let problemsPromise;
export function localProblems(){if(window.QGLearnEmbed)return Promise.reject(Error('Embedded questions are provided by the host'));return problemsPromise ||= fetch('./private/problems.json').then(r=>{if(!r.ok)throw Error('Local problem export unavailable');return r.json();});}
window.DataLoader={async problemById(id){if(window.QGLearnEmbed)return window.QGLearnEmbed.request('problem',{rawId:String(id)});return (await localProblems()).find(p=>String(p.raw_id)===String(id)) || null;}};

const originalRender=window.MarkdownRender.render;
const originalInline=window.MarkdownRender.inlineFormat;
const clean=html=>{
 const fragment=document.createElement('template');
 fragment.innerHTML=window.DOMPurify.sanitize(html,{ADD_ATTR:['data-config'],FORBID_TAGS:['iframe','object','embed','form','style'],FORBID_ATTR:['srcset'],ALLOW_UNKNOWN_PROTOCOLS:false});
 fragment.content.querySelectorAll('img[src]').forEach(img=>{
   const src=img.getAttribute('src');
   // The authenticated host may inline allowlisted course illustrations. Keep
   // their bytes inside the member response instead of publishing media files.
   if(/^data:image\/(?:png|jpeg|webp|gif);base64,/i.test(src))return;
   const relative=src.replace(/^https:\/\/quantvault\.org\//,'').replace(/^\/?data\//,'');
   if(relative.startsWith('lectures/'))img.setAttribute('src','./private/media/'+relative);
   else if(/^https?:\/\//.test(src)){img.removeAttribute('src');img.alt=(img.alt||'Source image')+' (not downloaded locally)';}
 });
 return fragment.innerHTML;
};
window.MarkdownRender.render=(...args)=>clean(originalRender(...args));
window.MarkdownRender.inlineFormat=(...args)=>clean(originalInline(...args));

// Source markdown can contain links. Internal source links are routed locally;
// external links are explicitly labelled and only open following a user click.
const inspectLinks=root=>{
 root.querySelectorAll?.('a[href]').forEach(a=>{
  if(a.dataset.localChecked)return;a.dataset.localChecked='1';
  const raw=a.getAttribute('href');if(!raw || raw.startsWith('#'))return;
  let u;try{u=new URL(raw,location.href);}catch{return;}
  const sourceLocal=u.origin===location.origin || u.hostname==='quantvault.org';
  if(sourceLocal && /\/problems\.html$/.test(u.pathname)){a.href='?problem='+encodeURIComponent(u.searchParams.get('id')||'');a.removeAttribute('target');}
  else if(sourceLocal && /\/learn\.html$/.test(u.pathname)){a.href='?'+u.searchParams.toString();a.removeAttribute('target');}
  else if(u.origin!==location.origin){a.target='_blank';a.rel='noopener noreferrer';a.title='External source: '+u.hostname;a.setAttribute('aria-label',(a.textContent||'Link')+' — external source');}
  else if(/\/(?:playlist|mock|pricing|quant-interview-practice-test)\.html$/.test(u.pathname)){a.href='?unavailable='+encodeURIComponent(u.pathname.split('/').pop());a.removeAttribute('target');}
 });
};
new MutationObserver(list=>{for(const item of list)for(const n of item.addedNodes)if(n.nodeType===1){if(n.matches?.('a[href]'))inspectLinks(n.parentElement);else inspectLinks(n);}}).observe(document.body,{childList:true,subtree:true});
