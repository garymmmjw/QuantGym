import path from 'node:path';
import { readdirSync } from 'node:fs';

// Code, styles and generic icons only. Course illustrations and content exports
// belong to the authenticated API, never to the Pages deployment.
export const LEARN_RENDERER_ASSETS = Object.freeze([
  'variables.css', 'layout.css', 'components.css', 'learn.css', 'compare-cards.css',
  'notebook.css', 'slide-viewer.css', 'auth.css', 'responsive.css', 'beta.css',
  'd3.v7.min.js', 'function-plot.js', 'logo.svg', 'icons.js', 'track-icons.js',
  'katex-render.js', 'markdown-render.js', 'fp-render.js', 'slide-icons.js',
  'notebook-renderer-local.js', 'slide-viewer-local.js', 'compare-cards-local.js',
]);

export function assertLearnRendererOutput(directory) {
  const walk = root => readdirSync(root, { withFileTypes: true }).flatMap(entry => {
    if (entry.isSymbolicLink()) throw new Error('Symlinks are forbidden in the Learn renderer');
    const file = path.join(root, entry.name);
    return entry.isDirectory() ? walk(file) : [file];
  });
  const files = walk(directory).map(file => path.relative(directory, file).split(path.sep).join('/'));
  for (const file of files) {
    if (file.startsWith('private/media/') || file.startsWith('private/scoring/')
      || (file.endsWith('.json') && file !== 'private/pyodide/pyodide-lock.json')) {
      throw new Error(`Private content is forbidden in the Learn renderer: ${file}`);
    }
  }
  return files;
}

export function assertLearnOutputPath(projectRoot, output, configuredDist = '') {
  const relative = path.relative(projectRoot, output);
  const inside = relative && !relative.startsWith('..') && !path.isAbsolute(relative)
    && ['dist', 'artifacts'].includes(relative.split(path.sep)[0]);
  // Existing isolated static-build checks use an explicitly selected temporary
  // web directory outside the checkout. Permit exactly its Learn child only.
  const explicitExternal = configuredDist && path.relative(projectRoot, path.resolve(configuredDist)).startsWith('..')
    && output === path.join(path.resolve(configuredDist), 'learn-embed');
  if (path.basename(output) !== 'learn-embed' || (!inside && !explicitExternal)) {
    throw new Error('Learn output must be a learn-embed directory under dist/ or artifacts/.');
  }
}
