/* ============================================
   MARKDOWN RENDER — Shared lightweight markdown-to-HTML
   Extracted from notebook-renderer.js for reuse
   across problems, solutions, and notebook content.
   ============================================ */

const MarkdownRender = (() => {

  // Sentinel standing in for an escaped dollar (\$) while $/$$ math is detected.
  // Uses control chars that never appear in real content.
  const ESC_DOLLAR = 'ESCDOLLAR';

  function escapeHtml(str) {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  /**
   * Inline formatting: bold, italic, code, links
   */
  function inlineFormat(text) {
    // Code spans (do first to avoid conflicts). ESCAPE the content: inline code
    // is literal, so `!(a<b)`, `operator<`, `std::vector<T>` etc. must not be
    // parsed as HTML tags. Unescaped, a `<b`/`<a` inside code opened a phantom
    // element that swallowed following siblings — including $$...$$ math blocks,
    // which then sat inside <code> and were skipped by KaTeX (raw-LaTeX bug,
    // reported for the C++ Point2D solution 2026-07). Matches fenced-code (l.449).
    text = text.replace(/`([^`]+)`/g, function (m, code) {
      return '<code class="md-inline-code">' + escapeHtml(code) + '</code>';
    });
    // Bold + italic
    text = text.replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>');
    // Bold
    text = text.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
    // Italic. NOTE: no regex lookbehind here — Safari/WebKit only supports
    // lookbehind in 16.4+, and a `(?<!...)` literal throws a SyntaxError at
    // PARSE time on older Safari/iOS, which kills this whole file (so problems
    // wouldn't open at all). Bold/bold-italic already ran above, so any
    // remaining `*` are single; we capture the char before the opening `*`
    // (start-of-string or a non-`*`) and re-emit it instead of looking behind.
    text = text.replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, '$1<em>$2</em>');
    // Images (before links to avoid conflict)
    text = text.replace(/!\[([^\]]*)\]\(([^)]+)\)/g, '<img src="data/$2" alt="$1" class="sv__slide-img" loading="lazy">');
    // Links
    text = text.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

    return text;
  }

  /**
   * Render a blockquote with optional callout type detection.
   * Supports rich callout blocks for slide content:
   *   > 💡 **Key Insight:** text
   *   > 📊 **70%** of quant researchers...
   *   > ⚠ **Warning:** common mistake...
   *   > 📖 **Definition:** formal definition...
   *   > 📝 **Example:** worked example...
   */
  function renderBlockquote(lines) {
    const text = lines.join('\n');

    // Detect callout type and extract icon + label
    let calloutType = '';
    let icon = '';
    let label = '';

    // Icons are inline SVG (site rule: no emoji in UI); the regexes still
    // accept emoji markers in SOURCE content for detection.
    const CALLOUT_SVG = {
      insight: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M9 18h6"/><path d="M10 22h4"/><path d="M12 2a7 7 0 0 0-4 12.7c.6.5 1 1.4 1 2.3h6c0-.9.4-1.8 1-2.3A7 7 0 0 0 12 2z"/></svg>',
      stat: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><line x1="12" y1="20" x2="12" y2="10"/><line x1="18" y1="20" x2="18" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/></svg>',
      example: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/></svg>',
      warning: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      definition: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>',
      interview: '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></svg>'
    };
    // The callout's own leading marker decides its type (e.g. "> 🎯 **Interview Tip:**"); scanning the
    // whole text mislabeled an Interview Tip as Key Insight ("Tip") and any callout mentioning "example".
    const lead = (lines[0] || '').trim();
    const LEAD = [
      [/^🎯|^\*\*Interview\s+Tip/i, 'interview', 'Interview Tip'],
      [/^💡|^\*\*(Key\s+Insight|Intuition|Tip)/i, 'insight', 'Key Insight'],
      [/^⚠|^\*\*(Watch\s+Out|Warning|Caution|Common\s+Mistake)/i, 'warning', 'Watch Out'],
      [/^📖|^\*\*(Definition|Theorem|Lemma)/i, 'definition', 'Definition'],
      [/^📝|^\*\*(Example|Worked\s+Problem|Case\s+Study)/i, 'example', 'Example'],
      [/^📊|^\*\*(Key\s+Stat|Data\s+Point|By\s+the\s+Numbers)/i, 'stat', 'Key Stat'],
    ];
    for (const [re, t, l] of LEAD) { if (re.test(lead)) { calloutType = t; label = l; break; } }
    if (calloutType) {
      // matched by its leading marker above
    } else if (/💡|Key\s+Insight|Tip|Intuition/i.test(text)) {
      calloutType = 'insight'; label = 'Key Insight';
    } else if (/📊|Stat|Data\s+Point|By\s+the\s+Numbers/i.test(text)) {
      calloutType = 'stat'; label = 'Key Stat';
    } else if (/📝|Example|Worked\s+Problem|Case\s+Study/i.test(text)) {
      calloutType = 'example'; label = 'Example';
    } else if (/⚠|Warning|Caution|Common\s+Mistake|Watch\s+Out/i.test(text)) {
      calloutType = 'warning'; label = 'Watch Out';
    } else if (/📖|Definition|Theorem|Lemma|Formal/i.test(text)) {
      calloutType = 'definition'; label = 'Definition';
    }
    if (calloutType) icon = CALLOUT_SVG[calloutType];

    // If it's a typed callout, render as styled callout block
    if (calloutType) {
      // Strip the leading emoji/bold label from the first line
      let cleaned = [...lines];
      if (cleaned[0]) {
        cleaned[0] = cleaned[0]
          .replace(/^[💡📊📝⚠📖️🔑🎯]\s*/u, '')
          .replace(/^\*\*[^*]+\*\*:?\s*/, '')
          .trim();
      }

      const htmlContent = cleaned
        .map(l => l.trim() === '' ? '</p><p>' : inlineFormat(l))
        .join(' ');

      return `<div class="sv__callout sv__callout--${calloutType}">
        <div class="sv__callout-header">
          <span class="sv__callout-icon">${icon}</span>
          <span>${label}</span>
        </div>
        <div class="sv__callout-body"><p>${htmlContent}</p></div>
      </div>`;
    }

    // Default blockquote
    const htmlContent = lines
      .map(l => l.trim() === '' ? '</p><p>' : inlineFormat(l))
      .join(' ');

    return `<blockquote class="md-blockquote"><p>${htmlContent}</p></blockquote>`;
  }

  /**
   * Render a table from rows
   */
  function renderTable(rows) {
    if (rows.length === 0) return '';
    let html = '<div class="md-table-wrap"><table class="md-table">';
    html += '<thead><tr>';
    rows[0].forEach(cell => { html += `<th>${inlineFormat(cell)}</th>`; });
    html += '</tr></thead>';
    if (rows.length > 1) {
      html += '<tbody>';
      for (let i = 1; i < rows.length; i++) {
        html += '<tr>';
        rows[i].forEach(cell => { html += `<td>${inlineFormat(cell)}</td>`; });
        html += '</tr>';
      }
      html += '</tbody>';
    }
    html += '</table></div>';
    return html;
  }

  /**
   * Protect math blocks from paragraph wrapping.
   * Extracts display math ($$...$$) and LaTeX environments
   * (\begin{...}...\end{...}) spanning multiple lines,
   * replacing them with placeholders. After markdown processing,
   * the placeholders are restored.
   *
   * Uses §§ delimiters instead of \x00 to avoid null-byte issues
   * in browsers and DOM operations.
   */
  // Heuristic: is this "$...$" body actually English prose (a currency mis-pair)
  // rather than math? Real math carries LaTeX tokens (\ ^ _ { } = < > & ~) or is
  // short / few-worded; prose has several multi-letter words and none of those.
  function looksLikeProse(s) {
    if (!s || s.length <= 12) return false;
    if (/[\\^_{}=<>&~]/.test(s)) return false;
    const words = s.match(/[A-Za-z]{2,}/g) || [];
    return words.length >= 3;
  }

  function protectMathBlocks(md) {
    const placeholders = [];
    let counter = 0;

    // Escaped dollar (\$) -> sentinel FIRST, so the $ / $$ delimiter scans below
    // only ever see UNescaped $. Restored later as a literal $ in prose, or as \$
    // when it sits inside a math span (KaTeX turns \$ into a literal $). This is
    // what lets a statement write a currency amount as \$50 without the next real
    // $...$ mis-pairing and italicising the prose between them.
    md = md.split('\\$').join(ESC_DOLLAR);

    // Protect multi-line display math: $$...$$ spanning multiple lines
    md = md.replace(/\$\$([\s\S]*?)\$\$/g, (match) => {
      const key = `§§DISPLAY_MATH_${counter++}§§`;
      placeholders.push({ key, value: match, display: true });
      return key;
    });

    // Protect LaTeX environments: \begin{...}...\end{...}
    md = md.replace(/\\begin\{([^}]+)\}([\s\S]*?)\\end\{\1\}/g, (match) => {
      const key = `§§DISPLAY_MATH_${counter++}§§`;
      placeholders.push({ key, value: match, display: true });
      return key;
    });

    // Protect inline math: $...$ (single line, non-greedy)
    // This prevents markdown from interpreting *, _, etc. inside LaTeX
    md = md.replace(/\$([^\$\n]+?)\$/g, (match, content) => {
      // A "$...$" whose body is plain English prose (3+ real words, no LaTeX
      // tokens) is NOT math — it's a mis-paired currency amount, e.g.
      // "...a $50 fare that takes 2 hours and burns $20...". Treat both $ as
      // literal dollars (sentinel -> $) so the prose isn't italicised as math.
      if (looksLikeProse(content)) return match.split('$').join(ESC_DOLLAR);
      const key = `§§INLINE_MATH_${counter++}§§`;
      placeholders.push({ key, value: match, display: false });
      return key;
    });

    return { md, placeholders };
  }

  // HTML-escape the angle brackets (and ampersands) inside restored math so the
  // browser's HTML parser can't mis-read e.g. "$b<a$" as an <a> tag start (which
  // swallowed prose up to the next ">", e.g. inside "$V>a$"). KaTeX auto-render
  // reads element.textContent, where the browser decodes these entities back to
  // < > &, so the rendered math is identical — only the raw-HTML parse is fixed.
  function escMath(v) {
    return String(v).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  // Repair common authoring quirks that make KaTeX throw a parse error (and show
  // a red error box) — always-correct rewrites, never applied to alignment math:
  //   - a bare & inside \text{...} (and friends) -> \&   ("P&L", "M&A"). Only a
  //     BARE & is escaped: an already-escaped \& must be left alone, otherwise it
  //     becomes \\& (a linebreak + alignment tab) and KaTeX throws a red error.
  //     No lookbehind (old Safari throws on it) -- match the char before instead.
  //   - a bare operator name used as a sub/superscript -> braced ( X_\min -> X_{\min} )
  function fixKatexQuirks(v) {
    v = v.replace(/\\(text|mathrm|mbox|textrm|textsf|texttt|textbf|textit)\{([^{}]*)\}/g,
      function (m, cmd, inner) { return '\\' + cmd + '{' + inner.replace(/([^\\]|^)&/g, '$1\\&') + '}'; });
    v = v.replace(/([_^])\\(min|max|sup|inf|lim|det|gcd|deg|arg|dim|ker|argmin|argmax)(?![A-Za-z{])/g, '$1{\\$2}');
    return v;
  }

  // Inside a restored math span, an escaped-dollar sentinel must become \$ so
  // KaTeX renders a literal $; combine with the angle-bracket escaping above.
  function restoreMathValue(value) {
    return escMath(fixKatexQuirks(String(value).split(ESC_DOLLAR).join('\\$')));
  }

  function restoreMathBlocks(html, placeholders) {
    // Iterate in REVERSE order to handle nested placeholders correctly.
    // When inline math wraps a LaTeX environment, e.g. $L = \begin{pmatrix}...\end{pmatrix}$:
    //   placeholder[0] = inner \begin{pmatrix}...\end{pmatrix}  (created first by env regex)
    //   placeholder[1] = outer $L = §§DISPLAY_MATH_0§§$         (created second by $ regex)
    // Restoring outer first re-exposes the inner placeholder for the next iteration.
    for (let i = placeholders.length - 1; i >= 0; i--) {
      const { key, value, display } = placeholders[i];
      // Try wrapped in paragraph first
      const pWrapped = `<p class="md-p">${key}</p>`;
      if (html.includes(pWrapped)) {
        if (display) {
          // Display math ($$...$$) — wrap in a block div so it stays on its own line
          html = html.replace(pWrapped, `<div class="md-math-display">${restoreMathValue(value)}</div>`);
        } else {
          // Inline math that was the only content in a paragraph — keep <p>
          html = html.replace(pWrapped, `<p class="md-p">${restoreMathValue(value)}</p>`);
        }
      } else {
        // Placeholder is inside other content — replace in-place. Use a function
        // replacement so $ in the math value isn't treated as a $-pattern.
        html = html.replace(key, () => restoreMathValue(value));
      }
    }
    return html;
  }

  /**
   * Convert markdown string to HTML
   */
  function render(md) {
    if (!md) return '';

    // Protect math blocks before processing
    const { md: safeMd, placeholders } = protectMathBlocks(md);

    const lines = safeMd.split('\n');
    let result = [];
    let inList = false;
    let listType = 'ul'; // 'ul' or 'ol'

    // Does the OPEN list resume further down, with only blank or paragraph-ish
    // content (prose continuations, protected $$math$$ placeholders) in between?
    // Used to keep one list together instead of closing at every interruption —
    // closing there restarted the numbering, so every item rendered as "1."
    // (user-reported across many problems with display equations inside steps).
    const RE_LI_UL = /^[\*\-]\s+.+$/;
    const RE_LI_OL = /^\d+\.\s+.+$/;
    const RE_STRUCTURAL = /^(#{1,6}\s|\||:::|```|>|<|(-{3,}|\*{3,}|_{3,})\s*$)/;
    function listResumesAhead(start, type) {
      for (let j = start; j < lines.length; j++) {
        const t = lines[j].trim();
        if (t === '') continue;
        if (RE_LI_OL.test(t)) return type === 'ol';
        if (RE_LI_UL.test(t)) return type === 'ul';
        if (RE_STRUCTURAL.test(t)) return false;
        // paragraph-ish — keep scanning
      }
      return false;
    }
    let inTable = false;
    let inBlockquote = false;
    let blockquoteLines = [];
    let tableRows = [];

    for (let i = 0; i < lines.length; i++) {
      let line = lines[i];

      // Blockquotes (> prefix)
      if (/^>\s?(.*)$/.test(line.trim())) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        if (inTable) { result.push(renderTable(tableRows)); inTable = false; tableRows = []; }
        if (!inBlockquote) { inBlockquote = true; blockquoteLines = []; }
        blockquoteLines.push(RegExp.$1);
        continue;
      } else if (inBlockquote) {
        result.push(renderBlockquote(blockquoteLines));
        inBlockquote = false;
        blockquoteLines = [];
      }

      // HTML passthrough — emit raw HTML for SVG blocks and known HTML elements
      if (/^\s*<(svg|div|figure|section|aside|picture)[\s>]/i.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        if (inTable) { result.push(renderTable(tableRows)); inTable = false; tableRows = []; }
        if (inBlockquote) { result.push(renderBlockquote(blockquoteLines)); inBlockquote = false; blockquoteLines = []; }
        const tagName = line.match(/^\s*<(\w+)/i)[1].toLowerCase();
        const closeRe = new RegExp(`</${tagName}\\s*>`, 'i');
        let htmlLines = [line];
        if (!closeRe.test(line)) {
          i++;
          while (i < lines.length) {
            htmlLines.push(lines[i]);
            if (closeRe.test(lines[i])) break;
            i++;
          }
        }
        result.push(htmlLines.join('\n'));
        continue;
      }
      // Void HTML element passthrough — <img>, <br>, <hr> tags emitted raw
      if (/^\s*<img\b/i.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(line);
        continue;
      }

      // Headers
      if (/^######\s+(.+)$/.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(`<h6 class="md-h6">${inlineFormat(RegExp.$1)}</h6>`);
        continue;
      }
      if (/^#####\s+(.+)$/.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(`<h5 class="md-h5">${inlineFormat(RegExp.$1)}</h5>`);
        continue;
      }
      if (/^####\s+(.+)$/.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(`<h4 class="md-h4">${inlineFormat(RegExp.$1)}</h4>`);
        continue;
      }
      if (/^###\s+(.+)$/.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(`<h3 class="md-h3">${inlineFormat(RegExp.$1)}</h3>`);
        continue;
      }
      if (/^##\s+(.+)$/.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(`<h2 class="md-h2">${inlineFormat(RegExp.$1)}</h2>`);
        continue;
      }
      if (/^#\s+(.+)$/.test(line)) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push(`<h1 class="md-h1">${inlineFormat(RegExp.$1)}</h1>`);
        continue;
      }

      // Table rows
      if (/^\|(.+)\|$/.test(line.trim())) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        if (/^\|[-:\s|]+\|$/.test(line.trim())) continue; // skip separator
        if (!inTable) { inTable = true; tableRows = []; }
        const cells = line.trim().slice(1, -1).split('|').map(c => c.trim());
        tableRows.push(cells);
        continue;
      } else if (inTable) {
        result.push(renderTable(tableRows));
        inTable = false;
        tableRows = [];
      }

      // Unordered list items
      if (/^[\*\-]\s+(.+)$/.test(line.trim())) {
        if (inList && listType !== 'ul') { result.push('</ol>'); inList = false; }
        if (!inList) { result.push('<ul class="md-list">'); inList = true; listType = 'ul'; }
        result.push(`<li>${inlineFormat(RegExp.$1)}</li>`);
        continue;
      }

      // Ordered list items
      if (/^\d+\.\s+(.+)$/.test(line.trim())) {
        if (inList && listType !== 'ol') { result.push('</ul>'); inList = false; }
        if (!inList) { result.push('<ol class="md-list md-list--ordered">'); inList = true; listType = 'ol'; }
        result.push(`<li>${inlineFormat(RegExp.$1)}</li>`);
        continue;
      }

      // Blank line inside a list. Keep the list open if the next non-blank line
      // continues it ("loose" lists author items with a blank line between them).
      // Without this, each blank-separated ordered item became its own <ol>, so
      // every marker restarted and rendered "1." (reported across many problems).
      if (inList && line.trim() === '') {
        // Also tolerates intervening paragraph-ish content (display equations,
        // prose continuations) between items — listResumesAhead scans past it.
        if (listResumesAhead(i + 1, listType)) {
          continue; // same list continues after the blank — don't close it
        }
        result.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
        continue;
      }

      // Fenced collapsible proof blocks: :::proof Optional Title ... :::
      if (/^:::proof\s*(.*)$/.test(line.trim())) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        if (inTable) { result.push(renderTable(tableRows)); inTable = false; tableRows = []; }
        if (inBlockquote) { result.push(renderBlockquote(blockquoteLines)); inBlockquote = false; blockquoteLines = []; }
        const proofTitle = RegExp.$1.trim() || 'Proof';
        let proofLines = [];
        i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i].trim())) {
          proofLines.push(lines[i]);
          i++;
        }
        const proofBody = render(proofLines.join('\n'));
        result.push(`<details class="sv__proof"><summary class="sv__proof-summary"><span class="sv__proof-icon">📐</span> ${proofTitle}</summary><div class="sv__proof-body">${proofBody}</div></details>`);
        continue;
      }

      // Fenced callout blocks (:::insight, :::warning, :::definition, :::interview, :::example)
      const calloutMatch = line.trim().match(/^:::(insight|warning|definition|interview|example)(?:\s+(.+))?\s*$/);
      if (calloutMatch) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        if (inTable) { result.push(renderTable(tableRows)); inTable = false; tableRows = []; }
        if (inBlockquote) { result.push(renderBlockquote(blockquoteLines)); inBlockquote = false; blockquoteLines = []; }
        const calloutType = calloutMatch[1];
        const customTitle = calloutMatch[2] || null;
        const calloutMeta = {
          insight:    { icon: '💡', label: 'Key Insight' },
          warning:    { icon: '⚠️', label: 'Watch Out' },
          definition: { icon: '📖', label: 'Definition' },
          interview:  { icon: '🎯', label: 'Interview Tip' },
          example:    { icon: '🔍', label: 'Example' },
        };
        const m = calloutMeta[calloutType] || calloutMeta.insight;
        let calloutLines = [];
        i++;
        while (i < lines.length && !/^:::\s*$/.test(lines[i].trim())) {
          calloutLines.push(lines[i]);
          i++;
        }
        const bodyHtml = render(calloutLines.join('\n'));
        result.push(`<div class="sv__callout sv__callout--${calloutType}"><div class="sv__callout-header"><span class="sv__callout-icon">${m.icon}</span><span>${customTitle || m.label}</span></div><div class="sv__callout-body">${bodyHtml}</div></div>`);
        continue;
      }

      // Fenced code blocks
      if (/^```/.test(line.trim())) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        const lang = line.trim().replace(/^```/, '').trim() || '';
        let codeLines = [];
        i++;
        while (i < lines.length && !/^```\s*$/.test(lines[i].trim())) {
          codeLines.push(lines[i]);
          i++;
        }
        const langLabel = lang ? `<div class="md-code-label">${lang}</div>` : '';
        result.push(`<div class="md-code-container">${langLabel}<pre class="md-code"><code>${escapeHtml(codeLines.join('\n'))}</code></pre></div>`);
        continue;
      }

      // Horizontal rule
      if (/^(-{3,}|\*{3,}|_{3,})\s*$/.test(line.trim())) {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        result.push('<hr class="md-hr">');
        continue;
      }

      // KaTeX newcommand definitions — render hidden
      if (/^\$\\newcommand/.test(line.trim()) && /\}\$\s*$/.test(line.trim())) {
        result.push(`<span style="display:none">${line.trim()}</span>`);
        continue;
      }

      // Empty line
      if (line.trim() === '') {
        if (inList) { result.push(listType === 'ol' ? '</ol>' : '</ul>'); inList = false; }
        continue;
      }

      // Paragraph
      if (inList) {
        // Intervening content between items of a still-continuing list (display
        // equations, indented prose continuations) belongs INSIDE the previous
        // <li> — closing the list here restarted numbering at "1." every time.
        if (listResumesAhead(i + 1, listType) && result.length && /<\/li>$/.test(result[result.length - 1])) {
          result[result.length - 1] = result[result.length - 1].replace(/<\/li>$/, `<div class="md-li-cont">${inlineFormat(line.trim())}</div></li>`);
          continue;
        }
        result.push(listType === 'ol' ? '</ol>' : '</ul>');
        inList = false;
      }
      result.push(`<p class="md-p">${inlineFormat(line)}</p>`);
    }

    if (inList) result.push(listType === 'ol' ? '</ol>' : '</ul>');
    if (inTable) result.push(renderTable(tableRows));
    if (inBlockquote) result.push(renderBlockquote(blockquoteLines));

    let html = result.join('\n');

    // Restore math blocks
    html = restoreMathBlocks(html, placeholders);

    // Sentinels left in the HTML are dollars OUTSIDE math (an escaped \$, or a
    // prose currency mis-pair the guard caught). Emit each as an isolated inline
    // <span> so KaTeX auto-render — which only pairs $...$ WITHIN a single text
    // node — can't re-pair them and italicise the prose between two amounts.
    html = html.split(ESC_DOLLAR).join('<span class="md-cur">$</span>');

    return html;
  }

  return { render, inlineFormat, escapeHtml };
})();

window.MarkdownRender = MarkdownRender;
