#!/usr/bin/env node
// Runs the drizzle migrations against DATABASE_URL and exits. Idempotent:
// drizzle records every applied migration in __drizzle_migrations and skips
// what is already there, so the container entrypoint can run this on every
// boot (DEPLOY.md). Plain JavaScript on purpose, so the runtime image needs
// no TypeScript toolchain.
import path from "node:path";
import { fileURLToPath } from "node:url";
import postgres from "postgres";
import { drizzle } from "drizzle-orm/postgres-js";
import { migrate } from "drizzle-orm/postgres-js/migrator";

const here = path.dirname(fileURLToPath(import.meta.url));
const migrationsFolder = path.resolve(here, "../db/migrations");

const url = process.env.DATABASE_URL;
if (!url) {
  console.error("[migrate] DATABASE_URL is not set");
  process.exit(1);
}

// compose waits for the db healthcheck, but a database that has just
// accepted its first connection can still be finishing recovery. Retry a
// bounded number of times rather than crash-looping the container.
const ATTEMPTS = 10;
const PAUSE_MS = 3000;

for (let attempt = 1; attempt <= ATTEMPTS; attempt++) {
  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    await migrate(drizzle(sql), { migrationsFolder });
    await sql.end();
    console.log("[migrate] database is up to date");
    process.exit(0);
  } catch (err) {
    await sql.end().catch(() => {});
    const last = attempt === ATTEMPTS;
    console.error(`[migrate] attempt ${attempt}/${ATTEMPTS} failed: ${err.message}`);
    if (last) {
      console.error("[migrate] giving up. The app has NOT started.");
      process.exit(1);
    }
    await new Promise((r) => setTimeout(r, PAUSE_MS));
  }
}
