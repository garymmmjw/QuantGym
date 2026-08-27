import { useEffect } from "react";
import { Link } from "react-router-dom";

import { useI18n } from "../../shared/i18n";
import styles from "./NotFoundPage.module.css";

export default function NotFoundPage() {
  const { language } = useI18n();
  const isChinese = language === "zh-CN";

  useEffect(() => {
    document.title = `${isChinese ? "页面未找到" : "Page not found"} · QuantGym`;
  }, [isChinese]);

  return (
    <section aria-labelledby="not-found-title" className={styles.root}>
      <p className={styles.code} data-qg-metric>404</p>
      <h1 id="not-found-title">{isChinese ? "这里还没有训练场" : "There is no training area here"}</h1>
      <p>{isChinese ? "地址可能已更新。返回总览后，你可以继续刚才的训练。" : "This address may have changed. Return to the overview to continue training."}</p>
      <Link to="/">{isChinese ? "返回总览" : "Back to overview"}</Link>
    </section>
  );
}
