import "server-only";
import fs from "node:fs";
import path from "node:path";
import fontkit from "@pdf-lib/fontkit";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { User } from "@/db/schema";
import { BRAND_NAME } from "@/lib/brand";

// Bundled OFL font with Greek + Latin coverage (assets/fonts). The
// standard-14 fonts are WinAnsi-only — they cannot encode "Δημήτρης", and
// most of this platform's students have Greek names.
const FONT_PATH = path.join(process.cwd(), "assets", "fonts", "NotoSans-Regular.ttf");
let cachedFontBytes: Buffer | null | undefined;
function fontBytes(): Buffer | null {
  if (cachedFontBytes === undefined) {
    try {
      cachedFontBytes = fs.readFileSync(FONT_PATH);
    } catch {
      cachedFontBytes = null; // fall back to Helvetica below
    }
  }
  return cachedFontBytes;
}

/**
 * PDF name-stamping (SPEC §9; §15.7 #20): every downloaded PDF carries
 * "Road to Success · Prepared for {student name} · {email}" in the footer
 * of each page.
 */
export async function stampPdf(data: Buffer, user: User): Promise<Buffer> {
  try {
    const doc = await PDFDocument.load(data, { ignoreEncryption: true });
    // Encrypted PDFs "load" fine but re-save corrupted (broken xref) — hand
    // them back unstamped rather than corrupt the student's download.
    if (doc.isEncrypted) return data;
    const bytes = fontBytes();
    let font;
    if (bytes) {
      doc.registerFontkit(fontkit);
      font = await doc.embedFont(bytes, { subset: true });
    } else {
      font = await doc.embedFont(StandardFonts.Helvetica); // WinAnsi-only fallback
    }
    const text = `${BRAND_NAME} · Prepared for ${user.name} · ${user.email}`;
    const size = 8;
    for (const page of doc.getPages()) {
      const { width } = page.getSize();
      const textWidth = font.widthOfTextAtSize(text, size);
      page.drawText(text, {
        x: Math.max(24, (width - textWidth) / 2),
        y: 16,
        size,
        font,
        color: rgb(0.39, 0.38, 0.36), // graphite
        opacity: 0.85,
      });
    }
    return Buffer.from(await doc.save());
  } catch {
    // Never block a download on stamping problems.
    return data;
  }
}
