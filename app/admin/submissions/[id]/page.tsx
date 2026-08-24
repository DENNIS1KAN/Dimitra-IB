import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge, Button, Card } from "@/components/rts/core";
import { requireAdmin } from "@/lib/admin";
import { contentTypeFor } from "@/lib/content-type";
import { formatDateTime } from "@/lib/format";
import { adminSubmission } from "@/lib/submissions";

// /admin/submissions/[id]: one student's attempt, file + note (SPEC §15.5).
// Admin-only read path; the bytes come from /api/admin/submissions/[id]/file.
export default async function AdminSubmissionPage({ params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin();
  const { id } = await params;
  const found = await adminSubmission(user, id);
  if (!found) notFound();
  const { submission, student, module, cohort } = found;
  const fileUrl = `/api/admin/submissions/${submission.id}/file`;
  const type = submission.fileKey ? contentTypeFor(submission.fileKey) : null;

  const label = (text: string) => (
    <h2 style={{ margin: "0 0 8px", fontSize: "var(--text-body-sm)", fontWeight: 700 }}>{text}</h2>
  );

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20, maxWidth: 860 }}>
      <div>
        <Link href="/admin/progress" style={{ fontSize: "var(--text-body-sm)", fontWeight: 500 }}>
          ← Progress
        </Link>
        <h1
          style={{
            margin: "8px 0 4px",
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
          }}
        >
          {student.name}, Week {module.weekNumber}: {module.title}
        </h1>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          <Badge tone="neutral">{cohort.name}</Badge>
          <span style={{ fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
            Sent {formatDateTime(submission.createdAt)}
          </span>
        </div>
      </div>

      <Card padding="20px">
        {label("Note")}
        <p
          style={{
            margin: 0,
            fontSize: "var(--text-body)",
            lineHeight: 1.5,
            whiteSpace: "pre-wrap",
            color: submission.note ? "var(--text-primary)" : "var(--text-tertiary)",
          }}
        >
          {submission.note ?? "No note."}
        </p>
      </Card>

      <Card padding="20px">
        {label("File")}
        {!submission.fileKey ? (
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
            No file: {submission.note ? "a note only." : "marked as attempted."}
          </p>
        ) : type?.startsWith("image/") ? (
          <a href={fileUrl} target="_blank" rel="noopener noreferrer">
            {/* eslint-disable-next-line @next/next/no-img-element -- admin-only, unoptimised on purpose */}
            <img
              src={fileUrl}
              alt={`${student.name}'s submitted working`}
              style={{ maxWidth: "100%", height: "auto", borderRadius: "var(--radius-cards)", display: "block" }}
            />
          </a>
        ) : type === "application/pdf" ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <iframe
              src={fileUrl}
              title={`${student.name}'s submitted PDF`}
              style={{ width: "100%", height: 640, border: "1px solid var(--border-card)", borderRadius: "var(--radius-cards)" }}
            />
            <div>
              <Button variant="secondary" size="sm" href={fileUrl} external>
                Open in a new tab
              </Button>
            </div>
          </div>
        ) : (
          <Button variant="secondary" size="sm" href={fileUrl} external>
            Download file
          </Button>
        )}
      </Card>
    </div>
  );
}
