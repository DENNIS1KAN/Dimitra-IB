import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { loadStudentAccess } from "@/lib/access";
import { getSessionUser } from "@/lib/auth";
import { moduleState, solutionsVisible } from "@/lib/gating";
import { hasSubmissionFor, logMaterialEvent } from "@/lib/material-access";
import { storage } from "@/lib/storage";
import { isUuid } from "@/lib/validate";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
  ".mov": "video/quicktime",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
};

// Serves material bytes from storage — with the gating rules enforced
// server-side, not just hidden in the UI. Direct URLs obey Rules 1 & 2.
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { id } = await params;
  if (!isUuid(id)) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [material] = await db.select().from(materials).where(eq(materials.id, id));
  if (!material) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [module] = await db.select().from(modules).where(eq(modules.id, material.moduleId));
  if (!module) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (user.role !== "admin") {
    // Rule 1: foreign / unreleased / paused ⇒ this material does not exist.
    if (moduleState(module, await loadStudentAccess(user), new Date()) !== "open") {
      return NextResponse.json({ error: "not found" }, { status: 404 });
    }
    // Rule 2: solutions stay hidden until an attempt is submitted.
    if (material.type === "solutions") {
      const submitted = await hasSubmissionFor(user.id, module.id);
      if (!solutionsVisible(submitted)) {
        return NextResponse.json(
          { error: "Submit your attempt to unlock solutions" },
          { status: 403 },
        );
      }
    }
  }

  const ext = material.storageKey.slice(material.storageKey.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  });
  if (wantsDownload) {
    const filename = `${material.title.replace(/[^\w\- ]+/g, "")}${ext}`;
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  // Range support so <video> can seek — served via storage.getRange, so a
  // seek reads only its slice instead of buffering the whole file per
  // request. (Videos log a single 'view' from the watch page instead of
  // here — otherwise every byte-range/preload request would count.)
  const range = request.headers.get("range");
  const m = range?.match(/bytes=(\d+)-(\d*)/);
  if (m && contentType.startsWith("video/")) {
    let size: number;
    try {
      size = await storage.size(material.storageKey);
    } catch {
      return NextResponse.json(
        { error: "This file is still processing — try again shortly." },
        { status: 404 },
      );
    }
    const start = Number(m[1]);
    const end = m[2] ? Math.min(Number(m[2]), size - 1) : size - 1;
    if (start > end || start >= size) {
      headers.set("Content-Range", `bytes */${size}`);
      return new NextResponse(null, { status: 416, headers });
    }
    const chunk = await storage.getRange(material.storageKey, start, end);
    headers.set("Content-Range", `bytes ${start}-${end}/${size}`);
    headers.set("Content-Length", String(chunk.length));
    return new NextResponse(new Uint8Array(chunk), { status: 206, headers });
  }

  let data: Buffer;
  try {
    data = await storage.get(material.storageKey);
  } catch {
    return NextResponse.json(
      { error: "This file is still processing — try again shortly." },
      { status: 404 },
    );
  }

  // Stamped download for PDFs (SPEC §9): "Prepared for {name} · {email}".
  if (wantsDownload && ext === ".pdf" && user.role !== "admin") {
    const { stampPdf } = await import("@/lib/stamp");
    data = await stampPdf(data, user);
  }

  if (user.role === "student" && (wantsDownload || !contentType.startsWith("video/"))) {
    await logMaterialEvent(user.id, material.id, wantsDownload ? "download" : "view");
  }

  headers.set("Content-Length", String(data.length));
  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}
