import { Button, Wordmark } from "@/components/lumen/core";

export default function NotFound() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center gap-6 p-6 text-center">
      <Wordmark size="md" />
      <div>
        <h1
          style={{
            margin: "0 0 6px",
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
          }}
        >
          Nothing here
        </h1>
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-body-sm)",
            color: "var(--text-tertiary)",
            maxWidth: 360,
          }}
        >
          This page doesn&rsquo;t exist — or it isn&rsquo;t yours to see. If you
          followed a link from Dimitra, ask her for a fresh one.
        </p>
      </div>
      <Button variant="dark" href="/app">
        Back to your modules
      </Button>
    </main>
  );
}
