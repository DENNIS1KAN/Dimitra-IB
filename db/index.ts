import { drizzle } from "drizzle-orm/postgres-js";
import postgres from "postgres";
import * as schema from "./schema";

const url =
  process.env.DATABASE_URL ??
  "postgresql://postgres:lumen_dev@localhost:5432/lumen";

// Reuse the client across HMR reloads in dev.
const globalForDb = globalThis as unknown as { __lumenSql?: ReturnType<typeof postgres> };
const sql = globalForDb.__lumenSql ?? postgres(url, { max: 10 });
if (process.env.NODE_ENV !== "production") globalForDb.__lumenSql = sql;

export const db = drizzle(sql, { schema });
export { schema };
