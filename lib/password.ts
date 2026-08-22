// Password hashing (scrypt from node:crypto — no extra dependency).
// NOTE: no "server-only" here — the seed script imports this from plain Node.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const KEY_LEN = 64;

/** `scrypt:{salt}:{hash}` with a per-user random salt. */
export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, KEY_LEN).toString("hex");
  return `scrypt:${salt}:${hash}`;
}

/** Timing-safe verify; unparseable stored values (e.g. "locked") never match. */
export function verifyPassword(password: string, stored: string): boolean {
  const [scheme, salt, hash] = stored.split(":");
  if (scheme !== "scrypt" || !salt || !hash) return false;
  const expected = Buffer.from(hash, "hex");
  if (expected.length !== KEY_LEN) return false;
  return timingSafeEqual(scryptSync(password, salt, KEY_LEN), expected);
}
