import { describe, expect, it } from "vitest";
import {
  CLINIC_DAYS,
  MAX_CLINIC_TEXT,
  validateBookingUrl,
  validateClinicDay,
  validateClinicText,
  validateClinicTime,
} from "./settings-rules";

describe("booking_url rule — an absolute http(s) URL or empty", () => {
  it("accepts a Google Calendar appointment-schedule URL (trimmed)", () => {
    expect(validateBookingUrl("  https://calendar.app.google/abc123  ")).toEqual({
      ok: true,
      url: "https://calendar.app.google/abc123",
    });
  });

  it("accepts empty (no booking link yet)", () => {
    expect(validateBookingUrl("")).toEqual({ ok: true, url: "" });
    expect(validateBookingUrl(null)).toEqual({ ok: true, url: "" });
  });

  it("rejects non-http schemes and scheme-less values", () => {
    expect(validateBookingUrl("javascript:alert(1)")).toEqual({ ok: false, reason: "invalid-url" });
    expect(validateBookingUrl("calendar.app.google/abc")).toEqual({ ok: false, reason: "invalid-url" });
    expect(validateBookingUrl("ftp://x.y")).toEqual({ ok: false, reason: "invalid-url" });
    expect(validateBookingUrl("https://")).toEqual({ ok: false, reason: "invalid-url" });
  });
});

describe("clinic_text rule — trimmed, bounded", () => {
  it("trims and accepts", () => {
    expect(validateClinicText("  Thursday 18:00 — bring your kinetics questions.\n")).toEqual({
      ok: true,
      text: "Thursday 18:00 — bring your kinetics questions.",
    });
  });

  it("accepts empty and the maximum, rejects one more", () => {
    expect(validateClinicText("")).toEqual({ ok: true, text: "" });
    expect(validateClinicText("x".repeat(MAX_CLINIC_TEXT)).ok).toBe(true);
    expect(validateClinicText("x".repeat(MAX_CLINIC_TEXT + 1))).toEqual({ ok: false, reason: "too-long" });
  });
});

describe("clinic_day rule: a weekday name or empty (SPEC §15.7 #18)", () => {
  it("accepts every weekday, case and space tolerant", () => {
    for (const day of CLINIC_DAYS) {
      expect(validateClinicDay(day)).toEqual({ ok: true, day });
    }
    expect(validateClinicDay(" Thursday ")).toEqual({ ok: true, day: "thursday" });
  });

  it("accepts empty (no weekly clinic)", () => {
    expect(validateClinicDay("")).toEqual({ ok: true, day: "" });
    expect(validateClinicDay(null)).toEqual({ ok: true, day: "" });
  });

  it("rejects anything else", () => {
    expect(validateClinicDay("someday")).toEqual({ ok: false, reason: "invalid-day" });
    expect(validateClinicDay("thu")).toEqual({ ok: false, reason: "invalid-day" });
  });
});

describe("clinic_time rule: 24-hour HH:mm or empty (SPEC §15.7 #18)", () => {
  it("accepts valid times and empty", () => {
    expect(validateClinicTime("18:00")).toEqual({ ok: true, time: "18:00" });
    expect(validateClinicTime("09:05")).toEqual({ ok: true, time: "09:05" });
    expect(validateClinicTime(" 23:59 ")).toEqual({ ok: true, time: "23:59" });
    expect(validateClinicTime("")).toEqual({ ok: true, time: "" });
    expect(validateClinicTime(null)).toEqual({ ok: true, time: "" });
  });

  it("rejects out-of-range and sloppy formats", () => {
    for (const bad of ["24:00", "7pm", "18:60", "9:00", "18.00"]) {
      expect(validateClinicTime(bad)).toEqual({ ok: false, reason: "invalid-time" });
    }
  });
});
