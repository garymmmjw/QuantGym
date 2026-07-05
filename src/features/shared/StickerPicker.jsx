import { useAppServices } from "../../stores/usePageApi.js";
import { TEACHER_STICKERS, stickerLabel } from "./cosmetics.js";

/**
 * 讲师鲨鱼表情包选择器 — shared by the chat composer and the forum composer.
 * The parent gates rendering on ownership (`useOwnedCosmetic("teacher")`)
 * and on its own open state; this component is purely presentational.
 */
export function StickerPicker({ onPick, onClose }) {
  const appServices = useAppServices();
  const t = appServices?.t || ((key) => key);
  return (
    <div className="qg-sticker-pop" role="dialog" aria-label={t("stickerPanelAria")}>
      <div className="qg-sticker-pop-head">
        <strong>{t("stickerPanelTitle")}</strong>
        <button
          type="button"
          className="qg-sticker-pop-close"
          aria-label={t("stickerCloseAria")}
          title={t("stickerCloseTitle")}
          onClick={() => onClose?.()}
        >
          ×
        </button>
      </div>
      <div className="qg-sticker-grid">
        {TEACHER_STICKERS.map((sticker) => {
          const label = stickerLabel(sticker, t);
          return (
            <button
              key={sticker.id}
              type="button"
              className="qg-sticker-cell"
              title={label}
              aria-label={t("stickerSendAria", { label })}
              onClick={() => onPick?.(sticker)}
            >
              <img src={sticker.src} alt="" loading="lazy" draggable="false" />
            </button>
          );
        })}
      </div>
    </div>
  );
}
