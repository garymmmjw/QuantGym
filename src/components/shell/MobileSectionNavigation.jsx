import { Link, useLocation } from 'react-router-dom';
import { BriefcaseBusiness, Dumbbell, LayoutDashboard, LibraryBig, UserRound } from 'lucide-react';
import { getRouteModuleId } from '../../routes/routeConfig.js';
import { MOBILE_SECTIONS, getMobileModuleHref, getMobileSectionForPath, getMobileSectionHref } from './mobileSections.js';

const SECTION_ICONS = {
  overview: LayoutDashboard,
  career: BriefcaseBusiness,
  training: Dumbbell,
  resources: LibraryBig,
  mine: UserRound,
};

export function MobileSectionNavigation() {
  const location = useLocation();
  const section = getMobileSectionForPath(location.pathname);
  const activeModuleId = getRouteModuleId(location.pathname);
  if (section.modules.length < 2) return null;

  return <section className="qg-mobile-section-nav" aria-label={`${section.label}分类导航`}>
    <h2 className="qg-mobile-section-title">{section.label}</h2>
    <nav className="qg-mobile-section-links" aria-label={`${section.label}功能`}>
      {section.modules.map(module => <Link
        key={module.id}
        className={`qg-mobile-section-link${activeModuleId === module.id ? ' is-active' : ''}`}
        to={getMobileModuleHref(module.id, location)}
        replace={activeModuleId === module.id}
        aria-label={module.accessibleLabel}
        aria-current={activeModuleId === module.id ? 'page' : undefined}
      >{module.label}</Link>)}
    </nav>
  </section>;
}

export function MobileBottomNavigation() {
  const location = useLocation();
  const activeSection = getMobileSectionForPath(location.pathname);

  return <nav className="qg-mobile-tabbar" aria-label="手机主导航">
    {MOBILE_SECTIONS.map(section => {
      const Icon = SECTION_ICONS[section.id];
      const active = section.id === activeSection.id;
      return <Link
        key={section.id}
        className={`qg-mobile-tabbar-link${active ? ' is-active' : ''}`}
        to={getMobileSectionHref(section.id, location)}
        replace={active}
        aria-current={active ? 'page' : undefined}
      >
        <Icon className="qg-mobile-tabbar-icon" size={22} strokeWidth={1.8} aria-hidden="true" />
        <span>{section.label}</span>
      </Link>;
    })}
  </nav>;
}
