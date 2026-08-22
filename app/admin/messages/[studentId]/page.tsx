import Link from "next/link";
import { notFound } from "next/navigation";
import { Card } from "@/components/lumen/core";
import { AutoRefresh } from "@/components/messages/auto-refresh";
import { MessageBubbles } from "@/components/messages/bubbles";
import { MessageComposer } from "@/components/messages/composer";
import { requireAdmin } from "@/lib/admin";
import { firstName } from "@/lib/format";
import { adminThread } from "@/lib/messages";
import { replyToStudent } from "../../actions";

// /admin/messages/[studentId] — one student's thread + reply (SPEC §15.5).
// Replying marks the thread read for the tutor; opening alone does not.
export default async function AdminThread({ params }: { params: Promise<{ studentId: string }> }) {
  const user = await requireAdmin();
  const { studentId } = await params;
  const thread = await adminThread(user, studentId);
  if (!thread) notFound();
  const { student, messages } = thread;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 720 }}>
      <AutoRefresh intervalMs={15000} />
      <div>
        <Link href="/admin/messages" style={{ fontSize: "var(--text-body-sm)", fontWeight: 500 }}>
          ← All messages
        </Link>
        <h1
          style={{
            margin: "8px 0 0",
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
          }}
        >
          {student.name}
        </h1>
        <p style={{ margin: "2px 0 0", fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
          {student.email}
          {!student.active && " · paused"}
        </p>
      </div>

      {messages.length > 0 ? (
        <MessageBubbles messages={messages} viewer="tutor" counterpartName={firstName(student.name)} />
      ) : (
        <Card padding="20px">
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-secondary)" }}>
            No messages yet — write the first one below.
          </p>
        </Card>
      )}

      <Card padding="16px">
        <MessageComposer
          action={replyToStudent.bind(null, student.id)}
          placeholder={`Reply to ${firstName(student.name)}…`}
          sendLabel="Reply"
        />
      </Card>
    </div>
  );
}
