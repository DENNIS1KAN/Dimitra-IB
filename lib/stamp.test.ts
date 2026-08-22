import { PDFDocument, StandardFonts } from "pdf-lib";
import { describe, expect, it } from "vitest";
import type { User } from "@/db/schema";
import { stampPdf } from "./stamp";

const student = (name: string): User =>
  ({
    id: "00000000-0000-0000-0000-000000000001",
    role: "student",
    name,
    email: "student@example.com",
    active: true,
    createdAt: new Date(),
  }) as User;

async function makePdf(): Promise<Buffer> {
  const doc = await PDFDocument.create();
  const font = await doc.embedFont(StandardFonts.Helvetica);
  doc.addPage([595, 842]).drawText("Exercises", { x: 48, y: 780, size: 16, font });
  return Buffer.from(await doc.save());
}

describe("stampPdf", () => {
  it("stamps a Greek student name (WinAnsi fonts cannot encode it)", async () => {
    const input = await makePdf();
    const out = await stampPdf(input, student("Δημήτρης Καραμανλής"));
    expect(out).not.toBe(input); // the fail-open catch returns the input as-is
    const reparsed = await PDFDocument.load(out);
    expect(reparsed.getPageCount()).toBe(1);
    expect(out.length).toBeGreaterThan(input.length);
  });

  it('renders "Νίκος Καρράς" via the bundled Unicode font, not a silent fallback', async () => {
    const input = await makePdf();
    const out = await stampPdf(input, student("Νίκος Καρράς"));
    // Fail-open would hand back the identical input; a WinAnsi fallback
    // would have thrown into that path. A real stamp differs and reparses.
    expect(out).not.toBe(input);
    expect(out.equals(input)).toBe(false);
    const reparsed = await PDFDocument.load(out);
    expect(reparsed.getPageCount()).toBe(1);
    // The Unicode font is genuinely embedded: re-save without object
    // streams (they compress dictionaries) and the /BaseFont names the
    // NotoSans subset — absent from the Helvetica-only input.
    const flat = Buffer.from(await reparsed.save({ useObjectStreams: false })).toString("latin1");
    expect(flat).toContain("NotoSans");
    expect(input.toString("latin1")).not.toContain("NotoSans");
  });

  it("stamps a Latin name too", async () => {
    const input = await makePdf();
    const out = await stampPdf(input, student("Nikos Karras"));
    expect(out).not.toBe(input);
    expect((await PDFDocument.load(out)).getPageCount()).toBe(1);
  });

  it("returns the original bytes untouched for non-PDF input", async () => {
    const garbage = Buffer.from("not a pdf at all");
    expect(await stampPdf(garbage, student("Nikos Karras"))).toBe(garbage);
  });
});
