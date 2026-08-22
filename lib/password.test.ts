import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "./password";

describe("password hashing", () => {
  it("round-trips the right password and rejects the wrong one", () => {
    const stored = hashPassword("lumen123");
    expect(verifyPassword("lumen123", stored)).toBe(true);
    expect(verifyPassword("lumen124", stored)).toBe(false);
    expect(verifyPassword("", stored)).toBe(false);
  });

  it("salts per call — two hashes of the same password differ", () => {
    expect(hashPassword("same")).not.toBe(hashPassword("same"));
  });

  it("never matches unparseable stored values (the migration's 'locked' placeholder)", () => {
    expect(verifyPassword("anything", "locked")).toBe(false);
    expect(verifyPassword("anything", "")).toBe(false);
    expect(verifyPassword("anything", "scrypt:zz:zz")).toBe(false);
  });
});
