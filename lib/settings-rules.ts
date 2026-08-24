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

// The calendars' weekly clinic marker (SPEC §15.7 #18): a weekday name (or
// empty = no clinic) plus a 24-hour HH:mm time (or empty). Monday-first, so
// the index doubles as the calendar grid's weekday index.
export const CLINIC_DAYS = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;
export type ClinicDay = (typeof CLINIC_DAYS)[number];

export function validateClinicDay(
  raw: unknown,
): { ok: true; day: "" | ClinicDay } | { ok: false; reason: "invalid-day" } {
  const value = typeof raw === "string" ? raw.trim().toLowerCase() : "";
  if (!value) return { ok: true, day: "" };
  if ((CLINIC_DAYS as readonly string[]).includes(value)) return { ok: true, day: value as ClinicDay };
  return { ok: false, reason: "invalid-day" };
}

export function validateClinicTime(
  raw: unknown,
): { ok: true; time: string } | { ok: false; reason: "invalid-time" } {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return { ok: true, time: "" };
  if (/^([01]\d|2[0-3]):[0-5]\d$/.test(value)) return { ok: true, time: value };
  return { ok: false, reason: "invalid-time" };
}
