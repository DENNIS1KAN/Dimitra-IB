import { describe, expect, it } from "vitest";
import {
  DUMMY_HASH,
  MIN_PASSWORD_LENGTH,
  hashPassword,
  isAcceptablePassword,
  verifyPassword,
} from "./password";

// The deploy kit's admin bootstrap (scripts/create-admin.mjs) writes password
// hashes without importing this module: the production image carries no
// TypeScript. This test is what stops the two from drifting apart, which
// would show up as "the password Dimitra just set does not work".
describe("the deploy-kit admin script", () => {
  it("produces hashes this module verifies", async () => {
    const { hashPassword: fromScript } = (await import("../scripts/create-admin.mjs")) as {
      hashPassword: (p: string) => string;
    };
    const stored = fromScript("a-real-password");
    expect(stored.startsWith("scrypt:")).toBe(true);
    expect(verifyPassword("a-real-password", stored)).toBe(true);
    expect(verifyPassword("a-real-passwore", stored)).toBe(false);
  });

  it("accepts hashes this module produced, so a reset is not a lock-out", () => {
    // Same format both directions: the script's ON CONFLICT overwrite has to
    // land on something login can still read.
    const stored = hashPassword("another-password");
    const [scheme, salt, hash] = stored.split(":");
    expect(scheme).toBe("scrypt");
    expect(salt).toHaveLength(32);
    expect(hash).toHaveLength(128);
  });
});

describe("password hashing", () => {
  it("round-trips the right password and rejects the wrong one", () => {
    const stored = hashPassword("success123");
    expect(verifyPassword("success123", stored)).toBe(true);
    expect(verifyPassword("success124", stored)).toBe(false);
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
    expect(verifyPassword("success123", DUMMY_HASH)).toBe(false);
    expect(verifyPassword("dummy-timing-equalizer-not-a-real-account", DUMMY_HASH)).toBe(true);
  });

  it("min-8 rule shared by createStudent and resetStudentPassword", () => {
    expect(MIN_PASSWORD_LENGTH).toBe(8);
    expect(isAcceptablePassword("short7!")).toBe(false);
    expect(isAcceptablePassword("")).toBe(false);
    expect(isAcceptablePassword("success123")).toBe(true);
  });
});
