import test from 'node:test';
import assert from 'node:assert/strict';
import { createPrivateMediaRenderContext } from '../src/modules/interview/privateRichMedia.js';
import { createRichImage, appendInlineRichText } from '../src/modules/interview/richText.js';

const config = { endpoint: 'https://api.example.test/api', userId: 'alice', token: 'alice-token' };
const source = 'https://api.example.test/api/media/private-image';
const settle = () => new Promise(resolve => setImmediate(resolve));
function fakeImage() {
  const assigned = [];
  return { assigned, set src(value) { assigned.push(value); }, removeAttribute(name) { if (name === 'src') assigned.push(null); } };
}
const response = () => new Response(new Blob(['fixture'], { type: 'image/png' }), { status: 200 });

test('rich images use only matching account credentials and revoke resolved URLs on dispose', async () => {
  const calls = [], revoked = [];
  const context = createPrivateMediaRenderContext({ config, ownerId: 'alice', fetchImpl: async (url, options) => {
    calls.push({ url, options }); return response();
  }, createObjectURL: () => 'blob:private-image', revokeObjectURL: url => revoked.push(url) });
  const image = fakeImage();
  context.loadImage(image, source);
  assert.deepEqual(image.assigned, [], 'the API URL is never assigned to a native image');
  await settle();
  assert.equal(calls[0].options.headers.Authorization, 'Bearer alice-token');
  assert.equal(calls[0].options.cache, 'no-store');
  assert.equal(calls[0].options.redirect, 'error');
  assert.deepEqual(image.assigned, ['blob:private-image']);
  context.dispose();
  context.dispose();
  assert.equal(calls[0].options.signal.aborted, true);
  assert.deepEqual(image.assigned, ['blob:private-image', null]);
  assert.deepEqual(revoked, ['blob:private-image']);
});

test('account switching aborts pending requests and late responses never create or display a blob', async () => {
  let finish, signal;
  const created = [];
  const context = createPrivateMediaRenderContext({ config, ownerId: 'alice', fetchImpl: (_url, options) => {
    signal = options.signal; return new Promise(resolve => { finish = resolve; });
  }, createObjectURL: blob => { created.push(blob); return 'blob:late'; } });
  const image = fakeImage();
  context.loadImage(image, source);
  context.dispose();
  assert.equal(signal.aborted, true);
  finish(response());
  await settle();
  assert.deepEqual(created, []);
  assert.deepEqual(image.assigned, [null]);
  context.loadImage(image, '/assets/public.png');
  assert.deepEqual(image.assigned, [null], 'disposed render contexts cannot change the next account’s DOM');
});

test('mismatched account identity and failed downloads never retry with an anonymous image', async () => {
  let requests = 0;
  const blocked = createPrivateMediaRenderContext({ config, ownerId: 'bob', fetchImpl: () => { requests += 1; } });
  const blockedImage = fakeImage();
  blocked.loadImage(blockedImage, source);
  await settle();
  assert.equal(requests, 0);
  assert.deepEqual(blockedImage.assigned, []);
  blocked.dispose();
  const failed = createPrivateMediaRenderContext({ config, ownerId: 'alice', fetchImpl: async () => {
    requests += 1; return new Response('', { status: 403 });
  } });
  const failedImage = fakeImage();
  failed.loadImage(failedImage, source);
  await settle();
  assert.equal(requests, 1);
  assert.deepEqual(failedImage.assigned, []);
  failed.dispose();
});

test('public images remain ordinary URLs and inline rich text forwards the private render context', () => {
  const context = createPrivateMediaRenderContext({ config, ownerId: 'alice', fetchImpl() { throw new Error('Public image must not receive credentials.'); } });
  const image = fakeImage();
  context.loadImage(image, '/assets/public.png');
  assert.deepEqual(image.assigned, ['/assets/public.png']);
  const priorDocument = globalThis.document;
  const loads = [];
  try {
    globalThis.document = { createElement: () => fakeImage(), createTextNode: text => ({ textContent: text }) };
    const node = { children: [], appendChild(child) { this.children.push(child); } };
    appendInlineRichText(node, `![Own image](${source})`, { privateMedia: { loadImage: (element, url) => loads.push({ element, url }) } });
    assert.equal(loads.length, 1);
    assert.equal(loads[0].url, source);
    assert.deepEqual(node.children[0].assigned, []);
    assert.equal(node.children[0].alt, 'Own image');
  } finally { globalThis.document = priorDocument; context.dispose(); }
});

test('a legacy renderer without account context refuses private API image URLs', () => {
  const priorDocument = globalThis.document;
  try {
    globalThis.document = { createElement: () => fakeImage() };
    assert.deepEqual(createRichImage(source, 'Private').assigned, []);
    assert.deepEqual(createRichImage('/assets/public.png', 'Public').assigned, ['/assets/public.png']);
  } finally { globalThis.document = priorDocument; }
});
