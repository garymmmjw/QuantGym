import type { RefObject } from "react";
import { useEffect, useRef } from "react";

const focusableSelector = [
  "a[href]",
  "area[href]",
  "button:not([disabled])",
  "input:not([disabled]):not([type='hidden'])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "details > summary:first-of-type",
  "audio[controls]",
  "video[controls]",
  "iframe",
  "object",
  "embed",
  "[contenteditable]:not([contenteditable='false'])",
  "[tabindex]:not([tabindex='-1'])",
].join(",");

const modalStack: symbol[] = [];
let bodyScrollLockCount = 0;
let bodyOverflowBeforeLock = "";

const lockBodyScroll = () => {
  if (bodyScrollLockCount === 0) {
    bodyOverflowBeforeLock = document.body.style.overflow;
    document.body.style.overflow = "hidden";
  }
  bodyScrollLockCount += 1;

  return () => {
    bodyScrollLockCount = Math.max(0, bodyScrollLockCount - 1);
    if (bodyScrollLockCount === 0) {
      document.body.style.overflow = bodyOverflowBeforeLock;
      bodyOverflowBeforeLock = "";
    }
  };
};

const isCssHidden = (element: HTMLElement) => {
  const view = element.ownerDocument.defaultView;
  if (view === null) return false;

  let current: HTMLElement | null = element;
  while (current !== null) {
    const style = view.getComputedStyle(current);
    if (
      style.display === "none"
      || style.visibility === "hidden"
      || style.visibility === "collapse"
      || style.getPropertyValue("content-visibility") === "hidden"
    ) {
      return true;
    }
    current = current.parentElement;
  }
  return false;
};

const isHiddenByDisclosure = (element: HTMLElement) => {
  let ancestor = element.parentElement;
  while (ancestor !== null) {
    if (ancestor.matches("details:not([open])")) {
      const summary = Array.from(ancestor.children)
        .find((child) => child.tagName === "SUMMARY");
      if (summary === undefined || !summary.contains(element)) return true;
    }
    ancestor = ancestor.parentElement;
  }
  return false;
};

const isAvailableForFocus = (element: HTMLElement) => (
  !element.hasAttribute("disabled")
  && !element.hasAttribute("data-modal-focus-guard")
  && !element.matches(":disabled")
  && element.getAttribute("aria-disabled") !== "true"
  && element.closest("[hidden], [inert], [aria-hidden='true']") === null
  && element.closest("dialog:not([open])") === null
  && element.tabIndex >= 0
  && !isHiddenByDisclosure(element)
  && !isCssHidden(element)
);

const isNamedRadio = (element: HTMLElement): element is HTMLInputElement => (
  element.tagName === "INPUT"
  && (element as HTMLInputElement).type === "radio"
  && (element as HTMLInputElement).name !== ""
);

const normalizeRadioGroups = (elements: readonly HTMLElement[]) => elements.filter((element) => {
  if (!isNamedRadio(element)) return true;
  const group = elements.filter((candidate): candidate is HTMLInputElement => (
    isNamedRadio(candidate)
    && candidate.name === element.name
    && candidate.form === element.form
  ));
  const checked = group.find((candidate) => candidate.checked);
  return element === (checked ?? group[0]);
});

const sortBySequentialFocusOrder = (elements: readonly HTMLElement[]) => (
  elements
    .map((element, documentOrder) => ({ documentOrder, element }))
    .sort((left, right) => {
      const leftPositive = left.element.tabIndex > 0;
      const rightPositive = right.element.tabIndex > 0;
      if (leftPositive && rightPositive && left.element.tabIndex !== right.element.tabIndex) {
        return left.element.tabIndex - right.element.tabIndex;
      }
      if (leftPositive !== rightPositive) return leftPositive ? -1 : 1;
      return left.documentOrder - right.documentOrder;
    })
    .map(({ element }) => element)
);

const getFocusableElements = (container: HTMLElement) => {
  const available = Array.from(container.querySelectorAll<HTMLElement>(focusableSelector))
    .filter(isAvailableForFocus);
  return sortBySequentialFocusOrder(normalizeRadioGroups(available));
};

const focusModalBoundary = (panel: HTMLElement | null, edge: "first" | "last") => {
  if (panel === null) return;
  const focusableElements = getFocusableElements(panel);
  const target = edge === "first" ? focusableElements[0] : focusableElements.at(-1);
  (target ?? panel).focus({ preventScroll: true });
};

type ModalFocusOptions = Readonly<{
  open: boolean;
  panelRef: RefObject<HTMLElement | null>;
  initialFocusRef?: RefObject<HTMLElement | null> | undefined;
  returnFocusRef?: RefObject<HTMLElement | null> | undefined;
  onRequestClose: () => void;
}>;

export const useModalFocus = ({
  open,
  panelRef,
  initialFocusRef,
  returnFocusRef,
  onRequestClose,
}: ModalFocusOptions) => {
  const onRequestCloseRef = useRef(onRequestClose);

  useEffect(() => {
    onRequestCloseRef.current = onRequestClose;
  }, [onRequestClose]);

  useEffect(() => {
    if (!open || typeof document === "undefined") return undefined;

    const panel = panelRef.current;
    if (panel === null) return undefined;

    const stackEntry = Symbol("quantgym-modal");
    const previouslyFocused = document.activeElement instanceof HTMLElement
      ? document.activeElement
      : null;
    const requestedReturnFocus = returnFocusRef?.current;
    modalStack.push(stackEntry);
    const unlockBodyScroll = lockBodyScroll();

    const requestedInitialFocus = initialFocusRef?.current;
    const autofocusCandidate = panel.querySelector<HTMLElement>("[data-autofocus='true']");
    const autofocusTarget = autofocusCandidate !== null && isAvailableForFocus(autofocusCandidate)
      ? autofocusCandidate
      : undefined;
    const firstFocusable = getFocusableElements(panel)[0];
    const initialTarget = requestedInitialFocus !== undefined
      && requestedInitialFocus !== null
      && panel.contains(requestedInitialFocus)
      && isAvailableForFocus(requestedInitialFocus)
      ? requestedInitialFocus
      : (autofocusTarget ?? firstFocusable ?? panel);
    initialTarget.focus({ preventScroll: true });

    const handleKeyDown = (event: KeyboardEvent) => {
      if (modalStack.at(-1) !== stackEntry) return;

      if (event.key === "Escape") {
        event.preventDefault();
        event.stopPropagation();
        onRequestCloseRef.current();
        return;
      }
      if (event.key !== "Tab") return;

      const focusableElements = getFocusableElements(panel);
      if (focusableElements.length === 0) {
        event.preventDefault();
        panel.focus({ preventScroll: true });
        return;
      }

      const first = focusableElements[0];
      const last = focusableElements.at(-1);
      if (first === undefined || last === undefined) return;

      const activeElement = document.activeElement;
      const activeIsSequential = activeElement instanceof HTMLElement
        && focusableElements.includes(activeElement);
      if (event.shiftKey && (activeElement === first || !activeIsSequential)) {
        event.preventDefault();
        last.focus({ preventScroll: true });
      } else if (!event.shiftKey && (activeElement === last || !activeIsSequential)) {
        event.preventDefault();
        first.focus({ preventScroll: true });
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      unlockBodyScroll();
      const stackIndex = modalStack.lastIndexOf(stackEntry);
      if (stackIndex >= 0) modalStack.splice(stackIndex, 1);

      const restoreTarget = requestedReturnFocus ?? previouslyFocused;
      if (restoreTarget?.isConnected) restoreTarget.focus({ preventScroll: true });
    };
  }, [initialFocusRef, open, panelRef, returnFocusRef]);

  return {
    focusFirst: () => focusModalBoundary(panelRef.current, "first"),
    focusLast: () => focusModalBoundary(panelRef.current, "last"),
  };
};
