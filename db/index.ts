import { drizzle as drizzlePostgres, type PostgresJsDatabase } from "drizzle-orm/postgres-js";
import { drizzle as drizzlePglite } from "drizzle-orm/pglite";
import { PGlite } from "@electric-sql/pglite";
import postgres from "postgres";
import * as schema from "./schema";

// Database selection (SPEC §9 dev mode — zero external accounts, and with
// PGlite, zero external processes):
//   DATABASE_URL set   → real Postgres (Docker locally, managed in prod).
//   DATABASE_URL unset → embedded Postgres (PGlite) persisted in ./pgdata-lite,
//                        dev only. `predev` migrates and seeds it automatically.
export type Db = PostgresJsDatabase<typeof schema>;

const globalForDb = globalThis as unknown as {
  __lumenSql?: ReturnType<typeof postgres>;
  __lumenPglite?: PGlite;
};

function createDb(): Db {
  const url = process.env.DATABASE_URL;
  if (url) {
    const sql = globalForDb.__lumenSql ?? postgres(url, { max: 10 });
    if (process.env.NODE_ENV !== "production") globalForDb.__lumenSql = sql;
    return drizzlePostgres(sql, { schema });
  }
  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL is not set. The embedded dev database is dev-only — " +
        "production needs real Postgres (see .env.example).",
    );
  }
  const pglite = globalForDb.__lumenPglite ?? new PGlite("./pgdata-lite");
  globalForDb.__lumenPglite = pglite;
  // Same Drizzle query API; typed as the postgres-js flavor so the rest of
  // the app sees one Db type.
  return drizzlePglite(pglite, { schema }) as unknown as Db;
}

export const db = createDb();
export { schema };
