import React from 'react';
import { createRoot } from 'react-dom/client';
import { createLearnBridge, createRendererStorage, installEmbeddedNavigation } from './embed-bridge.mjs';
import { installEmbeddedLayout } from './embed-layout.mjs';
import './styles.css';
import './embed.css';

document.documentElement.classList.add('qg-embedded-learn');
const mount = createRoot(document.getElementById('root'));
mount.render(<div className="local-empty" role="status">正在连接课程…</div>);
const bridge = createLearnBridge(window, { onSaveError: error => {
  const message = `学习记录保存失败：${error} 请勿关闭页面，释放浏览器存储空间后重试。`;
  if (window.LocalProgress) window.LocalProgress.toast(message);
  else mount.render(<div className="local-empty" role="alert">{message}</div>);
} });
window.QGLearnEmbed = bridge;
bridge.ready.then(async () => {
  // Only the copied renderer uses this account-scoped adapter; browser storage
  // APIs are left intact and the standalone preview keeps its original behavior.
  window.QGLearnStorage = createRendererStorage(bridge);
  const stopLayout = installEmbeddedLayout(window, bridge);
  window.addEventListener('pagehide', stopLayout, { once: true });
  installEmbeddedNavigation(window, bridge);
  const { App } = await import('./App.jsx');
  mount.render(<App embedded />);
}).catch(error => mount.render(<div className="local-empty" role="alert">{error.message}</div>));
