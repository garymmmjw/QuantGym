import { useEffect, useRef, useState } from "react";
import { AUTH_KEY, USER_STATE_PREFIX } from "../../constants.js";
import { isItemOwned } from "../../modules/economy/index.js";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";

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

function formatAuthStat(value) {
  return String(value);
}

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
  const [sharkBubbleText, setSharkBubbleText] = useState("");
  const [sharkBubbleVisible, setSharkBubbleVisible] = useState(false);
  const [sharkPoked, setSharkPoked] = useState(false);
  const [authStats, setAuthStats] = useState({ problems: 0, books: 0 });
  const [statsRolling, setStatsRolling] = useState(false);
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
    const targets = { problems: 2500, books: 130 };
    const duration = 1800;
    let frameId = 0;
    let start = 0;
    let settleTimer = 0;

    function easeOutQuart(t) {
      return 1 - (1 - t) ** 4;
    }

    function step(timestamp) {
      if (!start) start = timestamp;
      const progress = Math.min((timestamp - start) / duration, 1);
      const eased = easeOutQuart(progress);

      setAuthStats({
        problems: Math.floor(targets.problems * eased),
        books: Math.floor(targets.books * eased)
      });

      if (progress < 1) {
        frameId = window.requestAnimationFrame(step);
        return;
      }

      setAuthStats(targets);
      settleTimer = window.setTimeout(() => setStatsRolling(false), 280);
    }

    setStatsRolling(true);
    frameId = window.requestAnimationFrame(step);

    return () => {
      window.cancelAnimationFrame(frameId);
      window.clearTimeout(settleTimer);
    };
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
      window.clearTimeout(restoreTimer);
      restoreTimer = window.setTimeout(() => {
        if (!passwordInput) return;
        if (lastPassword && !passwordInput.value) passwordInput.value = lastPassword;
        keepPasswordStep();
      }, 0);
    };

    passwordInput?.addEventListener("input", handlePasswordInput);
    emailInput?.addEventListener("input", handleEmailInput);

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
    <section className={`auth-shell qg-auth-screen${sleepWallpaperOwned ? " qg-auth-sleep" : ""}`} id="authShell">
          <div className="auth-brand qg-auth-brand" aria-label="QuantGym 备考封面">
            <div className="auth-brand-logo">
              <span className="auth-brand-q-badge" aria-hidden="true">Q</span>
              <strong data-wordmark="QuantGym">QuantGym</strong>
            </div>
            <div className="auth-cover-visual">
              <div className="auth-cover-shark-stage">
                <div className={`auth-cover-shark-bubble${sharkBubbleVisible ? " is-visible" : ""}`} role="status" aria-live="polite">
                  {sharkBubbleText}
                </div>
                <button
                  className={`auth-cover-shark-button${sharkPoked ? " is-poked" : ""}`}
                  type="button"
                  aria-label="戳一下 Quanty"
                  onClick={pokeAuthShark}
                >
                  <span className="auth-cover-shark-glow" aria-hidden="true" />
                  <img className="auth-cover-mascot" src="/assets/generated/playful-precision/mascot-hero-v5-clean.png" alt="" draggable="false" />
                </button>
              </div>
            </div>
            <div className="auth-brand-body">
              <h2>
                <span className="auth-title-line">量化面试，</span>
                <span className="auth-title-line"><span className="auth-title-gradient">练出来的底气。</span></span>
              </h2>
              <p>
                <span className="auth-copy-line"><strong className="auth-copy-keyword">2,997 道真题</strong> · <strong className="auth-copy-keyword auth-copy-english">Mental Math</strong> · <strong className="auth-copy-keyword auth-copy-english">AI 模拟面试</strong> · 段位联赛。</span>
                <span className="auth-copy-line">每天 20 分钟，把 offer 变成时间问题。</span>
              </p>
            </div>
            <div className="auth-brand-stats auth-brand-stats-roadmap">
              <span className="auth-brand-chip auth-brand-chip-hot">
                <span className="auth-brand-chip-icon" aria-hidden="true">🔥</span>
                <span className="auth-brand-chip-count">12,400+ 训练者</span>
              </span>
              <span className="auth-brand-chip auth-brand-chip-firms">Jane Street · Citadel · Optiver 真题</span>
            </div>
          </div>

          <div className="auth-panel qg-auth-card" role="dialog" aria-labelledby="authTitle" aria-describedby="authSubtitle">
            <div className="auth-copy sr-only">
              <h2 id="authTitle" data-i18n="authTitle">登录或注册</h2>
              <p id="authSubtitle" data-i18n="authSubtitle">同步你的题库、模拟面试复盘、简历和训练进度。</p>
            </div>

            <div className="auth-tab-switch" role="tablist" aria-label="登录或注册">
              <button className="auth-tab active" type="button" role="tab" data-auth-tab="login" data-i18n="login">登录</button>
              <button className="auth-tab" type="button" role="tab" data-auth-tab="register" data-i18n="register">注册</button>
            </div>

            <form className="auth-form auth-email-flow" id="loginForm" autoComplete="on" data-auth-step="email">
              <div className="auth-field">
                <label className="auth-field-label" htmlFor="loginEmail" data-i18n="email">邮箱</label>
                <input id="loginEmail" type="email" autoComplete="email" placeholder="you@example.com" />
              </div>
              <div className="auth-field auth-field-password">
                <label className="auth-field-label" htmlFor="loginPassword" data-i18n="password">密码</label>
                <input id="loginPassword" className="auth-password-field" type="password" autoComplete="current-password" placeholder="输入密码" />
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
              <h3 className="auth-reset-title">重置密码</h3>
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
                  <span className="google-mark">G</span>
                  <span>使用 Google 继续</span>
                </span>
                <div id="googleButton" className="google-button"></div>
              </div>
            </div>

            <p id="authMessage" className="auth-message" aria-live="polite"></p>

            <p className="auth-legal-note">私测阶段需要白名单邮箱 · 继续即同意 <span className="auth-legal-link">服务条款</span> 与 <span className="auth-legal-link">隐私政策</span></p>

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
