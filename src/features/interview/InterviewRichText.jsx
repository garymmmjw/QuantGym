import { useEffect, useRef } from "react";

export function InterviewRichText({ content, renderInto, className = "rich-text" }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !renderInto) return undefined;
    ref.current.innerHTML = "";
    renderInto(ref.current, content || "");
    return undefined;
  }, [content, renderInto]);

  return <div ref={ref} className={className} />;
}
