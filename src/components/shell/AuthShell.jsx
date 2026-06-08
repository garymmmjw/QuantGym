export function AuthShell() {
  return (
    <section className="auth-shell" id="authShell">
          <div className="auth-brand" aria-label="QuantGym 备考封面">
            <div className="auth-brand-logo">
              <img src="assets/generated/brand-q-mark.webp?v=premium-system-2" alt="" />
              <strong>QuantGym</strong>
            </div>
            <div className="auth-brand-body">
              <span className="auth-brand-kicker">Quant interview workspace</span>
              <h2>把题库、模拟面试和简历复盘放进同一个训练台</h2>
              <p>每天推进一组题、一次 mock、一版简历反馈。QuantGym 会记录你的薄弱点，让下一次练习更具体。</p>
            </div>
            <div className="auth-cover-visual" aria-hidden="true">
              <img className="auth-cover-mascot" src="assets/generated/mascot-laptop.webp?v=premium-system-2" alt="" />
              <div className="auth-cover-board">
                <span>Today</span>
                <strong>Probability drills</strong>
                <small>24 ready questions</small>
              </div>
              <div className="auth-cover-card primary">
                <span>Mock</span>
                <strong>Market making</strong>
                <small>follow-up prompts queued</small>
              </div>
              <div className="auth-cover-card secondary">
                <span>Resume</span>
                <strong>3 edits</strong>
                <small>impact bullets next</small>
              </div>
            </div>
            <div className="auth-brand-stats">
              <div className="auth-stat">
                <span className="auth-stat-num" data-count="2000" data-suffix="+">2,000+</span>
                <span className="auth-stat-label">高频题目</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-num" data-count="500" data-suffix="+">500+</span>
                <span className="auth-stat-label">面试复盘</span>
              </div>
              <div className="auth-stat">
                <span className="auth-stat-num" data-count="98" data-suffix="%">98%</span>
                <span className="auth-stat-label">训练满意度</span>
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

            <div className="divider"><span data-i18n="authOr">或</span></div>

            <div className="auth-tabs" role="tablist" aria-label="登录或注册" data-i18n-aria-label="authTabsLabel">
              <button className="tab active" type="button" data-auth-tab="login" data-i18n="login">登录</button>
              <button className="tab" type="button" data-auth-tab="register" data-i18n="register">注册</button>
            </div>

            <form className="auth-form" id="loginForm" autoComplete="on">
              <label className="sr-only" htmlFor="loginEmail" data-i18n="emailAddress">电子邮件地址</label>
              <input id="loginEmail" type="email" autoComplete="email" placeholder="电子邮件地址" data-i18n-placeholder="emailAddress" />
              <label className="sr-only" htmlFor="loginPassword" data-i18n="password">密码</label>
              <input id="loginPassword" type="password" autoComplete="current-password" placeholder="密码" data-i18n-placeholder="password" />
              <button className="primary-button auth-submit" type="submit" data-i18n="continueAction">继续</button>
            </form>

            <form className="auth-form hidden" id="registerForm" autoComplete="on">
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
