import { useEffect, useRef } from "react";

export function ProblemRichText({ content, renderInto }) {
  const ref = useRef(null);

  useEffect(() => {
    if (!ref.current || !renderInto) return undefined;
    ref.current.innerHTML = "";
    renderInto(ref.current, content || "");
    return undefined;
  }, [content, renderInto]);

  return <div ref={ref} className="problem-detail-body" />;
}
