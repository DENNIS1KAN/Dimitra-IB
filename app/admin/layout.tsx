import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { eq, sql } from "drizzle-orm";
import { db } from "@/db";
import { enrollments } from "@/db/schema";
import { Avatar, IconButton, Wordmark } from "@/components/lumen/core";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";
import { initials } from "@/lib/format";
import { unreadForTutor } from "@/lib/messages";

// Admin shell, function over beauty (SPEC §12). Students get redirected
// to /app; logged-out users to /login.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/app");

  // Pending join requests surface in the nav so they can't be missed.
  const [{ pending }] = await db
    .select({ pending: sql<number>`count(*)::int` })
    .from(enrollments)
    .where(eq(enrollments.status, "requested"));
  const unread = await unreadForTutor();
  const nav = [
    { href: "/admin", label: "Students" },
    { href: "/admin/requests", label: pending > 0 ? `Requests (${pending})` : "Requests" },
    { href: "/admin/courses", label: "Courses" },
    { href: "/admin/modules", label: "Modules" },
    { href: "/admin/progress", label: "Progress" },
    { href: "/admin/calendar", label: "Calendar" },
    { href: "/admin/messages", label: unread > 0 ? `Messages (${unread})` : "Messages" },
    { href: "/admin/settings", label: "Settings" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="lmn-nav">
        <div className="lmn-nav-wrap">
          <Link href="/admin" style={{ display: "inline-flex", textDecoration: "none" }}>
            <Wordmark size="sm" inverse />
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
