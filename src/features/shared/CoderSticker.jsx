import { useState } from "react";
import { usePageApi } from "../../stores/usePageApi.js";
import { useOwnedCosmetic } from "./cosmetics.js";

/**
 * 键盘侠鲨鱼贴纸 (shop item `coder`) — a dismissible corner decoration for
 * the resume workbench and the memory/notes page. Renders nothing unless
 * the item is owned; the "hidden" preference lives in localStorage per user
 * and is shared by both pages (dismiss once, hidden everywhere).
 */
const HIDDEN_PREF_PREFIX = "quantgym.cosmetics.coder.hidden.v1";

export function CoderSticker({ page = "" }) {
  const owned = useOwnedCosmetic("coder");
  const pageApi = usePageApi();
  const t = pageApi.t || ((key) => key);
  const userId = pageApi.getCurrentUser?.()?.id || "local-user";
  const prefKey = `${HIDDEN_PREF_PREFIX}:${userId}`;
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(prefKey) === "1";
    } catch {
      return false;
    }
  });

  if (!owned || hidden) return null;

  const dismiss = () => {
    try {
      localStorage.setItem(prefKey, "1");
    } catch {
      /* preference is best-effort */
    }
    setHidden(true);
  };

  return (
    <aside className={`qg-coder-sticker${page ? ` qg-coder-sticker-${page}` : ""}`} aria-label={t("coderStickerAria")}>
      <img
        src="/assets/generated/playful-precision/mascot-laptop-v2.png"
        alt=""
        aria-hidden="true"
        draggable="false"
        loading="lazy"
      />
      <button
        type="button"
        className="qg-coder-sticker-close"
        aria-label={t("coderStickerCloseAria")}
        title={t("coderStickerCloseTitle")}
        onClick={dismiss}
      >
        ×
      </button>
    </aside>
  );
}
