// Boots the database for dev — runs automatically before `npm run dev`
// (predev) and behind `npm run db:migrate` / `npm run db:seed`.
//
//   DATABASE_URL unset → embedded Postgres (PGlite) in ./pgdata-lite:
//                        migrate, then seed if the database is empty.
//   DATABASE_URL set   → real Postgres: migrate; seed only if empty
//                        (never wipes data on its own).
//
// Flags: --migrate-only (skip seeding) · --seed (force a full reseed)

// Env loading: @next/env is the loader Next itself uses, so this script and
// the app read the same files with the same precedence (.env.development.local,
// .env.local, .env.development, .env; existing process.env always wins) and
// load errors are reported instead of swallowed. It must run before db/index
// or lib/tz evaluate — both read env at module scope — which is why those are
// `await import`ed inside main() below. Static imports hoist above any
// statement; keep them dynamic.
import { loadEnvConfig } from "@next/env";
loadEnvConfig(process.cwd(), process.env.NODE_ENV !== "production");

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
