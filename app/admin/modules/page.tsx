import Link from "next/link";
import { asc } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, modules } from "@/db/schema";
import { Badge, Button, Card } from "@/components/lumen/core";
import { Input } from "@/components/lumen/forms";
import { TextArea } from "@/components/lumen/forms";
import { requireAdmin } from "@/lib/admin";
import { formatDay } from "@/lib/format";
import { createModule } from "../actions";

// /admin/modules — list by cohort + new module (SPEC §7).
export default async function AdminModules({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  await requireAdmin();
  const { error } = await searchParams;
  const allCohorts = await db.select().from(cohorts).orderBy(cohorts.name);
  const allModules = await db.select().from(modules).orderBy(asc(modules.weekNumber));
  // Server component renders per-request; "now" is stable within the render.
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now();

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
        Modules
      </h1>

      {error && (
        <Card padding="16px" style={{ borderColor: "#c4320a" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
            {error === "week-taken"
              ? "That cohort already has a module for that week number."
              : "Module needs a cohort, week number, title, and release date."}
          </p>
        </Card>
      )}

      {allCohorts.map((cohort) => {
        const list = allModules.filter((m) => m.cohortId === cohort.id);
        return (
          <Card key={cohort.id} padding="20px">
            <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
              {cohort.name}
            </h2>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {list.map((m) => (
                <Link
                  key={m.id}
                  href={`/admin/modules/${m.id}`}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    padding: "10px 12px",
                    border: "1px solid var(--border-card)",
                    borderRadius: "var(--radius-small)",
                    color: "var(--text-primary)",
                    fontSize: "var(--text-body-sm)",
                  }}
                >
                  <span style={{ fontWeight: 700, minWidth: 64 }}>Week {m.weekNumber}</span>
                  <span style={{ flex: 1, fontWeight: 500 }}>{m.title}</span>
                  {m.releaseDate.getTime() <= now ? (
                    <Badge tone="done" icon="check">
                      Released {formatDay(m.releaseDate)}
                    </Badge>
                  ) : (
                    <Badge tone="locked" icon="schedule">
                      Releases {formatDay(m.releaseDate)}
                    </Badge>
                  )}
                </Link>
              ))}
              {list.length === 0 && (
                <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
                  No modules yet.
                </p>
              )}
            </div>
          </Card>
        );
      })}

      <Card padding="20px">
        <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
          New module
        </h2>
        <form action={createModule} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
          <label className="lmn-field">
            <span className="lmn-field-label">Cohort</span>
            <select className="lmn-input" name="cohortId" required defaultValue="">
              <option value="" disabled>
                Pick a cohort
              </option>
              {allCohorts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </label>
          <div style={{ display: "flex", gap: 10 }}>
            <Input label="Week number" name="weekNumber" type="number" min={1} required style={{ width: 140 }} />
            <Input
              label="Release date & time"
              name="releaseDate"
              type="datetime-local"
              required
              style={{ flex: 1 }}
            />
          </div>
          <Input label="Title" name="title" required placeholder="Buffers & titration curves" />
          <TextArea
            label="Description (shows as your weekly note to students)"
            name="description"
            rows={3}
            placeholder="A couple of sentences in your voice — what to focus on, what to bring to the clinic."
          />
          <Button variant="primary" size="sm" type="submit">
            Create module
          </Button>
        </form>
      </Card>
    </div>
  );
}
