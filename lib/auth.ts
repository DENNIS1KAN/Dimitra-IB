import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt } from "drizzle-orm";
import { db } from "@/db";
import { sessions, users, type User } from "@/db/schema";

const SESSION_COOKIE = "lumen_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

// ---------------------------------------------------------------------------
// Sessions — username/password sign-in lives in app/login/actions.ts
// (lib/password.ts verifies the scrypt hash); this module owns the session
// lifecycle. Only SHA-256 hashes of session tokens are stored.

export async function createSession(userId: string) {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS);
  await db.insert(sessions).values({ token: hash(raw), userId, expiresAt });
  await db.update(users).set({ lastSeenAt: new Date() }).where(eq(users.id, userId));
  const jar = await cookies();
  jar.set(SESSION_COOKIE, raw, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    expires: expiresAt,
    path: "/",
  });
}

export async function destroySession() {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (raw) await db.delete(sessions).where(eq(sessions.token, hash(raw)));
  jar.delete(SESSION_COOKIE);
}

/** The logged-in user, or null. */
export async function getSessionUser(): Promise<User | null> {
  const jar = await cookies();
  const raw = jar.get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [row] = await db
    .select({ user: users })
    .from(sessions)
    .innerJoin(users, eq(users.id, sessions.userId))
    .where(and(eq(sessions.token, hash(raw)), gt(sessions.expiresAt, new Date())));
  const user = row?.user ?? null;
  // Refresh "last seen" when it's gone stale — throttled so this isn't a
  // write per request, and best-effort so it can never fail a page load.
  if (user && Date.now() - (user.lastSeenAt?.getTime() ?? 0) > 15 * 60 * 1000) {
    user.lastSeenAt = new Date();
    await db
      .update(users)
      .set({ lastSeenAt: user.lastSeenAt })
      .where(eq(users.id, user.id))
      .catch(() => {});
  }
  return user;
}

export { SESSION_COOKIE };
