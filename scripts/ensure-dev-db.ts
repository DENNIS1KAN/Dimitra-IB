// Boots the database for dev — runs automatically before `npm run dev`
// (predev) and behind `npm run db:migrate` / `npm run db:seed`.
//
//   DATABASE_URL unset → embedded Postgres (PGlite) in ./pgdata-lite:
//                        migrate, then seed if the database is empty.
//   DATABASE_URL set   → real Postgres: migrate; seed only if empty
//                        (never wipes data on its own).
//
// Flags: --migrate-only (skip seeding) · --seed (force a full reseed)

// tsx doesn't auto-load .env the way Next does — mirror it so this script
// and the app always talk to the same database.
try {
  process.loadEnvFile();
} catch {
  // no .env file — embedded dev database it is
}

import { sql } from "drizzle-orm";
import { users } from "../db/schema";

const migrateOnly = process.argv.includes("--migrate-only");
const forceSeed = process.argv.includes("--seed");
const embedded = !process.env.DATABASE_URL;

async function main() {
  // Import AFTER .env is loaded so db/index selects the right driver.
  const { db } = await import("../db/index");
  const { runSeed } = await import("../db/seed-data");
  console.log(
    embedded
      ? "[db] using embedded Postgres (PGlite) at ./pgdata-lite — no Docker needed"
      : "[db] using Postgres at DATABASE_URL",
  );

  if (embedded) {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./db/migrations" });
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    await migrate(db as any, { migrationsFolder: "./db/migrations" });
  }
  console.log("[db] migrations up to date");

  if (!migrateOnly) {
    // Uniform across both drivers, unlike raw execute().
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    if (forceSeed || Number(count) === 0) {
      await runSeed(db);
    } else {
      console.log(`[db] ${count} users present — skipping seed (npm run db:seed to reseed)`);
    }
  }
  process.exit(0);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
