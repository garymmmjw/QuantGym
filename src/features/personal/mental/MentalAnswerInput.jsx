import { useRef, useState } from 'react';

// Remount for each question so a trailing composition/change event cannot submit
// the previous answer against the next question (which may have the same answer).
export function MentalAnswerInput({ inputRef, value, onAnswer, ...props }) {
  const composing = useRef(false);
  const [compositionValue, setCompositionValue] = useState(null);
  const displayedValue = compositionValue ?? value;

  return <input {...props} ref={inputRef}
    className={`pm-answer${displayedValue.length > 4 ? ' pm-answer-long' : ''}`}
    type="text" inputMode="numeric" enterKeyHint="done" pattern="-?[0-9]*"
    autoComplete="off" autoCorrect="off" spellCheck="false" value={displayedValue}
    onCompositionStart={event => {
      composing.current = true;
      setCompositionValue(event.currentTarget.value);
    }}
    onCompositionEnd={event => {
      composing.current = false;
      setCompositionValue(null);
      onAnswer(event.currentTarget.value);
    }}
    onChange={event => {
      if (composing.current || event.nativeEvent.isComposing) {
        setCompositionValue(event.currentTarget.value);
      } else {
        onAnswer(event.currentTarget.value);
      }
    }}
    onKeyDown={event => {
      // Keep deletion/navigation repeatable, but a held answer key or Enter must
      // not solve more questions or produce multiple incorrect submissions.
      if ((event.repeat && /^(?:[0-9-]|Enter)$/.test(event.key))
        || (event.key === 'Enter' && (composing.current || event.nativeEvent.isComposing || event.keyCode === 229))) {
        event.preventDefault();
      }
    }} />;
}
