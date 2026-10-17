import React from 'react';
import { createRoot } from 'react-dom/client';
import { createLearnBridge, createRendererStorage, installEmbeddedNavigation, installEmbeddedRendererNavigation } from './embed-bridge.mjs';
import { installEmbeddedLayout } from './embed-layout.mjs';
import './styles.css';
import './embed.css';

document.documentElement.classList.add('qg-embedded-learn');
const mount = createRoot(document.getElementById('root'));
mount.render(<div className="local-empty" role="status">正在连接课程…</div>);
const saveNotice = document.createElement('div');
saveNotice.className = 'qg-learn-save-notice'; saveNotice.hidden = true;
saveNotice.setAttribute('role', 'status'); saveNotice.setAttribute('aria-live', 'polite');
const saveText = document.createElement('span'), retrySave = document.createElement('button');
retrySave.type = 'button'; retrySave.textContent = '重试保存'; retrySave.hidden = true;
saveNotice.append(saveText, retrySave); document.getElementById('root').before(saveNotice);
const bridge = createLearnBridge(window, { onSaveError: error => {
  const message = `学习记录尚未同步：${error} 请保留此页，恢复连接后重试保存。`;
  if (window.LocalProgress) window.LocalProgress.toast(message);
}, onSaveState: state => {
  saveNotice.hidden = state.phase === 'saved';
  saveNotice.classList.toggle('qg-learn-save-notice--error', state.phase === 'error');
  saveText.textContent = state.phase === 'error' ? `${state.error} 当前输入仍在此页，请重试保存后继续。` : '正在同步学习进度，保存完成后可继续跳转…';
  retrySave.hidden = state.phase !== 'error';
} });
retrySave.addEventListener('click', () => bridge.retrySave().catch(() => {}));
window.QGLearnEmbed = bridge;
bridge.ready.then(async () => {
  // Only the copied renderer uses this account-scoped adapter; browser storage
  // APIs are left intact and the standalone preview keeps its original behavior.
  window.QGLearnStorage = createRendererStorage(bridge);
  const stopLayout = installEmbeddedLayout(window, bridge);
  window.addEventListener('pagehide', stopLayout, { once: true });
  installEmbeddedNavigation(window, bridge);
  installEmbeddedRendererNavigation(window, bridge);
  const { App } = await import('./App.jsx');
  mount.render(<App embedded />);
}).catch(error => mount.render(<div className="local-empty" role="alert">{error.message}</div>));
