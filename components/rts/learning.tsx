// Road to Success learning components: recipes from DESIGN.md §5 (Phase 2 palette).
import Link from "next/link";
import type { CSSProperties, ReactNode } from "react";
import { Avatar, Badge, Button, Icon } from "./core";

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
            fontSize: "15.5px",
            fontWeight: 700,
            letterSpacing: "-0.2px",
            color: "var(--text-strong)",
          }}
        >
          {label}
        </span>
        {meta && (
          <span
            style={{
              display: "block",
              fontSize: "13.5px",
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
      {chevron && <Icon name="chevron_right" size={20} color="var(--text-tertiary)" />}
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
  slides: { icon: "description", color: "var(--text-heading-color)" },
  exercise: { icon: "edit_note", color: "var(--text-primary)" },
  solutions: { icon: "lock_open", color: "var(--text-heading-color)" },
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
            fontSize: "15.5px",
            fontWeight: 700,
            letterSpacing: "-0.2px",
            color: locked ? "var(--text-tertiary)" : "var(--text-strong)",
          }}
        >
          {title}
        </span>
        {meta && (
          <span
            style={{
              display: "block",
              fontSize: "13.5px",
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
        <Icon name="chevron_right" size={20} color="var(--text-tertiary)" />
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
        background: locked ? "var(--surface-card)" : "var(--surface-hero)",
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
        color={locked ? "var(--state-locked)" : "var(--state-done)"}
      />
      <h4
        style={{
          margin: "10px 0 6px",
          fontSize: "var(--text-subheading)",
          fontWeight: 800,
          letterSpacing: "var(--tracking-subheading)",
          color: locked ? "var(--text-heading-color)" : "var(--text-inverse)",
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
          opacity: locked ? 1 : 0.88,
        }}
      >
        {body}
      </p>
      {(action || cta) && (
        <div style={{ marginTop: 16 }}>
          {action ??
            (cta && (
              <Button variant={locked ? "dark" : "secondary"} href={ctaHref}>
                {cta}
              </Button>
            ))}
        </div>
      )}
    </div>
  );
}

// --- ModuleCard ("This week" feature card, mockup .feature) ---------------

export function ModuleCard({
  week,
  title,
  meta,
  isNew = false,
  cta = "Continue",
  href,
  style,
}: {
  /** Chip text, e.g. "This week" (course name is prefixed by the page when needed). */
  week: string;
  title: string;
  meta?: string;
  isNew?: boolean;
  cta?: string;
  href: string;
  style?: CSSProperties;
}) {
  return (
    <section className="lmn-feature lmn-rise" aria-label="This week" style={style}>
      <div style={{ flex: 1, minWidth: 240 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12, flexWrap: "wrap" }}>
          <span className="lmn-chip">{week}</span>
          {isNew && <Badge tone="new">New</Badge>}
        </div>
        <h2>{title}</h2>
        {meta && (
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "14.5px",
              letterSpacing: "var(--tracking-body-sm)",
              color: "var(--text-tertiary)",
            }}
          >
            {meta}
          </p>
        )}
      </div>
      {/* The one orange CTA on this view: ink text on orange. */}
      <Button variant="cta" size="lg" href={href}>
        {cta}
        <Icon name="arrow_right" size={18} strokeWidth={2.6} />
      </Button>
    </section>
  );
}

// --- ResumeCard (M13 screen 1: "Pick up where you left off") ---------------

/**
 * The first thing on a course page, and the view's single orange CTA
 * (SPEC §15.7 #27). The card says where the student actually left off, so
 * the copy is passed in from lib/steps rather than composed here.
 */
export function ResumeCard({
  tag,
  title,
  meta,
  cta,
  href,
  style,
}: {
  tag: string;
  title: string;
  meta: string;
  cta: string;
  href: string;
  style?: CSSProperties;
}) {
  return (
    <section className="lmn-resume lmn-rise" aria-label={tag} style={style}>
      <span className="lmn-resume-thumb" aria-hidden="true">
        <span className="lmn-resume-play">
          <Icon name="play_circle" size={22} />
        </span>
      </span>
      <div className="lmn-resume-body">
        <p className="lmn-resume-tag">{tag}</p>
        <h2>{title}</h2>
        <p className="lmn-resume-meta">{meta}</p>
      </div>
      <Button variant="cta" href={href}>
        {cta}
        <Icon name="arrow_right" size={15} strokeWidth={2.6} />
      </Button>
    </section>
  );
}

// --- StepRow (M13 screen 2: the numbered path) -----------------------------

/**
 * One row of the week's path. `action` is the current step's control (a
 * link, or the submit box's trigger); `link` is the soft one a finished step
 * keeps. Exactly one row on the page gets an action.
 */
export function StepRow({
  state,
  number,
  title,
  meta,
  action,
  link,
}: {
  state: "done" | "current" | "waiting" | "locked";
  number: number;
  title: string;
  meta?: string;
  action?: ReactNode;
  link?: { label: string; href: string };
}) {
  return (
    <div className={`lmn-step is-${state}`}>
      <span className="lmn-step-num" aria-hidden="true">
        {state === "done" ? (
          <Icon name="check" size={12} strokeWidth={3.4} color="#fff" />
        ) : state === "locked" ? (
          <Icon name="lock" size={12} strokeWidth={2.4} />
        ) : (
          number
        )}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <h3>{title}</h3>
        {meta && <p className="lmn-step-meta">{meta}</p>}
      </div>
      {action}
      {!action && link && (
        <a className="lmn-step-link is-soft" href={link.href}>
          {link.label}
        </a>
      )}
    </div>
  );
}

// --- NoteCard (mockup .note, "Note from Dimitra") --------------------------

export function NoteCard({
  note,
  date,
  compact = false,
  style,
}: {
  note: ReactNode;
  date?: string;
  /** Kept for call-site compatibility; the mockup has one density. */
  compact?: boolean;
  signature?: string;
  style?: CSSProperties;
}) {
  void compact;
  return (
    <section className="lmn-note lmn-rise" aria-label="Note from your tutor" style={style}>
      <span className="lmn-note-mark">
        <Icon name="chat" size={19} />
      </span>
      <div style={{ minWidth: 0 }}>
        <h2>Note from Dimitra{date ? ` · ${date}` : ""}</h2>
        <p>{note}</p>
      </div>
    </section>
  );
}

// --- BackLink (replaces TopBar: one header per page) -----------------------

export function BackLink({ href, label = "Back" }: { href: string; label?: string }) {
  return (
    <Link
      href={href}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        fontSize: "var(--text-body-sm)",
        fontWeight: 700,
        letterSpacing: "var(--tracking-body-sm)",
      }}
    >
      <Icon name="arrow_back" size={16} strokeWidth={2.4} />
      {label}
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
      role="status"
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
          background: "var(--state-done)",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        <Icon name={icon} size={18} color="#fff" strokeWidth={3} />
      </span>
      <span style={{ minWidth: 0 }}>
        <span
          style={{
            display: "block",
            fontSize: "var(--text-body-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-body-sm)",
            color: "var(--text-strong)",
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

// Dimitra's avatar is still used by a few admin surfaces.
export { Avatar };
