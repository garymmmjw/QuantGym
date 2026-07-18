import type { ReactNode } from "react";
import { useId } from "react";

import {
  QuantyImage,
  type QuantyAssetName,
  type QuantyImageSize,
} from "../QuantyImage";
import styles from "./EmptyState.module.css";

export type EmptyStateHeadingLevel = 2 | 3 | 4;

export type EmptyStateProps = Readonly<{
  title: ReactNode;
  description?: ReactNode;
  mascot?: QuantyAssetName;
  mascotAlt?: string;
  mascotSize?: Extract<QuantyImageSize, "small" | "medium">;
  action?: ReactNode;
  headingLevel?: EmptyStateHeadingLevel;
  className?: string;
}>;

const headingTags: Readonly<Record<EmptyStateHeadingLevel, "h2" | "h3" | "h4">> = Object.freeze({
  2: "h2",
  3: "h3",
  4: "h4",
});

export const EmptyState = ({
  title,
  description,
  mascot,
  mascotAlt = "",
  mascotSize = "medium",
  action,
  headingLevel = 2,
  className,
}: EmptyStateProps) => {
  const Heading = headingTags[headingLevel];
  const titleId = useId();
  const rootClassName = [styles.root, className].filter(Boolean).join(" ");

  return (
    <section className={rootClassName} aria-labelledby={titleId} data-empty-state="true">
      {mascot === undefined
        ? null
        : (
          <QuantyImage
            asset={mascot}
            alt={mascotAlt}
            size={mascotSize}
            prominence="primary"
          />
        )}
      <div className={styles.copy}>
        <Heading id={titleId} className={styles.title}>{title}</Heading>
        {description === undefined ? null : <p className={styles.description}>{description}</p>}
      </div>
      {action === undefined ? null : <div className={styles.action}>{action}</div>}
    </section>
  );
};
