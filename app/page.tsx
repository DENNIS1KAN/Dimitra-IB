import type { Metadata } from "next";
import { Avatar, Badge, Button, Card, Icon, Wordmark } from "@/components/lumen/core";

export const metadata: Metadata = {
  title: "Lumen — private IB tutoring with Dimitra Anglou",
  description:
    "Weekly pre-recorded IB Chemistry modules, gated practice with worked solutions, and live clinics. A private program by Dimitra Anglou — access by invitation.",
};

const steps = [
  {
    icon: "play_circle",
    color: "var(--action-primary)",
    title: "Watch",
    body: "Short, focused videos land every Monday — the week's teaching, recorded once and explained properly.",
  },
  {
    icon: "edit_note",
    color: "var(--color-graphite)",
    title: "Practice",
    body: "Annotated slides and an exercise set to attempt on paper, the way the exam will ask for it.",
  },
  {
    icon: "photo_camera",
    color: "var(--color-plum)",
    title: "Submit",
    body: "A photo of honest working is all it takes — marks don't matter here, attempts do.",
  },
  {
    icon: "lock_open",
    color: "var(--color-deep-indigo)",
    title: "Unlock & fix",
    body: "Worked solutions unlock after the attempt, and the weekly clinic fixes what's still wobbly.",
  },
];

const credentials = [
  ["school", "MSc Chemistry, National & Kapodistrian University of Athens"],
  ["history_edu", "12 years teaching IB Chemistry HL, 1:1 and small groups"],
  ["fact_check", "IB examiner — Paper 2, five sessions"],
  ["trending_up", "Students average 6.4 in HL Chemistry over the last three cohorts"],
];

// Public landing (SPEC §7): parent credibility, not conversion. Content and
// skin from the approved About screens + tokens (DESIGN.md §6).
export default function Landing() {
  return (
    <main style={{ display: "flex", flexDirection: "column", minHeight: "100dvh" }}>
      {/* Hero */}
      <section
        style={{
          padding: "72px 24px 56px",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          textAlign: "center",
          gap: 20,
        }}
      >
        <Wordmark size="xl" byline style={{ alignItems: "center" }} />
        <p
          style={{
            margin: 0,
            maxWidth: 460,
            fontSize: "var(--text-subheading)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-subheading)",
            lineHeight: 1.4,
            color: "var(--text-secondary)",
          }}
        >
          Weekly IB Chemistry modules, practice that earns its solutions, and
          clinics for the hard parts — structured teaching between lessons,
          without the scheduling.
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
          <Badge tone="new">Access by invitation</Badge>
          <Badge tone="neutral">IB Chemistry HL · SL</Badge>
        </div>
        <div style={{ display: "flex", gap: 12, marginTop: 4 }}>
          <Button variant="dark" href="/login">
            Student sign in
          </Button>
          <Button variant="secondary" href="#contact">
            For parents
          </Button>
        </div>
      </section>

      {/* How a week works */}
      <section style={{ padding: "0 24px 56px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <h2
            style={{
              margin: "0 0 20px",
              fontSize: "var(--text-heading-sm)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-heading-sm)",
              textAlign: "center",
            }}
          >
            How a week works
          </h2>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
              gap: 12,
            }}
          >
            {steps.map((s) => (
              <Card key={s.title} padding="20px">
                <Icon name={s.icon} size={26} color={s.color} />
                <h3
                  style={{
                    margin: "10px 0 4px",
                    fontSize: "var(--text-body)",
                    fontWeight: 700,
                    letterSpacing: "var(--tracking-body)",
                  }}
                >
                  {s.title}
                </h3>
                <p
                  style={{
                    margin: 0,
                    fontSize: "var(--text-body-sm)",
                    letterSpacing: "var(--tracking-body-sm)",
                    color: "var(--text-secondary)",
                    lineHeight: 1.5,
                  }}
                >
                  {s.body}
                </p>
              </Card>
            ))}
          </div>
          <p
            style={{
              margin: "16px 4px 0",
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
              textAlign: "center",
            }}
          >
            Modules unlock automatically each week. Live time is kept for
            clinics and targeted 1:1s — not for re-explaining the basics.
          </p>
        </div>
      </section>

      {/* About Dimitra */}
      <section style={{ background: "var(--surface-card)", borderTop: "1px solid var(--border-card)", borderBottom: "1px solid var(--border-card)", padding: "48px 24px" }}>
        <div style={{ maxWidth: 860, margin: "0 auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 20, marginBottom: 24, flexWrap: "wrap" }}>
            <Avatar size="xl" initials="DA" />
            <div>
              <h2
                style={{
                  margin: 0,
                  fontSize: "var(--text-heading)",
                  fontWeight: 700,
                  letterSpacing: "var(--tracking-heading)",
                }}
              >
                Dimitra Anglou
              </h2>
              <p
                style={{
                  margin: "4px 0 0",
                  fontSize: "var(--text-body)",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                }}
              >
                IB Chemistry HL · Athens
              </p>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(300px, 1fr))",
              gap: 20,
              alignItems: "start",
            }}
          >
            <Card padding="24px" surface="cream">
              <div
                style={{
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 700,
                  textTransform: "uppercase",
                  letterSpacing: ".03em",
                  color: "var(--text-tertiary)",
                  marginBottom: 14,
                }}
              >
                Credentials
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {credentials.map(([ic, t]) => (
                  <div key={ic} style={{ display: "flex", gap: 12, alignItems: "flex-start" }}>
                    <Icon name={ic} size={20} color="var(--color-deep-indigo)" />
                    <span
                      style={{
                        fontSize: "var(--text-body-sm)",
                        letterSpacing: "var(--tracking-body-sm)",
                        lineHeight: 1.55,
                      }}
                    >
                      {t}
                    </span>
                  </div>
                ))}
              </div>
            </Card>
            <Card surface="indigo" featured>
              <p
                style={{
                  margin: 0,
                  fontSize: "var(--text-subheading)",
                  lineHeight: 1.5,
                  letterSpacing: "var(--tracking-subheading)",
                  fontWeight: 500,
                }}
              >
                “Chemistry isn&rsquo;t hard — it&rsquo;s cumulative. My job is
                making sure nothing quietly slips, so exam season feels like
                revision, not rescue.”
              </p>
              <p style={{ margin: "16px 0 0", fontSize: "var(--text-body-sm)", fontStyle: "italic", opacity: 0.8 }}>
                — Dimitra
              </p>
            </Card>
          </div>
        </div>
      </section>

      {/* Contact */}
      <section id="contact" style={{ padding: "48px 24px 64px" }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "var(--text-heading-sm)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-heading-sm)",
            }}
          >
            Access by invitation
          </h2>
          <p
            style={{
              margin: "0 0 20px",
              fontSize: "var(--text-body)",
              letterSpacing: "var(--tracking-body)",
              color: "var(--text-secondary)",
              lineHeight: 1.5,
            }}
          >
            Lumen is a private platform for Dimitra&rsquo;s own students. If
            you&rsquo;d like to talk about joining a cohort, get in touch and
            she&rsquo;ll take it from there.
          </p>
          <Button variant="primary" href="mailto:hello@example.com">
            Contact Dimitra
          </Button>
        </div>
      </section>

      <footer
        style={{
          marginTop: "auto",
          borderTop: "1px solid var(--border-card)",
          padding: "20px 24px calc(20px + env(safe-area-inset-bottom))",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          flexWrap: "wrap",
        }}
      >
        <Wordmark size="sm" />
        <span
          style={{
            fontSize: "var(--text-caption)",
            letterSpacing: "var(--tracking-caption)",
            color: "var(--text-tertiary)",
          }}
        >
          Private tutoring platform · students sign in with an emailed link
        </span>
      </footer>
    </main>
  );
}
