import { useEffect } from "react";
import { Link, useLocation } from "react-router-dom";

import { shellRouteTitle } from "../../design-system/patterns/AppShell";
import { useI18n } from "../../shared/i18n";
import styles from "./PreviewRoutePage.module.css";

export default function PreviewRoutePage() {
  const { language } = useI18n();
  const { pathname } = useLocation();
  const title = shellRouteTitle(pathname, language);
  const isOverview = pathname === "/";

  useEffect(() => {
    document.title = `${title} · QuantGym`;
  }, [title]);

  return (
    <div className={styles.root}>
      <header className={styles.hero}>
        <div className={styles.heroCopy}>
          <p className={styles.eyebrow}>{language === "zh-CN" ? "V2 训练空间" : "V2 TRAINING SPACE"}</p>
          <h1>{title}</h1>
          <p className={styles.subtitle}>
            {language === "zh-CN"
              ? "新的应用外壳已经就位。该业务模块会在后续迁移阶段接入，不会调用旧版全局启动器。"
              : "The new application shell is ready. This business module will connect in a later migration phase without starting the legacy runtime."}
          </p>
          <Link className={styles.primaryAction} to={isOverview ? "/plan" : "/"}>
            {isOverview
              ? (language === "zh-CN" ? "查看训练计划" : "View training plan")
              : (language === "zh-CN" ? "返回总览" : "Back to overview")}
          </Link>
        </div>
        <div className={styles.brandField} aria-hidden="true">
          <span>Q</span>
          <small>V2</small>
        </div>
      </header>
      <section aria-labelledby="preview-status-title" className={styles.statusBand}>
        <div>
          <p className={styles.statusLabel}>{language === "zh-CN" ? "当前阶段" : "Current stage"}</p>
          <h2 id="preview-status-title">{language === "zh-CN" ? "共享体验正在升级" : "Shared experience upgrade"}</h2>
        </div>
        <p>
          {language === "zh-CN"
            ? "桌面导航、移动抽屉、主题、语言与错误恢复由 V2 独立负责。"
            : "Desktop navigation, the mobile drawer, preferences, and recovery now belong to V2."}
        </p>
      </section>
    </div>
  );
}
