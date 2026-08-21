import { redirect } from "next/navigation";
import { Button, Wordmark } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { getSessionUser } from "@/lib/auth";
import { requestMagicLink } from "./actions";

// Welcome skin (DESIGN.md §6): centered xl wordmark + tagline, bottom-anchored
// form, 24px side padding. Email only — the magic link does the rest.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ sent?: string; error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/app");
  const { sent, error } = await searchParams;

  return (
    <main
      className="flex min-h-dvh w-full flex-col"
      style={{ padding: "0 24px 32px", maxWidth: 480, margin: "0 auto" }}
    >
      <div className="flex flex-1 flex-col items-center justify-center gap-4 text-center">
        <Wordmark size="xl" style={{ alignItems: "center" }} />
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-subheading)",
            fontWeight: 500,
            letterSpacing: "var(--tracking-subheading)",
            lineHeight: 1.4,
            color: "var(--text-secondary)",
            maxWidth: 280,
          }}
        >
          Private IB tutoring
          <br />
          with Dimitra Anglou
        </p>
      </div>

      {sent ? (
        <div className="flex flex-col gap-3.5 text-center">
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-body)",
              fontWeight: 500,
              color: "var(--text-primary)",
            }}
          >
            Check your email — your sign-in link is on its way.
          </p>
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-caption)",
              letterSpacing: "var(--tracking-caption)",
              color: "var(--text-tertiary)",
            }}
          >
            Links work once and expire after 30 minutes. In dev mode the link
            prints to the server console.
          </p>
          <Button variant="ghost" href="/login">
            Use a different email
          </Button>
        </div>
      ) : (
        <form action={requestMagicLink} className="flex flex-col gap-3.5">
          {error === "expired" && (
            <p
              role="alert"
              style={{
                margin: 0,
                textAlign: "center",
                fontSize: "var(--text-body-sm)",
                color: "#c4320a",
              }}
            >
              That link has expired or was already used — request a fresh one.
            </p>
          )}
          <Input
            label="Email"
            type="email"
            name="email"
            required
            placeholder="you@school.gr"
            autoComplete="email"
            helper="Lumen is invite-only — ask Dimitra if you need an invitation"
          />
          <Button variant="primary" size="lg" fullWidth type="submit">
            Email me a sign-in link
          </Button>
        </form>
      )}
    </main>
  );
}
