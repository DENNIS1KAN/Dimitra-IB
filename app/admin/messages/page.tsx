import Link from "next/link";
import { Badge, Card } from "@/components/lumen/core";
import { requireAdmin } from "@/lib/admin";
import { formatDateTime } from "@/lib/format";
import { adminThreads } from "@/lib/messages";

// /admin/messages: every student as a thread, latest activity first, with
// unread counts (SPEC §15.5). Function over beauty (§12).
export default async function AdminMessages() {
  const user = await requireAdmin();
  const threads = await adminThreads(user);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <h1
        style={{
          margin: 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 700,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Messages
      </h1>

      <Card padding="0">
        {threads.map(({ student, lastMessage, unread }, i) => {
          const snippet = lastMessage
            ? `${lastMessage.sender === "tutor" ? "You: " : ""}${lastMessage.body.length > 90 ? lastMessage.body.slice(0, 90) + "…" : lastMessage.body}`
            : "No messages yet";
          return (
            <Link
              key={student.id}
              href={`/admin/messages/${student.id}`}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 12,
                padding: "12px 16px",
                borderTop: i === 0 ? "none" : "1px solid var(--border-card)",
                color: "var(--text-primary)",
              }}
            >
              <span style={{ flex: 1, minWidth: 0 }}>
                <span
                  style={{
                    display: "flex",
                    alignItems: "baseline",
                    gap: 8,
                    fontSize: "var(--text-body-sm)",
                    fontWeight: unread > 0 ? 700 : 500,
                  }}
                >
                  <span>{student.name}</span>
                  {lastMessage && (
                    <span style={{ fontWeight: 400, color: "var(--text-tertiary)", fontSize: "var(--text-caption)" }}>
                      {formatDateTime(lastMessage.createdAt)}
                    </span>
                  )}
                </span>
                <span
                  style={{
                    display: "block",
                    fontSize: "var(--text-body-sm)",
                    color: lastMessage ? "var(--text-secondary)" : "var(--text-tertiary)",
                    whiteSpace: "nowrap",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                  }}
                >
                  {snippet}
                </span>
              </span>
              {unread > 0 && (
                <Badge tone="new">
                  {unread} new
                </Badge>
              )}
            </Link>
          );
        })}
        {threads.length === 0 && (
          <p style={{ margin: 0, padding: 16, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
            No students yet.
          </p>
        )}
      </Card>
    </div>
  );
}
