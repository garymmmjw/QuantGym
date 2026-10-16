import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { transformWithOxc } from 'vite';

const html = await readFile(new URL('../index.html', import.meta.url), 'utf8');
const entry = await readFile(new URL('../src/main.jsx', import.meta.url), 'utf8');
const dataModule = code => `data:text/javascript;base64,${Buffer.from(code).toString('base64')}`;

test('runtime scripts resolve to the origin root from direct localized question links', () => {
  const scripts = [...html.matchAll(/<script\b[^>]*\bsrc="([^"]+)"/g)].map(match => match[1]);
  const runtimeScripts = scripts.filter(src => /(?:config\.js|data\/(?:library-catalog|leetcode-hot-100)\.js)/.test(src));
  assert.equal(runtimeScripts.length, 3);
  for (const pathname of ['/zh/problems?bank=quantvault', '/en/problems?bank=quantvault&question=quantvault-42']) {
    for (const source of runtimeScripts) {
      const url = new URL(source, `http://127.0.0.1:5188${pathname}`);
      assert.ok(source.startsWith('/'), `${source} must not inherit the localized route directory`);
      assert.ok(!url.pathname.startsWith('/zh/') && !url.pathname.startsWith('/en/'));
    }
  }
});

test('delayed configuration loads before either application module captures the API endpoint', async t => {
  const endpoint = 'http://127.0.0.1:8894/api';
  const events = [];
  const requests = [];
  let releaseConfig;
  const harness = { events, element: (type, props, ...children) => ({ type, props, children }) };
  const windowRef = { location: new URL('http://127.0.0.1:5188/zh/problems?bank=quantvault') };
  const documentRef = {
    createElement: () => ({}),
    getElementById: id => id === 'react-root' ? {} : null,
    head: { append(script) {
      const path = new URL(script.src, windowRef.location).pathname;
      requests.push(path);
      if (path === '/config.js') {
        releaseConfig = () => {
          globalThis.QUANTGYM_CONFIG = { cloudApiEndpoint: endpoint, googleLoginEnabled: false };
          events.push('config-ready');
          script.onload();
        };
        return;
      }
      queueMicrotask(() => {
        if (path === '/data/problem-catalog.js') globalThis.quantProblemCatalog = [];
        else if (path === '/data/library-catalog.js') globalThis.quantLibraryCatalog = [];
        else if (path === '/data/leetcode-hot-100.js') globalThis.leetcodeHot100 = { problems: [] };
        else assert.fail(`Unexpected bootstrap script: ${path}`);
        script.onload();
      });
    } }
  };
  const globals = { __bootstrapTest: harness, window: windowRef, document: documentRef,
    QUANTGYM_CONFIG: undefined, quantProblemCatalog: undefined, quantLibraryCatalog: undefined, leetcodeHot100: undefined };
  for (const [key, value] of Object.entries(globals)) {
    const previous = Object.getOwnPropertyDescriptor(globalThis, key);
    Object.defineProperty(globalThis, key, { configurable: true, writable: true, value });
    t.after(() => previous ? Object.defineProperty(globalThis, key, previous) : delete globalThis[key]);
  }
  // Execute the real entry point, replacing only React rendering and the two
  // heavy application modules. Both stubs import the real runtime constants.
  const constants = new URL(`../src/constants.js?bootstrap=${Date.now()}`, import.meta.url).href;
  const replacements = {
    react: dataModule('export const StrictMode = "strict";'),
    'react-dom/client': dataModule('export const createRoot = () => ({ render: () => globalThis.__bootstrapTest.events.push("rendered") });'),
    './lib/problemCatalogScriptUrl.js': new URL('../src/lib/problemCatalogScriptUrl.js', import.meta.url).href,
    './App.jsx': dataModule(`import { DEFAULT_CLOUD_API_ENDPOINT } from ${JSON.stringify(constants)};
      globalThis.__bootstrapTest.events.push(['app-evaluated', DEFAULT_CLOUD_API_ENDPOINT]);
      export const App = () => null;`),
    './app/createAppServices.js': dataModule(`import { DEFAULT_CLOUD_API_ENDPOINT } from ${JSON.stringify(constants)};
      globalThis.__bootstrapTest.events.push(['services-evaluated', DEFAULT_CLOUD_API_ENDPOINT]);
      export const createAppServices = () => ({ endpoint: DEFAULT_CLOUD_API_ENDPOINT });`)
  };
  let runnable = entry.replace(/^import\s+["'][^"']+\.css["'];\s*$/gm, '');
  for (const [specifier, replacement] of Object.entries(replacements)) {
    runnable = runnable.replaceAll(JSON.stringify(specifier), JSON.stringify(replacement));
  }
  runnable = runnable.replace('void mountApp();', 'globalThis.__bootstrapTest.ready = mountApp();');
  const transformed = await transformWithOxc(runnable, 'runtime-bootstrap.jsx', {
    jsx: { runtime: 'classic', pragma: 'globalThis.__bootstrapTest.element' }
  });
  await import(dataModule(transformed.code));
  assert.deepEqual(events, [], 'neither App nor its services may evaluate while config.js is pending');
  assert.deepEqual(requests, ['/config.js']);
  releaseConfig();
  await harness.ready;
  assert.deepEqual(requests.sort(), ['/config.js', '/data/leetcode-hot-100.js', '/data/library-catalog.js', '/data/problem-catalog.js']);
  assert.equal(events[0], 'config-ready');
  assert.equal(events.at(-1), 'rendered');
  assert.deepEqual(events.filter(Array.isArray).sort(), [
    ['app-evaluated', endpoint], ['services-evaluated', endpoint]
  ]);
});
