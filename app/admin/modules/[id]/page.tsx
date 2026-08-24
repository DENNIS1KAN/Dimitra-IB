import { notFound, redirect } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { modules } from "@/db/schema";
import { requireAdmin } from "@/lib/admin";
import { isUuid } from "@/lib/validate";

// The old editor URL: looks the module up and lands on the week editor in
// its course (SPEC §15.7 #23).
export default async function LegacyModuleEditor({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin();
  const { id } = await params;
  if (!isUuid(id)) notFound();
  const [module] = await db.select().from(modules).where(eq(modules.id, id));
  if (!module) notFound();
  redirect(`/admin/courses/${module.cohortId}/weeks/${module.id}`);
}
