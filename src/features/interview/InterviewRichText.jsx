import { useLayoutEffect, useRef } from "react";
import { useAppStore, useAuthStore } from '../../stores/AppServicesContext.jsx';
import { createPrivateMediaRenderContext } from '../../modules/interview/privateRichMedia.js';

export function InterviewRichText({ content, renderInto, className = "rich-text" }) {
  const ref = useRef(null);
  const ownerId = useAuthStore(state => state.currentUser?.id || '');
  const config = useAppStore(state => state.cloudConfig || {});
  const identity = JSON.stringify([ownerId, config.endpoint, config.userId, config.token]);

  useLayoutEffect(() => {
    if (!ref.current || !renderInto) return undefined;
    const privateMedia = createPrivateMediaRenderContext({ config, ownerId });
    ref.current.innerHTML = "";
    renderInto(ref.current, content || "", { privateMedia });
    return () => privateMedia.dispose();
  }, [content, renderInto, identity]);

  return <div key={identity} ref={ref} className={className} />;
}
