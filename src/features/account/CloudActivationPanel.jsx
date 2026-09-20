import { useCloudSession } from "./useCloudSession.js";
import "./cloudSession.css";

export function CloudActivationPanel() {
  const session = useCloudSession();
  if (!session.needsVerification) return null;
  return <section className="account-panel qg-cloud-activation" aria-labelledby="cloud-activation-title">
    <div className="account-panel-title" id="cloud-activation-title">{session.en ? "Complete account verification" : "完成账号验证"}</div>
    <p>{session.en ? "Your previous records are kept on this device. Sign in or verify your email to merge practice and application records into your account and continue on another device." : "此设备的旧记录已保留。登录或验证邮箱后，训练和投递记录会合并到你的账号，方便在其他设备继续。"}</p>
    <button className="primary-button" type="button" onClick={session.reconnect}>{session.en ? "Sign in or verify email" : "登录或验证邮箱"}</button>
  </section>;
}
