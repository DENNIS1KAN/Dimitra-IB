"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeLoginToken, createSession } from "@/lib/auth";

export async function acceptInvite(formData: FormData) {
  const raw = String(formData.get("token") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  if (!name) redirect(`/invite/${raw}?error=name`);

  const token = await consumeLoginToken(raw);
  if (!token || token.purpose !== "invite") redirect("/login?error=expired");

  await db.update(users).set({ name }).where(eq(users.id, token.userId));
  await createSession(token.userId);
  redirect("/app");
}
