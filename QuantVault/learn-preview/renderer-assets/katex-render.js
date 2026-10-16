/* ============================================
   KATEX RENDER — Auto-render LaTeX on page
   ============================================ */

const KatexRender = (() => {
  const OPTS = {
    delimiters: [
      { left: '$$', right: '$$', display: true },
      { left: '$', right: '$', display: false },
      { left: '\\(', right: '\\)', display: false },
      { left: '\\[', right: '\\]', display: true },
    ],
    throwOnError: false,
    // OA-replica content (games + their SEO doc sections) is math-free but
    // full of currency dollars ("$63 bankroll ... exactly $0") — the single-$
    // delimiter above was eating the text between two prices as inline math.
    ignoredClasses: ['oar', 'oar-doc', 'oar-doc__head'],
  };

  // KaTeX auto-render (renderMathInElement) ships as a DEFERRED CDN script, so a
  // render call fired before it loads (e.g. a gated Pro statement that hydrates
  // the instant its fetch resolves on a slow link) used to SILENTLY no-op forever,
  // leaving the math as raw "$X \sim \text{Exp}$" source. whenReady() waits and
  // retries (every 80ms, up to ~8s) so late-arriving auto-render still renders
  // content that was injected before it was ready. Reported by a Pro user 2026-06.
  function whenReady(fn, tries) {
    tries = tries || 0;
    if (typeof renderMathInElement === 'function') { fn(); return; }
    if (tries > 100) return;   // ~8s — give up rather than spin forever
    setTimeout(function () { whenReady(fn, tries + 1); }, 80);
  }

  function renderMath(el) {
    whenReady(function () { renderMathInElement(el || document.body, OPTS); });
  }

  // Incremental render: do the first (visible, above-the-fold) math block
  // synchronously so the statement's math appears instantly, then spread the
  // remaining blocks (solution / hints / intuition — often hidden or below the
  // fold) across animation frames so a problem with lots of math doesn't block
  // the main thread for ~100ms on open. Falls back to a full pass if there are
  // no discrete .math-content blocks.
  function renderMathAsync(root) {
    whenReady(function () { renderMathAsyncNow(root); });
  }
  function renderMathAsyncNow(root) {
    root = root || document.body;
    const blocks = Array.prototype.slice.call(root.querySelectorAll('.math-content'));
    if (blocks.length <= 1) { renderMath(root); return; }
    try { renderMathInElement(blocks[0], OPTS); } catch (e) {}
    let i = 1;
    const batch = () => {
      const end = Math.min(i + 1, blocks.length);
      for (; i < end; i++) {
        if (!blocks[i].isConnected) continue;  // navigated away — skip detached nodes
        try { renderMathInElement(blocks[i], OPTS); } catch (e) {}
      }
      if (i < blocks.length) requestAnimationFrame(batch);
    };
    requestAnimationFrame(batch);
  }

  // Render on page load. Skipped while a static problem page hydrates: its hidden
  // prerendered article is replaced by the app (which renders its own math), and
  // this whole-body pass cost ~300ms of main thread on a phone.
  document.addEventListener('DOMContentLoaded', () => {
    if (document.documentElement.classList.contains('qv-hydrate')) return;
    setTimeout(() => renderMath(), 100);
  });

  return { render: renderMath, renderAsync: renderMathAsync };
})();

window.KatexRender = KatexRender;
