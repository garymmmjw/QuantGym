import type { SVGProps } from "react";

import type { ShellIconName } from "./shell.types";

type ShellIconProps = Omit<SVGProps<SVGSVGElement>, "children"> & Readonly<{
  name: ShellIconName;
}>;

const commonProps = {
  fill: "none",
  stroke: "currentColor",
  strokeLinecap: "round",
  strokeLinejoin: "round",
  strokeWidth: 1.8,
} as const;

export function ShellIcon({ name, ...svgProps }: ShellIconProps) {
  const content = (() => {
    switch (name) {
      case "grid":
        return <><rect x="3" y="3" width="7" height="7" rx="2" /><rect x="14" y="3" width="7" height="7" rx="2" /><rect x="3" y="14" width="7" height="7" rx="2" /><rect x="14" y="14" width="7" height="7" rx="2" /></>;
      case "calendar":
        return <><rect x="3" y="5" width="18" height="16" rx="3" /><path d="M7 3v4M17 3v4M3 10h18M8 14h3M14 14h2M8 18h2" /></>;
      case "skills":
        return <><circle cx="12" cy="12" r="8.5" /><circle cx="12" cy="12" r="4.5" /><path d="m12 3 2.3 4.6M21 12l-5.2 1M12 21l-1.4-5M3 12l5-1.3" /></>;
      case "league":
        return <><path d="M7 4h10v3.5a5 5 0 0 1-10 0V4ZM7 6H4v1a3 3 0 0 0 3 3M17 6h3v1a3 3 0 0 1-3 3M12 12.5V17M8.5 21h7M10 21v-4h4v4" /></>;
      case "interview":
      case "messages":
        return <><path d="M4 5.5h16v11H9l-5 4v-15Z" /><path d="M8 10h8M8 13h5" /></>;
      case "problems":
        return <><path d="M7 4h13M7 10h13M7 16h13M7 22h9" /><path d="m3 4 .5.5L5 3M3 10l.5.5L5 9M3 16l.5.5L5 15" /></>;
      case "tools":
        return <><rect x="4" y="3" width="16" height="18" rx="3" /><path d="M8 7h8M8 11h2M14 11h2M8 15h2M14 15h2M8 19h8" /></>;
      case "poker":
        return <path d="M12 3C9 7 5 9 5 13a4 4 0 0 0 7 2 4 4 0 0 0 7-2c0-4-4-6-7-10Zm0 12v6M9 21h6" />;
      case "news":
        return <><path d="M5 4h14v16H5z" /><path d="M8 8h8M8 12h8M8 16h5" /></>;
      case "community":
        return <><circle cx="12" cy="12" r="9" /><path d="M8 11h8M9 15h6" /></>;
      case "network":
        return <><circle cx="12" cy="5" r="2.5" /><circle cx="5" cy="18" r="2.5" /><circle cx="19" cy="18" r="2.5" /><path d="m10.7 7.2-4.4 8M13.3 7.2l4.4 8M7.5 18h9" /></>;
      case "resume":
      case "memory":
        return <><path d="M6 3h9l3 3v15H6z" /><path d="M14 3v4h4M9 11h6M9 15h6M9 19h4" /></>;
      case "briefcase":
        return <><rect x="3" y="7" width="18" height="13" rx="3" /><path d="M9 7V4h6v3M3 12h18M10 12v2h4v-2" /></>;
      case "building":
        return <><path d="M5 21V4h14v17M3 21h18" /><path d="M9 8h2M14 8h1M9 12h2M14 12h1M9 16h2M14 16h1" /></>;
      case "library":
      case "courses":
        return <><path d="M4 5.5A3.5 3.5 0 0 1 7.5 2H12v18H7.5A3.5 3.5 0 0 0 4 23V5.5ZM20 5.5A3.5 3.5 0 0 0 16.5 2H12v18h4.5A3.5 3.5 0 0 1 20 23V5.5Z" /></>;
      case "settings":
        return <><circle cx="12" cy="12" r="3" /><path d="M19 12a7 7 0 0 0-.2-1.6l2-1.6-2-3.4-2.5 1a7 7 0 0 0-2.6-1.5L13.3 2h-4l-.4 2.9a7 7 0 0 0-2.6 1.5l-2.5-1-2 3.4 2 1.6A7 7 0 0 0 3.6 12c0 .5.1 1.1.2 1.6l-2 1.6 2 3.4 2.5-1a7 7 0 0 0 2.6 1.5l.4 2.9h4l.4-2.9a7 7 0 0 0 2.6-1.5l2.5 1 2-3.4-2-1.6c.1-.5.2-1.1.2-1.6Z" /></>;
      case "account":
        return <><circle cx="12" cy="8" r="4" /><path d="M4.5 21c1.3-4 4-6 7.5-6s6.2 2 7.5 6" /></>;
      case "menu":
        return <path d="M4 7h16M4 12h16M4 17h16" />;
      case "search":
        return <><circle cx="11" cy="11" r="7" /><path d="m20 20-4-4" /></>;
      case "bell":
        return <><path d="M18 10a6 6 0 0 0-12 0c0 4-2 6-2 6h16s-2-2-2-6Z" /><path d="M10 20h4" /></>;
      case "moon":
        return <path d="M20 15A8 8 0 0 1 9 4a8 8 0 1 0 11 11Z" />;
      case "sun":
        return <><circle cx="12" cy="12" r="4" /><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5" /></>;
      case "panel":
        return <><rect x="3" y="4" width="18" height="16" rx="3" /><path d="M9 4v16" /></>;
    }
  })();

  return (
    <svg {...svgProps} {...commonProps} viewBox="0 0 24 24" aria-hidden="true">
      {content}
    </svg>
  );
}
