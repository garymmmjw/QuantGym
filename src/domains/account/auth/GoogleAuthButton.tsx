import { Button } from "../../../design-system/primitives/Button";
import styles from "./auth.module.css";

export type GoogleAuthButtonProps = Readonly<{
  disabled?: boolean;
  isRetry?: boolean;
  redirectPath: string;
}>;

export function GoogleAuthButton({
  disabled = false,
  isRetry = false,
  redirectPath,
}: GoogleAuthButtonProps) {
  const continueWithGoogle = () => {
    window.location.assign(
      `/api/v2/auth/google/start?redirectPath=${encodeURIComponent(redirectPath)}`,
    );
  };

  return (
    <Button
      className={styles.googleButton}
      disabled={disabled}
      fullWidth
      size="large"
      variant="secondary"
      onClick={continueWithGoogle}
    >
      <span aria-hidden="true" className={styles.googleGlyph}>G</span>
      {isRetry ? "重新尝试 Google 登录" : "使用 Google 继续"}
    </Button>
  );
}
