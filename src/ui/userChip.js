import { getQuantySrc, resolveLegacyQuantySrc } from "../lib/quantyAssets.js";

const DEFAULT_AVATAR_SRC = getQuantySrc("happy", 160);

export function renderUserChip(elements = {}, currentUser = null, options = {}) {
  if (!currentUser) return;
  const documentRef = options.documentRef || globalThis.document;
  const text = options.t || ((key) => key);
  const name = currentUser.name || currentUser.email || "Quant";
  const provider = currentUser.provider === "google" ? "Google" : "Local";
  const commandProvider = currentUser.provider === "google" ? "Google" : text("accountBadge");

  if (elements.userName) elements.userName.textContent = name;
  if (elements.userProvider) elements.userProvider.textContent = provider;
  if (elements.userAvatar) elements.userAvatar.innerHTML = "";
  if (elements.commandUserName) elements.commandUserName.textContent = name;
  if (elements.commandUserProvider) elements.commandUserProvider.textContent = commandProvider;
  if (elements.commandUserAvatar) elements.commandUserAvatar.innerHTML = "";

  const image = documentRef.createElement("img");
  image.src = resolveLegacyQuantySrc(currentUser.picture, 160) || DEFAULT_AVATAR_SRC;
  image.alt = "";
  elements.userAvatar?.appendChild(image);
  if (elements.commandUserAvatar) {
    elements.commandUserAvatar.appendChild(image.cloneNode());
  }
}
