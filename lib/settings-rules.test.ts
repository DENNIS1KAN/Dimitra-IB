import { describe, expect, it } from "vitest";
import { MAX_CLINIC_TEXT, validateBookingUrl, validateClinicText } from "./settings-rules";

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
