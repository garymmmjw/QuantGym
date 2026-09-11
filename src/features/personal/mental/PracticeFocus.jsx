import { useId, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import './practiceFocus.css';

let fullscreenSession = null;

function makeSession() {
  const previousFocus = document.activeElement === document.body ? null : document.activeElement;
  return {
    element: document.documentElement,
    previousFocus,
    focusScope: previousFocus?.closest?.('.personal-mental'),
    scrollX: window.scrollX,
    scrollY: window.scrollY,
    leases: new Set(),
    requested: false,
    entered: false,
    closed: false,
  };
}

function exitOwnedFullscreen(session) {
  if (!session.requested || document.fullscreenElement !== session.element) return;
  // A delayed request from a previous trial must not close a newer trial.
  if (fullscreenSession && fullscreenSession !== session) return;
  try { Promise.resolve(document.exitFullscreen?.()).catch(() => {}); } catch { /* Viewport focus mode remains available. */ }
}

/** Call directly from the Start event so browsers retain the user activation. */
export function requestPracticeFullscreen() {
  if (typeof document === 'undefined') return;
  if (fullscreenSession && !fullscreenSession.closed) return;
  const session = makeSession();
  fullscreenSession = session;

  if (!document.fullscreenElement && typeof session.element.requestFullscreen === 'function') {
    session.requested = true;
    try {
      Promise.resolve(session.element.requestFullscreen()).then(() => {
        session.entered = document.fullscreenElement === session.element;
        if (session.closed) exitOwnedFullscreen(session);
      }).catch(() => { session.requested = false; });
    } catch { session.requested = false; }
  }

  // If a guarded Start does not create a trial, do not leave the page fullscreen.
  window.setTimeout(() => {
    if (session.leases.size || session.closed) return;
    session.closed = true;
    exitOwnedFullscreen(session);
    if (fullscreenSession === session) fullscreenSession = null;
  }, 1000);
}

const FOCUSABLE = 'button:not(:disabled), input:not(:disabled), select:not(:disabled), textarea:not(:disabled), a[href], [tabindex]:not([tabindex="-1"])';
function focusableElements(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter(element => !element.closest('[inert]') && element.getClientRects().length);
}

/** A separate practice surface; the parent owns timing, cancellation and saving. */
export function PracticeFocus({ active = true, language = 'zh', title, onExit, children }) {
  const en = language === 'en';
  const titleId = useId();
  const dialogRef = useRef(null);
  const onExitRef = useRef(onExit);
  const exitRef = useRef(() => {});
  const [portal] = useState(() => typeof document === 'undefined' ? null : document.createElement('div'));
  onExitRef.current = onExit;

  useLayoutEffect(() => {
    if (!active || !portal) return undefined;
    const session = fullscreenSession && !fullscreenSession.closed ? fullscreenSession : makeSession();
    fullscreenSession = session;
    const lease = Symbol('practice');
    session.leases.add(lease);
    portal.className = 'pm-focus-portal';
    document.body.appendChild(portal);
    const dialog = dialogRef.current;
    let exiting = false;
    const finish = () => {
      if (exiting) return;
      exiting = true;
      onExitRef.current?.();
    };
    exitRef.current = finish;

    const bodyOverflow = document.body.style.overflow;
    const documentOverflow = document.documentElement.style.overflow;
    document.body.style.overflow = 'hidden';
    document.documentElement.style.overflow = 'hidden';

    // Move focus before hiding the application from assistive technology.
    (dialog.querySelector('input:not(:disabled)') || dialog).focus({ preventScroll: true });
    const background = new Map();
    const hideBackground = () => {
      for (const element of document.body.children) {
        if (element === portal || background.has(element) || !(element instanceof HTMLElement)) continue;
        background.set(element, { inert: element.inert, hidden: element.getAttribute('aria-hidden') });
        element.inert = true;
        element.setAttribute('aria-hidden', 'true');
      }
    };
    hideBackground();
    const observer = new MutationObserver(hideBackground);
    observer.observe(document.body, { childList: true });

    const handleKeyDown = event => {
      if (event.key === 'Escape') {
        event.preventDefault();
        event.stopImmediatePropagation();
        finish();
        return;
      }
      if (event.key !== 'Tab') return;
      const elements = focusableElements(dialog);
      const first = elements[0];
      const last = elements[elements.length - 1];
      if (!first) { event.preventDefault(); dialog.focus({ preventScroll: true }); return; }
      if (event.shiftKey && (document.activeElement === first || !elements.includes(document.activeElement))) {
        event.preventDefault(); last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (document.activeElement === last || !elements.includes(document.activeElement))) {
        event.preventDefault(); first.focus({ preventScroll: true });
      }
    };
    const retainFocus = event => {
      if (!dialog.contains(event.target)) (dialog.querySelector('input:not(:disabled)') || dialog).focus({ preventScroll: true });
    };
    const handleFullscreenChange = () => {
      if (!session.requested) return;
      if (document.fullscreenElement === session.element) session.entered = true;
      else if (session.entered) finish();
    };
    window.addEventListener('keydown', handleKeyDown, true);
    document.addEventListener('focusin', retainFocus, true);
    document.addEventListener('fullscreenchange', handleFullscreenChange);

    return () => {
      exiting = true;
      observer.disconnect();
      window.removeEventListener('keydown', handleKeyDown, true);
      document.removeEventListener('focusin', retainFocus, true);
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      for (const [element, original] of background) {
        element.inert = original.inert;
        if (original.hidden == null) element.removeAttribute('aria-hidden');
        else element.setAttribute('aria-hidden', original.hidden);
      }
      document.body.style.overflow = bodyOverflow;
      document.documentElement.style.overflow = documentOverflow;
      portal.remove();
      session.leases.delete(lease);

      // React StrictMode replays effects. Defer only the final release so a replay
      // cannot exit native fullscreen or steal focus from the new effect.
      queueMicrotask(() => {
        if (session.leases.size) return;
        session.closed = true;
        exitOwnedFullscreen(session);
        if (fullscreenSession === session) fullscreenSession = null;
        window.requestAnimationFrame(() => {
          if (fullscreenSession) return;
          const target = session.previousFocus?.isConnected
            ? session.previousFocus
            : session.focusScope?.querySelector('[data-pm-start]') || document.querySelector('[data-pm-start]');
          target?.focus({ preventScroll: true });
          window.scrollTo({ left: session.scrollX, top: session.scrollY, behavior: 'instant' });
        });
      });
    };
  }, [active, portal]);

  if (!active || !portal) return null;
  return createPortal(<div ref={dialogRef} className="personal-mental pm-focus" role="dialog" aria-modal="true" aria-labelledby={titleId} tabIndex={-1}>
    <header className="pm-focus-header">
      <div className="pm-focus-identity"><span className="pm-focus-dot" aria-hidden="true" /><span id={titleId}>{title}</span><span className="pm-focus-mode">{en ? 'Focus mode' : '专注练习'}</span></div>
      <button type="button" className="pm-focus-exit" onClick={() => exitRef.current()}><span>{en ? 'Exit practice' : '退出练习'}</span><kbd>Esc</kbd></button>
    </header>
    <div className="pm-focus-content">{children}</div>
  </div>, portal);
}
