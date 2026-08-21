import { Wordmark } from "@/components/lumen/core";
import { Button } from "@/components/lumen/core";

// Placeholder public page — the real landing ships with M5.
export default function Home() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark size="lg" byline style={{ alignItems: "center" }} />
      <p
        style={{
          margin: 0,
          maxWidth: 420,
          fontSize: "var(--text-subheading)",
          fontWeight: 500,
          letterSpacing: "var(--tracking-subheading)",
          color: "var(--text-secondary)",
        }}
      >
        Weekly IB modules, gated practice, and clinics — access by invitation.
      </p>
      <Button variant="dark" href="/login">
        Sign in
      </Button>
    </main>
  );
}
