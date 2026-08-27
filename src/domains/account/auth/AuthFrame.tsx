import type { ReactNode } from "react";

import { QuantyImage } from "../../../design-system/patterns/QuantyImage";
import styles from "./auth.module.css";

export type AuthFrameProps = Readonly<{
  announcement?: string;
  children: ReactNode;
}>;

export function AuthFrame({ announcement, children }: AuthFrameProps) {
  return (
    <main className={styles.authLayout}>
      <section aria-label="QuantGym 训练介绍" className={styles.brandPanel}>
        <span aria-hidden="true" className={styles.brandGlow} />
        <div className={styles.brandLockup}>
          <span aria-hidden="true" className={styles.brandMark}>Q</span>
          <span className={styles.brandName}>QuantGym</span>
        </div>

        <div className={styles.heroStage}>
          <span aria-hidden="true" className={styles.heroOrbit} />
          <QuantyImage
            asset="hero"
            alt="Quanty 向你挥手"
            className={styles.heroQuanty}
            size="hero"
            priority
            prominence="primary"
          />
        </div>

        <div className={styles.brandStory}>
          <p className={styles.brandHeadline}>量化面试，<br />练出来的底气。</p>
          <p className={styles.brandDescription}>
            2,997 道真题 · Mental Math · AI 模拟面试 · 段位联赛。
            每天 20 分钟，把 offer 变成时间问题。
          </p>
        </div>

        <div aria-label="QuantGym 训练数据" className={styles.proofRow}>
          <span className={styles.proofPill}>🔥 12,400+ 训练者</span>
          <span className={styles.proofPill}>Jane Street · Citadel · Optiver 真题</span>
        </div>
      </section>

      <section className={styles.formStage}>
        <div className={styles.authCard}>{children}</div>
        <div aria-atomic="true" aria-live="polite" className={styles.srOnly}>
          {announcement}
        </div>
      </section>
    </main>
  );
}
