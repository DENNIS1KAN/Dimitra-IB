import { and, eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { storage, storageKeyFor } from "@/lib/storage";
import { isUuid } from "@/lib/validate";
import { validateVideoUrl } from "@/lib/video";

const ALLOWED = new Set(["video", "slides", "exercises", "solutions"]);
const EXTENSIONS: Record<string, string[]> = {
  video: [".mp4", ".webm", ".mov"],
  slides: [".pdf"],
  exercises: [".pdf"],
  solutions: [".pdf"],
};

type MaterialType = "video" | "slides" | "exercises" | "solutions";

// Admin material upload: bytes land on this server's own disk under ./storage
// and are served back through /api/materials behind the login (SPEC §15.7
// #25). Videos may instead carry a pasted link to a video hosted elsewhere;
// that row stores external_url and no bytes.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const form = await request.formData();
  const moduleId = String(form.get("moduleId") ?? "");
  const type = String(form.get("type") ?? "");
  const file = form.get("file");
  const pastedUrl = form.get("url");
  // Replace flow (SPEC §15.7 #23): the single-file slots swap their file in
  // place; the new row inherits the old row's sort position.
  const replaceId = String(form.get("replace") ?? "");

  if (!ALLOWED.has(type) || !isUuid(moduleId)) {
    return NextResponse.json({ error: "missing module or type" }, { status: 400 });
  }
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module) return NextResponse.json({ error: "module not found" }, { status: 404 });

  const isLink = typeof pastedUrl === "string" && pastedUrl.trim().length > 0;
  if (!isLink && !(file instanceof File)) {
    return NextResponse.json({ error: "missing file" }, { status: 400 });
  }
  if (isLink && type !== "video") {
    return NextResponse.json({ error: "only videos can be a pasted link" }, { status: 400 });
  }

  let storageKey: string | null = null;
  let externalUrl: string | null = null;
  let title: string;

  if (isLink) {
    const checked = validateVideoUrl(pastedUrl);
    if (!checked.ok) {
      return NextResponse.json(
        { error: "Paste a full video link starting with https://" },
        { status: 400 },
      );
    }
    externalUrl = checked.url;
    title = String(form.get("title") ?? "").trim() || (await nextVideoTitle(moduleId));
  } else {
    const upload = file as File;
    const ext = upload.name.slice(upload.name.lastIndexOf(".")).toLowerCase();
    if (!EXTENSIONS[type].includes(ext)) {
      return NextResponse.json(
        { error: `${type} must be ${EXTENSIONS[type].join(" / ")}` },
        { status: 400 },
      );
    }
    storageKey = storageKeyFor(moduleId, upload.name);
    await storage.put(storageKey, Buffer.from(await upload.arrayBuffer()), upload.type);
    title = upload.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  }

  let replacedOrder: number | null = null;
  if (isUuid(replaceId)) {
    const [old] = await db.select().from(materials).where(eq(materials.id, replaceId));
    if (old && old.moduleId === moduleId && old.type === type) {
      replacedOrder = old.sortOrder;
      await db.delete(materials).where(eq(materials.id, old.id));
      if (old.storageKey) await storage.delete(old.storageKey);
    }
  }

  const siblings = await db
    .select({ sortOrder: materials.sortOrder })
    .from(materials)
    .where(eq(materials.moduleId, moduleId));
  const nextOrder =
    replacedOrder ??
    (siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0);

  const [created] = await db
    .insert(materials)
    .values({
      moduleId,
      type: type as MaterialType,
      title,
      storageKey,
      externalUrl,
      sortOrder: nextOrder,
    })
    .returning();

  return NextResponse.json({ material: created });
}

/** A link has no filename to name it after, so number it within the slot. */
async function nextVideoTitle(moduleId: string): Promise<string> {
  const existing = await db
    .select({ id: materials.id })
    .from(materials)
    .where(and(eq(materials.moduleId, moduleId), eq(materials.type, "video")));
  return `Video ${existing.length + 1}`;
}
