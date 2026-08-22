// Test seam: db/index.ts reuses globalThis.__lumenPglite when it is already
// set, so an in-memory PGlite installed here — BEFORE anything imports "@/db"
// — keeps DB-backed tests away from ./pgdata-lite and its single-process
// lock. Import this module first, then `await import()` the code under test.
import { PGlite } from "@electric-sql/pglite";
import { migrate } from "drizzle-orm/pglite/migrator";
import path from "node:path";

const g = globalThis as unknown as { __lumenPglite?: PGlite };
g.__lumenPglite = new PGlite();

export const MIGRATIONS = { migrationsFolder: path.resolve(__dirname, "../../db/migrations") };

export async function migrateTestDb() {
  const { getDbDriver } = await import("@/db");
  const driver = getDbDriver();
  if (driver.kind !== "pglite") throw new Error("test db must be the in-memory pglite");
  await migrate(driver.db, MIGRATIONS);
  return driver.db;
}
