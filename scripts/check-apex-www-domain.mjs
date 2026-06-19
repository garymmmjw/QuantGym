#!/usr/bin/env node

import dns from "node:dns/promises";
import fs from "node:fs";
import https from "node:https";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = process.argv.slice(2);
const requireClear = args.includes("--require-clear");
const startedAt = Date.now();
const summaryRequested = Boolean(getArgValue("--summary"));
const summaryPath = path.resolve(
  root,
  getArgValue("--summary") || "docs/browser-audit-screenshots/355-apex-www-domain-summary.json"
);
const signoffCommand = "npm run check:apex-www-domain -- --require-clear";
const promotionHosts = ["quantgym.app", "www.quantgym.app"];
const betaHost = "beta.quantgym.app";
const failures = [];
const warnings = [];

const probes = {};
for (const host of [...promotionHosts, betaHost]) {
  probes[host] = await probeHost(host);
}

const betaProbe = probes[betaHost];
const betaHealthy = isUsableHttps(betaProbe.https);
const apexProbe = probes["quantgym.app"];
const wwwProbe = probes["www.quantgym.app"];
const apexUsableHttps = isUsableHttps(apexProbe.https);
const wwwUsableHttps = isUsableHttps(wwwProbe.https);
const apexWwwClear = betaHealthy && apexUsableHttps && wwwUsableHttps;
const apexCloudflare525Observed = hasStatus(apexProbe.https, 525);
const wwwCloudflare525Observed = hasStatus(wwwProbe.https, 525);
const currentBlockedStateClassified = !apexWwwClear
  && betaHealthy
  && promotionHosts.every((host) => Boolean(blockedReason(probes[host])));

if (!betaHealthy) {
  failures.push("beta.quantgym.app must remain healthy while apex/WWW promotion domains are blocked.");
}

if (requireClear && !apexWwwClear) {
  failures.push(
    `Apex/WWW domain blocker remains: ${promotionHosts.map((host) => `${host}=${blockedReason(probes[host]) || "not usable"}`).join(", ")}.`
  );
}

const summary = {
  id: 355,
  date: "2026-06-19",
  surface: "apex/www domain SSL or redirect",
  status: failures.length ? "fail" : "pass",
  durationMs: Date.now() - startedAt,
  requireClear,
  launchReadiness: apexWwwClear ? "pass" : "blocked",
  signoffCommand,
  betaEntrypoint: summarizeHost(betaHost, betaProbe),
  promotionHosts: promotionHosts.map((host) => summarizeHost(host, probes[host])),
  checks: {
    betaHealthy,
    apexDnsResolved: apexProbe.dns.aRecords.length > 0 || apexProbe.dns.cnameRecords.length > 0,
    wwwDnsResolved: wwwProbe.dns.aRecords.length > 0 || wwwProbe.dns.cnameRecords.length > 0,
    apexHttpsProbeRan: apexProbe.https.probed === true,
    wwwHttpsProbeRan: wwwProbe.https.probed === true,
    apexUsableHttps,
    wwwUsableHttps,
    apexWwwClear,
    apexCloudflare525Observed,
    wwwCloudflare525Observed,
    currentBlockedStateClassified,
    requireClearModeAvailable: true,
    requireClearWouldFail: !apexWwwClear
  },
  failures,
  warnings
};

if (!requireClear || summaryRequested) writeSummary(summary);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;

async function probeHost(host) {
  const [dnsInfo, httpsInfo] = await Promise.all([
    resolveDns(host),
    probeHttps(`https://${host}/`)
  ]);
  return { host, dns: dnsInfo, https: httpsInfo };
}

async function resolveDns(host) {
  const [aRecords, cnameRecords] = await Promise.all([
    resolveRecords(() => dns.resolve4(host)),
    resolveRecords(() => dns.resolveCname(host))
  ]);
  return {
    aRecords,
    cnameRecords
  };
}

async function resolveRecords(fn) {
  try {
    return (await fn()).map((item) => String(item)).sort();
  } catch {
    return [];
  }
}

async function probeHttps(initialUrl) {
  const chain = [];
  let currentUrl = initialUrl;
  let error = "";
  for (let redirectCount = 0; redirectCount <= 3; redirectCount += 1) {
    let response;
    try {
      response = await requestHead(currentUrl, 10000);
    } catch (requestError) {
      error = requestError.message || String(requestError);
      break;
    }
    chain.push(response);
    const location = clean(response.headers.location);
    if (isRedirect(response.statusCode) && location && redirectCount < 3) {
      currentUrl = new URL(location, currentUrl).toString();
      continue;
    }
    break;
  }

  const final = chain[chain.length - 1] || null;
  return {
    probed: true,
    initialUrl,
    finalUrl: final?.url || currentUrl,
    finalStatusCode: final?.statusCode || 0,
    finalHost: parseUrl(final?.url || currentUrl)?.hostname || "",
    cloudflare525: chain.some((item) => item.statusCode === 525),
    chain,
    error
  };
}

function requestHead(url, timeoutMs) {
  return new Promise((resolve, reject) => {
    let settled = false;
    const request = https.request(url, {
      method: "HEAD",
      timeout: timeoutMs,
      headers: {
        Accept: "text/html,*/*",
        "User-Agent": "QuantGymApexWwwDomainSmoke/0.1"
      }
    }, (res) => {
      res.resume();
      res.on("end", () => {
        if (settled) return;
        settled = true;
        resolve({
          url,
          statusCode: res.statusCode || 0,
          headers: {
            location: clean(res.headers.location),
            server: clean(res.headers.server),
            cfRay: clean(res.headers["cf-ray"]),
            contentType: clean(res.headers["content-type"])
          }
        });
      });
    });
    request.on("timeout", () => {
      if (settled) return;
      settled = true;
      request.destroy();
      reject(new Error(`HTTPS request timed out for ${url}.`));
    });
    request.on("error", (error) => {
      if (settled) return;
      settled = true;
      reject(error);
    });
    request.end();
  });
}

function summarizeHost(host, probe) {
  return {
    host,
    dns: probe.dns,
    https: {
      initialUrl: probe.https.initialUrl,
      finalUrl: probe.https.finalUrl,
      finalStatusCode: probe.https.finalStatusCode,
      finalHost: probe.https.finalHost,
      cloudflare525: probe.https.cloudflare525,
      usableHttps: isUsableHttps(probe.https),
      redirectsToBeta: redirectsToBeta(probe.https),
      blockedReason: blockedReason(probe),
      chain: probe.https.chain
    }
  };
}

function isUsableHttps(httpsInfo) {
  return Boolean(
    httpsInfo
      && !httpsInfo.error
      && !httpsInfo.cloudflare525
      && httpsInfo.finalStatusCode >= 200
      && httpsInfo.finalStatusCode < 400
  );
}

function redirectsToBeta(httpsInfo) {
  const first = httpsInfo?.chain?.[0];
  return Boolean(
    first
      && isRedirect(first.statusCode)
      && parseUrl(httpsInfo.finalUrl)?.hostname === betaHost
      && httpsInfo.finalStatusCode >= 200
      && httpsInfo.finalStatusCode < 400
  );
}

function blockedReason(probe) {
  if (!probe) return "missing probe";
  if (probe.https?.error) return probe.https.error;
  if (probe.https?.cloudflare525) return "Cloudflare 525 SSL handshake error";
  if (!probe.https?.finalStatusCode) return "missing HTTPS response";
  if (!isUsableHttps(probe.https)) return `HTTP ${probe.https.finalStatusCode}`;
  return "";
}

function hasStatus(httpsInfo, statusCode) {
  return Boolean(httpsInfo?.chain?.some((item) => item.statusCode === statusCode));
}

function isRedirect(statusCode) {
  return [301, 302, 303, 307, 308].includes(Number(statusCode));
}

function parseUrl(value) {
  try {
    return new URL(clean(value));
  } catch {
    return null;
  }
}

function clean(value) {
  return String(value || "").trim();
}

function writeSummary(summary) {
  fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
  fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
}

function getArgValue(name) {
  const index = args.indexOf(name);
  return index === -1 ? "" : args[index + 1] || "";
}
