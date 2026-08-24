import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { loadStudentAccess } from "@/lib/access";
import { contentTypeFor, extensionOf } from "@/lib/content-type";
import { getSessionUser } from "@/lib/auth";
import { moduleState, solutionsVisible } from "@/lib/gating";
import { parseRangeHeader, unsatisfiableContentRange } from "@/lib/range";
import { hasSubmissionFor, logMaterialEvent } from "@/lib/material-access";
import { storage } from "@/lib/storage";
import { isUuid } from "@/lib/validate";


// Serves material bytes from storage, with the gating rules enforced
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

  // A link video (SPEC §15.7 #25) has no bytes here: it plays on its own
  // service, and the student page links straight to it.
  const storageKey = material.storageKey;
  if (!storageKey) return NextResponse.json({ error: "not found" }, { status: 404 });

  const ext = extensionOf(storageKey);
  const contentType = contentTypeFor(storageKey);
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";
  // Only video is served in slices. PDFs go out whole (and a stamped download
  // is generated per request, so its bytes are not the stored bytes at all),
  // so claiming range support for them would be a lie a PDF viewer acts on.
  const rangeable = contentType.startsWith("video/") && !wantsDownload;

  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": rangeable ? "bytes" : "none",
    "Cache-Control": "private, no-store",
  });
  if (wantsDownload) {
    const filename = `${material.title.replace(/[^\w\- ]+/g, "")}${ext}`;
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  // Range support so <video> can seek. storage.getRange streams the slice from
  // a file offset, so a seek into a 2 GB recording costs one small buffer
  // rather than the whole file. Malformed and unsatisfiable ranges both get
  // 416 with the real size, so the player's next attempt can be correct.
  // (Videos log a single 'view' from the watch page instead of here,
  // otherwise every byte-range/preload request would count.)
  const rangeHeader = request.headers.get("range");
  if (rangeable && rangeHeader !== null) {
    let size: number;
    try {
      size = await storage.size(storageKey);
    } catch {
      return NextResponse.json(
        { error: "This file is still processing. Try again shortly." },
        { status: 404 },
      );
    }
    const range = parseRangeHeader(rangeHeader, size);
    if (range.kind === "unsatisfiable") {
      headers.set("Content-Range", unsatisfiableContentRange(size));
      return new NextResponse(null, { status: 416, headers });
    }
    if (range.kind === "slice") {
      const body = await storage.getRange(storageKey, range.start, range.end);
      headers.set("Content-Range", `bytes ${range.start}-${range.end}/${size}`);
      headers.set("Content-Length", String(range.end - range.start + 1));
      return new NextResponse(body, { status: 206, headers });
    }
  }

  let data: Buffer;
  try {
    data = await storage.get(storageKey);
  } catch {
    return NextResponse.json(
      { error: "This file is still processing. Try again shortly." },
      { status: 404 },
    );
  }

  // Stamped download for PDFs (SPEC §9): the brand stamp line from lib/stamp.
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
