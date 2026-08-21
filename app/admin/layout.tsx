import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { IconButton, Wordmark } from "@/components/lumen/core";
import { getSessionUser } from "@/lib/auth";
import { signOut } from "@/lib/auth-actions";

// Admin shell — function over beauty (SPEC §12). Students get redirected
// to /app; logged-out users to /login.
export default async function AdminLayout({ children }: { children: ReactNode }) {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/app");

  const nav = [
    { href: "/admin", label: "Students" },
    { href: "/admin/modules", label: "Modules" },
    { href: "/admin/progress", label: "Progress" },
  ];

  return (
    <div className="flex min-h-dvh flex-col">
      <header
        style={{ background: "var(--surface-card)", borderBottom: "1px solid var(--border-card)" }}
      >
        <div
          style={{
            maxWidth: 1040,
            margin: "0 auto",
            padding: "12px 20px",
            display: "flex",
            alignItems: "center",
            gap: 16,
            flexWrap: "wrap",
          }}
        >
          <Wordmark size="sm" />
          <span
            style={{
              fontSize: "var(--text-caption)",
              fontWeight: 700,
              textTransform: "uppercase",
              letterSpacing: ".04em",
              color: "var(--text-tertiary)",
            }}
          >
            Admin
          </span>
          <nav style={{ display: "flex", gap: 4, flex: 1 }}>
            {nav.map((n) => (
              <Link
                key={n.href}
                href={n.href}
                style={{
                  fontSize: "var(--text-body-sm)",
                  fontWeight: 500,
                  color: "var(--text-secondary)",
                  padding: "6px 10px",
                }}
              >
                {n.label}
              </Link>
            ))}
          </nav>
          <form action={signOut} style={{ display: "inline-flex" }}>
            <IconButton icon="logout" label="Sign out" type="submit" size="sm" />
          </form>
        </div>
      </header>
      <main style={{ maxWidth: 1040, margin: "0 auto", padding: "24px 20px 64px", width: "100%" }}>
        {children}
      </main>
    </div>
  );
}
