#!/usr/bin/env node

import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const args = parseArgs(process.argv.slice(2));
const projectRoot = path.resolve(args.root || defaultRoot);
const summaryPath = args.summary
  ? path.resolve(projectRoot, args.summary)
  : path.join(projectRoot, "docs", "browser-audit-screenshots", "332-browser-extension-runtime-smoke-summary.json");
const extensionDir = path.join(projectRoot, "browser-extension");

const failures = [];
const checks = {};
const calls = {
  storageGets: 0,
  storageSets: [],
  tabQueries: [],
  openedTabs: [],
  tabUpdates: [],
  captureVisibleTab: [],
  sentMessages: [],
  scriptExecutions: []
};

async function runSmoke() {
  const popupHtml = readRequired("browser-extension/popup.html");
  const popupJs = readRequired("browser-extension/popup.js");
  const ids = [...popupHtml.matchAll(/\bid="([^"]+)"/g)].map((match) => match[1]);
  for (const id of ["sourceHost", "problemTitle", "problemMeta", "problemPrompt", "boardUrl", "recordBtn", "copyBtn", "status"]) {
    assert(ids.includes(id), `popup.html is missing #${id}`);
  }

  const popupDocument = createPopupDocument(ids);
  const pageDocument = createProblemPageDocument({
    title: "Two Sum - LeetCode",
    h1: "Two Sum",
    prompt: [
      "Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target.",
      "You may assume that each input would have exactly one solution, and you may not use the same element twice.",
      "Return the answer in any order."
    ].join("\n\n"),
    body: "Easy Array Hash Table Dynamic Programming",
    tags: ["Array", "Hash Table", "Dynamic Programming"]
  });
  const pageLocation = {
    hostname: "leetcode.com",
    href: "https://leetcode.com/problems/two-sum/"
  };
  const storageState = {};
  let clipboardText = "";
  let context;

  const chrome = {
    storage: {
      local: {
        async get(defaults = {}) {
          calls.storageGets += 1;
          return { ...defaults, ...storageState };
        },
        async set(values = {}) {
          calls.storageSets.push({ ...values });
          Object.assign(storageState, values);
        }
      }
    },
    tabs: {
      onUpdated: createTabUpdatedEvent(),
      async query(query) {
        calls.tabQueries.push({ ...query });
        return [{
          id: 77,
          windowId: 11,
          title: "Two Sum - LeetCode",
          url: pageLocation.href
        }];
      },
      async captureVisibleTab(windowId, options = {}) {
        calls.captureVisibleTab.push({ windowId, options: { ...options } });
        return "data:image/jpeg;base64,ZmFrZS12aWV3cG9ydA==";
      },
      async create(options = {}) {
        const tab = { id: 88 + calls.openedTabs.length, url: options.url, active: options.active !== false };
        calls.openedTabs.push({ ...options, id: tab.id });
        setTimeout(() => {
          chrome.tabs.onUpdated.dispatch(tab.id, { status: "complete" }, tab);
        }, 0);
        return tab;
      },
      async sendMessage(tabId, message) {
        calls.sentMessages.push({ tabId, message });
        return { ok: true };
      },
      async update(tabId, options = {}) {
        calls.tabUpdates.push({ tabId, options: { ...options } });
        return { id: tabId, ...options };
      }
    },
    scripting: {
      async executeScript({ target, func }) {
        calls.scriptExecutions.push({ target });
        assert(target?.tabId === 77, "executeScript must target the active tab id");
        const originalDocument = context.document;
        const originalLocation = context.location;
        context.document = pageDocument;
        context.location = pageLocation;
        try {
          return [{ result: func() }];
        } finally {
          context.document = originalDocument;
          context.location = originalLocation;
        }
      }
    }
  };

  context = vm.createContext({
    console,
    document: popupDocument,
    navigator: {
      clipboard: {
        async writeText(value) {
          clipboardText = String(value);
        }
      }
    },
    chrome,
    URL,
    TextEncoder,
    Date,
    setTimeout,
    clearTimeout,
    btoa(value) {
      return Buffer.from(String(value), "binary").toString("base64");
    }
  });

  vm.runInContext(popupJs, context, {
    filename: path.join(extensionDir, "popup.js")
  });

  await popupDocument.dispatchEvent({ type: "DOMContentLoaded" });

  const els = popupDocument.elements;
  const renderedTags = els.problemMeta.children.map((child) => child.textContent);
  checks.popupLoaded = true;
  checks.storageDefaultLoaded = els.boardUrl.value === "https://beta.quantgym.app/";
  checks.activeTabQueried = calls.tabQueries.length === 1 && calls.tabQueries[0].active === true;
  checks.scriptExecuted = calls.scriptExecutions.length === 1;
  checks.sourceHostRendered = els.sourceHost.textContent === "leetcode.com";
  checks.problemTitleRendered = els.problemTitle.textContent === "Two Sum";
  checks.problemPromptRendered = /array of integers/.test(els.problemPrompt.textContent);
  checks.problemMetaRendered = renderedTags.includes("leetcode") && renderedTags.includes("Easy") && renderedTags.includes("Array");
  assertAllChecks("initial popup capture");

  await els.copyBtn.click();
  const copiedProblem = JSON.parse(clipboardText);
  checks.copyJsonWroteClipboard = copiedProblem.titleEn === "Two Sum" && copiedProblem.sourceUrl === pageLocation.href;
  checks.capturePayloadHasTags = Array.isArray(copiedProblem.tags) && copiedProblem.tags.includes("Array");

  await els.recordBtn.click();
  const opened = new URL(calls.openedTabs.at(-1)?.url || "");
  const sent = calls.sentMessages.at(-1);
  checks.viewportCaptureCalled = calls.captureVisibleTab.length === 1;
  checks.viewportCaptureUsesJpeg = calls.captureVisibleTab[0]?.options?.format === "jpeg";
  checks.bridgeTabOpened = opened.origin === "https://beta.quantgym.app";
  checks.bridgeTabOpenedInactiveFirst = calls.openedTabs.at(-1)?.active === false;
  checks.bridgeTabActivatedAfterMessage = calls.tabUpdates.some((item) => item.tabId === sent?.tabId && item.options.active === true);
  checks.bridgeMessageSent = sent?.message?.type === "quantgym:viewport-capture";
  checks.bridgePayloadHasScreenshot = /^data:image\/jpeg;base64,/.test(sent?.message?.payload?.screenshot?.dataUrl || "");
  checks.bridgePayloadHasTitle = sent?.message?.payload?.pageTitle === "Two Sum - LeetCode";
  checks.bridgePayloadHasSourceUrl = sent?.message?.payload?.sourceUrl === pageLocation.href;

  els.boardUrl.value = "https://beta.quantgym.app/practice?from=extension";
  await els.boardUrl.dispatchEvent({ type: "change" });
  checks.boardUrlSaved = storageState.boardUrl === "https://beta.quantgym.app/practice?from=extension";

	  els.boardUrl.value = "javascript:alert(1)";
	  await els.boardUrl.dispatchEvent({ type: "change" });
	  checks.invalidBoardUrlRejected = storageState.boardUrl === "https://beta.quantgym.app/" && els.boardUrl.value === "https://beta.quantgym.app/";

	  els.boardUrl.value = "http://example.com/insecure";
	  await els.boardUrl.dispatchEvent({ type: "change" });
	  checks.insecureRemoteBoardUrlRejected = storageState.boardUrl === "https://beta.quantgym.app/" && els.boardUrl.value === "https://beta.quantgym.app/";

	  els.boardUrl.value = "http://127.0.0.1:5173/local-board";
	  await els.boardUrl.dispatchEvent({ type: "change" });
	  checks.loopbackHttpBoardUrlAllowed = storageState.boardUrl === "http://127.0.0.1:5173/local-board" && els.boardUrl.value === "http://127.0.0.1:5173/local-board";

  pageDocument.setProblem({
    title: "Long Option Pricing Question",
    h1: "Long Option Pricing Question",
    prompt: `${"Delta hedging ".repeat(700)}Explain the rebalancing policy.`,
    body: "Hard option greeks volatility",
    tags: ["Option Pricing", "Volatility", "Risk"]
  });
  pageLocation.href = "https://example.com/questions/long-option";
  pageLocation.hostname = "example.com";
  await context.captureCurrentTab();
  await els.copyBtn.click();
  const longCopiedProblem = JSON.parse(clipboardText);
  checks.longCaptureCopiesJson = longCopiedProblem.titleEn === "Long Option Pricing Question";
  checks.longCaptureStatusUpdated = /已复制/.test(els.status.textContent);

  assertAllChecks("popup actions");
}

function assertAllChecks(label) {
  const failed = Object.entries(checks)
    .filter(([, value]) => value !== true)
    .map(([name]) => name);
  assert(failed.length === 0, `${label} checks failed: ${failed.join(", ")}`);
}

function createPopupDocument(ids) {
  const listeners = new Map();
  const elements = {};
  for (const id of ids) elements[id] = new FakeElement(id);
  return {
    elements,
    getElementById(id) {
      return elements[id] || null;
    },
    createElement(tagName) {
      return new FakeElement("", tagName);
    },
    addEventListener(type, handler) {
      if (!listeners.has(type)) listeners.set(type, []);
      listeners.get(type).push(handler);
    },
    async dispatchEvent(event) {
      const type = typeof event === "string" ? event : event?.type;
      for (const handler of listeners.get(type) || []) {
        await handler(event);
      }
    }
  };
}

function createProblemPageDocument(problem) {
  const state = { ...problem };
  const api = {
    title: state.title,
    body: new PageNode(`${state.body}\n${state.prompt}`),
    setProblem(next) {
      Object.assign(state, next);
      api.title = state.title;
      api.body = new PageNode(`${state.body}\n${state.prompt}`);
    },
    querySelector(selector) {
      if (selector.includes('meta[property="og:title"]') || selector.includes('meta[name="og:title"]')) {
        return { content: state.title };
      }
      if (selector === "h1") return new PageNode(state.h1);
      if (selector === '[data-track-load="description_content"]') return new PageNode(state.prompt);
      if (selector === "article" || selector === "main" || selector.includes("description") || selector.includes("question-content")) {
        return new PageNode(state.prompt);
      }
      return null;
    },
    querySelectorAll(selector) {
      if (selector === "a, button, span") {
        return state.tags.map((tag) => new PageNode(tag));
      }
      return [];
    }
  };
  return api;
}

function createTabUpdatedEvent() {
  const listeners = new Set();
  return {
    addListener(listener) {
      listeners.add(listener);
    },
    removeListener(listener) {
      listeners.delete(listener);
    },
    dispatch(tabId, changeInfo, tab) {
      for (const listener of listeners) listener(tabId, changeInfo, tab);
    }
  };
}

class FakeElement {
  constructor(id = "", tagName = "div") {
    this.id = id;
    this.tagName = tagName.toUpperCase();
    this.children = [];
    this.disabled = false;
    this.value = "";
    this._textContent = "";
    this._innerHTML = "";
    this.listeners = new Map();
  }

  get textContent() {
    return this._textContent;
  }

  set textContent(value) {
    this._textContent = String(value ?? "");
  }

  get innerText() {
    return this.textContent;
  }

  set innerText(value) {
    this.textContent = value;
  }

  get innerHTML() {
    return this._innerHTML;
  }

  set innerHTML(value) {
    this._innerHTML = String(value ?? "");
    this.children = [];
  }

  appendChild(child) {
    this.children.push(child);
    return child;
  }

  addEventListener(type, handler) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(handler);
  }

  async dispatchEvent(event) {
    const type = typeof event === "string" ? event : event?.type;
    for (const handler of this.listeners.get(type) || []) {
      await handler(event);
    }
  }

  async click() {
    await this.dispatchEvent({ type: "click", target: this });
  }
}

class PageNode {
  constructor(text) {
    this.innerText = String(text || "");
    this.textContent = this.innerText;
  }
}

function decodePayload(value) {
  assert(value, "capture payload is missing");
  const padded = String(value).replace(/-/g, "+").replace(/_/g, "/").padEnd(Math.ceil(String(value).length / 4) * 4, "=");
  return JSON.parse(Buffer.from(padded, "base64").toString("utf8"));
}

function readRequired(relativePath) {
  const absolutePath = path.join(projectRoot, relativePath);
  assert(fs.existsSync(absolutePath), `${relativePath} is missing`);
  return fs.readFileSync(absolutePath, "utf8");
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    if (value === "--root") {
      parsed.root = argv[index + 1];
      index += 1;
    } else if (value === "--summary") {
      parsed.summary = argv[index + 1];
      index += 1;
    }
  }
  return parsed;
}

try {
  await runSmoke();
} catch (error) {
  failures.push(error.message || String(error));
}

const summary = {
  status: failures.length ? "fail" : "pass",
  popup: {
    source: "browser-extension/popup.js",
    html: "browser-extension/popup.html",
    defaultBoardUrl: "https://beta.quantgym.app/"
  },
  calls: {
    storageGets: calls.storageGets,
    storageSets: calls.storageSets.length,
    tabQueries: calls.tabQueries.length,
    openedTabs: calls.openedTabs.length,
    tabUpdates: calls.tabUpdates.length,
    captureVisibleTab: calls.captureVisibleTab.length,
    sentMessages: calls.sentMessages.length,
    scriptExecutions: calls.scriptExecutions.length
  },
  checks,
  failures
};

fs.mkdirSync(path.dirname(summaryPath), { recursive: true });
fs.writeFileSync(summaryPath, `${JSON.stringify(summary, null, 2)}\n`);
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (failures.length) process.exitCode = 1;
