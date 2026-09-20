import test from 'node:test';
import assert from 'node:assert/strict';
import { MOBILE_SECTIONS, getMobileModuleHref, getMobileSectionForPath, getMobileSectionHref } from '../src/components/shell/mobileSections.js';
import { MODULE_MANIFEST } from '../src/modules/manifest.js';
import { isModuleVisible } from '../src/modules/availability.js';
import { getModulePath } from '../src/routes/routeConfig.js';

test('the five mobile categories cover the ten supported entries exactly once', () => {
  assert.deepEqual(MOBILE_SECTIONS.map(section => section.label), ['总览', '求职', '训练', '资源', '我的']);
  const entries = MOBILE_SECTIONS.flatMap(section => section.modules.map(module => module.id));
  assert.equal(new Set(entries).size, entries.length);
  assert.deepEqual([...entries].sort(), [
    'overview', 'tracker', 'calendar', 'technical-interview', 'behavioral-interview',
    'leetcode', 'tools', 'problems', 'experiences', 'account',
  ].sort());
  for (const section of MOBILE_SECTIONS) {
    assert.ok(section.modules.some(module => module.id === section.defaultModuleId));
    for (const module of section.modules) {
      assert.ok(isModuleVisible(module.id), `${module.id} must not expose a paused entry`);
      assert.ok(module.accessibleLabel.includes(module.label), `${module.id} retains its visible label in its accessible name`);
    }
  }
});

test('each visible entry links to a real protected route and resolves to its category', () => {
  for (const section of MOBILE_SECTIONS) {
    for (const module of section.modules) {
      const route = MODULE_MANIFEST.find(item => item.id === module.id);
      assert.ok(route?.protected, `${module.id} must have a protected route`);
      assert.equal(getMobileModuleHref(module.id, { pathname: '/settings' }), route.path);
      assert.equal(getMobileSectionForPath(route.path).id, section.id);
      assert.equal(getMobileSectionForPath(`${route.path}/`).id, section.id);
    }
  }
});

test('direct links and back/forward locations derive active categories from the current path', () => {
  const pathSequence = ['/tracker', '/leetcode', '/account', '/leetcode', '/tracker'];
  assert.deepEqual(pathSequence.map(path => getMobileSectionForPath(path).id), ['career', 'training', 'mine', 'training', 'career']);
  for (const [path, sectionId] of [
    ['/plan', 'career'], ['/skills', 'training'], ['/league', 'training'],
    ['/settings', 'mine'], ['/resume', 'career'], ['/library', 'resources'],
    ['/messages', 'mine'], ['/interview', 'training'], ['/news', 'resources'],
  ]) assert.equal(getMobileSectionForPath(path).id, sectionId, path);
  assert.equal(getMobileSectionForPath('/missing-route').id, 'overview');
});

test('all existing module deep links retain a mobile category without exposing paused entries', () => {
  for (const route of MODULE_MANIFEST) {
    const section = getMobileSectionForPath(route.path);
    assert.ok(MOBILE_SECTIONS.includes(section));
    if (route.id !== 'overview') assert.notEqual(section.id, 'overview', `${route.id} needs an explicit category`);
    if (!isModuleVisible(route.id)) {
      assert.equal(MOBILE_SECTIONS.some(item => item.modules.some(module => module.id === route.id)), false);
    }
  }
});

test('pressing the selected bottom category preserves the current child page, query and hash', () => {
  for (const [pathname, sectionId] of [
    ['/calendar', 'career'], ['/behavioral-interview', 'training'], ['/experiences', 'resources'],
    ['/settings', 'mine'], ['/', 'overview'],
  ]) {
    const location = { pathname, search: '?qa=preview&section=profile', hash: '#details' };
    assert.equal(getMobileSectionHref(sectionId, location), `${pathname}${location.search}${location.hash}`);
  }
  const location = { pathname: '/leetcode', search: '?qa&problem=two-sum', hash: '#notes' };
  assert.equal(getMobileModuleHref('leetcode', location), '/leetcode?qa&problem=two-sum#notes');
});

test('entering a different category uses its default route without copying page-specific state', () => {
  const defaults = { overview: 'overview', career: 'tracker', training: 'technical-interview', resources: 'problems', mine: 'account' };
  for (const [sectionId, moduleId] of Object.entries(defaults)) {
    const pathname = sectionId === 'mine' ? '/tracker' : '/account';
    assert.equal(getMobileSectionHref(sectionId, { pathname, search: '?section=security', hash: '#password' }), getModulePath(moduleId));
  }
});

test('cross-page links retain QA isolation while clearing the previous page filters', () => {
  const location = { pathname: '/tracker', search: '?qa=fixture&status=offer', hash: '#application' };
  assert.equal(getMobileSectionHref('training', location), '/technical-interview?qa=fixture');
  assert.equal(getMobileModuleHref('calendar', location), '/calendar?qa=fixture');
  assert.equal(getMobileModuleHref('calendar', { ...location, search: '?qa&status=offer' }), '/calendar?qa=');
  assert.equal(getMobileModuleHref('calendar', { ...location, search: '?status=offer' }), '/calendar');
});
