"use server";

import { redirect } from "next/navigation";
import { destroySession } from "./auth";

export async function signOut() {
  await destroySession();
  redirect("/login");
}
