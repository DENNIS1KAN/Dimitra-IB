import { Card } from "@/components/lumen/core";
import { AutoRefresh } from "@/components/messages/auto-refresh";
import { MessageBubbles } from "@/components/messages/bubbles";
import { MessageComposer } from "@/components/messages/composer";
import { markThreadReadForStudent, studentThread } from "@/lib/messages";
import { requireStudent } from "@/lib/student";
import { sendMessage } from "../actions";

// /app/messages — the student's single thread with Dimitra (SPEC §15.4).
// Opening it marks her messages read; the thread is always the actor's own.
export default async function MessagesPage() {
  const user = await requireStudent();
  await markThreadReadForStudent(user);
  const thread = await studentThread(user);

  return (
    <main style={{ maxWidth: 720, margin: "0 auto" }}>
      <AutoRefresh intervalMs={15000} />
      <div style={{ padding: "16px 20px 24px", display: "flex", flexDirection: "column", gap: 16 }}>
        <div>
          <h1
            style={{
              margin: 0,
              fontSize: "var(--text-heading)",
              fontWeight: 700,
              letterSpacing: "var(--tracking-heading)",
              lineHeight: 1.2,
            }}
          >
            Messages
          </h1>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: "var(--text-body-sm)",
              letterSpacing: "var(--tracking-body-sm)",
              color: "var(--text-tertiary)",
            }}
          >
            Your thread with Dimitra
          </p>
        </div>

        {thread.length > 0 ? (
          <MessageBubbles messages={thread} viewer="student" counterpartName="Dimitra" />
        ) : (
          <Card padding="20px">
            <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
              No messages yet — ask Dimitra anything about your modules.
            </p>
          </Card>
        )}

        <Card padding="16px">
          <MessageComposer action={sendMessage} placeholder="Ask Dimitra anything about your modules…" />
        </Card>
      </div>
    </main>
  );
}
