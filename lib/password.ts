// Password hashing (scrypt from node:crypto — no extra dependency).
// NOTE: no "server-only" here — the seed script imports this from plain Node.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

// The length rule lives in lib/password-rules.ts (no node deps) so the
// browser-side account form can share it; kept exported from here too.
export { MIN_PASSWORD_LENGTH, isAcceptablePassword } from "./password-rules";

/** `scrypt:{salt}:{hash}` with a per-user random salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/**
 * A real scrypt hash that no password verifies against, for login attempts
 * on unknown usernames: the full scrypt compare still runs, so response
 * timing cannot reveal whether a username exists.
 */
export const DUMMY_HASH = hashPassword("dummy-timing-equalizer-not-a-real-account");

/** Timing-safe verify; unparseable stored values (e.g. "locked") never match. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LEN) return false;
  return timingSafeEqual(scryptSync(password, salt, KEY_LEN), expected);
}
