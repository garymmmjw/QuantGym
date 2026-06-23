const MAX_BODY_BYTES = 64 * 1024;
const MIN_SECRET_LENGTH = 24;
const encoder = new TextEncoder();

export default {
  async fetch(request, env, ctx) {
    return handleAlertRequest(request, env, ctx);
  }
};

export async function handleAlertRequest(request, env = {}) {
  if (request.method !== "POST") {
    return jsonResponse({ ok: false, error: "method_not_allowed" }, 405, {
      Allow: "POST"
    });
  }

  const secret = readSecret(env);
  if (secret.length < MIN_SECRET_LENGTH) {
    return jsonResponse({ ok: false, error: "receiver_not_configured" }, 500);
  }

  const authHeader = request.headers.get("Authorization") || "";
  if (!timingSafeEqual(authHeader, `Bearer ${secret}`)) {
    return jsonResponse({ ok: false, error: "unauthorized" }, 401);
  }

  const signatureHeader = request.headers.get("X-QuantGym-Alert-Signature") || "";
  if (!/^sha256=[a-f0-9]{64}$/i.test(signatureHeader)) {
    return jsonResponse({ ok: false, error: "bad_signature" }, 401);
  }

  const body = await request.text();
  if (encoder.encode(body).byteLength > MAX_BODY_BYTES) {
    return jsonResponse({ ok: false, error: "payload_too_large" }, 413);
  }

  const expectedSignature = await hmacSha256(secret, body);
  if (!timingSafeEqual(signatureHeader.toLowerCase(), expectedSignature)) {
    return jsonResponse({ ok: false, error: "bad_signature" }, 401);
  }

  let payload;
  try {
    payload = JSON.parse(body);
  } catch {
    return jsonResponse({ ok: false, error: "invalid_json" }, 400);
  }

  const validationError = validateAlertPayload(payload);
  if (validationError) {
    return jsonResponse({ ok: false, error: validationError }, 400);
  }

  return jsonResponse({ ok: true, verified: true }, 200, {
    "X-QuantGym-Alert-Verified": "1"
  });
}

function readSecret(env) {
  return String(env?.QUANTGYM_ALERT_WEBHOOK_TOKEN || env?.ALERT_WEBHOOK_TOKEN || "").trim();
}

function validateAlertPayload(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return "invalid_payload";
  if (payload.service !== "quantgym-api") return "invalid_service";
  if (!safeString(payload.eventType, 1, 120)) return "invalid_event_type";
  if (!Number.isInteger(payload.statusCode) || payload.statusCode < 400 || payload.statusCode > 599) {
    return "invalid_status_code";
  }
  if (!safeString(payload.method, 1, 16)) return "invalid_method";
  if (!safeString(payload.path, 1, 300) || !String(payload.path).startsWith("/")) return "invalid_path";
  if (!safeString(payload.occurredAt, 1, 80)) return "invalid_occurred_at";
  return "";
}

function safeString(value, minLength, maxLength) {
  return typeof value === "string" && value.length >= minLength && value.length <= maxLength;
}

async function hmacSha256(secret, body) {
  const key = await crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const digest = await crypto.subtle.sign("HMAC", key, encoder.encode(body));
  return `sha256=${toHex(new Uint8Array(digest))}`;
}

function toHex(bytes) {
  return [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join("");
}

function timingSafeEqual(left, right) {
  const leftBytes = encoder.encode(String(left || ""));
  const rightBytes = encoder.encode(String(right || ""));
  let diff = leftBytes.length ^ rightBytes.length;
  const maxLength = Math.max(leftBytes.length, rightBytes.length);
  for (let index = 0; index < maxLength; index += 1) {
    diff |= (leftBytes[index] || 0) ^ (rightBytes[index] || 0);
  }
  return diff === 0;
}

function jsonResponse(payload, status, extraHeaders = {}) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Cache-Control": "no-store",
      ...extraHeaders
    }
  });
}
