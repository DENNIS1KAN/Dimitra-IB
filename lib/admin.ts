import "server-only";
import { redirect } from "next/navigation";
import { getSessionUser } from "./auth";

/** Every admin action and page goes through this. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (user.role !== "admin") redirect("/app");
  return user;
}
