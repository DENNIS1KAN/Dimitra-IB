import "server-only";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import type { User } from "@/db/schema";

/**
 * PDF name-stamping (SPEC §9): every downloaded PDF carries
 * "Prepared for {student name} · {email}" in the footer of each page.
 */
export async function stampPdf(data: Buffer, user: User): Promise<Buffer> {
  try {
    const doc = await PDFDocument.load(data, { ignoreEncryption: true });
    const font = await doc.embedFont(StandardFonts.Helvetica);
    const text = `Prepared for ${user.name} · ${user.email}`;
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
