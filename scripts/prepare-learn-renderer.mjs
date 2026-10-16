#!/usr/bin/env node
// Explicit maintenance step after sync:content. Production builds consume this
// reviewed code snapshot without access to captures, accounts or private data.
import { copyFileSync, mkdirSync, rmSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { LEARN_RENDERER_ASSETS } from './lib/learn-renderer-assets.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const source = path.join(root, 'QuantVault/learn-preview');
const target = path.join(source, 'renderer-assets');
rmSync(target, { recursive: true, force: true });
mkdirSync(target, { recursive: true });
for (const name of LEARN_RENDERER_ASSETS) {
  copyFileSync(path.join(source, 'public/private/assets', name), path.join(target, name));
}
console.log(`Prepared ${LEARN_RENDERER_ASSETS.length} renderer code/style/icon files. No course media or JSON copied.`);
