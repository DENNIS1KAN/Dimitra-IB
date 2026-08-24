#!/usr/bin/env node
// Boot gate for a production container (DEPLOY.md). Four variables, no more:
// everything else this app once needed became a decision instead of a key
// (SPEC §15.7 #25/#26). Missing or malformed values stop the boot here, with
// the whole list at once, rather than surfacing as a 500 on someone's first
// sign-in.

const REQUIRED = [
  {
    name: "DATABASE_URL",
    hint: "postgresql://USER:PASSWORD@HOST:5432/DBNAME",
    check: (v) => (/^postgres(ql)?:\/\/.+/.test(v) ? null : "must be a postgresql:// connection string"),
  },
  {
    name: "AUTH_SECRET",
    hint: "openssl rand -base64 48",
    check: (v) => (v.length >= 32 ? null : "must be at least 32 characters of random text"),
  },
  {
    name: "APP_URL",
    hint: "https://your-domain.example",
    check: (v) => {
      let url;
      try {
        url = new URL(v);
      } catch {
        return "must be an absolute URL";
      }
      if (url.protocol !== "http:" && url.protocol !== "https:") return "must be http(s)";
      if (!url.hostname) return "must have a hostname";
      return null;
    },
  },
  {
    name: "APP_TIMEZONE",
    hint: "Europe/Athens",
    check: (v) => {
      try {
        new Intl.DateTimeFormat("en-GB", { timeZone: v });
        return null;
      } catch {
        return "must be an IANA timezone name";
      }
    },
  },
];

const problems = [];
for (const { name, hint, check } of REQUIRED) {
  const raw = process.env[name];
  if (raw === undefined || raw.trim() === "") {
    problems.push(`${name} is not set          (example: ${hint})`);
    continue;
  }
  const why = check(raw.trim());
  if (why) problems.push(`${name} ${why}          (example: ${hint})`);
}

if (problems.length > 0) {
  console.error("");
  console.error("Refusing to start: the production environment is incomplete.");
  console.error("");
  for (const p of problems) console.error(`  - ${p}`);
  console.error("");
  console.error("Copy .env.production.example to .env.production and fill it in.");
  console.error("");
  process.exit(1);
}

console.log(`[boot] environment ok (APP_URL=${process.env.APP_URL}, APP_TIMEZONE=${process.env.APP_TIMEZONE})`);
