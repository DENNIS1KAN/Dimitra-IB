import type { Message } from "@/db/schema";
import { formatDateTime } from "@/lib/format";

// Sent / received bubbles (SPEC §15.4). "Mine" = the viewer's own side:
// primary-blue bubble, right-aligned; the other side = white card, left.
// Tokens only (DESIGN.md §1/§4): radius cards, body text, caption meta.
export function MessageBubbles({
  messages,
  viewer,
  counterpartName,
}: {
  messages: Message[];
  viewer: "student" | "tutor";
  /** Name shown on the other side's bubbles (e.g. "Dimitra" or the student's first name). */
  counterpartName: string;
}) {
  return (
    <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "flex", flexDirection: "column", gap: 10 }}>
      {messages.map((m) => {
        const mine = m.sender === viewer;
        return (
          <li
            key={m.id}
            style={{ display: "flex", flexDirection: "column", alignItems: mine ? "flex-end" : "flex-start" }}
          >
            <div
              style={{
                maxWidth: "85%",
                padding: "12px 16px",
                borderRadius: "var(--radius-cards)",
                background: mine ? "var(--action-primary)" : "var(--surface-card)",
                color: mine ? "var(--text-inverse)" : "var(--text-primary)",
                border: mine ? "1px solid transparent" : "1px solid var(--border-card)",
                boxShadow: mine ? "none" : "var(--shadow-card)",
                fontSize: "var(--text-body)",
                lineHeight: 1.5,
                letterSpacing: "var(--tracking-body)",
                whiteSpace: "pre-wrap",
                overflowWrap: "anywhere",
              }}
            >
              {m.body}
            </div>
            <span
              style={{
                marginTop: 4,
                fontSize: "var(--text-caption)",
                letterSpacing: "var(--tracking-caption)",
                color: "var(--text-tertiary)",
              }}
            >
              {mine ? "You" : counterpartName} · {formatDateTime(m.createdAt)}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
