import { useEffect, useRef } from "react";
import { clearMathTypeset } from "../../ui/mathTypeset.js";

export function ProblemRichText({ content, renderInto }) {
  const ref = useRef(null);
  const renderRef = useRef(renderInto);
  renderRef.current = renderInto;
  const canRender = typeof renderInto === "function";

  useEffect(() => {
    const host = ref.current;
    if (!host || !canRender) return undefined;
    // MathJax owns this immutable content version. A new question gets a new
    // node, so an outstanding typeset cannot overwrite the next question.
    const node = host.ownerDocument.createElement("div");
    host.replaceChildren(node);
    renderRef.current(node, content || "");
    return () => {
      node.remove();
      clearMathTypeset(node, { windowRef: host.ownerDocument.defaultView || globalThis });
    };
  }, [content, canRender]);

  return <div ref={ref} className="problem-detail-body" />;
}
