/* ============================================
   NOTEBOOK RENDERER — Client-side .ipynb viewer
   Renders Jupyter notebooks as interactive HTML
   with KaTeX math, syntax-highlighted code, and
   collapsible sections.
   Delegates markdown parsing to MarkdownRender.
   ============================================ */

const NotebookRenderer = (() => {

  /**
   * Fetch and render a .ipynb file into a target element
   */
  async function render(notebookPath, targetEl) {
    targetEl.innerHTML = `
      <div class="nb-loading">
        <div class="empty-state__icon" style="font-size:2rem">&#9881;</div>
        <div style="color:var(--text-muted);font-size:var(--text-sm)">Loading notebook...</div>
      </div>
    `;

    try {
      const nb = notebookPath;
      const html = renderNotebook(nb);
      targetEl.innerHTML = html;

      // Render math with KaTeX
      if (typeof renderMathInElement === 'function') {
        renderMathInElement(targetEl, {
          delimiters: [
            { left: '$$', right: '$$', display: true },
            { left: '$', right: '$', display: false },
            { left: '\\[', right: '\\]', display: true },
            { left: '\\(', right: '\\)', display: false },
            { left: '\\begin{align}', right: '\\end{align}', display: true },
            { left: '\\begin{align*}', right: '\\end{align*}', display: true },
            { left: '\\begin{equation}', right: '\\end{equation}', display: true },
            { left: '\\begin{equation*}', right: '\\end{equation*}', display: true },
            { left: '\\begin{gather}', right: '\\end{gather}', display: true },
            { left: '\\begin{gather*}', right: '\\end{gather*}', display: true },
          ],
          throwOnError: false,
          trust: false,
          macros: {
            '\\R': '\\mathbb{R}',
            '\\E': '\\mathbb{E}',
            '\\P': '\\mathbb{P}',
            '\\Var': '\\text{Var}',
            '\\Cov': '\\text{Cov}',
            '\\Corr': '\\text{Corr}',
            '\\N': '\\mathcal{N}',
            '\\iid': '\\stackrel{\\text{iid}}{\\sim}',
          },
        });
      }
    } catch (err) {
      targetEl.innerHTML = `
        <div class="empty-state" style="min-height:200px">
          <div class="empty-state__icon">&#128466;</div>
          <div class="empty-state__title">Could not load notebook</div>
          <p style="color:var(--text-muted);font-size:var(--text-sm)">${err.message}</p>
        </div>
      `;
    }
  }

  /**
   * Convert notebook JSON to HTML string
   */
  function renderNotebook(nb) {
    const cells = nb.cells || [];
    let html = '<div class="nb">';

    for (let i = 0; i < cells.length; i++) {
      const cell = cells[i];
      const src = getSource(cell);

      if (cell.cell_type === 'markdown') {
        const isHR = /^\*{3,}$|^-{3,}$/.test(src.trim());
        if (isHR) continue;

        html += `<div class="nb-cell nb-cell--md">${markdownToHtml(src)}</div>`;
      } else if (cell.cell_type === 'code') {
        const outputs = cell.outputs || [];
        const hasOutput = outputs.length > 0;

        html += `<div class="nb-cell nb-cell--code">`;
        html += `<div class="nb-code-container">`;
        html += `<div class="nb-code-label">Python</div>`;
        html += `<pre class="nb-code"><code>${MarkdownRender.escapeHtml(src)}</code></pre>`;
        html += `</div>`;

        if (hasOutput) {
          html += renderOutputs(outputs);
        }

        html += `</div>`;
      }
    }

    html += '</div>';
    return html;
  }

  /**
   * Get source text from a cell (handles string or array)
   */
  function getSource(cell) {
    const src = cell.source;
    if (Array.isArray(src)) return src.join('');
    return src || '';
  }

  /**
   * Convert notebook markdown to HTML with DRW content stripping.
   * Delegates actual parsing to the shared MarkdownRender module.
   */
  function markdownToHtml(md) {
    // DRW/Sageark content stripping — remove references before rendering
    md = md.replace(/DRW\s+New-Hire\s+Learning\s+Program/gi, 'Quant Finance Program');
    md = md.replace(/###\s*DRW.*$/gm, '');
    md = md.replace(/####\s*Summer\s+2023.*$/gm, '');
    md = md.replace(/\*\s*Contact:\s*Mark\s+Hendricks.*$/gm, '');
    md = md.replace(/\*\s*hendricks@.*$/gm, '');
    md = md.replace(/https:\/\/PollEv\.com\/.*$/gm, '');

    return MarkdownRender.render(md);
  }

  /**
   * Render cell outputs
   */
  function renderOutputs(outputs) {
    let html = '';
    for (const output of outputs) {
      if (output.output_type === 'stream') {
        const text = (output.text || []).join('');
        if (text.trim()) {
          html += `<pre class="nb-output nb-output--text">${MarkdownRender.escapeHtml(text)}</pre>`;
        }
      } else if (output.output_type === 'execute_result' || output.output_type === 'display_data') {
        const data = output.data || {};
        if (data['image/png']) {
          html += `<div class="nb-output nb-output--image"><img src="data:image/png;base64,${data['image/png']}" alt="Output" /></div>`;
        } else if (data['text/html']) {
          const htmlContent = Array.isArray(data['text/html']) ? data['text/html'].join('') : data['text/html'];
          html += `<div class="nb-output nb-output--html">${htmlContent}</div>`;
        } else if (data['text/plain']) {
          const text = Array.isArray(data['text/plain']) ? data['text/plain'].join('') : data['text/plain'];
          html += `<pre class="nb-output nb-output--text">${MarkdownRender.escapeHtml(text)}</pre>`;
        }
      } else if (output.output_type === 'error') {
        // Skip errors in rendered view
      }
    }
    return html;
  }

  return { render };
})();

window.NotebookRenderer = NotebookRenderer;
