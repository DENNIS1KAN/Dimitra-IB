import { z } from "zod";

// Route params and form ids feed uuid-typed columns; Postgres raises 22P02
// ("invalid input syntax for type uuid") on anything else, which surfaces as
// a 500 instead of the intended 404. Shape-checked at the door, so handlers
// can answer 404/400 cleanly.
const uuidSchema = z.uuid();

export const isUuid = (value: string): boolean => uuidSchema.safeParse(value).success;

/**
 * An absolute http(s) URL with a hostname, trimmed; null for anything else.
 * One definition for every pasted link the admin can save (settings'
 * booking_url, a week's video link): a `javascript:` or `data:` value must
 * never reach an href or an iframe src.
 */
export function httpUrlOrNull(raw: unknown): string | null {
  const value = typeof raw === "string" ? raw.trim() : "";
  if (!value) return null;
  let parsed: URL;
  try {
    parsed = new URL(value);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!parsed.hostname) return null;
  return value;
}
