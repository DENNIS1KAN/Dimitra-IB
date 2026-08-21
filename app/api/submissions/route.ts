import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { modules, submissions } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { moduleState } from "@/lib/gating";
import { storage } from "@/lib/storage";

const FILE_EXTS = new Set([".jpg", ".jpeg", ".png", ".heic", ".webp", ".pdf"]);
const MAX_BYTES = 25 * 1024 * 1024;

// A submission may be a file upload, a note, or just "I attempted this" —
// any of the three counts (SPEC §6). Unique per (student, module).
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "sign in as a student" }, { status: 401 });
  }

  const form = await request.formData();
  const moduleId = String(form.get("moduleId") ?? "");
  const note = String(form.get("note") ?? "").trim() || null;
  const file = form.get("file");

  const [module] = await db.select().from(modules).where(eq(modules.id, moduleId));
  if (!module || moduleState(module, user, new Date()) !== "open") {
    return NextResponse.json({ error: "module not found" }, { status: 404 });
  }

  let fileKey: string | null = null;
  if (file instanceof File && file.size > 0) {
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File too large (max 25MB)" }, { status: 400 });
    }
    const ext = file.name.slice(file.name.lastIndexOf(".")).toLowerCase();
    if (!FILE_EXTS.has(ext)) {
      return NextResponse.json({ error: "Photos or PDFs only" }, { status: 400 });
    }
    fileKey = `submissions/${user.id}/${module.id}${ext}`;
    await storage.put(fileKey, Buffer.from(await file.arrayBuffer()), file.type);
  }

  try {
    const [created] = await db
      .insert(submissions)
      .values({ studentId: user.id, moduleId: module.id, fileKey, note })
      .returning();
    return NextResponse.json({ submission: created });
  } catch {
    // Unique (student_id, module_id) — a second submit is blocked (SPEC §10 M4).
    return NextResponse.json(
      { error: "You already submitted an attempt for this module." },
      { status: 409 },
    );
  }
}
