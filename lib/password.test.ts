import { describe, expect, it } from "vitest";
import {
  DUMMY_HASH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
  isAcceptablePassword,
  verifyPassword,
} from "./password";

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

  it("DUMMY_HASH is a genuine scrypt hash, so unknown-username logins pay full timing", () => {
    // A well-formed scrypt value means the login action's compare for an
    // unknown username runs the full scrypt derivation, not a short-circuit.
    expect(DUMMY_HASH).toMatch(/^scrypt:[0-9a-f]{32}:[0-9a-f]{128}$/);
    expect(verifyPassword("lumen123", DUMMY_HASH)).toBe(false);
    expect(verifyPassword("dummy-timing-equalizer-not-a-real-account", DUMMY_HASH)).toBe(true);
  });

  it("min-8 rule shared by createStudent and resetStudentPassword", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(isAcceptablePassword("short7!")).toBe(false);
    expect(isAcceptablePassword("")).toBe(false);
    expect(isAcceptablePassword("lumen123")).toBe(true);
  });
});
