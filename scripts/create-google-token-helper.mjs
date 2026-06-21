#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const deployedMode = args.includes("--deployed");
const configUrl = clean(
  getArgValue("--config-url")
  || getArgValue("--deployed-config")
  || (deployedMode ? "https://beta.quantgym.app/config.js" : "")
);
loadEnvFromProjectRoot();
const runtimeConfig = configUrl ? await loadRuntimeConfigFromUrl(configUrl) : loadRuntimeConfig();
const argClientId = clean(getArgValue("--client-id"));
const envClientId = configUrl ? "" : clean(process.env.QUANTGYM_GOOGLE_CLIENT_ID);
const explicitClientId = clean(argClientId || envClientId);
const clientId = clean(explicitClientId || runtimeConfig.googleClientId);
const target = configUrl || deployedMode ? "deployed" : "local";
const verifyCommand = target === "deployed"
  ? "npm run verify:production-boundaries:deployed:paste-token"
  : "npm run verify:production-boundaries:paste-token or npm run check:release-readiness:local:paste-token";
const outputPath = path.join(root, "artifacts", "google-id-token-helper.html");
const localUrl = "http://127.0.0.1:5179/artifacts/google-id-token-helper.html";
const deployedOrigin = target === "deployed" && configUrl ? new URL(configUrl).origin : "";

if (!clientId) {
  console.error("Google Client ID is missing. Set QUANTGYM_GOOGLE_CLIENT_ID, pass --client-id, or provide a config.js with googleClientId.");
  process.exit(1);
}

fs.mkdirSync(path.dirname(outputPath), { recursive: true });
fs.writeFileSync(
  outputPath,
  target === "deployed"
    ? deployedHelperHtml(clientId, { target, verifyCommand, deployedOrigin })
    : localHelperHtml(clientId, { target, verifyCommand })
);

console.log(JSON.stringify({
  status: "created",
  path: path.relative(root, outputPath),
  url: localUrl,
  target,
  deployedOrigin: deployedOrigin || undefined,
  clientIdSource: argClientId ? "argument" : (envClientId ? "environment" : (configUrl || "local config.js")),
  clientIdSet: true,
  verifyCommand,
  nextSteps: target === "deployed"
    ? [
        `Open ${localUrl} for the generated external-browser instructions.`,
        `Open ${deployedOrigin} in the browser account that can sign in with Google.`,
        "Paste the generated Console snippet into that deployed page, then click the injected Google sign-in button.",
        `Paste the copied token into ${verifyCommand} before it expires. The verifier checks token structure, audience, and expiry before calling the deployed provider login endpoint.`
      ]
    : [
        "Keep the Vite dev server running on http://127.0.0.1:5179.",
        `Open ${localUrl} in the browser.`,
        "Sign in with Google and copy the generated ID token.",
        `Run ${verifyCommand} before the token expires. The verifier checks token structure, audience, and expiry before calling the provider login endpoint.`
      ]
}, null, 2));

function localHelperHtml(googleClientId, details) {
  const escapedClientId = JSON.stringify(googleClientId);
  const escapedTarget = JSON.stringify(details.target);
  const escapedVerifyCommand = JSON.stringify(details.verifyCommand);
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
      <p>This local helper obtains a short-lived Google ID token for <code>${details.target}</code> release-boundary verification. It does not write the token to disk or send it anywhere except Google's Sign-In script.</p>
      <ol>
        <li>Use this page only from <code>http://127.0.0.1:5179</code>.</li>
        <li>Click the Google sign-in button below.</li>
        <li>Copy the token into your shell as <code>QUANTGYM_GOOGLE_ID_TOKEN</code>.</li>
        <li>Immediately run <code>${details.verifyCommand}</code>. The wrapper hides the pasted token, rejects expired or nearly expired tokens before touching evidence files, and passes fresh tokens only to the child process.</li>
      </ol>
      <p class="muted">Verifier freshness rule: tokens must have at least 120 seconds remaining.</p>
      <div id="googleButton"></div>
      <textarea id="tokenOutput" spellcheck="false" placeholder="Google ID token will appear here after sign-in." readonly></textarea>
      <button id="copyTokenBtn" type="button" disabled>Copy token</button>
      <p id="status" class="status muted"></p>
    </main>
    <script>
      const clientId = ${escapedClientId};
      const target = ${escapedTarget};
      const verifyCommand = ${escapedVerifyCommand};
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

      function expiryText(payload) {
        if (!payload.exp) return "Expiry: unknown.";
        const secondsRemaining = Math.floor(payload.exp - Date.now() / 1000);
        const expiresAt = new Date(payload.exp * 1000).toLocaleString();
        const urgency = secondsRemaining < 120
          ? " Generate a new token before running the verifier."
          : " Run the verifier now.";
        return "Expires: " + expiresAt + " (" + secondsRemaining + " seconds remaining)." + urgency;
      }

      function handleCredential(response) {
        const token = response && response.credential ? response.credential : "";
        tokenOutput.value = token;
        copyButton.disabled = !token;
        const payload = decodePayload(token);
        status.textContent = token
          ? "Token ready for " + target + ". Audience: " + (payload.aud || "unknown") + ". " + expiryText(payload) + " Command: " + verifyCommand
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
        status.textContent = "Copied. Run immediately: " + verifyCommand;
      });

      window.addEventListener("load", initGoogle);
    </script>
  </body>
</html>
`;
}

function deployedHelperHtml(googleClientId, details) {
  const consoleSnippet = deployedConsoleSnippet(googleClientId, details);
  const escapedClientId = JSON.stringify(googleClientId);
  const escapedOrigin = JSON.stringify(details.deployedOrigin);
  const escapedVerifyCommand = JSON.stringify(details.verifyCommand);
  const escapedConsoleSnippet = JSON.stringify(consoleSnippet);
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <title>QuantGym Deployed Google ID Token Helper</title>
    <style>
      body {
        margin: 0;
        font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background: #f7f8ff;
        color: #171827;
      }
      main {
        max-width: 880px;
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
        min-height: 300px;
        margin-top: 16px;
        box-sizing: border-box;
        border: 1px solid #cfd5ee;
        border-radius: 10px;
        padding: 14px;
        font: 13px ui-monospace, SFMono-Regular, Menlo, monospace;
      }
      button, a.button {
        display: inline-flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        margin: 12px 10px 0 0;
        border: 0;
        border-radius: 10px;
        padding: 11px 16px;
        background: #5b5ff5;
        color: #fff;
        font-weight: 700;
        text-decoration: none;
        cursor: pointer;
      }
      .muted {
        color: #7b8192;
      }
      .warning {
        margin-top: 16px;
        padding: 12px 14px;
        border: 1px solid #f0c36b;
        border-radius: 10px;
        background: #fff8e6;
        color: #5d4716;
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
      <h1>QuantGym Deployed Google ID Token Helper</h1>
      <p>This helper prepares a Console snippet for deployed release-boundary verification. It does not write the token to disk. The Google sign-in button must run from <code>${details.deployedOrigin}</code>, because the deployed OAuth Client ID is authorized for that origin.</p>
      <p class="warning">Do not click Google sign-in from <code>http://127.0.0.1:5179</code> with the deployed Client ID. Google will reject that as <code>origin_mismatch</code>.</p>
      <p class="warning">Use the copied token only with <code>${details.verifyCommand}</code>. It is minted for the deployed Client ID; the local verifier expects a different Client ID and will reject it with an audience mismatch.</p>
      <ol>
        <li>Open <a href="${details.deployedOrigin}" target="_blank" rel="noreferrer">${details.deployedOrigin}</a> in your normal browser.</li>
        <li>Open DevTools Console on that deployed page.</li>
        <li>Copy and paste the snippet below, then click the injected Google sign-in button.</li>
        <li>Paste the copied token into <code>${details.verifyCommand}</code> immediately. Tokens are short-lived.</li>
      </ol>
      <p class="muted">Expected deployed Client ID: <code id="expectedClientId"></code></p>
      <textarea id="consoleSnippet" spellcheck="false" readonly></textarea>
      <button id="copySnippetBtn" type="button">Copy Console snippet</button>
      <a id="openDeployedBtn" class="button" href="${details.deployedOrigin}" target="_blank" rel="noreferrer">Open deployed site</a>
      <p id="status" class="status muted">Ready.</p>
    </main>
    <script>
      const expectedClientId = ${escapedClientId};
      const deployedOrigin = ${escapedOrigin};
      const verifyCommand = ${escapedVerifyCommand};
      const consoleSnippet = ${escapedConsoleSnippet};
      const snippetOutput = document.getElementById("consoleSnippet");
      const status = document.getElementById("status");
      document.getElementById("expectedClientId").textContent = expectedClientId;
      snippetOutput.value = consoleSnippet;

      document.getElementById("copySnippetBtn").addEventListener("click", async () => {
        await navigator.clipboard.writeText(consoleSnippet);
        status.textContent = "Copied. Open " + deployedOrigin + ", paste it into Console, then run " + verifyCommand + " as soon as the token is copied.";
      });
    </script>
  </body>
</html>
`;
}

function deployedConsoleSnippet(googleClientId, details) {
  return `(async () => {
  const expectedOrigin = ${JSON.stringify(details.deployedOrigin)};
  const expectedClientId = ${JSON.stringify(googleClientId)};
  const verifyCommand = ${JSON.stringify(details.verifyCommand)};
  if (location.origin !== expectedOrigin) {
    throw new Error("Open " + expectedOrigin + " first. Running this on " + location.origin + " will cause Google origin_mismatch.");
  }

  const waitForGoogle = async () => {
    for (let attempt = 0; attempt < 60; attempt += 1) {
      if (window.google && window.google.accounts && window.google.accounts.id) return;
      await new Promise((resolve) => setTimeout(resolve, 100));
    }
    throw new Error("Google Identity Services did not load.");
  };

  if (!window.google || !window.google.accounts || !window.google.accounts.id) {
    const script = document.createElement("script");
    script.src = "https://accounts.google.com/gsi/client";
    script.async = true;
    script.defer = true;
    document.head.appendChild(script);
  }
  await waitForGoogle();

  const configuredClientId = String((window.QUANTGYM_CONFIG && window.QUANTGYM_CONFIG.googleClientId) || "").trim();
  const clientId = configuredClientId || expectedClientId;
  if (clientId !== expectedClientId) {
    console.warn("QuantGym deployed config Client ID differs from the helper expectation.", { configuredClientId, expectedClientId });
  }

  const existing = document.getElementById("qg-google-token-panel");
  if (existing) existing.remove();
  const panel = document.createElement("div");
  panel.id = "qg-google-token-panel";
  panel.style.cssText = [
    "position:fixed",
    "z-index:999999",
    "top:16px",
    "left:16px",
    "max-width:460px",
    "background:#fff",
    "color:#171827",
    "padding:16px",
    "border:1px solid #dfe3f5",
    "border-radius:12px",
    "box-shadow:0 18px 42px rgba(20,24,44,.22)",
    "font:14px system-ui,-apple-system,BlinkMacSystemFont,Segoe UI,sans-serif"
  ].join(";");
  panel.innerHTML = [
    "<strong>QuantGym Google token</strong>",
    "<p style='margin:8px 0;color:#596070'>Click the Google button, then paste the copied token into Codex immediately.</p>",
    "<div id='qg-google-button'></div>",
    "<textarea id='qg-google-token-output' readonly spellcheck='false' style='box-sizing:border-box;width:100%;height:128px;margin-top:10px;border:1px solid #cfd5ee;border-radius:8px;padding:10px;font:12px ui-monospace,SFMono-Regular,Menlo,monospace'></textarea>",
    "<p id='qg-google-token-expires' style='margin:10px 0 0;color:#596070;font-weight:700'>Minimum verifier window: 120 seconds. No token yet.</p>",
    "<button id='qg-google-token-copy' type='button' style='margin-top:10px;border:0;border-radius:8px;background:#5b5ff5;color:#fff;font-weight:700;padding:9px 12px;cursor:pointer'>Copy token</button>",
    "<p id='qg-google-token-status' style='margin:10px 0 0;color:#7b8192;font-weight:700'>Ready.</p>"
  ].join("");
  document.body.appendChild(panel);

  const tokenOutput = panel.querySelector("#qg-google-token-output");
  const copyButton = panel.querySelector("#qg-google-token-copy");
  const expires = panel.querySelector("#qg-google-token-expires");
  const status = panel.querySelector("#qg-google-token-status");
  const minimumVerifierSeconds = 120;
  let latestPayload = {};
  let tokenExpiryTimer = null;

  const decodePayload = (token) => {
    try {
      const part = token.split(".")[1] || "";
      const padded = part.padEnd(part.length + ((4 - (part.length % 4)) % 4), "=");
      return JSON.parse(atob(padded.replace(/-/g, "+").replace(/_/g, "/")));
    } catch {
      return {};
    }
  };

  const updateTokenExpiryStatus = () => {
    const expiry = Number(latestPayload.exp || 0);
    if (!expiry) {
      expires.style.color = "#596070";
      expires.textContent = "Minimum verifier window: 120 seconds. No token yet.";
      return;
    }
    const remaining = Math.floor(expiry - Date.now() / 1000);
    if (remaining < minimumVerifierSeconds) {
      expires.style.color = "#9f2d20";
      expires.textContent = "Minimum verifier window: 120 seconds. Token has only " + remaining + " seconds remaining; click Google again.";
      status.textContent = "Token is too close to expiry. Click Google again, then run " + verifyCommand + " immediately.";
      return;
    }
    expires.style.color = "#256c3a";
    expires.textContent = "Minimum verifier window: 120 seconds. Token expires in " + remaining + " seconds. Run now: " + verifyCommand;
  };

  copyButton.addEventListener("click", async () => {
    await navigator.clipboard.writeText(tokenOutput.value);
    updateTokenExpiryStatus();
    status.textContent = "Copied. Run now: " + verifyCommand;
  });

  window.google.accounts.id.initialize({
    client_id: clientId,
    callback: async ({ credential }) => {
      const token = credential || "";
      tokenOutput.value = token;
      const payload = decodePayload(token);
      latestPayload = payload;
      if (tokenExpiryTimer) clearInterval(tokenExpiryTimer);
      updateTokenExpiryStatus();
      tokenExpiryTimer = setInterval(updateTokenExpiryStatus, 1000);
      const remaining = payload.exp ? Math.floor(payload.exp - Date.now() / 1000) : "unknown";
      if (token) await navigator.clipboard.writeText(token).catch(() => {});
      status.textContent = token
        ? "Token copied. Paste it to Codex immediately. Audience: " + (payload.aud || "unknown") + ". Seconds remaining: " + remaining + "."
        : "Google did not return a credential.";
      console.log("Token copied. Paste it to Codex immediately.", { audience: payload.aud, secondsRemaining: remaining });
    }
  });
  window.google.accounts.id.renderButton(panel.querySelector("#qg-google-button"), {
    theme: "outline",
    size: "large",
    width: 320
  });
})();`;
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
  return evaluateRuntimeConfig(fs.readFileSync(configPath, "utf8"), configPath);
}

async function loadRuntimeConfigFromUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error(`Invalid config URL: ${value}`);
  }
  if (url.protocol !== "https:" && url.protocol !== "http:") {
    throw new Error(`Config URL must use http or https: ${value}`);
  }
  const response = await fetch(url, {
    headers: {
      "accept": "application/javascript,text/javascript,*/*"
    }
  });
  if (!response.ok) {
    throw new Error(`Could not fetch config URL ${url.href}: HTTP ${response.status}`);
  }
  return evaluateRuntimeConfig(await response.text(), url.href);
}

function evaluateRuntimeConfig(source, filename) {
  const sandbox = { window: {} };
  vm.runInNewContext(source, sandbox, {
    filename,
    timeout: 1000
  });
  return sandbox.window.QUANTGYM_CONFIG || {};
}

function getArgValue(name) {
  const index = args.indexOf(name);
  if (index >= 0 && args[index + 1]) return args[index + 1];
  const prefix = `${name}=`;
  const inline = args.find((arg) => arg.startsWith(prefix));
  return inline ? inline.slice(prefix.length) : "";
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
