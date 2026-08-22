"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { after } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { createMagicLink, deliverMagicLink, hasRecentLoginToken } from "@/lib/auth";

export async function requestMagicLink(formData: FormData) {
  const email = String(formData.get("email") ?? "")
    .trim()
    .toLowerCase();
  if (email) {
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (user) {
      // Token creation + delivery run after the response (next/server after),
      // so registered and unknown emails answer in the same time — the
      // response body AND its timing are uniform; no account enumeration.
      after(async () => {
        try {
          // One link per minute per account: repeat submits inside the window
          // are silently absorbed instead of bombing the student's inbox.
          if (await hasRecentLoginToken(user.id)) return;
          const link = await createMagicLink(user.id, "login");
          await deliverMagicLink(user.email, link);
        } catch (err) {
          console.error("[login] magic-link delivery failed:", err);
        }
      });
    }
  }
  redirect("/login?sent=1");
}
