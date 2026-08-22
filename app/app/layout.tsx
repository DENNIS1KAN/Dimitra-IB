import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { StudentNav } from "@/components/app/student-nav";
import { Avatar, IconButton, Wordmark } from "@/components/lumen/core";
import { LockPanel } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { initials } from "@/lib/format";
import { unreadForStudent } from "@/lib/messages";

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

  const unread = (await unreadForStudent(user.id)) > 0;
  const avatar = <Avatar size="md" tone="neutral" initials={initials(user.name)} />;
  const signOutButton = (
    <form action={signOut} style={{ display: "inline-flex" }}>
      <IconButton icon="logout" label="Sign out" type="submit" size="sm" />
    </form>
  );

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ONE header for every width (SPEC §15.4: the nav is mounted once).
          DeskNav recipe (white bar, 1040px shell); under lg the nav drops to
          its own row and scrolls sideways at 390px. */}
      <header
        style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-card)" }}
      >
        <div
          className="flex flex-wrap items-center gap-2 lg:flex-nowrap lg:gap-3"
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "12px 20px",
            paddingTop: "calc(12px + env(safe-area-inset-top))",
          }}
        >
          <span className="flex flex-1 lg:flex-none">
            <Wordmark size="sm" />
          </span>
          {/* min-w-0: a flex item's auto min-width is its content width, which
              would stop the nav from scrolling inside itself and push the page
              wider than 390px once it holds six items. */}
          <div className="order-last min-w-0 basis-full lg:order-none lg:basis-auto lg:flex-1 lg:pl-4">
            <StudentNav unread={unread} />
          </div>
          {signOutButton}
          {avatar}
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
