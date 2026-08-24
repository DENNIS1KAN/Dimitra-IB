import { notFound } from "next/navigation";
import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { cohorts, materials, modules } from "@/db/schema";
import { Badge, Button, Card, Icon } from "@/components/lumen/core";
import { Input, TextArea } from "@/components/lumen/forms";
import { ConfirmSubmit } from "@/components/admin/confirm-submit";
import { UploadDropzone } from "@/components/admin/upload-dropzone";
import { requireAdmin } from "@/lib/admin";
import { toLocalInputValue } from "@/lib/tz";
import { isUuid } from "@/lib/validate";
import { deleteMaterial, moveMaterial, renameMaterial, updateModule } from "../../actions";

const TYPE_ICONS: Record<string, string> = {
  video: "play_circle",
  slides: "description",
  exercises: "edit_note",
  solutions: "lock_open",
};

// /admin/modules/[id] — edit title/description/release date; upload
// materials (drag-and-drop); reorder (SPEC §7).
export default async function AdminModuleEdit({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{
    ok?: string;
    error?: string;
    // Carried back by updateModule on week-taken so edits aren't lost.
    weekNumber?: string;
    title?: string;
    description?: string;
    releaseDate?: string;
  }>;
}) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const { ok, error, ...carried } = await searchParams;

  const [module] = await db.select().from(modules).where(eq(modules.id, id));
  if (!module) notFound();
  const [cohort] = await db.select().from(cohorts).where(eq(cohorts.id, module.cohortId));
  const mats = await db
    .select()
    .from(materials)
    .where(eq(materials.moduleId, id))
    .orderBy(asc(materials.sortOrder), asc(materials.id));

  // datetime-local shows the TUTOR's wall clock (lib/tz), not the server's.
  const local = toLocalInputValue(module.releaseDate);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 24 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "var(--text-heading-sm)",
            fontWeight: 700,
            letterSpacing: "var(--tracking-heading-sm)",
            flex: 1,
          }}
        >
          Week {module.weekNumber} — {module.title}
        </h1>
        <Badge tone="neutral">{cohort?.name}</Badge>
      </div>

      {ok === "saved" && (
        <Card padding="12px" style={{ borderColor: "var(--action-primary)" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", fontWeight: 500 }}>Saved.</p>
        </Card>
      )}
      {error && (
        <Card padding="12px" style={{ borderColor: "#c4320a" }}>
          <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "#c4320a" }}>
            {error === "week-taken"
              ? "That cohort already has a module for that week number."
              : "Check the fields — week, title, and release date are required."}
          </p>
        </Card>
      )}

      <Card padding="20px">
        <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
          Module details
        </h2>
        <form action={updateModule} style={{ display: "flex", flexDirection: "column", gap: 10, maxWidth: 520 }}>
          <input type="hidden" name="id" value={module.id} />
          <Input
            label="Week number"
            name="weekNumber"
            type="number"
            min={1}
            required
            defaultValue={carried.weekNumber ?? module.weekNumber}
            style={{ width: 140 }}
          />
          <Input
            label="Release date & time"
            name="releaseDate"
            type="datetime-local"
            required
            defaultValue={carried.releaseDate ?? local}
            style={{ maxWidth: 240 }}
          />
          <Input label="Title" name="title" required defaultValue={carried.title ?? module.title} />
          <TextArea
            label="Description (shows as your weekly note to students)"
            name="description"
            rows={3}
            defaultValue={carried.description ?? module.description ?? ""}
          />
          <Button variant="primary" size="sm" type="submit">
            Save changes
          </Button>
        </form>
      </Card>

      <Card padding="20px">
        <h2 style={{ margin: "0 0 12px", fontSize: "var(--text-body)", fontWeight: 700 }}>
          Materials
        </h2>
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 16 }}>
          {mats.map((m, i) => (
            <div
              key={m.id}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "8px 12px",
                border: "1px solid var(--border-card)",
                borderRadius: "var(--radius-small)",
                flexWrap: "wrap",
              }}
            >
              <Icon name={TYPE_ICONS[m.type]} size={20} color="var(--text-secondary)" />
              <Badge tone={m.type === "solutions" ? "live" : "neutral"}>{m.type}</Badge>
              <form action={renameMaterial} style={{ flex: 1, display: "flex", gap: 8, minWidth: 220 }}>
                <input type="hidden" name="id" value={m.id} />
                <input
                  className="lmn-input"
                  name="title"
                  defaultValue={m.title}
                  style={{ padding: "6px 10px", fontSize: "var(--text-body-sm)" }}
                />
                <Button variant="ghost" size="sm" type="submit">
                  Rename
                </Button>
              </form>
              <div style={{ display: "flex", gap: 4 }}>
                <form action={moveMaterial}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="direction" value="up" />
                  <Button variant="secondary" size="sm" type="submit" disabled={i === 0}>
                    ↑
                  </Button>
                </form>
                <form action={moveMaterial}>
                  <input type="hidden" name="id" value={m.id} />
                  <input type="hidden" name="direction" value="down" />
                  <Button variant="secondary" size="sm" type="submit" disabled={i === mats.length - 1}>
                    ↓
                  </Button>
                </form>
                <form action={deleteMaterial}>
                  <input type="hidden" name="id" value={m.id} />
                  <ConfirmSubmit
                    message={`Delete "${m.title}"? The uploaded file and its viewing history go with it — there is no undo.`}
                  >
                    Delete
                  </ConfirmSubmit>
                </form>
              </div>
            </div>
          ))}
          {mats.length === 0 && (
            <p style={{ margin: 0, fontSize: "var(--text-body-sm)", color: "var(--text-tertiary)" }}>
              Nothing uploaded yet.
            </p>
          )}
        </div>
        <UploadDropzone moduleId={module.id} />
      </Card>
    </div>
  );
}
