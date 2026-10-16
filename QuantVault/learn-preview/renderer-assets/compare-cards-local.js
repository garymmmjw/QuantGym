/* js/compare-cards.js — renderer for "Compare cards" (discriminator drills).
 * Duolingo-style interactive deck: segmented progress, streaks, sounds (WebAudio,
 * no assets), sparkles, slide-up feedback panel with Continue, results screen with
 * accuracy ring + retry-missed. Data-driven: feed it {topic, intro, cards[]}.
 * Designed to drop in as the end-of-chapter quiz for any topic.
 */
window.CompareCards = (function () {
  // A markdown currency escape (\$300) is a literal dollar: give it its own element so it shows as $300 and the
  // page's KaTeX auto-render (which pairs $ within one text node) never reads "$3.60, it pays $" as math.
  function esc(s) { return String(s == null ? '' : s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/\\\$/g, '<span class="cc-cur">$</span>'); }
  var KEYS = ['A', 'B', 'C', 'D', 'E'];
  var PRAISE = ['Nailed it!', 'Correct!', 'Sharp.', 'Exactly right.', 'Clean.'];
  var MISS = ['Not quite.', 'Close — but no.', 'Trap sprung.', 'That’s the trap.'];

  /* ---- tiny WebAudio sound kit (no asset files) ---- */
  var Sfx = (function () {
    var ctx = null, muted = false;
    try { muted = localStorage.getItem('qv-cc-muted') === '1'; } catch (e) { }
    function ac() {
      if (!ctx) { var AC = window.AudioContext || window.webkitAudioContext; if (AC) ctx = new AC(); }
      if (ctx && ctx.state === 'suspended') ctx.resume();
      return ctx;
    }
    function note(freq, at, dur, type, vol) {
      var c = ac(); if (!c) return;
      var o = c.createOscillator(), g = c.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      var t = c.currentTime + (at || 0);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(vol || 0.16, t + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, t + (dur || 0.15));
      o.connect(g); g.connect(c.destination);
      o.start(t); o.stop(t + (dur || 0.15) + 0.05);
    }
    return {
      isMuted: function () { return muted; },
      toggle: function () { muted = !muted; try { localStorage.setItem('qv-cc-muted', muted ? '1' : '0'); } catch (e) { } return muted; },
      correct: function () { if (muted) return; note(659.25, 0, 0.12, 'sine', 0.15); note(880, 0.09, 0.22, 'sine', 0.17); },
      wrong: function () { if (muted) return; note(196, 0, 0.2, 'triangle', 0.18); note(146.83, 0.1, 0.26, 'triangle', 0.14); },
      tick: function () { if (muted) return; note(520, 0, 0.05, 'sine', 0.07); },
      fanfare: function () {
        if (muted) return;
        [523.25, 659.25, 783.99, 1046.5].forEach(function (f, k) { note(f, k * 0.11, 0.25, 'sine', 0.15); });
        note(1318.5, 0.44, 0.5, 'sine', 0.11);
      }
    };
  })();

  function render(root, data, opts) {
    opts = opts || {};
    var cards = data.cards || [];
    var i = 0;
    var answered = {};        // index -> chosen option
    var streak = 0, bestStreak = 0;
    var view = 'deck';        // 'deck' | 'results'
    var justAnswered = false; // paint hint: animate feedback in + sparkle
    var xpState = null;       // null | 'pending' | result object from opts.onComplete
    var completionFired = false; // onComplete runs once per mount (server also blocks double XP)

    function countCorrect() {
      var n = 0;
      for (var k = 0; k < cards.length; k++) if (answered[k] === cards[k].correct) n++;
      return n;
    }
    function allDone() {
      for (var k = 0; k < cards.length; k++) if (answered[k] == null) return false;
      return true;
    }
    function missedIdx() {
      var m = [];
      for (var k = 0; k < cards.length; k++) if (answered[k] != null && answered[k] !== cards[k].correct) m.push(k);
      return m;
    }

    /* ---- header: segmented progress + streak + mute ---- */
    function headerBar() {
      var segs = cards.map(function (_, k) {
        var cls = 'cc-seg';
        if (answered[k] != null) cls += (answered[k] === cards[k].correct ? ' is-right' : ' is-miss');
        if (k === i && view === 'deck') cls += ' is-cur';
        return '<span class="' + cls + '" data-go="' + k + '" title="Card ' + (k + 1) + '"></span>';
      }).join('');
      var streakChip = streak >= 2
        ? '<span class="cc-streak" aria-label="streak">&#128293;<b>' + streak + '</b></span>' : '';
      return '<div class="cc-deckbar">'
        + '<span class="cc-progress">' + (view === 'results' ? 'Done' : (i + 1) + ' / ' + cards.length) + '</span>'
        + '<span class="cc-segs">' + segs + '</span>'
        + streakChip
        + '<button class="cc-mute" data-mute aria-label="toggle sound">' + (Sfx.isMuted() ? '&#128263;' : '&#128266;') + '</button>'
        + '</div>';
    }

    function side(tag, s) {
      return '<div class="cc-side">'
        + '<div class="cc-side-tag">Setup ' + tag + '</div>'
        + '<div class="cc-side-label">' + esc(s.label) + '</div>'
        + '<div class="cc-side-sub">' + esc(s.sub || '') + '</div>'
        + '</div>';
    }

    function card() {
      var c = cards[i];
      var chosen = answered[i];
      var done = chosen != null;
      var right = done && chosen === c.correct;
      var html = '';

      html += '<div class="cc-card' + (justAnswered ? '' : ' cc-enter') + '">';
      html += '<span class="cc-axis">' + esc(c.axis) + '</span>';
      html += '<div class="cc-title">' + esc(c.title) + '</div>';

      if (c.a && c.b) {
        html += '<div class="cc-versus">'
          + side('A', c.a) + '<div class="cc-vs">VS</div>' + side('B', c.b)
          + '</div>';
      }

      html += '<div class="cc-q">' + esc(c.question) + '</div>';
      html += '<div class="cc-opts">';
      c.options.forEach(function (o, k) {
        var cls = 'cc-opt';
        var anim = '';
        if (done) {
          if (k === c.correct) { cls += ' is-correct'; if (justAnswered) anim = ' cc-pop'; }
          else if (k === chosen) { cls += ' is-wrong'; if (justAnswered) anim = ' cc-shake'; }
          else cls += ' is-dim';
        }
        var rat = done && (k === c.correct || k === chosen)
          ? '<span class="cc-opt-rat">' + esc((c.rationale || [])[k] || '') + '</span>' : '';
        html += '<button class="' + cls + anim + '" data-opt="' + k + '"' + (done ? ' disabled' : '')
          + (!done ? ' style="animation-delay:' + (k * 45) + 'ms"' : '') + '>'
          + '<span class="cc-opt-key">' + KEYS[k] + '</span>'
          + '<span class="cc-opt-body">' + esc(o) + rat + '</span></button>';
      });
      html += '</div>';

      /* feedback panel (Duolingo footer style, inline) */
      if (done) {
        var pool = right ? PRAISE : MISS;
        var head = pool[(i + (chosen || 0)) % pool.length];
        html += '<div class="cc-feedback ' + (right ? 'is-right' : 'is-miss') + (justAnswered ? ' cc-slideup' : '') + '">'
          + '<div class="cc-fb-head"><span class="cc-fb-ico">' + (right ? '&#10003;' : '&#10007;') + '</span>'
          + '<span class="cc-fb-word">' + head + '</span>'
          + (streak >= 2 && right ? '<span class="cc-fb-streak">&#128293; ' + streak + ' in a row</span>' : '')
          + '</div>'
          + '<div class="cc-reveal">'
          + '<h4>' + (c.a && c.b ? 'What changes' : 'Key idea') + '</h4><p class="cc-changes">' + esc(c.whatChanges) + '</p>'
          + '<div class="cc-trap"><h4>The trap</h4><p>' + esc(c.trap) + '</p></div>'
          + '</div>'
          + '<button class="cc-btn cc-btn--continue' + (right ? '' : ' cc-btn--miss') + '" data-nav="1">'
          + (i === cards.length - 1 && allDone() ? 'See results' : 'Continue') + ' &rarr;</button>'
          + '</div>';
      }

      /* nav (browse back; skip forward pre-answer) */
      html += '<div class="cc-nav">'
        + '<button class="cc-btn cc-btn--ghost" data-nav="-1"' + (i === 0 ? ' disabled' : '') + '>&larr; Back</button>'
        + (!done ? '<button class="cc-btn cc-btn--ghost" data-nav="1"' + (i === cards.length - 1 ? ' disabled' : '') + '>Skip &rarr;</button>' : '')
        + '</div>';

      html += '</div>';
      return html;
    }

    /* ---- XP banking (wired to the lesson-completion pipeline via opts.onComplete) ---- */
    function fireCompletion() {
      if (completionFired || typeof opts.onComplete !== 'function') return;
      completionFired = true;
      xpState = 'pending';
      var r;
      try { r = opts.onComplete(countCorrect(), cards.length); } catch (e) { r = null; }
      Promise.resolve(r).then(function (res) {
        xpState = res || { signedOut: true };
        paintXp();
      }, function () { xpState = { error: true }; paintXp(); });
    }
    function xpHtml() {
      if (!xpState) return '';
      if (xpState === 'pending') return '<div class="cc-xp cc-xp--pending">Banking XP&hellip;</div>';
      if (xpState.signedOut) {
        var t = 20 + (xpState.bonus || 0);
        return '<div class="cc-xp cc-xp--signin">You earned XP this run &mdash; <b>sign in</b> to bank it and keep your streak.</div>';
      }
      if (xpState.alreadyEarned) {
        return '<div class="cc-xp cc-xp--done">Quiz already completed &mdash; XP was banked on your first run'
          + (xpState.streak > 0 ? ' &middot; ' + xpState.streak + '-day streak' : '') + '</div>';
      }
      if (xpState.error) return '';
      var meta = [];
      if (xpState.leveledUp) meta.push('Reached level ' + xpState.level);
      if (xpState.streak > 0) meta.push(xpState.streak + '-day streak');
      return '<div class="cc-xp cc-xp--won">'
        + '<span class="cc-xp-amt">+' + (xpState.total || 0) + ' XP</span>'
        + '<span class="cc-xp-break">+' + (xpState.base || 20) + ' quiz &middot; +' + (xpState.bonus || 0) + ' accuracy</span>'
        + (meta.length ? '<span class="cc-xp-meta">' + meta.join(' &middot; ') + '</span>' : '')
        + '</div>';
    }
    function paintXp() {
      var slot = root.querySelector('#cc-xp-slot');
      if (slot) slot.innerHTML = xpHtml();
    }

    /* ---- results screen ---- */
    function results() {
      var total = cards.length, ok = countCorrect();
      var pct = total ? Math.round(100 * ok / total) : 0;
      var R = 52, CIRC = 2 * Math.PI * R;
      var missed = missedIdx();
      var html = '<div class="cc-card cc-enter cc-results">';
      html += '<div class="cc-res-ring">'
        + '<svg viewBox="0 0 120 120" width="140" height="140">'
        + '<circle class="cc-ring-bg" cx="60" cy="60" r="' + R + '"/>'
        + '<circle class="cc-ring-fg" cx="60" cy="60" r="' + R + '" stroke-dasharray="' + CIRC.toFixed(1) + '" stroke-dashoffset="' + CIRC.toFixed(1) + '" data-target="' + (CIRC * (1 - pct / 100)).toFixed(1) + '"/>'
        + '</svg><div class="cc-res-pct">' + pct + '%</div></div>';
      html += '<div class="cc-res-h">' + (pct === 100 ? 'Perfect run!' : pct >= 70 ? 'Solid.' : 'Round two?') + '</div>';
      html += '<div class="cc-res-sub">' + ok + ' / ' + total + ' correct &middot; best streak ' + bestStreak + '</div>';
      html += '<div id="cc-xp-slot">' + xpHtml() + '</div>';
      if (missed.length) {
        html += '<div class="cc-res-missed"><h4>Missed</h4>' + missed.map(function (k) {
          return '<button class="cc-res-miss" data-go="' + k + '"><span class="cc-res-miss-n">' + (k + 1) + '</span>' + esc(cards[k].title) + '</button>';
        }).join('') + '</div>';
      }
      html += '<div class="cc-res-actions">'
        + (missed.length ? '<button class="cc-btn cc-btn--continue" data-retry-missed>Retry missed (' + missed.length + ')</button>' : '')
        + '<button class="cc-btn cc-btn--ghost" data-restart>Restart deck</button>'
        + '</div>';
      html += '</div>';
      return html;
    }

    function paint() {
      root.innerHTML = '<div class="cc-wrap">'
        + (opts.showIntro && data.intro && view === 'deck' && i === 0 && answered[0] == null
          ? '<p class="cc-intro">' + esc(data.intro) + '</p>' : '')
        + headerBar()
        + (view === 'results' ? results() : card())
        + '</div>';
      // Math: decks may carry $...$ KaTeX (learn.html loads KaTeX + KatexRender).
      if (typeof KatexRender !== 'undefined' && KatexRender.render) {
        try { KatexRender.render(root); } catch (e) { }
      }
      if (view === 'results') {
        var fg = root.querySelector('.cc-ring-fg');
        if (fg) requestAnimationFrame(function () {
          requestAnimationFrame(function () { fg.style.strokeDashoffset = fg.getAttribute('data-target'); });
        });
      }
      if (justAnswered) {
        var fb = root.querySelector('.cc-feedback');
        if (fb && fb.scrollIntoView) setTimeout(function () {
          if (window.QGLearnEmbed) window.QGLearnEmbed.scrollToElement(fb, { behavior: 'smooth', block: 'nearest' });
          else fb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
        }, 120);
        var ok = root.querySelector('.cc-opt.is-correct .cc-opt-key');
        if (ok && answered[i] === cards[i].correct) sparkle(ok);
      }
      justAnswered = false;
    }

    /* sparkle burst on the correct option's key badge */
    function sparkle(el) {
      for (var k = 0; k < 8; k++) {
        var s = document.createElement('span');
        s.className = 'cc-spark';
        var ang = (Math.PI * 2 * k) / 8 + Math.random() * 0.6;
        var d = 22 + Math.random() * 18;
        s.style.setProperty('--dx', (Math.cos(ang) * d).toFixed(1) + 'px');
        s.style.setProperty('--dy', (Math.sin(ang) * d).toFixed(1) + 'px');
        el.appendChild(s);
        (function (sp) { setTimeout(function () { sp.remove(); }, 700); })(s);
      }
    }

    function answer(k) {
      answered[i] = k;
      var right = k === cards[i].correct;
      if (right) { streak++; bestStreak = Math.max(bestStreak, streak); Sfx.correct(); }
      else { streak = 0; Sfx.wrong(); }
      justAnswered = true;
      paint();
      ; /* Original analytics removed for local preview. */
    }

    function advance(dir) {
      if (dir > 0 && i === cards.length - 1) {
        if (allDone()) {
          view = 'results'; Sfx.fanfare(); fireCompletion(); paint();
          ; /* Original analytics removed for local preview. */
          return;
        }
        /* last card but some skipped -> jump to first unanswered */
        for (var k = 0; k < cards.length; k++) if (answered[k] == null) { i = k; break; }
        Sfx.tick(); paint(); return;
      }
      i = Math.max(0, Math.min(cards.length - 1, i + dir));
      Sfx.tick(); paint();
    }

    /* After moving to another card (Continue, Skip, Back, a progress segment, retry, results), bring the top of the
       deck back into view: the reader was down at the feedback panel and would otherwise land mid-card (user report
       2026-10-07). Only scrolls when the deck top is hidden, so short screens never jump. */
    function toDeckTop() {
      if (window.QGLearnEmbed) {
        window.QGLearnEmbed.scrollToElement(root, { behavior: 'instant', onlyIfAbove: true });
        return;
      }
      var gnav = document.querySelector('.nav, nav, header');
      var below = 8;
      if (gnav) { var pos = getComputedStyle(gnav).position; if (pos === 'sticky' || pos === 'fixed') below += gnav.getBoundingClientRect().bottom; }
      var top = root.getBoundingClientRect().top;
      if (top < below) {
        var smooth = !(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);
        window.scrollTo({ top: window.scrollY + top - below, behavior: smooth ? 'smooth' : 'auto' });
      }
    }

    root.addEventListener('click', function (e) {
      var opt = e.target.closest('[data-opt]');
      if (opt && view === 'deck' && answered[i] == null) { answer(+opt.getAttribute('data-opt')); return; }
      var nav = e.target.closest('[data-nav]');
      if (nav && view === 'deck') { advance(+nav.getAttribute('data-nav')); toDeckTop(); return; }
      var seg = e.target.closest('[data-go]');
      if (seg) { i = +seg.getAttribute('data-go'); view = 'deck'; Sfx.tick(); paint(); toDeckTop(); return; }
      var mute = e.target.closest('[data-mute]');
      if (mute) { Sfx.toggle(); paint(); return; }
      if (e.target.closest('[data-retry-missed]')) {
        var m = missedIdx();
        m.forEach(function (k) { delete answered[k]; });
        i = m.length ? m[0] : 0; view = 'deck'; streak = 0; Sfx.tick(); paint(); toDeckTop(); return;
      }
      if (e.target.closest('[data-restart]')) {
        answered = {}; i = 0; view = 'deck'; streak = 0; bestStreak = 0; Sfx.tick(); paint(); toDeckTop(); return;
      }
    });

    /* keyboard: A-D / 1-4 answer, Enter/Space continue */
    function onKey(e) {
      if (!root.isConnected) { document.removeEventListener('keydown', onKey); return; }
      if (/^(input|textarea|select)$/i.test((e.target && e.target.tagName) || '')) return;
      if (view !== 'deck') return;
      var c = cards[i];
      if (answered[i] == null) {
        var k = -1;
        if (/^[a-e]$/i.test(e.key)) k = e.key.toLowerCase().charCodeAt(0) - 97;
        else if (/^[1-5]$/.test(e.key)) k = +e.key - 1;
        if (k >= 0 && k < c.options.length) { answer(k); e.preventDefault(); }
      } else if (e.key === 'Enter' || e.key === ' ') { advance(1); toDeckTop(); e.preventDefault(); }
    }
    document.addEventListener('keydown', onKey);

    paint();
  }

  return { render: render };
})();
