import { useEffect, useRef, useState } from 'react';
import { renderRichText } from '../../../modules/interview/richText.js';
import { scheduleMathContent } from './mathContent.js';

export function DailyQuestionText({ content = '', className = '', language = 'zh' }) {
  const hostRef = useRef(null);
  const [retry, setRetry] = useState(0);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const host = hostRef.current;
    const node = document.createElement('div');
    renderRichText(node, content, { language });
    host.replaceChildren(node);
    setFailed(false);
    const details = host.closest('details');
    let job, disposed = false, formatted = false;
    const typeset = () => {
      if (disposed || formatted || job || (details && !details.open)) return;
      if (!/[\\$]/.test(content)) return;
      job = scheduleMathContent(node, { windowRef: window, isVisible: () => !details || details.open });
      job.done.then(result => { formatted = result; }).catch(() => {
        if (!disposed) setFailed(true);
      }).finally(() => { job = null; });
    };
    details?.addEventListener('toggle', typeset);
    typeset();
    return () => {
      disposed = true;
      details?.removeEventListener('toggle', typeset);
      job?.cancel();
      window.MathJax?.typesetClear?.([node]);
    };
  }, [content, language, retry]);

  return <div className={className}>
    <div ref={hostRef} className="pd-math-content" />
    {failed && <button className="pd-math-retry" type="button" onClick={() => setRetry(value => value + 1)}>{language === 'en' ? 'Retry loading formulas' : '重新加载公式'}</button>}
  </div>;
}
