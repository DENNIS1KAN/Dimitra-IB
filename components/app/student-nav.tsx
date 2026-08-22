"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

// DESIGN.md §5 Nav recipe (blue bar; links white at 78%, active white on a
// 16% white pill). One component, mounted ONCE in app/app/layout.tsx.
const ITEMS = [
  { href: "/app", label: "Home" },
  { href: "/app/courses", label: "Courses" },
  { href: "/app/assignments", label: "Assignments" },
  { href: "/app/messages", label: "Messages" },
  { href: "/app/sessions", label: "Sessions" },
  { href: "/app/account", label: "Account" },
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
    <nav aria-label="Student" className="lmn-nav-links">
      {ITEMS.map((item) => {
        const active = isActive(item.href);
        return (
          <Link
            key={item.href}
            href={item.href}
            className="lmn-nav-link"
            aria-current={active ? "page" : undefined}
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
                    borderRadius: "50%",
                    background: "var(--state-done)",
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
