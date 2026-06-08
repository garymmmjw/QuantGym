export function buildPokerWebSocketUrl(baseUrl = "", roomId = "") {
  const trimmed = String(baseUrl || "").trim().replace(/\/+$/, "");
  const wsBase = trimmed.replace(/^http/i, "ws");
  const suffix = roomId ? `/${encodeURIComponent(roomId)}` : "";
  return `${wsBase}/poker/ws${suffix}`;
}

export function createPokerSocket(url = "", options = {}) {
  const WebSocketImpl = options.WebSocketImpl || globalThis.WebSocket;
  return WebSocketImpl ? new WebSocketImpl(url) : null;
}
