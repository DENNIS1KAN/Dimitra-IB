import { redirect } from "next/navigation";
import { Button, Wordmark } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { getSessionUser } from "@/lib/auth";
import { signIn } from "./actions";

// Welcome skin (DESIGN.md §6): centered xl wordmark + tagline, bottom-anchored
// form, 24px side padding. Username + password — Dimitra hands out the
// credentials herself.
export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await getSessionUser();
  if (user) redirect(user.role === "admin" ? "/admin" : "/app");
  const { error } = await searchParams;

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

      <form action={signIn} className="flex flex-col gap-3.5">
        {error === "credentials" && (
          <p
            role="alert"
            style={{
              margin: 0,
              textAlign: "center",
              fontSize: "var(--text-body-sm)",
              color: "#c4320a",
            }}
          >
            Wrong username or password — try again.
          </p>
        )}
        <Input
          label="Username"
          name="username"
          required
          placeholder="your username"
          autoComplete="username"
        />
        <Input
          label="Password"
          type="password"
          name="password"
          required
          placeholder="your password"
          autoComplete="current-password"
        />
        <Button variant="primary" size="lg" fullWidth type="submit">
          Sign in
        </Button>
        <p
          style={{
            margin: 0,
            textAlign: "center",
            fontSize: "var(--text-caption)",
            letterSpacing: "var(--tracking-caption)",
            color: "var(--text-tertiary)",
          }}
        >
          Accounts are created by Dimitra — ask her for your credentials
        </p>
      </form>
    </main>
  );
}
