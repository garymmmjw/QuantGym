function countAuthEvents(metrics = {}) {
  return (metrics.audit?.authEvents24h || []).reduce((total, item) => total + Number(item.count || 0), 0);
}

function formatHttpErrors(metrics = {}) {
  const http = metrics.audit?.httpErrors24h || {};
  const total = Number(http.total || 0);
  const serverErrors = Number(http.serverErrors || 0);
  return serverErrors ? `${total} (${serverErrors} 5xx)` : String(total);
}

function getAdminStatusClass(status = "") {
  if (status === "error") return "error";
  if (status === "fail") return "fail";
  return "success";
}

export function AdminOverviewPanel({ model }) {
  const admin = model.adminOverview || {};
  const metrics = admin.metrics || {};
  const events = admin.events || [];
  const visible = ["ready", "refreshing", "error"].includes(admin.status);
  if (!visible) return null;

  const loading = admin.status === "refreshing";
  const users = metrics.users || {};
  const sessions = metrics.sessions || {};
  const audit = metrics.audit || {};

  return (
    <aside className="account-panel account-admin-panel" aria-live="polite">
      <div className="account-admin-header">
        <div>
          <h3>{model.t("adminOverviewTitle") || "运维概览"}</h3>
          <small>
            {metrics.generatedAt
              ? `${model.t("adminOverviewUpdated") || "更新"} ${model.formatDate?.(metrics.generatedAt) || metrics.generatedAt}`
              : model.t("adminOverviewLive") || "实时读取云端 API"}
          </small>
        </div>
        <button
          className="icon-button ghost"
          type="button"
          title={model.t("refresh") || "刷新"}
          aria-label={model.t("refresh") || "刷新"}
          disabled={loading}
          onClick={model.refreshAdminOverview}
        >
          <i data-lucide="refresh-cw" />
        </button>
      </div>

      {admin.message ? <p className="account-admin-message">{admin.message}</p> : null}

      <dl className="account-admin-metrics">
        <div>
          <dt>{model.t("adminUsers") || "用户"}</dt>
          <dd>{users.total ?? "-"}</dd>
        </div>
        <div>
          <dt>{model.t("adminSessions") || "活跃会话"}</dt>
          <dd>{sessions.active ?? "-"}</dd>
        </div>
        <div>
          <dt>{model.t("adminAuditEvents") || "审计事件"}</dt>
          <dd>{audit.events ?? "-"}</dd>
        </div>
        <div>
          <dt>{model.t("adminAuth24h") || "24h auth"}</dt>
          <dd>{countAuthEvents(metrics)}</dd>
        </div>
        <div>
          <dt>{model.t("adminHttpErrors24h") || "24h HTTP errors"}</dt>
          <dd>{formatHttpErrors(metrics)}</dd>
        </div>
      </dl>

      <div className="account-admin-subsection">
        <strong>{model.t("adminRecentEvents") || "最近事件"}</strong>
        {events.length ? (
          <ul className="account-admin-events">
            {events.slice(0, 8).map((event) => (
              <li key={event.id || `${event.eventType}-${event.createdAt}`}>
                <span className={`account-admin-status ${getAdminStatusClass(event.status)}`}>
                  {event.status || "ok"}
                </span>
                <div>
                  <b>{event.eventType || "audit.event"}</b>
                  <small>
                    {(event.email || model.t("adminSystemActor") || "system")}
                    {" · "}
                    {model.formatDate?.(event.createdAt) || event.createdAt || "-"}
                  </small>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <small>{model.t("adminNoEvents") || "暂无审计事件。"}</small>
        )}
      </div>
    </aside>
  );
}

