import React from 'react';

const paths = {
  X: ['M18 6 6 18', 'm6 6 12 12'],
  Plus: ['M12 5v14', 'M5 12h14'],
  Flag: ['M4 22V3', 'M4 3c5-4 10 4 16 0v12c-6 4-11-4-16 0'],
  ChevronRight: ['m9 5 7 7-7 7'],
  ChevronDown: ['m5 9 7 7 7-7'],
  Search: ['M21 21l-4.4-4.4'],
  SearchX: ['M21 21l-4.4-4.4', 'm8 8 5 5', 'm8 13 5-5'],
  Table2: ['M3 8h18', 'M8 8v13'],
  List: ['M8 6h13', 'M8 12h13', 'M8 18h13', 'M3 6h.01', 'M3 12h.01', 'M3 18h.01'],
  ArrowDownWideNarrow: ['M4 3v18', 'm1 18 3 3 3-3', 'M10 5h12', 'M10 12h8', 'M10 19h4'],
  CheckCheck: ['m3 12 4 4L19 4', 'm12 16 2 2 8-8'],
  CircleCheck: ['m8 12 3 3 5-6'],
  CircleAlert: ['M12 7v6', 'M12 17h.01'],
  MousePointer2: ['m4 3 7.5 18 2.8-6.7L21 11 4 3Z'],
  BriefcaseBusiness: ['M8 7V4h8v3', 'M3 12c6 4 12 4 18 0', 'M12 12v4'],
};

export default function TrackerIcon({ name, size = 18 }) {
  const circular = ['Search', 'SearchX', 'CircleAlert', 'CircleCheck'].includes(name);
  return <span className="qt-icon" style={{width:size,height:size}} aria-hidden="true"><svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
    {circular && <circle cx={name.startsWith('Search') ? 10.5 : 12} cy={name.startsWith('Search') ? 10.5 : 12} r={name.startsWith('Search') ? 7.5 : 9}/>}
    {name === 'Table2' && <rect x="3" y="3" width="18" height="18" rx="2"/>}
    {name === 'BriefcaseBusiness' && <rect x="3" y="7" width="18" height="14" rx="2"/>}
    {(paths[name] || paths.Plus).map((d, index) => <path d={d} key={index}/>)}
  </svg></span>;
}
