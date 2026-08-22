import type { PgDatabase, PgQueryResultHKT } from "drizzle-orm/pg-core";
import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite, type PgliteDatabase } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
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
