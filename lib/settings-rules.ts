// Settings rules (SPEC §15.3): booking_url must be an absolute http(s) URL
// (or empty — no link yet); clinic_text is trimmed and bounded. Pure, so
// the admin form and the tests share one definition; the server enforces.

export const MAX_CLINIC_TEXT = 2000;

export function validateBookingUrl(
  raw: unknown,
): { ok: true; url: string } | { ok: false; reason: "invalid-url" } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { ok: true, url: "" };
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return { ok: false, reason: "invalid-url" };
  }
  // Only web links: a javascript:/data: value would become a live target=_blank href.
  if ((parsed.protocol !== "https:" && parsed.protocol !== "http:") || !parsed.hostname) {
    return { ok: false, reason: "invalid-url" };
  }
  return { ok: true, url: value };
}

export function validateClinicText(
  raw: unknown,
): { ok: true; text: string } | { ok: false; reason: "too-long" } {
  const text = typeof raw === "string" ? raw.trim() : "";
  if (text.length > MAX_CLINIC_TEXT) return { ok: false, reason: "too-long" };
  return { ok: true, text };
}
