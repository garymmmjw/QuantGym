import { getCloudStatusText } from '../../api/cloud.js';

export function getSettingsCloudStatusText(config = {}, options = {}) {
  return getCloudStatusText(config, {
    currentUser: options.currentUser,
    inFlight: Boolean(options.inFlight),
    t: options.t,
    formatDate: options.formatDate
  });
}

export function renderSettingsCloudStatus(elements = {}, config = {}, options = {}) {
  const node = elements.settingsMessage;
  if (!node) return "";
  const currentText = node.textContent || "";
  const shouldPreserve = options.shouldPreserveMessage || ((value) => value.includes("已保存"));
  if (!options.force && shouldPreserve(currentText)) return currentText;
  const text = getSettingsCloudStatusText(config, options);
  node.textContent = text;
  return text;
}

export async function syncSettingsCloudNow(elements = {}, config = {}, options = {}) {
  const {
    currentUser = null,
    getSyncController = () => null,
    flushSync = async () => {},
    getStatusText = () => "",
    t = (key) => key
  } = options;

  if (!currentUser) return false;
  if (!config.token || config.userId !== currentUser.id) {
    if (elements.settingsMessage) elements.settingsMessage.textContent = t("cloudNoSession");
    return false;
  }

  getSyncController()?.markAllDirty?.();
  if (elements.settingsMessage) elements.settingsMessage.textContent = t("cloudSyncing");
  let result;
  for (let attempt = 0; attempt < 3; attempt += 1) {
    result = await flushSync();
    if (result?.ok !== true) break;
    const dirty = getSyncController()?.getDirty?.() || {};
    if (!Object.values(dirty).some(Boolean)) break;
    // Edits made while /sync was in flight belong to this manual sync too.
    // Continuous editing leaves an honest pending result after bounded retries.
    result = { ok: false };
  }
  const statusText = getStatusText();
  if (elements.settingsMessage) elements.settingsMessage.textContent = statusText;
  return result?.ok === true ? result : { ok: false, error: result?.error };
}
