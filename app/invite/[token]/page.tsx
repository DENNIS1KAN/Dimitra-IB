import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users } from "@/db/schema";
import { Button, Wordmark } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { peekLoginToken } from "@/lib/auth";
import { acceptInvite } from "./actions";

// New-student onboarding (SPEC §7): sets their name, lands in /app.
// Welcome skin per DESIGN.md §6.
export default async function InvitePage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token: raw } = await params;
  const { error } = await searchParams;
  const token = await peekLoginToken(raw);
  const valid = token?.purpose === "invite";
  const [invitee] = valid
    ? await db.select().from(users).where(eq(users.id, token.userId))
    : [];

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
          {valid ? "Welcome — let's get you set up." : "This invitation isn't valid anymore."}
        </p>
      </div>

      {valid ? (
        <form action={acceptInvite} className="flex flex-col gap-3.5">
          <input type="hidden" name="token" value={raw} />
          <Input
            label="Your name"
            name="name"
            required
            placeholder="First and last name"
            defaultValue={invitee?.name === "New student" ? "" : (invitee?.name ?? "")}
            autoComplete="name"
            error={error === "name"}
            helper={
              error === "name"
                ? "Please tell us your name"
                : invitee
                  ? `Signing in as ${invitee.email}`
                  : undefined
            }
          />
          <Button variant="primary" size="lg" fullWidth type="submit">
            Enter Lumen
          </Button>
        </form>
      ) : (
        <div className="flex flex-col gap-3.5 text-center">
          <p
            style={{
              margin: 0,
              fontSize: "var(--text-body-sm)",
              letterSpacing: "var(--tracking-body-sm)",
              color: "var(--text-tertiary)",
            }}
          >
            Invitations work once and expire after 30 minutes. Ask Dimitra for a
            fresh link, or sign in if you already have an account.
          </p>
          <Button variant="dark" href="/login">
            Go to sign in
          </Button>
        </div>
      )}
    </main>
  );
}
