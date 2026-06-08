export function TopbarShell() {
  return (
    <header className="topbar">
          <div className="brand">
            <div className="brand-mark" aria-hidden="true">Q</div>
            <div>
              <h1>QuantGym</h1>
              <p id="todayLine">Loading</p>
            </div>
          </div>
          <div className="top-actions">
            <div className="region-rank top-region-rank hidden" id="regionRank" title="地区排名" data-i18n-title="regionRankTitle">
              <span className="medal gold" id="regionMedal">G</span>
              <span id="regionRankText">Shanghai #1</span>
            </div>
            <button className="user-chip hidden" id="userChip" type="button" title="Account" aria-label="打开账户设置" data-i18n-aria-label="accountSettingsAria">
              <div className="avatar" id="userAvatar" aria-hidden="true">Q</div>
              <div>
                <strong id="userName">Guest</strong>
                <small id="userProvider">Local</small>
              </div>
            </button>
            <select className="language-select hidden" id="languageSelect" aria-label="语言" data-i18n-aria-label="language">
              <option value="zh">中文</option>
              <option value="en">English</option>
            </select>
            <button className="icon-button hidden" id="settingsBtn" type="button" title="设置" aria-label="设置" data-i18n-title="openSettings" data-i18n-aria-label="openSettings">
              <i data-lucide="settings"></i>
            </button>
          </div>
        </header>
  );
}
