// Lumen learning components — exact recipes from DESIGN.md §5.
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Avatar, Badge, Button, Icon, Wordmark } from "./core";

// --- ListRow ---------------------------------------------------------------

export function ListRow({
  icon,
  iconColor = "var(--action-primary)",
  label,
  meta,
  trailing,
  chevron = true,
  href,
  style,
}: {
  icon?: string;
  iconColor?: string;
  label: ReactNode;
  meta?: ReactNode;
  trailing?: ReactNode;
  chevron?: boolean;
  href?: string;
  style?: CSSProperties;
}) {
  const body = (
    <>
      {icon && <Icon name={icon} size={22} color={iconColor} />}
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: "var(--text-body)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-body)",
            color: "var(--text-primary)",
          }}
        >
          {label}
        </span>
        {meta && (
          <span
            style={{
              display: "block",
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            {meta}
          </span>
        )}
      </span>
      {trailing}
      {chevron && <Icon name="chevron_right" size={20} color="var(--text-secondary)" />}
    </>
  );
  if (href) {
    return (
      <Link href={href} className="lmn-listrow" style={style}>
        {body}
      </Link>
    );
  }
  return (
    <div className="lmn-listrow" data-static="true" style={style}>
      {body}
    </div>
  );
}

// --- LessonRow -------------------------------------------------------------

const lessonKinds = {
  video: { icon: "play_circle", color: "var(--action-primary)" },
  slides: { icon: "description", color: "var(--color-plum)" },
  exercise: { icon: "edit_note", color: "var(--color-graphite)" },
  solutions: { icon: "lock_open", color: "var(--color-deep-indigo)" },
};

export function LessonRow({
  kind = "video",
  title,
  meta,
  locked = false,
  href,
  download = false,
  style,
}: {
  kind?: keyof typeof lessonKinds;
  title: ReactNode;
  meta?: ReactNode;
  locked?: boolean;
  href?: string;
  download?: boolean;
  style?: CSSProperties;
}) {
  const k = lessonKinds[kind] ?? lessonKinds.video;
  const body = (
    <>
      <Icon
        name={locked ? "lock" : k.icon}
        size={22}
        color={locked ? "var(--state-locked)" : k.color}
      />
      <span style={{ flex: 1, minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: "var(--text-body)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-body)",
            color: locked ? "var(--text-tertiary)" : "var(--text-primary)",
          }}
        >
          {title}
        </span>
        {meta && (
          <span
            style={{
              display: "block",
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            {meta}
          </span>
        )}
      </span>
      {locked ? (
        <Badge tone="locked" icon="lock">
          Locked
        </Badge>
      ) : (
        <Icon name="chevron_right" size={20} color="var(--text-secondary)" />
      )}
    </>
  );
  if (href && !locked) {
    // Plain <a> so downloads and inline material views work without JS.
    return (
      <a className="lmn-lessonrow" href={href} style={style} {...(download ? { download: true } : {})}>
        {body}
      </a>
    );
  }
  return (
    <div className="lmn-lessonrow" data-static="true" style={{ cursor: "default", ...style }}>
      {body}
    </div>
  );
}

// --- LockPanel -------------------------------------------------------------

export function LockPanel({
  locked = true,
  title,
  body,
  cta,
  ctaHref,
  action,
  style,
}: {
  locked?: boolean;
  title: string;
  body: ReactNode;
  cta?: string;
  ctaHref?: string;
  /** Rendered instead of the CTA button (e.g. a client submit-sheet trigger). */
  action?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: locked ? "var(--surface-page)" : "var(--surface-contemplative)",
        border: locked ? "1px dashed var(--border-divider)" : "none",
        borderRadius: "var(--radius-featured)",
        padding: "24px",
        fontFamily: "var(--font-sans)",
        textAlign: "center",
        color: locked ? "var(--text-secondary)" : "var(--text-inverse)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <Icon
        name={locked ? "lock" : "lock_open"}
        size={28}
        color={locked ? "var(--state-locked)" : "var(--color-sunbeam-yellow)"}
      />
      <h4
        style={{
          margin: "10px 0 6px",
          fontSize: "var(--text-subheading)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-subheading)",
          color: locked ? "var(--text-primary)" : "var(--text-inverse)",
        }}
      >
        {title}
      </h4>
      <p
        style={{
          margin: "0 auto",
          maxWidth: 400,
          fontSize: "var(--text-body-sm)",
          lineHeight: 1.5,
          letterSpacing: "var(--tracking-body-sm)",
          opacity: locked ? 1 : 0.85,
        }}
      >
        {body}
      </p>
      {(action || cta) && (
        <div style={{ marginTop: 16 }}>
          {action ??
            (cta && (
              <Button variant={locked ? "dark" : "primary"} href={ctaHref}>
                {cta}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}

// --- ModuleCard (current-week hero) ---------------------------------------

export function ModuleCard({
  week,
  title,
  meta,
  due,
  isNew = false,
  badges,
  cta = "Continue",
  href,
  style,
}: {
  week: string;
  title: string;
  meta?: string;
  /** Soft-deadline line under the meta, e.g. "Due Sun 30 Aug 23:59" (SPEC §15.1). */
  due?: string;
  isNew?: boolean;
  /** Extra badges after the New badge (e.g. Overdue). */
  badges?: ReactNode;
  cta?: string;
  href: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface-card)",
        border: "1px solid var(--border-card)",
        borderRadius: "var(--radius-featured)",
        padding: "24px",
        boxShadow: "var(--shadow-card)",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
        <span
          style={{
            fontSize: "var(--text-caption)",
            fontWeight: 700,
            letterSpacing: ".02em",
            textTransform: "uppercase",
            color: "var(--text-tertiary)",
          }}
        >
          {week}
        </span>
        {isNew && <Badge tone="new">New</Badge>}
        {badges}
      </div>
      <h3
        style={{
          margin: "0 0 6px",
          fontSize: "var(--text-heading-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading-sm)",
          lineHeight: 1.25,
          color: "var(--text-primary)",
        }}
      >
        {title}
      </h3>
      {meta && (
        <p
          style={{
            margin: due ? "0 0 4px" : "0 0 16px",
            fontSize: "var(--text-body-sm)",
            letterSpacing: "var(--tracking-body-sm)",
            color: "var(--text-tertiary)",
          }}
        >
          {meta}
        </p>
      )}
      {due && (
        <p
          style={{
            margin: "0 0 16px",
            fontSize: "var(--text-caption)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-caption)",
            color: "var(--text-tertiary)",
          }}
        >
          {due}
        </p>
      )}
      <Button variant="primary" fullWidth href={href}>
        {cta}
      </Button>
    </div>
  );
}

// --- NoteCard (tutor note strip) ------------------------------------------

export function NoteCard({
  note,
  date,
  signature = "— Dimitra",
  compact = false,
  style,
}: {
  note: ReactNode;
  date?: string;
  signature?: string;
  compact?: boolean;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        background: "var(--surface-accent)",
        borderRadius: "var(--radius-featured)",
        padding: compact ? "20px" : "24px",
        fontFamily: "var(--font-sans)",
        color: "var(--text-on-yellow)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
        <Avatar size="sm" />
        <span
          style={{
            fontSize: "var(--text-body-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-body-sm)",
          }}
        >
          This week from Dimitra
        </span>
        {date && (
          <span
            style={{
              marginLeft: "auto",
              fontSize: "var(--text-caption)",
              fontWeight: 500,
              opacity: 0.7,
            }}
          >
            {date}
          </span>
        )}
      </div>
      <p
        style={{
          margin: 0,
          fontSize: compact ? "var(--text-body-sm)" : "var(--text-body)",
          lineHeight: 1.5,
          letterSpacing: "var(--tracking-body)",
          fontWeight: 400,
        }}
      >
        {note}
      </p>
      <div
        style={{
          marginTop: 12,
          fontSize: "var(--text-body-sm)",
          fontWeight: 500,
          fontStyle: "italic",
          opacity: 0.85,
        }}
      >
        {signature}
      </div>
    </div>
  );
}

// --- TopBar ----------------------------------------------------------------

export function TopBar({
  title,
  backHref,
  trailing,
  style,
}: {
  title?: string;
  backHref?: string;
  trailing?: ReactNode;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        padding: "14px 20px",
        background: "var(--surface-page)",
        fontFamily: "var(--font-sans)",
        boxSizing: "border-box",
        ...style,
      }}
    >
      {backHref && (
        <span style={{ marginLeft: -8, display: "inline-flex" }}>
          <BackLink href={backHref} />
        </span>
      )}
      {title ? (
        <span
          style={{
            flex: 1,
            fontSize: "var(--text-subheading)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-subheading)",
            color: "var(--text-primary)",
            whiteSpace: "nowrap",
            overflow: "hidden",
            textOverflow: "ellipsis",
          }}
        >
          {title}
        </span>
      ) : (
        <span style={{ flex: 1, display: "inline-flex" }}>
          <Wordmark size="sm" />
        </span>
      )}
      {trailing}
    </div>
  );
}

function BackLink({ href }: { href: string }) {
  return (
    <Link className="lmn-iconbtn" aria-label="Back" href={href} style={{ width: 40, height: 40 }}>
      <span
        className="material-symbols-rounded"
        style={{ fontSize: 22, fontVariationSettings: "'FILL' 1,'wght' 500" }}
      >
        arrow_back
      </span>
    </Link>
  );
}

// --- Toast -----------------------------------------------------------------

export function Toast({
  icon = "check",
  message,
  detail,
  style,
}: {
  icon?: string;
  message: string;
  detail?: string;
  style?: CSSProperties;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 12,
        background: "var(--surface-card)",
        borderRadius: "var(--radius-cards)",
        padding: "14px 18px",
        boxShadow: "var(--shadow-float)",
        fontFamily: "var(--font-sans)",
        maxWidth: 360,
        boxSizing: "border-box",
        ...style,
      }}
    >
      <span
        style={{
          width: 32,
          height: 32,
          borderRadius: "var(--radius-pills)",
          background: "var(--action-primary)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} color="#fff" />
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: "var(--text-body-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-body-sm)",
            color: "var(--text-primary)",
          }}
        >
          {message}
        </span>
        {detail && (
          <span
            style={{
              display: "block",
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
              marginTop: 2,
            }}
          >
            {detail}
          </span>
        )}
      </span>
    </div>
  );
}
