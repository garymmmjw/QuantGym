import { readFileAsDataUrl } from '../../lib/files.js';
import { listen } from '../../ui/events.js';

export function createAccountModule(deps = {}) {
  let mounted = false;
  const disposers = [];

  const getElements = () => deps.elements || {};
  const getCurrentUser = () => deps.getCurrentUser?.() || null;
  const bind = (node, eventName, handler) => {
    disposers.push(listen(node, eventName, handler));
  };
  const label = (key) => {
    const value = deps.labels?.[key];
    return typeof value === "function" ? value() : value || key;
  };

  const renderAvatarPreview = (source, fallback) => {
    const els = getElements();
    if (!els.accountAvatarPreview) return;
    els.accountAvatarPreview.innerHTML = "";
    if (source) {
      const image = document.createElement("img");
      image.src = source;
      image.alt = "";
      els.accountAvatarPreview.appendChild(image);
      return;
    }
    els.accountAvatarPreview.textContent = deps.getInitials?.(fallback || "Q") || "Q";
  };

  const updateAvatarPreview = () => {
    const els = getElements();
    const currentUser = getCurrentUser();
    const source = els.accountForm?.dataset.avatarData || els.accountAvatarUrl?.value.trim();
    delete els.accountForm.dataset.avatarCleared;
    renderAvatarPreview(source, els.accountNameInput.value || currentUser?.name || currentUser?.email || "Q");
  };

  const handleAvatarFile = async (event) => {
    const els = getElements();
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      els.accountMessage.textContent = label("imageOnly");
      event.target.value = "";
      return;
    }
    if (file.size > 1_800_000) {
      els.accountMessage.textContent = label("imageTooLarge");
      event.target.value = "";
      return;
    }
    const dataUrl = await readFileAsDataUrl(file);
    const currentUser = getCurrentUser();
    els.accountForm.dataset.avatarData = dataUrl;
    delete els.accountForm.dataset.avatarCleared;
    els.accountAvatarUrl.value = "";
    renderAvatarPreview(dataUrl, els.accountNameInput.value || currentUser?.name || "Q");
  };

  const clearAvatar = () => {
    const els = getElements();
    const currentUser = getCurrentUser();
    delete els.accountForm.dataset.avatarData;
    els.accountForm.dataset.avatarCleared = "true";
    els.accountAvatarUrl.value = "";
    els.accountAvatarFile.value = "";
    renderAvatarPreview("", els.accountNameInput.value || currentUser?.name || currentUser?.email || "Q");
  };

  const render = () => {
    const els = getElements();
    const currentUser = getCurrentUser();
    if (!currentUser || !els.accountForm) return;
    delete els.accountForm.dataset.avatarData;
    delete els.accountForm.dataset.avatarCleared;
    els.accountNameInput.value = currentUser.name || "";
    els.accountEmailInput.value = currentUser.email || "";
    els.accountAvatarUrl.value = currentUser.picture && !currentUser.picture.startsWith("data:") ? currentUser.picture : "";
    deps.renderCountries?.(els.accountCountrySelect, currentUser.country);
    deps.renderRegions?.(els.accountRegionSelect, currentUser.country, currentUser.region);
    if (els.accountGraduationTermInput) {
      els.accountGraduationTermInput.value = currentUser.graduationTerm || deps.defaultGraduationTerm || "";
    }
    deps.renderAccountResumeMeta?.();
    els.accountCurrentPassword.value = "";
    els.accountProviderText.textContent = currentUser.provider === "google" ? "Google" : "Local";
    els.accountCreatedText.textContent = currentUser.createdAt ? deps.formatDate?.(currentUser.createdAt) || currentUser.createdAt : "-";
    els.accountRankText.textContent = deps.formatRank?.(currentUser) || "-";
    renderAvatarPreview(currentUser.picture, currentUser.name || currentUser.email || "Q");
  };

  return {
    mount() {
      if (mounted) return;
      mounted = true;
      const els = getElements();

      bind(els.accountForm, "submit", (event) => {
        event.preventDefault();
        deps.save?.();
      });

      bind(els.accountAvatarUrl, "input", () => {
        updateAvatarPreview();
      });

      bind(els.accountAvatarFile, "change", (event) => {
        handleAvatarFile(event);
      });

      bind(els.accountClearAvatarBtn, "click", () => {
        clearAvatar();
      });

      bind(els.accountCountrySelect, "change", () => {
        deps.renderRegions?.(els.accountRegionSelect, els.accountCountrySelect.value);
      });

      bind(els.accountResumeFile, "change", (event) => {
        deps.handleResumeFile?.(event);
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
