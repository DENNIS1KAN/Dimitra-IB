// Inline SVG icons (DESIGN.md §2; replaces the Material Symbols icon font,
// which rendered as literal words wherever the local woff2 was absent).
// 24×24 stroke glyphs, currentColor, keyed by the names the code already
// used so call sites read the same. Decorative: aria-hidden.
import type { CSSProperties, ReactNode } from "react";

const GLYPHS: Record<string, ReactNode> = {
  check: <path d="M20 6 9 17l-5-5" />,
  check_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m9 12 2 2 4-4" />
    </>
  ),
  circle: <circle cx="12" cy="12" r="10" />,
  lock: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 8 0v4" />
    </>
  ),
  lock_open: (
    <>
      <rect x="4" y="11" width="16" height="10" rx="2" />
      <path d="M8 11V7a4 4 0 0 1 7.7-1.5" />
    </>
  ),
  play_circle: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="m10 8 6 4-6 4V8z" />
    </>
  ),
  description: (
    <>
      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
      <path d="M14 2v6h6M16 13H8M16 17H8M10 9H8" />
    </>
  ),
  edit_note: (
    <>
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 1 1 3 3L7 19l-4 1 1-4Z" />
    </>
  ),
  photo_camera: (
    <>
      <path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3l-2.5-3z" />
      <circle cx="12" cy="13" r="3" />
    </>
  ),
  chevron_right: <path d="m9 18 6-6-6-6" />,
  arrow_back: <path d="M19 12H5M12 19l-7-7 7-7" />,
  arrow_right: <path d="M5 12h14M13 6l6 6-6 6" />,
  logout: (
    <>
      <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
      <path d="m16 17 5-5-5-5M21 12H9" />
    </>
  ),
  download: <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />,
  upload: (
    <>
      <path d="M4 14.9A7 7 0 1 1 15.7 8h1.8a4.5 4.5 0 0 1 0 9H17" />
      <path d="M12 12v9M8 16l4-4 4 4" />
    </>
  ),
  hourglass: <path d="M6 2h12M6 22h12M8 2v4l4 6-4 6v4M16 2v4l-4 6 4 6v4" />,
  schedule: (
    <>
      <circle cx="12" cy="12" r="10" />
      <path d="M12 6v6l4 2" />
    </>
  ),
  pause: (
    <>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </>
  ),
  flag: (
    <>
      <path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z" />
      <path d="M4 22v-7" />
    </>
  ),
  chat: <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />,
  calendar: (
    <>
      <rect x="3" y="4" width="18" height="18" rx="3" />
      <path d="M16 2v4M8 2v4M3 10h18" />
    </>
  ),
  menu: <path d="M4 7h16M4 12h16M4 17h16" />,
  school: (
    <>
      <path d="m2 10 10-5 10 5-10 5z" />
      <path d="M6 12v5c3 3 9 3 12 0v-5M22 10v6" />
    </>
  ),
  history_edu: (
    <>
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </>
  ),
  fact_check: (
    <>
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <path d="M7 9h5M7 13h5M14 12l2 2 3-4" />
    </>
  ),
  trending_up: <path d="m22 7-8.5 8.5-5-5L2 17M16 7h6v6" />,
};

export const ICON_NAMES = Object.keys(GLYPHS);

export function Icon({
  name,
  size = 20,
  color,
  strokeWidth = 2,
  style,
  className,
}: {
  name: string;
  size?: number;
  color?: string;
  strokeWidth?: number;
  style?: CSSProperties;
  className?: string;
  /** Accepted for call-site compatibility with the old icon-font component. */
  filled?: boolean;
  weight?: number;
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      focusable="false"
      className={className}
      style={{
        color: color ?? "currentColor",
        flexShrink: 0,
        display: "inline-block",
        verticalAlign: "middle",
        ...style,
      }}
    >
      {GLYPHS[name] ?? GLYPHS.circle}
    </svg>
  );
}
