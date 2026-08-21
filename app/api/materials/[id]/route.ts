import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/db";
import { materials, modules } from "@/db/schema";
import { getSessionUser } from "@/lib/auth";
import { moduleState, solutionsVisible } from "@/lib/gating";
import { hasSubmissionFor, logMaterialEvent } from "@/lib/material-access";
import { storage } from "@/lib/storage";

const CONTENT_TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
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
  const [material] = await db.select().from(materials).where(eq(materials.id, id));
  if (!material) return NextResponse.json({ error: "not found" }, { status: 404 });
  const [module] = await db.select().from(modules).where(eq(modules.id, material.moduleId));
  if (!module) return NextResponse.json({ error: "not found" }, { status: 404 });

  if (user.role !== "admin") {
    // Rule 1: foreign / unreleased / paused ⇒ this material does not exist.
    if (moduleState(module, user, new Date()) !== "open") {
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

  let data: Buffer;
  try {
    data = await storage.get(material.storageKey);
  } catch {
    return NextResponse.json(
      { error: "This file is still processing — try again shortly." },
      { status: 404 },
    );
  }

  const ext = material.storageKey.slice(material.storageKey.lastIndexOf(".")).toLowerCase();
  const contentType = CONTENT_TYPES[ext] ?? "application/octet-stream";
  const wantsDownload = request.nextUrl.searchParams.get("download") === "1";

  // Stamped download for PDFs (SPEC §9): "Prepared for {name} · {email}".
  if (wantsDownload && ext === ".pdf" && user.role !== "admin") {
    const { stampPdf } = await import("@/lib/stamp");
    data = await stampPdf(data, user);
  }

  if (user.role === "student") {
    await logMaterialEvent(user.id, material.id, wantsDownload ? "download" : "view");
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Accept-Ranges": "bytes",
    "Cache-Control": "private, no-store",
  });
  if (wantsDownload) {
    const filename = `${material.title.replace(/[^\w\- ]+/g, "")}${ext}`;
    headers.set("Content-Disposition", `attachment; filename="${filename}"`);
  }

  // Minimal Range support so <video> can seek.
  const range = request.headers.get("range");
  const m = range?.match(/bytes=(\d+)-(\d*)/);
  if (m && contentType.startsWith("video/")) {
    const start = Number(m[1]);
    const end = m[2] ? Math.min(Number(m[2]), data.length - 1) : data.length - 1;
    if (start <= end && start < data.length) {
      headers.set("Content-Range", `bytes ${start}-${end}/${data.length}`);
      headers.set("Content-Length", String(end - start + 1));
      return new NextResponse(new Uint8Array(data.subarray(start, end + 1)), {
        status: 206,
        headers,
      });
    }
  }

  headers.set("Content-Length", String(data.length));
  return new NextResponse(new Uint8Array(data), { status: 200, headers });
}
