import "server-only";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { users, type User } from "@/db/schema";
import { hashPassword, isAcceptablePassword, verifyPassword } from "./password";

// Own-password change (SPEC §15.4): current + new, min 8, the same scrypt
// path as sign-in and the admin reset. Only ever touches the ACTING user.

export type ChangePasswordResult =
  | { ok: true }
  | { ok: false; reason: "too-short" | "wrong-current" };

export async function changeOwnPassword(
  actor: User,
  formData: FormData,
): Promise<ChangePasswordResult> {
  const current = String(formData.get("current") ?? "");
  const next = String(formData.get("next") ?? "");
  if (!isAcceptablePassword(next)) return { ok: false, reason: "too-short" };
  if (!verifyPassword(current, actor.passwordHash)) return { ok: false, reason: "wrong-current" };
  await db.update(users).set({ passwordHash: hashPassword(next) }).where(eq(users.id, actor.id));
  return { ok: true };
}
