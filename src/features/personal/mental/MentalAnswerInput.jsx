import { useImperativeHandle, useLayoutEffect, useRef, useState } from 'react';
import { normalizeMentalAnswer } from './mentalEngine.js';

const SAVE_DELAY_MS = 150;

// The browser owns the live editing buffer. Saving the whole training history
// must not sit between a native insert/delete and the next keyboard event.
// Each question starts from its saved answer once. Store/cloud acknowledgements
// never write back into an editor that the user is already typing in.
export function MentalAnswerInput({ inputRef, draftRef, questionId, expectedAnswer, initialAnswer, onAnswer, ...props }) {
  const initialValue = useRef(initialAnswer);
  const draft = useRef({ value: initialAnswer, pending: false, composing: false, timer: null });
  const callbacks = useRef({ onAnswer, expectedAnswer });
  callbacks.current = { onAnswer, expectedAnswer };
  const pressed = useRef(new Set());
  const [longAnswer, setLongAnswer] = useState(initialAnswer.length > 4);

  function clearTimer() {
    window.clearTimeout(draft.current.timer);
    draft.current.timer = null;
  }
  function flush() {
    clearTimer();
    const current = draft.current;
    if (!current.pending) return;
    // Clear before notifying: a correct answer can synchronously unmount us.
    current.pending = false;
    callbacks.current.onAnswer(current.value);
  }
  function display(next) {
    const input = inputRef.current;
    if (input && input.value !== next) input.value = next;
    setLongAnswer(next.length > 4);
  }
  function edit(raw) {
    const next = normalizeMentalAnswer(raw);
    const current = draft.current;
    if (next === null) { display(current.value); return; }
    display(next);
    if (next === current.value) {
      if (current.pending && current.timer === null) current.timer = window.setTimeout(flush, SAVE_DELAY_MS);
      return;
    }
    current.value = next;
    current.pending = true;
    clearTimer();
    if (/^-?\d+$/.test(next) && Number(next) === callbacks.current.expectedAnswer) flush();
    else current.timer = window.setTimeout(flush, SAVE_DELAY_MS);
  }

  useImperativeHandle(draftRef, () => ({
    snapshot: () => ({ questionId, value: draft.current.value }),
    toggleSign() {
      if (draft.current.composing) return;
      const current = draft.current.value;
      edit(current.startsWith('-') ? current.slice(1) : `-${current}`);
      inputRef.current?.focus({ preventScroll: true });
    },
  }), [questionId]);

  useLayoutEffect(() => {
    const onHidden = () => { if (document.visibilityState === 'hidden') flush(); };
    window.addEventListener('blur', flush);
    window.addEventListener('pagehide', flush);
    window.addEventListener('beforeunload', flush);
    document.addEventListener('visibilitychange', onHidden);
    return () => {
      window.removeEventListener('blur', flush);
      window.removeEventListener('pagehide', flush);
      window.removeEventListener('beforeunload', flush);
      document.removeEventListener('visibilitychange', onHidden);
      flush();
    };
  }, []);

  return <input {...props} ref={inputRef}
    className={`pm-answer${longAnswer ? ' pm-answer-long' : ''}`}
    type="text" inputMode="numeric" enterKeyHint="done" pattern="-?[0-9]*"
    autoComplete="off" autoCorrect="off" spellCheck="false" defaultValue={initialValue.current}
    onCompositionStart={() => { draft.current.composing = true; clearTimer(); }}
    onCompositionEnd={event => { draft.current.composing = false; edit(event.currentTarget.value); }}
    onChange={event => {
      if (draft.current.composing || event.nativeEvent.isComposing) setLongAnswer(event.currentTarget.value.length > 4);
      else edit(event.currentTarget.value);
    }}
    onBlur={() => { pressed.current.clear(); flush(); }}
    onKeyUp={event => pressed.current.delete(event.code || event.key)}
    onKeyDown={event => {
      const key = event.code || event.key;
      // Repeats may edit this question. Only a held key carried across a
      // question boundary is ignored, so it cannot auto-answer the next one.
      if ((event.repeat && (event.key === 'Enter' || (/^[0-9-]$/.test(event.key) && !pressed.current.has(key))))
        || (event.key === 'Enter' && (draft.current.composing || event.nativeEvent.isComposing || event.keyCode === 229))) {
        event.preventDefault();
      } else pressed.current.add(key);
    }} />;
}
