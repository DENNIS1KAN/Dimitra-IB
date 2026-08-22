import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings, type User } from "@/db/schema";
import { validateBookingUrl, validateClinicText } from "./settings-rules";

// Key/value admin settings (SPEC §15.3): booking_url, clinic_text. Reads
// are open to any server code (both values are shown to students); writes
// require the acting user to be an admin.

const KEYS = { bookingUrl: "booking_url", clinicText: "clinic_text" } as const;

export type Settings = { bookingUrl: string; clinicText: string };

export class SettingsAccessError extends Error {
  constructor() {
    super("settings access denied: not-admin");
    this.name = "SettingsAccessError";
  }
}

export type SettingsResult = { ok: true } | { ok: false; reason: "invalid-url" | "too-long" };

export async function getSettings(): Promise<Settings> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, [KEYS.bookingUrl, KEYS.clinicText]));
  const value = (key: string) => rows.find((r) => r.key === key)?.value ?? "";
  return { bookingUrl: value(KEYS.bookingUrl), clinicText: value(KEYS.clinicText) };
}

export async function updateSettings(actor: User, formData: FormData): Promise<SettingsResult> {
  if (actor.role !== "admin") throw new SettingsAccessError();
  const url = validateBookingUrl(formData.get("bookingUrl"));
  if (!url.ok) return url;
  const text = validateClinicText(formData.get("clinicText"));
  if (!text.ok) return text;
  const pairs: [string, string][] = [
    [KEYS.bookingUrl, url.url],
    [KEYS.clinicText, text.text],
  ];
  await db.transaction(async (tx) => {
    for (const [key, value] of pairs) {
      await tx
        .insert(settings)
        .values({ key, value })
        .onConflictDoUpdate({ target: settings.key, set: { value } });
    }
  });
  return { ok: true };
}
