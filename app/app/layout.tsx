import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, IconButton, Wordmark } from "@/components/lumen/core";
import { LockPanel } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { initials } from "@/lib/format";

// Student shell. Rule 3 lives here: a paused student sees only the friendly
// full-screen state — no module list, no content — on every /app route.
export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role === "admin") redirect("/admin");

  if (!user.active) {
    return (
      <main
        className="flex min-h-dvh flex-col items-center justify-center gap-8"
        style={{ padding: "24px" }}
      >
        <Wordmark size="md" />
        <LockPanel
          locked
          title="Your access is paused"
          body={
            <>
              Message Dimitra to continue — your account and progress are safe
              and will be right here when you&rsquo;re back.
            </>
          }
          style={{ maxWidth: 420 }}
        />
      </main>
    );
  }

  const avatar = <Avatar size="md" tone="neutral" initials={initials(user.name)} />;
  const signOutButton = (
    <form action={signOut} style={{ display: "inline-flex" }}>
      <IconButton icon="logout" label="Sign out" type="submit" size="sm" />
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* Mobile top bar (≤ lg): page-cream, wordmark + avatar */}
      <header
        className="lg:hidden"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          padding: "14px 20px",
          paddingTop: "calc(14px + env(safe-area-inset-top))",
          background: "var(--surface-page)",
        }}
      >
        <span style={{ flex: 1, display: "inline-flex" }}>
          <Wordmark size="sm" />
        </span>
        {signOutButton}
        {avatar}
      </header>

      {/* Desktop nav (lg+): white bar per DeskNav recipe */}
      <header
        className="hidden lg:block"
        style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-card)" }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "14px 32px",
            display: "flex",
            alignItems: "center",
            gap: 8,
          }}
        >
          <Wordmark size="sm" />
          <span style={{ flex: 1 }} />
          {signOutButton}
          {avatar}
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
