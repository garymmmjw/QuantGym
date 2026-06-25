const QUANTGYM_BRIDGE_MESSAGE_TYPE = "quantgym:viewport-capture";
const QUANTGYM_PAGE_MESSAGE_SOURCE = "quantgym-collector-extension";

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== QUANTGYM_BRIDGE_MESSAGE_TYPE) return false;

  window.postMessage({
    source: QUANTGYM_PAGE_MESSAGE_SOURCE,
    type: QUANTGYM_BRIDGE_MESSAGE_TYPE,
    payload: message.payload || {}
  }, window.location.origin);

  sendResponse({ ok: true });
  return true;
});
