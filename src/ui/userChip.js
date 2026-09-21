import { fetchPrivateImage, privateMediaRequest } from '../features/account/privateMedia.js';

const DEFAULT_AVATAR_SRC = "assets/generated/shark-avatar-happy.webp?v=premium-system-4";

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

  for (const target of [elements.userAvatar, elements.commandUserAvatar].filter(Boolean)) {
    const image = documentRef.createElement('img');
    const source = currentUser.picture || DEFAULT_AVATAR_SRC;
    const config = options.cloudConfig || {};
    const request = privateMediaRequest(source, config, currentUser.id);
    image.src = request ? DEFAULT_AVATAR_SRC : source;
    image.alt = '';
    target.appendChild(image);
    if (request && !request.blocked) {
      fetchPrivateImage(source, config, currentUser.id).then(result => {
        if (!image.isConnected || options.isCurrent?.() === false) return;
        const url = URL.createObjectURL(result.blob);
        image.onload = image.onerror = () => URL.revokeObjectURL(url);
        image.src = url;
      }).catch(() => { /* Keep the neutral avatar when the session expires. */ });
    }
  }
}
