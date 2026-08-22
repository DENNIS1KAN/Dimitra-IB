import { defineConfig } from "drizzle-kit";

// Only `npm run db:generate` reads this config, and generate never connects —
// it diffs ./db/schema.ts against ./db/migrations. Runtime connections are
// db/index.ts's job. If a connecting kit command is ever added (push /
// migrate / studio), add: dbCredentials: { url: process.env.DATABASE_URL! }
export default defineConfig({
  schema: "./db/schema.ts",
  out: "./db/migrations",
  dialect: "postgresql",
});
