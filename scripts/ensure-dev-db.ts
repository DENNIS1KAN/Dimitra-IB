// Dev-database bootstrap.
//
//   predev (no flags)  → embedded only. DATABASE_URL unset: migrate the PGlite
//                        dir, seed if empty. DATABASE_URL set: print one line
//                        and exit 0 — predev never connects to, migrates, or
//                        seeds a real database.
//   --migrate-only     → npm run db:migrate — migrate whatever db/index
//                        selects (embedded or DATABASE_URL).
//   --seed [--force]   → npm run db:seed — wipe + reseed. Against DATABASE_URL
//                        this destroys data, so a non-empty database refuses
//                        unless --force is given (npm run db:seed -- --force).

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
const seed = process.argv.includes("--seed");
const force = process.argv.includes("--force");
const embedded = !process.env.DATABASE_URL;
const predev = !migrateOnly && !seed;

async function main() {
  if (predev && !embedded) {
    console.log(
      "[db] DATABASE_URL is set — predev leaves it alone (npm run db:migrate / db:seed to manage it)",
    );
    return; // exits 0 without ever importing db/index or connecting
  }

  const { db, getDbDriver } = await import("../db/index");
  const { runSeed } = await import("../db/seed-data");
  const driver = getDbDriver();
  console.log(
    embedded
      ? "[db] using embedded Postgres (PGlite) at ./pgdata-lite — no Docker needed"
      : "[db] using Postgres at DATABASE_URL",
  );

  const migrations = { migrationsFolder: "./db/migrations" };
  if (driver.kind === "pglite") {
    const { migrate } = await import("drizzle-orm/pglite/migrator");
    await migrate(driver.db, migrations);
  } else {
    const { migrate } = await import("drizzle-orm/postgres-js/migrator");
    await migrate(driver.db, migrations);
  }
  console.log("[db] migrations up to date");

  if (!migrateOnly) {
    // Uniform across both drivers, unlike raw execute().
    const [{ count }] = await db.select({ count: sql<number>`count(*)::int` }).from(users);
    const empty = count === 0;
    if (seed && !embedded && !empty && !force) {
      console.error(
        `[db] refusing: DATABASE_URL points at a database with ${count} users and ` +
          `--seed wipes everything.\n     Reseed it anyway with: npm run db:seed -- --force`,
      );
      process.exit(1);
    }
    if (seed || empty) {
      await runSeed(db);
    } else {
      console.log(`[db] ${count} users present — skipping seed (npm run db:seed to reseed)`);
    }
  }
  if (driver.kind === "pglite") await driver.client.close(); // flush before exit
  process.exit(0); // the postgres.js pool otherwise keeps the event loop alive
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
