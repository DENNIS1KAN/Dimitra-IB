"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createSession } from "@/lib/auth";
import { hashPassword, verifyPassword } from "@/lib/password";

// Verified against a real hash even when the username is unknown, so the
// response takes the same time either way — no username enumeration.
const DUMMY_HASH = hashPassword("dummy-timing-equalizer");

export async function signIn(formData: FormData) {
  const username = String(formData.get("username") ?? "")
    .trim()
    .toLowerCase();
  const password = String(formData.get("password") ?? "");
  if (!username || !password) redirect("/login?error=credentials");

  const [user] = await db.select().from(users).where(eq(users.username, username));
  const ok = verifyPassword(password, user?.passwordHash ?? DUMMY_HASH) && !!user;
  if (!ok) redirect("/login?error=credentials");

  await createSession(user.id);
  redirect(user.role === "admin" ? "/admin" : "/app");
}
