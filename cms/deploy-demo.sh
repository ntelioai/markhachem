#!/usr/bin/env bash
# Deploy a branch, tag, or commit from origin to the demo-prod host
# (cms.artbound.art). Mirrors deploy.sh but layers in docker-compose.demo.yml
# so the markhachem-cms tunnel + IPv4 healthcheck are used.
#
# Usage:
#   ./deploy-demo.sh                  # rebuild + restart at current HEAD
#   ./deploy-demo.sh main             # deploy origin/main tip
#   ./deploy-demo.sh v1.2.3           # deploy tag v1.2.3
#   ./deploy-demo.sh feature/foo      # deploy origin/feature/foo
#   ./deploy-demo.sh abc1234          # deploy specific commit
#
# Rollback: ./deploy-demo.sh <previous-sha>
# Tagged images are kept as mark-hachem-cms:<sha> for fast manual rollback.

set -euo pipefail

REF="${1:-}"
cd "$(dirname "$0")"

DC=(docker compose -f docker-compose.yml -f docker-compose.demo.yml)

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
"${DC[@]}" build --pull cms

# 4. Tag the resulting image with the SHA for rollback inventory
docker tag mark-hachem-cms:latest "mark-hachem-cms:$SHA"
log "Tagged image as mark-hachem-cms:$SHA"

# 5. Recreate the cms container (cloudflared keeps running, no tunnel flap)
log "Restarting cms service..."
"${DC[@]}" up -d --no-deps --force-recreate cms
"${DC[@]}" up -d cloudflared   # idempotent — only starts if not running

# 6. Health check — poll /admin until it responds (up to 2 min).
# Uses 127.0.0.1 (not localhost) — BusyBox wget in this image resolves
# localhost to ::1 first; Next listens on IPv4 only.
log "Waiting for CMS to respond on /admin..."
for i in $(seq 1 60); do
  if docker exec mark-hachem-cms wget -q --spider http://127.0.0.1:3000/admin 2>/dev/null; then
    ok "Deployed $DESC ($SHA)"
    "${DC[@]}" ps
    exit 0
  fi
  sleep 2
done

err "CMS did not respond within 120s — check logs:"
err "  docker compose -f docker-compose.yml -f docker-compose.demo.yml logs --tail=50 cms"
exit 1
