#!/usr/bin/env bash
# Deploy a branch, tag, or commit from origin to this host.
#
# Usage:
#   ./deploy.sh                  # rebuild + restart at current HEAD (no checkout)
#   ./deploy.sh main             # deploy origin/main tip
#   ./deploy.sh v1.2.3           # deploy tag v1.2.3
#   ./deploy.sh feature/foo      # deploy origin/feature/foo
#   ./deploy.sh abc1234          # deploy specific commit
#
# Rollback: just deploy an older ref (./deploy.sh <previous-sha>).
# Tagged images are kept around as mark-hachem-cms:<sha> for fast manual rollback.

set -euo pipefail

REF="${1:-}"
cd "$(dirname "$0")"

log() { printf '\033[1;36m→\033[0m %s\n' "$*"; }
ok()  { printf '\033[1;32m✓\033[0m %s\n' "$*"; }
err() { printf '\033[1;31m✖\033[0m %s\n' "$*" >&2; }

# 1. Fetch all refs from origin (branches, tags, prune deleted)
log "Fetching from origin..."
git fetch --all --prune --tags --quiet

# 2. Checkout the requested ref (if provided)
if [ -n "$REF" ]; then
  if git rev-parse --verify --quiet "refs/tags/$REF" >/dev/null; then
    log "Checking out tag $REF"
    git checkout --detach --quiet "refs/tags/$REF"
  elif git rev-parse --verify --quiet "refs/remotes/origin/$REF" >/dev/null; then
    log "Checking out branch origin/$REF"
    git checkout --detach --quiet "refs/remotes/origin/$REF"
  elif git rev-parse --verify --quiet "$REF" >/dev/null; then
    log "Checking out commit $REF"
    git checkout --detach --quiet "$REF"
  else
    err "ref not found: $REF"
    exit 1
  fi
fi

SHA="$(git rev-parse --short HEAD)"
DESC="$(git describe --tags --always --dirty)"
log "Deploying $DESC ($SHA)"

# 3. Build the image. --pull keeps the base image fresh.
log "Building image (this can take several minutes)..."
docker compose build --pull cms

# 4. Tag the resulting image with the SHA for rollback inventory
docker tag mark-hachem-cms:latest "mark-hachem-cms:$SHA"
log "Tagged image as mark-hachem-cms:$SHA"

# 5. Recreate the cms container (cloudflared keeps running, no tunnel flap)
log "Restarting cms service..."
docker compose up -d --no-deps --force-recreate cms
docker compose up -d cloudflared   # idempotent — only starts if not running

# 6. Health check — poll /admin until it responds (up to 2 min)
log "Waiting for CMS to respond on /admin..."
for i in $(seq 1 60); do
  if docker exec mark-hachem-cms wget -q --spider http://localhost:3000/admin 2>/dev/null; then
    ok "Deployed $DESC ($SHA)"
    docker compose ps
    exit 0
  fi
  sleep 2
done

err "CMS did not respond within 120s — check logs:"
err "  docker compose logs --tail=50 cms"
exit 1
