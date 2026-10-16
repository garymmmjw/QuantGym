/**
 * fp-render.js — Renders mathematically accurate function plots using function-plot.js.
 *
 * Usage in slide markdown:
 *   <div class="fp-chart" data-config='{ "data": [{"fn": "x^2"}] }'></div>
 *
 * Config schema:
 *   title       — optional chart title
 *   xDomain     — [min, max] for x-axis (default: [-6, 6])
 *   yDomain     — [min, max] for y-axis (default: auto)
 *   width       — pixel width (default: container width, capped at 580)
 *   height      — pixel height (default: 350)
 *   grid        — show grid lines (default: true)
 *   xLabel      — x-axis label
 *   yLabel      — y-axis label
 *   data        — array of function specs:
 *     fn        — function expression, e.g. "x^2", "sin(x)"
 *     fnType    — "linear" (default), "parametric", "implicit", "points"
 *     color     — stroke color (default: "#3b82f6")
 *     dash      — boolean, dashed line
 *     closed    — boolean, close the path (for shading)
 *     range     — [min, max] for parametric t or x range
 *     x / y     — for parametric: "cos(t)", "sin(t)"
 *     points    — for scatter: [[x1,y1],[x2,y2],...]
 *     attr      — extra SVG attributes object
 *   annotations — array of annotation specs:
 *     x         — vertical line at x
 *     y         — horizontal line at y
 *     text      — label text
 */
const FpRender = (() => {
  'use strict';

  const DEFAULTS = {
    width: 580,
    height: 350,
    xDomain: [-6, 6],
    grid: true
  };

  function isDark() {
    return document.documentElement.getAttribute('data-theme') === 'dark';
  }

  function render(container) {
    if (typeof functionPlot === 'undefined') return;
    const charts = container.querySelectorAll('.fp-chart:not([data-rendered])');
    charts.forEach(el => {
      try {
        _renderOne(el);
        el.setAttribute('data-rendered', 'true');
      } catch (e) {
        console.warn('[fp-render] Failed to render chart:', e);
        el.innerHTML = '<div style="padding:16px;color:#ef4444;font-size:13px">⚠ Chart render error</div>';
      }
    });
  }

  function _decodeHtmlEntities(str) {
    // Decode common HTML entities that may appear in data-config attributes
    return str.replace(/&#39;/g, "'").replace(/&quot;/g, '"').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>');
  }

  function _renderOne(el) {
    let cfg;
    try {
      const raw = el.getAttribute('data-config');
      cfg = JSON.parse(_decodeHtmlEntities(raw));
    } catch (e) {
      throw new Error('Invalid data-config JSON: ' + e.message);
    }

    const dark = isDark();
    const axisColor = dark ? '#94a3b8' : '#64748b';
    const gridColor = dark ? 'rgba(148,163,184,0.15)' : 'rgba(0,0,0,0.06)';
    const bgColor = dark ? '#1e293b' : '#f8fafc';
    const textColor = dark ? '#e2e8f0' : '#333';

    // Compute width from container, capped
    const containerWidth = el.parentElement ? el.parentElement.offsetWidth : 580;
    const width = Math.min(cfg.width || DEFAULTS.width, containerWidth - 16);
    const height = cfg.height || DEFAULTS.height;

    // Build function-plot data array
    const data = (cfg.data || []).map(d => {
      const item = {};

      if (d.fnType === 'parametric') {
        item.fnType = 'parametric';
        item.x = d.x;
        item.y = d.y;
        if (d.range) item.range = d.range;
      } else if (d.fnType === 'implicit') {
        item.fnType = 'implicit';
        item.fn = d.fn;
      } else if (d.fnType === 'points' && d.points) {
        item.fnType = 'points';
        item.points = d.points;
        item.graphType = d.graphType || 'polyline';
      } else {
        item.fn = d.fn;
        if (d.range) item.range = d.range;
        if (d.closed) item.closed = true;
      }

      item.color = d.color || '#3b82f6';
      if (d.dash) {
        item.attr = Object.assign({ 'stroke-dasharray': '6,3' }, d.attr || {});
      } else if (d.attr) {
        item.attr = d.attr;
      }
      if (d.skipTip) item.skipTip = true;
      if (d.nSamples) item.nSamples = d.nSamples;
      return item;
    });

    // Build annotations
    const annotations = (cfg.annotations || []).map(a => ({
      x: a.x,
      y: a.y,
      text: a.text || ''
    }));

    // Build options
    const opts = {
      target: el,
      width: width,
      height: height,
      grid: cfg.grid !== undefined ? cfg.grid : DEFAULTS.grid,
      xAxis: { domain: cfg.xDomain || DEFAULTS.xDomain, label: cfg.xLabel || '' },
      data: data,
      annotations: annotations.length ? annotations : undefined,
      disableZoom: true,
      tip: { xLine: true, yLine: true }
    };

    if (cfg.yDomain) {
      opts.yAxis = { domain: cfg.yDomain, label: cfg.yLabel || '' };
    } else if (cfg.yLabel) {
      opts.yAxis = { label: cfg.yLabel };
    }

    if (cfg.title) {
      opts.title = cfg.title;
    }

    functionPlot(opts);

    // Post-render styling
    const svg = el.querySelector('svg');
    if (svg) {
      svg.style.background = bgColor;
      svg.style.borderRadius = '8px';
      svg.style.border = dark ? '1px solid #334155' : '1px solid #e2e8f0';

      // Style axis text
      svg.querySelectorAll('.tick text').forEach(t => { t.style.fill = axisColor; t.style.fontSize = '11px'; });
      svg.querySelectorAll('.axis path, .axis line').forEach(l => { l.style.stroke = axisColor; });

      // Style grid
      if (cfg.grid !== false) {
        svg.querySelectorAll('.grid line').forEach(l => { l.style.stroke = gridColor; });
      }

      // Axis labels + annotation labels: function-plot leaves them default black (invisible in dark mode) and draws
      // the x label inside the plot where a curve can run through it, so theme them and give them a halo.
      svg.querySelectorAll('.axis-label, .annotations text').forEach(t => {
        t.style.fill = textColor; t.style.paintOrder = 'stroke'; t.style.stroke = bgColor;
        t.style.strokeWidth = '3px'; t.style.strokeLinejoin = 'round';
      });

      // Style title
      const title = svg.querySelector('.title');
      if (title) { title.style.fill = textColor; title.style.fontSize = '13px'; title.style.fontWeight = '600'; }
    }
  }

  // Re-render on theme change
  const observer = new MutationObserver(mutations => {
    for (const m of mutations) {
      if (m.attributeName === 'data-theme') {
        document.querySelectorAll('.fp-chart[data-rendered]').forEach(el => {
          el.removeAttribute('data-rendered');
          el.innerHTML = '';
        });
        document.querySelectorAll('.sv__body').forEach(c => render(c));
        break;
      }
    }
  });
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  return { render };
})();

window.FpRender = FpRender;
