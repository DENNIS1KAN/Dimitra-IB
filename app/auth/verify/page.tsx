import { Button, Wordmark } from "@/components/lumen/core";
import { peekLoginToken } from "@/lib/auth";
import { completeSignIn } from "./actions";

// The magic-link landing page. Rendering only PEEKS at the token — it is
// consumed by the server action (a POST) when the student presses the
// button. Email security scanners prefetch links with GET, so redeeming on
// GET burned the single-use token (and handed the session to the scanner)
// before the student ever clicked. Same pattern as /invite/[token].
export default async function VerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token: raw = "" } = await searchParams;
  const token = raw ? await peekLoginToken(raw) : null;
  const valid = token?.purpose === "login";

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
          {valid ? "You're one tap away." : "This sign-in link isn't valid anymore."}
        </p>
      </div>

      {valid ? (
        <form action={completeSignIn} className="flex flex-col gap-3.5">
          <input type="hidden" name="token" value={raw} />
          <Button variant="primary" size="lg" fullWidth type="submit">
            Continue to sign in
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
            Sign-in links work once and expire after 30 minutes — request a
            fresh one.
          </p>
          <Button variant="dark" href="/login">
            Go to sign in
          </Button>
        </div>
      )}
    </main>
  );
}
