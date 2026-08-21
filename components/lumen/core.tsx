// Lumen design-system primitives — exact recipes from DESIGN.md §5.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";

// --- Icon ------------------------------------------------------------------

export function Icon({
  name,
  size = 20,
  color,
  filled = true,
  weight = 500,
  style,
}: {
  name: string;
  size?: number;
  color?: string;
  filled?: boolean;
  weight?: number;
  style?: CSSProperties;
}) {
  return (
    <span
      className="material-symbols-rounded"
      aria-hidden="true"
      style={{
        fontSize: size,
        color: color || "inherit",
        fontVariationSettings: `'FILL' ${filled ? 1 : 0},'wght' ${weight}`,
        lineHeight: 1,
        verticalAlign: "middle",
        ...style,
      }}
    >
      {name}
    </span>
  );
}

// --- Wordmark --------------------------------------------------------------

const wordmarkSizes = {
  sm: { fs: 22, ls: -0.66, by: 11 },
  md: { fs: 28, ls: -0.84, by: 13 },
  lg: { fs: 44, ls: -1.32, by: 16 },
  xl: { fs: 88, ls: -2.64, by: 20 },
};

export function Wordmark({
  size = "md",
  byline = false,
  inverse = false,
  style,
}: {
  size?: keyof typeof wordmarkSizes;
  byline?: boolean;
  inverse?: boolean;
  style?: CSSProperties;
}) {
  const s = wordmarkSizes[size];
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: byline ? "flex-start" : "center",
        fontFamily: "var(--font-sans)",
        lineHeight: 1,
        ...style,
      }}
    >
      <span
        style={{
          fontWeight: 700,
          fontSize: s.fs,
          letterSpacing: s.ls,
          color: inverse ? "var(--text-inverse)" : "var(--text-primary)",
        }}
      >
        lumen
        <span style={{ color: "var(--accent-punctuation)" }}>.</span>
      </span>
      {byline && (
        <span
          style={{
            fontWeight: 500,
            fontSize: s.by,
            letterSpacing: "-0.02em",
            color: inverse ? "rgba(255,255,255,.75)" : "var(--text-secondary)",
            marginTop: Math.round(s.by * 0.55),
          }}
        >
          by Dimitra Anglou
        </span>
      )}
    </span>
  );
}

// --- Avatar ----------------------------------------------------------------

const avatarSizes = { sm: 28, md: 36, lg: 48, xl: 72 };

export function Avatar({
  initials = "DA",
  size = "md",
  tone = "indigo",
  style,
}: {
  initials?: string;
  size?: keyof typeof avatarSizes;
  tone?: "indigo" | "yellow" | "neutral";
  style?: CSSProperties;
}) {
  const px = avatarSizes[size];
  const bg =
    tone === "indigo"
      ? "var(--accent-dimitra)"
      : tone === "yellow"
        ? "var(--color-sunbeam-yellow)"
        : "var(--color-linen)";
  const fg =
    tone === "yellow"
      ? "var(--text-on-yellow)"
      : tone === "indigo"
        ? "var(--text-inverse)"
        : "var(--text-secondary)";
  return (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: "var(--radius-pills)",
        background: bg,
        color: fg,
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "var(--font-sans)",
        fontWeight: 700,
        fontSize: Math.round(px * 0.38),
        letterSpacing: "-0.02em",
        overflow: "hidden",
        flexShrink: 0,
        ...style,
      }}
    >
      {initials}
    </span>
  );
}

// --- Badge -----------------------------------------------------------------

const badgeTones: Record<string, CSSProperties> = {
  neutral: {
    background: "var(--color-page-cream)",
    color: "var(--text-secondary)",
    border: "1px solid var(--border-card)",
  },
  new: {
    background: "var(--color-sunbeam-yellow)",
    color: "var(--text-on-yellow)",
    border: "1px solid transparent",
  },
  done: {
    background: "rgba(0,97,239,.08)",
    color: "var(--action-primary)",
    border: "1px solid transparent",
  },
  locked: {
    background: "var(--color-linen)",
    color: "var(--text-tertiary)",
    border: "1px solid transparent",
  },
  live: {
    background: "var(--color-deep-indigo)",
    color: "var(--text-inverse)",
    border: "1px solid transparent",
  },
};

export function Badge({
  tone = "neutral",
  icon,
  children,
  style,
}: {
  tone?: keyof typeof badgeTones;
  icon?: string;
  children: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <span
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 4,
        borderRadius: "var(--radius-pills)",
        padding: "4px 10px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-caption)",
        fontWeight: 500,
        letterSpacing: "var(--tracking-caption)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...badgeTones[tone],
        ...style,
      }}
    >
      {icon && (
        <span
          className="material-symbols-rounded"
          style={{ fontSize: 13, fontVariationSettings: "'FILL' 1,'wght' 500" }}
        >
          {icon}
        </span>
      )}
      {children}
    </span>
  );
}

// --- Card ------------------------------------------------------------------

const cardSurfaces: Record<string, CSSProperties> = {
  white: {
    background: "var(--surface-card)",
    border: "1px solid var(--border-card)",
    color: "var(--text-primary)",
  },
  cream: { background: "var(--surface-page)", border: "none", color: "var(--text-primary)" },
  yellow: { background: "var(--surface-accent)", border: "none", color: "var(--text-on-yellow)" },
  indigo: {
    background: "var(--surface-contemplative)",
    border: "none",
    color: "var(--text-inverse)",
  },
};

export function Card({
  surface = "white",
  featured = false,
  padding,
  style,
  children,
}: {
  surface?: keyof typeof cardSurfaces;
  featured?: boolean;
  padding?: string;
  style?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <div
      style={{
        borderRadius: featured ? "var(--radius-featured)" : "var(--radius-cards)",
        padding: padding ?? (featured ? "32px" : "20px"),
        boxShadow: surface === "white" ? "var(--shadow-card)" : "none",
        boxSizing: "border-box",
        ...cardSurfaces[surface],
        ...style,
      }}
    >
      {children}
    </div>
  );
}

// --- Button ----------------------------------------------------------------

const buttonSizes = {
  sm: { fontSize: "14px", padding: "8px 16px" },
  md: { fontSize: "16px", padding: "12px 24px" },
  lg: { fontSize: "16px", padding: "14px 28px" },
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  href,
  type = "button",
  onClick,
  children,
  style,
}: {
  variant?: "primary" | "dark" | "secondary" | "ghost";
  size?: keyof typeof buttonSizes;
  fullWidth?: boolean;
  disabled?: boolean;
  href?: string;
  type?: "button" | "submit";
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const css: CSSProperties = {
    ...buttonSizes[size],
    ...(fullWidth ? { width: "100%" } : {}),
    ...style,
  };
  if (href && !disabled) {
    return (
      <Link href={href} className={`lmn-btn lmn-btn-${variant}`} style={css}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={`lmn-btn lmn-btn-${variant}`}
      disabled={disabled}
      onClick={onClick}
      style={css}
    >
      {children}
    </button>
  );
}

// --- IconButton ------------------------------------------------------------

const iconButtonSizes = { sm: 32, md: 40, lg: 48 };

export function IconButton({
  icon,
  variant = "ghost",
  size = "md",
  label,
  href,
  type,
  style,
}: {
  icon: string;
  variant?: "ghost" | "outline" | "dark";
  size?: keyof typeof iconButtonSizes;
  label: string;
  href?: string;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  const px = iconButtonSizes[size];
  const css: CSSProperties = { width: px, height: px, ...style };
  const glyph = (
    <span
      className="material-symbols-rounded"
      style={{ fontSize: Math.round(px * 0.55), fontVariationSettings: "'FILL' 1,'wght' 500" }}
    >
      {icon}
    </span>
  );
  if (href) {
    return (
      <Link
        href={href}
        className={`lmn-iconbtn lmn-iconbtn-${variant}`}
        aria-label={label}
        style={css}
      >
        {glyph}
      </Link>
    );
  }
  return (
    <button
      type={type ?? "button"}
      className={`lmn-iconbtn lmn-iconbtn-${variant}`}
      aria-label={label}
      style={css}
    >
      {glyph}
    </button>
  );
}

// --- ProgressBar -----------------------------------------------------------

export function ProgressBar({
  value = 0,
  total = 100,
  label,
  style,
}: {
  value?: number;
  total?: number;
  label?: string;
  style?: CSSProperties;
}) {
  const pct = Math.max(0, Math.min(100, total ? (value / total) * 100 : 0));
  return (
    <div style={{ fontFamily: "var(--font-sans)", ...style }}>
      {label && (
        <div
          style={{
            fontSize: "var(--text-caption)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-caption)",
            color: "var(--text-tertiary)",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}
      <div
        style={{
          height: 6,
          borderRadius: "var(--radius-pills)",
          background: "var(--color-linen)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "var(--radius-pills)",
            background: "var(--action-primary)",
            transition: "width .4s ease",
          }}
        />
      </div>
    </div>
  );
}
