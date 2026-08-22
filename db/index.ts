import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import fs from "node:fs";
import path from "node:path";
import * as schema from "./schema";

// Database selection (SPEC §9 defaults with the preamble's licensed
// equivalence — "equivalents you prefer are fine, keep the shape"; still
// Postgres + Drizzle + the same migrations):
//   DATABASE_URL set   → real Postgres (Docker locally, managed in prod).
//   DATABASE_URL unset → embedded Postgres (PGlite) persisted in ./pgdata-lite,
//                        dev only. `predev` migrates and seeds it automatically.

// Driver-agnostic database type: everything the app calls (select/insert/
// update/delete/transaction + joins) lives on PgDatabase in pg-core.
export type Db = PgDatabase<PgQueryResultHKT, typeof schema>;

// Concrete driver, for code that must know which backend it has
// (the migrators are typed per-driver).
export type DbDriver =
  | { kind: "postgres"; db: PostgresJsDatabase<typeof schema> }
  | { kind: "pglite"; db: PgliteDatabase<typeof schema>; client: PGlite };

const PGLITE_DIR = "./pgdata-lite";

const globalForDb = globalThis as unknown as {
  __lumenSql?: ReturnType<typeof postgres>;
  __lumenPglite?: PGlite;
};

function isProcessAlive(pid: number): boolean {
  try {
    process.kill(pid, 0);
    return true;
  } catch (err) {
    // EPERM = exists but not ours → alive. ESRCH (and anything else) → gone.
    return (err as NodeJS.ErrnoException).code === "EPERM";
  }
}

// PGlite has no cross-process lock; two processes opening the same data dir
// silently corrupt it. Advisory guard: write our pid into
// pgdata-lite/.owner.pid with O_EXCL; on conflict, refuse if the recorded
// pid is alive, take over if stale. Best-effort unlink on exit — the
// liveness check is the real safety net, not the cleanup. The file lives
// inside the data dir so `rm -rf pgdata-lite` resets data and lock together
// (PGlite keys initdb solely on PG_VERSION, so a foreign dotfile is safe).
function acquirePgliteLock(dataDir: string): void {
  const pidPath = path.join(dataDir, ".owner.pid");
  fs.mkdirSync(dataDir, { recursive: true });
  for (let attempt = 0; ; attempt++) {
    try {
      fs.writeFileSync(pidPath, String(process.pid), { flag: "wx" });
      break;
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== "EEXIST" || attempt > 0) throw err;
      let pid = NaN;
      try {
        pid = Number(fs.readFileSync(pidPath, "utf8").trim());
      } catch {
        // unreadable → treat as stale
      }
      if (pid === process.pid) return; // already ours
      if (Number.isInteger(pid) && pid > 0 && isProcessAlive(pid)) {
        throw new Error(
          `${dataDir} is already open by process ${pid} — PGlite only supports one ` +
            `process. Stop \`npm run dev\` before running db:migrate/db:seed (or vice ` +
            `versa). If nothing is running, delete ${pidPath} and retry.`,
        );
      }
      fs.rmSync(pidPath, { force: true }); // stale — take over on the retry
    }
  }
  process.on("exit", () => {
    try {
      if (fs.readFileSync(pidPath, "utf8").trim() === String(process.pid)) fs.rmSync(pidPath);
    } catch {
      // best effort
    }
  });
}

function createDriver(): DbDriver {
  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = globalForDb.__lumenSql ?? postgres(url, { max: 10 });
    if (process.env.NODE_ENV !== "production") globalForDb.__lumenSql = sql;
    return { kind: "postgres", db: drizzlePostgres(sql, { schema }) };
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. The embedded dev database is dev-only — " +
        "production needs real Postgres (see .env.example).",
    );
  }
  let client = globalForDb.__lumenPglite;
  if (!client) {
    acquirePgliteLock(PGLITE_DIR); // throws before anything is cached → next use retries
    client = new PGlite(PGLITE_DIR);
    globalForDb.__lumenPglite = client;
  }
  return { kind: "pglite", db: drizzlePglite(client, { schema }), client };
}

let driver: DbDriver | undefined;
export function getDbDriver(): DbDriver {
  return (driver ??= createDriver());
}

// Lazy: `next build` with no env imports this module during page-data
// collection; nothing may connect (or throw) until first actual use.
export const db: Db = new Proxy({} as Db, {
  get(_target, prop) {
    const real = getDbDriver().db;
    const value = Reflect.get(real, prop, real) as unknown;
    return typeof value === "function"
      ? (value as (...args: unknown[]) => unknown).bind(real)
      : value;
  },
});

export { schema };
