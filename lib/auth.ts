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
 * service needed. Prod (M3): Resend, switched purely on RESEND_API_KEY.
 */
export async function deliverMagicLink(email: string, link: string) {
  if (process.env.RESEND_API_KEY) {
    const { sendMagicLinkEmail } = await import("./email");
    await sendMagicLinkEmail(email, link);
  } else {
    console.log(`\n[lumen] magic link for ${email}:\n${link}\n`);
  }
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
  return row?.user ?? null;
}

export { SESSION_COOKIE };
