import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { loadStudentAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { moduleState } from "@/lib/gating";
import { logMaterialEvent } from "@/lib/material-access";
import { isUuid } from "@/lib/validate";

// Twelve hours: longer than any lesson, short enough to reject a nonsense
// report before it becomes "N minutes left" copy.
const MAX_DURATION_SECONDS = 12 * 60 * 60;

// Video progress capture (SPEC §10 M4: every 30s). Read since M13 by
// lib/steps, which turns the saved position into done, current and Resume.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    materialId?: string;
    value?: number;
    duration?: number;
  } | null;
  const materialId = body?.materialId ?? "";
  const value = Math.max(0, Math.floor(Number(body?.value ?? 0)));
  if (!isUuid(materialId) || !Number.isFinite(value)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }
  // The player reports the video's length on loadedmetadata (SPEC §15.7
  // #27). It is a property of the file, so it is written once and then left
  // alone; a live stream reports Infinity, which fails this check.
  const reported = Number(body?.duration);
  const duration =
    Number.isFinite(reported) && reported > 0 && reported < MAX_DURATION_SECONDS
      ? Math.round(reported)
      : null;

  const [material] = await db.select().from(materials).where(eq(materials.id, materialId));
  if (!material) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [module] = await db.select().from(modules).where(eq(modules.id, material.moduleId));
  if (!module || moduleState(module, await loadStudentAccess(user), new Date()) !== "open") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  if (duration !== null && material.durationSeconds === null && material.type === "video") {
    await db.update(materials).set({ durationSeconds: duration }).where(eq(materials.id, material.id));
  }

  await logMaterialEvent(user.id, material.id, "video_progress", value);
  return NextResponse.json({ ok: true });
}
