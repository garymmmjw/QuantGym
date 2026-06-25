#!/usr/bin/env node

import http from "node:http";
import path from "node:path";
import { spawn } from "node:child_process";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const openAiRequests = [];
const failures = [];

const openAiServer = http.createServer(async (req, res) => {
  const body = await readBody(req);
  const parsed = JSON.parse(body || "{}");
  openAiRequests.push({
    method: req.method,
    url: req.url,
    body: parsed
  });
  res.writeHead(200, { "Content-Type": "application/json" });
  res.end(JSON.stringify({
    output_text: JSON.stringify({
      problem: {
        titleEn: "Viewport Option Pricing Question",
        titleZh: "屏幕期权定价题",
        category: "option",
        difficulty: "Medium",
        tags: ["option", "delta"],
        promptEn: "Explain how delta hedging reduces first-order exposure for an option.",
        promptZh: "解释 delta hedging 如何降低期权的一阶风险暴露。",
        answer: "",
        explanation: ""
      },
      confidence: "high"
    })
  }));
});

const openAiPort = await listen(openAiServer);
const llmPort = await getFreePort();
const llm = spawn(process.execPath, ["llm-proxy/server.mjs"], {
  cwd: projectRoot,
  env: {
    ...process.env,
    PORT: String(llmPort),
    HOST: "127.0.0.1",
    LLM_PROXY_HOST: "127.0.0.1",
    OPENAI_API_KEY: "fixture-key",
    OPENAI_BASE_URL: `http://127.0.0.1:${openAiPort}/v1`,
    OPENAI_TIMEOUT_MS: "10000",
    LLM_AUTH_API_BASE: "",
    LLM_ALLOWED_ORIGINS: "*"
  },
  stdio: ["ignore", "pipe", "pipe"]
});

let stdout = "";
let stderr = "";
llm.stdout.on("data", (chunk) => {
  stdout = trim(stdout + chunk.toString("utf8"));
});
llm.stderr.on("data", (chunk) => {
  stderr = trim(stderr + chunk.toString("utf8"));
});

try {
  await waitForHealth(llmPort);
  const response = await fetch(`http://127.0.0.1:${llmPort}/interview`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      task: "extract_screenshot_question",
      model: "gpt-5-nano",
      language: "zh",
      sourceUrl: "https://example.com/question",
      pageTitle: "Question page",
      pageText: "visible page text",
      screenshot: {
        dataUrl: "data:image/jpeg;base64,ZmFrZS1pbWFnZQ==",
        type: "image/jpeg"
      }
    })
  });
  const data = await response.json().catch(() => ({}));
  const requestBody = openAiRequests[0]?.body || {};
  const content = requestBody.input?.[0]?.content || [];
  const checks = {
    responseOk: response.ok,
    returnedProblemTitle: data.problem?.titleEn === "Viewport Option Pricing Question",
    returnedSourceUrl: data.problem?.sourceUrl === "https://example.com/question",
    openAiCalledOnce: openAiRequests.length === 1,
    openAiInputHasImage: content.some((part) => part.type === "input_image" && /^data:image\/jpeg;base64,/.test(part.image_url || "")),
    openAiInputHasContext: content.some((part) => part.type === "input_text" && /visible page text/.test(part.text || ""))
  };
  for (const [name, passed] of Object.entries(checks)) {
    if (!passed) failures.push(name);
  }
  console.log(JSON.stringify({
    status: failures.length ? "fail" : "pass",
    checks,
    responseStatus: response.status,
    response: data,
    openAiRequests: openAiRequests.length,
    failures,
    stdout,
    stderr
  }, null, 2));
} finally {
  await stopProcess(llm);
  await closeServer(openAiServer);
}

if (failures.length) process.exit(1);

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.setEncoding("utf8");
    req.on("data", (chunk) => {
      body += chunk;
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function listen(server) {
  return new Promise((resolve, reject) => {
    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => resolve(server.address().port));
  });
}

function closeServer(server) {
  return new Promise((resolve) => server.close(() => resolve()));
}

async function getFreePort() {
  const server = http.createServer();
  const port = await listen(server);
  await closeServer(server);
  return port;
}

async function waitForHealth(port) {
  const deadline = Date.now() + 10000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/health`);
      const data = await response.json().catch(() => ({}));
      if (data.ok) return;
    } catch {}
    await sleep(150);
  }
  throw new Error(`LLM proxy did not become healthy. stdout=${stdout} stderr=${stderr}`);
}

function stopProcess(child) {
  return new Promise((resolve) => {
    if (!child || child.exitCode !== null) {
      resolve();
      return;
    }
    child.once("exit", () => resolve());
    child.kill("SIGTERM");
    setTimeout(() => {
      if (child.exitCode === null) child.kill("SIGKILL");
    }, 2000).unref();
  });
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function trim(value) {
  return String(value || "").slice(-4000);
}
