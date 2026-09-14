import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAppServicesContext } from "../../stores/AppServicesContext.jsx";
import { getGuardianApiBaseUrl, guardianRequest, saveGuardianSession } from "./guardianApi.js";
import "./guardianEntry.css";

export function GuardianEntry() {
  const services = useAppServicesContext();
  const navigate = useNavigate();
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function enter(event) {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError("");
    try {
      const session = await guardianRequest("/guardian/session", { method: "POST", body: { code: code.trim() }, baseUrl: getGuardianApiBaseUrl(services) });
      saveGuardianSession(session);
      setCode("");
      navigate("/guardian");
    } catch (error) {
      setError(error.status === 401 ? "监护码无效或已被重置，请向用户获取最新监护码。" : error.status === 429 ? "尝试过于频繁，请稍后再试。" : error.message);
    } finally { setBusy(false); }
  }
  return (
    <details className="qg-guardian-entry">
      <summary>我是监护人 <span>凭监护码进入，无需注册</span></summary>
      <form onSubmit={enter}>
        <label htmlFor="guardianAccessCode">监护码</label>
        <input id="guardianAccessCode" value={code} onChange={event => setCode(event.target.value)} required maxLength={100} autoComplete="off" autoCapitalize="none" spellCheck="false" placeholder="粘贴用户分享的监护码" />
        <button className="primary-button" type="submit" disabled={busy || !code.trim()}>{busy ? "正在进入…" : "进入监护人系统"}</button>
        {error && <p role="alert">{error}</p>}
        <small>用户可在「账户 → 监护人」中找到监护码。</small>
      </form>
    </details>
  );
}
