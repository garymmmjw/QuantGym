import { listen } from '../../ui/events.js';

export function createNetworkModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getContacts = () => (Array.isArray(deps.getContacts?.()) ? deps.getContacts() : []);
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };

  const statusWeight = (status) => ({
    "Follow-up": 0,
    "To reach out": 1,
    Contacted: 2,
    Warm: 3,
    Archived: 4
  })[status] ?? 5;

  const render = () => {
    const els = getElements();
    if (!els.networkList) return;
    const contacts = getContacts();
    els.networkList.innerHTML = "";
    if (els.networkSummary) {
      const active = contacts.filter((contact) => contact.status !== "Archived").length;
      const contactText = (deps.t?.("networkContacts") || "{count} contacts").replace("{count}", String(contacts.length));
      els.networkSummary.textContent = contacts.length
        ? `${contactText} - ${active} ${deps.t?.("networkActiveFollowups") || "active follow-ups"}`
        : deps.t?.("networkSummary");
    }

    if (!contacts.length) {
      els.networkList.appendChild(deps.emptyBlock?.(deps.t?.("networkEmpty")) || document.createTextNode(""));
      return;
    }

    contacts
      .slice()
      .sort((a, b) => statusWeight(a.status) - statusWeight(b.status) || new Date(b.updatedAt || b.createdAt || 0) - new Date(a.updatedAt || a.createdAt || 0))
      .forEach((contact) => {
        const card = document.createElement("article");
        card.className = "network-card";

        const top = document.createElement("div");
        top.className = "network-card-top";
        const identity = document.createElement("div");
        const name = document.createElement("h3");
        name.textContent = contact.name;
        const role = document.createElement("small");
        role.textContent = [contact.role, contact.company].filter(Boolean).join(" - ") || deps.t?.("networkCompanyFallback");
        identity.append(name, role);

        const remove = document.createElement("button");
        remove.className = "icon-button ghost danger";
        remove.type = "button";
        remove.title = deps.getDeleteLabel?.() || "Delete contact";
        remove.setAttribute("aria-label", deps.getDeleteLabel?.() || "Delete contact");
        remove.dataset.networkDelete = contact.id;
        remove.innerHTML = '<i data-lucide="trash-2"></i>';
        top.append(identity, remove);

        const status = document.createElement("span");
        status.className = "network-status";
        status.textContent = deps.getStatusLabel?.(contact.status) || contact.status || "-";

        const meta = document.createElement("div");
        meta.className = "network-meta";
        [contact.channel, contact.nextStep].filter(Boolean).forEach((item) => {
          const pill = document.createElement("span");
          pill.className = "pill muted-pill";
          pill.textContent = item;
          meta.appendChild(pill);
        });

        const notes = document.createElement("p");
        notes.textContent = contact.notes || deps.t?.("networkNotesEmpty");

        card.append(top, status, meta, notes);
        els.networkList.appendChild(card);
      });
    deps.refreshIcons?.();
  };

  const addContact = () => {
    const els = getElements();
    const contact = deps.normalizeContact?.({
      name: els.networkName.value,
      company: els.networkCompany.value,
      role: els.networkRole.value,
      status: els.networkStatus.value,
      channel: els.networkChannel.value,
      nextStep: els.networkNextStep.value,
      notes: els.networkNotes.value,
      createdAt: new Date().toISOString()
    });

    if (!contact?.name) return;
    deps.setContacts?.([...getContacts(), contact]);
    deps.save?.();
    els.networkForm.reset();
    els.networkForm.classList.add("hidden");
    render();
  };

  const deleteContact = (id) => {
    deps.setContacts?.(getContacts().filter((contact) => contact.id !== id));
    deps.save?.();
    render();
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.addNetworkBtn, "click", () => {
        els.networkForm?.classList.toggle("hidden");
        if (!els.networkForm?.classList.contains("hidden")) els.networkName?.focus();
      });

      bind(els.networkForm, "submit", (event) => {
        event.preventDefault();
        addContact();
      });

      bind(els.networkList, "click", (event) => {
        const button = event.target.closest("[data-network-delete]");
        if (!button) return;
        deleteContact(button.dataset.networkDelete);
      });
    },

    render() {
      render();
    },

    unmount() {},

    dispose() {
      disposers.splice(0).forEach((dispose) => dispose());
      mounted = false;
    }
  };
}
