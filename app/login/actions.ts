"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { isLockedOut, nextLockoutState } from "@/lib/lockout";
import { DUMMY_HASH, verifyPassword } from "@/lib/password";

export async function signIn(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/login?error=credentials");

  const now = new Date();
  const [user] = await db.select().from(users).where(eq(users.username, username));
  const locked = user ? isLockedOut(user.lockedUntil, now) : false;
  // The scrypt verify always runs (dummy hash for unknown users, and even
  // while locked) so unknown / locked / wrong-password are indistinguishable
  // in both body and timing.
  const passwordOk = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH);
  const ok = !!user && passwordOk && !locked;

  if (!ok) {
    // Count only real password failures; a locked account neither extends
    // its lock nor accrues failures, and a correct password during the lock
    // still gets the same generic answer.
    if (user && !locked && !passwordOk) {
      await db.update(users).set(nextLockoutState(user.failedLogins, now)).where(eq(users.id, user.id));
    }
    redirect("/login?error=credentials");
  }

  if (user.failedLogins > 0 || user.lockedUntil) {
    await db.update(users).set({ failedLogins: 0, lockedUntil: null }).where(eq(users.id, user.id));
  }
  await createSession(user.id);
  redirect(user.role === "admin" ? "/admin" : "/app");
}
