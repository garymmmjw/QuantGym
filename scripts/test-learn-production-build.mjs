import test from 'node:test';
import assert from 'node:assert/strict';
import { cpSync, existsSync, mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { spawnSync } from 'node:child_process';
import { LEARN_RENDERER_ASSETS, assertLearnOutputPath, assertLearnRendererOutput } from './lib/learn-renderer-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function temporary(t) {
  const directory = realpathSync(mkdtempSync(path.join(os.tmpdir(), 'qg-learn-build-test-')));
  t.after(() => rmSync(directory, { recursive: true, force: true }));
  return directory;
}
function write(directory, file, content = '') {
  const location = path.join(directory, file); mkdirSync(path.dirname(location), { recursive: true }); writeFileSync(location, content);
}

test('renderer output rejects private JSON, course media and symlinks', t => {
  for (const file of ['private/library.json', 'private/practice.json', 'private/problems.json', 'private/scoring/modules.json', 'private/media/lectures/diagram.png']) {
    const directory = temporary(t); write(directory, file);
    assert.throws(() => assertLearnRendererOutput(directory), /Private content/);
  }
  const safe = temporary(t); write(safe, 'private/pyodide/pyodide-lock.json', '{}'); write(safe, 'private/assets/renderer.js');
  assert.equal(assertLearnRendererOutput(safe).length, 2);
  symlinkSync(path.join(safe, 'private/pyodide/pyodide-lock.json'), path.join(safe, 'linked'));
  assert.throws(() => assertLearnRendererOutput(safe), /Symlinks/);
});

test('output cleaning is constrained to the renderer in known build directories', () => {
  for (const relative of ['dist/learn-embed', 'artifacts/test/web/learn-embed']) assert.doesNotThrow(() => assertLearnOutputPath(root, path.join(root, relative)));
  for (const relative of ['', 'dist', 'src/learn-embed', '../learn-embed', 'QuantVault/learn-preview']) assert.throws(() => assertLearnOutputPath(root, path.resolve(root, relative)), /Learn output/);
  assert.doesNotThrow(() => assertLearnOutputPath(root, '/tmp/isolated-web/learn-embed', '/tmp/isolated-web'));
  assert.throws(() => assertLearnOutputPath(root, '/tmp/unrelated/learn-embed', '/tmp/isolated-web'), /Learn output/);
});

test('a deployment checkout builds with root dependencies only and no captured or private content', t => {
  const directory = temporary(t);
  for (const file of ['scripts/build-learn-embed.mjs', 'scripts/lib/learn-renderer-assets.mjs', 'QuantVault/learn-preview/embed.html']) {
    const target = path.join(directory, file); mkdirSync(path.dirname(target), { recursive: true }); cpSync(path.join(root, file), target);
  }
  for (const file of ['QuantVault/learn-preview/src', 'QuantVault/learn-preview/public/runner', 'QuantVault/learn-preview/renderer-assets']) {
    cpSync(path.join(root, file), path.join(directory, file), { recursive: true });
  }
  // Real installed root dependencies; there is deliberately no prototype
  // node_modules, captures, private/ directory, data/ directory or local .env.
  symlinkSync(path.join(root, 'node_modules'), path.join(directory, 'node_modules'), 'dir');
  for (const file of ['QuantVault/captures', 'QuantVault/data', 'QuantVault/learn-preview/node_modules', 'QuantVault/learn-preview/public/private']) assert.equal(existsSync(path.join(directory, file)), false);
  const output = path.join(directory, 'dist/learn-embed');
  const result = spawnSync(process.execPath, ['scripts/build-learn-embed.mjs', output], { cwd: directory, encoding: 'utf8', maxBuffer: 2 * 1024 * 1024 });
  assert.equal(result.status, 0, result.stderr);
  const files = assertLearnRendererOutput(output);
  assert.ok(existsSync(path.join(output, 'index.html')));
  for (const name of LEARN_RENDERER_ASSETS) assert.ok(existsSync(path.join(output, 'private/assets', name)), name);
  for (const file of files) assert.ok(statSync(path.join(output, file)).size < 25 * 1024 * 1024, `Pages file limit: ${file}`);
  const html = readFileSync(path.join(output, 'index.html'), 'utf8');
  assert.equal(html.includes('ws://localhost'), false);
  assert.match(html, /\.\/assets\/embed-[^" ]+\.js/);
  assert.equal(existsSync(path.join(output, 'private/media')), false);
  assert.match(readFileSync(path.join(output, 'private/assets/slide-viewer-local.js'), 'utf8'), /window\.QGLearnStorage/);
});
