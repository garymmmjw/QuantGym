import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAppServices } from '../../stores/usePageApi.js';
import { useAuthStore, useAppStore } from '../../stores/AppServicesContext.jsx';
import { CommandPalette } from './CommandPalette.jsx';
import { RouteProgressBar } from './RouteProgressBar.jsx';
import { PREP_NAV_GROUPS } from './personalNavigation.js';
import './personalShell.css';

const THEME_KEY = 'quantgym.ui.theme.v1';
const bottomIds = ['overview', 'daily-mock', 'calendar', 'review', 'applications'];
const shortNames = {overview:['今天','Today'],'daily-mock':['训练','Mock'],calendar:['日历','Calendar'],review:['复习','Review'],applications:['申请','Apply']};
function storedTheme() { try { return localStorage.getItem(THEME_KEY) === 'dark' ? 'dark' : 'light'; } catch { return 'light'; } }

export function PrepIcon({ name, ...props }) {
  const paths = {overview:'M4 4h6v6H4z M14 4h6v6h-6z M4 14h6v6H4z M14 14h6v6h-6z',calendar:'M4 6h16v14H4z M7 3v6 M17 3v6 M4 11h16 M8 15h2 M14 15h2','daily-mock':'M8 5H5v16h14V5h-3 M8 3h8v4H8z M8 12l2 2 5-5 M8 18h8',tools:'M5 3h14v18H5z M8 6h8 M8 11h1 M15 11h1 M8 15h1 M15 15h1 M8 18h1 M15 18h1',problems:'M4 4h6c2 0 2 2 2 2s0-2 2-2h6v15h-6c-2 0-2 2-2 2s0-2-2-2H4z M12 6v15',review:'M4 11a8 8 0 1 1 2 7 M4 4v7h7 M12 8v5l3 2',applications:'M3 7h18v14H3z M8 7V3h8v4 M3 12h18 M10 12v3h4v-3'};
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}><path d={paths[name] || 'M5 4h14v16H5z M9 8h6 M9 12h6 M9 16h4'} /></svg>;
}

export function AppShellMain() {
  const services = useAppServices();
  const user = useAuthStore(state => state.currentUser);
  useAppStore(state => state.appPrefs);
  const en = services.getLanguage?.() === 'en';
  const [theme, setTheme] = useState(storedTheme);
  const [menuOpen, setMenuOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const menuButton = useRef(null);
  const location = useLocation();
  const navItems = PREP_NAV_GROUPS.flatMap(group => group.items);
  const current = navItems.find(item => item.path === location.pathname);
  useEffect(() => {
    document.documentElement.dataset.prepMode = 'personal';
    return () => { delete document.documentElement.dataset.prepMode; };
  }, []);
  useEffect(() => {
    if (theme === 'dark') document.documentElement.setAttribute('data-qg-theme', 'dark');
    else document.documentElement.removeAttribute('data-qg-theme');
    try { localStorage.setItem(THEME_KEY, theme); } catch { /* Theme is optional. */ }
  }, [theme]);
  useEffect(() => { setMenuOpen(false); }, [location.pathname]);
  useEffect(() => {
    const keydown = event => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') { event.preventDefault(); setPaletteOpen(open => !open); }
      if (event.key === 'Escape' && menuOpen) { setMenuOpen(false); menuButton.current?.focus(); }
    };
    window.addEventListener('keydown', keydown);
    return () => window.removeEventListener('keydown', keydown);
  }, [menuOpen]);
  const toggleTheme = () => setTheme(value => value === 'dark' ? 'light' : 'dark');
  return <main id="appShell" className="hidden prep-shell">
    <a href="#prep-content" className="prep-skip">{en ? 'Skip to content' : '跳到正文'}</a>
    {menuOpen && <button className="prep-menu-backdrop" aria-label={en ? 'Close navigation' : '关闭导航'} onClick={() => setMenuOpen(false)} />}
    <nav id="moduleNav" className={`prep-rail ${menuOpen ? 'is-open' : ''}`} aria-label={en ? 'Preparation navigation' : '备战导航'}>
      <NavLink className="prep-brand" to="/" end><span className="prep-brand-mark">Q</span><span>QuantGym<small>{en ? 'PERSONAL WORKSPACE' : '个人备战工作台'}</small></span></NavLink>
      {PREP_NAV_GROUPS.map(group => <div className="prep-nav-group" key={group.label}>
        <p>{en ? group.labelEn : group.label}</p>
        {group.items.map(item => <NavLink key={item.id} end={item.path === '/'} to={item.path} className={({isActive}) => `prep-nav-item${isActive ? ' active' : ''}`}><PrepIcon name={item.id} /><span>{en ? item.labelEn : item.label}</span></NavLink>)}
      </div>)}
      <div className="prep-rail-note"><strong>{en ? 'Prepare. Record. Review.' : '练习有记录，复习有方向。'}</strong><span>{en ? 'Your own pace, every day.' : '按自己的节奏，准备下一轮机会。'}</span></div>
    </nav>
    <div className="prep-main">
      <header className="prep-commandbar">
        <div><button ref={menuButton} className="prep-menu-toggle" type="button" aria-label={en ? 'Open navigation' : '打开导航'} aria-expanded={menuOpen} aria-controls="moduleNav" onClick={() => setMenuOpen(open => !open)}><span aria-hidden="true">☰</span></button><span className="prep-breadcrumb">{en ? current?.labelEn || 'Workspace' : current?.label || '备战工作台'}</span></div>
        <div className="prep-command-actions"><button type="button" className="prep-search-button" onClick={() => setPaletteOpen(true)}><span>{en ? 'Search questions & pages' : '搜索题目或页面'}</span><kbd>⌘ K</kbd></button><button type="button" className="prep-theme-button" onClick={toggleTheme} aria-label={en ? 'Switch appearance' : '切换外观'}>{theme === 'dark' ? (en ? 'Light' : '浅色') : (en ? 'Dark' : '深色')}</button><NavLink to="/account" className="prep-account">{user?.name || (en ? 'Account' : '账户')}</NavLink></div>
      </header>
      <section id="prep-content" className="prep-content module-view active" data-module-view="route" tabIndex={-1}><Outlet /></section>
    </div>
    <nav className="prep-bottom-nav" aria-label={en ? 'Quick navigation' : '快捷导航'}>{bottomIds.map(id => {const item = navItems.find(item => item.id === id);return <NavLink key={id} to={item.path} end={item.path === '/'}><PrepIcon name={id}/><span>{shortNames[id][en ? 1 : 0]}</span></NavLink>;})}</nav>
    <RouteProgressBar />
    <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} theme={theme} onToggleTheme={toggleTheme} />
  </main>;
}
