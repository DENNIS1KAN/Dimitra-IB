import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Avatar, IconButton, Wordmark } from "@/components/rts/core";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { initials } from "@/lib/format";
import { unreadForTutor } from "@/lib/messages";

// Admin shell (SPEC §15.7 #23): exactly five items, Courses is the home.
// Students get redirected to /app; logged-out users to /login.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/app");

  const unread = await unreadForTutor();
  const nav = [
    { href: "/admin", label: "Courses" },
    { href: "/admin/students", label: "Students" },
    { href: "/admin/messages", label: unread > 0 ? `Messages · ${unread}` : "Messages" },
    { href: "/admin/calendar", label: "Calendar" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="lmn-nav">
        <div className="lmn-nav-wrap">
          <Link href="/admin" style={{ display: "inline-flex", textDecoration: "none" }}>
            <Wordmark variant="bar" inverse />
          </Link>
          <span className="lmn-nav-label">Admin</span>
          <nav aria-label="Admin" className="lmn-nav-links" style={{ flex: 1 }}>
            {nav.map((n) => (
              <Link key={n.href} href={n.href} className="lmn-nav-link">
                {n.label}
              </Link>
            ))}
          </nav>
          {/* Identity is the initials chip alone (SPEC §15.7 #14). */}
          <span className="lmn-nav-who">
            <Avatar size="sm" tone="inverse" initials={initials(user.name)} />
          </span>
          <form action={signOut} style={{ display: "inline-flex" }}>
            <IconButton icon="logout" variant="inverse" label="Sign out" type="submit" size="sm" />
          </form>
        </div>
      </header>
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 20px 64px", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
