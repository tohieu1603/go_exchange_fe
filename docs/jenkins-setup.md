# Jenkins + SSH deploy setup (Frontend)

[Jenkinsfile](../Jenkinsfile) drives a 4-stage pipeline:
1. **Install** — `npm ci` (deterministic, fails on `package-lock.json` drift).
2. **Lint + type-check** — `eslint` + `tsc --noEmit` in parallel.
3. **Build (Next.js)** — `next build` validates the output: `standalone` bundle.
4. **Deploy to server** — on `main`, SSH into `$DEPLOY_HOST` and run [`infra/jenkins/exchange-fe-deploy.sh`](../infra/jenkins/exchange-fe-deploy.sh) (streamed via SSH stdin).

Backend has its own pipeline in [`tohieu1603/go-exchange`](https://github.com/tohieu1603/go-exchange).

## How deploy actually works

```
Jenkins agent                            Deploy host (100.112.117.30)
─────────────                            ──────────────────────────────
ssh -i $KEY oceanroot@host \
  "BRANCH=main GIT_SHA=abc bash -s" \
  < infra/jenkins/exchange-fe-deploy.sh ─►  bash reads script from stdin
                                            ├─ git fetch + reset --hard origin/main
                                            ├─ npm ci
                                            ├─ snapshot prior bundle as
                                            │  .next/standalone.previous
                                            ├─ next build (output: standalone)
                                            ├─ stage .next/static + public/
                                            │  into the standalone tree
                                            ├─ sudo systemctl restart
                                            │  exchange-frontend.service
                                            └─ curl / (15× 2s retry)
```

**No Docker on the host** — Next.js standalone runs as a native node process under systemd.

## One-time host setup

Assumes the backend host setup is already done (deploy user `oceanroot`, sudoers entry, SSH key in `authorized_keys`). FE adds:

### 1. Node 20 + repo

```bash
# Node 20 LTS (matches Dockerfile base + Jenkinsfile agent expectation)
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

# Clone the FE repo to a stable path
sudo mkdir -p /srv && sudo chown oceanroot /srv
sudo -u oceanroot git clone https://github.com/tohieu1603/go_exchange_fe /srv/micro-exchange-fe
```

### 2. Env file

```bash
sudo mkdir -p /etc/exchange
sudo tee /etc/exchange/frontend.env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
# Public API base — ASE-side env, baked into the bundle at build time
# via Next's NEXT_PUBLIC_* convention if you use it.
NEXT_PUBLIC_API_URL=https://api.your-domain.com
EOF
sudo chown oceanroot:oceanroot /etc/exchange/frontend.env
sudo chmod 640 /etc/exchange/frontend.env
```

### 3. Sudoers entry for the FE unit

Append (or merge with the backend entry):

```bash
sudo tee /etc/sudoers.d/oceanroot-fe > /dev/null <<'EOF'
oceanroot ALL=(ALL) NOPASSWD: /bin/systemctl restart exchange-frontend.service, /bin/systemctl status exchange-frontend.service, /bin/journalctl -u exchange-frontend.service
EOF
```

### 4. Install systemd unit

```bash
sudo cp /srv/micro-exchange-fe/infra/systemd/exchange-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
# First build runs through the deploy script — see "Manual deploy" below.
```

### 5. First deploy (manual)

```bash
ssh oceanroot@100.112.117.30 \
  "BRANCH=main GIT_SHA=$(git rev-parse --short HEAD) bash -s" \
  < infra/jenkins/exchange-fe-deploy.sh

sudo systemctl enable --now exchange-frontend.service
sudo systemctl status exchange-frontend.service
```

## Jenkins setup

Reuse the same `server-ssh-key` credential as the backend. If you haven't created it yet, see the backend repo's `docs/jenkins-setup.md`.

`New Item` → name `micro-exchange-frontend` → **Pipeline** → OK:
- **Pipeline → Definition**: *Pipeline script from SCM*
- **SCM**: Git → repo URL → branch `*/main`
- **Script Path**: `Jenkinsfile`

Agent needs `node` + `npm` + `git` + `ssh`. The build does NOT need Docker.

## Rollback

Same model as backend — `.next/standalone.previous/` snapshot per build:

**Automatic** — failed health gate triggers a swap-back + restart + re-check. Production stays on the last-known-good bundle; Jenkins still marks the run failed.

**Manual** — for a regression that passed health but misbehaves under traffic:

```bash
ssh oceanroot@100.112.117.30 \
  "ROLLBACK=1 bash -s" \
  < infra/jenkins/exchange-fe-deploy.sh
```

## Behind a reverse proxy (recommended)

Next listens on port 3000. In production you'll usually front it with nginx/Caddy for TLS + caching:

```nginx
server {
  listen 443 ssl http2;
  server_name app.your-domain.com;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }

  # Forward `/api/*` to the gateway (port 8080) — keeps FE and API
  # on the same origin so the browser doesn't need CORS.
  location /api/ {
    proxy_pass http://127.0.0.1:8080;
  }
}
```

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `npm ci` fails with `EUSAGE` | `package-lock.json` out of sync with `package.json` — run `npm install` locally and commit the new lockfile. |
| Build succeeds but unit immediately exits | `WorkingDirectory` mismatch — the unit expects `/srv/micro-exchange-fe/.next/standalone/`. Verify path matches `REPO_DIR` in the deploy script. |
| `MODULE_NOT_FOUND` for `next` at runtime | The Next standalone copy didn't pick up a transitive dep — usually fixed by ensuring `output: 'standalone'` is in `next.config.ts` AND re-running the deploy. |
| Static assets 404 | `.next/static` and `public/` weren't staged. The deploy script copies them in step 5; if the unit started before this, restart manually. |
| Health gate flakes | First-render warm-up >30s on a small VM. Bump the loop count in `exchange-fe-deploy.sh` or front with nginx that returns 200 from `/healthz` independent of the app. |

## What lives where

| Path | Purpose |
|---|---|
| [`Jenkinsfile`](../Jenkinsfile) | Pipeline definition. |
| [`infra/jenkins/exchange-fe-deploy.sh`](../infra/jenkins/exchange-fe-deploy.sh) | Deploy logic (runs on the host via SSH stdin). |
| [`infra/systemd/exchange-frontend.service`](../infra/systemd/exchange-frontend.service) | systemd unit. |
| [`Dockerfile`](../Dockerfile) | Local container build for `docker run` (not used by the SSH-deploy pipeline). |
| `/etc/exchange/frontend.env` | Real env file (NOT in git). |

## Unresolved questions

- **Zero-downtime**? `systemctl restart` produces a brief 502 window. Front with nginx + `try_files @backup;` to a static maintenance page, or run two units behind nginx upstream pool with `keepalive` + drain on reload.
- **Bundle size growth**? Track with `next build --profile`; gate in CI if it exceeds a budget.
- **Secrets in client bundles**? `NEXT_PUBLIC_*` is baked into the JS sent to browsers. Anything sensitive must NOT have that prefix and must be read server-side only (in API routes / RSC).
