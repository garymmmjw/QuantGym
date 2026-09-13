import test from 'node:test';
import assert from 'node:assert/strict';
import { createPersonalDataRegistry } from '../src/features/personal/personalDataRegistry.js';

const settle = () => new Promise(resolve => setImmediate(resolve));
const config = { endpoint: 'https://test.invalid/api/', token: 'test-token', userId: 'owner-a' };

function fixture({ stop } = {}) {
  const instances = [];
  const createdStores = [];
  const registry = createPersonalDataRegistry({
    getStorage: () => undefined,
    createStore({ ownerId }) { const store = { ownerId }; createdStores.push(store); return store; },
    createCloudSync(options) {
      const instance = { options, starts: 0, stops: 0, syncs: 0,
        start() { this.starts += 1; options.onStatus({ phase: 'syncing' }); },
        stop() { this.stops += 1; return stop?.(); },
        sync() { this.syncs += 1; return Promise.resolve(); },
      };
      instances.push(instance);
      return instance;
    },
  });
  return { registry, instances, createdStores };
}

test('concurrent workspace and picker consumers share a store and one cloud writer', async () => {
  const { registry, instances, createdStores } = fixture();
  const first = registry.getConnection('owner-a', config);
  const second = registry.getConnection('owner-a', { ...config, endpoint: 'https://test.invalid/api' });
  assert.equal(first, second);
  let statuses = 0;
  const unsubscribe = second.subscribe(() => { statuses += 1; });
  const releaseFirst = first.retain();
  const releaseSecond = second.retain();
  assert.equal(instances.length, 1);
  assert.equal(instances[0].starts, 1);
  assert.equal(createdStores.length, 1);
  assert.equal(registry.getStore('owner-a'), instances[0].options.store);
  assert.equal(second.getSnapshot().phase, 'syncing');
  assert.equal(statuses, 1);
  releaseFirst();
  await settle();
  assert.equal(instances[0].stops, 0);
  await second.sync();
  assert.equal(instances[0].syncs, 1);
  releaseSecond();
  releaseSecond();
  await settle();
  assert.equal(instances[0].stops, 1);
  unsubscribe();
});

test('a synchronous route handoff or StrictMode remount keeps the writer alive', async () => {
  const { registry, instances } = fixture();
  const connection = registry.getConnection('owner-a', config);
  const releaseFirst = connection.retain();
  releaseFirst();
  const releaseNext = registry.getConnection('owner-a', config).retain();
  await settle();
  assert.equal(instances.length, 1);
  assert.equal(instances[0].starts, 1);
  assert.equal(instances[0].stops, 0);
  releaseNext();
  await settle();
  assert.equal(instances[0].stops, 1);
});

test('an in-flight final flush is reused when a consumer returns', async () => {
  let finishFlush;
  const pending = new Promise(resolve => { finishFlush = resolve; });
  const { registry, instances } = fixture({ stop: () => pending });
  const connection = registry.getConnection('owner-a', config);
  const release = connection.retain();
  release();
  await settle();
  assert.equal(instances[0].stops, 1);
  const returning = registry.getConnection('owner-a', config);
  assert.equal(returning, connection);
  const releaseReturning = returning.retain();
  assert.equal(instances.length, 1);
  assert.equal(instances[0].starts, 2);
  finishFlush();
  await settle();
  assert.equal(registry.getConnection('owner-a', config), connection);
  releaseReturning();
  await settle();
});

test('signed-out access is disabled; accounts and credential changes stay separate', async () => {
  const { registry, instances, createdStores } = fixture();
  assert.equal(registry.getStore(''), null);
  assert.equal(registry.getConnection('', config), null);
  assert.equal(instances.length, 0);
  assert.equal(createdStores.length, 0);
  const first = registry.getConnection('owner-a', config);
  const refreshed = registry.getConnection('owner-a', { ...config, token: 'new-test-token' });
  const other = registry.getConnection('owner-b', { ...config, userId: 'owner-b' });
  assert.notEqual(first, refreshed);
  assert.notEqual(first, other);
  const releases = [first.retain(), refreshed.retain(), other.retain()];
  assert.equal(instances[0].options.store, instances[1].options.store);
  assert.notEqual(instances[0].options.store, instances[2].options.store);
  assert.equal(instances[1].options.config.token, 'new-test-token');
  releases.forEach(release => release());
  await settle();
  assert.ok(instances.every(instance => instance.stops === 1));
});
