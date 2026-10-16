import {readFileSync, writeFileSync, mkdirSync, copyFileSync, cpSync, existsSync, readdirSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';
import {parse} from '@babel/parser';

// This preparation step reads only existing local captures. It never requests the source site.
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const qvRoot = path.dirname(root);
const captured = path.join(qvRoot, 'captures/learn-2026-10-15');
const assets = path.join(captured, 'assets');
const out = path.join(root, 'public/private');
mkdirSync(path.join(out, 'assets'), {recursive:true});
if(existsSync(path.join(captured,'media')))cpSync(path.join(captured,'media'),path.join(out,'media'),{recursive:true});
const read = n => readFileSync(path.join(assets,n),'utf8');
const save = (n,s) => writeFileSync(path.join(out,'assets',n),s);
function nodes(source, predicate) {
  const found=[];
  function walk(n) { if (!n || typeof n !== 'object') return; if (predicate(n)) found.push(n); for (const [k,v] of Object.entries(n)) {if(['loc','extra','comments','tokens'].includes(k))continue; if(Array.isArray(v))v.forEach(walk);else if(v && typeof v==='object')walk(v);} }
  walk(parse(source,{sourceType:'script'})); return found;
}
function replaceFunction(source,name,replacement) {
  const found=nodes(source,n=>n.type==='FunctionDeclaration' && n.id?.name===name);
  if(found.length!==1)throw new Error(`Expected one ${name}, got ${found.length}`);
  const n=found[0];return source.slice(0,n.start)+replacement+source.slice(n.end);
}
function removeAnalytics(source) {
  const ranges=nodes(source,n=>n.type==='IfStatement' && /\bAnalytics\b/.test(source.slice(n.test.start,n.test.end)));
  const outer=ranges.filter(n=>!ranges.some(p=>p!==n && p.start<=n.start && p.end>=n.end));
  for(const n of outer.sort((a,b)=>b.start-a.start)) source=source.slice(0,n.start)+'; /* Original analytics removed for local preview. */'+source.slice(n.end);
  return source;
}
// Only embedded readers delegate page scrolling; the independent preview keeps
// the captured scroll behavior. Fail loudly if a source boundary changes.
function patchEmbeddedScroll(source, kind) {
  const replace = (before, after) => {
    if(source.split(before).length!==2)throw new Error('Embedded scroll boundary changed: '+kind);
    source=source.replace(before,after);
  };
  if(kind==='slides') {
    replace('data-idx="${i}" onclick="SlideViewer.goToSlide(${i})"', 'data-idx="${i}" onclick="SlideViewer.selectTocSlide(${i})"');
    replace('  function goToSlide(idx) {', `  function selectTocSlide(idx) {
    if (window.QGLearnEmbed && tocVisible) toggleToc();
    goToSlide(idx);
    if (window.QGLearnEmbed) {
      const content = document.getElementById('sv-content');
      if (content) window.QGLearnEmbed.scrollToElement(content, { behavior: 'instant', block: 'start' });
    }
  }

  function goToSlide(idx) {`);
    replace('    render, goToSlide, nextSlide, prevSlide,', '    render, goToSlide, selectTocSlide, nextSlide, prevSlide,');
    replace("    const chrome = document.getElementById('sv-chrome');\n    if (!content) return;", "    const chrome = document.getElementById('sv-chrome');\n    if (!content) return;\n    if (window.QGLearnEmbed) {\n      window.QGLearnEmbed.scrollToElement(content, { behavior: 'instant', onlyIfAbove: true });\n      return;\n    }");
    replace("    if (activeToc) activeToc.scrollIntoView({ block: 'nearest', behavior: 'smooth' });", "    if (activeToc && !window.QGLearnEmbed) activeToc.scrollIntoView({ block: 'nearest', behavior: 'smooth' });");
    replace("    if (formulaOverlayVisible) { const grid = document.getElementById('sv-formulas-grid'); if (grid) runKatex(grid); }", "    if (formulaOverlayVisible) {\n      const grid = document.getElementById('sv-formulas-grid'); if (grid) runKatex(grid);\n      if (window.QGLearnEmbed) window.QGLearnEmbed.scrollToElement(overlay.querySelector('.sv__formulas-header') || overlay, { behavior: 'smooth', block: 'start' });\n    }");
    replace("      scrim.style.display = 'block';", "      scrim.style.display = 'block';\n      if (window.QGLearnEmbed) window.QGLearnEmbed.scrollToElement(toc.querySelector('.sv__toc-header') || toc, { behavior: 'smooth', block: 'nearest' });");
  } else if(kind==='cards') {
    replace("    function toDeckTop() {", "    function toDeckTop() {\n      if (window.QGLearnEmbed) {\n        window.QGLearnEmbed.scrollToElement(root, { behavior: 'instant', onlyIfAbove: true });\n        return;\n      }");
    replace("        if (fb && fb.scrollIntoView) setTimeout(function () { fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' }); }, 120);", "        if (fb && fb.scrollIntoView) setTimeout(function () {\n          if (window.QGLearnEmbed) window.QGLearnEmbed.scrollToElement(fb, { behavior: 'smooth', block: 'nearest' });\n          else fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });\n        }, 120);");
  } else throw new Error('Unknown embedded scroll renderer: '+kind);
  return source;
}

for(const name of ['variables.css','layout.css','components.css','learn.css','compare-cards.css','notebook.css','slide-viewer.css','auth.css','responsive.css','beta.css','d3.v7.min.js','function-plot.js','katex.min.js','auto-render.min.js','katex.min.css'])copyFileSync(path.join(assets,name),path.join(out,'assets',name));
// The embedded preview browser rejects cross-document View Transition opt-in.
// Preserve normal link navigation and remove only the copied source opt-in.
save('variables.css',read('variables.css').replace('@view-transition { navigation: auto; }\n','').replace('.nav { view-transition-name: site-nav; }\n',''));
if(existsSync(path.join(assets,'logo.svg'))) copyFileSync(path.join(assets,'logo.svg'),path.join(out,'assets/logo.svg'));
for(const [name,globalName] of [['markdown-render.js','MarkdownRender'],['fp-render.js','FpRender'],['katex-render.js','KatexRender'],['slide-icons.js','SlideIcons'],['icons.js','Icons']])save(name,read(name)+`\nwindow.${globalName} = ${globalName};\n`);
cpSync(path.join(root,'node_modules/katex/dist/fonts'),path.join(out,'assets/fonts'),{recursive:true});
copyFileSync(path.join(root,'node_modules/dompurify/dist/purify.min.js'),path.join(out,'assets/purify.min.js'));
mkdirSync(path.join(out,'pyodide'),{recursive:true});
for(const name of ['pyodide.mjs','pyodide.asm.mjs','pyodide.asm.wasm','pyodide-lock.json','python_stdlib.zip'])copyFileSync(path.join(root,'node_modules/pyodide',name),path.join(out,'pyodide',name));

let slides=read('slide-viewer.js');
const fetchStart=slides.indexOf('    try {',slides.indexOf('async function render('));
const fetchEnd=slides.indexOf('    slides = data.slides || [];',fetchStart);
if(fetchStart<0 || fetchEnd<0)throw new Error('Slide loading boundary changed');
slides=slides.slice(0,fetchStart)+'    data = contentUrl; // Already captured, local lesson data. No source request.\n'+slides.slice(fetchEnd);
slides=replaceFunction(slides,'acctStreak','function acctStreak() { return window.LocalProgress.profile().streak.current; }');
slides=replaceFunction(slides,'acctLevel','function acctLevel() { return window.LocalProgress.profile().level; }');
slides=replaceFunction(slides,'promptSignIn','function promptSignIn() { window.LocalProgress.toast("Progress is saved only in this browser."); }');
slides=replaceFunction(slides,'trackPracticeClick','function trackPracticeClick() { bankLessonXp(); }');
slides=replaceFunction(slides,'trackProblemClick','function trackProblemClick() {}');
slides=slides.replace('new Worker(CODE_WORKER_SRC)','new Worker(CODE_WORKER_SRC, {type:"module"})');
slides=slides.replace("st.buffer = code;","st.buffer = code; localStorage.setItem('qvl-code-'+data.id+'-'+n,code);");
slides=replaceFunction(slides,'submitSlideFlag',`function submitSlideFlag(type) {
  const dd=document.querySelector('.flag-dropdown');
  const message=dd?.querySelector('textarea')?.value.trim() || '';
  if(type==='other' && !message){dd?.querySelector('textarea')?.focus();return;}
  window.LocalProgress.note({lessonId:lectureMeta?.lectureId || data.id,slide:current+1,type,message});
  dd?.remove(); window.LocalProgress.toast('Note saved in this browser. Nothing was sent to QuantVault.');
}`);
slides=patchEmbeddedScroll(removeAnalytics(slides),'slides');
// The captured renderer reset answered state on every load, while persisting
// only XP dedup flags. Save the actual submitted answer as local account state,
// then restore the review UI and unsettled accuracy bonus on reopening.
const restoreQuizBoundary = '    quizStates = {};';
if(!slides.includes(restoreQuizBoundary))throw new Error('Quiz reset boundary changed');
slides=slides.replace(restoreQuizBoundary, '    quizStates = window.LocalQuizProgress.restore(data.id, slides);\n    xp = window.LocalQuizProgress.accuracyBonus(data.id, slides);');
for(const [assignment,variable] of [
  ['quizStates[slideNum] = { answered: true, selected: null, correct: ok, userAnswer: input.value };','slideNum'],
  ['quizStates[slideNum] = { answered: true, selected: choiceIdx, correct: ok };','slideNum'],
  ['quizStates[n] = Object.assign({ answered: true, selected: null, correct: ok }, extra);','n'],
]){
  if(!slides.includes(assignment))throw new Error('Quiz answer boundary changed: '+variable);
  slides=slides.replace(assignment,assignment+'\n    window.LocalQuizProgress.save(data.id, slide, quizStates['+variable+']);');
}
slides=slides.replace('  function submitNumeric(slideNum) {','  function submitNumeric(slideNum) {\n    if (quizStates[slideNum]?.answered) return;');
slides=slides.replace('  function handleQuizAnswer(slideNum, choiceIdx) {','  function handleQuizAnswer(slideNum, choiceIdx) {\n    if (quizStates[slideNum]?.answered) return;');
slides=slides.replace('${state.userAnswer}', '${escHtml(state.userAnswer)}');
slides=slides.replace(/\bAuth\b/g,'LocalProfile');
slides=slides.replace("const CODE_WORKER_SRC = 'js/code-runner.js?v=20260809fix1';","const CODE_WORKER_SRC = new URL('runner/python-worker.mjs', location.href);");
slides=slides.replace('title="Report issue"','title="Save a local note" aria-label="Save a local note"');
slides=slides.replace('Solution available on the full problem page.','This solution has not been downloaded locally. No source-site request was made.');
slides=slides.replace("const href = `problems.html?id=${pid}`;","const href = `?problem=${pid}`;");
slides=slides.replace("const buffer = st.buffer !== undefined ? st.buffer : (c.starter || '');","const buffer = st.buffer !== undefined ? st.buffer : (localStorage.getItem('qvl-code-'+data.id+'-'+slide.n) ?? c.starter ?? '');");
slides=slides.replace("'Ctrl/Cmd + Enter runs'","'Local Python · Ctrl/Cmd + Enter runs'");
slides=slides.replace("<div class=\"sv__code-results\" id=\"sv-code-results-${slide.n}\">",`<details class="local-code-tests"><summary>Source test cases</summary><pre><code>\${escHtml(JSON.stringify(c.artifact || {}, null, 2))}</code></pre></details>
      <div class="sv__code-results" id="sv-code-results-\${slide.n}">`);
slides=slides.replace("if (xp > 0 && !(typeof LocalProfile !== 'undefined' && LocalProfile.isLoggedIn())) {","if (false) {");
slides=slides.replace("title=\"Contents (T)\"","title=\"Contents (T)\" aria-label=\"Contents\"");
slides=slides.replace("title=\"Formulas (F)\"","title=\"Formulas (F)\" aria-label=\"Formulas\"");
// Preserve the source's once-per-lesson settlement, including auto-completion on
// a final content/code slide, but do not claim a later practice success adds XP.
slides=slides.replaceAll('Correct! +5 XP','Correct!');
slides=slides.replaceAll('All tests passed! +5 XP','All tests passed!');
slides=slides.replace("f.textContent = '+5 XP';","f.textContent = 'Correct';");
slides=slides.replace('id="sv-xp"','id="sv-xp" title="Practice accuracy bonus. Included only in the first lesson reward; later practice does not add to total XP."');
slides=slides.replace('<span id="sv-xp-val">${xp}</span> XP','<span id="sv-xp-val">${xp}</span> accuracy');
slides += '\nwindow.SlideViewer = SlideViewer;\n';
parse(slides,{sourceType:'script'});
if(/\b(?:fetch|XMLHttpRequest|FirebaseConfig|Auth|Analytics)\s*[.(]/.test(slides.replace(/\/\*[\s\S]*?\*\//g,'').replace(/\/\/[^\n]*/g,'')))throw new Error('Unexpected network/account operation in local slide renderer');
save('slide-viewer-local.js',slides);
save('compare-cards-local.js',patchEmbeddedScroll(removeAnalytics(read('compare-cards.js')),'cards'));
let notebook=read('notebook-renderer.js').replace("const resp = await fetch(notebookPath);\n      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);\n      const nb = await resp.json();","const nb = notebookPath;").replace('trust: true','trust: false');
save('notebook-renderer-local.js',notebook+'\nwindow.NotebookRenderer = NotebookRenderer;\n');

// Icons are copied from observed source assets, not reconstructed from screenshots.
const learn=read('learn.js');
const iconStart=learn.indexOf('  const TRACK_ICONS = {'), iconEnd=learn.indexOf('  const trackIcon',iconStart);
const menuIcon=read('slide-viewer.js').match(/<svg width="18" height="18"[^>]+><path d="M3 12h18M3 6h18M3 18h18"\/><\/svg>/)?.[0];
if(!menuIcon)throw new Error('Observed contents icon missing');
save('track-icons.js',learn.slice(iconStart,iconEnd)+'\nwindow.TrackIcons = TRACK_ICONS;\nwindow.MenuIcon = '+JSON.stringify(menuIcon)+';\n');

const libraryPath=path.join(qvRoot,'data/learn-2026-10-15/library.json');
if(!existsSync(libraryPath))throw new Error('No local lesson export yet: '+libraryPath);
const library=JSON.parse(readFileSync(libraryPath,'utf8'));
writeFileSync(path.join(out,'library.json'),JSON.stringify(library));
const scoringDir=path.join(captured,'scoring');
if(existsSync(scoringDir)) {
  mkdirSync(path.join(out,'scoring'),{recursive:true});
  for(const name of ['modules.json','modules.css','plan.css','explore.css','dash-v2.css','profile.css','item-difficulty.json','item-difficulty-v2.json'])if(existsSync(path.join(scoringDir,name)))copyFileSync(path.join(scoringDir,name),path.join(out,'scoring',name));
  const catalogueFile=path.join(qvRoot,'captures/full-2026-10-15/catalogue.json');
  const networkDir=path.join(qvRoot,'captures/network-2026-10-15');
  if(existsSync(catalogueFile)) {
    const catalogue=JSON.parse(readFileSync(catalogueFile,'utf8'));
    const exact=new Set(catalogue.questions.map(q=>String(q.id)+'\u0000'+q.title));
    const index=[];
    for(const name of readdirSync(networkDir).filter(n=>n.endsWith('.json'))) {
      const wrapper=JSON.parse(readFileSync(path.join(networkDir,name),'utf8'));
      if(!Array.isArray(wrapper.questions))continue;
      for(const q of wrapper.questions)if(exact.has(String(q.display_id)+'\u0000'+q.title))index.push({id:q.id,di:q.display_id,t:q.title,c:q.category,d:q.difficulty,tg:q.tags||[],co:q.companies||[]});
    }
    const unique=[...new Map(index.map(q=>[String(q.id),q])).values()];
    writeFileSync(path.join(out,'scoring/problems-index.json'),JSON.stringify(unique));
  }
}
const exports=readdirSync(path.join(qvRoot,'data')).filter(n=>/^download-.*-of-3469$/.test(n));
const ranked=exports.map(n=>({n,count:Number(n.match(/-(\d+)-of-3469$/)?.[1]||0)})).sort((a,b)=>b.count-a.count);
const questionPath=ranked[0] && path.join(qvRoot,'data',ranked[0].n,'quantvault_questions_full.json');
const records=questionPath && existsSync(questionPath)?JSON.parse(readFileSync(questionPath,'utf8')).records:[];
const problems=records.map(r=>({id:r.id,raw_id:r.source_metadata?.raw_id,title:r.title,prompt:r.prompt,solution:r.solution,hints:r.hints,topic:r.topic,companies:r.companies}));
writeFileSync(path.join(out,'problems.json'),JSON.stringify(problems));
const featuredPath=path.join(captured,'featured-lists.json');
const featured=existsSync(featuredPath)?JSON.parse(readFileSync(featuredPath,'utf8')).featured:[];
const problemIndex=JSON.parse(readFileSync(path.join(out,'scoring/problems-index.json'),'utf8'));
const byInternalId=new Map(problemIndex.map(p=>[String(p.id),p]));
const downloadedByInternalId=new Map(problems.map(p=>[String(p.raw_id),p]));
const practice={source:'https://quantvault.org/data/featured-lists.json',idKind:'internal',lists:(featured||[]).filter(l=>l.section==='lesson'&&l.lectureId).map(l=>({...l,problems:(l.problemIds||[]).map(rawId=>{const meta=byInternalId.get(String(rawId)),downloaded=downloadedByInternalId.get(String(rawId));return{raw_id:rawId,id:meta?.di??downloaded?.id??null,title:meta?.t??downloaded?.title??null,category:meta?.c??null,difficulty:meta?.d??null,downloaded:!!downloaded};})}))};
writeFileSync(path.join(out,'practice.json'),JSON.stringify(practice));
writeFileSync(path.join(out,'asset-provenance.json'),JSON.stringify({prepared_at:new Date().toISOString(),captured,fonts:'Local @fontsource/inter and @fontsource/jetbrains-mono; KaTeX 0.16.9 package fonts.',original_renderers:'Locally adapted. Source authentication, analytics, remote issue reporting, remote problem loading, and source code runner are removed. Python execution uses local npm Pyodide 314.0.7 in a browser Worker.',lessons:library.summary,local_problems:problems.length},null,2));
console.log(JSON.stringify({status:'ready',lessons:library.summary,local_problems:problems.length}));
