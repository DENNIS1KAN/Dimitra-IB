import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import type { NextRequest } from "next/server";
import { db } from "@/db";
import { users } from "@/db/schema";
import { consumeLoginToken, createSession } from "@/lib/auth";

export async function GET(request: NextRequest) {
  const raw = request.nextUrl.searchParams.get("token") ?? "";
  const token = raw ? await consumeLoginToken(raw) : null;
  if (!token) redirect("/login?error=expired");

  await createSession(token.userId);
  const [user] = await db.select().from(users).where(eq(users.id, token.userId));
  redirect(user?.role === "admin" ? "/admin" : "/app");
}
