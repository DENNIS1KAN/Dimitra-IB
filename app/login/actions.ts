"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createMagicLink, deliverMagicLink } from "@/lib/auth";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      const link = await createMagicLink(user.id, "login");
      await deliverMagicLink(user.email, link);
    }
    // Same response either way — no account enumeration.
  }
  redirect("/login?sent=1");
}
