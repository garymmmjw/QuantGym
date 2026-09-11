(() => {
  if (window.__quantgymCollectorBridge) return;
  window.__quantgymCollectorBridge = true;
  const source = "quantgym-collector-extension";
  const historyType = "quantgym:leetcode-history";
  let ready = false;
  let pending = null;
  const received = new Set();
  function allowedHistoryPage() {
    const url = new URL(window.location.href);
    return !url.username && !url.password && url.pathname.replace(/\/$/, "") === "/leetcode"
      && (["https://beta.quantgym.app", "https://quantgym.app", "https://www.quantgym.app"].includes(url.origin)
        || (url.protocol === "http:" && ["localhost", "127.0.0.1", "[::1]"].includes(url.hostname)));
  }
  function deliver() {
    if (!pending || !allowedHistoryPage()) return;
    if (!ready) {
      window.postMessage({ source, type: "quantgym:leetcode-awaiting", transferId: pending.transferId }, window.location.origin);
      return;
    }
    window.postMessage({ source, type: historyType, transferId: pending.transferId, payload: pending.payload }, window.location.origin);
  }
  window.addEventListener("message", (event) => {
    if (event.source !== window || event.origin !== window.location.origin || !allowedHistoryPage()) return;
    if (event.data?.source !== "quantgym-leetcode-page") return;
    if (event.data.type === "quantgym:leetcode-ready") {
      ready = true;
      deliver();
    } else if (event.data.type === "quantgym:leetcode-ack" && pending?.transferId === event.data.transferId) {
      received.add(pending.transferId);
      if (received.size > 20) received.delete(received.values().next().value);
      pending = null;
    }
  });
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message?.type === "quantgym:viewport-capture") {
      window.postMessage({ source, type: message.type, payload: message.payload || {} }, window.location.origin);
      sendResponse({ ok: true });
      return false;
    }
    if (![historyType, "quantgym:leetcode-status"].includes(message?.type)) return false;
    if (!allowedHistoryPage() || sender?.id !== chrome.runtime.id || !/^[a-zA-Z0-9-]{1,80}$/.test(message.transferId || "")) {
      sendResponse({ ok: false, status: "rejected" });
      return false;
    }
    const { transferId } = message;
    if (received.has(transferId)) {
      sendResponse({ ok: true, status: "received", transferId });
      return false;
    }
    if (message.type === historyType) {
      if (!message.payload || typeof message.payload !== "object") {
        sendResponse({ ok: false, status: "rejected" });
        return false;
      }
      if (!pending || pending.transferId !== transferId) pending = { transferId, payload: message.payload };
      deliver();
    } else if (pending?.transferId === transferId) deliver();
    sendResponse({ ok: true, status: received.has(transferId) ? "received" : pending?.transferId === transferId ? "queued" : "missing", transferId });
    return false;
  });
})();
