// CLI wrapper: `npm run db:seed` goes through scripts/ensure-dev-db.ts,
// but this stays runnable directly (npx tsx db/seed.ts) against whichever
// database db/index selects.
try {
  process.loadEnvFile();
} catch {
  // no .env — db/index falls back to the embedded dev database
}

Promise.all([import("./index"), import("./seed-data")])
  .then(([{ db }, { runSeed }]) => runSeed(db))
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
