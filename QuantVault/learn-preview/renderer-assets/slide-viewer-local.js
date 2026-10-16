/* ============================================
   SLIDE VIEWER — Interactive lecture viewer
   Brilliant.org-inspired: XP, card transitions,
   quiz variants, donut chart widgets
   ============================================ */

const SlideViewer = (() => {
  let data = null;
  let slides = [];
  let current = 0;
  let slideShownAt = 0; // when the current slide appeared (slide_nav dwell_ms)
  let targetEl = null;
  let formulaOverlayVisible = false;
  let tocVisible = false;
  let quizStates = {};  // slideNum → { answered, selected, correct }
  // This lesson's accumulating quiz XP (5 per first-time-correct quiz). This is
  // the accuracy bonus that gets BANKED into the real profile (xp/level/streak)
  // via LocalProfile.saveLessonComplete at lesson completion — not a detached counter.
  let xp = 0;
  let streak = 0;          // in-lesson correct-answer combo (flair)
  let lessonBanked = false; // bank the lesson XP exactly once
  let bankResultCache = null; // remembered banked result (re-applied if the card re-renders)

  // Real account streak (Duolingo-style) — shown in the HUD when signed in.
  function acctStreak() { return window.LocalProgress.profile().streak.current; }
  // Real account level — shown in the HUD so the lesson reflects the profile.
  function acctLevel() { return window.LocalProgress.profile().level; }
  // Small flame glyph (no emoji) for the streak chip.
  const FLAME_SVG = '<svg viewBox="0 0 16 16" width="11" height="11" aria-hidden="true"><path d="M8 1s3 2.6 3 6a3 3 0 0 1-6 0c0-1 .5-2 1.1-2.6C5.4 6 8 4.2 8 1z"/></svg>';
  let lectureMeta = null;

  /* ---- Swipe / drag state ---- */
  let swipe = { active: false, startX: 0, startY: 0, dx: 0, startTime: 0, locked: false, isH: false };
  const SWIPE_THRESHOLD = 60;
  const SWIPE_VELOCITY = 0.3; // px/ms

  /* ---- Sticky-chrome layout bake-off (?nav=1..6); default = winner ---- */
  const DEFAULT_NAV = 4;
  function navVariant() {
    const m = (typeof location !== 'undefined' && location.search.match(/[?&]nav=([1-6])\b/)) || null;
    return m ? parseInt(m[1], 10) : DEFAULT_NAV;
  }

  /* ---- Public: render a slide lecture ---- */
  async function render(contentUrl, el, meta) {
    targetEl = el;
    lectureMeta = meta || null;
    // Reset per-lesson reward state (defensive — each lesson is normally a fresh
    // page load, but never carry a previous lesson's banked result into a new one).
    xp = 0; streak = 0; lessonBanked = false; bankResultCache = null;
    data = contentUrl; // Already captured, local lesson data. No source request.
    slides = data.slides || [];
    if (!slides.length) {
      el.innerHTML = `<div class="empty-state" style="min-height:300px"><div class="empty-state__icon"><svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg></div><div class="empty-state__title">No slides available</div></div>`;
      return;
    }
    quizStates = window.LocalQuizProgress.restore(data.id, slides);
    xp = window.LocalQuizProgress.accuracyBonus(data.id, slides);
    // Interaction drafts, flip cards and step frames are keyed by slide number: clear them too, or a second
    // lesson rendered in the same page inherits the first lesson's state (crashes buildSort on a type clash).
    [ixStates, flipStates, stepStates, exploreStates, mmStates, predictStates, pollStates].forEach(o => { for (const k in o) delete o[k]; });
    const savedPos = localStorage.getItem('sv-pos-' + data.id);
    current = savedPos ? Math.min(parseInt(savedPos) || 0, slides.length - 1) : 0;
    buildUI();
    goToSlide(current);
    attachKeyboard();
    attachSwipe();
    maybeShowSwipeHint();
    updateXpDisplay(); // sync the HUD chips to the real account on load
    // Keep the HUD (Level / streak chips) fresh if the account changes while a
    // lesson is open (e.g. a level-up or streak bump fired elsewhere).
    window.removeEventListener('user-data-changed', updateXpDisplay);
    window.addEventListener('user-data-changed', updateXpDisplay);
  }

  /* ---- Build the viewer UI ---- */
  function buildUI() {
    targetEl.innerHTML = `
      <div class="sv sv--nav${navVariant()}">
        <header class="sv__chrome" id="sv-chrome">
          <div class="sv__pbar"><div class="sv__pbar-fill" id="sv-pbar-fill"></div></div>
          <button class="sv__btn sv__btn--icon sv__c-toc" onclick="SlideViewer.toggleToc()" title="Contents (T)" aria-label="Contents">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M3 12h18M3 6h18M3 18h18"/></svg>
          </button>
          <span class="sv__c-title" title="${escHtml(data.title || '')}">${escHtml(data.title || '')}</span>
          <div class="sv__c-progress">
            <div class="sv__progress-dots" id="sv-dots">
              ${slides.map((s, i) => `<span class="sv__dot ${s.type === 'quiz' ? 'sv__dot--quiz' : ''} ${i === current ? 'sv__dot--active' : ''} ${i < current ? 'sv__dot--done' : ''}" onclick="SlideViewer.goToSlide(${i})"></span>`).join('')}
            </div>
          </div>
          <div class="sv__c-nav">
            <button class="sv__btn sv__btn--nav" onclick="SlideViewer.prevSlide()" id="sv-prev" aria-label="Previous slide" title="Previous slide">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"/></svg>
            </button>
            <span class="sv__counter" id="sv-counter">${current + 1} / ${slides.length}</span>
            <button class="sv__btn sv__btn--nav" onclick="SlideViewer.nextSlide()" id="sv-next" aria-label="Next slide" title="Next slide">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="9 18 15 12 9 6"/></svg>
            </button>
          </div>
          <button class="sv__btn sv__btn--icon sv__c-formulas" onclick="SlideViewer.toggleFormulas()" title="Formulas (F)" aria-label="Formulas">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 4h16v16H4z"/><path d="M8 8h8M8 12h5M8 16h8"/></svg>
          </button>
          <div class="sv__c-practice">${buildPracticeRail()}</div>
          <div class="sv__c-stats">
            <div class="sv__hud">
              <span class="sv__hud-lvl" id="sv-hud-lvl" ${acctLevel() < 1 ? 'style="display:none"' : ''}>Lv ${acctLevel()}</span>
              <span class="sv__hud-xp" id="sv-xp" title="Practice accuracy bonus. Included only in the first lesson reward; later practice does not add to total XP." ${xp < 1 ? 'style="display:none"' : ''}>+<span id="sv-xp-val">${xp}</span> accuracy</span>
              <span class="sv__hud-streak" id="sv-streak" ${acctStreak() < 2 ? 'style="display:none"' : ''}>${FLAME_SVG}${acctStreak()}</span>
            </div>
            <span style="position:relative" id="sv-flag-anchor">
              <button class="sv__btn sv__btn--icon" onclick="SlideViewer.flagSlide(event)" title="Save a local note" aria-label="Save a local note">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>
              </button>
            </span>
          </div>
        </header>

        <div class="sv__layout">
          <nav class="sv__toc" id="sv-toc">
            <div class="sv__toc-header">
              <span class="sv__toc-title">Contents</span>
              <button class="sv__toc-close" onclick="SlideViewer.toggleToc()" aria-label="Close">&times;</button>
            </div>
            <div class="sv__toc-list" id="sv-toc-list">
              ${slides.map((s, i) => `
                <div class="sv__toc-item ${i === current ? 'sv__toc-item--active' : ''}"
                     data-idx="${i}" onclick="SlideViewer.selectTocSlide(${i})">
                  <span class="sv__toc-num">${s.n}</span>
                  <span class="sv__toc-label">${escHtml(s.title || 'Slide ' + s.n)}</span>
                  ${s.type === 'quiz' ? '<span class="sv__toc-badge sv__toc-badge--quiz">Q</span>' : ''}
                  ${s.type === 'code' ? '<span class="sv__toc-badge sv__toc-badge--code">&lt;/&gt;</span>' : ''}
                  ${s.is_question ? '<span class="sv__toc-badge">P</span>' : ''}
                </div>
              `).join('')}
            </div>
          </nav>

          <div class="sv__main">
            <div class="sv__content" id="sv-content"></div>
          </div>
        </div>

        <div class="sv__formulas-overlay" id="sv-formulas" style="display:none" onclick="SlideViewer.formulasBackdrop(event)">
          <div class="sv__formulas-panel">
            <div class="sv__formulas-header">
              <h3>Formula Quick Reference</h3>
              <button class="sv__formulas-close" onclick="SlideViewer.toggleFormulas()" aria-label="Close formulas (Esc)" title="Close (Esc)">&times;</button>
            </div>
            <div class="sv__formulas-grid" id="sv-formulas-grid">${buildFormulaCards()}</div>
          </div>
        </div>
      </div>`;
  }

  /* ============================================
     PERSISTENT PRACTICE RAIL — a "Practice N" pill docked into the bottom
     nav's right cell, linking to this lesson's curated practice playlist so
     the learner can jump to it from any slide (not only via the end-of-lesson
     CTA). Sitting in the nav row keeps it anchored as page furniture rather
     than floating in the gutter. Hidden on the final slide, where the end CTA
     already offers it.
     ============================================ */
  function buildPracticeRail() {
    const hasPractice = !!(lectureMeta && lectureMeta.practiceUrl && lectureMeta.practiceCount > 0);
    if (!hasPractice) return '';
    const url = escHtml(lectureMeta.practiceUrl);
    const cnt = lectureMeta.practiceCount;
    return `<a class="sv__prail" id="sv-prail" href="${url}" title="Practice this lesson: ${cnt} problems" aria-label="Practice this lesson: ${cnt} problems" onclick="SlideViewer.trackPracticeClick('rail')">
      <span class="sv__prail-ico">${PRACTICE_ICON}</span>
      <span class="sv__prail-text"><span class="sv__prail-label">Practice</span><span class="sv__prail-count">${cnt}</span></span>
    </a>`;
  }

  /* ============================================
     NAVIGATION — card-style transitions
     ============================================ */
  function selectTocSlide(idx) {
    if (window.QGLearnEmbed && tocVisible) toggleToc();
    goToSlide(idx);
    if (window.QGLearnEmbed) {
      const content = document.getElementById('sv-content');
      if (content) window.QGLearnEmbed.scrollToElement(content, { behavior: 'instant', block: 'start' });
    }
  }

  function goToSlide(idx) {
    if (idx < 0 || idx >= slides.length) return;
    const dir = idx > current ? 'right' : (idx < current ? 'left' : 'fade');
    ; /* Original analytics removed for local preview. */
    slideShownAt = Date.now();
    current = idx;

    const slide = slides[current];
    const contentEl = document.getElementById('sv-content');
    if (!contentEl) return;

    let html = `<div class="sv__card sv__card--enter-${dir}${slide.type === 'section' ? ' sv__card--section' : ''}">`;

    // Concept labels
    if (slide.labels && slide.labels.length) {
      html += '<div class="sv__concept-labels">';
      slide.labels.forEach(l => {
        html += `<span class="sv__concept-label sv__concept-label--${l.type || 'definition'}">${escHtml(l.text)}</span>`;
      });
      html += '</div>';
    }

    // Section break: a transition card ("Up next: ...") between topics. It renders its own title/md and skips the
    // regular title + body below. { type:'section', title, eyebrow, icon, md, widgets }
    const isSection = slide.type === 'section';
    if (isSection) {
      html += `<div class="sv__section">${svIcon(slide.icon) ? `<div class="sv__section-icon">${svIcon(slide.icon)}</div>` : ''}<div class="sv__section-eyebrow">${escHtml(slide.eyebrow || 'Up next')}</div><h2 class="sv__section-title">${escHtml(slide.title || '')}</h2>${slide.md ? `<div class="sv__card-body sv__section-body">${renderMarkdown(slide.md)}</div>` : ''}</div>`;
    }

    // Slide title
    const mdStartsWithH2 = slide.md && /^##\s/.test(slide.md.trim());
    if (!isSection && slide.title && !mdStartsWithH2 && slide.type !== 'quiz') {
      html += `<h2 class="sv__card-title">${escHtml(slide.title)}</h2>`;
    }

    // Markdown body
    if (slide.md && !isSection) {
      html += `<div class="sv__card-body">${renderMarkdown(slide.md)}</div>`;
    }

    // Widgets (donut charts)
    if (slide.widgets && slide.widgets.length) {
      html += buildWidgets(slide.widgets, slide.n);
    }
    // Optional markdown that belongs AFTER the widgets (e.g. a takeaway under tiles).
    if (slide.md_after) {
      html += `<div class="sv__card-body sv__card-body--after">${renderMarkdown(slide.md_after)}</div>`;
    }

    // Quiz
    if (slide.type === 'quiz' && slide.quiz) {
      html += buildQuiz(slide);
    }

    // In-lesson code exercise (mini editor + Pyodide/JS runner)
    if (slide.type === 'code' && slide.code) {
      html += buildCodeExercise(slide);
    }

    // Reveal blocks
    if (slide.reveals && slide.reveals.length) {
      slide.reveals.forEach((rev, ri) => html += buildRevealBlock(slide.n, ri, rev));
    }

    // Problem card
    if (slide.is_question && (slide.problem_id || slide.problem_display_id)) {
      html += buildProblemCard(slide);
    }

    // Up Next CTA on last slide
    const isLastSlide = current === slides.length - 1;
    if (isLastSlide) html += buildUpNext();

    html += '</div>';
    contentEl.innerHTML = html;
    drawCharts(contentEl);

    runKatex(contentEl);
    highlightCodeBlocks(contentEl);
    if (typeof FpRender !== 'undefined') FpRender.render(contentEl);
    updateChrome();
    maybeScrollToSlideTop();

    // Reaching the final slide = lesson complete: bank the real XP now (once),
    // so the completion card can show the true banked total / level / streak.
    // EXCEPTION: if the last slide is itself a quiz, defer banking until that
    // quiz is answered (awardXp) or the user clicks a completion CTA — otherwise
    // the final quiz's XP would be banked before it's earned.
    if (isLastSlide && !(slides[current] && slides[current].type === 'quiz')) bankLessonXp();
  }

  // Page-scroll model: when navigating after the reader has scrolled down into
  // a long slide, snap the new slide's top below the sticky chrome. No-op when
  // the slide top is already in view (avoids jumping on initial load / short slides).
  let suppressSlideScroll = false; // in-place widget re-renders should not jump
  function maybeScrollToSlideTop() {
    if (suppressSlideScroll) { suppressSlideScroll = false; return; }
    const content = document.getElementById('sv-content');
    const chrome = document.getElementById('sv-chrome');
    if (!content) return;
    if (window.QGLearnEmbed) {
      window.QGLearnEmbed.scrollToElement(content, { behavior: 'instant', onlyIfAbove: true });
      return;
    }
    // Desktop: chrome is pinned (sticky) just below the global nav, so its
    // bottom edge is the line below which slide content must start. Mobile:
    // the chrome is STATIC (scrolls away) — the threshold is the viewport top
    // (0), otherwise a mid-scroll page turn strands the reader deep inside
    // the new slide with no title or context.
    let obscuredBelow = 0;
    if (chrome) {
      const pos = getComputedStyle(chrome).position;
      if (pos === 'sticky' || pos === 'fixed') {
        obscuredBelow = chrome.getBoundingClientRect().bottom;
      }
    }
    // Mobile (static chrome) still has the sticky GLOBAL nav overlaying the
    // viewport top: anchor below it, or the slide/question title lands hidden
    // behind the bar (user report 2026-08-27). Desktop: the sticky chrome's
    // bottom already includes the nav offset.
    if (!obscuredBelow) {
      const gnav = document.querySelector('.nav, nav, header');
      if (gnav) {
        const np = getComputedStyle(gnav).position;
        if (np === 'sticky' || np === 'fixed') obscuredBelow = gnav.getBoundingClientRect().bottom;
      }
    }
    const top = content.getBoundingClientRect().top;
    // Snap only when the slide top is really hidden. Before the chrome pins, the
    // card's top padding sits ~8px under the chrome's bottom edge by layout; a
    // tight threshold re-snapped on every page turn and crept the page up 8px per
    // click (user report 2026-10-06).
    if (top < obscuredBelow - 16) {
      // 'instant', not 'auto': the page has CSS scroll-behavior:smooth, and a
      // smooth scroll racing the card's enter animation reads as jank — a page
      // turn should swap context immediately. Target: slide top just below the
      // sticky bars, so the new slide/question title is the first thing visible.
      window.scrollTo({ top: Math.max(0, window.scrollY + top - obscuredBelow - 8), behavior: 'instant' });
    }
    // Mobile (static chrome): the counter scrolled away with the top bar, so
    // a page turn briefly flashes "N / M" in-viewport for progress feedback.
    if (chrome && getComputedStyle(chrome).position === 'static') {
      flashPageToast();
    }
  }

  let _pageToastTimer = null;
  function flashPageToast() {
    try {
      const root = targetEl && targetEl.querySelector('.sv');
      if (!root) return;
      let toast = root.querySelector('.sv__page-toast');
      if (!toast) {
        toast = document.createElement('div');
        toast.className = 'sv__page-toast';
        toast.setAttribute('aria-hidden', 'true');
        root.appendChild(toast);
      }
      toast.textContent = (current + 1) + ' / ' + slides.length;
      toast.classList.add('is-on');
      if (_pageToastTimer) clearTimeout(_pageToastTimer);
      _pageToastTimer = setTimeout(function () { toast.classList.remove('is-on'); }, 1100);
    } catch (e) { /* cosmetic only */ }
  }

  function updateChrome() {
    // Progress dots
    document.querySelectorAll('.sv__dot').forEach((dot, i) => {
      dot.classList.toggle('sv__dot--active', i === current);
      dot.classList.toggle('sv__dot--done', i < current);
    });
    // Counter
    const counter = document.getElementById('sv-counter');
    if (counter) counter.textContent = `${current + 1} / ${slides.length}`;
    // Linear progress bar (shown by some chrome variants)
    const pbar = document.getElementById('sv-pbar-fill');
    if (pbar) pbar.style.width = `${((current + 1) / slides.length) * 100}%`;
    // Nav buttons
    const prevBtn = document.getElementById('sv-prev');
    const nextBtn = document.getElementById('sv-next');
    if (prevBtn) prevBtn.disabled = current === 0;
    if (nextBtn) nextBtn.disabled = current === slides.length - 1;
    // TOC
    document.querySelectorAll('.sv__toc-item').forEach((item, i) => {
      item.classList.toggle('sv__toc-item--active', i === current);
    });
    const activeToc = document.querySelector('.sv__toc-item--active');
    if (activeToc && !window.QGLearnEmbed) activeToc.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    // Hide the persistent practice rail on the last slide — the end CTA already shows it
    const prail = document.getElementById('sv-prail');
    if (prail) prail.style.display = (current === slides.length - 1) ? 'none' : '';
    // Save position
    if (data && data.id) localStorage.setItem('sv-pos-' + data.id, current.toString());
  }

  function nextSlide() { goToSlide(current + 1); }
  function prevSlide() { goToSlide(current - 1); }

  /* ---- KaTeX helper ---- */
  function runKatex(el) {
    if (typeof KatexRender !== 'undefined') {
      KatexRender.render(el);
    } else if (typeof renderMathInElement === 'function') {
      renderMathInElement(el, {
        delimiters: [
          { left: '$$', right: '$$', display: true },
          { left: '$', right: '$', display: false },
          { left: '\\[', right: '\\]', display: true },
          { left: '\\(', right: '\\)', display: false },
        ],
        throwOnError: false,
      });
    }
  }

  /* ============================================
     WIDGETS — donut charts, etc.
     ============================================ */
  function buildWidgets(widgets, slideN) {
    let html = '<div class="sv__widgets">';
    widgets.forEach((w, wi) => {
      if (w.type === 'donut') html += buildDonutChart(w);
      else if (w.type === 'ds-explorer') html += buildDsExplorer(w, slideN, wi);
      else if (w.type === 'tiles') html += buildTiles(w);
      else if (w.type === 'compare') html += buildCompare(w);
      else if (w.type === 'flipcards') html += buildFlipcards(w, slideN, wi);
      else if (w.type === 'steps') html += buildSteps(w, slideN, wi);
      // Wrapped so a diagram and its note stay one grid cell (.sv__widgets is a multi-column grid).
      else if (w.type === 'map') html += `<div class="sv__wblock">${buildMap(w)}</div>`;
      else if (w.type === 'flow') html += `<div class="sv__wblock">${buildFlow(w)}</div>`;
      else if (w.type === 'bars') html += `<div class="sv__wblock">${buildBars(w)}</div>`;
      else if (w.type === 'book') html += `<div class="sv__wblock">${buildBook(w)}</div>`;
      else if (w.type === 'chart') html += `<div class="sv__wblock">${buildChart(w, slideN, wi)}</div>`;
      else if (w.type === 'tree' || w.type === 'timeline' || w.type === 'heatmap' || w.type === 'spectrum' || w.type === 'quadrant') html += `<div class="sv__wblock">${buildDiagram(w, slideN, wi)}</div>`;
      else if (w.type === 'table') html += `<div class="sv__wblock">${buildTable(w)}</div>`;
      else if (w.type === 'stackbar') html += `<div class="sv__wblock">${buildStackbar(w)}</div>`;
      else if (w.type === 'explore') html += `<div class="sv__wblock">${buildExplore(w, slideN, wi)}</div>`;
      else if (w.type === 'mmgame') html += `<div class="sv__wblock">${buildMmgame(w, slideN, wi)}</div>`;
      else if (w.type === 'predict') html += `<div class="sv__wblock">${buildPredict(w, slideN, wi)}</div>`;
      else if (w.type === 'poll') html += `<div class="sv__wblock">${buildPoll(w, slideN, wi)}</div>`;
    });
    html += '</div>';
    return html;
  }

  /* ---- Data-structure explorer: Brilliant-style clickable cards.
     widget: { type:'ds-explorer', items:[{ key, name, hook, glyph,
       picture, fast, slow, reach, trap }] }
     Click a card and its detail renders in a shared panel under the grid. ---- */
  const dsxStates = {}; // "slideN:wi" -> selected index
  const DSX_GLYPHS = {
    array: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2">' +
      [0,1,2,3,4].map(i => `<rect x="${4+i*18}" y="8" width="16" height="20" rx="3"/>`).join('') +
      '</g><text x="48" y="38" text-anchor="middle" font-size="9" fill="currentColor" opacity="0.55">0  1  2  3  4</text></svg>',
    dynarray: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2">' +
      [0,1,2].map(i => `<rect x="${4+i*18}" y="10" width="16" height="20" rx="3"/>`).join('') +
      '<rect x="58" y="10" width="16" height="20" rx="3" stroke-dasharray="3 3" opacity="0.5"/><rect x="76" y="10" width="16" height="20" rx="3" stroke-dasharray="3 3" opacity="0.3"/></g></svg>',
    list: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="14" cy="20" r="8"/><circle cx="48" cy="20" r="8"/><circle cx="82" cy="20" r="8"/><path d="M23 20h10M57 20h10"/><path d="M33 17l5 3-5 3M67 17l5 3-5 3" fill="currentColor" stroke="none"/></g></svg>',
    stack: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="30" y="28" width="36" height="7" rx="2"/><rect x="30" y="19" width="36" height="7" rx="2"/><rect x="30" y="10" width="36" height="7" rx="2"/><path d="M74 8v10" opacity="0.7"/><path d="M71 14l3 4 3-4" fill="currentColor" stroke="none" opacity="0.7"/></g></svg>',
    queue: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="26" y="12" width="12" height="16" rx="2"/><rect x="42" y="12" width="12" height="16" rx="2"/><rect x="58" y="12" width="12" height="16" rx="2"/><path d="M6 20h14M76 20h14" opacity="0.7"/><path d="M16 17l4 3-4 3M86 17l4 3-4 3" fill="currentColor" stroke="none" opacity="0.7"/></g></svg>',
    deque: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="34" y="12" width="12" height="16" rx="2"/><rect x="50" y="12" width="12" height="16" rx="2"/><path d="M10 20h16M70 20h16" opacity="0.7"/><path d="M14 17l-4 3 4 3M22 17l4 3-4 3M74 17l-4 3 4 3M82 17l4 3-4 3" fill="currentColor" stroke="none" opacity="0.7"/></g></svg>',
    hashmap: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><rect x="6" y="6" width="22" height="11" rx="3"/><rect x="6" y="23" width="22" height="11" rx="3"/><rect x="68" y="14" width="22" height="11" rx="3"/><path d="M30 11c18 0 22 9 36 9M30 29c18 0 22-9 36-9" opacity="0.6"/></g></svg>',
    heap: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="10" r="7"/><circle cx="28" cy="30" r="6" opacity="0.6"/><circle cx="68" cy="30" r="6" opacity="0.6"/><path d="M43 15l-10 10M53 15l10 10" opacity="0.6"/></g><text x="48" y="14" text-anchor="middle" font-size="10" fill="currentColor">★</text></svg>',
    sorted: '<svg viewBox="0 0 96 40"><g fill="currentColor"><rect x="10" y="28" width="10" height="7" rx="1.5"/><rect x="26" y="23" width="10" height="12" rx="1.5"/><rect x="42" y="17" width="10" height="18" rx="1.5"/><rect x="58" y="11" width="10" height="24" rx="1.5"/><rect x="74" y="5" width="10" height="30" rx="1.5"/></g></svg>',
    bst: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="9" r="6"/><circle cx="26" cy="26" r="5"/><circle cx="70" cy="26" r="5"/><path d="M44 13l-14 9M52 13l14 9" opacity="0.7"/></g><text x="26" y="29" text-anchor="middle" font-size="8" fill="currentColor">&lt;</text><text x="70" y="29" text-anchor="middle" font-size="8" fill="currentColor">&gt;</text></svg>',
    trie: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="48" cy="8" r="5"/><circle cx="30" cy="22" r="5"/><circle cx="66" cy="22" r="5"/><circle cx="22" cy="35" r="4" opacity="0.7"/><circle cx="38" cy="35" r="4" opacity="0.7"/><path d="M44 11l-10 8M52 11l10 8M27 26l-3 5M33 26l3 5" opacity="0.7"/></g></svg>',
    graph: '<svg viewBox="0 0 96 40"><g fill="none" stroke="currentColor" stroke-width="2"><circle cx="16" cy="12" r="6"/><circle cx="52" cy="8" r="6"/><circle cx="82" cy="18" r="6"/><circle cx="34" cy="32" r="6"/><circle cx="66" cy="32" r="6"/><path d="M22 14l24-4M58 10l18 6M20 17l10 10M40 30l20 0M70 28l8-6" opacity="0.55"/></g></svg>',
  };

  function buildDsExplorer(w, slideN, wi) {
    const id = `${slideN}:${wi}`;
    const sel = dsxStates[id];
    let html = `<div class="sv__dsx"><div class="sv__dsx-grid">`;
    (w.items || []).forEach((it, i) => {
      const glyph = DSX_GLYPHS[it.glyph] || '';
      html += `<button class="sv__dsx-card${sel === i ? ' sv__dsx-card--on' : ''}" onclick="SlideViewer.dsxSelect('${id}', ${i})" aria-expanded="${sel === i}">
        <span class="sv__dsx-glyph">${glyph}</span>
        <span class="sv__dsx-name">${escHtml(it.name)}</span>
        <span class="sv__dsx-hook">${escHtml(it.hook)}</span>
      </button>`;
    });
    html += '</div>';
    if (sel !== undefined && w.items[sel]) {
      const it = w.items[sel];
      html += `<div class="sv__dsx-panel">
        <div class="sv__dsx-panel-title">${DSX_GLYPHS[it.glyph] || ''}<span>${escHtml(it.name)}</span></div>
        <p class="sv__dsx-picture">${dsxInline(it.picture)}</p>
        <div class="sv__dsx-ops">
          <span class="sv__dsx-chip sv__dsx-chip--fast">Fast: ${dsxInline(it.fast)}</span>
          <span class="sv__dsx-chip sv__dsx-chip--slow">Slow: ${dsxInline(it.slow)}</span>
        </div>
        <p class="sv__dsx-reach"><strong>Reach for it when:</strong> ${dsxInline(it.reach)}</p>
        ${it.trap ? `<p class="sv__dsx-trap">${dsxInline(it.trap)}</p>` : ''}
      </div>`;
    } else {
      html += `<div class="sv__dsx-panel sv__dsx-panel--empty">Tap a structure to see how to think about it.</div>`;
    }
    html += '</div>';
    return html;
  }

  // Minimal inline formatting (bold + code) for dsx strings; escaped first.
  function dsxInline(s) {
    return escHtml(String(s || ''))
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>');
  }

  function dsxSelect(id, i) {
    dsxStates[id] = dsxStates[id] === i ? undefined : i; // re-click toggles off
    suppressSlideScroll = true;
    goToSlide(current); // in-place re-render keeps everything else stable
  }

  function buildDonutChart(w) {
    let cum = 0;
    const stops = w.segments.map(seg => {
      const start = cum;
      cum += seg.pct;
      return `${seg.color} ${start}% ${cum}%`;
    }).join(', ');

    const legend = w.segments.map(seg =>
      `<div class="sv__donut-legend-item">
        <span class="sv__donut-dot" style="background:${seg.color}"></span>
        <span class="sv__donut-legend-label">${escHtml(seg.label)}</span>
        <span class="sv__donut-legend-pct">${seg.pct}%</span>
      </div>`
    ).join('');

    return `
      <div class="sv__donut-widget">
        <div class="sv__donut-title">${escHtml(w.title)}</div>
        <div class="sv__donut-wrap">
          <div class="sv__donut-ring" style="background:conic-gradient(${stops})">
            <div class="sv__donut-hole">
              <span class="sv__donut-val">${escHtml(w.centerLabel || '')}</span>
              <span class="sv__donut-sub">${escHtml(w.centerSub || '')}</span>
            </div>
          </div>
          <div class="sv__donut-legend">${legend}</div>
        </div>
      </div>`;
  }

  /* ============================================
     QUIZ — multiple choice, true/false, numeric
     ============================================ */
  function buildQuiz(slide) {
    const q = slide.quiz;
    const qType = q.type || 'mc';
    const state = quizStates[slide.n];
    const answered = state && state.answered;

    let html = '<div class="sv__quiz">';
    if (q.question) {
      html += `<div class="sv__quiz-q">${renderMarkdown(q.question)}</div>`;
    }

    if (qType === 'tf') html += buildTF(slide, q, state, answered);
    else if (qType === 'numeric') html += buildNumeric(slide, q, state, answered);
    else if (qType === 'codepick') html += buildCodePick(slide, q, state, answered);
    else if (qType === 'match') html += buildMatch(slide, q, state, answered);
    else if (qType === 'order') html += buildOrder(slide, q, state, answered);
    else if (qType === 'sort') html += buildSort(slide, q, state, answered);
    else html += buildMC(slide, q, state, answered);

    // Explanation
    if (answered && q.explanation) {
      const ok = state.correct;
      html += `<div class="sv__quiz-expl sv__quiz-expl--${ok ? 'ok' : 'no'}">
        <div class="sv__quiz-expl-hdr">
          <span>${ok
            ? '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M8 12.5l2.6 2.6L16 9.6"/></svg>'
            : '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>'}</span>
          <strong>${ok ? 'Correct!' : 'Not quite. Here\'s why:'}</strong>
        </div>
        <div class="sv__quiz-expl-body">${renderMarkdown(q.explanation)}</div>
      </div>`;
    }
    html += '</div>';
    return html;
  }

  /* ---- Spot the bug: numbered code, click the faulty line ----
     quiz: { type:'codepick', code:'...', correct:<1-based line>, language?, explanation }
     Reuses handleQuizAnswer — the "choice" is the clicked line number. ---- */
  function buildCodePick(slide, q, state, answered) {
    const lines = String(q.code || '').replace(/\n$/, '').split('\n');
    let html = `<div class="sv__cp"><div class="sv__cp-head">Click the line with the bug</div><div class="sv__cp-code">`;
    lines.forEach((ln, i) => {
      const num = i + 1;
      let cls = 'sv__cp-line';
      if (answered) {
        if (num === q.correct) cls += ' sv__cp-line--ok';
        else if (num === state.selected) cls += ' sv__cp-line--no';
        else cls += ' sv__cp-line--dim';
      }
      const click = answered ? '' : `onclick="SlideViewer.handleQuizAnswer(${slide.n},${num})"`;
      html += `<div class="${cls}" ${click}><span class="sv__cp-num">${num}</span><code>${escHtml(ln) || '&nbsp;'}</code>${answered && num === q.correct ? '<span class="sv__cp-flag">bug</span>' : ''}</div>`;
    });
    html += '</div></div>';
    return html;
  }

  /* ---- Standard multiple choice ---- */
  function buildMC(slide, q, state, answered) {
    let html = '<div class="sv__mc">';
    q.choices.forEach((choice, ci) => {
      let cls = 'sv__mc-btn';
      let icon = `<span class="sv__mc-letter">${String.fromCharCode(65 + ci)}</span>`;
      if (answered) {
        if (ci === q.correct) { cls += ' sv__mc-btn--ok'; icon = '<span class="sv__mc-icon sv__mc-icon--ok">✓</span>'; }
        else if (ci === state.selected) { cls += ' sv__mc-btn--no'; icon = '<span class="sv__mc-icon sv__mc-icon--no">✗</span>'; }
        else { cls += ' sv__mc-btn--dim'; }
      }
      const click = answered ? '' : `onclick="SlideViewer.handleQuizAnswer(${slide.n},${ci})"`;
      html += `<button class="${cls}" ${click}>${icon}<span class="sv__mc-text">${renderMarkdown(choice)}</span></button>`;
    });
    html += '</div>';
    return html;
  }

  /* ---- True / False ---- */
  function buildTF(slide, q, state, answered) {
    let html = '<div class="sv__tf">';
    [true, false].forEach((val, ci) => {
      const label = val ? 'True' : 'False';
      const isCorrectChoice = val === q.correct;
      let cls = 'sv__tf-btn';
      if (answered) {
        if (isCorrectChoice) cls += ' sv__tf-btn--ok';
        else if (ci === state.selected) cls += ' sv__tf-btn--no';
        else cls += ' sv__tf-btn--dim';
      }
      const click = answered ? '' : `onclick="SlideViewer.handleQuizAnswer(${slide.n},${ci})"`;
      html += `<button class="${cls}" ${click}>
        <span class="sv__tf-icon">${val ? '✓' : '✗'}</span>
        <span class="sv__tf-label">${label}</span>
      </button>`;
    });
    html += '</div>';
    return html;
  }

  /* ---- Numeric input ---- */
  // Numeric quizzes may store the answer under `correct` OR `answer` (authoring
  // inconsistency). Accept either so the grade/display never reads `undefined`.
  function numAnswer(q) {
    return (q.correct !== undefined && q.correct !== null) ? q.correct : q.answer;
  }
  // Accept decimals, fractions ("1/6") and percentages ("16.7%"). Plain parseFloat
  // turned "1/6" into 1, so fraction answers — which several quiz prompts explicitly
  // ask for ("Enter your answer as a fraction") — were always graded wrong.
  function parseNumericInput(raw) {
    if (raw == null) return NaN;
    let s = String(raw).trim().replace(/\s+/g, '');
    if (!s) return NaN;
    // A trailing % is tolerated but NOT rescaled: numeric quiz answers are stored
    // in the units the prompt asks for (e.g. "41" for 41%, "-3" for -3 percentage
    // points), so dividing by 100 here would break every percentage-point quiz.
    if (s.endsWith('%')) s = s.slice(0, -1);
    const NUM = /^[+-]?(?:\d+\.?\d*|\.\d+)$/;
    const frac = s.match(/^([+-]?(?:\d+\.?\d*|\.\d+))\/([+-]?(?:\d+\.?\d*|\.\d+))$/);
    if (frac) {
      const denom = parseFloat(frac[2]);
      if (denom === 0) return NaN;
      return parseFloat(frac[1]) / denom;
    }
    // Strict: the whole string must be a number. Guards against parseFloat
    // silently accepting "1/abc" -> 1 or "1/6/7" -> 1.
    return NUM.test(s) ? parseFloat(s) : NaN;
  }
  function buildNumeric(slide, q, state, answered) {
    let html = '<div class="sv__num">';
    if (answered) {
      const ok = state.correct;
      html += `<div class="sv__num-result sv__num-result--${ok ? 'ok' : 'no'}">
        <span>Your answer: <strong>${escHtml(state.userAnswer)}</strong></span>
        ${!ok ? `<span>Correct: <strong>${numAnswer(q)}</strong></span>` : ''}
      </div>`;
    } else {
      html += `<div class="sv__num-form">
        <input type="text" class="sv__num-input" id="sv-num-${slide.n}" placeholder="Your answer…"
          onkeydown="if(event.key==='Enter')SlideViewer.submitNumeric(${slide.n})">
        <button class="sv__num-submit" onclick="SlideViewer.submitNumeric(${slide.n})">Check</button>
      </div>`;
      if (q.hint) html += `<div class="sv__num-hint">${escHtml(q.hint)}</div>`;
    }
    html += '</div>';
    return html;
  }

  function submitNumeric(slideNum) {
    if (quizStates[slideNum]?.answered) return;
    const input = document.getElementById('sv-num-' + slideNum);
    if (!input) return;
    const val = parseNumericInput(input.value);
    if (isNaN(val)) { input.classList.add('sv__num-input--shake'); setTimeout(() => input.classList.remove('sv__num-input--shake'), 500); return; }
    const slide = slides.find(s => s.n === slideNum);
    if (!slide || !slide.quiz) return;
    const q = slide.quiz;
    // Parse the STORED answer with the same parser as user input, so an authored
    // fraction/percent answer (e.g. correct: "1/6") grades correctly instead of
    // Number("1/6") -> NaN -> always wrong.
    const target = parseNumericInput(numAnswer(q));
    const ok = !isNaN(target) && Math.abs(val - target) <= (q.tolerance || 0.01);
    quizStates[slideNum] = { answered: true, selected: null, correct: ok, userAnswer: input.value };
    window.LocalQuizProgress.save(data.id, slide, quizStates[slideNum]);
    quizSound(ok);
    ; /* Original analytics removed for local preview. */
    if (ok) awardXp(slideNum); else resetStreak();
    // Last-slide quiz: bank now even on a wrong answer so base XP is saved and
    // the completion card resolves (idempotent; awardXp also banks on correct).
    if (current === slides.length - 1) bankLessonXp();
    goToSlide(current);
  }

  function handleQuizAnswer(slideNum, choiceIdx) {
    if (quizStates[slideNum]?.answered) return;
    const slide = slides.find(s => s.n === slideNum);
    if (!slide || !slide.quiz) return;
    const q = slide.quiz;
    const qType = q.type || 'mc';
    let ok;
    if (qType === 'tf') ok = (choiceIdx === 0) === q.correct;
    else ok = choiceIdx === q.correct;
    quizStates[slideNum] = { answered: true, selected: choiceIdx, correct: ok };
    window.LocalQuizProgress.save(data.id, slide, quizStates[slideNum]);
    quizSound(ok);
    ; /* Original analytics removed for local preview. */
    if (ok) awardXp(slideNum); else resetStreak();
    // Last-slide quiz: bank now even on a wrong answer so base XP is saved and
    // the completion card resolves (idempotent; awardXp also banks on correct).
    if (current === slides.length - 1) bankLessonXp();
    goToSlide(current);
  }

  /* ============================================
     SYNTAX HIGHLIGHTING — tiny regex tokenizer for lesson code blocks.
     Good-enough coloring for Python/C++/JS display; no external libs.
     Operates on textContent, emits escaped spans, so it is XSS-safe.
     ============================================ */
  const HL_KEYWORDS = new Set(('def return if elif else for while in not and or is None True False import from as with try except finally ' +
    'raise lambda yield global nonlocal pass break continue class assert del print ' +
    'int float str bool list dict set tuple len range enumerate sorted sum min max abs map filter zip ' +
    'const let var function new this typeof instanceof switch case default do void struct template typename ' +
    'public private auto long double char unsigned signed static inline namespace using include').split(' '));

  function highlightOne(codeEl) {
    if (codeEl.dataset.hl) return;
    codeEl.dataset.hl = '1';
    const src = codeEl.textContent;
    const re = /(#[^\n]*|\/\/[^\n]*)|("(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*')|\b(\d+\.?\d*(?:e[+-]?\d+)?)\b|\b([A-Za-z_][A-Za-z0-9_]*)\b/g;
    let out = '', last = 0, m;
    while ((m = re.exec(src)) !== null) {
      out += escHtml(src.slice(last, m.index));
      if (m[1]) out += `<span class="hl-c">${escHtml(m[1])}</span>`;
      else if (m[2]) out += `<span class="hl-s">${escHtml(m[2])}</span>`;
      else if (m[3]) out += `<span class="hl-n">${escHtml(m[3])}</span>`;
      else if (m[4]) out += HL_KEYWORDS.has(m[4]) ? `<span class="hl-k">${escHtml(m[4])}</span>` : escHtml(m[4]);
      last = re.lastIndex;
    }
    out += escHtml(src.slice(last));
    codeEl.innerHTML = out;
  }

  function highlightCodeBlocks(root) {
    try {
      root.querySelectorAll('pre.md-code code, .sv__code-sol pre code, .sv__cp-line code').forEach(highlightOne);
    } catch (e) { /* display sugar only — never break the slide */ }
  }

  /* ============================================
     CODE EXERCISE — mini editor + in-browser runner
     Reuses the coding IDE's worker (js/code-runner.js): Python via Pyodide,
     JavaScript natively. Slide shape:
       { type:'code', title, md, code: { language, starter, solution,
         artifact: { entry, judge, tests:[{name,args,expected}] } } }
     ============================================ */
  const codeStates = {}; // slide n -> { buffer, results, pass, running }
  let codeWorker = null;
  let codeWorkerWarm = false;
  let codeRunTimer = null;
  const CODE_WORKER_SRC = new URL('runner/python-worker.mjs', location.href);

  function getCodeWorker() {
    if (!codeWorker) {
      codeWorker = new Worker(CODE_WORKER_SRC, {type:"module"});
      codeWorker.onmessage = onCodeWorkerMsg;
      codeWorker.onerror = function () { codeStatus(activeCodeSlide, 'Runner error, try again.', 'err'); clearCodeRun(); };
    }
    return codeWorker;
  }

  let activeCodeSlide = null;

  function warmCodeRunner(slide) {
    // Fire-and-forget: boot Pyodide in the background when a code slide first
    // shows, so the user's first Run doesn't pay the cold start.
    if (codeWorkerWarm) return;
    codeWorkerWarm = true;
    try {
      getCodeWorker().postMessage({ mode: 'warmup', language: (slide.code.language || 'python') });
    } catch (e) { /* non-fatal: Run still cold-starts */ }
  }

  function buildCodeExercise(slide) {
    const st = codeStates[slide.n] || {};
    const c = slide.code;
    const buffer = st.buffer !== undefined ? st.buffer : (localStorage.getItem('qvl-code-'+data.id+'-'+slide.n) ?? c.starter ?? '');
    const lines = Math.min(18, Math.max(6, buffer.split('\n').length + 1));
    const lang = (c.language || 'python');
    const langLabel = lang === 'javascript' ? 'JavaScript' : 'Python';
    const solvedKey = `sv-xp-${data.id}-${slide.n}`;
    const solvedBefore = !!localStorage.getItem(solvedKey);
    let html = `<div class="sv__code" data-slide="${slide.n}">
      <div class="sv__code-bar">
        <span class="sv__code-lang">${langLabel}</span>
        <span class="sv__code-hint">${solvedBefore ? '&#10003; solved' : 'Local Python · Ctrl/Cmd + Enter runs'}</span>
      </div>
      <textarea id="sv-code-ed-${slide.n}" class="sv__code-ed" rows="${lines}" spellcheck="false"
        autocapitalize="off" autocomplete="off" autocorrect="off"
        oninput="SlideViewer.onCodeInput(${slide.n})"
        onkeydown="SlideViewer.codeKeydown(event, ${slide.n})">${escHtml(buffer)}</textarea>
      <div class="sv__code-actions">
        <button class="sv__code-run" id="sv-code-run-${slide.n}" onclick="SlideViewer.runCode(${slide.n})">&#9654; Run tests</button>
        <button class="sv__code-reset" onclick="SlideViewer.resetCode(${slide.n})">Reset</button>
        ${c.solution ? `<button class="sv__code-sol-btn" onclick="SlideViewer.toggleCodeSolution(${slide.n})">Show solution</button>` : ''}
        <span class="sv__code-status" id="sv-code-status-${slide.n}"></span>
      </div>
      <details class="local-code-tests"><summary>Source test cases</summary><pre><code>${escHtml(JSON.stringify(c.artifact || {}, null, 2))}</code></pre></details>
      <div class="sv__code-results" id="sv-code-results-${slide.n}">${st.results ? renderCodeResults(st.results, st.pass) : ''}</div>
      ${c.solution ? `<div class="sv__code-sol" id="sv-code-sol-${slide.n}" style="display:none"><pre><code>${escHtml(c.solution)}</code></pre></div>` : ''}
    </div>`;
    // Warm the runtime in the background (async; safe during render).
    setTimeout(function () { try { warmCodeRunner(slide); } catch (e) {} }, 0);
    return html;
  }

  function renderCodeResults(results, pass) {
    if (!results || !results.length) return '';
    const rows = results.map(r => {
      const got = r.error ? escHtml(String(r.error).slice(0, 200))
        : (r.pass ? '' : `got <code>${escHtml(JSON.stringify(r.got)).slice(0, 120)}</code>, expected <code>${escHtml(JSON.stringify(r.expected)).slice(0, 120)}</code>`);
      return `<div class="sv__code-test sv__code-test--${r.pass ? 'ok' : 'no'}">
        <span class="sv__code-test-mark">${r.pass ? '&#10003;' : '&#10007;'}</span>
        <span class="sv__code-test-name">${escHtml(r.name || 'test')}</span>
        ${got ? `<span class="sv__code-test-detail">${got}</span>` : ''}
      </div>`;
    }).join('');
    const banner = pass
      ? '<div class="sv__code-banner sv__code-banner--ok">All tests passed!</div>'
      : '<div class="sv__code-banner sv__code-banner--no">Not yet: check the failing tests above, tweak, and re-run.</div>';
    return rows + banner;
  }

  function codeStatus(n, msg, cls) {
    if (n == null) return;
    const el = document.getElementById('sv-code-status-' + n);
    if (el) { el.textContent = msg; el.className = 'sv__code-status' + (cls ? ' sv__code-status--' + cls : ''); }
  }

  function clearCodeRun() {
    if (codeRunTimer) { clearTimeout(codeRunTimer); codeRunTimer = null; }
    const st = codeStates[activeCodeSlide];
    if (st) st.running = false;
    const btn = activeCodeSlide != null && document.getElementById('sv-code-run-' + activeCodeSlide);
    if (btn) btn.disabled = false;
  }

  function onCodeWorkerMsg(ev) {
    const d = ev.data || {};
    const n = activeCodeSlide;
    if (d.type === 'warm') return;
    if (n == null) return;
    if (d.type === 'loading') { codeStatus(n, 'Loading Python runtime (one-time, ~10s)…', 'busy'); return; }
    if (d.type === 'ready') { codeStatus(n, 'Running…', 'busy'); return; }
    if (d.type === 'error') {
      codeStatus(n, String(d.error || 'Error').slice(0, 160), 'err');
      clearCodeRun();
      return;
    }
    if (d.type === 'done') {
      const st = codeStates[n] = codeStates[n] || {};
      st.results = d.results || [];
      st.pass = !!d.overallPass;
      st.runs = (st.runs || 0) + 1;
      // Follow-through tracking: which exercises get attempted, runs-to-green,
      // where people stall. Fire-and-forget; never blocks the runner UI.
      try {
        ; /* Original analytics removed for local preview. */
      } catch (e) { /* analytics must never break the runner */ }
      const box = document.getElementById('sv-code-results-' + n);
      if (box) box.innerHTML = renderCodeResults(st.results, st.pass);
      if (st.pass) {
        codeStatus(n, 'All tests passed!', 'ok');
        awardXp(n); // same dedup as quizzes: XP only on first pass
        const hint = document.querySelector(`.sv__code[data-slide="${n}"] .sv__code-hint`);
        if (hint) hint.innerHTML = '&#10003; solved';
      } else {
        codeStatus(n, 'Some tests failed.', 'err');
      }
      clearCodeRun();
    }
  }

  function runCode(n) {
    const slide = slides.find(s => s.n === n);
    if (!slide || !slide.code) return;
    const st = codeStates[n] = codeStates[n] || {};
    if (st.running) return;
    const ed = document.getElementById('sv-code-ed-' + n);
    const code = ed ? ed.value : (st.buffer || slide.code.starter || '');
    st.buffer = code; localStorage.setItem('qvl-code-'+data.id+'-'+n,code);
    st.running = true;
    activeCodeSlide = n;
    const btn = document.getElementById('sv-code-run-' + n);
    if (btn) btn.disabled = true;
    codeStatus(n, 'Preparing…', 'busy');
    const art = Object.assign({ judge: 'exact' }, slide.code.artifact, { language: slide.code.language || 'python' });
    (art.tests || []).forEach(t => { if (t.hidden === undefined) t.hidden = false; });
    try {
      getCodeWorker().postMessage({
        code: code,
        mode: 'test',
        language: art.language,
        artifactJson: JSON.stringify(art),
        sample: false,
      });
    } catch (e) {
      codeStatus(n, 'Could not start the runner.', 'err');
      clearCodeRun();
      return;
    }
    // Watchdog: a hung run (infinite loop) should not brick the lesson.
    codeRunTimer = setTimeout(function () {
      codeStatus(n, 'Timed out (30s), likely an infinite loop. Fix and re-run.', 'err');
      try { codeWorker.terminate(); } catch (e) {}
      codeWorker = null; codeWorkerWarm = false;
      clearCodeRun();
    }, 30000);
  }

  function onCodeInput(n) {
    const ed = document.getElementById('sv-code-ed-' + n);
    if (!ed) return;
    (codeStates[n] = codeStates[n] || {}).buffer = ed.value;
  }

  function codeKeydown(e, n) {
    if (e.key === 'Tab') {
      e.preventDefault();
      const ed = e.target;
      const s = ed.selectionStart, epos = ed.selectionEnd;
      ed.value = ed.value.slice(0, s) + '    ' + ed.value.slice(epos);
      ed.selectionStart = ed.selectionEnd = s + 4;
      onCodeInput(n);
    } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
      e.preventDefault();
      runCode(n);
    }
  }

  function resetCode(n) {
    const slide = slides.find(s => s.n === n);
    if (!slide || !slide.code) return;
    const st = codeStates[n] = codeStates[n] || {};
    st.buffer = slide.code.starter || '';
    st.results = null; st.pass = false;
    const ed = document.getElementById('sv-code-ed-' + n);
    if (ed) ed.value = st.buffer;
    const box = document.getElementById('sv-code-results-' + n);
    if (box) box.innerHTML = '';
    codeStatus(n, '', '');
  }

  function toggleCodeSolution(n) {
    const el = document.getElementById('sv-code-sol-' + n);
    if (el) el.style.display = el.style.display === 'none' ? '' : 'none';
  }

  /* ============================================
     XP SYSTEM
     ============================================ */
  function awardXp(slideNum) {
    // Per-quiz dedup so re-answering a quiz can't farm the accuracy bonus.
    const key = `sv-xp-${data.id}-${slideNum}`;
    if (localStorage.getItem(key)) return;
    localStorage.setItem(key, '1');
    xp += 5; streak += 1; // xp = this lesson's quiz XP; banked at completion
    updateXpDisplay();
    showXpFloat();
    // If this correct answer is on the final slide (a quiz-last lesson), bank now
    // so its XP is included in the completion card. (No-op if already banked.)
    if (current === slides.length - 1) bankLessonXp();
  }

  function resetStreak() {
    streak = 0; // combo only; the real account streak is untouched until completion
  }

  function updateXpDisplay() {
    // Lesson XP chip — reveal once earned, increment with a subtle bump.
    const xpEl = document.getElementById('sv-xp');
    const valEl = document.getElementById('sv-xp-val');
    if (valEl) valEl.textContent = xp;
    if (xpEl) {
      if (xp >= 1) {
        xpEl.style.display = '';
        xpEl.classList.add('sv__xp--pulse');
        setTimeout(() => xpEl.classList.remove('sv__xp--pulse'), 700);
      } else { xpEl.style.display = 'none'; }
    }
    // Level chip — the REAL account level (integrates the profile into the lesson).
    const lvlEl = document.getElementById('sv-hud-lvl');
    const lv = acctLevel();
    if (lvlEl) { if (lv >= 1) { lvlEl.style.display = ''; lvlEl.textContent = 'Lv ' + lv; } else { lvlEl.style.display = 'none'; } }
    // Streak chip — the REAL account streak (shown from a 2-day streak).
    const stEl = document.getElementById('sv-streak');
    const s = acctStreak();
    if (stEl) { if (s >= 2) { stEl.style.display = ''; stEl.innerHTML = FLAME_SVG + s; } else { stEl.style.display = 'none'; } }
    // Collapse the whole HUD container when nothing shows (signed out) so it
    // doesn't leave a dead gap before the flag.
    const hud = document.querySelector('.sv__hud');
    if (hud) hud.style.display = (lv >= 1 || xp >= 1 || s >= 2) ? '' : 'none';
  }

  // ---- Bank this lesson's XP into the real profile (LocalProfile) at completion ----
  function promptSignIn() { window.LocalProgress.toast("Progress is saved only in this browser."); }

  function _reducedMotion() {
    try { return window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches; }
    catch (e) { return false; }
  }

  // Animated number count-up. Robust: a timeout guarantees the final value even
  // if requestAnimationFrame is throttled (background/hidden tab).
  function countUp(el, to, dur) {
    if (!el) return;
    to = Math.round(to || 0);
    if (_reducedMotion()) { el.textContent = to; return; }
    const now0 = (window.performance && performance.now) ? performance.now() : Date.now();
    function frame() {
      const t = Math.min(1, (((window.performance && performance.now) ? performance.now() : Date.now()) - now0) / dur);
      const eased = 1 - Math.pow(1 - t, 3);
      el.textContent = Math.round(eased * to);
      if (t < 1) requestAnimationFrame(frame);
    }
    requestAnimationFrame(frame);
    setTimeout(function () { el.textContent = to; }, dur + 80);
  }

  function renderCtaResult(result) {
    const host = document.getElementById('sv-reward');
    if (!host) return;

    // Signed out (markComplete returns undefined when not logged in).
    if (!result || result.signedOut) {
      const teaser = xp > 0 ? `You earned <b>${xp} XP</b> this lesson. ` : '';
      host.innerHTML = `<div class="sv__reward-signin">${teaser}<a href="#" onclick="SlideViewer.promptSignIn();return false;">Sign in</a> to save your XP and streak.</div>`;
      return;
    }
    if (result.error) { host.innerHTML = '<div class="sv__reward-signin">Great work!</div>'; return; }
    if (result.alreadyEarned) {
      host.innerHTML = `<div class="sv__reward-signin">Already completed${result.streak > 0 ? ` &middot; ${result.streak}-day streak` : ''}</div>`;
      return;
    }

    // ---- The win: animated XP count-up + level bar + streak ----
    const bonusLine = result.bonus > 0
      ? `<span class="sv__xpwin-break">+${result.base} lesson &middot; +${result.bonus} accuracy</span>`
      : `<span class="sv__xpwin-break">lesson complete</span>`;
    const metaParts = [];
    if (result.leveledUp) metaParts.push(`Reached level ${result.level}`);
    if (result.streak > 0) metaParts.push(`${result.streak}-day streak`);
    const metaLine = metaParts.length
      ? `<div class="sv__reward-meta">${metaParts.join(' &middot; ')}</div>` : '';

    host.innerHTML =
      `<div class="sv__xpwin">
         <div class="sv__xpwin-amt">+<span id="sv-xpcount">0</span> XP</div>
         ${bonusLine}
       </div>
       <div class="sv__lvl">
         <div class="sv__lvl-row"><span>Level ${result.level}</span><span>${result.levelXp} / ${result.nextLevelXp} XP</span></div>
         <div class="sv__lvl-bar"><div class="sv__lvl-fill" id="sv-lvlfill"></div></div>
       </div>
       ${metaLine}`;

    countUp(document.getElementById('sv-xpcount'), result.total, 850);
    // Fill the level bar from 0 to the new percent on the next frame (CSS transition).
    const fill = document.getElementById('sv-lvlfill');
    if (fill) {
      const pct = Math.max(0, Math.min(100, result.levelPct || 0));
      if (_reducedMotion()) { fill.style.width = pct + '%'; }
      else {
        requestAnimationFrame(function () { setTimeout(function () { fill.style.width = pct + '%'; }, 120); });
        // Fallback: rAF doesn't fire in a hidden/background tab, so guarantee the
        // final width via a top-level timeout (the CSS transition still animates when visible).
        setTimeout(function () { fill.style.width = pct + '%'; }, 200);
      }
    }
  }

  async function bankLessonXp() {
    // Already banked this session (e.g. navigated back then forward to the last
    // slide) — re-apply the cached result. If the FIRST bank is still in flight
    // (bankResultCache null), do NOT render null — that would flash the signed-out
    // "Sign in to save" card over a logged-in user until the await resolves.
    if (lessonBanked) { if (bankResultCache !== null) renderCtaResult(bankResultCache); return; }
    lessonBanked = true;
    // Signed out: stash this lesson's quiz bonus so sign-in migration can credit it.
    if (false) {
      const lid = (lectureMeta && lectureMeta.lectureId) || (data && data.id);
      try { if (lid) localStorage.setItem('sv-lesson-bonus-' + lid, String(xp)); } catch (e) {}
    }
    if (!(lectureMeta && typeof lectureMeta.onComplete === 'function')) return;
    let result;
    try { result = await Promise.resolve(lectureMeta.onComplete(xp)); } // xp = accuracy bonus
    catch (e) { result = { error: true }; }
    bankResultCache = result;
    renderCtaResult(result);
    // Refresh the streak pill in case completion just advanced the streak.
    updateXpDisplay();
  }

  // Correct / wrong chime for lesson quizzes — mirrors solveSound() in
  // js/problems.js (same Web Audio pattern, same mute key + shared context) so
  // answering a lesson question sounds identical to answering a solvable problem.
  function quizSound(ok) {
    try {
      if (localStorage.getItem('qv-solve-mute') === '1') return;
      const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return;
      const ctx = window._qvAudio || (window._qvAudio = new AC());
      if (ctx.state === 'suspended') ctx.resume();
      const t0 = ctx.currentTime;
      const note = (freq, start, dur, peak) => {
        const s = t0 + start, g = ctx.createGain();
        g.gain.setValueAtTime(0.0001, s);
        g.gain.exponentialRampToValueAtTime(peak, s + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, s + dur);
        g.connect(ctx.destination);
        [[freq, 1], [freq * 2, 0.28]].forEach(pair => {
          const o = ctx.createOscillator(), og = ctx.createGain();
          o.type = 'sine'; o.frequency.value = pair[0]; og.gain.value = pair[1];
          o.connect(og); og.connect(g); o.start(s); o.stop(s + dur + 0.03);
        });
      };
      if (ok) {
        // bright, cheerful rising chime: D5 -> A5 -> D6
        note(587.33, 0.00, 0.17, 0.20);
        note(880.00, 0.085, 0.17, 0.20);
        note(1174.66, 0.17, 0.34, 0.22);
      } else {
        // soft, gentle "aww": two low descending sine notes, NOT a harsh buzz
        note(329.63, 0.00, 0.24, 0.16);
        note(246.94, 0.14, 0.34, 0.16);
      }
    } catch (e) {}
  }

  function showXpFloat() {
    const quiz = document.querySelector('.sv__quiz');
    if (!quiz) return;
    const f = document.createElement('div');
    f.className = 'sv__xp-float';
    f.textContent = 'Correct';
    quiz.style.position = 'relative';
    quiz.appendChild(f);
    setTimeout(() => f.remove(), 1800);
  }

  /* ============================================
     REVEAL BLOCKS
     ============================================ */
  function buildRevealBlock(slideNum, revIdx, rev) {
    const id = `sv-reveal-${slideNum}-${revIdx}`;
    return `<div class="sv__reveal" id="${id}">
      <button class="sv__reveal-btn" onclick="SlideViewer.toggleReveal('${id}')">
        <span class="sv__reveal-arrow">▶</span>
        <span>${escHtml(rev.label || 'Click to reveal')}</span>
      </button>
      <div class="sv__reveal-content" style="display:none">${renderMarkdown(rev.content)}</div>
    </div>`;
  }

  function toggleReveal(id) {
    const block = document.getElementById(id);
    if (!block) return;
    const content = block.querySelector('.sv__reveal-content');
    const arrow = block.querySelector('.sv__reveal-arrow');
    if (!content) return;
    const show = content.style.display === 'none';
    content.style.display = show ? 'block' : 'none';
    if (arrow) arrow.textContent = show ? '▼' : '▶';
    block.classList.toggle('sv__reveal--open', show);
    if (show) runKatex(content);
  }

  /* ============================================
     UP NEXT CTA
     ============================================ */
  // Small dumbbell glyph for the practice CTA.
  const PRACTICE_ICON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6.5 6.5l11 11M21 21l-1-1M3 3l1 1M18 22l4-4M2 6l4-4M3 10l7-7M14 21l7-7"/></svg>';

  function buildUpNext() {
    const hasNext = lectureMeta && lectureMeta.nextUrl;
    const hasMap = lectureMeta && lectureMeta.mapUrl;
    const hasPractice = !!(lectureMeta && lectureMeta.practiceUrl && lectureMeta.practiceCount > 0);
    const purl = hasPractice ? escHtml(lectureMeta.practiceUrl) : '';
    const cnt = hasPractice ? lectureMeta.practiceCount : 0;
    const probWord = cnt === 1 ? 'problem' : 'problems';

    const nextBtn = hasNext ? `<button class="sv__cta-btn sv__cta-btn--primary" onclick="SlideViewer.handleComplete('next')">Next Lesson &rarr;</button>` : '';
    const mapBtn = `<button class="sv__cta-btn ${hasNext ? 'sv__cta-btn--secondary' : 'sv__cta-btn--primary'}" onclick="SlideViewer.handleComplete('map')">&larr; Back to Map</button>`;

    // Full-width practice banner below the action buttons — links to this
    // lesson's curated playlist (which renders + tracks in the dashboard UI).
    const practiceBanner = hasPractice
      ? `<a class="sv__practice-banner" href="${purl}" onclick="SlideViewer.trackPracticeClick('end_banner')">
           <span class="sv__practice-banner__icon">${PRACTICE_ICON}</span>
           <span class="sv__practice-banner__text">
             <span class="sv__practice-banner__title">Practice what you learned</span>
             <span class="sv__practice-banner__sub">${cnt} hand-picked ${probWord} for this lesson</span>
           </span>
           <span class="sv__practice-banner__go">&rarr;</span>
         </a>`
      : '';

    // End of a chapter: a timed check on the chapter's category (signed in -> mock.html, else the free sprint).
    const tc = lectureMeta && lectureMeta.timedCat;
    const signedIn = typeof LocalProfile !== 'undefined' && LocalProfile.isLoggedIn && LocalProfile.isLoggedIn();
    const timedBanner = tc
      ? `<a class="sv__practice-banner sv__practice-banner--timed" href="${signedIn ? 'mock.html?category=' + encodeURIComponent(tc) + '&n=5' : 'quant-interview-practice-test.html'}" data-track="timed_entry" data-track-surface="learn_chapter" data-track-cat="${escHtml(tc)}" onclick="SlideViewer.bankXp()">
           <span class="sv__practice-banner__icon"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><polyline points="12 7 12 12 15 14"/></svg></span>
           <span class="sv__practice-banner__text">
             <span class="sv__practice-banner__title">Timed check on this chapter</span>
             <span class="sv__practice-banner__sub">${signedIn ? '5 questions on this chapter\'s topic, one clock' : 'A free timed quant sprint, no login'}</span>
           </span>
           <span class="sv__practice-banner__go">&rarr;</span>
         </a>`
      : '';

    return `<div class="sv__cta sv__cta--celebrate">
      <div class="sv__cta-check"><svg viewBox="0 0 24 24" aria-hidden="true"><polyline points="20 6 9 17 4 12"/></svg></div>
      <div class="sv__cta-title">Lesson complete</div>
      <div class="sv__reward" id="sv-reward" aria-live="polite">
        <div class="sv__reward-loading">Saving your progress&hellip;</div>
      </div>
      <div class="sv__cta-buttons">${nextBtn}${mapBtn}</div>
      ${practiceBanner}
      ${timedBanner}
    </div>`;
  }

  function handleComplete(action) {
    ; /* Original analytics removed for local preview. */
    // XP is banked when the completion card renders (bankLessonXp). Ensure it
    // ran even if the card was skipped to (idempotent: lessonBanked + LocalProfile dedup).
    bankLessonXp();
    if (action === 'next' && lectureMeta && lectureMeta.nextUrl) {
      window.location.href = lectureMeta.nextUrl;
    } else if (lectureMeta && lectureMeta.mapUrl) {
      window.location.href = lectureMeta.mapUrl;
    } else {
      history.back();
    }
  }

  /* Practice-for-lesson click (persistent rail or end-of-lesson banner). */
  function trackPracticeClick() { bankLessonXp(); }

  /* In-slide interview-question card → opening the full problem. */
  function trackProblemClick() {}

  /* ============================================
     PROBLEM CARD
     ============================================ */
  function buildProblemCard(slide) {
    const pid = slide.problem_display_id || slide.problem_id;
    const href = `?problem=${pid}`;
    return `<div class="sv__problem-card">
      <div class="sv__problem-card__header">
        <span class="sv__problem-card__label"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" style="vertical-align:-2px;margin-right:4px" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>Interview Question</span>
        <a href="${href}" target="_blank" class="sv__problem-card__link" onclick="SlideViewer.trackProblemClick('${pid}')">Open Full Problem →</a>
      </div>
      <div class="sv__problem-card__body">
        <div class="sv__solution-gate" id="sv-gate-${slide.n}">
          <div class="sv__solution-gate__icon"><svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><path d="M9.1 9a3 3 0 0 1 5.8 1c0 2-3 3-3 3"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg></div>
          <div class="sv__solution-gate__text">Try solving this first</div>
          <button class="sv__solution-gate__btn" onclick="SlideViewer.revealAnswer(${slide.n})">Reveal Solution</button>
        </div>
        <div class="sv__problem-card__solution" id="sv-sol-${slide.n}" style="display:none">
          <div class="sv__problem-card__solution-content">Loading…</div>
        </div>
      </div>
    </div>`;
  }

  async function revealAnswer(slideNum) {
    const gate = document.getElementById('sv-gate-' + slideNum);
    const sol = document.getElementById('sv-sol-' + slideNum);
    if (!gate || !sol) return;
    gate.style.display = 'none'; sol.style.display = 'block';
    const slide = slides.find(s => s.n === slideNum);
    if (!slide) return;
    const solContent = sol.querySelector('.sv__problem-card__solution-content');
    if (slide.problem_id && typeof DataLoader !== 'undefined') {
      try {
        const problem = await DataLoader.problemById(slide.problem_id);
        if (problem && problem.solution) { solContent.innerHTML = renderMarkdown(problem.solution); runKatex(solContent); return; }
      } catch (e) { console.warn('Could not load solution', slide.problem_id); }
    }
    solContent.innerHTML = '<p><em>This solution has not been downloaded locally. No source-site request was made.</em></p>';
  }

  /* ---- Formula overlay ---- */
  function toggleFormulas() {
    const overlay = document.getElementById('sv-formulas');
    if (!overlay) return;
    formulaOverlayVisible = !formulaOverlayVisible;
    overlay.style.display = formulaOverlayVisible ? 'flex' : 'none';
    // Lock background scroll while the modal is open so the page doesn't scroll
    // behind it (and so the sticky close button stays put).
    try { document.body.style.overflow = formulaOverlayVisible ? 'hidden' : ''; } catch (e) {}
    if (formulaOverlayVisible) {
      const grid = document.getElementById('sv-formulas-grid'); if (grid) runKatex(grid);
      if (window.QGLearnEmbed) window.QGLearnEmbed.scrollToElement(overlay.querySelector('.sv__formulas-header') || overlay, { behavior: 'smooth', block: 'start' });
    }
  }

  // Close when the dark backdrop (not the panel) is clicked.
  function formulasBackdrop(e) { if (e && e.target === e.currentTarget) toggleFormulas(); }

  function buildFormulaCards() {
    if (!data || !data.formula_cards || !data.formula_cards.length) return '<div class="sv__formulas-empty">No formulas in this session.</div>';
    return data.formula_cards.map(fc => `<div class="sv__formula-card"><div class="sv__formula-card__name">${escHtml(fc.name)}</div><div class="sv__formula-card__formula">$$${escHtml(fc.formula)}$$</div></div>`).join('');
  }

  /* ---- TOC ---- */
  function toggleToc() {
    const toc = document.getElementById('sv-toc');
    if (!toc) return;
    tocVisible = !tocVisible;
    toc.classList.toggle('sv__toc--open', tocVisible);
    // REAL scrim element (not a cosmetic shadow): it intercepts taps so the
    // dimmed page can't be interacted with through the drawer (a tap there
    // once answered a one-shot quiz WRONG behind the TOC), and tapping it
    // dismisses the drawer — the universal modal gesture.
    let scrim = document.getElementById('sv-toc-scrim');
    if (tocVisible) {
      if (!scrim) {
        scrim = document.createElement('div');
        scrim.id = 'sv-toc-scrim';
        scrim.className = 'sv__toc-scrim';
        scrim.addEventListener('click', function (e) {
          e.preventDefault(); e.stopPropagation();
          if (tocVisible) toggleToc();
        });
        document.body.appendChild(scrim);
      }
      scrim.style.display = 'block';
      if (window.QGLearnEmbed) window.QGLearnEmbed.scrollToElement(toc.querySelector('.sv__toc-header') || toc, { behavior: 'smooth', block: 'nearest' });
    } else if (scrim) {
      scrim.style.display = 'none';
    }
  }

  /* ---- Keyboard ---- */
  function attachKeyboard() {
    document.removeEventListener('keydown', handleKeydown);
    document.addEventListener('keydown', handleKeydown);
  }

  function handleKeydown(e) {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) return;
    switch (e.key) {
      case 'ArrowRight': case 'ArrowDown': e.preventDefault(); nextSlide(); break;
      case 'ArrowLeft': case 'ArrowUp': e.preventDefault(); prevSlide(); break;
      case 'f': case 'F': e.preventDefault(); toggleFormulas(); break;
      case 't': case 'T': e.preventDefault(); toggleToc(); break;
      case 'Escape':
        if (formulaOverlayVisible) { e.preventDefault(); toggleFormulas(); }
        else if (tocVisible) { e.preventDefault(); toggleToc(); }
        break;
      case 'Home': e.preventDefault(); goToSlide(0); break;
      case 'End': e.preventDefault(); goToSlide(slides.length - 1); break;
    }
  }

  /* ============================================
     SWIPE / DRAG — touch + mouse
     ============================================ */
  // First-ever lesson on a phone: one gentle coach mark ("Swipe to turn the
  // page") + a small card peek so the gesture is self-evident — shown once,
  // dismissed by the first touch or after a few seconds.
  function maybeShowSwipeHint() {
    try {
      if (!window.matchMedia || !window.matchMedia('(max-width: 768px)').matches) return;
      if (!('ontouchstart' in window)) return;
      if (localStorage.getItem('qv-swipe-hint')) return;
      localStorage.setItem('qv-swipe-hint', '1');
      const root = targetEl && targetEl.querySelector('.sv');
      if (!root) return;
      const hint = document.createElement('div');
      hint.className = 'sv__swipe-hint';
      hint.setAttribute('aria-hidden', 'true');
      hint.innerHTML =
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"/></svg>' +
        '<span>Swipe to turn the page</span>' +
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"/></svg>';
      root.appendChild(hint);
      // Card peek: nudge the page sideways once so "it moves" is visible.
      const card = document.querySelector('#sv-content .sv__card');
      if (card) {
        card.style.transition = 'transform .45s ease';
        card.style.transform = 'translateX(-14px)';
        setTimeout(function () { card.style.transform = ''; }, 480);
        setTimeout(function () { card.style.transition = ''; }, 950);
      }
      const kill = function () {
        if (hint.parentNode) hint.parentNode.removeChild(hint);
        document.removeEventListener('touchstart', kill);
      };
      document.addEventListener('touchstart', kill, { once: true });
      setTimeout(kill, 3500);
    } catch (e) { /* cosmetic only */ }
  }

  function attachSwipe() {
    const el = document.getElementById('sv-content');
    if (!el) return;
    el.addEventListener('touchstart', swipeStart, { passive: true });
    el.addEventListener('touchmove', swipeMove, { passive: false });
    el.addEventListener('touchend', swipeEnd);
    el.addEventListener('mousedown', swipeStart);
  }

  function swipeX(e) { return e.touches ? e.touches[0].clientX : e.clientX; }
  function swipeY(e) { return e.touches ? e.touches[0].clientY : e.clientY; }

  function swipeStart(e) {
    const isTouch = !!e.touches;
    // Text entry / editors never start a swipe.
    if (e.target.closest('input, textarea, select, .CodeMirror, .sv__noswipe')) return;
    // MOUSE drags from interactive controls would break their clicks (we
    // preventDefault immediately) — keep the broad exclusion for mouse only.
    // TOUCH is safe to track from anywhere (incl. quiz option buttons): a tap
    // never crosses the 8px direction lock so the click still fires; a real
    // horizontal drag locks into a swipe and the click is suppressed. This is
    // what makes QUESTION slides page-turnable like every other slide.
    if (!isTouch && e.target.closest('button, a, .sv__quiz, .sv__reveal-btn, .sv__num-form')) return;
    // Don't hijack horizontally-scrollable content (wide tables, display
    // math, code blocks): let those pan natively.
    let n = e.target;
    while (n && n.nodeType === 1 && n.id !== 'sv-content') {
      if (n.scrollWidth > n.clientWidth + 2) {
        const ox = getComputedStyle(n).overflowX;
        if (ox === 'auto' || ox === 'scroll') return;
      }
      n = n.parentElement;
    }
    swipe.active = true;
    swipe.startX = swipeX(e);
    swipe.startY = swipeY(e);
    swipe.dx = 0;
    swipe.startTime = Date.now();
    swipe.locked = false;
    swipe.isH = false;
    if (!e.touches) {
      document.addEventListener('mousemove', swipeMove);
      document.addEventListener('mouseup', swipeEnd);
      e.preventDefault();
    }
    const card = document.querySelector('#sv-content .sv__card');
    if (card) { card.style.transition = 'none'; card.style.willChange = 'transform'; }
  }

  function swipeMove(e) {
    if (!swipe.active) return;
    const dx = swipeX(e) - swipe.startX;
    const dy = swipeY(e) - swipe.startY;

    if (!swipe.locked && (Math.abs(dx) > 8 || Math.abs(dy) > 8)) {
      swipe.locked = true;
      swipe.isH = Math.abs(dx) > Math.abs(dy);
      if (!swipe.isH) { swipe.active = false; return; }
    }
    if (!swipe.isH) return;
    if (e.cancelable) e.preventDefault();

    swipe.dx = dx;
    let tx = dx;
    // Rubber-band at edges
    if ((current === 0 && dx > 0) || (current === slides.length - 1 && dx < 0)) {
      tx = dx * 0.25;
    }
    const card = document.querySelector('#sv-content .sv__card');
    if (card) {
      const p = Math.min(Math.abs(tx) / 250, 1);
      card.style.transform = `translateX(${tx}px) scale(${1 - p * 0.03})`;
      card.style.opacity = 1 - p * 0.2;
    }
  }

  function swipeEnd() {
    if (!swipe.active && !swipe.locked) { cleanup(); return; }
    swipe.active = false;
    document.removeEventListener('mousemove', swipeMove);
    document.removeEventListener('mouseup', swipeEnd);

    const card = document.querySelector('#sv-content .sv__card');
    if (!card) return;

    const dx = swipe.dx;
    const vel = Math.abs(dx) / (Date.now() - swipe.startTime);
    const nav = swipe.isH && (Math.abs(dx) > SWIPE_THRESHOLD || vel > SWIPE_VELOCITY);

    if (nav && dx < 0 && current < slides.length - 1) {
      card.style.transition = 'transform .22s ease-out, opacity .22s ease-out';
      card.style.transform = 'translateX(-110%) scale(0.94)';
      card.style.opacity = '0';
      setTimeout(() => nextSlide(), 180);
    } else if (nav && dx > 0 && current > 0) {
      card.style.transition = 'transform .22s ease-out, opacity .22s ease-out';
      card.style.transform = 'translateX(110%) scale(0.94)';
      card.style.opacity = '0';
      setTimeout(() => prevSlide(), 180);
    } else {
      // Snap back with spring
      card.style.transition = 'transform .35s cubic-bezier(.25,.46,.45,.94), opacity .3s ease';
      card.style.transform = 'translateX(0) scale(1)';
      card.style.opacity = '1';
    }
    function cleanup() {
      document.removeEventListener('mousemove', swipeMove);
      document.removeEventListener('mouseup', swipeEnd);
    }
  }

  /* ---- Helpers ---- */
  function escHtml(s) { return s ? s.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;') : ''; }

  const CALLOUT_META = {
    insight:    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>', label: 'Key Insight',  cls: 'sv__callout--insight' },
    warning:    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>', label: 'Watch Out',    cls: 'sv__callout--warning' },
    definition: { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>', label: 'Definition',   cls: 'sv__callout--definition' },
    example:    { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>', label: 'Example',      cls: 'sv__callout--example' },
    interview:  { icon: '<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>', label: 'Interview Tip', cls: 'sv__callout--interview' },
  };

  function renderMarkdown(md) {
    if (!md) return '';
    if (typeof MarkdownRender !== 'undefined' && MarkdownRender.render) return MarkdownRender.render(md);

    // Parse :::proof Title ... ::: collapsible proof blocks FIRST (before other callouts)
    md = md.replace(/^:::proof\s*(.*)\n([\s\S]*?)^:::\s*$/gm, (_, title, body) => {
      const label = title.trim() || 'Proof';
      return `<details class="sv__proof"><summary class="sv__proof-summary"><span class="sv__proof-icon"><svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M3 21l9-18 9 18z"/><path d="M12 11v4"/></svg></span> ${label}</summary><div class="sv__proof-body">${body.trim()}</div></details>`;
    });

    // Parse :::type ... ::: callout blocks
    md = md.replace(/^:::(insight|warning|definition|example|interview)\s*\n([\s\S]*?)^:::\s*$/gm, (_, type, body) => {
      const m = CALLOUT_META[type] || CALLOUT_META.insight;
      return `<div class="sv__callout ${m.cls}"><div class="sv__callout-header">${m.icon} ${m.label}</div><div class="sv__callout-body">${body.trim()}</div></div>`;
    });

    // Parse markdown tables
    md = md.replace(/^(\|.+\|)\n(\|[\s:|-]+\|)\n((?:\|.+\|\n?)+)/gm, (_, header, sep, body) => {
      const hCells = header.split('|').filter(c => c.trim()).map(c => `<th>${c.trim()}</th>`).join('');
      const rows = body.trim().split('\n').map(row => {
        const cells = row.split('|').filter(c => c.trim()).map(c => `<td>${c.trim()}</td>`).join('');
        return `<tr>${cells}</tr>`;
      }).join('');
      return `<table class="sv__table"><thead><tr>${hCells}</tr></thead><tbody>${rows}</tbody></table>`;
    });

    return md
      .replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="data/$2" alt="$1" class="sv__slide-img" loading="lazy">')
      .replace(/^### (.+)$/gm, '<h4>$1</h4>')
      .replace(/^## (.+)$/gm, '<h3>$1</h3>')
      .replace(/^# (.+)$/gm, '<h2>$1</h2>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.+?)\*/g, '<em>$1</em>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      .replace(/^- (.+)$/gm, '<li>$1</li>')
      .replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>')
      .replace(/\n\n/g, '</p><p>')
      .replace(/\n/g, '<br>')
      .replace(/^/, '<p>').replace(/$/, '</p>')
      .replace(/<p>\s*<\/p>/g, '')
      .replace(/<p>\s*<(h[2-4]|ul|ol|table|div)/g, '<$1')
      .replace(/<\/(h[2-4]|ul|ol|table|div)>\s*<\/p>/g, '</$1>');
  }

  /* ---- Flag slide (dropdown) ---- */
  function flagSlide(e) {
    if (e) e.stopPropagation();
    const existing = document.querySelector('.flag-dropdown');
    if (existing) { existing.remove(); return; }

    const anchor = document.getElementById('sv-flag-anchor');
    if (!anchor) return;

    const sessionId = data ? data.id : 'unknown';
    const options = [
      { type: 'incorrect', icon: '✕', label: 'Content is incorrect' },
      { type: 'confusing', icon: '?', label: 'Explanation is confusing' },
      { type: 'typo', icon: '✎', label: 'Typo or formatting issue' },
    ];

    const dd = document.createElement('div');
    dd.className = 'flag-dropdown';
    dd.innerHTML = `
      <div class="flag-dropdown__header">Report slide issue</div>
      ${options.map(o => `
        <div class="flag-dropdown__option" data-type="${o.type}">
          <span style="width:16px;text-align:center;font-size:13px">${o.icon}</span> ${o.label}
        </div>
      `).join('')}
      <div class="flag-dropdown__option" data-type="other">
        <span style="width:16px;text-align:center;font-size:13px">…</span> Other
      </div>
      <div class="flag-dropdown__other-form">
        <textarea class="flag-dropdown__textarea" placeholder="Describe the issue..."></textarea>
        <button class="flag-dropdown__submit" onclick="SlideViewer.submitSlideFlag('other')">Submit</button>
      </div>
    `;
    document.body.appendChild(dd);
    const flagBtn = anchor.querySelector('button') || anchor;
    const btnRect = flagBtn.getBoundingClientRect();
    const z = parseFloat(getComputedStyle(document.documentElement).zoom) || 1;
    dd.style.top = ((btnRect.bottom + 4) / z) + 'px';
    dd.style.left = Math.max(8, (btnRect.right / z) - dd.offsetWidth) + 'px';

    dd.querySelectorAll('.flag-dropdown__option').forEach(opt => {
      opt.addEventListener('click', () => {
        const type = opt.dataset.type;
        if (type === 'other') {
          dd.querySelector('.flag-dropdown__other-form').classList.toggle('visible');
          return;
        }
        submitSlideFlag(type);
      });
    });

    setTimeout(() => {
      const closeHandler = (ev) => {
        if (!dd.contains(ev.target) && !anchor.contains(ev.target)) {
          dd.remove();
          document.removeEventListener('click', closeHandler, true);
        }
      };
      document.addEventListener('click', closeHandler, true);
    }, 0);
  }

  function submitSlideFlag(type) {
  const dd=document.querySelector('.flag-dropdown');
  const message=dd?.querySelector('textarea')?.value.trim() || '';
  if(type==='other' && !message){dd?.querySelector('textarea')?.focus();return;}
  window.LocalProgress.note({lessonId:lectureMeta?.lectureId || data.id,slide:current+1,type,message});
  dd?.remove(); window.LocalProgress.toast('Note saved in this browser. Nothing was sent to QuantVault.');
}

  /* ============================================
     GAMIFIED INTERACTIONS (2026-09, Finance & Markets track)
     Graded quiz types:
       match: { type:'match', pairs:[[left,right],...], explanation }
       order: { type:'order', items:[...in correct order], explanation }
       sort:  { type:'sort', buckets:[name,...], items:[{text,bucket},...], explanation }
     Display widgets:
       tiles:     { type:'tiles', items:[{icon,big,label,sub}], cols? }
       compare:   { type:'compare', left:{icon,title,points[]}, right:{...}, vs? }
       flipcards: { type:'flipcards', items:[{icon,front,back}] }
       steps:     { type:'steps', frames:[{label,md}] }
     Tap-first (works on phones); desktop also supports drag and drop.
     Item text supports **bold**, `code` and $math$ (KaTeX runs after render).
     ============================================ */
  const ixStates = {};   // slideN -> draft for match/order/sort before Check
  const flipStates = {}; // "slideN:wi" -> { idx: true }
  const stepStates = {}; // "slideN:wi" -> current frame index

  function ixInline(v) {
    // An escaped \$ is a literal currency dollar: isolate it in its own element
    // so KaTeX auto-render (which pairs $ within one text node) never sees a pair.
    const out = escHtml(String(v == null ? '' : v))
      .replace(/\\\$/g, '<span class="sv__cur">$</span>')
      .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
      .replace(/`([^`]+)`/g, '<code>$1</code>')
      // Links in widget text (tables, chips): same behaviour as slide body links, own lessons or https only.
      .replace(/\[([^\]]+)\]\(((?:learn\.html\?|https:\/\/)[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
    // One wrapper when markup was added: inside flex containers (chips, flow nodes) each text run and
    // element would otherwise become its own flex item ("Depositing $" | "1M of cash" in two columns).
    // Math ($...$) is rendered later by KaTeX into extra nodes: keep it in the same wrapper so the text and the formula
    // stay one inline run inside flex chips ("$s^2$ , the usual..." split into separate flex items, 2026-10-08).
    return out.indexOf('<') === -1 && out.indexOf('$') === -1 ? out : '<span class="sv__ixt">' + out + '</span>';
  }
  function ixHash(str) {
    let h = 2166136261;
    for (let i = 0; i < str.length; i++) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619); }
    return h >>> 0;
  }
  // Deterministic shuffle (stable across re-renders), never the identity for n > 1.
  function ixPerm(n, seedStr) {
    const a = Array.from({ length: n }, (_, i) => i);
    let x = ixHash(seedStr) || 1;
    const rnd = () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = a[i]; a[i] = a[j]; a[j] = t; }
    if (n > 1 && a.every((v, i) => v === i)) a.push(a.shift());
    return a;
  }
  function ixSlide(n) { return slides.find(s => s.n === n); }
  function ixRefresh() { suppressSlideScroll = true; goToSlide(current); }
  function ixDraft(n, init) { if (!ixStates[n]) ixStates[n] = init(); return ixStates[n]; }
  const IX_OK = '<span class="sv__ix-mark sv__ix-mark--ok">✓</span>';
  const IX_NO = '<span class="sv__ix-mark sv__ix-mark--no">✗</span>';
  function ixCheckBtn(n, ready, label) {
    return `<button class="sv__ix-check" ${ready ? '' : 'disabled'} onclick="SlideViewer.ixCheck(${n})">${label || 'Check'}</button>`;
  }
  function ixDragAttrs(n, kind, idx) {
    return `draggable="true" ondragstart="SlideViewer.ixDragStart(event,${n},'${kind}',${idx})"`;
  }
  function ixDropAttrs(n, kind, idx) {
    return `ondragover="event.preventDefault();this.classList.add('sv__ix-drop--over')" ondragleave="this.classList.remove('sv__ix-drop--over')" ondrop="SlideViewer.ixDrop(event,${n},'${kind}',${idx})"`;
  }

  /* ---- match: tap a left card, then its partner ---- */
  function buildMatch(slide, q, state, answered) {
    const n = slide.n, pairs = q.pairs || [], k = pairs.length;
    const perm = ixPerm(k, 'm' + n + pairs.map(p => p[1]).join('|'));
    let html = `<div class="sv__ix sv__ixm">`;
    if (answered) {
      const map = state.map || {};
      html += '<div class="sv__ixm-result">';
      pairs.forEach((p, i) => {
        const got = map[i], ok = got === i;
        html += `<div class="sv__ixm-row ${ok ? 'sv__ixm-row--ok' : 'sv__ixm-row--no'}">
          <span class="sv__ixm-l">${ixInline(p[0])}</span><span class="sv__ixm-arrow">→</span>
          <span class="sv__ixm-r">${ixInline(got !== undefined ? pairs[got][1] : '')}${ok ? '' : `<em class="sv__ix-fix">correct: ${ixInline(p[1])}</em>`}</span>${ok ? IX_OK : IX_NO}</div>`;
      });
      return html + '</div></div>';
    }
    const d = ixDraft(n, () => ({ sel: null, map: {} }));
    const usedBy = {}; Object.keys(d.map).forEach(l => { usedBy[d.map[l]] = +l; });
    html += `<div class="sv__ix-hint">Tap an item on the left, then its match on the right.</div><div class="sv__ixm-grid"><div class="sv__ixm-col">`;
    pairs.forEach((p, i) => {
      const paired = d.map[i] !== undefined;
      const cls = 'sv__ix-chip sv__ix-drop' + (d.sel === i ? ' sv__ix-chip--sel' : '') + (paired ? ` sv__ix-chip--c${(i % 6) + 1}` : '');
      html += `<button class="${cls}" onclick="SlideViewer.ixMatchLeft(${n},${i})" ${ixDropAttrs(n, 'mleft', i)}>${paired ? `<span class="sv__ix-badge">${i + 1}</span>` : ''}${ixInline(p[0])}</button>`;
    });
    html += `</div><div class="sv__ixm-col">`;
    perm.forEach(r => {
      const owner = usedBy[r];
      const cls = 'sv__ix-chip sv__ix-chip--right' + (owner !== undefined ? ` sv__ix-chip--c${(owner % 6) + 1}` : '');
      html += `<button class="${cls}" onclick="SlideViewer.ixMatchRight(${n},${r})" ${ixDragAttrs(n, 'mright', r)}>${owner !== undefined ? `<span class="sv__ix-badge">${owner + 1}</span>` : ''}${ixInline(pairs[r][1])}</button>`;
    });
    html += `</div></div>${ixCheckBtn(n, Object.keys(d.map).length === k)}</div>`;
    return html;
  }
  function ixMatchLeft(n, i) {
    if (quizStates[n] && quizStates[n].answered) return;
    const d = ixDraft(n, () => ({ sel: null, map: {} }));
    if (d.map[i] !== undefined) { delete d.map[i]; d.sel = i; }
    else d.sel = d.sel === i ? null : i;
    ixRefresh();
  }
  function ixMatchRight(n, r) {
    if (quizStates[n] && quizStates[n].answered) return;
    const d = ixDraft(n, () => ({ sel: null, map: {} }));
    const owner = Object.keys(d.map).find(l => d.map[l] === r);
    if (d.sel === null) { if (owner !== undefined) delete d.map[owner]; ixRefresh(); return; }
    if (owner !== undefined) delete d.map[owner];
    d.map[d.sel] = r; d.sel = null;
    ixRefresh();
  }

  /* ---- order: tap items in the right sequence ---- */
  function buildOrder(slide, q, state, answered) {
    const n = slide.n, items = q.items || [], k = items.length;
    let html = `<div class="sv__ix sv__ixo">`;
    if (answered) {
      const placed = state.placed || [];
      html += '<ol class="sv__ixo-result">';
      placed.forEach((orig, pos) => {
        const ok = orig === pos;
        html += `<li class="${ok ? 'sv__ixo-li--ok' : 'sv__ixo-li--no'}">${ixInline(items[orig])}${ok ? IX_OK : IX_NO}${ok ? '' : `<em class="sv__ix-fix">step ${pos + 1} is: ${ixInline(items[pos])}</em>`}</li>`;
      });
      return html + '</ol></div>';
    }
    const d = ixDraft(n, () => ({ placed: [] }));
    const perm = ixPerm(k, 'o' + n + items.join('|'));
    html += `<div class="sv__ix-hint">Tap the steps in order. Tap a placed step to send it back.</div>`;
    html += `<ol class="sv__ixo-line sv__ix-drop" ${ixDropAttrs(n, 'oline', 0)}>`;
    d.placed.forEach((orig, pos) => {
      html += `<li><button class="sv__ix-chip sv__ix-chip--placed" onclick="SlideViewer.ixOrderRemove(${n},${pos})"><span class="sv__ix-badge">${pos + 1}</span>${ixInline(items[orig])}</button></li>`;
    });
    for (let e = d.placed.length; e < k; e++) html += `<li class="sv__ixo-slot"><span>${e + 1}</span></li>`;
    html += `</ol><div class="sv__ix-bank">`;
    perm.forEach(orig => {
      if (d.placed.includes(orig)) return;
      html += `<button class="sv__ix-chip" onclick="SlideViewer.ixOrderAdd(${n},${orig})" ${ixDragAttrs(n, 'obank', orig)}>${ixInline(items[orig])}</button>`;
    });
    html += `</div>${ixCheckBtn(n, d.placed.length === k)}</div>`;
    return html;
  }
  function ixOrderAdd(n, orig) {
    if (quizStates[n] && quizStates[n].answered) return;
    const d = ixDraft(n, () => ({ placed: [] }));
    if (!d.placed.includes(orig)) d.placed.push(orig);
    ixRefresh();
  }
  function ixOrderRemove(n, pos) {
    if (quizStates[n] && quizStates[n].answered) return;
    const d = ixDraft(n, () => ({ placed: [] }));
    d.placed.splice(pos, 1);
    ixRefresh();
  }

  /* ---- sort: drop each chip into the right bucket ---- */
  function buildSort(slide, q, state, answered) {
    const n = slide.n, items = q.items || [], buckets = q.buckets || [];
    const d = answered ? { sel: null, where: state.where || {} } : ixDraft(n, () => ({ sel: null, where: {} }));
    const perm = ixPerm(items.length, 's' + n + items.map(it => it.text).join('|'));
    let html = `<div class="sv__ix sv__ixs">`;
    if (!answered) {
      html += `<div class="sv__ix-hint">Tap an item, then tap the box it belongs in. Tap a sorted item to move it back.</div><div class="sv__ix-bank">`;
      let left = 0;
      perm.forEach(i => {
        if (d.where[i] !== undefined) return;
        left++;
        html += `<button class="sv__ix-chip${d.sel === i ? ' sv__ix-chip--sel' : ''}" onclick="SlideViewer.ixSortItem(${n},${i})" ${ixDragAttrs(n, 'sitem', i)}>${ixInline(items[i].text)}</button>`;
      });
      if (!left) html += `<span class="sv__ix-empty">All sorted. Check your answer.</span>`;
      html += '</div>';
    }
    html += `<div class="sv__ixs-buckets" style="--nb:${buckets.length}">`;
    buckets.forEach((b, bi) => {
      html += `<div class="sv__ixs-bucket sv__ix-drop${!answered && d.sel !== null ? ' sv__ixs-bucket--ready' : ''}" ${answered ? '' : `onclick="SlideViewer.ixSortBucket(${n},${bi})" ${ixDropAttrs(n, 'sbucket', bi)}`}>
        <div class="sv__ixs-bucket-title">${ixInline(b)}</div><div class="sv__ixs-bucket-body">`;
      perm.forEach(i => {
        if (d.where[i] !== bi) return;
        if (answered) {
          const ok = ixBucketOf(q, items[i]) === bi;
          html += `<span class="sv__ix-chip sv__ix-chip--static ${ok ? 'sv__ix-chip--ok' : 'sv__ix-chip--no'}">${ixInline(items[i].text)}${ok ? IX_OK : IX_NO}${ok ? '' : `<em class="sv__ix-fix">belongs in: ${ixInline(buckets[ixBucketOf(q, items[i])])}</em>`}</span>`;
        } else {
          html += `<button class="sv__ix-chip sv__ix-chip--placed" onclick="event.stopPropagation();SlideViewer.ixSortItem(${n},${i})">${ixInline(items[i].text)}</button>`;
        }
      });
      html += '</div></div>';
    });
    html += '</div>';
    if (!answered) html += ixCheckBtn(n, Object.keys(d.where).length === items.length);
    return html + '</div>';
  }
  function ixSortItem(n, i) {
    if (quizStates[n] && quizStates[n].answered) return;
    const d = ixDraft(n, () => ({ sel: null, where: {} }));
    if (d.where[i] !== undefined) { delete d.where[i]; d.sel = null; }
    else d.sel = d.sel === i ? null : i;
    ixRefresh();
  }
  function ixSortBucket(n, bi) {
    if (quizStates[n] && quizStates[n].answered) return;
    const d = ixDraft(n, () => ({ sel: null, where: {} }));
    if (d.sel === null) return;
    d.where[d.sel] = bi; d.sel = null;
    ixRefresh();
  }

  /* ---- shared: grade, drag and drop ---- */
  // A sort item names its box by index or by the box's label ("Risk measurement"); 12 finance checks used labels and
  // were graded wrong whatever the student did (student-read audit 2026-10-07).
  function ixBucketOf(q, it) { const b = it.bucket; return typeof b === 'number' ? b : (q.buckets || []).indexOf(b); }
  function ixCheck(n) {
    const slide = ixSlide(n);
    if (!slide || !slide.quiz || (quizStates[n] && quizStates[n].answered)) return;
    const q = slide.quiz, d = ixStates[n] || {};
    let ok = false, extra = {};
    if (q.type === 'match') {
      if (Object.keys(d.map || {}).length !== q.pairs.length) return;
      ok = q.pairs.every((_, i) => d.map[i] === i); extra = { map: Object.assign({}, d.map) };
    } else if (q.type === 'order') {
      if ((d.placed || []).length !== q.items.length) return;
      ok = d.placed.every((orig, pos) => orig === pos); extra = { placed: d.placed.slice() };
    } else if (q.type === 'sort') {
      if (Object.keys(d.where || {}).length !== q.items.length) return;
      ok = q.items.every((it, i) => d.where[i] === ixBucketOf(q, it)); extra = { where: Object.assign({}, d.where) };
    }
    quizStates[n] = Object.assign({ answered: true, selected: null, correct: ok }, extra);
    window.LocalQuizProgress.save(data.id, slide, quizStates[n]);
    quizSound(ok);
    ; /* Original analytics removed for local preview. */
    if (ok) awardXp(n); else resetStreak();
    if (current === slides.length - 1) bankLessonXp();
    ixRefresh();
  }
  let ixDrag = null;
  function ixDragStart(ev, n, kind, idx) {
    ixDrag = { n, kind, idx };
    try { ev.dataTransfer.setData('text/plain', kind + ':' + idx); ev.dataTransfer.effectAllowed = 'move'; } catch (e) {}
  }
  function ixDrop(ev, n, target, tidx) {
    ev.preventDefault();
    const g = ixDrag; ixDrag = null;
    if (!g || g.n !== n) return;
    if (target === 'mleft' && g.kind === 'mright') {
      const d = ixDraft(n, () => ({ sel: null, map: {} })); d.sel = tidx; ixMatchRight(n, g.idx);
    } else if (target === 'oline' && g.kind === 'obank') {
      ixOrderAdd(n, g.idx);
    } else if (target === 'sbucket' && g.kind === 'sitem') {
      const d = ixDraft(n, () => ({ sel: null, where: {} })); d.sel = g.idx; ixSortBucket(n, tidx);
    }
  }

  /* ---- display widgets ---- */
  // Named palette -> real tokens (widgets never hard-code colors).
  const IX_COLORS = { blue: 'var(--accent)', purple: 'var(--tag-purple)', teal: 'var(--tag-teal)', gold: 'var(--accent-gold)',
    green: 'var(--accent-green)', red: 'var(--color-hard)', pink: 'var(--tag-pink)' };
  function ixColor(c) { return IX_COLORS[c] || IX_COLORS.blue; }
  // Lesson icons are names from js/slide-icons.js (the site uses no emoji in UI); unknown names render nothing.
  function svIcon(name) {
    return (name && typeof SlideIcons !== 'undefined' && SlideIcons.has(name)) ? SlideIcons.svg(name) : '';
  }
  // Five items look unbalanced as 4 + 1, so layout:'star' places them around a hub.
  function starHub(w) {
    const c = w.center || {};
    return `<div class="sv__star-hub">${svIcon(c.icon) ? `<span class="sv__star-hub-icon">${svIcon(c.icon)}</span>` : ''}<span>${ixInline(c.label || '')}</span></div>`;
  }
  function buildTiles(w) {
    const items = w.items || [];
    const star = w.layout === 'star' && items.length === 5;
    const cols = w.cols || Math.min(items.length, 4);
    let html = `<div class="sv__tiles${star ? ' sv__star' : ''}${w.anim ? ' sv__tiles--anim' : ''}${!star && items.length % 2 ? ' sv__tiles--odd' : ''}" style="--cols:${cols}">`;
    items.forEach((it, i) => {
      html += `<div class="sv__tile" style="--d:${(i * 0.09).toFixed(2)}s${it.color ? `;--c:${ixColor(it.color)}` : ''}${star ? `;grid-area:s${i + 1}` : ''}">${svIcon(it.icon) ? `<div class="sv__tile-icon">${svIcon(it.icon)}</div>` : ''}
        ${it.big ? `<div class="sv__tile-big">${ixInline(it.big)}</div>` : ''}
        ${it.label ? `<div class="sv__tile-label">${ixInline(it.label)}</div>` : ''}
        ${it.sub ? `<div class="sv__tile-sub">${ixInline(it.sub)}</div>` : ''}</div>`;
    });
    if (star) html += starHub(w);
    return html + '</div>';
  }
  function buildCompare(w) {
    const side = (p, cls) => `<div class="sv__cmp-card ${cls}">
      <div class="sv__cmp-head">${svIcon(p.icon) ? `<span class="sv__cmp-icon">${svIcon(p.icon)}</span>` : ''}<span>${ixInline(p.title)}</span></div>
      <ul class="sv__cmp-list">${(p.points || []).map(x => `<li>${ixInline(x)}</li>`).join('')}</ul></div>`;
    return `<div class="sv__cmp">${side(w.left || {}, 'sv__cmp-card--a')}<div class="sv__cmp-vs">${ixInline(w.vs || 'vs')}</div>${side(w.right || {}, 'sv__cmp-card--b')}</div>`;
  }
  function buildFlipcards(w, slideN, wi) {
    const id = `${slideN}:${wi}`, st = flipStates[id] || {};
    const star = w.layout === 'star' && (w.items || []).length === 5;
    let html = `<div class="sv__flips"><div class="sv__flips-hint">Tap a card to flip it</div><div class="sv__flips-grid${star ? ' sv__star' : ''}" data-flip="${id}">`;
    (w.items || []).forEach((it, i) => {
      html += `<button class="sv__flip${st[i] ? ' sv__flip--on' : ''}"${star ? ` style="grid-area:s${i + 1}"` : ''} onclick="SlideViewer.flipCard('${id}',${i})" aria-pressed="${!!st[i]}">
        <span class="sv__flip-inner"><span class="sv__flip-face sv__flip-front">${svIcon(it.icon) ? `<span class="sv__flip-icon">${svIcon(it.icon)}</span>` : ''}<span class="sv__flip-title">${ixInline(it.front)}</span></span>
        <span class="sv__flip-face sv__flip-back">${ixInline(it.back)}</span></span></button>`;
    });
    if (star) html += starHub(w); // appended last so card indices stay 0..4 for flipCard
    return html + '</div></div>';
  }
  function flipCard(id, i) {
    const st = flipStates[id] || (flipStates[id] = {});
    st[i] = !st[i];
    // Toggle in place (no re-render) so the CSS flip animates.
    const grid = document.querySelector(`[data-flip="${id}"]`);
    const card = grid && grid.children[i];
    if (card) { card.classList.toggle('sv__flip--on', !!st[i]); card.setAttribute('aria-pressed', String(!!st[i])); }
    else ixRefresh();
  }
  /* ---- HTML diagrams (no SVG): map, flow, bars, book ---- */
  // map: { type:'map', rows:['Cash','Derivatives'], cols:[{name, icon, color, cells:[[..],[..]]}] }
  function buildMap(w) {
    const rows = w.rows || [];
    let html = `<div class="sv__map" style="--n:${(w.cols || []).length}">`;
    (w.cols || []).forEach(c => {
      html += `<div class="sv__map-col" style="--c:${ixColor(c.color)}"><div class="sv__map-head">${svIcon(c.icon) ? `<span class="sv__map-icon">${svIcon(c.icon)}</span>` : ''}${ixInline(c.name)}</div>`;
      (c.cells || []).forEach((cell, ri) => {
        html += `<div class="sv__map-cell sv__map-cell--r${ri}"><div class="sv__map-row">${ixInline(rows[ri] || '')}</div>${(cell || []).map(x => `<div class="sv__map-item">${ixInline(x)}</div>`).join('')}</div>`;
      });
      html += '</div>';
    });
    html += '</div>';
    if (w.note) html += `<div class="sv__wnote">${ixInline(w.note)}</div>`;
    return html;
  }
  // flow: { type:'flow', items:[{icon,title,sub,color}], labels:[between-arrow text], loop:false, note }
  function buildFlow(w) {
    const items = w.items || [], labels = w.labels || [];
    let html = `<div class="sv__flow${w.anim ? ' sv__flow--anim' : ''}">`;
    items.forEach((it, i) => {
      html += `<div class="sv__flow-node" style="--c:${ixColor(it.color)}">${svIcon(it.icon) ? `<div class="sv__flow-icon">${svIcon(it.icon)}</div>` : ''}<div class="sv__flow-title">${ixInline(it.title)}</div>${it.sub ? `<div class="sv__flow-sub">${ixInline(it.sub)}</div>` : ''}</div>`;
      if (i < items.length - 1) html += `<div class="sv__flow-arrow"><span class="sv__flow-arrow-glyph"></span>${labels[i] ? `<span class="sv__flow-label">${ixInline(labels[i])}</span>` : ''}</div>`;
    });
    html += '</div>';
    if (w.note) html += `<div class="sv__wnote">${ixInline(w.note)}</div>`;
    return html;
  }
  // bars: { type:'bars', title, items:[{label, value, text, color}], max, vertical:false, anim }
  function buildBars(w) {
    const items = w.items || [];
    const max = w.max || Math.max(...items.map(it => Math.abs(it.value)), 1);
    const vert = !!w.vertical;
    let html = `<div class="sv__bars${vert ? ' sv__bars--v' : ''}${w.anim ? ' sv__bars--anim' : ''}">${w.title ? `<div class="sv__bars-title">${ixInline(w.title)}</div>` : ''}<div class="sv__bars-body">`;
    items.forEach((it, i) => {
      const pct = Math.max(2, Math.round(100 * Math.abs(it.value) / max));
      html += `<div class="sv__bar" style="--p:${pct}%;--c:${ixColor(it.color)};--d:${i * 0.08}s"><div class="sv__bar-label">${ixInline(it.label)}</div><div class="sv__bar-track"><div class="sv__bar-fill"></div></div><div class="sv__bar-val">${ixInline(it.text != null ? it.text : String(it.value))}</div></div>`;
    });
    html += '</div></div>';
    if (w.note) html += `<div class="sv__wnote">${ixInline(w.note)}</div>`;
    return html;
  }
  /* ---- chart: SVG line / area / scatter / step chart drawn at the container's real width ----
     { type:'chart', kind:'line'|'area'|'scatter'|'step', title, height,
       x:{label, min, max, ticks:[..], dp, prefix, suffix}, y:{...},
       series:[{name, color, points:[[x,y],...], dash, fill, marker}],
       vlines:[{x, label, color}], hlines:[{y, label, color}], marks:[{x, y, label, color}],
       bands:[{x0, x1, label, color}], anim, note } */
  const chartSpecs = {};
  function buildChart(w, slideN, wi) {
    const id = `ch-${slideN}-${wi}`;
    chartSpecs[id] = w;
    const legend = (w.series || []).filter(s => s.name).length > 1 || (w.series || []).some(s => s.name && w.legend)
      ? `<div class="sv__chart-legend">${(w.series || []).filter(s => s.name).map(s => `<span><i style="--c:${ixColor(s.color)}" class="${(s.kind || w.kind) === 'scatter' ? 'sv__chart-key--dot' : s.dash ? 'sv__chart-key--dash' : ''}"></i>${ixInline(s.name)}</span>`).join('')}</div>` : '';
    return `<figure class="sv__chartbox">${w.title ? `<figcaption class="sv__bars-title">${ixInline(w.title)}</figcaption>` : ''}${legend}<div class="sv__chart${w.anim ? ' sv__chart--anim' : ''}" data-chart="${id}" role="img" aria-label="${escHtml(svPlain(w.title || 'chart'))}"></div>${w.note ? `<div class="sv__wnote">${ixInline(w.note)}</div>` : ''}</figure>`;
  }
  function niceTicks(lo, hi, n) {
    if (!(hi > lo)) { hi = lo + 1; }
    const span = hi - lo, step0 = span / Math.max(1, n), mag = Math.pow(10, Math.floor(Math.log10(step0)));
    const step = [1, 2, 2.5, 5, 10].map(m => m * mag).find(st => st >= step0) || 10 * mag;
    const out = [];
    for (let v = Math.ceil(lo / step - 1e-9) * step; v <= hi + 1e-9; v += step) out.push(+v.toFixed(10));
    return out;
  }
  function fmtTick(v, ax) {
    const dp = ax.dp != null ? ax.dp : (Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : Math.abs(v) >= 10 ? 1 : 2);
    let t = Number(v).toFixed(dp);
    if (ax.comma) t = Number(t).toLocaleString('en-US', { minimumFractionDigits: dp, maximumFractionDigits: dp });
    // axis prefixes/suffixes are plain SVG text: drop the markdown currency escape (\$ -> $)
    const plain = v => String(v || '').replace(/\\\$/g, '$');
    // A negative value with a prefix reads -$20, not $-20.
    if (ax.prefix && t.charAt(0) === '-') return '-' + plain(ax.prefix) + t.slice(1) + plain(ax.suffix);
    return plain(ax.prefix) + t + plain(ax.suffix);
  }
  /* ---- table: { type:'table', title, columns:[..], rows:[[..]], highlightRow, highlightCol, firstColStrong:bool, align:['l','r',...], note } */
  function buildTable(w) {
    const cols = w.columns || [], al = w.align || [];
    const td = (v, j, th) => `<${th ? 'th' : 'td'} class="${al[j] === 'r' ? 'sv__tb-r' : al[j] === 'c' ? 'sv__tb-c' : ''}${w.highlightCol === j ? ' sv__tb-hc' : ''}">${ixInline(v == null ? '' : String(v))}</${th ? 'th' : 'td'}>`;
    let h = `<figure class="sv__tbbox">${w.title ? `<figcaption class="sv__bars-title">${ixInline(w.title)}</figcaption>` : ''}<div class="sv__tbwrap"><table class="sv__tb${w.firstColStrong !== false ? ' sv__tb--fc' : ''}">`;
    if (cols.length) h += `<thead><tr>${cols.map((c, j) => td(c, j, true)).join('')}</tr></thead>`;
    h += `<tbody>${(w.rows || []).map((r, i) => `<tr class="${w.highlightRow === i ? 'sv__tb-hr' : ''}">${r.map((v, j) => td(v, j, false)).join('')}</tr>`).join('')}</tbody></table></div>`;
    return h + (w.note ? `<div class="sv__wnote">${ixInline(w.note)}</div>` : '') + '</figure>';
  }
  /* ---- stackbar: { type:'stackbar', title, unit, bars:[{label, parts:[{name, value, color}]}], percent:bool, note } */
  function buildStackbar(w) {
    const bars = w.bars || [], names = [], colors = {};
    bars.forEach(b => (b.parts || []).forEach(p => { if (!names.includes(p.name)) { names.push(p.name); colors[p.name] = p.color || ['blue', 'purple', 'teal', 'gold', 'green', 'red', 'pink'][(names.length - 1) % 7]; } }));
    let h = `<figure class="sv__chartbox">${w.title ? `<figcaption class="sv__bars-title">${ixInline(w.title)}</figcaption>` : ''}`;
    h += `<div class="sv__chart-legend">${names.map(n => `<span><i style="--c:${ixColor(colors[n])}"></i>${ixInline(n)}</span>`).join('')}</div><div class="sv__sb">`;
    bars.forEach(b => {
      const tot = (b.parts || []).reduce((a, p) => a + Math.abs(p.value), 0) || 1;
      h += `<div class="sv__sb-row${b.label ? '' : ' sv__sb-row--nl'}">${b.label ? `<div class="sv__sb-label">${ixInline(b.label)}</div>` : ''}<div class="sv__sb-track">`;
      const small = []; // segments too thin for an inside label: listed under the bar so no value is hidden (2026-10-07)
      (b.parts || []).forEach(p => {
        const pct = 100 * Math.abs(p.value) / tot;
        const txt = w.percent ? `${pct.toFixed(0)}%` : (p.text != null ? p.text : String(p.value) + (w.unit || ''));
        if (pct < 13 && pct > 0) small.push(`<span><i style="--c:${ixColor(colors[p.name])}"></i>${ixInline(p.name)} ${ixInline(txt)}</span>`);
        h += `<div class="sv__sb-seg" style="flex:${pct.toFixed(3)};--c:${ixColor(colors[p.name])}" title="${escHtml(svPlain(p.name + ': ' + txt))}">${pct >= 13 ? `<span>${ixInline(txt)}</span>` : ''}</div>`;
      });
      h += `</div>${small.length ? `<div class="sv__sb-small">${small.join('')}</div>` : ''}</div>`;
    });
    return h + `</div>${w.note ? `<div class="sv__wnote">${ixInline(w.note)}</div>` : ''}</figure>`;
  }
  /* ---- diagrams: SVG drawn at the container's real width (same look as charts) ----
     tree:     { type:'tree', title, steps:N, nodes:[[label...] per step, top to bottom], sub:[[...]], edges:'recombining'|'binary',
                 highlight:[[step,i],...], xlabels:[...], note }
     timeline: { type:'timeline', title, ticks:[{t, label}], flows:[{t, amount, label, color, side:'in'|'out'}], unit, note }
     heatmap:  { type:'heatmap', title, rows:[..], cols:[..], values:[[..]], min, max, dp, diverging:bool, note } */
  const diagramSpecs = {};
  function buildDiagram(w, slideN, wi) {
    const id = `dg-${slideN}-${wi}`;
    diagramSpecs[id] = w;
    return `<figure class="sv__chartbox">${w.title ? `<figcaption class="sv__bars-title">${ixInline(w.title)}</figcaption>` : ''}<div class="sv__chart sv__diagram" data-diagram="${id}" role="img" aria-label="${escHtml(svPlain(w.title || w.type))}"></div>${w.note ? `<div class="sv__wnote">${ixInline(w.note)}</div>` : ''}</figure>`;
  }
  // SVG chart text is plain text, not markdown: drop the currency escape (\$ -> $) before escaping.
  function svgEsc(v) { return escHtml(String(v == null ? '' : v).replace(/\\\$/g, '$')); }
  function drawDiagrams(root) {
    (root || document).querySelectorAll('.sv__diagram[data-diagram]').forEach(el => {
      const w = diagramSpecs[el.getAttribute('data-diagram')];
      if (!w) return;
      const W = Math.max(260, Math.round(el.clientWidth || 600)), narrow = W < 480, fs = narrow ? 11 : 12;
      const T = (x, y, t, a, cls, extra) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${a || 'middle'}" class="${cls || 'sv__ch-tick'}" ${extra || ''}>${svgEsc(String(t))}</text>`;
      // centred label that would run past the left/right edge is pinned to that edge instead (bold labels are wider)
      const TC = (x, y, t, cls, extra, bold) => {
        const half = String(t).length * fs * (bold ? 0.33 : 0.29);
        const [tx, ta] = x + half > W - 2 ? [W - 2, 'end'] : x - half < 2 ? [2, 'start'] : [x, 'middle'];
        return T(tx, y, t, ta, cls, extra);
      };
      let g = '', H = 260, after = '';
      if (w.type === 'tree') {
        const nodes = w.nodes || [], n = nodes.length, maxRows = Math.max(...nodes.map(c => c.length));
        H = w.height || Math.max(210, Math.min(440, maxRows * (narrow ? 48 : 56) + 60));
        const hasSub = !!w.sub, mx = narrow ? 36 : 54, top = hasSub ? 26 : 18, bot = (hasSub ? 22 : 14) + (w.xlabels ? fs + 14 : 0);
        const colX = i => mx + i * (W - 2 * mx) / Math.max(1, n - 1);
        const ry = (i, j) => { const k = nodes[i].length; const span = (H - top - bot) * (maxRows > 1 ? (k - 1) / (maxRows - 1) : 0); return top + (H - top - bot) / 2 - span / 2 + (k > 1 ? j * span / (k - 1) : 0); };
        const hl = new Set((w.highlight || []).map(p => p.join(':')));
        for (let i = 0; i < n - 1; i++) nodes[i].forEach((_, j) => {
          const kids = (w.edges === 'binary') ? [2 * j, 2 * j + 1] : [j, j + 1];
          kids.forEach(c => { if (c < nodes[i + 1].length) g += `<line x1="${colX(i).toFixed(1)}" y1="${ry(i, j).toFixed(1)}" x2="${colX(i + 1).toFixed(1)}" y2="${ry(i + 1, c).toFixed(1)}" class="sv__dg-edge"/>`; });
        });
        nodes.forEach((col, i) => col.forEach((lab, j) => {
          const x = colX(i), y = ry(i, j), on = hl.has(i + ':' + j), sub = w.sub && w.sub[i] && w.sub[i][j];
          const bw = Math.max(46, String(lab).length * fs * 0.62 + 16), bh = sub != null ? fs * 2 + 12 : fs + 14;
          g += `<rect x="${(x - bw / 2).toFixed(1)}" y="${(y - bh / 2).toFixed(1)}" width="${bw.toFixed(1)}" height="${bh}" rx="8" class="sv__dg-node${on ? ' sv__dg-node--on' : ''}"/>`;
          g += T(x, y + (sub != null ? -2 : fs * 0.36), lab, 'middle', 'sv__dg-label');
          if (sub != null) g += T(x, y + fs + 2, sub, 'middle', 'sv__ch-tick');
        }));
        (w.xlabels || []).forEach((t, i) => { if (i < n) g += T(colX(i), H - 4, t, 'middle', 'sv__ch-label'); });
      } else if (w.type === 'timeline') {
        const ticks = w.ticks || [], flows = w.flows || [];
        const ts = ticks.map(t => t.t).concat(flows.map(f => f.t)), t0 = Math.min(...ts), t1 = Math.max(...ts);
        const amax = Math.max(1, ...flows.map(f => Math.abs(f.amount)));
        H = w.height || (narrow ? 230 : 260);
        const top = w.unit ? fs + 8 : 0;   // the unit sits in its own band so a tall end arrow's label cannot hit it
        const mx = narrow ? 26 : 40, axisY = top + (H - top - fs - 10) / 2, armax = axisY - top - 22;
        let flowNotes = '';
        const px = t => mx + (t - t0) / ((t1 - t0) || 1) * (W - 2 * mx);
        g += `<line x1="${mx - 10}" x2="${W - mx + 10}" y1="${axisY}" y2="${axisY}" class="sv__ch-axis"/>`;
        ticks.forEach(t => { g += `<line x1="${px(t.t).toFixed(1)}" x2="${px(t.t).toFixed(1)}" y1="${axisY - 4}" y2="${axisY + 4}" class="sv__ch-axis"/>` + T(px(t.t), H - 6, t.label != null ? t.label : t.t, 'middle', 'sv__ch-tick'); });
        flows.forEach(f => {
          const out = f.side ? f.side === 'out' : f.amount < 0, x = px(f.t), len = 14 + Math.abs(f.amount) / amax * (armax - 14);
          const y2 = out ? axisY + len : axisY - len, c = ixColor(f.color || (out ? 'red' : 'green'));
          g += `<line x1="${x.toFixed(1)}" y1="${axisY}" x2="${x.toFixed(1)}" y2="${y2.toFixed(1)}" class="sv__dg-flow" style="--c:${c}"/>`;
          g += `<path d="M${(x - 5).toFixed(1)},${(y2 + (out ? -7 : 7)).toFixed(1)} L${x.toFixed(1)},${y2.toFixed(1)} L${(x + 5).toFixed(1)},${(y2 + (out ? -7 : 7)).toFixed(1)}" class="sv__dg-flow" style="--c:${c}"/>`;
          flowNotes += TC(x, out ? y2 + fs + 4 : y2 - 6, f.label != null ? f.label : f.amount, 'sv__ch-note', `style="--c:${c}"`, true);
        });
        g += flowNotes;
        if (w.unit) g += T(W - mx, 14, w.unit, 'end', 'sv__ch-label');
      } else if (w.type === 'spectrum') {
        // { type:'spectrum', title, min, max, ticks:[..], unit, log:bool, items:[{at|from,to, label, sub, color, row}], note }
        const items = w.items || [], lo = w.min, hi = w.max, mx = narrow ? 18 : 30, lg = !!w.log;
        const f = v => lg ? Math.log(v) : v, px = v => mx + (f(v) - f(lo)) / ((f(hi) - f(lo)) || 1) * (W - 2 * mx);
        const nrow = Math.max(1, ...items.map(it => (it.row || 0) + 1)), rowH = narrow ? 44 : 50;
        H = w.height || 40 + nrow * rowH + 30;
        const axisY = H - 30;
        let spLabels = '';   // painted after every stem/band (with a halo) so a lower row's labels are not cut by an upper row's stem
        g += `<line x1="${mx}" x2="${W - mx}" y1="${axisY}" y2="${axisY}" class="sv__ch-axis"/>`;
        (w.ticks || []).forEach(t => { const v = typeof t === 'object' ? t.at : t, lab = typeof t === 'object' ? t.label : t; g += `<line x1="${px(v).toFixed(1)}" x2="${px(v).toFixed(1)}" y1="${axisY - 4}" y2="${axisY + 4}" class="sv__ch-axis"/>` + T(px(v), axisY + fs + 8, String(lab) + (w.unit && typeof t !== 'object' ? w.unit : ''), 'middle', 'sv__ch-tick'); });
        items.forEach(it => {
          const c = ixColor(it.color || 'blue'), y = axisY - 26 - (it.row || 0) * rowH;
          if (it.from != null) {
            const x1 = px(it.from), x2 = px(it.to);
            g += `<rect x="${x1.toFixed(1)}" y="${(y - 9).toFixed(1)}" width="${Math.max(4, x2 - x1).toFixed(1)}" height="18" rx="9" class="sv__sp-band" style="--c:${c}"/>`;
            spLabels += TC((x1 + x2) / 2, y - 14, it.label, 'sv__dg-label sv__halo', '', true) + (it.sub ? TC((x1 + x2) / 2, y + fs + 10, it.sub, 'sv__ch-tick sv__halo') : '');
          } else {
            const x = px(it.at);
            g += `<line x1="${x.toFixed(1)}" x2="${x.toFixed(1)}" y1="${y.toFixed(1)}" y2="${axisY}" class="sv__ch-ref" style="--c:${c}"/><circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" class="sv__ch-mark" style="--c:${c}"/>`;
            spLabels += TC(x, y - 12, it.label, 'sv__dg-label sv__halo', '', true) + (it.sub ? TC(x, y - 12 - fs - 2, it.sub, 'sv__ch-tick sv__halo') : '');
          }
        });
        g += spLabels;
      } else if (w.type === 'quadrant') {
        // { type:'quadrant', title, x:{label, low, high}, y:{label, low, high}, quadrants:[TL,TR,BL,BR], items:[{x:0..1, y:0..1, label, color}], note }
        const X = w.x || {}, Y = w.y || {}, items = w.items || [];
        H = w.height || (narrow ? 300 : 340);
        const ml = narrow ? 26 : 34, mb = narrow ? 30 : 34, mt = 10, mr = 10, iw = W - ml - mr, ih = H - mt - mb;
        const qx = v => ml + v * iw, qy = v => mt + (1 - v) * ih;
        g += `<rect x="${ml}" y="${mt}" width="${iw}" height="${ih}" rx="12" class="sv__qd-bg"/>`;
        g += `<line x1="${ml + iw / 2}" x2="${ml + iw / 2}" y1="${mt}" y2="${mt + ih}" class="sv__ch-grid"/><line x1="${ml}" x2="${ml + iw}" y1="${mt + ih / 2}" y2="${mt + ih / 2}" class="sv__ch-grid"/>`;
        (w.quadrants || []).forEach((q, k) => { if (!q) return; const cx = ml + (k % 2 ? 0.75 : 0.25) * iw, cy = mt + (k < 2 ? 0.08 : 0.58) * ih + fs; g += T(cx, cy, q, 'middle', 'sv__qd-q'); });
        // Inline labels when every one fits beside its dot; otherwise (phones, long labels) numbered dots + a key below.
        const tw = it => String(it.label || '').length * fs * 0.58;
        const fitsR = it => qx(it.x) + 10 + tw(it) <= ml + iw - 4, fitsL = it => qx(it.x) - 10 - tw(it) >= ml + 4;
        const numbered = narrow || items.some(it => !fitsR(it) && !fitsL(it));
        items.forEach((it, k) => {
          const c = ixColor(it.color || 'blue'), x = qx(it.x), y = qy(it.y);
          if (numbered) {
            g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="10" style="fill:${c}"/>` + T(x, y + fs * 0.36, k + 1, 'middle', 'sv__qd-num');
          } else {
            g += `<circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="6" style="fill:${c}"/>`;
            g += fitsR(it) ? T(x + 10, y + fs * 0.35, it.label, 'start', 'sv__dg-label') : T(x - 10, y + fs * 0.35, it.label, 'end', 'sv__dg-label');
          }
        });
        if (numbered) after = `<ol class="sv__qd-key">${items.map(it => `<li><i style="--c:${ixColor(it.color || 'blue')}"></i>${ixInline(String(it.label || ''))}</li>`).join('')}</ol>`;
        if (X.label) g += T(ml + iw / 2, H - 6, X.label, 'middle', 'sv__ch-label');
        if (X.low) g += T(ml + 4, H - 6, X.low, 'start', 'sv__ch-tick');
        if (X.high) g += T(ml + iw - 4, H - 6, X.high, 'end', 'sv__ch-tick');
        if (Y.label) g += `<text transform="translate(${fs},${(mt + ih / 2).toFixed(1)}) rotate(-90)" text-anchor="middle" class="sv__ch-label">${svgEsc(Y.label)}</text>`;
        if (Y.high) g += `<text transform="translate(${fs},${(mt + 6).toFixed(1)}) rotate(-90)" text-anchor="end" class="sv__ch-tick">${svgEsc(Y.high)}</text>`;
        if (Y.low) g += `<text transform="translate(${fs},${(mt + ih).toFixed(1)}) rotate(-90)" text-anchor="start" class="sv__ch-tick">${svgEsc(Y.low)}</text>`;
      } else if (w.type === 'heatmap') {
        const rows = w.rows || [], cols = w.cols || [], V = w.values || [];
        const flat = V.flat().filter(v => typeof v === 'number');
        const lo = w.min != null ? w.min : Math.min(...flat), hi = w.max != null ? w.max : Math.max(...flat);
        const lw = Math.max(...rows.map(r => String(r).length)) * fs * 0.6 + 10, th = Math.max(...cols.map(c => String(c).length)) > 6 && narrow ? fs * 3 : fs + 12;
        const cw = (W - lw - 6) / Math.max(1, cols.length), ch = Math.max(narrow ? 24 : 30, Math.min(44, cw * 0.7));
        H = th + rows.length * ch + 6;
        const dp = w.dp != null ? w.dp : 2;
        cols.forEach((c, j) => { g += T(lw + (j + 0.5) * cw, th - 6, c, 'middle', 'sv__ch-label'); });
        rows.forEach((r, i) => {
          g += T(lw - 6, th + (i + 0.5) * ch + fs * 0.35, r, 'end', 'sv__ch-label');
          cols.forEach((_, j) => {
            const v = (V[i] || [])[j];
            if (typeof v !== 'number') return;
            let a, col;
            if (w.diverging) { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; a = Math.abs(v) / m; col = v >= 0 ? 'var(--accent)' : 'var(--color-hard)'; }
            else { a = (v - lo) / ((hi - lo) || 1); col = 'var(--accent)'; }
            g += `<rect x="${(lw + j * cw + 1).toFixed(1)}" y="${(th + i * ch + 1).toFixed(1)}" width="${(cw - 2).toFixed(1)}" height="${(ch - 2).toFixed(1)}" rx="5" style="fill:${col};fill-opacity:${(0.08 + 0.72 * a).toFixed(3)}"/>`;
            g += T(lw + (j + 0.5) * cw, th + (i + 0.5) * ch + fs * 0.35, Number(v).toFixed(dp), 'middle', a > 0.72 ? 'sv__dg-cell sv__dg-cell--on' : 'sv__dg-cell');
          });
        });
      }
      el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-size:${fs}px">${g}</svg>${after}`;
    });
  }
  function drawCharts(root) {
    drawDiagrams(root);
    (root || document).querySelectorAll('.sv__chart[data-chart]').forEach(el => {
      const w = chartSpecs[el.getAttribute('data-chart')];
      if (w) drawChartEl(el, w);
    });
  }
  // One chart into one element (explore and predict redraw a single chart in place as the student interacts).
  function drawChartEl(el, w) {
    {
      const W = Math.max(260, Math.round(el.clientWidth || 600));
      const narrow = W < 480;
      const H = w.height || (narrow ? 230 : 290);
      const fs = narrow ? 11 : 12;
      const X = w.x || {}, Y = w.y || {};
      const all = (w.series || []).flatMap(s => s.points || []);
      const xs = all.map(p => p[0]).concat((w.vlines || []).map(v => v.x)), ys = all.map(p => p[1]).concat((w.hlines || []).map(h => h.y));
      let x0 = X.min != null ? X.min : Math.min(...xs), x1 = X.max != null ? X.max : Math.max(...xs);
      let y0 = Y.min != null ? Y.min : Math.min(...ys), y1 = Y.max != null ? Y.max : Math.max(...ys);
      if (Y.min == null && Y.max == null) { const pad = (y1 - y0 || 1) * 0.08; y0 -= pad; y1 += pad; }
      const xt = X.ticks || niceTicks(x0, x1, narrow ? 4 : 6), yt = Y.ticks || niceTicks(y0, y1, 5);
      if (X.min == null) x0 = Math.min(x0, xt[0]); if (X.max == null) x1 = Math.max(x1, xt[xt.length - 1]);
      if (Y.min == null) y0 = Math.min(y0, yt[0]); if (Y.max == null) y1 = Math.max(y1, yt[yt.length - 1]);
      const ylabW = Math.max(...yt.map(v => fmtTick(v, Y).length)) * fs * 0.62 + 10;
      const m = { l: Math.round(ylabW + (Y.label ? fs + 6 : 0)), r: 14, t: 12, b: Math.round(fs * 2 + (X.label ? fs + 8 : 4)) };
      const px = v => m.l + (v - x0) / (x1 - x0 || 1) * (W - m.l - m.r);
      const py = v => H - m.b - (v - y0) / (y1 - y0 || 1) * (H - m.t - m.b);
      const T = (x, y, t, a, extra) => `<text x="${x.toFixed(1)}" y="${y.toFixed(1)}" text-anchor="${a || 'middle'}" ${extra || ''}>${svgEsc(t)}</text>`;
      let g = '';
      // Annotation labels (band/ref-line/mark notes) are collected here and painted LAST, over the series, with a
      // halo (.sv__ch-note paint-order stroke) so a curve crossing a label no longer runs through its glyphs.
      let notes = '';
      const noteW = t => String(t).length * fs * 0.6;
      // anchor a note at x on its preferred side, flipping when it would run past the chart edge
      const noteX = (x, gap, preferEnd, t) => {
        const w0 = noteW(t);
        let end = preferEnd;
        if (!end && x + gap + w0 > W - 2 && x - gap - w0 >= 2) end = true;
        else if (end && x - gap - w0 < 2 && x + gap + w0 <= W - 2) end = false;
        return end ? [x - gap, 'end'] : [x + gap, 'start'];
      };
      (w.bands || []).forEach(b => {
        g += `<rect x="${px(b.x0).toFixed(1)}" y="${m.t}" width="${Math.max(0, px(b.x1) - px(b.x0)).toFixed(1)}" height="${H - m.t - m.b}" class="sv__ch-band" style="--c:${ixColor(b.color || 'gold')}"/>`;
        if (b.label) notes += T((px(b.x0) + px(b.x1)) / 2, m.t + fs + 2, b.label, 'middle', 'class="sv__ch-note"');
      });
      yt.forEach(v => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${py(v).toFixed(1)}" y2="${py(v).toFixed(1)}" class="sv__ch-grid"/>` + T(m.l - 6, py(v) + fs * 0.35, fmtTick(v, Y), 'end', 'class="sv__ch-tick"'); });
      xt.forEach(v => {
        // Keep the first and last tick labels inside the chart (long labels like 500,000 used to clip).
        const lab = fmtTick(v, X), half = lab.length * fs * 0.31, xx = px(v);
        const [tx, ta] = xx + half > W - 2 ? [W - 2, 'end'] : xx - half < 2 ? [2, 'start'] : [xx, 'middle'];
        g += T(tx, H - m.b + fs + 6, lab, ta, 'class="sv__ch-tick"'); g += `<line x1="${px(v).toFixed(1)}" x2="${px(v).toFixed(1)}" y1="${H - m.b}" y2="${H - m.b + 4}" class="sv__ch-axis"/>`; });
      g += `<line x1="${m.l}" x2="${W - m.r}" y1="${H - m.b}" y2="${H - m.b}" class="sv__ch-axis"/>`;
      if (y0 < 0 && y1 > 0) g += `<line x1="${m.l}" x2="${W - m.r}" y1="${py(0).toFixed(1)}" y2="${py(0).toFixed(1)}" class="sv__ch-zero"/>`;
      if (X.label) g += T((m.l + W - m.r) / 2, H - 6, X.label, 'middle', 'class="sv__ch-label"');
      if (Y.label) g += `<text transform="translate(${fs},${((m.t + H - m.b) / 2).toFixed(1)}) rotate(-90)" text-anchor="middle" class="sv__ch-label">${svgEsc(Y.label)}</text>`;
      (w.hlines || []).forEach(h => { g += `<line x1="${m.l}" x2="${W - m.r}" y1="${py(h.y).toFixed(1)}" y2="${py(h.y).toFixed(1)}" class="sv__ch-ref" style="--c:${ixColor(h.color || 'gold')}"/>` ; if (h.label) notes += T(W - m.r - 4, py(h.y) - 5, h.label, 'end', `class="sv__ch-note" style="--c:${ixColor(h.color || 'gold')}"`); });
      (w.vlines || []).forEach(v => { const vr = v.side === 'left' || (v.side !== 'right' && px(v.x) > W * 0.72); g += `<line x1="${px(v.x).toFixed(1)}" x2="${px(v.x).toFixed(1)}" y1="${m.t}" y2="${H - m.b}" class="sv__ch-ref" style="--c:${ixColor(v.color || 'gold')}"/>` ; if (v.label) { const [vx, va] = v.side ? [px(v.x) + (vr ? -4 : 4), vr ? 'end' : 'start'] : noteX(px(v.x), 4, vr, v.label); notes += T(vx, m.t + fs + (v.row || 0) * (fs + 4), v.label, va, `class="sv__ch-note" style="--c:${ixColor(v.color || 'gold')}"`); } });
      // Series are clipped to the plot area (explore sliders can push a curve past a fixed y range).
      const clip = 'svclip' + (++chartClipN);
      g += `<clipPath id="${clip}"><rect x="${m.l}" y="${m.t - 2}" width="${W - m.l - m.r}" height="${H - m.t - m.b + 4}"/></clipPath><g clip-path="url(#${clip})">`;
      (w.series || []).forEach((s, si) => {
        const c = ixColor(s.color || ['blue', 'purple', 'teal', 'gold', 'green', 'red'][si % 6]);
        const pts = (s.points || []).filter(p => p[0] >= x0 && p[0] <= x1);
        if (!pts.length) return;
        const kind = s.kind || w.kind || 'line';
        if (kind === 'scatter') { pts.forEach(p => { g += `<circle cx="${px(p[0]).toFixed(1)}" cy="${py(p[1]).toFixed(1)}" r="${narrow ? 2.6 : 3.2}" class="sv__ch-dot" style="--c:${c}"/>`; }); return; }
        let d = '';
        pts.forEach((p, i) => {
          if (kind === 'step' && i) d += `H${px(p[0]).toFixed(1)}V${py(p[1]).toFixed(1)}`;
          else d += `${i ? 'L' : 'M'}${px(p[0]).toFixed(1)},${py(p[1]).toFixed(1)}`;
        });
        if (kind === 'area' || s.fill) {
          const base = py(y0 < 0 && y1 > 0 ? 0 : y0);
          g += `<path d="${d}L${px(pts[pts.length - 1][0]).toFixed(1)},${base.toFixed(1)}L${px(pts[0][0]).toFixed(1)},${base.toFixed(1)}Z" class="sv__ch-area" style="--c:${c}"/>`;
        }
        g += `<path d="${d}"${(w.anim && !s.dash) || s.grow ? ' pathLength="1"' : ''} class="sv__ch-line${s.dash ? ' sv__ch-line--dash' : ''}${s.grow ? ' sv__ch-line--grow' : ''}${s.faint ? ' sv__ch-line--faint' : ''}" style="--c:${c};--i:${si}"/>`;
        if (s.marker) pts.forEach(p => { g += `<circle cx="${px(p[0]).toFixed(1)}" cy="${py(p[1]).toFixed(1)}" r="3" class="sv__ch-dot" style="--c:${c}"/>`; });
      });
      g += '</g>';
      (w.marks || []).forEach(mk => {
        const c = ixColor(mk.color || 'red'), cx = px(mk.x), cy = py(mk.y), left = cx > W * 0.7;
        g += `<circle cx="${cx.toFixed(1)}" cy="${cy.toFixed(1)}" r="4.5" class="sv__ch-mark" style="--c:${c}"/>`;
        if (mk.label) { const [mx, ma] = noteX(cx, 8, left, mk.label), below = mk.below || cy - 8 - fs < 2; notes += T(mx, cy + (below ? fs + 6 : -8), mk.label, ma, `class="sv__ch-note" style="--c:${c}"`); }
      });
      g += notes;
      el.innerHTML = `<svg width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" style="font-size:${fs}px">${g}</svg>`;
      el.__sc = { top: m.t, bot: H - m.b, y0, y1 }; // plot scale, used by the predict drag handle
      (w.series || []).forEach(s => { if (s.grow) s.grow = false; }); // a reveal animates once; resize redraws show the full line
    }
  }
  let chartClipN = 0;
  let chartResizeT = null;
  if (typeof window !== 'undefined') window.addEventListener('resize', () => { clearTimeout(chartResizeT); chartResizeT = setTimeout(() => drawCharts(document), 150); });

  // book: { type:'book', title, asks:[[price,size],...] (highest first), bids:[[price,size],...], note }
  function buildBook(w) {
    const all = (w.asks || []).concat(w.bids || []);
    const max = Math.max(...all.map(r => r[1]), 1);
    const row = (r, side) => `<div class="sv__book-row sv__book-row--${side}"><span class="sv__book-px">${ixInline(r[0])}</span><span class="sv__book-bar" style="--p:${Math.round(100 * r[1] / max)}%"><span>${Number(r[1]).toLocaleString('en-US')}</span></span></div>`;
    let html = `<div class="sv__book">${w.title ? `<div class="sv__bars-title">${ixInline(w.title)}</div>` : ''}<div class="sv__book-head"><span>Price</span><span>Size</span></div>`;
    (w.asks || []).forEach(r => html += row(r, 'ask'));
    html += '<div class="sv__book-mid"></div>';
    (w.bids || []).forEach(r => html += row(r, 'bid'));
    html += '</div>';
    if (w.note) html += `<div class="sv__wnote">${ixInline(w.note)}</div>`;
    return html;
  }
  function buildSteps(w, slideN, wi) {
    const id = `${slideN}:${wi}`, frames = w.frames || [];
    const k = Math.max(0, Math.min(stepStates[id] || 0, frames.length - 1));
    const f = frames[k] || {};
    let html = `<div class="sv__steps"><div class="sv__steps-bar">`;
    frames.forEach((fr, i) => {
      html += `<button class="sv__steps-dot${i === k ? ' sv__steps-dot--on' : ''}${i < k ? ' sv__steps-dot--done' : ''}" onclick="SlideViewer.stepGo('${id}',${i})" aria-label="Step ${i + 1}"><span>${i + 1}</span>${svIcon(fr.icon) ? `<i class="sv__steps-ico">${svIcon(fr.icon)}</i>` : ''}<em>${ixInline(fr.label || '')}</em></button>`;
    });
    html += `</div><div class="sv__steps-frame" key="${k}">${f.md ? renderMarkdown(f.md) : ''}${f.widgets ? buildWidgets(f.widgets, slideN) : ''}${f.md_after ? renderMarkdown(f.md_after) : ''}</div><div class="sv__steps-nav">
      <button class="sv__steps-btn" ${k === 0 ? 'disabled' : ''} onclick="SlideViewer.stepGo('${id}',${k - 1})">← Back</button>
      <span class="sv__steps-count">${k + 1} / ${frames.length}</span>
      <button class="sv__steps-btn sv__steps-btn--next" ${k === frames.length - 1 ? 'disabled' : ''} onclick="SlideViewer.stepGo('${id}',${k + 1})">Next →</button></div></div>`;
    return html;
  }
  function stepGo(id, k) { stepStates[id] = k; ixRefresh(); }

  /* ============================================
     INTERACTIVE TEACHING WIDGETS (Oct 2026): explore, mmgame, predict, poll.
     State is keyed "slideN:wi" and lives for the page, like flip and step state, so it survives slide navigation.
     None of them is a graded check: they never touch quizStates, XP or the lesson rhythm.
     ============================================ */
  const exploreStates = {}, mmStates = {}, predictStates = {}, pollStates = {};
  const SV_PALETTE = ['blue', 'purple', 'teal', 'gold', 'green', 'red', 'pink'];
  function svPlain(v) { return String(v == null ? '' : v).replace(/\\\$/g, '$'); }
  function svNum(v, dp, prefix, suffix) {
    if (typeof v !== 'number' || !isFinite(v)) return 'n/a';
    const d = dp != null ? dp : (Math.abs(v) >= 100 ? 0 : Math.abs(v) >= 10 ? 1 : 2);
    const t = Math.abs(v).toLocaleString('en-US', { minimumFractionDigits: d, maximumFractionDigits: d });
    return (v < 0 && /[1-9]/.test(t) ? '-' : '') + svPlain(prefix) + t + svPlain(suffix);
  }
  // HTML version: a literal $ sits in its own element so KaTeX auto-render never pairs two of them.
  function svNumHtml(v, dp, prefix, suffix) { return escHtml(svNum(v, dp, prefix, suffix)).replace(/\$/g, '<span class="sv__cur">$</span>'); }
  function svRng(seedStr) {
    let x = ixHash(seedStr) || 1;
    return () => { x ^= x << 13; x >>>= 0; x ^= x >>> 17; x ^= x << 5; x >>>= 0; return x / 4294967296; };
  }

  /* ---- math helpers for the explore models ---- */
  const SQ2PI = Math.sqrt(2 * Math.PI);
  function nPdf(x) { return Math.exp(-x * x / 2) / SQ2PI; }
  function nCdf(x) { // Abramowitz and Stegun 26.2.17, error below 1e-7
    const t = 1 / (1 + 0.2316419 * Math.abs(x));
    const c = 1 - nPdf(x) * t * (0.319381530 + t * (-0.356563782 + t * (1.781477937 + t * (-1.821255978 + t * 1.330274429))));
    return x >= 0 ? c : 1 - c;
  }
  function nInv(p) { // Acklam's rational approximation of the inverse normal CDF
    if (!(p > 0)) return -Infinity; if (!(p < 1)) return Infinity;
    const a = [-39.69683028665376, 220.9460984245205, -275.9285104469687, 138.3577518672690, -30.66479806614716, 2.506628277459239];
    const b = [-54.47609879822406, 161.5858368580409, -155.6989798598866, 66.80131188771972, -13.28068155288572];
    const c = [-0.007784894002430293, -0.3223964580411365, -2.400758277161838, -2.549732539343734, 4.374664141464968, 2.938163982698783];
    const d = [0.007784695709041462, 0.3224671290700398, 2.445134137142996, 3.754408661907416];
    const tail = q => (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
    if (p < 0.02425) return tail(Math.sqrt(-2 * Math.log(p)));
    if (p > 1 - 0.02425) return -tail(Math.sqrt(-2 * Math.log(1 - p)));
    const q = p - 0.5, r = q * q;
    return (((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
  }
  // Black-Scholes with a continuous dividend yield. vol, r, q as decimals, T in years.
  // vega is per 1 vol point, theta per calendar day.
  function bsAll(S, K, T, vol, r, q) {
    if (!(T > 1e-9) || !(vol > 1e-9) || !(S > 0) || !(K > 0)) {
      return { call: Math.max(S - K, 0), put: Math.max(K - S, 0), call_delta: S > K ? 1 : 0, put_delta: S < K ? -1 : 0, gamma: 0, vega: 0, call_theta: 0, put_theta: 0 };
    }
    const df = Math.exp(-r * T), dq = Math.exp(-q * T), sT = vol * Math.sqrt(T);
    const d1 = (Math.log(S / K) + (r - q + vol * vol / 2) * T) / sT, d2 = d1 - sT;
    const N1 = nCdf(d1), N2 = nCdf(d2), n1 = nPdf(d1), decay = -S * dq * n1 * vol / (2 * Math.sqrt(T));
    return {
      call: S * dq * N1 - K * df * N2, put: K * df * (1 - N2) - S * dq * (1 - N1),
      call_delta: dq * N1, put_delta: dq * (N1 - 1), gamma: dq * n1 / (S * sT), vega: S * dq * n1 * Math.sqrt(T) / 100,
      call_theta: (decay - r * K * df * N2 + q * S * dq * N1) / 365, put_theta: (decay + r * K * df * (1 - N2) - q * S * dq * (1 - N1)) / 365,
    };
  }
  function bsP(p, S, T) { return bsAll(S != null ? S : p.S, p.K, T != null ? T : p.T, p.vol / 100, p.r / 100, p.q / 100); }
  // Bond priced per 100 face (face overridable), annual coupon and yield in percent, freq payments a year.
  function bondCalc(p) {
    const f = Math.max(1, Math.round(p.freq)), n = Math.max(1, Math.round(p.maturity * f)), cpn = p.face * p.coupon / 100 / f, i = p.yield / 100 / f;
    let P = 0, D = 0, C = 0;
    for (let k = 1; k <= n; k++) { const pv = (cpn + (k === n ? p.face : 0)) / Math.pow(1 + i, k); P += pv; D += pv * k / f; C += pv * k * (k + 1) / (f * f); }
    const mac = D / P, mod = mac / (1 + i);
    return { price: P, mac, mod, dv01: mod * P / 10000, convexity: C / P / Math.pow(1 + i, 2) };
  }
  // payoff legs: { type:'call'|'put'|'stock', qty, K (number or a param id), premium (optional number or param id) }
  function legNum(v, p) { return typeof v === 'string' ? p[v] : v; }
  function legVal(l, p, S, T) {
    if (l.type === 'stock') return S;
    const o = bsAll(S, legNum(l.K, p), T, p.vol / 100, p.r / 100, p.q / 100);
    return l.type === 'put' ? o.put : o.call;
  }
  // Unpaid premium = Black-Scholes value at the STARTING spot and time (strike and vol as currently set).
  function legPrem(l, p, init) { return l.premium != null ? legNum(l.premium, p) : legVal(l, p, init.S, init.T); }
  function legGreek(l, p, g) {
    if (l.type === 'stock') return g === 'delta' ? 1 : 0;
    const o = bsAll(p.S, legNum(l.K, p), p.T, p.vol / 100, p.r / 100, p.q / 100);
    if (g === 'delta') return l.type === 'put' ? o.put_delta : o.call_delta;
    if (g === 'theta') return l.type === 'put' ? o.put_theta : o.call_theta;
    return o[g];
  }
  function legsSum(c, fn) { return (c.w.legs || []).reduce((a, l) => a + (l.qty != null ? l.qty : 1) * fn(l), 0); }
  function payoffScan(p, c) { // expiry P&L across the chart range: max gain, max loss, breakevens
    const n = 400, lo = c.xmin, hi = c.xmax, ys = [];
    for (let i = 0; i <= n; i++) { const S = lo + (hi - lo) * i / n; ys.push([S, legsSum(c, l => legVal(l, p, S, 0) - legPrem(l, p, c.init))]); }
    const be = [];
    for (let i = 1; i < ys.length; i++) {
      const [x0, y0] = ys[i - 1], [x1, y1] = ys[i];
      if (y0 === 0) be.push(x0); else if (y0 * y1 < 0) be.push(x0 + (x1 - x0) * y0 / (y0 - y1));
    }
    return { max: Math.max(...ys.map(v => v[1])), min: Math.min(...ys.map(v => v[1])), be };
  }

  /* ---- explore model registry. Pure functions only: author strings are names, never evaluated.
     params: default value, REQ (must be a slider or in "fixed") or OPT (optional, no default).
     curves(p, x, ctx) and outputs(p, ctx): p = all params (with the x param swept), ctx = {cur, init, w, xmin, xmax, xp}.
     Keep scripts/finance/lint_lessons.py EXPLORE_MODELS in sync. ---- */
  const REQ = { req: 1 }, OPT = { opt: 1 };
  const EXPLORE_MODELS = {
    bond_price: {
      params: { coupon: REQ, maturity: REQ, yield: REQ, freq: 2, face: 100 },
      curves: {
        price: p => bondCalc(p).price,
        tangent: (p, x, c) => { const b = bondCalc(c.cur); return b.price * (1 - b.mod * (p.yield - c.cur.yield) / 100); },
      },
      outputs: { price: p => bondCalc(p).price, mac_duration: p => bondCalc(p).mac, mod_duration: p => bondCalc(p).mod,
        dv01: p => bondCalc(p).dv01, convexity: p => bondCalc(p).convexity },
    },
    bs: {
      params: { S: REQ, K: REQ, T: REQ, vol: REQ, r: 0, q: 0 },
      curves: {
        call: p => bsP(p).call, put: p => bsP(p).put, call_delta: p => bsP(p).call_delta, put_delta: p => bsP(p).put_delta,
        gamma: p => bsP(p).gamma, vega: p => bsP(p).vega, call_theta: p => bsP(p).call_theta, put_theta: p => bsP(p).put_theta,
        call_intrinsic: p => Math.max(p.S - p.K, 0), put_intrinsic: p => Math.max(p.K - p.S, 0),
      },
      outputs: {
        call: p => bsP(p).call, put: p => bsP(p).put, call_delta: p => bsP(p).call_delta, put_delta: p => bsP(p).put_delta,
        gamma: p => bsP(p).gamma, vega: p => bsP(p).vega, call_theta: p => bsP(p).call_theta, put_theta: p => bsP(p).put_theta,
        call_time_value: p => bsP(p).call - Math.max(p.S - p.K, 0), put_time_value: p => bsP(p).put - Math.max(p.K - p.S, 0),
      },
    },
    payoff: {
      params: { S: REQ, T: 0.25, vol: 20, r: 0, q: 0 },
      legs: true,
      curves: {
        expiry: (p, x, c) => legsSum(c, l => legVal(l, p, p.S, 0) - legPrem(l, p, c.init)),
        now: (p, x, c) => legsSum(c, l => legVal(l, p, p.S, p.T) - legPrem(l, p, c.init)),
        payoff: (p, x, c) => legsSum(c, l => legVal(l, p, p.S, 0)),
      },
      outputs: {
        cost: (p, c) => legsSum(c, l => legPrem(l, p, c.init)),
        value: (p, c) => legsSum(c, l => legVal(l, p, p.S, p.T)),
        pnl_now: (p, c) => legsSum(c, l => legVal(l, p, p.S, p.T) - legPrem(l, p, c.init)),
        pnl_expiry: (p, c) => legsSum(c, l => legVal(l, p, p.S, 0) - legPrem(l, p, c.init)),
        delta: (p, c) => legsSum(c, l => legGreek(l, p, 'delta')), gamma: (p, c) => legsSum(c, l => legGreek(l, p, 'gamma')),
        vega: (p, c) => legsSum(c, l => legGreek(l, p, 'vega')), theta: (p, c) => legsSum(c, l => legGreek(l, p, 'theta')),
        max_gain: (p, c) => payoffScan(p, c).max, max_loss: (p, c) => payoffScan(p, c).min,
        breakeven_low: (p, c) => { const b = payoffScan(p, c).be; return b.length ? b[0] : NaN; },
        breakeven_high: (p, c) => { const b = payoffScan(p, c).be; return b.length ? b[b.length - 1] : NaN; },
      },
    },
    hedge_residual: {
      params: { rho: REQ, vol: 100, hvol: OPT },
      curves: {
        residual_pct: p => 100 * Math.sqrt(Math.max(0, 1 - p.rho * p.rho)),
        removed_pct: p => 100 - 100 * Math.sqrt(Math.max(0, 1 - p.rho * p.rho)),
        residual_vol: p => p.vol * Math.sqrt(Math.max(0, 1 - p.rho * p.rho)),
        variance_left_pct: p => 100 * Math.max(0, 1 - p.rho * p.rho),
      },
      outputs: {
        residual_pct: p => 100 * Math.sqrt(Math.max(0, 1 - p.rho * p.rho)),
        removed_pct: p => 100 - 100 * Math.sqrt(Math.max(0, 1 - p.rho * p.rho)),
        residual_vol: p => p.vol * Math.sqrt(Math.max(0, 1 - p.rho * p.rho)),
        hedge_ratio: p => p.rho * p.vol / (p.hvol != null ? p.hvol : p.vol),
        r2_pct: p => 100 * p.rho * p.rho,
      },
    },
    normal_var: {
      // P&L ~ Normal(mu * days, sigma * sqrt(days)); conf in percent. VaR and CVaR are reported as positive losses.
      params: { sigma: REQ, conf: REQ, mu: 0, days: 1 },
      axis: 'pnl',
      curves: {
        density: (p, x) => { const s = p.sigma * Math.sqrt(p.days), m = p.mu * p.days; return Math.exp(-0.5 * Math.pow((x - m) / s, 2)); },
        tail: (p, x) => { const s = p.sigma * Math.sqrt(p.days), m = p.mu * p.days; return x <= -nvVar(p) ? Math.exp(-0.5 * Math.pow((x - m) / s, 2)) : null; },
        var: p => nvVar(p), cvar: p => nvCvar(p),
      },
      outputs: { var: p => nvVar(p), cvar: p => nvCvar(p), z: p => nInv(p.conf / 100), mean: p => p.mu * p.days, vol: p => p.sigma * Math.sqrt(p.days) },
      extras: (p, c) => c.xp === 'pnl' ? { vlines: [{ x: -nvVar(p), label: 'VaR', color: 'red' }, { x: -nvCvar(p), label: 'CVaR', color: 'purple', side: 'left' }] } : {},
    },
    carry: {
      // Forward from spot and the cost of carry: r = financing rate, q = income or foreign rate, c = storage cost, all percent a year.
      params: { S: REQ, r: REQ, T: REQ, q: 0, c: 0 },
      curves: { forward: (p, x, ctx) => carryF(p, ctx.w), spot: p => p.S },
      outputs: { forward: (p, c) => carryF(p, c.w), basis: (p, c) => carryF(p, c.w) - p.S, basis_pct: (p, c) => 100 * (carryF(p, c.w) / p.S - 1), carry_pct: p => p.r + p.c - p.q },
    },
    sqrt_impact: {
      // impact (bps) = k * daily vol (bps) * sqrt(Q / ADV); total adds the half spread; cost in currency needs a price P.
      params: { Q: REQ, ADV: REQ, sigma: REQ, k: 1, P: 1, spread: 0 },
      curves: {
        impact_bps: p => sqImp(p), total_bps: p => sqImp(p) + p.spread, cost: p => p.Q * p.P * (sqImp(p) + p.spread) / 10000,
        linear_bps: (p, x, c) => sqImp(c.cur) * p.Q / c.cur.Q,
      },
      outputs: { impact_bps: p => sqImp(p), total_bps: p => sqImp(p) + p.spread, cost: p => p.Q * p.P * (sqImp(p) + p.spread) / 10000,
        participation_pct: p => 100 * p.Q / p.ADV, cost_per_share: p => p.P * (sqImp(p) + p.spread) / 10000 },
    },
    /* ---- quant foundations models (Oct 2026). Percent params are in percent. ---- */
    binomial: {
      // k successes in n trials with success chance p (%); pmf is drawn as steps, normal is the N(np, np(1-p)) density.
      params: { n: REQ, p: REQ, k0: OPT },
      axis: 'k',
      curves: {
        pmf: (p, x) => { const k = Math.round(x); return k < 0 || k > Math.round(p.n) ? 0 : binPmf(Math.round(p.n), p.p / 100, k); },
        normal: (p, x) => { const m = p.n * p.p / 100, sd = Math.sqrt(p.n * (p.p / 100) * (1 - p.p / 100)); return sd > 0 ? nPdf((x - m) / sd) / sd : null; },
      },
      outputs: { mean: p => p.n * p.p / 100, sd: p => Math.sqrt(p.n * (p.p / 100) * (1 - p.p / 100)), var: p => p.n * (p.p / 100) * (1 - p.p / 100),
        p_at_most_pct: p => 100 * binCdf(Math.round(p.n), p.p / 100, Math.round(p.k0)), p_at_least_pct: p => 100 * (1 - binCdf(Math.round(p.n), p.p / 100, Math.round(p.k0) - 1)) },
    },
    normal_prob: {
      // X ~ N(mu, sigma); shade P(X <= a).
      params: { mu: REQ, sigma: REQ, a: REQ },
      axis: 'x',
      curves: { density: (p, x) => nPdf((x - p.mu) / p.sigma) / p.sigma, below: (p, x) => x <= p.a ? nPdf((x - p.mu) / p.sigma) / p.sigma : null },
      outputs: { p_below_pct: p => 100 * nCdf((p.a - p.mu) / p.sigma), p_above_pct: p => 100 - 100 * nCdf((p.a - p.mu) / p.sigma), z: p => (p.a - p.mu) / p.sigma },
      extras: p => ({ vlines: [{ x: p.a, label: 'a', color: 'gold' }] }),
    },
    clt: {
      // One draw ~ (mean mu, sd sigma) vs the mean of n draws ~ N(mu, sigma / sqrt(n)).
      params: { sigma: REQ, n: REQ, mu: 0 },
      axis: 'x',
      curves: { one_draw: (p, x) => nPdf((x - p.mu) / p.sigma) / p.sigma, sample_mean: (p, x) => { const se = p.sigma / Math.sqrt(p.n); return nPdf((x - p.mu) / se) / se; } },
      outputs: { se: p => p.sigma / Math.sqrt(p.n), ci95: p => 1.96 * p.sigma / Math.sqrt(p.n), n: p => p.n },
    },
    bayes: {
      // Posterior P(condition | positive test) from prior, sensitivity and false-positive rate (all %).
      params: { prior: REQ, sens: REQ, fpr: REQ },
      curves: { posterior_pct: p => bayesPost(p), prior_pct: p => p.prior },
      outputs: { posterior_pct: p => bayesPost(p), positive_pct: p => p.prior * p.sens / 100 + (100 - p.prior) * p.fpr / 100, false_alarm_share_pct: p => 100 - bayesPost(p) },
    },
    birthday: {
      // P(at least two of n people share a birthday), d equally likely days.
      params: { n: REQ, days: 365 },
      curves: { p_shared_pct: p => bdayP(p) },
      outputs: { p_shared_pct: p => bdayP(p), pairs: p => Math.round(p.n) * (Math.round(p.n) - 1) / 2 },
    },
    gbm: {
      // dS = mu S dt + sigma S dW: mean grows at mu, median at mu - sigma^2/2; band = median x e^(+-sigma sqrt t).
      params: { mu: REQ, sigma: REQ, S0: 100, T: OPT },
      axis: 't',
      curves: {
        mean: (p, t) => p.S0 * Math.exp(p.mu / 100 * t), median: (p, t) => p.S0 * Math.exp((p.mu / 100 - Math.pow(p.sigma / 100, 2) / 2) * t),
        upper: (p, t) => p.S0 * Math.exp((p.mu / 100 - Math.pow(p.sigma / 100, 2) / 2) * t + p.sigma / 100 * Math.sqrt(t)),
        lower: (p, t) => p.S0 * Math.exp((p.mu / 100 - Math.pow(p.sigma / 100, 2) / 2) * t - p.sigma / 100 * Math.sqrt(t)),
      },
      outputs: { mean_T: p => p.S0 * Math.exp(p.mu / 100 * (p.T || 1)), median_T: p => p.S0 * Math.exp((p.mu / 100 - Math.pow(p.sigma / 100, 2) / 2) * (p.T || 1)),
        gap_pct: p => 100 * (Math.exp(Math.pow(p.sigma / 100, 2) / 2 * (p.T || 1)) - 1), median_growth_pct: p => p.mu - Math.pow(p.sigma, 2) / 200 },
    },
    two_asset: {
      // Two assets, weight w (%) in A; vols s1, s2 (%), correlation rho.
      params: { w: REQ, s1: REQ, s2: REQ, rho: REQ },
      curves: { port_vol: p => taVol(p) },
      outputs: { port_vol: p => taVol(p), min_var_w: p => taMinW(p), min_vol: p => taVol(Object.assign({}, p, { w: taMinW(p) })),
        avg_vol: p => p.w / 100 * p.s1 + (1 - p.w / 100) * p.s2 },
    },
    gd: {
      // Gradient descent on f(x) = a x^2 / 2 from x0: x_t = x0 (1 - lr a)^t. Converges iff 0 < lr a < 2.
      params: { lr: REQ, a: 1, x0: 5 },
      axis: 'iter',
      curves: { x: (p, t) => p.x0 * Math.pow(1 - p.lr * p.a, Math.round(t)), loss: (p, t) => p.a * Math.pow(p.x0 * Math.pow(1 - p.lr * p.a, Math.round(t)), 2) / 2 },
      outputs: { factor: p => 1 - p.lr * p.a, steps_to_1pct: p => { const f = Math.abs(1 - p.lr * p.a); return f < 1 && f > 0 ? Math.ceil(Math.log(0.01) / Math.log(f)) : (f === 0 ? 1 : NaN); } },
    },
    ar1: {
      // AR(1) forecast gap: E[Y_{t+h}] - mu = rho^h (Y_t - mu).
      params: { rho: REQ, gap0: 10 },
      axis: 'h',
      curves: { gap: (p, h) => p.gap0 * Math.pow(p.rho, Math.round(h)) },
      outputs: { rho: p => p.rho, steps_to_1pct: p => { const r = Math.abs(p.rho); return r > 0 && r < 1 ? Math.ceil(Math.log(0.01) / Math.log(r)) : (r === 0 ? 1 : NaN); },
        half_life: p => { const r = Math.abs(p.rho); return r > 0 && r < 1 ? Math.log(0.5) / Math.log(r) : NaN; } },
    },
    ridge: {
      // One-feature ridge: b(lambda) = b_ols * sxx / (sxx + lambda), sxx = sum of squared (centered) x.
      params: { lambda: REQ, sxx: REQ, b_ols: REQ },
      curves: { coef: p => p.b_ols * p.sxx / (p.sxx + p.lambda), shrink_pct: p => 100 * p.sxx / (p.sxx + p.lambda) },
      outputs: { coef: p => p.b_ols * p.sxx / (p.sxx + p.lambda), shrink_pct: p => 100 * p.sxx / (p.sxx + p.lambda) },
    },
  };
  function lgam(z) { // Lanczos log-gamma (g=7), enough for binomial coefficients up to n in the thousands
    const g = 7, c = [0.99999999999980993, 676.5203681218851, -1259.1392167224028, 771.32342877765313, -176.61502916214059, 12.507343278686905, -0.13857109526572012, 9.9843695780195716e-6, 1.5056327351493116e-7];
    if (z < 0.5) return Math.log(Math.PI / Math.sin(Math.PI * z)) - lgam(1 - z);
    z -= 1; let x = c[0]; for (let i = 1; i < g + 2; i++) x += c[i] / (z + i);
    const t = z + g + 0.5; return 0.5 * Math.log(2 * Math.PI) + (z + 0.5) * Math.log(t) - t + Math.log(x);
  }
  function binPmf(n, q, k) { if (q <= 0) return k === 0 ? 1 : 0; if (q >= 1) return k === n ? 1 : 0; return Math.exp(lgam(n + 1) - lgam(k + 1) - lgam(n - k + 1) + k * Math.log(q) + (n - k) * Math.log(1 - q)); }
  function binCdf(n, q, k) { if (k < 0) return 0; let s = 0; for (let i = 0; i <= Math.min(k, n); i++) s += binPmf(n, q, i); return Math.min(1, s); }
  function bayesPost(p) { const tp = p.prior * p.sens, fp = (100 - p.prior) * p.fpr; return tp + fp > 0 ? 100 * tp / (tp + fp) : NaN; }
  function bdayP(p) { const n = Math.round(p.n), d = p.days; if (n > d) return 100; let q = 1; for (let i = 0; i < n; i++) q *= (d - i) / d; return 100 * (1 - q); }
  function taVol(p) { const w = p.w / 100; return Math.sqrt(Math.max(0, w * w * p.s1 * p.s1 + (1 - w) * (1 - w) * p.s2 * p.s2 + 2 * w * (1 - w) * p.rho * p.s1 * p.s2)); }
  function taMinW(p) { const v1 = p.s1 * p.s1, v2 = p.s2 * p.s2, c = p.rho * p.s1 * p.s2, den = v1 + v2 - 2 * c; return den > 0 ? 100 * (v2 - c) / den : 50; }
  function nvVar(p) { return nInv(p.conf / 100) * p.sigma * Math.sqrt(p.days) - p.mu * p.days; }
  function nvCvar(p) { const z = nInv(p.conf / 100); return p.sigma * Math.sqrt(p.days) * nPdf(z) / (1 - p.conf / 100) - p.mu * p.days; }
  function carryF(p, w) {
    const T = p.T, r = p.r / 100, q = p.q / 100, c = p.c / 100;
    return (w && w.compounding === 'simple') ? p.S * (1 + (r + c) * T) / (1 + q * T) : p.S * Math.exp((r + c - q) * T);
  }
  function sqImp(p) { return p.k * p.sigma * 100 * Math.sqrt(Math.max(0, p.Q) / p.ADV); }

  /* ---- explore: sliders on a live chart ----
     { type:'explore', title, model, params:[{id,label,min,max,step,value,prefix,suffix,dp}], fixed:{id:value},
       chart:{x:{param,min,max,label,dp,prefix,suffix}, y:{label,min,max,...}, series:[{curve,name,color,dash,fill}], height},
       outputs:[{label, expr, dp, prefix, suffix}], marks:true, legs:[...] (payoff), compounding:'simple' (carry), note } */
  function exParams(M, w, vals) {
    const p = {};
    for (const k in M.params) if (M.params[k] !== REQ && M.params[k] !== OPT) p[k] = M.params[k];
    return Object.assign(p, w.fixed || {}, vals);
  }
  function exInit(w) { const o = {}; (w.params || []).forEach(q => { o[q.id] = Number(q.value); }); return o; }
  function exCtx(w, M, vals) {
    const ch = w.chart || {}, X = ch.x || {}, xp = X.param;
    const pdef = (w.params || []).find(q => q.id === xp) || {};
    const cur = exParams(M, w, vals);
    return { cur, init: exParams(M, w, exInit(w)), w, xp, isParam: !!xp && xp !== M.axis && xp in cur, pdef,
      xmin: X.min != null ? X.min : pdef.min, xmax: X.max != null ? X.max : pdef.max };
  }
  function exCurve(M, name, c, base) {
    const fn = M.curves[name], pts = [], N = 120;
    if (!fn || !(c.xmax > c.xmin)) return pts;
    const cx = Object.assign({}, c, { cur: base });
    for (let i = 0; i <= N; i++) {
      const x = c.xmin + (c.xmax - c.xmin) * i / N, p = Object.assign({}, base);
      if (c.isParam) p[c.xp] = x;
      let y; try { y = fn(p, x, cx); } catch (e) { y = NaN; }
      if (y != null && isFinite(y)) pts.push([+x.toPrecision(12), y]);
    }
    return pts;
  }
  // A y range that does not jump while sliding: sample every slider at its min and max (others at the start values).
  function exYRange(w, M) {
    const Y = (w.chart || {}).y || {};
    if (Y.min != null && Y.max != null) return [Y.min, Y.max];
    const init = exInit(w), ys = [];
    const configs = [init];
    (w.params || []).forEach(q => { configs.push(Object.assign({}, init, { [q.id]: q.min }), Object.assign({}, init, { [q.id]: q.max })); });
    configs.forEach(v => {
      const c = exCtx(w, M, v);
      // Solid series set the range; dashed guides (tangent lines, comparisons) may run off the plot and get clipped.
      const ser = (w.chart || {}).series || [], solid = ser.filter(s => !s.dash);
      (solid.length ? solid : ser).forEach(s => exCurve(M, s.curve, c, c.cur).forEach(pt => ys.push(pt[1])));
    });
    let lo = Math.min(...ys), hi = Math.max(...ys);
    if (!isFinite(lo) || !isFinite(hi)) { lo = 0; hi = 1; }
    if (Y.min != null) lo = Y.min; if (Y.max != null) hi = Y.max;
    if (!(hi > lo)) hi = lo + 1;
    const pad = (hi - lo) * 0.06;
    if (Y.min == null) lo -= pad; if (Y.max == null) hi += pad;
    const t = niceTicks(lo, hi, 5), step = t.length > 1 ? t[1] - t[0] : (hi - lo);
    if (Y.min == null) lo = (lo < 0 && ys.every(y => y > -1e-9 * (Math.abs(hi) + 1))) ? 0 : Math.floor(lo / step + 1e-9) * step;
    if (Y.max == null) hi = Math.ceil(hi / step - 1e-9) * step;
    return [lo, hi];
  }
  function exSpec(w, st) {
    const M = EXPLORE_MODELS[w.model], ch = w.chart || {}, X = ch.x || {}, Y = ch.y || {};
    const c = exCtx(w, M, st.vals);
    const moved = (w.params || []).some(q => Math.abs(st.vals[q.id] - Number(q.value)) > 1e-12);
    const series = [];
    if (w.marks && moved) (ch.series || []).forEach((s, si) => series.push({ color: s.color || SV_PALETTE[si % 7], dash: true, faint: true, points: exCurve(M, s.curve, c, c.init) }));
    (ch.series || []).forEach((s, si) => series.push({ name: s.name, color: s.color || SV_PALETTE[si % 7], dash: !!s.dash, fill: !!s.fill, points: exCurve(M, s.curve, c, c.cur) }));
    const ex = M.extras ? M.extras(c.cur, c) : {};
    const vlines = (ex.vlines || []).slice(), marks = [];
    if (c.isParam && (ch.series || []).length && !ch.noMarker) {
      const xv = c.cur[c.xp], s0 = ch.series[0], fn = M.curves[s0.curve];
      vlines.push({ x: xv, color: 'gold', label: X.markerLabel != null ? X.markerLabel : svNum(xv, c.pdef.dp, c.pdef.prefix, c.pdef.suffix) });
      let yv; try { yv = fn(c.cur, xv, c); } catch (e) { yv = NaN; }
      if (yv != null && isFinite(yv)) marks.push({ x: xv, y: yv, color: s0.color || 'blue' });
    }
    const [y0, y1] = st.yr;
    return { kind: ch.kind || 'line', height: ch.height,
      x: { label: X.label, min: c.xmin, max: c.xmax, dp: X.dp, prefix: X.prefix, suffix: X.suffix, ticks: X.ticks, comma: X.comma },
      y: { label: Y.label, min: y0, max: y1, dp: Y.dp, prefix: Y.prefix, suffix: Y.suffix, ticks: Y.ticks, comma: Y.comma },
      series, vlines, marks, hlines: ch.hlines };
  }
  function exState(w, id) {
    let st = exploreStates[id];
    if (!st) st = exploreStates[id] = { vals: exInit(w), yr: exYRange(w, EXPLORE_MODELS[w.model]) };
    return st;
  }
  function exOutputs(w, st) {
    const M = EXPLORE_MODELS[w.model], c = exCtx(w, M, st.vals);
    return (w.outputs || []).map(o => {
      const fn = M.outputs[o.expr]; let v;
      try { v = fn ? fn(c.cur, c) : NaN; } catch (e) { v = NaN; }
      return svNumHtml(v, o.dp, o.prefix, o.suffix);
    });
  }
  function buildExplore(w, slideN, wi) {
    const M = EXPLORE_MODELS[w.model];
    if (!M) return '';
    const id = `${slideN}:${wi}`, cid = `ex-${slideN}-${wi}`, st = exState(w, id);
    chartSpecs[cid] = exSpec(w, st);
    const ser = ((w.chart || {}).series || []).filter(s => s.name);
    const legend = (ser.length > 1 || w.marks) ? `<div class="sv__chart-legend">${ser.map((s, si) => `<span><i style="--c:${ixColor(s.color || SV_PALETTE[si % 7])}" class="${s.dash ? 'sv__chart-key--dash' : ''}"></i>${ixInline(s.name)}</span>`).join('')}${w.marks ? `<span><i class="sv__chart-key--dash" style="--c:var(--text-secondary)"></i>Where you started</span>` : ''}</div>` : '';
    const outs = exOutputs(w, st);
    let h = `<figure class="sv__chartbox sv__ex" data-ex="${id}">${w.title ? `<figcaption class="sv__bars-title">${ixInline(w.title)}</figcaption>` : ''}${legend}`;
    h += `<div class="sv__chart" data-chart="${cid}" role="img" aria-label="${escHtml(svPlain(w.title || 'interactive chart'))}"></div>`;
    if ((w.outputs || []).length) h += `<div class="sv__ex-out" aria-live="polite">${(w.outputs || []).map((o, k) => `<div class="sv__ex-stat"><span>${ixInline(o.label)}</span><b data-exout="${k}">${outs[k]}</b></div>`).join('')}</div>`;
    h += `<div class="sv__ex-sliders">`;
    (w.params || []).forEach(q => {
      const v = st.vals[q.id];
      h += `<label class="sv__ex-sl"><span class="sv__ex-sl-top"><span>${ixInline(q.label)}</span><b data-exval="${escHtml(q.id)}">${svNumHtml(v, q.dp, q.prefix, q.suffix)}</b></span>` +
        `<input type="range" min="${q.min}" max="${q.max}" step="${q.step || (q.max - q.min) / 100}" value="${v}" style="--pct:${svPct(v, q.min, q.max)}" aria-label="${escHtml(svPlain(q.label))}" oninput="SlideViewer.exSet('${id}','${escHtml(q.id)}',this.value);this.style.setProperty('--pct',SlideViewer.svPct(this.value,this.min,this.max))"></label>`;
    });
    h += `</div><div class="sv__ex-foot"><span class="sv__ex-hint">Drag a slider and watch the chart</span><button class="sv__ex-reset" onclick="SlideViewer.exReset('${id}')">Reset</button></div>`;
    if (w.note) h += `<div class="sv__wnote">${ixInline(w.note)}</div>`;
    return h + '</figure>';
  }
  function exFind(id) {
    const [n, wi] = id.split(':').map(Number), s = ixSlide(n);
    return s && (s.widgets || [])[wi];
  }
  const exRaf = {};
  function exSet(id, pid, val) {
    const w = exFind(id), st = exploreStates[id];
    if (!w || !st) return;
    st.vals[pid] = Number(val);
    cancelAnimationFrame(exRaf[id]);
    exRaf[id] = requestAnimationFrame(() => exPaint(id, w, st));
  }
  function exPaint(id, w, st) {
    const box = document.querySelector(`.sv__ex[data-ex="${id}"]`);
    if (!box) return;
    const el = box.querySelector('.sv__chart[data-chart]');
    const spec = chartSpecs[el.getAttribute('data-chart')] = exSpec(w, st);
    drawChartEl(el, spec);
    const outs = exOutputs(w, st);
    box.querySelectorAll('[data-exout]').forEach(b => { b.innerHTML = outs[+b.getAttribute('data-exout')]; });
    (w.params || []).forEach(q => {
      const b = box.querySelector(`[data-exval="${q.id}"]`);
      if (b) b.innerHTML = svNumHtml(st.vals[q.id], q.dp, q.prefix, q.suffix);
    });
  }
  function exReset(id) {
    const w = exFind(id), st = exploreStates[id];
    if (!w || !st) return;
    st.vals = exInit(w);
    const box = document.querySelector(`.sv__ex[data-ex="${id}"]`);
    if (box) (w.params || []).forEach((q, k) => { const r = box.querySelectorAll('input[type=range]')[k]; if (r) { r.value = st.vals[q.id]; r.style.setProperty('--pct', svPct(r.value, q.min, q.max)); } });
    exPaint(id, w, st);
  }

  /* ---- mmgame: make a two-sided market on a hidden number ----
     { type:'mmgame', title, rounds:[{prompt, truth, unit, hint, scale}], counterparties:{informed:0..1, size:n}, note }
     scale = how far off a good estimate typically is (same unit as truth). Max spread = 6 x scale.
     Counterparties, seeded by FNV-1a("<lesson id>:<slide n>:<widget index>:<round index>") into xorshift32:
       a seeded shuffle picks round(size x informed) informed traders; then each trader k draws u_dir, u_tol.
       informed: buys at your ask if truth > ask, sells at your bid if truth < bid, else passes.
       noise: trades only if (ask - bid) <= scale x (1 + 4 u_tol); buys if u_dir < 0.5, else sells. One unit per trade.
     P&L is cash flow: + ask per unit they buy, - bid per unit they sell, then your position closes at the truth.
     Points = 10 x P&L / scale, so rounds on very different scales count the same. */
  const MM_SPREAD_CAP = 6;
  function mmSim(round, bid, ask, cp, seedStr) {
    const n = Math.max(1, Math.min(20, Math.round(cp.size || 8)));
    const share = Math.max(0, Math.min(1, cp.informed != null ? cp.informed : 0.3));
    const rnd = svRng(seedStr), order = Array.from({ length: n }, (_, i) => i);
    for (let i = n - 1; i > 0; i--) { const j = Math.floor(rnd() * (i + 1)); const t = order[i]; order[i] = order[j]; order[j] = t; }
    const informed = new Set(order.slice(0, Math.round(n * share)));
    const truth = round.truth, scale = round.scale, fills = [];
    let cash = 0, pos = 0;
    for (let k = 0; k < n; k++) {
      const uDir = rnd(), uTol = rnd(), inf = informed.has(k);
      let side = 'pass';
      if (inf) side = truth > ask ? 'buy' : truth < bid ? 'sell' : 'pass';
      else if (ask - bid <= scale * (1 + 4 * uTol)) side = uDir < 0.5 ? 'buy' : 'sell';
      if (side === 'buy') { cash += ask; pos -= 1; } else if (side === 'sell') { cash -= bid; pos += 1; }
      fills.push({ inf, side });
    }
    const pnl = cash + pos * truth;
    return { bid, ask, fills, cash, pos, close: pos * truth, pnl, pts: Math.round(10 * pnl / scale) };
  }
  function mmParse(s) { const v = parseFloat(String(s == null ? '' : s).replace(/[,\s$]/g, '')); return isFinite(v) ? v : null; }
  function mmFmt(v, dp) { return svNum(v, dp != null ? dp : Math.abs(v) >= 100 || Number.isInteger(v) ? 0 : 2); }
  // One decimal count for every number of a round (prices, cash, close-out, P&L), so 112.29 - 97.29 never shows as "112" and "-97.29".
  function mmDp(r, res) { return Math.min(2, Math.max(...[r.truth, r.scale, res && res.bid, res && res.ask].filter(v => v != null).map(v => { const m = String(+(+v).toFixed(6)).split('.')[1]; return m ? m.length : 0; }))); }
  function mmStory(r, res) {
    const dp = mmDp(r, res);
    const nInfTrade = res.fills.filter(f => f.inf && f.side !== 'pass').length, nTrade = res.fills.filter(f => f.side !== 'pass').length;
    const t = mmFmt(r.truth, dp);
    if (!nTrade) return { cls: 'flat', head: 'Too wide: nobody traded', text: `The answer (${t}) was inside your market, but your spread was so wide that no one wanted your prices. A market nobody trades on earns nothing.` };
    if (nInfTrade) {
      const above = r.truth > res.ask;
      const cost = nInfTrade * (above ? r.truth - res.ask : res.bid - r.truth);
      return { cls: res.pnl < 0 ? 'bad' : 'flat', head: res.pnl < 0 ? 'Picked off' : 'Picked off, but lucky',
        text: `The answer (${t}) was ${above ? 'above your ask' : 'below your bid'}, so the informed traders ${above ? 'bought from you at ' + mmFmt(res.ask, dp) : 'sold to you at ' + mmFmt(res.bid, dp)} and cost you ${mmFmt(cost, dp)}. Your market was centered ${above ? 'too low' : 'too high'}.${res.pnl >= 0 ? ' Noise traders happened to cover it this time: do not count on that.' : ''}` };
    }
    return { cls: 'good', head: 'Nice: the answer was inside your market', text: `Noise traders paid you the spread and the informed traders had no edge against you, so they passed. ${res.ask - res.bid <= 2 * r.scale ? 'Tight and right is the best market there is.' : 'A bit tighter would have traded more.'}` };
  }
  function mmLine(r, res) { // number line: your market as a band, the answer as a marker
    const dp = mmDp(r, res);
    const lo0 = Math.min(res.bid, r.truth), hi0 = Math.max(res.ask, r.truth), pad = Math.max((hi0 - lo0) * 0.18, r.scale * 0.5);
    const lo = lo0 - pad, hi = hi0 + pad, f = v => (100 * (v - lo) / (hi - lo)).toFixed(2) + '%';
    // Close quotes: bid label ends at its tick and ask label starts at its tick so they never overlap.
    const close = (res.ask - res.bid) / (hi - lo) < 0.3, tp = (r.truth - lo) / (hi - lo);
    return `<div class="sv__mm-line" role="img" aria-label="Your market ${escHtml(mmFmt(res.bid, dp))} to ${escHtml(mmFmt(res.ask, dp))}, answer ${escHtml(mmFmt(r.truth, dp))}">
      <div class="sv__mm-axis"></div><div class="sv__mm-band" style="left:${f(res.bid)};width:calc(${f(res.ask)} - ${f(res.bid)})"></div>
      <div class="sv__mm-tick${close ? ' sv__mm-tick--end' : ''}" style="left:${f(res.bid)}"><span>Bid ${escHtml(mmFmt(res.bid, dp))}</span></div>
      <div class="sv__mm-tick${close ? ' sv__mm-tick--start' : ''}" style="left:${f(res.ask)}"><span>Ask ${escHtml(mmFmt(res.ask, dp))}</span></div>
      <div class="sv__mm-truth${tp < 0.15 ? ' sv__mm-truth--start' : tp > 0.85 ? ' sv__mm-truth--end' : ''}" style="left:${f(r.truth)}"><i></i><span>Answer ${escHtml(mmFmt(r.truth, dp))}</span></div></div>`;
  }
  function buildMmgame(w, slideN, wi) {
    const id = `${slideN}:${wi}`, rounds = w.rounds || [];
    if (!rounds.length) return '';
    const st = mmStates[id] || (mmStates[id] = { r: 0, res: [], bid: '', ask: '', hint: false, err: '' });
    const total = st.res.reduce((a, x) => a + x.pts, 0), over = st.r >= rounds.length;
    let h = `<div class="sv__mm" data-mm="${id}"><div class="sv__mm-head"><span class="sv__mm-ico">${svIcon('scale')}</span><div class="sv__mm-titles"><div class="sv__mm-title">${ixInline(w.title || 'Make a market')}</div>`;
    h += `<div class="sv__mm-sub">${over ? 'Game over' : `Round ${st.r + 1} of ${rounds.length}`}</div></div><div class="sv__mm-score" aria-live="polite"><span>Score</span><b>${total > 0 ? '+' : ''}${total}</b></div></div>`;
    h += `<div class="sv__mm-dots">${rounds.map((_, i) => `<i class="${i < st.res.length ? (st.res[i].pts > 0 ? 'is-up' : st.res[i].pts < 0 ? 'is-down' : 'is-flat') : i === st.r ? 'is-on' : ''}"></i>`).join('')}</div>`;
    if (over) {
      h += `<div class="sv__mm-final"><div class="sv__tbwrap"><table class="sv__tb"><thead><tr><th>Round</th><th class="sv__tb-r">Your market</th><th class="sv__tb-r">Answer</th><th class="sv__tb-r">Points</th></tr></thead><tbody>`;
      rounds.forEach((r, i) => { const x = st.res[i]; if (!x) return; const dp = mmDp(r, x); h += `<tr><td>${i + 1}</td><td class="sv__tb-r">${escHtml(mmFmt(x.bid, dp))} to ${escHtml(mmFmt(x.ask, dp))}</td><td class="sv__tb-r">${escHtml(mmFmt(r.truth))}</td><td class="sv__tb-r">${x.pts > 0 ? '+' : ''}${x.pts}</td></tr>`; });
      h += `</tbody></table></div><p class="sv__mm-verdict">${total > 0 ? `You finished up ${total} points. ${st.res.some(x => x.fills.some(f => f.inf && f.side !== 'pass')) ? 'The spread you earned from noise traders paid for the times informed traders caught you.' : 'Your markets were centered well enough that informed traders never had an edge.'}` : total < 0 ? `You finished down ${-total} points. Informed traders took more than the spread paid you: center your market on your best estimate and size the width to how unsure you are.` : 'You finished flat. A market that never trades never loses, but it never earns either.'}</p>`;
      h += `<button class="sv__steps-btn sv__steps-btn--next" onclick="SlideViewer.mmReset('${id}')">Play again</button></div></div>`;
      return h;
    }
    const r = rounds[st.r], unit = r.unit ? ixInline(r.unit) : '', cap = MM_SPREAD_CAP * r.scale;
    h += `<div class="sv__mm-q"><div class="sv__mm-prompt">${ixInline(r.prompt)}</div>${r.unit ? `<div class="sv__mm-unit">Answer in ${unit}</div>` : ''}</div>`;
    const res = st.res.length > st.r ? st.res[st.r] : null;
    if (!res) {
      h += `<div class="sv__mm-form"><label class="sv__mm-in"><span>Bid (you buy at)</span><input type="text" inputmode="decimal" autocomplete="off" value="${escHtml(st.bid)}" oninput="SlideViewer.mmInput('${id}','bid',this.value)" onkeydown="if(event.key==='Enter')SlideViewer.mmTrade('${id}')"></label>`;
      h += `<label class="sv__mm-in"><span>Ask (you sell at)</span><input type="text" inputmode="decimal" autocomplete="off" value="${escHtml(st.ask)}" oninput="SlideViewer.mmInput('${id}','ask',this.value)" onkeydown="if(event.key==='Enter')SlideViewer.mmTrade('${id}')"></label></div>`;
      h += `<div class="sv__mm-meta"><span>Max spread ${escHtml(mmFmt(cap))}</span>${r.hint ? (st.hint ? `<span class="sv__mm-hint">${ixInline(r.hint)}</span>` : `<button class="sv__mm-link" onclick="SlideViewer.mmHint('${id}')">Show a hint</button>`) : ''}</div>`;
      if (st.err) h += `<div class="sv__mm-err" role="alert">${escHtml(st.err)}</div>`;
      h += `<button class="sv__ix-check" onclick="SlideViewer.mmTrade('${id}')">Trade</button>`;
    } else {
      const dp = mmDp(r, res), s = mmStory(r, res), nb = res.fills.filter(f => f.side === 'buy').length, ns = res.fills.filter(f => f.side === 'sell').length;
      h += mmLine(r, res);
      h += `<div class="sv__mm-story sv__mm-story--${s.cls}"><b>${escHtml(s.head)}</b><span>${ixInline(s.text)}</span></div>`;
      h += `<div class="sv__mm-fills" aria-label="Trades">${res.fills.map(f => `<span class="sv__mm-fill sv__mm-fill--${f.side}${f.inf ? ' sv__mm-fill--inf' : ''}"><em>${f.inf ? 'Informed' : 'Noise'}</em>${f.side === 'buy' ? 'bought' : f.side === 'sell' ? 'sold' : 'passed'}</span>`).join('')}</div>`;
      h += `<div class="sv__mm-fillsum">${nb} bought from you at ${escHtml(mmFmt(res.ask, dp))}, ${ns} sold to you at ${escHtml(mmFmt(res.bid, dp))}, ${res.fills.length - nb - ns} passed</div>`;
      h += `<div class="sv__mm-pnl"><div><span>Cash from trades</span><b>${escHtml(mmFmt(res.cash, dp))}</b></div><div><span>${res.pos ? `Close ${res.pos > 0 ? 'long' : 'short'} ${Math.abs(res.pos)} at the answer` : 'Position closed (flat)'}</span><b>${escHtml(mmFmt(res.close, dp))}</b></div><div class="sv__mm-pnl-net"><span>Net P&amp;L</span><b>${escHtml(mmFmt(res.pnl, dp))}</b></div><div class="sv__mm-pnl-net"><span>Points</span><b>${res.pts > 0 ? '+' : ''}${res.pts}</b></div></div>`;
      h += `<button class="sv__steps-btn sv__steps-btn--next" onclick="SlideViewer.mmNext('${id}')">${st.r + 1 < rounds.length ? 'Next round' : 'See your score'}</button>`;
    }
    h += `<div class="sv__mm-foot">${w.note ? `<span>${ixInline(w.note)}</span>` : ''}${st.res.length || st.bid || st.ask ? `<button class="sv__mm-link" onclick="SlideViewer.mmReset('${id}')">Start over</button>` : ''}</div></div>`;
    return h;
  }
  function mmInput(id, k, v) { const st = mmStates[id]; if (st) st[k] = v; }
  function mmHint(id) { const st = mmStates[id]; if (st) { st.hint = true; ixRefresh(); } }
  function mmTrade(id) {
    const st = mmStates[id], w = exFind(id);
    if (!st || !w) return;
    const r = (w.rounds || [])[st.r];
    if (!r || st.res.length > st.r) return;
    const bid = mmParse(st.bid), ask = mmParse(st.ask), cap = MM_SPREAD_CAP * r.scale;
    st.err = bid == null || ask == null ? 'Enter a bid and an ask.' : !(ask > bid) ? 'Your bid must be below your ask.' : ask - bid > cap + 1e-9 ? `Max spread is ${mmFmt(cap)}: tighten your market.` : '';
    if (!st.err) {
      const [n, wi] = id.split(':');
      st.res.push(mmSim(r, bid, ask, w.counterparties || {}, `${(data && data.id) || ''}:${n}:${wi}:${st.r}`));
    }
    ixRefresh();
  }
  function mmNext(id) { const st = mmStates[id]; if (!st || st.res.length <= st.r) return; st.r += 1; st.bid = ''; st.ask = ''; st.hint = false; st.err = ''; ixRefresh(); }
  function mmReset(id) { delete mmStates[id]; ixRefresh(); }

  /* ---- predict: show a real series up to revealFrom, the student calls what happens next, then the rest draws in ----
     { type:'predict', title, question, chart:{chart spec}, revealFrom:x, choices:[{label, correct}] | drag:true, tolerance, explanation } */
  function pdRange(w) {
    const ch = w.chart || {}, Y = ch.y || {}, ser = ch.series || [], rf = w.revealFrom;
    const all = ser.flatMap(s => s.points || []), vis = (ser[0] && ser[0].points || []).filter(p => p[0] <= rf);
    if (Y.min != null && Y.max != null) return [Y.min, Y.max];
    // Symmetric around the last visible value so the axis does not hint at the direction.
    const last = vis.length ? vis[vis.length - 1][1] : 0, dev = Math.max(...all.map(p => Math.abs(p[1] - last)), 1e-9) * 1.12;
    let lo = Y.min != null ? Y.min : last - dev, hi = Y.max != null ? Y.max : last + dev;
    const t = niceTicks(lo, hi, 5), step = t.length > 1 ? t[1] - t[0] : hi - lo;
    if (Y.min == null) lo = Math.floor(lo / step + 1e-9) * step;
    if (Y.max == null) hi = Math.ceil(hi / step - 1e-9) * step;
    return [lo, hi];
  }
  function pdEnds(w) {
    const s0 = ((w.chart || {}).series || [])[0] || { points: [] }, pts = s0.points || [];
    const vis = pts.filter(p => p[0] <= w.revealFrom);
    return { last: vis.length ? vis[vis.length - 1] : pts[0], end: pts[pts.length - 1] };
  }
  function pdSpec(w, st) {
    const ch = w.chart || {}, rf = w.revealFrom, ser = ch.series || [], [y0, y1] = st.yr;
    const xs = ser.flatMap(s => (s.points || []).map(p => p[0]));
    const X = Object.assign({}, ch.x || {}), Y = Object.assign({}, ch.y || {}, { min: y0, max: y1 });
    if (X.min == null) X.min = Math.min(...xs); if (X.max == null) X.max = Math.max(...xs);
    const series = [], marks = [], vlines = [], bands = [];
    const { last, end } = pdEnds(w), c0 = (ser[0] && ser[0].color) || 'blue';
    ser.forEach((s, si) => {
      const c = s.color || SV_PALETTE[si % 7], pts = s.points || [];
      series.push(Object.assign({}, s, { color: c, points: pts.filter(p => p[0] <= rf) }));
      if (st.done) { const k = pts.findIndex(p => p[0] > rf); if (k >= 0) series.push({ color: c, dash: !!s.dash, grow: !!st.anim, points: pts.slice(Math.max(0, k - 1)) }); }
    });
    if (!st.done) bands.push({ x0: rf, x1: X.max, label: 'Your call', color: 'gold' });
    else vlines.push({ x: rf, color: 'gold' });
    if (w.drag && last) {
      series.push({ color: 'gold', dash: true, points: [last, [end[0], st.guess]] });
      marks.push({ x: end[0], y: st.guess, label: 'You', color: 'gold', below: st.done && st.guess < end[1] });
      if (st.done) marks.push({ x: end[0], y: end[1], label: 'Actual', color: c0, below: end[1] < st.guess });
    }
    return Object.assign({}, ch, { anim: false, x: X, y: Y, series, marks: (ch.marks || []).concat(marks), vlines: (ch.vlines || []).concat(vlines), bands: (ch.bands || []).concat(bands) });
  }
  function pdState(w, id) {
    let st = predictStates[id];
    if (!st) { const yr = pdRange(w), e = pdEnds(w); st = predictStates[id] = { yr, pick: null, guess: e.last ? e.last[1] : (yr[0] + yr[1]) / 2, moved: false, done: false, anim: false }; }
    return st;
  }
  function pdVerdict(w, st) {
    if (!w.drag) {
      const ch = w.choices || [], ok = !!(ch[st.pick] || {}).correct, right = ch.find(c => c.correct);
      return { ok, text: ok ? `Yes: ${svPlain(ch[st.pick].label)}.` : `Not quite. The answer: ${svPlain(right ? right.label : '')}.` };
    }
    const { last, end } = pdEnds(w), Y = (w.chart || {}).y || {}, f = v => svNum(v, Y.dp, Y.prefix, Y.suffix);
    const tol = w.tolerance != null ? w.tolerance : 0.1 * (st.yr[1] - st.yr[0]);
    const dA = end[1] - last[1], dG = st.guess - last[1], err = Math.abs(st.guess - end[1]);
    const sameDir = Math.abs(dA) < tol / 2 ? Math.abs(dG) < tol : dA * dG > 0;
    if (err <= tol) return { ok: true, text: `Spot on: you said ${f(st.guess)} and it ended at ${f(end[1])}.` };
    if (sameDir) return { ok: true, text: `Right direction. You said ${f(st.guess)}, it ended at ${f(end[1])}.` };
    return { ok: false, text: `It went the other way: you said ${f(st.guess)}, it ended at ${f(end[1])}.` };
  }
  function buildPredict(w, slideN, wi) {
    const ch = w.chart || {};
    if (!(ch.series || []).length) return '';
    const id = `${slideN}:${wi}`, cid = `pd-${slideN}-${wi}`, st = pdState(w, id), Y = ch.y || {};
    chartSpecs[cid] = pdSpec(w, st);
    st.anim = false; // the reveal animates once, not on every revisit
    const named = (ch.series || []).filter(s => s.name);
    let h = `<figure class="sv__chartbox sv__pd" data-pd="${id}">${w.title ? `<figcaption class="sv__bars-title">${ixInline(w.title)}</figcaption>` : ''}`;
    if (named.length > 1) h += `<div class="sv__chart-legend">${named.map((s, si) => `<span><i style="--c:${ixColor(s.color || SV_PALETTE[si % 7])}"></i>${ixInline(s.name)}</span>`).join('')}</div>`;
    h += `<div class="sv__pd-q">${svIcon('crystal-ball') ? `<span class="sv__pd-ico">${svIcon('crystal-ball')}</span>` : ''}<span>${ixInline(w.question || 'What happened next?')}</span></div>`;
    const dragOn = w.drag && !st.done;
    h += `<div class="sv__chart${dragOn ? ' sv__pd-drag sv__noswipe' : ''}" data-chart="${cid}" role="img" aria-label="${escHtml(svPlain(w.title || 'chart'))}"${dragOn ? ` onpointerdown="SlideViewer.pdPointer(event,'${id}',1)" onpointermove="SlideViewer.pdPointer(event,'${id}',0)"` : ''}></div>`;
    if (w.drag) {
      const step = w.step || +((st.yr[1] - st.yr[0]) / 200).toPrecision(2);
      h += `<label class="sv__ex-sl sv__pd-sl"><span class="sv__ex-sl-top"><span>${st.done ? 'Your guess' : 'Drag the gold dot, or use this slider'}</span><b data-pdval>${svNumHtml(st.guess, Y.dp, Y.prefix, Y.suffix)}</b></span>` +
        `<input type="range" min="${st.yr[0]}" max="${st.yr[1]}" step="${step}" value="${st.guess}" style="--pct:${svPct(st.guess, st.yr[0], st.yr[1])}" aria-label="Your guess for the end value" ${st.done ? 'disabled' : ''} oninput="SlideViewer.pdGuess('${id}',this.value)"></label>`;
    } else {
      const corr = (w.choices || []).findIndex(c => c.correct);
      h += `<div class="sv__pd-choices" role="radiogroup">${(w.choices || []).map((c, i) => {
        const cls = st.done ? (i === corr ? ' sv__ix-chip--ok' : i === st.pick ? ' sv__ix-chip--no' : ' sv__pd-dim') : (i === st.pick ? ' sv__ix-chip--sel' : '');
        return `<button class="sv__ix-chip${cls}" role="radio" aria-checked="${i === st.pick}" ${st.done ? 'disabled' : ''} onclick="SlideViewer.pdPick('${id}',${i})">${ixInline(c.label)}</button>`;
      }).join('')}</div>`;
    }
    if (!st.done) h += `<button class="sv__ix-check" ${w.drag || st.pick != null ? '' : 'disabled'} onclick="SlideViewer.pdReveal('${id}')">Reveal</button>`;
    else {
      const v = pdVerdict(w, st);
      h += `<div class="sv__pd-out sv__pd-out--${v.ok ? 'ok' : 'no'}" aria-live="polite"><b>${escHtml(v.text)}</b>${w.explanation ? `<div class="sv__pd-expl">${renderMarkdown(w.explanation)}</div>` : ''}</div>`;
    }
    if (w.note) h += `<div class="sv__wnote">${ixInline(w.note)}</div>`;
    return h + '</figure>';
  }
  function pdPick(id, i) { const st = predictStates[id]; if (!st || st.done) return; st.pick = i; ixRefresh(); }
  function pdReveal(id) {
    const st = predictStates[id], w = exFind(id);
    if (!st || !w || st.done || (!w.drag && st.pick == null)) return;
    st.done = true; st.anim = !_reducedMotion();
    st.answer = w.drag ? { guess: st.guess } : { pick: st.pick, correct: !!((w.choices || [])[st.pick] || {}).correct };
    ixRefresh();
  }
  function pdRepaint(id, w, st) {
    const box = document.querySelector(`.sv__pd[data-pd="${id}"]`);
    if (!box) return;
    const el = box.querySelector('.sv__chart[data-chart]'), Y = (w.chart || {}).y || {};
    drawChartEl(el, chartSpecs[el.getAttribute('data-chart')] = pdSpec(w, st));
    const b = box.querySelector('[data-pdval]'); if (b) b.innerHTML = svNumHtml(st.guess, Y.dp, Y.prefix, Y.suffix);
    pdSyncRange(box, st);
    return box;
  }
  function pdGuess(id, v) {
    const st = predictStates[id], w = exFind(id);
    if (!st || !w || st.done) return;
    st.guess = Number(v); st.moved = true;
    pdRepaint(id, w, st);
  }
  function pdPointer(ev, id, down) {
    const st = predictStates[id], w = exFind(id), el = ev.currentTarget;
    if (!st || !w || st.done || !el || !el.__sc) return;
    if (down) { try { el.setPointerCapture(ev.pointerId); } catch (e) {} ev.preventDefault(); }
    else if (!(ev.buttons & 1) && ev.pointerType === 'mouse') return;
    else if (ev.pointerType !== 'mouse' && !el.hasPointerCapture(ev.pointerId)) return;
    const sc = el.__sc, y = ev.clientY - el.getBoundingClientRect().top;
    const v = sc.y0 + (sc.bot - y) / (sc.bot - sc.top) * (sc.y1 - sc.y0);
    const step = w.step || +((st.yr[1] - st.yr[0]) / 200).toPrecision(2);
    st.guess = Math.max(st.yr[0], Math.min(st.yr[1], Math.round(v / step) * step)); st.moved = true;
    const box = pdRepaint(id, w, st);
    const r = box && box.querySelector('input[type=range]'); if (r) r.value = st.guess;
  }
  function svPct(v, lo, hi) { return (100 * (Number(v) - Number(lo)) / ((Number(hi) - Number(lo)) || 1)).toFixed(2) + '%'; }
  function pdSyncRange(box, st) {
    const r = box && box.querySelector('input[type=range]');
    if (r) { if (Number(r.value) !== st.guess) r.value = st.guess; r.style.setProperty('--pct', svPct(st.guess, st.yr[0], st.yr[1])); }
  }

  /* ---- poll: an ungraded "what would you do?" moment ----
     { type:'poll', setting, question, options:[{label, means, share}], next, icon }
     No right answer, no colors for right or wrong. The pick can change; shares (if every option has one) show as a neutral split. */
  function buildPoll(w, slideN, wi) {
    const id = `${slideN}:${wi}`, st = pollStates[id] || {}, opts = w.options || [], pk = st.pick;
    const shares = opts.length && opts.every(o => typeof o.share === 'number');
    const tot = shares ? opts.reduce((a, o) => a + o.share, 0) || 1 : 1;
    let h = `<div class="sv__poll" data-poll="${id}"><div class="sv__poll-head"><span class="sv__poll-ico">${svIcon(w.icon || 'question')}</span><span class="sv__poll-eyebrow">Your move</span></div>`;
    if (w.setting) h += `<div class="sv__poll-setting">${ixInline(w.setting)}</div>`;
    h += `<div class="sv__poll-q">${ixInline(w.question || '')}</div><div class="sv__poll-opts" role="radiogroup">`;
    opts.forEach((o, i) => {
      const pct = shares ? Math.round(100 * o.share / tot) : 0;
      h += `<button class="sv__poll-opt${i === pk ? ' sv__poll-opt--on' : ''}${shares && pk != null ? ' sv__poll-opt--bar' : ''}" role="radio" aria-checked="${i === pk}" onclick="SlideViewer.pollPick('${id}',${i})"${shares && pk != null ? ` style="--p:${pct}%"` : ''}>` +
        `<span class="sv__poll-key">${String.fromCharCode(65 + i)}</span><span class="sv__poll-label">${ixInline(o.label)}</span>${shares && pk != null ? `<span class="sv__poll-pct">${pct}%</span>` : ''}</button>`;
    });
    h += '</div>';
    if (pk == null) h += `<div class="sv__poll-hint">No right or wrong answer here. Pick what you would really do.</div>`;
    else {
      const o = opts[pk] || {};
      h += `<div class="sv__poll-res" aria-live="polite"><div class="sv__poll-you">You picked: <b>${ixInline(o.label)}</b></div>${o.means ? `<div class="sv__poll-means">${ixInline(o.means)}</div>` : ''}`;
      if (shares) h += `<div class="sv__poll-split">${escHtml(w.shareLabel || 'Bars show a typical split of answers.')}</div>`;
      if (w.next) h += `<div class="sv__poll-next"><span>${svIcon('arrow-right')}</span><span>${ixInline(w.next)}</span></div>`;
      h += `<div class="sv__poll-change">Tap another option to change your pick.</div></div>`;
    }
    return h + '</div>';
  }
  function pollPick(id, i) { (pollStates[id] || (pollStates[id] = {})).pick = i; ixRefresh(); }


  /* ---- Public API ---- */
  return {
    render, goToSlide, selectTocSlide, nextSlide, prevSlide,
    toggleFormulas, formulasBackdrop, toggleToc, revealAnswer,
    handleQuizAnswer, submitNumeric, toggleReveal, handleComplete,
    trackPracticeClick, trackProblemClick, bankXp: () => bankLessonXp(),
    flagSlide, submitSlideFlag, promptSignIn,
    runCode, onCodeInput, codeKeydown, resetCode, toggleCodeSolution,
    dsxSelect,
    ixMatchLeft, ixMatchRight, ixOrderAdd, ixOrderRemove, ixSortItem, ixSortBucket,
    ixCheck, ixDragStart, ixDrop, flipCard, stepGo,
    exSet, exReset, mmInput, mmHint, mmTrade, mmNext, mmReset, pdPick, pdReveal, pdGuess, pdPointer, pollPick, svPct,
  };
})();

window.SlideViewer = SlideViewer;
