import React, { useEffect, useId, useRef, useState } from 'react';

const MIN_HEIGHT = 240;
const MAX_HEIGHT = 3200;
const clamp = value => Math.round(Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, value)));

export default function ResizableTable({ ownerId, namespace = '', view, footer, children }) {
  const preferenceKey = ownerId ? `quantgym.tracker-height.v1:${encodeURIComponent(ownerId)}:${encodeURIComponent(namespace)}` : '';
  const [height, setHeight] = useState(() => {
    try {
      const raw = preferenceKey && localStorage.getItem(preferenceKey);
      const value = Number(raw);
      return raw && Number.isFinite(value) && value > 0 ? clamp(value) : null;
    } catch { return null; }
  });
  const [measuredHeight, setMeasuredHeight] = useState(height || 320);
  const [resizing, setResizing] = useState(false);
  const viewport = useRef(null);
  const drag = useRef(null);
  const frame = useRef(null);
  const currentHeight = useRef(height);
  const viewportId = useId();
  const setSize = value => { currentHeight.current = value; setHeight(value); };
  const remember = value => {
    try {
      if (!preferenceKey) return;
      if (value === null) localStorage.removeItem(preferenceKey);
      else localStorage.setItem(preferenceKey, String(value));
    } catch { /* Resizing remains available when preferences cannot be saved. */ }
  };

  useEffect(() => {
    const measure = () => setMeasuredHeight(Math.round(viewport.current.getBoundingClientRect().height));
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(viewport.current);
    return () => { observer.disconnect(); cancelAnimationFrame(frame.current); };
  }, []);

  const updateDrag = () => {
    const state = drag.current;
    if (!state?.moved) return;
    setSize(clamp(state.startHeight + state.y + window.scrollY - state.startPageY));
  };
  const followPointer = () => {
    const state = drag.current;
    if (!state) return;
    if (state.moved) {
      // Let the page follow a drag at the viewport edge, so a long table can
      // grow beyond one screen without releasing and finding the handle again.
      const bottom = window.innerHeight - 48;
      const delta = state.y > bottom ? Math.min(18, (state.y - bottom) / 3)
        : state.y < 48 ? -Math.min(18, (48 - state.y) / 3) : 0;
      if ((delta > 0 && currentHeight.current < MAX_HEIGHT) || (delta < 0 && currentHeight.current > MIN_HEIGHT)) {
        window.scrollBy({ top: delta, behavior: 'instant' });
      }
      updateDrag();
    }
    frame.current = requestAnimationFrame(followPointer);
  };
  const finish = (event, cancelled = false) => {
    const state = drag.current;
    if (!state || state.pointerId !== event.pointerId) return;
    if (!cancelled) updateDrag();
    drag.current = null;
    cancelAnimationFrame(frame.current);
    setResizing(false);
    if (cancelled || !state.moved) setSize(state.previousHeight);
    else remember(currentHeight.current);
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId);
  };
  const reset = () => { if (!drag.current) { setSize(null); remember(null); } };

  return <>
    <div ref={viewport} id={viewportId} className={`qt-table-scroll qt-${view}`} tabIndex={0}
      aria-label="横向滚动查看申请进展" style={height === null ? undefined : { height, maxHeight: 'none' }}>
      {children}
    </div>
    {footer}
    <div className={`qt-table-resizer${resizing ? ' is-resizing' : ''}`} role="separator" tabIndex={0}
      aria-label="调整投递表格高度" aria-orientation="horizontal" aria-controls={viewportId}
      aria-valuemin={Math.min(MIN_HEIGHT, measuredHeight)} aria-valuemax={MAX_HEIGHT} aria-valuenow={measuredHeight}
      aria-valuetext={`${measuredHeight} 像素；上下方向键调整，回车恢复默认`}
      title="上下拖动调整高度 · 双击恢复默认" onDoubleClick={reset}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0 || drag.current) return;
        event.preventDefault();
        event.currentTarget.focus({ preventScroll: true });
        event.currentTarget.setPointerCapture(event.pointerId);
        drag.current = { pointerId: event.pointerId, startPageY: event.clientY + window.scrollY,
          startHeight: viewport.current.getBoundingClientRect().height, y: event.clientY,
          previousHeight: currentHeight.current, moved: false };
        setResizing(true);
        frame.current = requestAnimationFrame(followPointer);
      }}
      onPointerMove={event => {
        const state = drag.current;
        if (!state || state.pointerId !== event.pointerId) return;
        state.y = event.clientY;
        if (Math.abs(event.clientY + window.scrollY - state.startPageY) > 2) state.moved = true;
        updateDrag();
      }}
      onPointerUp={event => finish(event)} onPointerCancel={event => finish(event, true)}
      onLostPointerCapture={event => finish(event, true)}
      onKeyDown={event => {
        if (drag.current) return;
        if (event.key === 'Enter') { event.preventDefault(); reset(); return; }
        const step = event.shiftKey ? 120 : 40;
        const next = ({ ArrowDown: measuredHeight + step, ArrowUp: measuredHeight - step,
          Home: MIN_HEIGHT, End: MAX_HEIGHT })[event.key];
        if (next === undefined) return;
        event.preventDefault();
        setSize(clamp(next));
        remember(clamp(next));
      }}><span aria-hidden="true" /></div>
  </>;
}
