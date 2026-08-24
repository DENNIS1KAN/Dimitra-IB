import "server-only";
import { inArray } from "drizzle-orm";
import { db } from "@/db";
import { settings, type User } from "@/db/schema";
import {
  validateBookingUrl,
  validateClinicDay,
  validateClinicText,
  validateClinicTime,
} from "./settings-rules";

// Key/value admin settings (SPEC §15.3, amended §15.7 #18): booking_url,
// clinic_text (optional note), clinic_day + clinic_time (the calendars'
// weekly marker). Reads are open to any server code (all values are shown
// to students); writes require the acting user to be an admin.

const KEYS = {
  bookingUrl: "booking_url",
  clinicText: "clinic_text",
  clinicDay: "clinic_day",
  clinicTime: "clinic_time",
} as const;

export type Settings = { bookingUrl: string; clinicText: string; clinicDay: string; clinicTime: string };

export class SettingsAccessError extends Error {
  constructor() {
    super("settings access denied: not-admin");
    this.name = "SettingsAccessError";
  }
}

export type SettingsResult =
  | { ok: true }
  | { ok: false; reason: "invalid-url" | "too-long" | "invalid-day" | "invalid-time" };

export async function getSettings(): Promise<Settings> {
  const rows = await db
    .select()
    .from(settings)
    .where(inArray(settings.key, Object.values(KEYS)));
  const value = (key: string) => rows.find((r) => r.key === key)?.value ?? "";
  return {
    bookingUrl: value(KEYS.bookingUrl),
    clinicText: value(KEYS.clinicText),
    clinicDay: value(KEYS.clinicDay),
    clinicTime: value(KEYS.clinicTime),
  };
}

export async function updateSettings(actor: User, formData: FormData): Promise<SettingsResult> {
  if (actor.role !== "admin") throw new SettingsAccessError();
  const url = validateBookingUrl(formData.get("bookingUrl"));
  if (!url.ok) return url;
  const text = validateClinicText(formData.get("clinicText"));
  if (!text.ok) return text;
  const day = validateClinicDay(formData.get("clinicDay"));
  if (!day.ok) return day;
  const time = validateClinicTime(formData.get("clinicTime"));
  if (!time.ok) return time;
  const pairs: [string, string][] = [
    [KEYS.bookingUrl, url.url],
    [KEYS.clinicText, text.text],
    [KEYS.clinicDay, day.day],
    [KEYS.clinicTime, time.time],
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
