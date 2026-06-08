#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
loadEnvFromProjectRoot();
const runtimeConfig = loadRuntimeConfig();
const clientId = clean(process.env.QUANTGYM_GOOGLE_CLIENT_ID || runtimeConfig.googleClientId);
const outputPath = path.join(root, "artifacts", "google-id-token-helper.html");
const localUrl = "http://127.0.0.1:5179/artifacts/google-id-token-helper.html";

if (!clientId) {
  console.error("Google Client ID is missing. Set QUANTGYM_GOOGLE_CLIENT_ID or config.js googleClientId first.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(outputPath, helperHtml(clientId));

console.log(JSON.stringify({
  status: "created",
  path: path.relative(root, outputPath),
  url: localUrl,
  clientIdSet: true,
  nextSteps: [
    "Keep the Vite dev server running on http://127.0.0.1:5179.",
    `Open ${localUrl} in the browser.`,
    "Sign in with Google and copy the generated ID token.",
    "Run QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries before the token expires. The verifier checks token structure, audience, and expiry before calling the provider login endpoint."
  ]
}, null, 2));

function helperHtml(googleClientId) {
  const escapedClientId = JSON.stringify(googleClientId);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>QuantGym Google ID Token Helper</title>
    <script src="https://accounts.google.com/gsi/client" async defer></script>
    <style>
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f8ff;
        color: #171827;
      }
      main {
        max-width: 760px;
        margin: 48px auto;
        padding: 32px;
        background: #fff;
        border: 1px solid #dfe3f5;
        border-radius: 14px;
        box-shadow: 0 20px 50px rgba(43, 49, 86, 0.12);
      }
      h1 {
        margin: 0 0 12px;
        font-size: 28px;
      }
      p, li {
        line-height: 1.6;
        color: #596070;
      }
      code {
        background: #f0f2ff;
        border-radius: 6px;
        padding: 2px 6px;
      }
      textarea {
        width: 100%;
        min-height: 160px;
        margin-top: 16px;
        box-sizing: border-box;
        border: 1px solid #cfd5ee;
        border-radius: 10px;
        padding: 14px;
        font: 13px ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      button {
        margin-top: 12px;
        border: 0;
        border-radius: 10px;
        padding: 11px 16px;
        background: #5b5ff5;
        color: #fff;
        font-weight: 700;
        cursor: pointer;
      }
      button:disabled {
        cursor: not-allowed;
        opacity: 0.55;
      }
      .muted {
        color: #7b8192;
      }
      .status {
        margin-top: 12px;
        min-height: 22px;
        font-weight: 700;
      }
    </style>
  </head>
  <body>
    <main>
      <h1>QuantGym Google ID Token Helper</h1>
      <p>This local helper obtains a short-lived Google ID token for release-boundary verification. It does not write the token to disk or send it anywhere except Google's Sign-In script.</p>
      <ol>
        <li>Use this page only from <code>http://127.0.0.1:5179</code>.</li>
        <li>Click the Google sign-in button below.</li>
        <li>Copy the token into your shell as <code>QUANTGYM_GOOGLE_ID_TOKEN</code>.</li>
        <li>Run <code>npm run verify:production-boundaries</code> or <code>npm run check:release-readiness</code> before the token expires. The verifier checks token structure, audience, and expiry first.</li>
      </ol>
      <div id="googleButton"></div>
      <textarea id="tokenOutput" spellcheck="false" placeholder="Google ID token will appear here after sign-in." readonly></textarea>
      <button id="copyTokenBtn" type="button" disabled>Copy token</button>
      <p id="status" class="status muted"></p>
    </main>
    <script>
      const clientId = ${escapedClientId};
      const tokenOutput = document.getElementById("tokenOutput");
      const copyButton = document.getElementById("copyTokenBtn");
      const status = document.getElementById("status");

      function decodePayload(token) {
        try {
          const part = token.split(".")[1] || "";
          const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
          return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
        } catch {
          return {};
        }
      }

      function handleCredential(response) {
        const token = response && response.credential ? response.credential : "";
        tokenOutput.value = token;
        copyButton.disabled = !token;
        const payload = decodePayload(token);
        const expiresAt = payload.exp ? new Date(payload.exp * 1000).toLocaleString() : "unknown";
        status.textContent = token
          ? "Token ready. Audience: " + (payload.aud || "unknown") + ". Expires: " + expiresAt + "."
          : "Google did not return a credential.";
      }

      function initGoogle() {
        if (!window.google || !window.google.accounts || !window.google.accounts.id) {
          status.textContent = "Waiting for Google Sign-In script...";
          window.setTimeout(initGoogle, 250);
          return;
        }
        window.google.accounts.id.initialize({
          client_id: clientId,
          callback: handleCredential
        });
        window.google.accounts.id.renderButton(document.getElementById("googleButton"), {
          theme: "outline",
          size: "large",
          width: 360
        });
        status.textContent = "Ready.";
      }

      copyButton.addEventListener("click", async () => {
        await navigator.clipboard.writeText(tokenOutput.value);
        status.textContent = "Copied. Run: QUANTGYM_GOOGLE_ID_TOKEN='<token>' npm run verify:production-boundaries";
      });

      window.addEventListener("load", initGoogle);
    </script>
  </body>
</html>
`;
}

function loadEnvFromProjectRoot() {
  const envPath = path.join(root, ".env");
  if (!fs.existsSync(envPath)) return;
  for (const rawLine of fs.readFileSync(envPath, "utf8").split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const separatorIndex = line.indexOf("=");
    if (separatorIndex <= 0) continue;
    const key = line.slice(0, separatorIndex).trim();
    if (process.env[key] != null) continue;
    process.env[key] = unquote(line.slice(separatorIndex + 1).trim());
  }
}

function loadRuntimeConfig() {
  const configPath = path.join(root, "config.js");
  if (!fs.existsSync(configPath)) return {};
  const sandbox = { window: {} };
  vm.runInNewContext(fs.readFileSync(configPath, "utf8"), sandbox, {
    filename: configPath,
    timeout: 1000
  });
  return sandbox.window.QUANTGYM_CONFIG || {};
}

function unquote(value) {
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) {
    return value.slice(1, -1);
  }
  return value;
}

function clean(value) {
  return String(value || "").trim();
}
