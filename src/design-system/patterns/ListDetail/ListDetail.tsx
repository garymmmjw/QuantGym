import {
  useEffect,
  useId,
  useRef,
  type ReactNode,
  type RefObject,
} from "react";

import { Button } from "../../primitives/Button";
import styles from "./ListDetail.module.css";

export type ListDetailMobileView = "list" | "detail";

export type ListDetailProps = Readonly<{
  detail: ReactNode;
  detailLabel: string;
  list: ReactNode;
  listLabel: string;
  onBack: () => void;
  ariaLabel?: string;
  backLabel?: string;
  className?: string;
  detailHeading?: ReactNode;
  emptyDetail?: ReactNode;
  mobileView?: ListDetailMobileView;
  returnFocusRef?: RefObject<HTMLElement | null>;
}>;

export function ListDetail({
  ariaLabel = "List and detail workspace",
  backLabel = "Back to list",
  className,
  detail,
  detailHeading,
  detailLabel,
  emptyDetail,
  list,
  listLabel,
  mobileView = "list",
  onBack,
  returnFocusRef,
}: ListDetailProps) {
  const detailHeadingId = useId();
  const detailPanelRef = useRef<HTMLElement>(null);
  const previousViewRef = useRef<ListDetailMobileView>(mobileView);
  const classes = [styles.root, className].filter(Boolean).join(" ");
  const hasDetail = detail !== null && detail !== undefined;

  useEffect(() => {
    const previousView = previousViewRef.current;
    previousViewRef.current = mobileView;
    if (previousView === mobileView) return;

    if (mobileView === "detail") {
      detailPanelRef.current?.focus();
      return;
    }
    returnFocusRef?.current?.focus();
  }, [mobileView, returnFocusRef]);

  return (
    <section
      aria-label={ariaLabel}
      className={classes}
      data-list-detail="true"
      data-mobile-view={mobileView}
    >
      <section aria-label={listLabel} className={styles.listPane}>
        {list}
      </section>
      <section
        aria-label={detailLabel}
        aria-labelledby={detailHeading === undefined ? undefined : detailHeadingId}
        className={styles.detailPane}
        ref={detailPanelRef}
        tabIndex={-1}
      >
        <div className={styles.mobileReturn}>
          <Button onClick={onBack} variant="ghost">
            <span aria-hidden="true">←</span>
            {backLabel}
          </Button>
        </div>
        {detailHeading === undefined ? null : (
          <h2 className={styles.detailHeading} id={detailHeadingId}>{detailHeading}</h2>
        )}
        {hasDetail ? detail : (
          <div className={styles.emptyDetail}>{emptyDetail ?? "Select an item to see its details."}</div>
        )}
      </section>
    </section>
  );
}
