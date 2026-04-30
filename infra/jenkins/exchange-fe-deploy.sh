#!/usr/bin/env bash
# exchange-fe-deploy.sh — runs ON the deploy host via Jenkins SSH stdin.
#
# Inputs (env vars passed via SSH command line):
#   BRANCH    — git branch to deploy (default: main)
#   GIT_SHA   — short sha for log/notification (informational)
#   ROLLBACK  — when set to 1, restore the .previous bundle, restart,
#               and exit. No git/build runs.
#
# Auto-rollback:
#   Each successful build snapshots the prior standalone bundle as
#   .next/standalone.previous/. If the post-restart health gate fails,
#   the script swaps it back, restarts, and exits non-zero.
#
# Prerequisites on the host:
#   - $REPO_DIR contains a clone of this repo, owned by the deploy user.
#   - Node 20 + npm installed.
#   - systemd unit installed: exchange-frontend.service
#     (template at infra/systemd/exchange-frontend.service).
#   - The unit ExecStart points at $REPO_DIR/.next/standalone/server.js.

set -euo pipefail

BRANCH="${BRANCH:-main}"
GIT_SHA="${GIT_SHA:-unknown}"
ROLLBACK="${ROLLBACK:-0}"

REPO_DIR="${REPO_DIR:-/srv/micro-exchange-fe}"
HEALTH_URL="${HEALTH_URL:-http://localhost:3000/}"
UNIT="exchange-frontend.service"

log() { printf '\n── %s ──\n' "$*"; }

restart_unit() {
  sudo systemctl restart "$UNIT" || {
    echo "FAIL: $UNIT failed to restart"
    sudo systemctl status --no-pager "$UNIT" | tail -20
    return 1
  }
}

health_wait() {
  # Next.js cold start = JS engine + initial render. Allow up to 30s.
  for i in $(seq 1 15); do
    if curl -fsS --max-time 3 "$HEALTH_URL" > /dev/null 2>&1; then
      log "health OK at sha=$GIT_SHA (try $i)"
      return 0
    fi
    sleep 2
  done
  return 1
}

dump_journal() {
  echo "── $UNIT (last 20 lines) ──"
  sudo journalctl -u "$UNIT" --no-pager -n 20
}

rollback_bundle() {
  log "ROLLBACK: swapping in .next/standalone.previous"
  cd "$REPO_DIR"
  if [ ! -d ".next/standalone.previous" ]; then
    echo "FAIL: no previous bundle to restore"
    return 1
  fi
  rm -rf ".next/standalone.broken" 2>/dev/null || true
  if [ -d ".next/standalone" ]; then
    mv ".next/standalone" ".next/standalone.broken"
  fi
  mv ".next/standalone.previous" ".next/standalone"
  rm -rf ".next/standalone.broken" 2>/dev/null || true
  echo "  bundle restored"
}

# ── Manual rollback path ───────────────────────────────────────────────────
if [ "$ROLLBACK" = "1" ]; then
  log "manual rollback requested"
  rollback_bundle || exit 1
  restart_unit || { dump_journal; exit 1; }
  if health_wait; then
    log "rollback OK"
    exit 0
  fi
  dump_journal
  exit 1
fi

# ── Normal deploy ──────────────────────────────────────────────────────────
log "deploy start: branch=$BRANCH sha=$GIT_SHA"

# 1. Sync code. Hard-reset to origin so any drift is wiped.
log "sync $REPO_DIR to origin/$BRANCH"
cd "$REPO_DIR"
git fetch --quiet origin "$BRANCH"
git reset --hard "origin/$BRANCH"

# 2. Install + build. `npm ci` is deterministic — bails out if package-lock
#    diverged from package.json instead of silently upgrading.
log "npm ci"
npm ci --no-audit --no-fund

# 3. Snapshot the existing standalone bundle (if any) as .previous BEFORE
#    next build overwrites .next/. Move semantics give us a fast revert
#    path without touching the on-disk bytes again.
log "snapshot prior bundle"
if [ -d ".next/standalone" ]; then
  rm -rf ".next/standalone.previous" 2>/dev/null || true
  cp -a ".next/standalone" ".next/standalone.previous"
  # Static assets must travel with the bundle — they're served from
  # .next/standalone/.next/static at runtime.
  if [ -d ".next/standalone/.next/static" ]; then
    cp -a ".next/static" ".next/standalone.previous/.next/static" 2>/dev/null || true
  fi
fi

# 4. Build standalone bundle. `output: 'standalone'` in next.config.ts
#    emits .next/standalone/server.js + minimal node_modules.
log "next build"
npm run build

# 5. Wire static assets + public/ into the standalone bundle so the
#    runtime can serve them (Next emits them next to the bundle, not in it).
log "stage static assets into standalone"
cp -a ".next/static" ".next/standalone/.next/static"
if [ -d "public" ]; then
  cp -a "public" ".next/standalone/public"
fi

# 6. Restart unit + health gate. On failure, attempt one auto-rollback.
log "restart $UNIT"
restart_unit || { dump_journal; exit 1; }

log "health check $HEALTH_URL"
if health_wait; then
  log "deploy OK at sha=$GIT_SHA"
  exit 0
fi

log "health did not turn green within 30s — attempting auto-rollback"
dump_journal
rollback_bundle || { echo "FAIL: rollback unavailable"; exit 1; }
if restart_unit && health_wait; then
  echo "FAIL: rolled back to previous bundle (production preserved)"
  exit 1
fi
echo "FAIL: rollback also failed health check — manual intervention required"
dump_journal
exit 1
