#!/usr/bin/env node
// Creates (or re-passwords) the tutor's admin account (DEPLOY.md).
//
// `npm run db:seed` is dev-only and wipes every table, so it must never run
// against production; this is how the first account exists on a fresh box:
//
//   printf '%s' 'the-password' | docker compose -f docker-compose.prod.yml \
//     exec -T app node scripts/create-admin.mjs "Anglou Dimitra" dimitra dimitra@example.com
//
// The password arrives on stdin, never in argv, because argv is visible to
// every process on the box through ps.
//
// The stored value is `scrypt:{salt}:{hash}`, exactly the format
// lib/password.ts writes and verifies. That agreement is pinned by a test
// (lib/password.test.ts, "the deploy-kit admin script"), so this file cannot
// drift into producing hashes the app will not accept.
import { randomBytes, scryptSync } from "node:crypto";
import { pathToFileURL } from "node:url";
import postgres from "postgres";

const KEY_LEN = 64;
const MIN_PASSWORD_LENGTH = 8;

export function hashPassword(password) {
  const salt = randomBytes(16).toString("hex");
  return `scrypt:${salt}:${scryptSync(password, salt, KEY_LEN).toString("hex")}`;
}

async function readStdin() {
  const chunks = [];
  for await (const chunk of process.stdin) chunks.push(chunk);
  return Buffer.concat(chunks).toString("utf8").replace(/\r?\n$/, "");
}

async function main() {
  const [name, username, email] = process.argv.slice(2);
  if (!name || !username || !email) {
    console.error('Usage: node scripts/create-admin.mjs "Full Name" username email@example.com');
    console.error("The password is read from stdin.");
    process.exit(1);
  }
  const url = process.env.DATABASE_URL;
  if (!url) {
    console.error("[admin] DATABASE_URL is not set");
    process.exit(1);
  }

  const password = await readStdin();
  if (password.length < MIN_PASSWORD_LENGTH) {
    console.error(`[admin] the password must be at least ${MIN_PASSWORD_LENGTH} characters`);
    process.exit(1);
  }

  const sql = postgres(url, { max: 1, onnotice: () => {} });
  try {
    const hash = hashPassword(password);
    const [row] = await sql`
      insert into users (role, name, username, password_hash, email, active)
      values ('admin', ${name}, ${username.toLowerCase()}, ${hash}, ${email.toLowerCase()}, true)
      on conflict (username) do update
        set password_hash = excluded.password_hash,
            name          = excluded.name,
            role          = 'admin',
            active        = true,
            failed_logins = 0,
            locked_until  = null
      returning id, username, (xmax = 0) as created
    `;
    console.log(
      row.created
        ? `[admin] created ${row.username} (${row.id})`
        : `[admin] ${row.username} already existed: password reset and account unlocked`,
    );
  } finally {
    await sql.end();
  }
}

// Importable for the test that pins the hash format; only runs as a command.
if (process.argv[1] && pathToFileURL(process.argv[1]).href === import.meta.url) {
  await main();
}
