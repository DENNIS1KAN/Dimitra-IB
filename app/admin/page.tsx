import Link from "next/link";
import { Badge, Button } from "@/components/rts/core";
import { adminHome } from "@/lib/admin-queries";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import { nudgeLine } from "@/lib/content";
import { approveRequest, declineRequest } from "./actions";

// /admin, the home (SPEC §15.7 #23): the "Needs you" strip, rendered only
// when something truly needs her, then one card per course. Two clicks to
// anywhere: open the course, open the week.
export default async function AdminHome() {
  await requireAdmin();
  const { courses, needs } = await adminHome();

  const strip: React.ReactNode[] = [];

  for (const { enrollment, student, cohort } of needs.requests) {
    strip.push(
      <AttentionRow
        key={`req-${enrollment.id}`}
        title={`${student.name} asked to join ${cohort.name}`}
        body={`Requested ${formatDay(enrollment.requestedAt)}. Approve once the PayPal is in.`}
        actions={
          <>
            <form action={approveRequest}>
              <input type="hidden" name="enrollmentId" value={enrollment.id} />
              <input type="hidden" name="back" value="/admin" />
              <Button variant="primary" size="sm" type="submit">
                Approve
              </Button>
            </form>
            <form action={declineRequest}>
              <input type="hidden" name="enrollmentId" value={enrollment.id} />
              <input type="hidden" name="back" value="/admin" />
              <button type="submit" style={softAction}>
                Decline
              </button>
            </form>
          </>
        }
      />,
    );
  }

  if (needs.unread > 0) {
    strip.push(
      <AttentionRow
        key="unread"
        title={
          needs.unread === 1 ? "1 unread message from a student" : `${needs.unread} unread messages from students`
        }
        body="Reply from Messages; opening a thread marks it read."
        actions={
          <Link href="/admin/messages" style={blueAction}>
            Open messages
          </Link>
        }
      />,
    );
  }

  for (const cohort of needs.emptyListed) {
    strip.push(
      <AttentionRow
        key={`empty-${cohort.id}`}
        title={`${cohort.name} is listed with no modules`}
        body="Students can see it in the catalog. Add week 1 to get started."
        actions={
          <Link href={`/admin/courses/${cohort.id}`} style={blueAction}>
            Open course
          </Link>
        }
      />,
    );
  }

  for (const { module, cohort, missing } of needs.nudges) {
    strip.push(
      <AttentionRow
        key={`nudge-${module.id}`}
        title={nudgeLine(module.weekNumber, cohort.name, missing)}
        body={`Releases ${formatDay(module.releaseDate)} at 09:00. ${
          missing.length === 1 ? "One file to go." : `${missing.length} files to go.`
        }`}
        actions={
          <Link href={`/admin/courses/${cohort.id}/weeks/${module.id}`} style={blueAction}>
            Open week {module.weekNumber}
          </Link>
        }
      />,
    );
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
      {strip.length > 0 && <div>{strip}</div>}

      <h1
        style={{
          margin: strip.length > 0 ? "6px 0 0" : 0,
          fontSize: "var(--text-heading-sm)",
          fontWeight: 800,
          letterSpacing: "var(--tracking-heading-sm)",
        }}
      >
        Courses
      </h1>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          gap: 13,
        }}
      >
        {courses.map(({ cohort, activeCount, requestedCount, moduleCount, lastReleased, nextRelease }) => (
          <div
            key={cohort.id}
            style={{
              background: "var(--surface-card)",
              border: "1px solid var(--border-card)",
              borderRadius: "var(--radius-cards)",
              padding: 17,
              display: "flex",
              flexDirection: "column",
              gap: 9,
            }}
          >
            <h2
              style={{
                margin: 0,
                fontSize: 16,
                fontWeight: 800,
                letterSpacing: "-0.3px",
                color: "var(--text-heading-color)",
              }}
            >
              {cohort.name}
            </h2>
            <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
              <Badge tone={activeCount > 0 ? "done" : "neutral"}>{activeCount} active</Badge>
              {requestedCount > 0 && (
                <Badge tone="new">
                  {requestedCount} request{requestedCount === 1 ? "" : "s"}
                </Badge>
              )}
              {cohort.isListed && <Badge tone="neutral">Listed</Badge>}
            </div>
            <p style={{ margin: 0, fontSize: "var(--text-caption)", color: "var(--text-tertiary)", lineHeight: 1.55 }}>
              {moduleCount === 0 ? (
                <>No modules yet. Add week 1 to get started.</>
              ) : (
                <>
                  {lastReleased ? (
                    <>
                      W{lastReleased.module.weekNumber} out {formatDay(lastReleased.module.releaseDate)} ·{" "}
                      {lastReleased.submitted} of {activeCount} submitted
                    </>
                  ) : (
                    <>Nothing released yet.</>
                  )}
                  {nextRelease && (
                    <>
                      <br />
                      Next: W{nextRelease.weekNumber} on {formatDay(nextRelease.releaseDate)}
                    </>
                  )}
                </>
              )}
            </p>
            <Link
              href={`/admin/courses/${cohort.id}`}
              style={{ marginTop: "auto", fontWeight: 700, fontSize: 13.5 }}
            >
              Open course
            </Link>
          </div>
        ))}

        <Link
          href="/admin/courses/new"
          style={{
            border: "1.5px dashed var(--border-divider)",
            borderRadius: "var(--radius-cards)",
            padding: 17,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            minHeight: 120,
            fontWeight: 700,
            fontSize: 14,
            color: "var(--action-primary)",
          }}
        >
          New course
        </Link>
      </div>
    </div>
  );
}

const softAction: React.CSSProperties = {
  border: 0,
  background: "none",
  padding: 0,
  font: "inherit",
  fontSize: 13,
  fontWeight: 500,
  color: "var(--text-tertiary)",
  cursor: "pointer",
  whiteSpace: "nowrap",
};

const blueAction: React.CSSProperties = {
  fontSize: 13,
  fontWeight: 700,
  whiteSpace: "nowrap",
};

// One "Needs you" row: the orange left-bar style from the mockup.
function AttentionRow({
  title,
  body,
  actions,
}: {
  title: string;
  body: string;
  actions: React.ReactNode;
}) {
  return (
    <div
      style={{
        borderLeft: "3px solid var(--action-cta)",
        borderTop: "1px solid var(--border-card)",
        borderRight: "1px solid var(--border-card)",
        borderBottom: "1px solid var(--border-card)",
        borderRadius: "0 12px 12px 0",
        background: "var(--surface-card)",
        padding: "12px 15px",
        marginBottom: 9,
        display: "flex",
        alignItems: "center",
        gap: 14,
        flexWrap: "wrap",
      }}
    >
      <div style={{ flex: 1, minWidth: 220 }}>
        <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: "var(--text-strong)" }}>{title}</h3>
        <p style={{ margin: 0, fontSize: 12.5, color: "var(--text-tertiary)" }}>{body}</p>
      </div>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>{actions}</div>
    </div>
  );
}
