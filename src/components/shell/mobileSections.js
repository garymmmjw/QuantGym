import { getModulePath, getRouteModuleId } from '../../routes/routeConfig.js';

export const MOBILE_SECTIONS = [
  { id: 'overview', label: '总览', defaultModuleId: 'overview', modules: [
    { id: 'overview', label: '总览', accessibleLabel: '总览' },
  ] },
  { id: 'career', label: '求职', defaultModuleId: 'tracker', modules: [
    { id: 'tracker', label: '投递', accessibleLabel: '投递 Tracker' },
    { id: 'calendar', label: '日历', accessibleLabel: '训练日历' },
  ] },
  { id: 'training', label: '训练', defaultModuleId: 'technical-interview', modules: [
    { id: 'technical-interview', label: '技术面试', accessibleLabel: '技术面试 Technical Interview' },
    { id: 'behavioral-interview', label: '行为面试', accessibleLabel: '行为面试 Behavioral Interview' },
    { id: 'leetcode', label: 'LeetCode', accessibleLabel: 'LeetCode 刷题训练' },
    { id: 'tools', label: '速算', accessibleLabel: '速算 Mental Math' },
  ] },
  { id: 'resources', label: '资源', defaultModuleId: 'problems', modules: [
    { id: 'problems', label: '题目', accessibleLabel: '题目' },
    { id: 'experiences', label: '面经', accessibleLabel: '面经' },
  ] },
  { id: 'mine', label: '我的', defaultModuleId: 'account', modules: [
    { id: 'account', label: '账户与设置', accessibleLabel: '账户与设置' },
  ] },
];

// Deep links remain routable without adding paused features to navigation.
const SECTION_BY_MODULE = new Map([
  ...MOBILE_SECTIONS.flatMap(section => section.modules.map(module => [module.id, section.id])),
  ...['plan', 'resume', 'jobs', 'companies'].map(id => [id, 'career']),
  ...['skills', 'league', 'interview', 'pk'].map(id => [id, 'training']),
  ...['library', 'courses', 'memory', 'news'].map(id => [id, 'resources']),
  ...['settings', 'community', 'messages', 'network'].map(id => [id, 'mine']),
]);

export function getMobileSectionForPath(pathname = '/') {
  const sectionId = SECTION_BY_MODULE.get(getRouteModuleId(pathname)) || 'overview';
  return MOBILE_SECTIONS.find(section => section.id === sectionId);
}

function currentHref(location = {}) {
  return `${location.pathname || '/'}${location.search || ''}${location.hash || ''}`;
}

export function getMobileModuleHref(moduleId, location = {}) {
  const path = getModulePath(moduleId);
  const pathname = String(location.pathname || '/').replace(/\/+$/, '') || '/';
  if (path === pathname) return currentHref(location);

  // Keep preview records isolated when navigating out of a QA page, while
  // leaving route-specific filters and account sections on their own pages.
  const params = new URLSearchParams(location.search || '');
  const query = params.has('qa') ? `?${new URLSearchParams({ qa: params.get('qa') })}` : '';
  return `${path}${query}`;
}

export function getMobileSectionHref(sectionId, location = {}) {
  const section = MOBILE_SECTIONS.find(item => item.id === sectionId) || MOBILE_SECTIONS[0];
  if (getMobileSectionForPath(location.pathname).id === section.id) return currentHref(location);
  return getMobileModuleHref(section.defaultModuleId, location);
}
