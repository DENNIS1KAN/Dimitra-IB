import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { storage, storageKeyFor } from "@/lib/storage";

const ALLOWED = new Set(["video", "slides", "exercises", "solutions"]);
const EXTENSIONS: Record<string, string[]> = {
  video: [".mp4", ".webm", ".mov"],
  slides: [".pdf"],
  exercises: [".pdf"],
  solutions: [".pdf"],
};

// Admin material upload. Dev: bytes land in ./storage. (M3: video files go
// browser → Bunny directly; this route still handles PDFs.)
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (user?.role !== "admin") {
    return NextResponse.json({ error: "admin only" }, { status: 403 });
  }

  const form = await request.formData();
  const moduleId = String(form.get("moduleId") ?? "");
  const type = String(form.get("type") ?? "");
  const file = form.get("file");

  if (!ALLOWED.has(type) || !(file instanceof File) || !moduleId) {
    return NextResponse.json({ error: "missing module, type, or file" }, { status: 400 });
  }
  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module) return NextResponse.json({ error: "module not found" }, { status: 404 });

  const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
  if (!EXTENSIONS[type].includes(ext)) {
    return NextResponse.json(
      { error: `${type} must be ${EXTENSIONS[type].join(" / ")}` },
      { status: 400 },
    );
  }

  const key = storageKeyFor(moduleId, file.name);
  await storage.put(key, Buffer.from(await file.arrayBuffer()), file.type);

  const siblings = await db
    .select({ sortOrder: materials.sortOrder })
    .from(materials)
    .where(eq(materials.moduleId, moduleId));
  const nextOrder = siblings.length ? Math.max(...siblings.map((s) => s.sortOrder)) + 1 : 0;

  const title = file.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ");
  const [created] = await db
    .insert(materials)
    .values({
      moduleId,
      type: type as "video" | "slides" | "exercises" | "solutions",
      title,
      storageKey: key,
      sortOrder: nextOrder,
    })
    .returning();

  return NextResponse.json({ material: created });
}
