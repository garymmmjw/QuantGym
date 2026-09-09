import { useEffect, useRef, useState } from 'react';
import { useAppServicesContext } from '../../stores/AppServicesContext.jsx';
export function ReconnectAccount({user,language,onClose}) {
  const services=useAppServicesContext();
  const dialogRef=useRef(null);
  const [password,setPassword]=useState('');
  const [busy,setBusy]=useState(false);
  const [error,setError]=useState('');
  const en=language==='en';
  useEffect(()=>{const dialog=dialogRef.current;dialog.showModal();return()=>dialog.close();},[]);
  const close=()=>{if(!busy){setPassword('');onClose();}};
  const submit=async event=>{
    event.preventDefault();setBusy(true);setError('');
    try { await services.reconnectPersonalAccount(password);setPassword('');onClose(); }
    catch(failure){setError(failure.message==='account_mismatch' ? (en?'This login belongs to a different account. Current records were kept.':'登录身份与当前账户不同，已有记录保持不变。') : failure.message==='account_changed' ? (en?'The active account changed. Reopen this window.':'当前账户已切换，请重新打开此窗口。') : (en?'Could not reconnect. Check your password and connection.':'连接未成功，请检查密码和网络后重试。'));}
    finally{setBusy(false);}
  };
  return <dialog ref={dialogRef} className="prep-reconnect" aria-labelledby="prep-reconnect-title" onCancel={event=>{event.preventDefault();close();}}><form onSubmit={submit}><div className="prep-reconnect-heading"><h2 id="prep-reconnect-title">{en?'Reconnect your account':'恢复账户同步'}</h2><button type="button" aria-label={en?'Close':'关闭'} disabled={busy} onClick={close}>×</button></div><p>{en?'Sign in again to sync the work already saved on this browser.':'重新验证登录，将本机保留的训练和申请记录同步到账户。'}</p><label>{en?'Current account':'当前账户'}<input type="email" value={user.email || ''} readOnly autoComplete="username" /></label><label>{en?'Password':'密码'}<input type="password" autoComplete="current-password" value={password} onChange={event=>setPassword(event.target.value)} autoFocus required /></label>{error&&<p role="alert" className="prep-reconnect-error">{error}</p>}<button className="prep-reconnect-submit" type="submit" disabled={busy||!password.trim()}>{busy?(en?'Connecting…':'连接中…'):(en?'Reconnect & sync':'重新登录并同步')}</button><p className="prep-reconnect-help">{en?'Using Google login? Return to sign-in and use Google again. Your saved local records will remain.':'使用 Google 登录的账户，可以返回登录页重新连接。本机已保存的记录会保留。'}</p><button className="prep-reconnect-exit" type="button" disabled={busy} onClick={()=>{setPassword('');services.logout?.();onClose();}}>{en?'Return to sign-in':'返回登录页'}</button></form></dialog>;
}
