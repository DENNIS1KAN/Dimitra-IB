import { NextResponse, type NextRequest } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { contentTypeFor, extensionOf } from "@/lib/content-type";
import { storage } from "@/lib/storage";
import { adminSubmission } from "@/lib/submissions";

// Submission bytes: the ONLY read path, and it is admin-only (SPEC §15.5).
// Everyone else (students included, even for their own file) gets 404, so
// nothing about a submission's existence leaks.
export async function GET(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const user = await getSessionUser();
  if (!user || user.role !== "admin") return NextResponse.json({ error: "not found" }, { status: 404 });

  const { id } = await params;
  const found = await adminSubmission(user, id);
  if (!found?.submission.fileKey) return NextResponse.json({ error: "not found" }, { status: 404 });
  const key = found.submission.fileKey;

  let data: Buffer;
  try {
    data = await storage.get(key);
  } catch {
    return NextResponse.json({ error: "file missing from storage" }, { status: 404 });
  }
  const filename = `${found.student.name.replace(/[^\w\- ]+/g, "")}-week${found.module.weekNumber}${extensionOf(key)}`;
  return new NextResponse(new Uint8Array(data), {
    status: 200,
    headers: {
      "Content-Type": contentTypeFor(key),
      "Content-Length": String(data.length),
      "Content-Disposition": `inline; filename="${filename}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
