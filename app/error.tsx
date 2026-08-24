"use client";

import { Button, Wordmark } from "@/components/rts/core";

// Friendly error state (SPEC §10 M5). The reset button retries the render.
export default function ErrorPage({ reset }: { error: Error; reset: () => void }) {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark variant="full" style={{ fontSize: 28 }} />
      <div>
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
          }}
        >
          Something went sideways
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-body-sm)",
            color: "var(--text-tertiary)",
            maxWidth: 360,
          }}
        >
          Not your fault. Try again, and if it keeps happening, tell Dimitra
          what you were doing.
        </p>
      </div>
      <Button variant="dark" onClick={() => reset()}>
        Try again
      </Button>
    </main>
  );
}
