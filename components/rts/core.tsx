// Road to Success design-system primitives: recipes from DESIGN.md §5.
// Every colour is a token from app/globals.css.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { BRAND_BYLINE, BRAND_MONOGRAM, BRAND_NAME } from "@/lib/brand";
import { Icon } from "./icon";

export { Icon };

// --- Wordmark --------------------------------------------------------------

// The orange dot terminal, sized in em so it follows the mark's font size
// (design/road-to-success-mockup.html; SPEC §15.7 #22).
function Dot({ scale }: { scale: number }) {
  return (
    <span
      aria-hidden="true"
      style={{
        display: "inline-block",
        width: `${scale}em`,
        height: `${scale}em`,
        borderRadius: "50%",
        background: "var(--accent-brand)",
        marginLeft: "0.09em",
        transform: "translateY(-0.04em)",
      }}
    />
  );
}

/**
 * The one place the product name renders (SPEC §15.7 #20/#22).
 * `full` = landing and documents · `bar` = app navs (the RTS monogram under
 * 640px, via the rts-bar-* classes) · `mono` = "RTS" plus the dot.
 * Internals are em-based, so a `style.fontSize` override rescales the mark.
 */
export function Wordmark({
  variant = "full",
  byline = false,
  inverse = false,
  style,
}: {
  variant?: "full" | "bar" | "mono";
  /** full only: "by Anglou Dimitra" under the mark. */
  byline?: boolean;
  inverse?: boolean;
  style?: CSSProperties;
}) {
  const color = inverse ? "var(--text-inverse)" : "var(--text-strong)";
  const base: CSSProperties = {
    fontFamily: "var(--font-sans)",
    fontWeight: 800,
    lineHeight: 1,
    whiteSpace: "nowrap",
    color,
  };
  if (variant === "bar") {
    return (
      <span style={{ ...base, fontSize: 17, letterSpacing: "-0.018em", ...style }}>
        <span className="rts-bar-full">
          {BRAND_NAME}
          <Dot scale={0.41} />
        </span>
        <span className="rts-bar-mono">
          {BRAND_MONOGRAM}
          <Dot scale={0.41} />
        </span>
      </span>
    );
  }
  if (variant === "mono") {
    return (
      <span style={{ ...base, fontSize: 17, letterSpacing: "-0.02em", ...style }}>
        {BRAND_MONOGRAM}
        <Dot scale={0.41} />
      </span>
    );
  }
  return (
    <span
      style={{
        ...base,
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "center",
        fontSize: "clamp(42px, 7.5vw, 76px)",
        letterSpacing: "-0.035em",
        lineHeight: 1.02,
        ...style,
      }}
    >
      <span>
        {BRAND_NAME}
        <Dot scale={0.17} />
      </span>
      {byline && (
        <span
          style={{
            fontSize: "clamp(15px, 0.26em, 20px)",
            fontWeight: 500,
            letterSpacing: "-0.01em",
            marginTop: "0.7em",
            color: inverse ? "rgba(255,255,255,.72)" : "var(--text-tertiary)",
          }}
        >
          {BRAND_BYLINE}
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
  /** indigo = Dimitra · neutral = students on light surfaces · inverse = on the blue nav */
  tone?: "indigo" | "neutral" | "inverse";
  style?: CSSProperties;
}) {
  const px = avatarSizes[size];
  const bg =
    tone === "indigo"
      ? "var(--accent-dimitra)"
      : tone === "inverse"
        ? "rgba(255,255,255,.2)"
        : "var(--color-linen)";
  const fg = tone === "neutral" ? "var(--text-primary)" : "var(--text-inverse)";
  return (
    <span
      style={{
        width: px,
        height: px,
        borderRadius: "50%",
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
    background: "var(--surface-page)",
    color: "var(--text-tertiary)",
    border: "1px solid var(--border-card)",
  },
  // "chip" in the mockup: blue tint + blue text
  new: {
    background: "var(--surface-tint-blue)",
    color: "var(--action-primary)",
    border: "1px solid transparent",
  },
  // green as text is always Forest
  done: {
    background: "var(--surface-tint-green)",
    color: "var(--text-success)",
    border: "1px solid transparent",
  },
  locked: {
    background: "var(--color-linen)",
    color: "var(--text-tertiary)",
    border: "1px solid transparent",
  },
  live: {
    background: "var(--surface-contemplative)",
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
        gap: 5,
        borderRadius: "var(--radius-pills)",
        padding: "4px 10px",
        fontFamily: "var(--font-sans)",
        fontSize: "var(--text-caption)",
        fontWeight: 700,
        letterSpacing: "var(--tracking-caption)",
        lineHeight: 1.4,
        whiteSpace: "nowrap",
        ...badgeTones[tone],
        ...style,
      }}
    >
      {icon && <Icon name={icon} size={13} strokeWidth={2.6} />}
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
  tint: { background: "var(--surface-tint-blue)", border: "none", color: "var(--text-primary)" },
  indigo: {
    background: "var(--surface-hero)",
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
        padding: padding ?? (featured ? "28px" : "20px"),
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
  lg: { fontSize: "16.5px", padding: "15px 30px" },
};

export function Button({
  variant = "primary",
  size = "md",
  fullWidth = false,
  disabled = false,
  href,
  external = false,
  type = "button",
  name,
  value,
  onClick,
  children,
  style,
}: {
  /** primary = blue (standard) · cta = the ONE orange motivational CTA per view (ink text) */
  variant?: "primary" | "cta" | "dark" | "secondary" | "ghost";
  size?: keyof typeof buttonSizes;
  fullWidth?: boolean;
  disabled?: boolean;
  href?: string;
  /** Off-site link: opens in a new tab with rel="noopener noreferrer". */
  external?: boolean;
  type?: "button" | "submit";
  /** Submit-button name/value pair (several buttons, one form). */
  name?: string;
  value?: string;
  onClick?: () => void;
  children: ReactNode;
  style?: CSSProperties;
}) {
  const css: CSSProperties = {
    ...buttonSizes[size],
    ...(fullWidth ? { width: "100%" } : {}),
    ...style,
  };
  const className = `lmn-btn lmn-btn-${variant}`;
  if (href && !disabled) {
    if (external) {
      return (
        <a href={href} target="_blank" rel="noopener noreferrer" className={className} style={css}>
          {children}
        </a>
      );
    }
    // Route-handler hrefs must be plain <a>: next/link viewport-prefetches
    // and RSC-fetches its href in production, which executes /api handlers
    // (stamping PDFs, logging phantom download events) without a real click.
    if (href.startsWith("/api/")) {
      return (
        <a href={href} className={className} style={css}>
          {children}
        </a>
      );
    }
    return (
      <Link href={href} className={className} style={css}>
        {children}
      </Link>
    );
  }
  return (
    <button
      type={type}
      className={className}
      disabled={disabled}
      name={name}
      value={value}
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
  variant?: "ghost" | "outline" | "dark" | "inverse";
  size?: keyof typeof iconButtonSizes;
  label: string;
  href?: string;
  type?: "button" | "submit";
  style?: CSSProperties;
}) {
  const px = iconButtonSizes[size];
  const css: CSSProperties = { width: px, height: px, ...style };
  const className = `lmn-iconbtn lmn-iconbtn-${variant}`;
  const glyph = <Icon name={icon} size={Math.round(px * 0.55)} />;
  if (href) {
    // Same as Button: /api/ hrefs stay plain <a> so prefetch/RSC fetches
    // never execute the route handler.
    if (href.startsWith("/api/")) {
      return (
        <a href={href} className={className} aria-label={label} style={css}>
          {glyph}
        </a>
      );
    }
    return (
      <Link href={href} className={className} aria-label={label} style={css}>
        {glyph}
      </Link>
    );
  }
  return (
    <button type={type ?? "button"} className={className} aria-label={label} style={css}>
      {glyph}
    </button>
  );
}

// --- ProgressBar -----------------------------------------------------------

export function ProgressBar({
  value = 0,
  total = 100,
  label,
  onDark = false,
  style,
}: {
  value?: number;
  total?: number;
  label?: string;
  /** On the indigo hero: translucent track, light label. */
  onDark?: boolean;
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
            color: onDark ? "rgba(255,255,255,.75)" : "var(--text-tertiary)",
            marginBottom: 6,
          }}
        >
          {label}
        </div>
      )}
      <div
        role="progressbar"
        aria-valuenow={Math.round(pct)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={label}
        style={{
          height: onDark ? 8 : 6,
          borderRadius: "var(--radius-pills)",
          background: onDark ? "rgba(255,255,255,.18)" : "var(--color-linen)",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            height: "100%",
            width: `${pct}%`,
            borderRadius: "var(--radius-pills)",
            background: "var(--state-done)",
            transition: "width .4s ease",
          }}
        />
      </div>
    </div>
  );
}
