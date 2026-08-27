import { Spinner } from "../../../design-system/primitives/Spinner";
import styles from "./auth.module.css";

export function AuthSessionGate() {
  return (
    <div className={styles.sessionGate}>
      <Spinner label="正在确认登录状态" size="large" />
      <h1 className={styles.cardTitle}>正在确认登录状态</h1>
      <p className={styles.cardSubtitle}>请稍候，我们正在安全地恢复你的训练会话。</p>
    </div>
  );
}
