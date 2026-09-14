import { GuardianEntry } from "../../features/guardian/GuardianEntry.jsx";
import { useEffect, useRef, useState, useSyncExternalStore } from "react";
import { AUTH_KEY, USER_STATE_PREFIX } from "../../constants.js";
import { isItemOwned } from "../../modules/economy/index.js";
import { useAppServicesContext, useAuthStore, useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { getCloudReauthentication, subscribeCloudReauthentication } from "../../state/cloudReauthentication.js";
import "../../features/account/cloudSession.css";
import { refreshIcons } from "../../ui/icons.js";
import "../../styles/auth-welcome.css";

// Idle status copy written by the Google login runtime — the design keeps this
// slot empty unless something actionable (an error) needs to be shown.
const authIdleMessages = new Set([
  "Google 登录组件还在加载，稍后会自动可用。",
  "Google 登录已启用。云端同步会校验 ID token。",
  "邮箱账户会优先尝试云端同步；注册时先发送邮箱验证码。",
  "邮箱登录已可用；注册时先发送验证码。Google 登录入口已预留，暂未启用。",
  "当前是 file:// 打开方式，账户/Google 登录可能被浏览器限制。请用 http://127.0.0.1:5176/index.html 打开。",
  "Google login is still loading and will become available shortly.",
  "Google login is enabled. Cloud sync will verify the ID token.",
  "Email accounts will try cloud sync first. Registration starts with an email verification code.",
  "Email login is available. Registration starts with a verification code. Google login is reserved but not enabled.",
  "You are using file://. Account and Google login may be blocked by the browser. Open http://127.0.0.1:5176/index.html instead."
]);

const authSharkLines = [
  "今天也来一组。",
  "肌肉记忆，慢慢练出来。",
  "先热身，再冲刺。",
  "Quant workout 开始。",
  "刷题别慌，节奏最重要。"
];
const noAccounts = [];

/* 晚安主题壁纸 (shop item `sleep`): the login screen is rendered before any
   user is signed in, so ownership is read from the LAST account persisted on
   this machine (read-only localStorage lookup via the economy API). */
function lastLocalAccountOwnsSleepWallpaper() {
  try {
    const auth = JSON.parse(localStorage.getItem(AUTH_KEY) || "null") || {};
    const accounts = Array.isArray(auth.accounts) ? auth.accounts : [];
    const latestAccountId = auth.currentUserId
      || accounts
        .slice()
        .sort((a, b) => String(b?.updatedAt || b?.createdAt || "").localeCompare(String(a?.updatedAt || a?.createdAt || "")))[0]?.id
      || "";
    if (!latestAccountId) return false;
    const rawState = JSON.parse(localStorage.getItem(`${USER_STATE_PREFIX}.${latestAccountId}`) || "null");
    return Boolean(rawState) && isItemOwned(rawState, "sleep");
  } catch {
    return false;
  }
}

export function AuthShell() {
  const services = useAppServicesContext();
  const recovery = useSyncExternalStore(subscribeCloudReauthentication, getCloudReauthentication, getCloudReauthentication);
  const savedAccounts = useAuthStore(state => state.auth?.accounts || noAccounts);
  const [loginEmail, setLoginEmail] = useState(recovery?.email || "");
  const en = services.getLanguage?.() === "en";
  const hasDeviceAccount = savedAccounts.some(account => account.provider === "local"
    && String(account.email || "").trim().toLowerCase() === loginEmail.trim().toLowerCase()
    && typeof account.passwordHash === "string" && Boolean(account.passwordHash));
  const useDeviceAccount = () => {
    services.services?.rebindElements?.();
    return services.pageApi?.account?.loginDeviceAccount?.();
  };
  const cancelRecovery = () => {
    services.services?.rebindElements?.();
    return services.pageApi?.account?.cancelCloudRecovery?.();
  };
  const [sharkBubbleText, setSharkBubbleText] = useState("");
  const [sharkBubbleVisible, setSharkBubbleVisible] = useState(false);
  const [sharkPoked, setSharkPoked] = useState(false);
  const [passwordVisible, setPasswordVisible] = useState(false);
  // Register flow runs as two screens per design: info (邮箱+密码) → verify
  // (mascot + six code boxes). The legacy controller still owns submission.
  const [registerStage, setRegisterStage] = useState("info");
  const [registerCode, setRegisterCode] = useState("");
  const [registerVerifyEmail, setRegisterVerifyEmail] = useState("");
  const registerStageRef = useRef("info");
  const bubbleTimerRef = useRef(null);
  const pokeTimerRef = useRef(null);
  const lastLineRef = useRef(-1);
  // Cosmetics (shop): both reads are strictly read-only via the economy API.
  const [sleepWallpaperOwned, setSleepWallpaperOwned] = useState(false);
  const frameOwned = useUserStateStore((state) => isItemOwned(state.value, "frame"));

  useEffect(() => {
    refreshIcons({ root: document.getElementById("authShell") });
  }, [passwordVisible]);

  useEffect(() => {
    setSleepWallpaperOwned(lastLocalAccountOwnsSleepWallpaper());
  }, []);

  // 庆典彩带头像框 (shop item `frame`): the leaderboard rows live outside the
  // files this surface may touch, so ownership is exposed as a body-level
  // marker class that pure-CSS rules key off. AuthShell is always mounted in
  // both the auth and the app shells, making it the stable host. No class →
  // zero trace for users who do not own the frame.
  useEffect(() => {
    document.body.classList.toggle("qg-owns-frame", Boolean(frameOwned));
    return () => document.body.classList.remove("qg-owns-frame");
  }, [frameOwned]);

  useEffect(() => () => {
    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (pokeTimerRef.current) window.clearTimeout(pokeTimerRef.current);
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const form = document.getElementById("loginForm");
    const emailInput = document.getElementById("loginEmail");
    const passwordInput = document.getElementById("loginPassword");
    const messageNode = document.getElementById("authMessage");

    let lastPassword = "";
    let restoreTimer = 0;

    // Design shows email + password on one screen with a single「登录」action.
    // The legacy controller runs an email-first two-step flow; keep the
    // password group visible and jump straight to the password step whenever
    // the user has typed a password so one click submits both fields.
    const keepPasswordStep = () => {
      if (!passwordInput) return;
      passwordInput.classList.remove("hidden");
      if (form && passwordInput.value) form.dataset.authStep = "password";
    };

    const handlePasswordInput = () => {
      lastPassword = passwordInput?.value || "";
      keepPasswordStep();
    };

    const handleEmailInput = () => {
      setLoginEmail(emailInput?.value || "");
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        if (!passwordInput) return;
        if (lastPassword && !passwordInput.value) passwordInput.value = lastPassword;
        keepPasswordStep();
      }, 0);
    };

    passwordInput?.addEventListener("input", handlePasswordInput);
    emailInput?.addEventListener("input", handleEmailInput);
    setLoginEmail(emailInput?.value || "");

    const clearIdleMessage = () => {
      const value = messageNode?.textContent?.trim() || "";
      if (value && authIdleMessages.has(value)) messageNode.textContent = "";
    };
    clearIdleMessage();
    const messageObserver = messageNode ? new MutationObserver(clearIdleMessage) : null;
    if (messageObserver && messageNode) {
      messageObserver.observe(messageNode, { childList: true, characterData: true, subtree: true });
    }

    return () => {
      window.clearTimeout(restoreTimer);
      passwordInput?.removeEventListener("input", handlePasswordInput);
      emailInput?.removeEventListener("input", handleEmailInput);
      messageObserver?.disconnect();
    };
  }, []);

  useEffect(() => {
    if (typeof document === "undefined") return undefined;
    const form = document.getElementById("registerForm");
    const nameInput = document.getElementById("registerName");
    const emailInput = document.getElementById("registerEmail");
    const passwordInput = document.getElementById("registerPassword");
    const codeInput = document.getElementById("registerVerificationCode");
    const sendCodeBtn = document.getElementById("sendRegisterCodeBtn");
    if (!form) return undefined;

    let focusTimer = 0;

    const resetStage = () => {
      registerStageRef.current = "info";
      setRegisterStage("info");
      setRegisterCode(codeInput?.value || "");
    };

    // Capture-phase interception: while on the info step, a valid submit sends
    // the verification code and advances to the verify screen instead of
    // hitting the controller (which requires a code). Invalid fields fall
    // through so the controller's i18n validation messages still show.
    const interceptSubmit = (event) => {
      if (event.target !== form) return;
      if (registerStageRef.current !== "info") return;
      const name = nameInput?.value?.trim() || "";
      const email = emailInput?.value?.trim() || "";
      const password = passwordInput?.value || "";
      if (!name || !email.includes("@") || password.length < 6) return;
      event.preventDefault();
      event.stopPropagation();
      if (sendCodeBtn && !sendCodeBtn.disabled) sendCodeBtn.click();
      setRegisterVerifyEmail(email);
      registerStageRef.current = "verify";
      setRegisterStage("verify");
      focusTimer = window.setTimeout(() => codeInput?.focus?.(), 0);
    };
    document.addEventListener("submit", interceptSubmit, true);

    const handleCodeInput = () => setRegisterCode(codeInput?.value || "");
    codeInput?.addEventListener("input", handleCodeInput);

    // setEmailAuthStep resets the form; tab switches only toggle .hidden —
    // both should land the user back on the info step.
    form.addEventListener("reset", resetStage);
    const classObserver = new MutationObserver(resetStage);
    classObserver.observe(form, { attributes: true, attributeFilter: ["class"] });

    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("submit", interceptSubmit, true);
      codeInput?.removeEventListener("input", handleCodeInput);
      form.removeEventListener("reset", resetStage);
      classObserver.disconnect();
    };
  }, []);

  const requestRegisterSubmit = () => {
    const form = document.getElementById("registerForm");
    if (form?.requestSubmit) form.requestSubmit();
    else form?.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true }));
  };

  const backToLoginTab = () => {
    document.querySelector('[data-auth-tab="login"]')?.click();
  };

  const pokeAuthShark = () => {
    let index = Math.floor(Math.random() * authSharkLines.length);
    if (index === lastLineRef.current) index = (index + 1) % authSharkLines.length;
    lastLineRef.current = index;

    setSharkBubbleText(authSharkLines[index]);
    setSharkBubbleVisible(true);
    setSharkPoked(true);

    if (bubbleTimerRef.current) window.clearTimeout(bubbleTimerRef.current);
    if (pokeTimerRef.current) window.clearTimeout(pokeTimerRef.current);

    pokeTimerRef.current = window.setTimeout(() => setSharkPoked(false), 660);
    bubbleTimerRef.current = window.setTimeout(() => setSharkBubbleVisible(false), 2400);
  };

  return (
    <section className={`auth-shell qg-auth-screen qg-auth-welcome${sleepWallpaperOwned ? " qg-auth-sleep" : ""}`} id="authShell">
          <header className="qg-welcome-header">
            <a className="qg-welcome-logo" href="/login" aria-label="QuantGym">
              <img src="/assets/generated/playful-precision/brand-q-mark.webp" alt="" width="44" height="44" />
              <strong>Quant<span>Gym</span></strong>
            </a>
            <p>{en ? "A better you. One question at a time." : "更好的你 · 从一道题开始"}</p>
          </header>
          <div className="qg-welcome-hero" aria-label="QuantGym 备考封面">
            <div className="qg-welcome-headline">
              <h1><span>{en ? "Build your confidence." : "今天的底气，"}</span><span>{en ? "One question at a time." : "从这一题开始。"}</span></h1>
              <p>{en ? "Practice with Quanty. Make progress every day." : "和 Quanty 一起，把练习变成进步。"}</p>
            </div>
            <div className="qg-welcome-scene">
              <img className="qg-welcome-scene-backdrop" src="/assets/generated/playful-precision/auth-welcome-scene.png" alt="" aria-hidden="true" draggable="false" />
              <div className={`qg-welcome-bubble${sharkBubbleVisible ? " is-visible" : ""}`} role="status" aria-live="polite">{sharkBubbleText}</div>
              <button className={`qg-welcome-mascot-button${sharkPoked ? " is-poked" : ""}`} type="button" aria-label={en ? "Say hello to Quanty" : "戳一下 Quanty"} onClick={pokeAuthShark}>
                <img className="qg-welcome-mascot" src="/assets/generated/playful-precision/mascot-auth-welcome.png" alt={en ? "Quanty waves hello" : "挥手欢迎你的 Quanty"} draggable="false" fetchPriority="high" />
              </button>
            </div>
            <p className="qg-welcome-topics">{en ? "Practice · Mental Math · Mock interviews" : "刷题 · Mental Math · 模拟面试"}</p>
          </div>

          <div className="auth-panel qg-auth-card" role="dialog" aria-labelledby="authTitle" aria-describedby="authSubtitle">
            {recovery && <div className="qg-auth-recovery-note">
              <p role="status" data-i18n="authCloudRecoveryNotice">请重新登录以恢复云端连接。本机训练记录已保留，登录成功后会返回刚才的页面。</p>
              <button type="button" className="auth-link-button" onClick={cancelRecovery}>{en ? "Not now · keep device access" : "暂不恢复云端"}</button>
            </div>}
            <div className="auth-copy qg-welcome-copy">
              <h2 id="authTitle"><span className="qg-login-only">{en ? "Welcome back" : "欢迎回来"}</span><span className="qg-register-only">{en ? "Start your journey" : "开始你的训练"}</span><span className="qg-reset-only">{en ? "Reset password" : "找回密码"}</span></h2>
              <p id="authSubtitle"><span className="qg-login-only">{en ? "Continue your quant interview practice." : "继续你的量化面试训练。"}</span><span className="qg-register-only">{en ? "Practice with Quanty. Grow a little every day." : "和 Quanty 一起，每天进步一点。"}</span><span className="qg-reset-only">{en ? "Get back to your practice with a new password." : "找回账户，继续你的训练。"}</span></p>
            </div>

            <form className="auth-form auth-email-flow" id="loginForm" autoComplete="on" data-auth-step="email">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="loginEmail" data-i18n="email">邮箱</label>
                <div className="qg-welcome-input"><i data-lucide="mail" aria-hidden="true" /><input id="loginEmail" type="email" autoComplete="email" placeholder={en ? "Email address" : "输入邮箱地址"} defaultValue={recovery?.email || ""} onChange={event => setLoginEmail(event.target.value)} onFocus={event => setLoginEmail(event.target.value)} /></div>
              </div>
              <div className="auth-field auth-field-password">
                <label className="auth-field-label" htmlFor="loginPassword" data-i18n="password">密码</label>
                <div className="qg-welcome-input"><i data-lucide="lock-keyhole" aria-hidden="true" />
                  <input id="loginPassword" className="auth-password-field" type={passwordVisible ? "text" : "password"} autoComplete="current-password" placeholder={en ? "Password" : "输入密码"} />
                  <button className="qg-password-toggle" type="button" aria-label={passwordVisible ? (en ? "Hide password" : "隐藏密码") : (en ? "Show password" : "显示密码")} aria-pressed={passwordVisible} onClick={() => setPasswordVisible(value => !value)}><i data-lucide={passwordVisible ? "eye-off" : "eye"} aria-hidden="true" /></button>
                </div>
              </div>
              <button className="auth-link-button" id="forgotPasswordBtn" type="button" data-i18n="forgotPassword">忘记密码？</button>
              <button className="primary-button auth-submit" type="submit" data-i18n="login">登录</button>
            </form>

            <form className="auth-form auth-register-flow hidden" id="registerForm" autoComplete="on" data-register-stage={registerStage}>
              <p className="auth-flow-note auth-register-info-only">这个邮箱还没有账号，继续创建你的 QuantGym 账号。</p>
              <div className="auth-field auth-register-info-only">
                <label className="auth-field-label" htmlFor="registerName" data-i18n="name">名字</label>
                <input id="registerName" type="text" autoComplete="name" placeholder="名字" data-i18n-placeholder="name" />
              </div>
              <div className="auth-field auth-register-info-only">
                <label className="auth-field-label" htmlFor="registerEmail" data-i18n="email">邮箱</label>
                <input id="registerEmail" type="email" autoComplete="email" placeholder="you@example.com" />
              </div>
              <div className="auth-field auth-register-info-only">
                <label className="auth-field-label" htmlFor="registerPassword" data-i18n="password">密码</label>
                <input id="registerPassword" type="password" autoComplete="new-password" placeholder="设置密码，至少 6 位" data-i18n-placeholder="registerPasswordPlaceholder" />
              </div>
              <button className="primary-button auth-submit auth-register-info-only" type="button" onClick={requestRegisterSubmit} data-i18n="createAccount">创建账户</button>

              <div className="auth-verify-head auth-register-verify-only" aria-hidden={registerStage !== "verify"}>
                <img className="auth-verify-mascot" src="/assets/generated/playful-precision/mascot-search.png" alt="" draggable="false" />
                <h3 className="auth-verify-title">查收验证码</h3>
                <p className="auth-verify-sub">已发送 6 位验证码到<br /><b>{registerVerifyEmail || "你的邮箱"}</b></p>
                <div className="auth-code-boxes" aria-hidden="true">
                  {[0, 1, 2, 3, 4, 5].map((slot) => (
                    <span key={slot} className={`auth-code-box${registerCode[slot] ? " is-filled" : ""}`}>{registerCode[slot] || ""}</span>
                  ))}
                </div>
              </div>
              <div className="auth-field auth-register-verify-only auth-register-code-field">
                <label className="auth-field-label" htmlFor="registerVerificationCode" data-i18n="verificationCode">邮箱验证码</label>
                <input id="registerVerificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="邮箱验证码" data-i18n-placeholder="verificationCode" />
              </div>
              <button className="primary-button auth-submit auth-register-verify-only" type="submit" data-i18n="createAccount">创建账户</button>
              <p className="auth-resend-row auth-register-verify-only">没收到？<button className="secondary-button" id="sendRegisterCodeBtn" type="button" data-i18n="sendVerificationCode">发送验证码</button></p>
              <button className="auth-link-button auth-register-verify-only" type="button" onClick={backToLoginTab}>← 返回登录</button>
            </form>

            <form className="auth-form auth-reset-flow hidden" id="resetPasswordForm" autoComplete="on">

              <p className="auth-flow-note" data-i18n="resetPasswordNote">输入邮箱验证码并设置新密码。</p>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="resetPasswordEmail" data-i18n="email">邮箱</label>
                <input id="resetPasswordEmail" type="email" autoComplete="email" placeholder="you@example.com" />
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="resetPasswordVerificationCode" data-i18n="verificationCode">邮箱验证码</label>
                <div className="auth-code-row">
                  <input id="resetPasswordVerificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="邮箱验证码" data-i18n-placeholder="verificationCode" />
                  <button className="secondary-button" id="sendResetPasswordCodeBtn" type="button" data-i18n="sendVerificationCode">发送验证码</button>
                </div>
              </div>
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="resetPasswordNewPassword" data-i18n="newPassword">新密码</label>
                <input id="resetPasswordNewPassword" type="password" autoComplete="new-password" placeholder="设置新密码，至少 6 位" data-i18n-placeholder="newPasswordPlaceholder" />
              </div>
              <button className="primary-button auth-submit" type="submit" data-i18n="resetPasswordSubmit">重置并登录</button>
              <button className="auth-link-button" id="cancelResetPasswordBtn" type="button">← 返回登录</button>
            </form>

            <div className="divider auth-provider-divider"><span data-i18n="authOr">或</span></div>

            <div className="auth-provider-stack">
              <div className="auth-google-slot">
                <span className="auth-provider-button auth-google-visual" aria-hidden="true">
                  <img className="qg-google-mark" src="/assets/generated/playful-precision/google-g.png" alt="" width="24" height="24" />
                  <span>{en ? "Continue with Google" : "使用 Google 继续"}</span>
                </span>
                <div id="googleButton" className="google-button"></div>
              </div>
            </div>

            <p id="authMessage" className="auth-message" aria-live="polite"></p>

            <div className="qg-welcome-switch">
              {!recovery && <span className="qg-login-only">{en ? "New here? " : "还没有账户？ "}<button className="auth-tab" type="button" data-auth-tab="register">{en ? "Sign up free" : "免费注册"}</button></span>}
              <span className="qg-register-only">{en ? "Already have an account? " : "已经有账户？ "}</span><button className="auth-tab qg-register-only qg-return-login" type="button" data-auth-tab="login" data-i18n="login">登录</button>
            </div>

            <GuardianEntry />

            <details className="qg-welcome-other qg-login-only">
              <summary>{en ? "Other ways to sign in" : "其他登录方式"}<i data-lucide="chevron-down" aria-hidden="true" /></summary>
              {hasDeviceAccount ? <div className="qg-auth-device-entry" data-device-account>
                <p>{en ? "Use the password saved on this device to continue your practice. Cloud sync will stay off." : "输入此设备账户的密码，继续已有训练。此方式暂不连接云端。"}</p>
                <button className="secondary-button" type="button" onClick={useDeviceAccount}>{en ? "Use this device's account" : "使用此设备的账户"}</button>
              </div> : <p>{en ? "Enter an email saved on this device above to use its local account." : "在上方输入此设备保存过的账户邮箱，即可使用本机账户登录。"}</p>}
            </details>

            <p className="auth-legal-note">内测期间仅限白名单邮箱 · <span className="auth-legal-link">服务条款</span> 与 <span className="auth-legal-link">隐私政策</span></p>

            <details className="google-config hidden" aria-hidden="true">
              <summary data-i18n="googleClientSummary">配置 Google Client ID</summary>
              <div className="config-row">
                <input id="googleClientIdInput" type="text" spellCheck="false" placeholder="xxxx.apps.googleusercontent.com" />
                <button className="secondary-button" id="saveGoogleClientBtn" type="button" data-i18n="save">保存</button>
              </div>
            </details>
          </div>
        </section>
  );
}
