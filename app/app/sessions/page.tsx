import { Button, Card } from "@/components/lumen/core";
import { getSettings } from "@/lib/settings";
import { requireStudent } from "@/lib/student";

// /app/sessions — the next clinic (settings.clinic_text) and the Google
// Meet booking link-out (settings.booking_url, new tab). No Calendar API
// (SPEC §15.1 / §15.4).
export default async function SessionsPage() {
  await requireStudent();
  const { bookingUrl, clinicText } = await getSettings();

  const sectionLabel = (text: string) => (
    <h2
      style={{
        margin: "0 0 8px",
        fontSize: "var(--text-body-sm)",
        fontWeight: 700,
        letterSpacing: "var(--tracking-body-sm)",
      }}
    >
      {text}
    </h2>
  );

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-heading)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading)",
            lineHeight: 1.2,
          }}
        >
          Sessions
        </h1>

        <Card padding="20px">
          {sectionLabel("Next clinic")}
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-body)",
              lineHeight: 1.5,
              letterSpacing: "var(--tracking-body)",
              color: clinicText ? "var(--text-primary)" : "var(--text-tertiary)",
              whiteSpace: "pre-wrap",
            }}
          >
            {clinicText || "No clinic scheduled yet — Dimitra will post the next one here."}
          </p>
        </Card>

        <Card featured>
          {sectionLabel("1:1 on Google Meet")}
          <p
            style={{
              margin: "0 0 16px",
              fontSize: "var(--text-body-sm)",
              lineHeight: 1.5,
              letterSpacing: "var(--tracking-body-sm)",
              color: "var(--text-secondary)",
            }}
          >
            Pick a slot in Dimitra&rsquo;s calendar — the Meet link arrives with your booking.
          </p>
          {bookingUrl ? (
            <Button variant="primary" href={bookingUrl} external fullWidth>
              Book a 1:1 on Google Meet
            </Button>
          ) : (
            <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
              Booking link coming soon — message Dimitra to arrange a session meanwhile.
            </p>
          )}
        </Card>
      </div>
    </main>
  );
}
