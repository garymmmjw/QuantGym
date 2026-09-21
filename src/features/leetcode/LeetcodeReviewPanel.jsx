import { useEffect, useRef, useState } from "react";
import { Check, X } from "lucide-react";
import { LeetcodeCardDraw } from "./LeetcodeCardDraw.jsx";

export function LeetcodeReviewPanel({ lc, practiceSessions = [], pool, selectedProblem, onSelect, now, onLockChange,
  onClose, autoDraw = true, saveState }) {
  const [drawing, setDrawing] = useState(false);
  const headingRef = useRef(null);
  const dialogRef = useRef(null);
  const closeRef = useRef(null);
  const restoreFocusFrame = useRef(null);
  const selectedOnce = useRef(false);
  const opening = useRef({ pool: [...pool], practiceSessions, now });
  const en = lc.language === "en";
  const t = (zh, english) => en ? english : zh;
  const locked = drawing || Boolean(lc.busy) || saveState?.phase === "saving";

  useEffect(() => { onLockChange?.(locked); }, [locked, onLockChange]);
  useEffect(() => () => onLockChange?.(false), [onLockChange]);
  useEffect(() => {
    window.cancelAnimationFrame(restoreFocusFrame.current);
    const dialog = dialogRef.current;
    const previousFocus = document.activeElement;
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    dialog.showModal();
    closeRef.current?.focus({ preventScroll: true });
    return () => {
      dialog.close();
      document.body.style.overflow = oldOverflow;
      // Let the parent's animation lock clear before restoring a disabled
      // opener. StrictMode's next setup cancels this deferred restoration.
      restoreFocusFrame.current = window.requestAnimationFrame(() => {
        if (!document.querySelector("dialog[open]") && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
          // A row's review button stays disabled once its card is in the bag.
          // Restore to that problem's link, or the page heading, in that case.
          const target = previousFocus.matches(":disabled")
            ? previousFocus.closest("tr")?.querySelector("a[href]") || previousFocus.closest("main")?.querySelector("h1")
            : previousFocus;
          if (!target) return;
          const temporaryTabIndex = !target.hasAttribute("tabindex") && target.tabIndex < 0;
          if (temporaryTabIndex) target.setAttribute("tabindex", "-1");
          target.focus({ preventScroll: true });
          if (temporaryTabIndex) target.removeAttribute("tabindex");
        }
      });
    };
  }, []);
  useEffect(() => {
    if (selectedProblem) headingRef.current?.focus({ preventScroll: true });
  }, [selectedProblem?.slug]);

  function select(problem) {
    // Saving can make lc busy while this card is still revealing. Neither that
    // state nor the animation lock should discard its one selection callback.
    if (!problem || autoDraw && selectedOnce.current) return;
    selectedOnce.current = true;
    onSelect(problem);
  }

  function keepFocus(event) {
    if (event.key !== "Tab") return;
    const focusable = [...dialogRef.current.querySelectorAll('button:not(:disabled), a[href], input:not(:disabled), select:not(:disabled), textarea:not(:disabled), [tabindex="0"]')]
      .filter(element => element.getClientRects().length > 0 && !element.closest("[inert]"));
    const first = focusable[0];
    const last = focusable.at(-1);
    const active = document.activeElement;
    if (event.shiftKey && (active === first || !focusable.includes(active))) {
      event.preventDefault(); last?.focus();
    } else if (!event.shiftKey && (active === last || !focusable.includes(active))) {
      event.preventDefault(); first?.focus();
    }
  }

  const showResult = !drawing && selectedOnce.current;
  return <dialog ref={dialogRef} className="lc-refined lc-draw-dialog" aria-labelledby="lc-review-title" aria-modal="true"
    onCancel={event => { event.preventDefault(); onClose(); }} onKeyDown={keepFocus}>
    <header className="lc-draw-dialog-heading">
      <h2 id="lc-review-title">{t("复习一下", "A card to review")}</h2>
      <button ref={closeRef} type="button" className="lc-draw-dialog-close" onClick={onClose} aria-label={t("关闭抽卡", "Close card draw")}><X size={18} aria-hidden="true" /></button>
    </header>
    <div className="lc-draw-dialog-body">
      <LeetcodeCardDraw pool={opening.current.pool} selectedProblem={selectedProblem} lc={lc} practiceSessions={opening.current.practiceSessions}
        now={opening.current.now} busy={lc.busy} autoDraw={autoDraw} headingRef={headingRef} onSelect={select} onDrawingChange={setDrawing} />
    </div>
    <footer className={`lc-draw-save-state${showResult && saveState?.phase ? ` is-${saveState.phase}` : ""}`}>
      {showResult && saveState?.phase === "saved" ? <><p role="status"><Check size={16} aria-hidden="true" />{t("已放入复习背包", "Added to your review backpack")}</p>
        <button type="button" className="lc-button is-primary" onClick={onClose}>{t("收好卡片", "Keep this card")}</button></>
        : showResult && saveState?.phase === "error" ? <><p role="alert">{saveState.message || t("暂时未能放入背包，请重试。", "Could not add the card. Please retry.")}</p>
          {typeof saveState.onRetry === "function" && <button type="button" className="lc-button" onClick={saveState.onRetry}>{t("重试保存", "Retry saving")}</button>}</>
          : <p role="status">{showResult && saveState?.phase === "saving" ? t("正在放入复习背包…", "Adding to your review backpack…")
            : !opening.current.pool.length ? t("当前没有可抽取的卡片。", "There are no cards to draw right now.") : t("每次抽取一张复习卡", "One review card at a time")}</p>}
    </footer>
  </dialog>;
}
