"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// DESIGN.md §5 DeskNav link recipe: body-sm 500, 8×12 pad, active text-primary
// (on a cream pill), rest text-tertiary. One component, mounted ONCE in
// app/app/layout.tsx (SPEC §15.4); M7/M8 add Messages, Sessions, Account.
const ITEMS = [
  { href: "/app", label: "Home" },
  { href: "/app/courses", label: "Courses" },
  { href: "/app/assignments", label: "Assignments" },
  { href: "/app/messages", label: "Messages" },
];

export function StudentNav({ unread = false }: { unread?: boolean }) {
  const pathname = usePathname();
  // The thread page marks everything read as it opens, so the dot is never
  // shown while the student is already there.
  const showDot = unread && !pathname.startsWith("/app/messages");
  const isActive = (href: string) =>
    href === "/app"
      ? pathname === "/app" || pathname.startsWith("/app/modules")
      : pathname.startsWith(href);
  return (
    <nav aria-label="Student" style={{ display: "flex", gap: 4, overflowX: "auto" }}>
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            aria-current={active ? "page" : undefined}
            style={{
              fontSize: "var(--text-body-sm)",
              fontWeight: 500,
              letterSpacing: "var(--tracking-body-sm)",
              color: active ? "var(--text-primary)" : "var(--text-tertiary)",
              padding: "8px 12px",
              borderRadius: "var(--radius-pills)",
              background: active ? "var(--surface-page)" : "transparent",
              whiteSpace: "nowrap",
            }}
          >
            {item.label}
            {item.href === "/app/messages" && showDot && (
              <>
                <span
                  aria-hidden="true"
                  style={{
                    display: "inline-block",
                    width: 8,
                    height: 8,
                    marginLeft: 6,
                    borderRadius: "var(--radius-pills)",
                    background: "var(--action-primary)",
                    verticalAlign: "middle",
                  }}
                />
                <span className="sr-only"> (unread)</span>
              </>
            )}
          </Link>
        );
      })}
    </nav>
  );
}
