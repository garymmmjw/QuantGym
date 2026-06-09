import { useEffect, useRef, useState } from "react";

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

export function AuthShell() {
  const [sharkBubbleText, setSharkBubbleText] = useState("");
  const [sharkBubbleVisible, setSharkBubbleVisible] = useState(false);
  const [sharkPoked, setSharkPoked] = useState(false);
  const [authStats, setAuthStats] = useState({ problems: 0, books: 0 });
  const [statsRolling, setStatsRolling] = useState(false);
  const bubbleTimerRef = useRef(null);
  const pokeTimerRef = useRef(null);
  const lastLineRef = useRef(-1);

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
    <section className="auth-shell" id="authShell">
          <div className="auth-brand" aria-label="QuantGym 备考封面">
            <div className="auth-brand-logo">
              <img
                className="auth-brand-q-image"
                src="assets/generated/brand-q-mark.webp?v=premium-system-2"
                width="404"
                height="420"
                decoding="async"
                fetchPriority="high"
                alt=""
              />
              <strong data-wordmark="QuantGym">QuantGym</strong>
            </div>
            <div className="auth-brand-body">
              <h2>
                <span className="auth-title-line"><span className="auth-title-gradient">Quant workout</span></span>
                <span className="auth-title-line">从这里开始</span>
              </h2>
              <p>
                <span className="auth-copy-line">从 <strong className="auth-copy-keyword">高频题</strong>、<strong className="auth-copy-keyword auth-copy-english">Mental Math</strong>、<strong className="auth-copy-keyword">简历复盘</strong> 到 <strong className="auth-copy-keyword auth-copy-english">AI Mock</strong>，</span>
                <span className="auth-copy-line">把 Quant 面试练成肌肉记忆。</span>
              </p>
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
                  <img className="auth-cover-mascot" src="assets/generated/mascot-laptop.webp?v=premium-system-2" alt="" draggable="false" />
                </button>
              </div>
            </div>
            <div className="auth-brand-stats auth-brand-stats-roadmap">
              <div className="auth-stat-metrics">
                <div className="auth-stat">
                  <span className="auth-stat-label">高频题目</span>
                  <span className={`auth-stat-num${statsRolling ? " is-rolling" : ""}`}>{formatAuthStat(authStats.problems)}+</span>
                </div>
                <div className="auth-stat">
                  <span className="auth-stat-label">题单书籍</span>
                  <span className={`auth-stat-num${statsRolling ? " is-rolling" : ""}`}>{formatAuthStat(authStats.books)}+</span>
                </div>
              </div>
              <div className="auth-roadmap-proof">
                <span className="auth-roadmap-title">
                  <span className="auth-roadmap-kicker">打造</span>
                  <strong>Quant RoadMap</strong>
                </span>
              </div>
            </div>
          </div>

          <div className="auth-panel" role="dialog" aria-labelledby="authTitle" aria-describedby="authSubtitle">
            <div className="auth-copy">
              <h2 id="authTitle" data-i18n="authTitle">登录或注册</h2>
              <p id="authSubtitle" data-i18n="authSubtitle">同步你的题库、模拟面试复盘、简历和训练进度。</p>
            </div>

            <div className="auth-provider-stack">
              <div id="googleButton" className="google-button"></div>
            </div>

            <div className="divider auth-provider-divider"><span data-i18n="authOr">或</span></div>

            <form className="auth-form auth-email-flow" id="loginForm" autoComplete="on" data-auth-step="email">
              <label className="sr-only" htmlFor="loginEmail" data-i18n="emailAddress">电子邮件地址</label>
              <input id="loginEmail" type="email" autoComplete="email" placeholder="电子邮件地址" data-i18n-placeholder="emailAddress" />
              <label className="sr-only" htmlFor="loginPassword" data-i18n="password">密码</label>
              <input id="loginPassword" className="auth-password-field hidden" type="password" autoComplete="current-password" placeholder="密码" data-i18n-placeholder="password" />
              <button className="primary-button auth-submit" type="submit" data-i18n="continueAction">继续</button>
            </form>

            <form className="auth-form auth-register-flow hidden" id="registerForm" autoComplete="on">
              <p className="auth-flow-note">这个邮箱还没有账号，继续创建你的 QuantGym 账号。</p>
              <label className="sr-only" htmlFor="registerName" data-i18n="name">名字</label>
              <input id="registerName" type="text" autoComplete="name" placeholder="名字" data-i18n-placeholder="name" />
              <label className="sr-only" htmlFor="registerEmail" data-i18n="emailAddress">电子邮件地址</label>
              <input id="registerEmail" type="email" autoComplete="email" placeholder="电子邮件地址" data-i18n-placeholder="emailAddress" />
              <label className="sr-only" htmlFor="registerPassword" data-i18n="password">密码</label>
              <input id="registerPassword" type="password" autoComplete="new-password" placeholder="设置密码，至少 6 位" data-i18n-placeholder="registerPasswordPlaceholder" />
              <div className="auth-code-row">
                <label className="sr-only" htmlFor="registerVerificationCode" data-i18n="verificationCode">邮箱验证码</label>
                <input id="registerVerificationCode" type="text" inputMode="numeric" autoComplete="one-time-code" maxLength="6" placeholder="邮箱验证码" data-i18n-placeholder="verificationCode" />
                <button className="secondary-button" id="sendRegisterCodeBtn" type="button" data-i18n="sendVerificationCode">发送验证码</button>
              </div>
              <button className="primary-button auth-submit" type="submit" data-i18n="createAccount">创建账户</button>
            </form>

            <details className="google-config hidden" aria-hidden="true">
              <summary data-i18n="googleClientSummary">配置 Google Client ID</summary>
              <div className="config-row">
                <input id="googleClientIdInput" type="text" spellCheck="false" placeholder="xxxx.apps.googleusercontent.com" />
                <button className="secondary-button" id="saveGoogleClientBtn" type="button" data-i18n="save">保存</button>
              </div>
            </details>

            <p id="authMessage" className="auth-message" aria-live="polite"></p>
          </div>
        </section>
  );
}
