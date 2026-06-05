export function applyAuthTabState(elements = {}, tab = "login", options = {}) {
  const root = options.root || globalThis.document;
  const activeTab = tab === "register" ? "register" : "login";
  root?.querySelectorAll?.("[data-auth-tab]").forEach((button) => {
    button.classList?.toggle?.("active", button.dataset.authTab === activeTab);
  });
  elements.loginForm?.classList?.toggle?.("hidden", activeTab !== "login");
  elements.registerForm?.classList?.toggle?.("hidden", activeTab !== "register");
  if (elements.authMessage) elements.authMessage.textContent = "";
  return activeTab;
}

export function setRegisterCodeButtonState(button, options = {}) {
  if (!button) return;
  button.disabled = Boolean(options.busy);
  button.textContent = options.label || "";
}

export function renderGoogleClientInput(elements = {}, clientId = "") {
  if (elements.googleClientIdInput) elements.googleClientIdInput.value = clientId || "";
}

export function renderGooglePlaceholder(elements = {}, options = {}) {
  const root = elements.googleButton;
  if (!root) return false;
  const documentRef = options.documentRef || globalThis.document;
  root.innerHTML = "";

  const button = documentRef.createElement("button");
  button.className = "auth-provider-button disabled";
  button.type = "button";
  button.disabled = true;
  button.setAttribute("aria-disabled", "true");

  const mark = documentRef.createElement("span");
  mark.className = "google-mark";
  mark.setAttribute("aria-hidden", "true");
  mark.textContent = "G";

  const label = documentRef.createElement("span");
  label.textContent = options.continueLabel || "";

  const note = documentRef.createElement("small");
  note.textContent = options.disabledLabel || "";

  button.append(mark, label, note);
  root.appendChild(button);
  return true;
}
