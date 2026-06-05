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
  await flushSync();
  if (elements.settingsMessage) elements.settingsMessage.textContent = getStatusText();
  return true;
}
