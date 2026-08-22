import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/** Every student page and student server action goes through this. */
export async function requireStudent() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "student") redirect("/admin");
  return user;
}
