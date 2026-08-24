# Road to Success: deployment runbook

For the person at the terminal. Every command here has been run end to end on
a laptop against the same files; what has *not* been done is renting a server
and pointing a real domain at it, which is what the first two sections are.

Read a section before you start it. Where a step can destroy something, it
says so before the command, not after.

**Contents:** [What runs](#what-runs) · [Server prep](#1-server-prep-hetzner-example) ·
[DNS](#2-dns) · [First deploy](#3-first-deploy) · [Updates](#4-updating) ·
[Backups](#5-backups) · [Restore rehearsal](#6-restore-rehearsal) ·
[When something is wrong](#7-when-something-is-wrong)

---

## What runs

Three containers on one box, defined in `docker-compose.prod.yml`:

| service | image | what it does |
|---|---|---|
| `caddy` | `caddy:2-alpine` | ports 80 and 443, gets and renews the TLS certificate on its own, proxies everything to `app` |
| `app` | built from `Dockerfile` | the Next.js server; checks its environment, migrates the database, then serves |
| `db` | `postgres:16` | Postgres, on a private network, never published |

Two things hold the data, and **both** must be backed up:

- **Postgres** (named volume `rts_dbdata`): accounts, enrolments, modules, submissions, messages.
- **`storage/`** (bind mount): every video, PDF and submitted photo.

Either one restored without the other gives you a broken platform. That is
why `scripts/backup.sh` puts them in the same archive, and why the restore
rehearsal in section 6 is only finished when a restored instance **plays a
video**.

---

## 1. Server prep (Hetzner example)

Any EU VPS works. Hetzner Cloud is the worked example because it is cheap and
in Germany.

**Size it for the video.** A 24-week course of short recordings is roughly
**15 to 30 GB**. Take a CX22 (2 vCPU, 4 GB RAM, 40 GB) as the floor, and
attach a **Hetzner Volume** for `storage/` if you want to grow disk without
rebuilding the box. RAM matters less than disk: the app streams video in
slices and never loads a file into memory.

1. Create the server: Ubuntu 24.04, location Nuremberg or Falkenstein, add
   your SSH key. Do **not** enable password login.

2. Log in as root and make a user:

   ```sh
   ssh root@YOUR_SERVER_IP
   adduser --disabled-password --gecos "" rts
   usermod -aG sudo rts
   rsync --archive --chown=rts:rts ~/.ssh /home/rts
   ```

3. Lock the front door. Edit `/etc/ssh/sshd_config` so it has
   `PermitRootLogin no` and `PasswordAuthentication no`, then
   `systemctl restart ssh`. Open only what is needed:

   ```sh
   ufw allow OpenSSH
   ufw allow 80/tcp
   ufw allow 443/tcp
   ufw --force enable
   ```

   Postgres is **not** in that list on purpose: it only ever talks to the app
   over the compose network.

4. Install Docker (the official convenience script is fine on a fresh box):

   ```sh
   curl -fsSL https://get.docker.com | sh
   usermod -aG docker rts
   ```

5. Unattended security updates, so you are not the patch process:

   ```sh
   apt install -y unattended-upgrades
   dpkg-reconfigure --priority=low unattended-upgrades
   ```

6. Log back in **as `rts`** from here on.

---

## 2. DNS

At the registrar for the domain (registered in Dimitra's name, not the
developer's):

| type | name | value |
|---|---|---|
| A | `@` or the subdomain you chose | the server's IPv4 |
| AAAA | same | the server's IPv6, if the box has one |

Wait until `dig +short your-domain` answers with your server's address
**before** the first deploy. Caddy asks Let's Encrypt for a certificate on
its first boot; if DNS is not there yet the request fails, and Let's Encrypt
rate-limits repeated failures. There is no hurry: a wrong five minutes here
costs an hour later.

---

## 3. First deploy

```sh
git clone YOUR_REPO_URL rts
cd rts
cp .env.production.example .env.production
```

Fill in `.env.production`. Four values are required and the container refuses
to start without them:

- `DATABASE_URL` — with the bundled Postgres the host is the service name,
  `db`. The user, password and database must match the `POSTGRES_*` values in
  the same file.
- `AUTH_SECRET` — generate it, do not invent it:
  ```sh
  openssl rand -base64 48
  ```
- `APP_URL` — the public origin, exactly as students will type it.
- `APP_TIMEZONE` — `Europe/Athens`. Every release day is 09:00 here and every
  date on every screen is rendered here, because the server runs UTC.

Then set `DOMAIN` (the same host as `APP_URL`, which is what Caddy asks for a
certificate for) and `POSTGRES_PASSWORD` (the same password as in
`DATABASE_URL`).

Bring it up:

```sh
docker compose -f docker-compose.prod.yml up -d --build
```

The app container, in this order: checks the environment, runs the database
migrations, starts serving. Watch it do that:

```sh
docker compose -f docker-compose.prod.yml logs -f app
```

You are looking for these three lines:

```
[boot] environment ok (APP_URL=..., APP_TIMEZONE=Europe/Athens)
[migrate] database is up to date
[boot] starting Road to Success on 0.0.0.0:3000
```

If the first line is instead `Refusing to start:` followed by a list, the
list is the whole problem. Fix `.env.production` and `up -d` again.

**Create the tutor's account.** `npm run db:seed` is dev-only and wipes every
table; it must never run here. This is how the first account exists:

```sh
printf '%s' 'a-real-password' | docker compose -f docker-compose.prod.yml \
  exec -T app node scripts/create-admin.mjs "Anglou Dimitra" dimitra dimitra@example.com
```

The password goes in on stdin, never as an argument, because arguments are
visible to every process on the box. Run the same command again later to
reset that password and clear a lockout.

**Check it.** From your laptop:

```sh
curl https://your-domain/api/health      # {"ok":true,"db":"up"}
```

Then sign in as `dimitra`, create a course, create a week, upload a video and
the three PDFs, create a student, and walk the student loop once. The full
smoke list is in LAUNCH.md; the two that catch real deployment mistakes are:

- a signed-in student can **play a video**, and seeking works (that is the
  ranged request reaching the app through Caddy);
- the same `/api/materials/{id}` URL **signed out is a 401**.

---

## 4. Updating

Nothing here is interactive, but read it once before you run it the first
time. Migrations are applied by the app container as it boots, and drizzle
skips what it has already applied, so this is safe to repeat.

```sh
cd ~/rts
./scripts/backup.sh                                    # first, always
git pull
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml logs -f app  # watch for the three boot lines
```

`up -d --build` rebuilds the image and replaces only the containers whose
configuration changed. The database volume and `storage/` are untouched:
students keep their submissions, Dimitra keeps her uploads.

Roughly 30 seconds of downtime while the new container starts. Do it outside
Monday 09:00.

**If a migration fails**, the app exits and says so; the old container is
already gone, so the site is down until you fix it. That is deliberate: a
half-migrated database serving pages is worse. Restore from the backup you
took in the first line (section 6) and work out what happened off the box.

---

## 5. Backups

`scripts/backup.sh` writes one archive holding both halves:

```
backups/rts-YYYYMMDD.tar.gz
  MANIFEST     when, from where, what git commit
  db.dump      pg_dump -Fc
  storage/     the files, mtimes intact
```

It keeps the newest **14** and deletes the rest. It takes a lock, so an
overrunning backup and the next night's run cannot collide, and the archive
only appears under its final name once it is complete.

Run it by hand once to see it work, then put it in cron. `crontab -e` as the
`rts` user:

```cron
# Road to Success: nightly backup at 03:17, log where you will find it
17 3 * * * cd /home/rts/rts && ./scripts/backup.sh >> /home/rts/backup.log 2>&1
```

03:17 rather than 03:00 because every other cron job on every other machine
in the world runs at 03:00.

**A backup on the same disk as the data is not a backup.** Copy the archives
off the box nightly too, for example to Hetzner Storage Box:

```cron
37 3 * * * rsync -az --delete /home/rts/rts/backups/ u123456@u123456.your-storagebox.de:backups/
```

Dimitra's own drive holds the original recordings. That is the third copy,
and the one that survives losing the whole provider.

---

## 6. Restore rehearsal

**Do this once before the first student signs in, and once a term after.**
An untested backup is a hope, not a backup.

`scripts/restore.sh` restores into a *separate* compose project by default,
so the rehearsal runs beside the live site without touching it:

```sh
./scripts/restore.sh backups/rts-20260824.tar.gz
```

It will:

1. print the archive's MANIFEST,
2. start a second database (`rts-restore`, its own volume),
3. **refuse** if that target already holds data, and tell you what it would
   have replaced. `--force` is the only way past that,
4. restore Postgres and `storage/`,
5. start a second app on `127.0.0.1:3100`.

Then open a tunnel from your laptop and finish the rehearsal:

```sh
ssh -L 3100:127.0.0.1:3100 rts@YOUR_SERVER_IP
```

**The rehearsal is not complete until, on http://127.0.0.1:3100, you have:**

- signed in as a real student account from the backup,
- opened a week and **played a video** (seek it: the bytes must be there),
- opened the solutions of a submitted week and **downloaded the stamped PDF**.

A database that restores while the files do not is exactly what this
exercise exists to catch, and it is invisible until someone presses play.

Tear the rehearsal down when you are satisfied:

```sh
docker compose -p rts-restore -f docker-compose.prod.yml down -v
rm -rf restore/
```

**Restoring for real**, after an actual loss, is the same script pointed at
the live project. It replaces everything in it:

```sh
docker compose -f docker-compose.prod.yml down
./scripts/restore.sh backups/rts-YYYYMMDD.tar.gz --project rts --storage ./storage --force
```

---

## 7. When something is wrong

**Where to look first**

```sh
docker compose -f docker-compose.prod.yml ps           # who is healthy
docker compose -f docker-compose.prod.yml logs -f app  # the app's own words
docker compose -f docker-compose.prod.yml logs caddy   # certificates live here
curl -s https://your-domain/api/health
```

**The site does not answer at all.** Check `ufw status` (80 and 443 open) and
`dig +short your-domain` (pointing at this box). Then read the caddy log: a
certificate it could not obtain says so plainly.

**`Refusing to start:` in the app log.** The environment is incomplete. The
listed lines are the whole problem.

**`[migrate] attempt N/10 failed`.** The app cannot reach Postgres. Check
`docker compose ps` for a healthy `db`, and that `DATABASE_URL` and the
`POSTGRES_*` values in `.env.production` agree with each other.

**Videos do not play, everything else works.** The `storage/` bind mount is
the suspect: `ls storage/modules` on the host, and check that the files are
owned by uid 1001 (the container's user). `docker compose exec app ls
/app/storage/modules` shows what the app itself can see.

**The disk filled.** `df -h`. An upload that runs out of disk fails at the
worst moment, the Friday before a Monday release. Set an alert at 80% and
grow before you need to.

**Rolling back a bad deploy.** `git log` to find the previous commit, then:

```sh
git checkout PREVIOUS_SHA
docker compose -f docker-compose.prod.yml up -d --build
```

Note that this rolls back **code, not the database**. A release that added a
migration cannot be undone this way; that is what section 6 is for.
