#!/usr/bin/env node
// Reproducible renderer-only build. Never reads captures or private exports.
import { cpSync, mkdirSync, mkdtempSync, readFileSync, renameSync, rmSync, writeFileSync } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { build } from 'vite';
import react from '@vitejs/plugin-react';
import { LEARN_RENDERER_ASSETS, assertLearnOutputPath, assertLearnRendererOutput } from './lib/learn-renderer-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'QuantVault/learn-preview');
const output = path.resolve(process.argv[2] || path.join(root, 'dist/learn-embed'));
assertLearnOutputPath(root, output, process.env.QUANTGYM_WEB_DIST);
const staging = mkdtempSync(path.join(os.tmpdir(), 'quantgym-learn-renderer-'));
const dependencies = path.join(root, 'node_modules');
try {
  const assets = path.join(staging, 'private/assets');
  mkdirSync(assets, { recursive: true });
  for (const name of LEARN_RENDERER_ASSETS) cpSync(path.join(source, 'renderer-assets', name), path.join(assets, name));
  for (const [from, to] of [
    ['katex/dist/katex.min.css', 'katex.min.css'], ['katex/dist/katex.min.js', 'katex.min.js'],
    ['katex/dist/contrib/auto-render.min.js', 'auto-render.min.js'], ['dompurify/dist/purify.min.js', 'purify.min.js'],
  ]) cpSync(path.join(dependencies, from), path.join(assets, to));
  cpSync(path.join(dependencies, 'katex/dist/fonts'), path.join(assets, 'fonts'), { recursive: true });
  const python = path.join(staging, 'private/pyodide');
  mkdirSync(python, { recursive: true });
  for (const name of ['pyodide.mjs', 'pyodide.asm.mjs', 'pyodide.asm.wasm', 'pyodide-lock.json', 'python_stdlib.zip']) {
    cpSync(path.join(dependencies, 'pyodide', name), path.join(python, name));
  }
  cpSync(path.join(source, 'public/runner'), path.join(staging, 'runner'), { recursive: true });
  for (const name of ['slide-viewer-local.js', 'compare-cards-local.js']) {
    const file = path.join(assets, name);
    writeFileSync(file, readFileSync(file, 'utf8').replace(/\blocalStorage\./g, 'window.QGLearnStorage.'));
  }
  assertLearnRendererOutput(staging);
  await build({
    configFile: false, root: source, base: './', publicDir: staging,
    plugins: [react()], logLevel: 'warn',
    resolve: { alias: [
      { find: /^react(?=\/|$)/, replacement: path.join(dependencies, 'react') },
      { find: /^react-dom(?=\/|$)/, replacement: path.join(dependencies, 'react-dom') },
      { find: /^@fontsource\//, replacement: path.join(dependencies, '@fontsource') + '/' },
    ] },
    build: { outDir: output, emptyOutDir: true, rolldownOptions: { input: path.join(source, 'embed.html') } },
  });
  renameSync(path.join(output, 'embed.html'), path.join(output, 'index.html'));
  assertLearnRendererOutput(output);
  console.log(`Learn renderer ready: ${output}. No static course, practice, question, scoring or course-media exports.`);
} finally {
  rmSync(staging, { recursive: true, force: true });
}
