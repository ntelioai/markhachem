# Deployments

Two deployments share this codebase. Pick the one you're targeting.

| Target | Host | URL | Tunnel | Compose layering |
|---|---|---|---|---|
| **Demo-prod** | `ubuntu@34.239.52.194` (AWS EC2), reached via `admin@bastion.scriptr.io` | https://cms.artbound.art | `markhachem-cms` | `docker-compose.yml` + `docker-compose.demo.yml` |
| Original | wherever Rabih runs it | https://mh.ntelio.ai | `mark-hachem` | `docker-compose.yml` only |

The stack is the same in both: two containers managed by `docker compose`,
`cms` (Next.js + Payload) on the docker network and `cloudflared` fronting
it via a tunnel. State lives in `./data` (SQLite + WAL) and `./media`
(uploaded files); everything else is rebuilt from the git repo.

---

## Demo-prod (cms.artbound.art)

Lives on AWS EC2. The bind mounts point at `~/markhachem-cms/markhachem-data/{data,media}`
(sibling to the cloned repo at `~/markhachem-cms/markhachem/`) so gallery
content lives outside the working tree and `git pull` never touches it.

### Re-deploy after Rabih (or anyone) pushes to main

```bash
# from your laptop:
ssh -i ~/Downloads/bastion.pem admin@bastion.scriptr.io
# from the bastion:
ssh -i langchain.pem ubuntu@34.239.52.194
# on the EC2 host:
cd ~/markhachem-cms/markhachem/cms && ./deploy-demo.sh main
```

`deploy-demo.sh` does the full cycle: `git fetch + checkout origin/main`,
rebuilds the image (most layers cached, ~30–60s typical), tags it
`mark-hachem-cms:<sha>`, force-recreates only the `cms` container so the
cloudflared tunnel stays up across the deploy, polls `/admin` until
healthy. Variants: `./deploy-demo.sh <branch|tag|sha>` for any ref;
`./deploy-demo.sh` with no arg redeploys current HEAD.

### Rollback

```bash
./deploy-demo.sh <previous-sha>          # full re-deploy from that commit
# or, if the previous image is still tagged locally, no rebuild:
docker tag mark-hachem-cms:<prev-sha> mark-hachem-cms:latest
docker compose -f docker-compose.yml -f docker-compose.demo.yml \
  up -d --no-deps --force-recreate cms
```

`docker images mark-hachem-cms` lists tagged images for rollback. Schema
migrations are not auto-reversed — restore `~/markhachem-cms/markhachem-data/data/payload.db`
from a backup if a Payload schema change went wrong.

### Logs / debug

All compose commands on the demo host need both compose files:

```bash
DC='docker compose -f docker-compose.yml -f docker-compose.demo.yml'
$DC ps
$DC logs -f cms
$DC logs --tail=200 cloudflared
```

### `cms/.env` shape on the demo host

```
DATABASE_URI=file:./payload.db
PAYLOAD_SECRET=<openssl rand -base64 48>
NEXT_PUBLIC_SITE_URL=https://cms.artbound.art
DATA_ROOT=../../markhachem-data/data
MEDIA_ROOT=../../markhachem-data/media
```

The two `*_ROOT` paths are resolved relative to `cms/`, i.e. they point
at `~/markhachem-cms/markhachem-data/{data,media}`.

### One-time host setup

If you ever need to bring up the demo on a fresh EC2 (or any other) host,
follow the **"Deploying to a new host"** walkthrough below — it's the
generic version. Demo-specific deltas:
- Tunnel name is `markhachem-cms` (UUID `31cef4b4-cce3-4e56-90f3-b432f1a4c82b`); credentials file `~/.cloudflared/markhachem-cms.json`.
- Hostname is `cms.artbound.art` (CNAME → `<tunnel-id>.cfargotunnel.com`).
- `cms/.env` includes `DATA_ROOT` / `MEDIA_ROOT` as above.
- Run `docker compose -f docker-compose.yml -f docker-compose.demo.yml up -d --build` instead of plain `docker compose up`.

---

# Deploying to a new host

End-to-end instructions for standing up the CMS on a fresh server. Assumes
there's an existing host running the same stack from which to copy the SQLite
database and uploaded media.

State lives in two host-mounted volumes: `./data` (SQLite + journal/WAL) and
`./media` (uploaded files). Everything else is rebuilt from the git repo.

---

## Prerequisites on the new host

- Linux host with shell access (root or a sudoer)
- Docker Engine + Compose v2 plugin
- Git
- `rsync` and `ssh` (for copying data from the old host)

Verify:

```bash
docker --version
docker compose version
git --version
rsync --version
```

---

## 1. Clone the repo

The CMS lives in the `cms/` subfolder of the main gallery repo. Clone the
repo and `cd` into `cms/` — that's the project root for everything below.

```bash
git clone https://github.com/ntelioai/markhachem.git
cd markhachem/cms
chmod +x deploy.sh cms.sh cloudflared/tunnel.sh
```

From here on, all commands run from `markhachem/cms` unless noted otherwise.

---

## 2. Create `.env`

Copy the example and fill in the secret:

```bash
cp .env.example .env
```

Generate a secret:

```bash
openssl rand -base64 48
```

Edit `.env` and set:

```
PAYLOAD_SECRET=<paste the generated secret>
NEXT_PUBLIC_SITE_URL=https://mh.ntelio.ai
```

Leave `DATABASE_URI` as-is — `docker-compose.yml` overrides it at runtime so
the DB lives on the mounted `./data` volume.

> Use the **same** `PAYLOAD_SECRET` as the old host if you want existing admin
> sessions and password-reset tokens to keep working. If you don't care, a new
> secret is fine — admins will just need to log in again.

---

## 3. Set up the Cloudflare tunnel credential

The compose file mounts `~/.cloudflared/mark-hachem.json` into the
`cloudflared` container. The simplest path is to reuse the existing tunnel
named `mark-hachem` — its DNS record (`mh.ntelio.ai`) already points to it,
and a Cloudflare tunnel can only run from one host at a time, so traffic will
shift cleanly when the new host comes up.

On the new host:

```bash
mkdir -p ~/.cloudflared
```

From your local machine (or the old host), copy the credential file over:

```bash
scp ~/.cloudflared/mark-hachem.json <user>@<new-host>:~/.cloudflared/
```

Verify on the new host:

```bash
ls -l ~/.cloudflared/mark-hachem.json
```

> If you'd rather have a separate tunnel (e.g. for a staging host that
> coexists with prod): run `cloudflared tunnel login`, then
> `cloudflared tunnel create <new-name>`, then
> `cloudflared tunnel route dns <new-name> <new-hostname>`, and finally edit
> `cloudflared/config.docker.yml` to use the new tunnel name and hostname.

---

## 4. Copy `data/` and `media/` from the old host

The new host needs the existing SQLite database and uploaded files, otherwise
it boots empty (no admin user, no artists, no exhibitions, no images).

**On the old host**, stop the cms container so SQLite isn't being written
during the copy:

```bash
cd /path/to/markhachem/cms
docker compose stop cms
```

Cloudflared can keep running — it'll just 502 until the new host takes over.

**From your local machine** (or directly between the hosts if they can ssh to
each other), copy both directories:

```bash
# Pattern: rsync -avz --delete <src> <dst>
rsync -avz --delete <user>@<old-host>:/path/to/markhachem/cms/data/  <user>@<new-host>:/path/to/markhachem/cms/data/
rsync -avz --delete <user>@<old-host>:/path/to/markhachem/cms/media/ <user>@<new-host>:/path/to/markhachem/cms/media/
```

If you can't ssh host-to-host, do it in two hops via your laptop:

```bash
# Pull from old → laptop
rsync -avz <user>@<old-host>:/path/to/markhachem/cms/data/  ./data/
rsync -avz <user>@<old-host>:/path/to/markhachem/cms/media/ ./media/
# Push laptop → new
rsync -avz ./data/  <user>@<new-host>:/path/to/markhachem/cms/data/
rsync -avz ./media/ <user>@<new-host>:/path/to/markhachem/cms/media/
```

**On the new host**, verify:

```bash
ls -lh data/    # should contain payload.db (and possibly payload.db-shm/-wal)
ls media/ | head
```

---

## 5. Deploy

On the new host:

```bash
./deploy.sh main
```

This will:

1. `git fetch` and check out `origin/main`
2. Build the docker image (multi-stage Next.js build — takes a few minutes the first time)
3. Tag the image with the short git SHA for rollback
4. Start `cms` and `cloudflared`
5. Poll `http://localhost:3000/admin` inside the container until it responds (up to 2 minutes)

When it prints `✓ Deployed ...`, traffic should already be flowing through the
tunnel to the new host. Cloudflare will detect the old tunnel as offline and
route to the new connection automatically.

---

## 6. Verify

```bash
docker compose ps
```

Both containers should show `Up`, and `cms` should show `(healthy)` after
~90s. If `cms` shows `(unhealthy)`, check logs:

```bash
docker compose logs --tail=100 cms
```

End-to-end check:

```bash
curl -I https://mh.ntelio.ai/
curl -I https://mh.ntelio.ai/admin
```

Both should return `200` (or `307`/`308` redirects). Open the site in a
browser and log into `/admin` to confirm content is intact.

**Once verified, on the old host:**

```bash
cd /path/to/markhachem/cms
docker compose down    # stop both containers permanently
```

The old host is now retired. Keep it powered on for a few days as a fallback
until you're confident in the new one.

---

## Updates

Day-to-day deploys after the initial migration:

```bash
./deploy.sh main           # latest from main
./deploy.sh v1.2.3         # specific tag
./deploy.sh feature/foo    # branch
./deploy.sh abc1234        # specific commit
```

Each successful build is tagged as `mark-hachem-cms:<sha>` locally for
rollback.

---

## Rollback

Deploy an older ref:

```bash
./deploy.sh <previous-sha-or-tag>
```

Or, if the previous image is still tagged locally and you just want to swap
back without a rebuild:

```bash
docker tag mark-hachem-cms:<previous-sha> mark-hachem-cms:latest
docker compose up -d --no-deps --force-recreate cms
```

List previously-built images:

```bash
docker images mark-hachem-cms
```

> Schema rollbacks are **not** automatic. If a deploy ran a Payload schema
> migration (added/removed columns), rolling the code back may leave the DB
> ahead of the new (older) schema. Restore `data/` from a backup taken before
> the bad deploy.

---

## Backups

The only stateful directories are `./data/` and `./media/`. Back both up
together — the DB references media files by name, so they need to stay in
sync.

Simple nightly snapshot, e.g. via cron:

```bash
# /etc/cron.d/mark-hachem-backup
0 3 * * * root /path/to/markhachem/cms/scripts/backup.sh
```

Suggested backup script (write yourself, not in the repo):

```bash
#!/usr/bin/env bash
set -euo pipefail
cd /path/to/markhachem/cms

STAMP=$(date +%Y-%m-%d_%H%M)
DEST=/var/backups/mark-hachem
mkdir -p "$DEST"

# SQLite consistent snapshot (works with WAL, no need to stop the container)
docker exec mark-hachem-cms sh -c \
  "sqlite3 /app/data/payload.db \".backup '/app/data/backup-$STAMP.db'\""
mv data/backup-$STAMP.db "$DEST/"

# Media — content-addressable enough that rsync incremental is cheap
rsync -a --delete media/ "$DEST/media/"

# Retain 14 days of DB snapshots
find "$DEST" -name 'backup-*.db' -mtime +14 -delete
```

---

## Logs and debugging

```bash
docker compose logs -f cms              # follow cms logs
docker compose logs -f cloudflared      # follow tunnel logs
docker compose logs --tail=200 cms      # last 200 lines

docker compose ps                       # status + health
docker exec -it mark-hachem-cms sh      # shell into the container
```

Common issues:

- **`cms` keeps restarting / health check failing**: check `docker compose
  logs cms`. Most often `PAYLOAD_SECRET` missing or `DATABASE_URI` pointing
  to a path the container can't write to.
- **`cloudflared` healthy but site returns 502**: cms is unhealthy or still
  booting. Wait, then check cms logs.
- **Media broken (admin works, but `/api/media/file/...` 404s)**: `./media/`
  on the new host is empty or missing files. Re-run the rsync.
- **Admin login rejects valid password**: `PAYLOAD_SECRET` differs from the
  host that issued the password reset / created the user. Either set the
  matching secret or trigger a password reset.
