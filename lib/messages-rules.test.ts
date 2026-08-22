import { describe, expect, it } from "vitest";
import { MAX_MESSAGE_LENGTH, validateMessageBody } from "./messages-rules";

describe("message body rule (SPEC §15.4: trimmed, max 4000, empty rejected)", () => {
  it("trims surrounding whitespace", () => {
    expect(validateMessageBody("  hello Dimitra \n")).toEqual({ ok: true, body: "hello Dimitra" });
  });

  it("rejects empty and whitespace-only bodies", () => {
    expect(validateMessageBody("")).toEqual({ ok: false, reason: "empty" });
    expect(validateMessageBody("   \n\t ")).toEqual({ ok: false, reason: "empty" });
  });

  it("rejects non-strings as empty", () => {
    expect(validateMessageBody(null)).toEqual({ ok: false, reason: "empty" });
    expect(validateMessageBody(undefined)).toEqual({ ok: false, reason: "empty" });
  });

  it("accepts exactly the maximum length and rejects one more", () => {
    expect(MAX_MESSAGE_LENGTH).toBe(4000);
    expect(validateMessageBody("x".repeat(4000))).toEqual({ ok: true, body: "x".repeat(4000) });
    expect(validateMessageBody("x".repeat(4001))).toEqual({ ok: false, reason: "too-long" });
  });

  it("measures length after trimming", () => {
    expect(validateMessageBody("  " + "x".repeat(4000) + "  ").ok).toBe(true);
  });
});
