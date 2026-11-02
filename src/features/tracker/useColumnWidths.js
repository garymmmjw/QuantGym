import { useEffect, useRef, useState } from 'react';

const MAX_COLUMN_WIDTH = 1200;
const clampWidth = (column, width) => Math.min(MAX_COLUMN_WIDTH, Math.max(column.minWidth, Math.round(width)));

function readWidths(storageKey) {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return {};
    return Object.fromEntries(Object.entries(saved).filter(([id, width]) =>
      /^(company|role|event-\d+|update|deadline)$/.test(id) && Number.isFinite(width) && width > 0));
  } catch { return {}; }
}

export default function useColumnWidths(storageKey) {
  const [widths, setWidths] = useState(() => readWidths(storageKey));
  const widthsRef = useRef(widths);
  const drag = useRef(null);
  const [resizingColumn, setResizingColumn] = useState(null);

  const saveWidths = next => {
    try { localStorage.setItem(storageKey, JSON.stringify(next)); } catch { /* Resizing still works when storage is unavailable. */ }
  };
  const updateWidths = (next, persist = false) => {
    widthsRef.current = next;
    setWidths(next);
    if (persist) saveWidths(next);
  };
  const getWidth = column => clampWidth(column, widths[column.id] ?? column.defaultWidth);
  const restorePointer = current => {
    document.body.style.cursor = current.cursor;
    document.body.style.userSelect = current.userSelect;
    if (current.target.hasPointerCapture(current.pointerId)) current.target.releasePointerCapture(current.pointerId);
  };
  const finishResize = (cancel = false) => {
    const current = drag.current;
    if (!current) return;
    drag.current = null;
    if (cancel) updateWidths(current.previousWidths);
    else saveWidths(widthsRef.current);
    setResizingColumn(null);
    restorePointer(current);
  };

  useEffect(() => {
    const cancelOnBlur = () => {
      const current = drag.current;
      if (!current) return;
      drag.current = null;
      widthsRef.current = current.previousWidths;
      setWidths(current.previousWidths);
      setResizingColumn(null);
      restorePointer(current);
    };
    window.addEventListener('blur', cancelOnBlur);
    return () => {
      window.removeEventListener('blur', cancelOnBlur);
      const current = drag.current;
      drag.current = null;
      if (current) restorePointer(current);
    };
  }, []);

  const resetColumn = column => {
    const next = { ...widthsRef.current };
    delete next[column.id];
    updateWidths(next, true);
  };
  const resizeHandleProps = column => ({
    role: 'separator',
    tabIndex: 0,
    'aria-label': `调整${column.label}列宽`,
    'aria-orientation': 'vertical',
    'aria-valuemin': column.minWidth,
    'aria-valuemax': MAX_COLUMN_WIDTH,
    'aria-valuenow': getWidth(column),
    'aria-valuetext': `${getWidth(column)} 像素`,
    title: '拖动调整列宽，双击恢复默认；左右方向键微调',
    onPointerDown: event => {
      if (event.button !== 0 || drag.current) return;
      event.preventDefault();
      const target = event.currentTarget;
      target.focus({ preventScroll: true });
      target.setPointerCapture(event.pointerId);
      drag.current = {
        column, target, pointerId: event.pointerId,
        startX: event.clientX,
        startWidth: getWidth(column), previousWidths: widthsRef.current,
        cursor: document.body.style.cursor, userSelect: document.body.style.userSelect,
      };
      document.body.style.cursor = 'col-resize';
      document.body.style.userSelect = 'none';
      setResizingColumn(column.id);
    },
    onPointerMove: event => {
      const current = drag.current;
      if (!current || current.pointerId !== event.pointerId) return;
      // Use pointer travel only: shrinking at the right edge also clamps scrollLeft.
      const offset = event.clientX - current.startX;
      const width = clampWidth(current.column, current.startWidth + offset);
      if (widthsRef.current[current.column.id] !== width) updateWidths({ ...widthsRef.current, [current.column.id]: width });
    },
    onPointerUp: event => { if (drag.current?.pointerId === event.pointerId) finishResize(); },
    onPointerCancel: event => { if (drag.current?.pointerId === event.pointerId) finishResize(true); },
    onLostPointerCapture: event => { if (drag.current?.pointerId === event.pointerId) finishResize(true); },
    onDoubleClick: () => resetColumn(column),
    onKeyDown: event => {
      if (event.key === 'Escape' && drag.current) {
        event.preventDefault();
        finishResize(true);
        return;
      }
      if (!['ArrowLeft', 'ArrowRight', 'Home'].includes(event.key) || drag.current) return;
      event.preventDefault();
      if (event.key === 'Home') return resetColumn(column);
      const step = (event.shiftKey ? 50 : 10) * (event.key === 'ArrowLeft' ? -1 : 1);
      updateWidths({ ...widthsRef.current, [column.id]: clampWidth(column, getWidth(column) + step) }, true);
    },
  });

  return { getWidth, resizeHandleProps, resizingColumn, resetWidths: () => updateWidths({}, true) };
}
