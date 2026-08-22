import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/db";
import { loginTokens, sessions, users, type User } from "@/db/schema";

const SESSION_COOKIE = "lumen_session";
const SESSION_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days
const LOGIN_TOKEN_TTL_MS = 1000 * 60 * 30; // 30 minutes

const appUrl = () => process.env.APP_URL ?? "http://localhost:3000";
const hash = (raw: string) => createHash("sha256").update(raw).digest("hex");

// ---------------------------------------------------------------------------
// Magic links

export async function createMagicLink(
  userId: string,
  purpose: "login" | "invite" = "login",
): Promise<string> {
  const raw = randomBytes(32).toString("base64url");
  await db.insert(loginTokens).values({
    token: hash(raw),
    userId,
    purpose,
    expiresAt: new Date(Date.now() + LOGIN_TOKEN_TTL_MS),
  });
  return purpose === "invite"
    ? `${appUrl()}/invite/${raw}`
    : `${appUrl()}/auth/verify?token=${raw}`;
}

/**
 * Dev mode (SPEC §9): magic links print to the server console — no email
 * service needed. Prod (M3): Resend, switched on RESEND_API_KEY — and prod
 * refuses to fall back, because "printing" there means writing live
 * session-granting URLs into the hosting platform's logs while the UI tells
 * the student their email is on its way.
 */
export async function deliverMagicLink(email: string, link: string) {
  if (process.env.RESEND_API_KEY) {
    const { sendMagicLinkEmail } = await import("./email");
    await sendMagicLinkEmail(email, link);
  } else if (process.env.NODE_ENV === "production") {
    throw new Error(
      "RESEND_API_KEY is not set. The console fallback is dev-only — " +
        "production must email magic links (see .env.example).",
    );
  } else {
    console.log(`\n[lumen] magic link for ${email}:\n${link}\n`);
  }
}

/**
 * True if the user already received a login link in the last `windowMs` —
 * the one-query rate limit that stops the login form being used to bomb a
 * student's inbox. login_tokens has no createdAt; recency derives from
 * expiresAt − TTL.
 */
export async function hasRecentLoginToken(userId: string, windowMs = 60_000): Promise<boolean> {
  const createdAfter = new Date(Date.now() - windowMs + LOGIN_TOKEN_TTL_MS);
  const [row] = await db
    .select({ token: loginTokens.token })
    .from(loginTokens)
    .where(
      and(
        eq(loginTokens.userId, userId),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, createdAfter),
      ),
    )
    .limit(1);
  return row !== undefined;
}

/** Consumes a login token (single use). Returns its row or null. */
export async function consumeLoginToken(raw: string) {
  const [row] = await db
    .update(loginTokens)
    .set({ usedAt: new Date() })
    .where(
      and(
        eq(loginTokens.token, hash(raw)),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, new Date()),
      ),
    )
    .returning();
  return row ?? null;
}

/** Peek at an invite token without consuming it (for rendering the form). */
export async function peekLoginToken(raw: string) {
  const [row] = await db
    .select()
    .from(loginTokens)
    .where(
      and(
        eq(loginTokens.token, hash(raw)),
        isNull(loginTokens.usedAt),
        gt(loginTokens.expiresAt, new Date()),
      ),
    );
  return row ?? null;
}

// ---------------------------------------------------------------------------
// Sessions

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
