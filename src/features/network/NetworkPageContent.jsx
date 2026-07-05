import { useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { useScopedRefreshIcons } from "../shared/useScopedRefreshIcons.js";
import { timestampOrZero } from "../../lib/date.js";

const EMPTY_FORM = {
  id: "",
  name: "",
  company: "",
  role: "",
  status: "To reach out",
  channel: "",
  nextStep: "",
  notes: ""
};

const NODE_COLORS = ["#b3610a", "#5b5ff5", "#0f9d63", "#2f9be0", "#8a63e8", "#d0524b"];
const NODE_ANGLES = [-90, -30, 30, 90, 150, 210];
const NODE_RADII = [120, 135, 115, 130, 120, 132];
const NODE_WIDTHS = [3, 2.5, 2, 2.5, 1.5, 2];

/* Design tag palette: green (可内推), purple (活跃), orange (校友) */
const STATUS_TONES = {
  Warm: "",
  Contacted: " is-tone-purple",
  "Follow-up": " is-tone-orange",
  "To reach out": " is-tone-orange",
  Archived: " is-tone-gray"
};

const PLACEHOLDER_CHIPS = ["校友", "目标公司", "同题库"];

function initialsOf(name) {
  const parts = String(name || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean);
  if (!parts.length) return "·";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

export function NetworkPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.network;
  const userState = useUserStateStore((state) => state.value || {});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [filter, setFilter] = useState("all");
  const [connected, setConnected] = useState({});

  const contacts = useMemo(() => {
    const weight = (status) => ({ "Follow-up": 0, "To reach out": 1, Contacted: 2, Warm: 3, Archived: 4 })[status] ?? 5;
    return (userState.network || []).slice().sort((a, b) => (
      weight(a.status) - weight(b.status)
      || timestampOrZero(b.updatedAt || b.createdAt) - timestampOrZero(a.updatedAt || a.createdAt)
    ));
  }, [userState.network]);

  const statuses = useMemo(() => {
    const seen = [];
    contacts.forEach((contact) => {
      if (contact.status && !seen.includes(contact.status)) seen.push(contact.status);
    });
    return seen;
  }, [contacts]);

  const visibleContacts = useMemo(
    () => (filter === "all" ? contacts : contacts.filter((contact) => contact.status === filter)),
    [contacts, filter]
  );

  const graphNodes = useMemo(() => {
    const cx = 200;
    const cy = 170;
    return contacts.slice(0, 6).map((contact, index) => {
      const angle = (NODE_ANGLES[index] * Math.PI) / 180;
      const radius = NODE_RADII[index];
      const color = NODE_COLORS[index];
      return {
        id: contact.id,
        init: initialsOf(contact.name),
        name: contact.name,
        color,
        width: NODE_WIDTHS[index],
        x: cx + Math.cos(angle) * radius,
        y: cy + Math.sin(angle) * radius
      };
    });
  }, [contacts]);

  useScopedRefreshIcons(pageApi.refreshIcons, ".network-section", [contacts, showForm]);

  const submit = (event) => {
    event.preventDefault();
    const previous = contacts.find((contact) => contact.id === form.id);
    const contact = api.normalizeContact?.({
      ...previous,
      ...form,
      createdAt: previous?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });
    if (!contact?.name) return;
    api.setContacts([contact, ...contacts.filter((item) => item.id !== contact.id)]);
    pageApi.saveState?.();
    setForm(EMPTY_FORM);
    setShowForm(false);
  };

  const remove = (id) => {
    api.setContacts(contacts.filter((contact) => contact.id !== id));
    pageApi.saveState?.();
  };

  const active = contacts.filter((contact) => contact.status !== "Archived").length;
  const contactCountLabel = (t("networkContacts") || "{count} contacts").replace("{count}", contacts.length);

  return (
    <section className="network-section qg-support-page qg-network-page">
      <div className="section-heading qg-net-hero">
        <div className="qg-net-hero-main">
          <span className="qg-net-kicker">COMMUNITY · {t("networkModule") || "人脉"}</span>
          <h2 className="qg-net-title">
            {t("networkModule") || "人脉"} <span>Network</span>
          </h2>
          <small id="networkSummary" className="qg-net-subtitle">
            {contacts.length
              ? `${contactCountLabel} · ${active} ${t("networkActiveFollowups")}`
              : t("networkSummary")}
          </small>
        </div>
        <div className="qg-net-hero-side">
          <div className="qg-net-stat">
            <span className="qg-net-stat-label">我的人脉</span>
            <strong className="qg-net-stat-value">{contacts.length}</strong>
          </div>
          <div className="qg-net-stat qg-net-stat-accent">
            <span className="qg-net-stat-label">可内推</span>
            <strong className="qg-net-stat-value">{active}</strong>
          </div>
          <button
            className="icon-button ghost qg-net-add"
            id="addNetworkBtn"
            type="button"
            title={t("networkAdd") || "添加联系人"}
            aria-label={t("networkAdd") || "添加联系人"}
            onClick={() => setShowForm((v) => !v)}
          >
            <i data-lucide="user-round-plus" />
          </button>
        </div>
      </div>
      <form id="networkForm" className={`network-form${showForm ? "" : " hidden"}`} onSubmit={submit}>
        <input id="networkName" type="text" placeholder={t("networkName") || "姓名"} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        <input id="networkCompany" type="text" placeholder={t("networkCompany") || "公司 / 学校"} value={form.company} onChange={(e) => setForm({ ...form, company: e.target.value })} />
        <input id="networkRole" type="text" placeholder={t("networkRole") || "职位 / 关系"} value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })} />
        <select id="networkStatus" value={form.status} aria-label={t("networkStatusLabel") || "关系状态"} onChange={(e) => setForm({ ...form, status: e.target.value })}>
          <option>To reach out</option><option>Contacted</option><option>Follow-up</option><option>Warm</option><option>Archived</option>
        </select>
        <input id="networkChannel" type="text" placeholder={t("networkChannel") || "LinkedIn / Email / WeChat"} value={form.channel} onChange={(e) => setForm({ ...form, channel: e.target.value })} />
        <input id="networkNextStep" type="text" placeholder={t("networkNextStep") || "下一步"} value={form.nextStep} onChange={(e) => setForm({ ...form, nextStep: e.target.value })} />
        <textarea id="networkNotes" rows={4} placeholder={t("networkNotes") || "备注"} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
        <button className="secondary-button" type="submit"><i data-lucide="save" />{t("networkSave")}</button>
      </form>
      <div className="qg-net-body">
        <div className="qg-net-graph qg-panel">
          <div className="qg-net-graph-title">关系图谱</div>
          <div className="qg-net-graph-stage">
            <svg viewBox="0 0 400 340" preserveAspectRatio="none" className="qg-net-graph-svg" aria-hidden="true">
              {graphNodes.map((node) => (
                <line
                  key={`edge-${node.id}`}
                  x1="200"
                  y1="170"
                  x2={node.x.toFixed(0)}
                  y2={node.y.toFixed(0)}
                  stroke={`${node.color}55`}
                  strokeWidth={node.width}
                />
              ))}
            </svg>
            {graphNodes.map((node) => (
              <div
                key={`node-${node.id}`}
                className="qg-net-node"
                style={{ top: `${((node.y / 340) * 100).toFixed(2)}%`, left: `${((node.x / 400) * 100).toFixed(2)}%` }}
              >
                <div className="qg-net-node-avatar" style={{ background: node.color }}>{node.init}</div>
                <div className="qg-net-node-name">{node.name}</div>
              </div>
            ))}
            <div className="qg-net-node qg-net-node-self">
              <div className="qg-net-node-mascot">
                <img src="/assets/generated/playful-precision/avatar-happy-v2.png" alt="" />
              </div>
              <div className="qg-net-node-self-label">你 · Quant</div>
            </div>
          </div>
        </div>

        <div className="qg-net-people">
          <div className="qg-net-filters">
            <button
              type="button"
              className={`qg-net-chip${filter === "all" ? " is-active" : ""}`}
              onClick={() => setFilter("all")}
            >
              全部
            </button>
            {statuses.map((status) => (
              <button
                key={status}
                type="button"
                className={`qg-net-chip${filter === status ? " is-active" : ""}`}
                onClick={() => setFilter(status)}
              >
                {api.getStatusLabel?.(status) || status}
              </button>
            ))}
            {!statuses.length && PLACEHOLDER_CHIPS.map((label) => (
              <button
                key={label}
                type="button"
                className={`qg-net-chip${filter === label ? " is-active" : ""}`}
                onClick={() => setFilter(label)}
              >
                {label}
              </button>
            ))}
          </div>
          <div className="network-list" id="networkList">
            {!contacts.length ? (
              <div className="qg-panel qg-empty-state">
                <img src="/assets/generated/playful-precision/mascot-search.png" alt="" />
                <strong>{t("networkEmpty")}</strong>
              </div>
            ) : visibleContacts.map((contact, index) => (
              <article key={contact.id} className="network-card" data-network-id={contact.id}>
                <div className="qg-net-card-avatar" style={{ background: NODE_COLORS[index % NODE_COLORS.length] }}>{initialsOf(contact.name)}</div>
                <div className="qg-net-card-main">
                  <div className="network-card-top">
                    <div>
                      <h3>{contact.name}</h3>
                      <small>{[contact.role, contact.company].filter(Boolean).join(" · ") || t("networkCompanyFallback")}</small>
                    </div>
                    <button
                      type="button"
                      className="icon-button ghost"
                      aria-label={t("editNetworkContact") || "编辑联系人"}
                      onClick={() => {
                        setForm(contact);
                        setShowForm(true);
                      }}
                    >
                      <i data-lucide="pencil-line" />
                    </button>
                    <button type="button" className="icon-button ghost danger" aria-label={api.getDeleteLabel?.() || t("deleteNetworkContact") || "删除联系人"} onClick={() => remove(contact.id)}><i data-lucide="trash-2" /></button>
                  </div>
                  <div className="qg-net-card-meta">
                    <span className={`network-status${STATUS_TONES[contact.status] || ""}`}>{api.getStatusLabel?.(contact.status) || contact.status}</span>
                    {[contact.channel, contact.nextStep].filter(Boolean).map((item) => <span key={item} className="pill muted-pill">{item}</span>)}
                  </div>
                  <p>{contact.notes || t("networkNotesEmpty")}</p>
                </div>
                <button
                  type="button"
                  className={`qg-net-connect${connected[contact.id] ? " is-connected" : ""}`}
                  onClick={() => setConnected((prev) => ({ ...prev, [contact.id]: !prev[contact.id] }))}
                >
                  {connected[contact.id] ? "已连接" : "＋ 连接"}
                </button>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
