import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { moduleState } from "@/lib/gating";
import { logMaterialEvent } from "@/lib/material-access";

// Video progress capture (SPEC §10 M4: every 30s). Write-only in V1.
export async function POST(request: NextRequest) {
  const user = await getSessionUser();
  if (!user || user.role !== "student") {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const body = (await request.json().catch(() => null)) as {
    materialId?: string;
    value?: number;
  } | null;
  const materialId = body?.materialId ?? "";
  const value = Math.max(0, Math.floor(Number(body?.value ?? 0)));
  if (!materialId || !Number.isFinite(value)) {
    return NextResponse.json({ error: "bad request" }, { status: 400 });
  }

  const [material] = await db.select().from(materials).where(eq(materials.id, materialId));
  if (!material) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [module] = await db.select().from(modules).where(eq(modules.id, material.moduleId));
  if (!module || moduleState(module, user, new Date()) !== "open") {
    return NextResponse.json({ error: "not found" }, { status: 404 });
  }

  await logMaterialEvent(user.id, material.id, "video_progress", value);
  return NextResponse.json({ ok: true });
}
