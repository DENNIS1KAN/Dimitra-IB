import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { StudentNav } from "@/components/app/student-nav";
import { Avatar, IconButton, Wordmark } from "@/components/lumen/core";
import { LockPanel } from "@/components/lumen/learning";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { firstName, initials } from "@/lib/format";
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

  return (
    <div className="flex min-h-dvh flex-col">
      {/* ONE header for every width (SPEC §15.4): the blue nav bar from the
          mockup. Under 1024px the links drop to a scrollable second row. */}
      <header className="lmn-nav">
        <div className="lmn-nav-wrap">
          <Link href="/app" style={{ display: "inline-flex", textDecoration: "none", flex: 1 }}>
            <Wordmark size="sm" inverse />
          </Link>
          <StudentNav unread={unread} />
          <span className="lmn-nav-who">
            <span className="lmn-nav-name">{firstName(user.name)}</span>
            <Avatar size="sm" tone="inverse" initials={initials(user.name)} />
          </span>
          <form action={signOut} style={{ display: "inline-flex" }}>
            <IconButton icon="logout" variant="inverse" label="Sign out" type="submit" size="sm" />
          </form>
        </div>
      </header>

      <div className="flex-1">{children}</div>
    </div>
  );
}
