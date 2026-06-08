import { useEffect, useMemo, useState } from "react";
import { useUserStateStore } from "../../stores/AppServicesContext.jsx";
import { useAppServices, usePageApi } from "../../stores/usePageApi.js";
import { EmptyState } from "../../components/common/EmptyState.jsx";

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

export function NetworkPageContent() {
  const appServices = useAppServices();
  const pageApi = usePageApi();
  const t = appServices.t;
  const api = pageApi.network;
  const userState = useUserStateStore((state) => state.value || {});
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  const contacts = useMemo(() => {
    const weight = (status) => ({ "Follow-up": 0, "To reach out": 1, Contacted: 2, Warm: 3, Archived: 4 })[status] ?? 5;
    return (userState.network || []).slice().sort((a, b) => (
      weight(a.status) - weight(b.status)
      || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0)
    ));
  }, [userState.network]);

  useEffect(() => {
    pageApi.refreshIcons?.();
  });

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
    <section className="network-section">
      <div className="section-heading">
        <div>
          <h2>{t("networkModule") || "人脉"}</h2>
          <small id="networkSummary">
            {contacts.length
              ? `${contactCountLabel} - ${active} ${t("networkActiveFollowups")}`
              : t("networkSummary")}
          </small>
        </div>
        <button
          className="icon-button ghost"
          id="addNetworkBtn"
          type="button"
          title={t("networkAdd") || "添加联系人"}
          aria-label={t("networkAdd") || "添加联系人"}
          onClick={() => setShowForm((v) => !v)}
        >
          <i data-lucide="user-round-plus" />
        </button>
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
      <div className="network-list" id="networkList">
        {!contacts.length ? <EmptyState title={t("networkEmpty")} /> : contacts.map((contact) => (
          <article key={contact.id} className="network-card" data-network-id={contact.id}>
            <div className="network-card-top">
              <div>
                <h3>{contact.name}</h3>
                <small>{[contact.role, contact.company].filter(Boolean).join(" - ") || t("networkCompanyFallback")}</small>
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
            <span className="network-status">{api.getStatusLabel?.(contact.status) || contact.status}</span>
            <div className="network-meta">
              {[contact.channel, contact.nextStep].filter(Boolean).map((item) => <span key={item} className="pill muted-pill">{item}</span>)}
            </div>
            <p>{contact.notes || t("networkNotesEmpty")}</p>
          </article>
        ))}
      </div>
    </section>
  );
}
