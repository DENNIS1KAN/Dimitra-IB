"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeLoginToken, createSession } from "@/lib/auth";

export async function completeSignIn(formData: FormData) {
  const raw = String(formData.get("token") ?? "");
  const token = raw ? await consumeLoginToken(raw) : null;
  // Invite tokens have their own flow (/invite/[token]) that also sets the
  // student's name — they don't open sessions here.
  if (!token || token.purpose !== "login") redirect("/login?error=expired");

  await createSession(token.userId);
  const [user] = await db.select().from(users).where(eq(users.id, token.userId));
  redirect(user?.role === "admin" ? "/admin" : "/app");
}
