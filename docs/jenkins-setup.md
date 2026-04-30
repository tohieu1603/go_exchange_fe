# Jenkins + SSH deploy setup (Frontend)

[Jenkinsfile](../Jenkinsfile) drives a 4-stage pipeline:
1. **Install** — `npm ci` (deterministic) on Jenkins.
2. **Lint + type-check** — `eslint` + `tsc --noEmit` in parallel (`|| true` while the codebase still warns).
3. **Build (Next.js)** — `next build` validates output before deploy.
4. **Deploy to server** — on `main`, SSH into the host: `git pull → npm install → npm run build → systemctl restart exchange_fe → curl via nginx vhost`.

Backend has its own pipeline in [`tohieu1603/go-exchange`](https://github.com/tohieu1603/go-exchange) — same SSH credential.

## What the deploy stage does

```
ssh oceanroot@100.112.117.30 bash -s <<EOF
  cd /home/oceanroot/exchange_fe
  git fetch origin && git reset --hard origin/main && git clean -fd
  npm install
  npm run build
  sudo -n /bin/systemctl restart exchange_fe
  sleep 4
  curl -sf -o /dev/null -w "FE local: %{http_code}\n" \
       -H "Host: exchange.operis.vn" http://127.0.0.1/
EOF
```

Notes:
- Path is `/home/oceanroot/exchange_fe` (underscore — matches the systemd unit name).
- The unit name is `exchange_fe` (NOT `exchange-frontend`). Sudoers entry must NOPASSWD-allow restart of this exact name.
- Uses `npm install` (not `npm ci`) on the host so a partial-deploy node_modules can self-heal without committing a new lockfile.
- Health curl goes through `127.0.0.1:80` with a `Host:` header so nginx routes it as the production vhost — confirms the full path (nginx → next) is green, not just :3000.

## One-time host setup

Backend host setup must already be done (deploy user `oceanroot`, sudoers, SSH key in `authorized_keys`). FE adds:

### 1. Node 20 + repo

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt-get install -y nodejs

sudo -u oceanroot git clone https://github.com/tohieu1603/go_exchange_fe \
  /home/oceanroot/exchange_fe
```

### 2. Env file

```bash
sudo mkdir -p /etc/exchange
sudo tee /etc/exchange/frontend.env > /dev/null <<'EOF'
NODE_ENV=production
PORT=3000
HOSTNAME=0.0.0.0
NEXT_PUBLIC_API_URL=https://exchange.operis.vn
EOF
sudo chown oceanroot:oceanroot /etc/exchange/frontend.env
sudo chmod 640 /etc/exchange/frontend.env
```

### 3. Sudoers entry

```bash
sudo tee /etc/sudoers.d/oceanroot-fe > /dev/null <<'EOF'
oceanroot ALL=(ALL) NOPASSWD: /bin/systemctl restart exchange_fe, /bin/systemctl status exchange_fe, /bin/journalctl -u exchange_fe
EOF
```

### 4. systemd unit

```bash
sudo cp /home/oceanroot/exchange_fe/infra/systemd/exchange_fe.service /etc/systemd/system/
sudo systemctl daemon-reload
```

### 5. nginx vhost

```nginx
# /etc/nginx/sites-available/exchange.operis.vn
server {
  listen 443 ssl http2;
  server_name exchange.operis.vn;
  # ssl_certificate / ssl_certificate_key from certbot or your CA

  # Same-origin: /api/* goes to the backend gateway, everything else
  # to Next. The browser sees one host, no CORS preflight.
  location /api/ {
    proxy_pass http://127.0.0.1:3079;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}

# Listen on :80 for the Jenkins health probe (Host header carries the vhost)
server {
  listen 80;
  server_name exchange.operis.vn;
  location / { proxy_pass http://127.0.0.1:3000; }
  location /api/ { proxy_pass http://127.0.0.1:3079; }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/exchange.operis.vn /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
```

### 6. First deploy

Trigger the Jenkins job manually OR run the deploy heredoc by hand:

```bash
ssh oceanroot@100.112.117.30 bash <<'EOF'
  set -euo pipefail
  cd /home/oceanroot/exchange_fe
  git fetch origin && git reset --hard origin/main
  npm install && npm run build
EOF
sudo systemctl enable --now exchange_fe
sudo systemctl status exchange_fe
```

## Jenkins setup

Reuse the `server-ssh-key` credential from the backend.

`New Item` → `micro-exchange-frontend` → **Pipeline** → OK:
- **Pipeline → Definition**: *Pipeline script from SCM*
- **SCM**: Git → this repo → branch `*/main`
- **Script Path**: `Jenkinsfile`

Agent needs `node` 20 + `npm` + `git` + `ssh`. NOT Docker.

## Troubleshooting

| Symptom | Likely cause / fix |
|---|---|
| `sudo: a password is required` | Sudoers entry missing — see step 3. The unit name in sudoers must match `exchange_fe` exactly (with underscore). |
| `npm install` fails on the host | Disk full or permission on `node_modules`. Check `df -h` and `ls -la /home/oceanroot/exchange_fe`. |
| Health curl returns 404 | nginx vhost not loaded or `Host` header doesn't match `server_name`. `sudo nginx -t && sudo nginx -s reload`. |
| Health curl returns 502 | Next process didn't come back up. `sudo journalctl -u exchange_fe -n 50`. |
| Lint stage flooding logs | Drop the `|| true` on the lint stage once warnings are cleaned up to enforce zero-warning. |

## What lives where

| Path | Purpose |
|---|---|
| [`Jenkinsfile`](../Jenkinsfile) | Pipeline definition (deploy logic inline in heredoc). |
| [`infra/systemd/exchange_fe.service`](../infra/systemd/exchange_fe.service) | systemd unit — `Type=simple` running `npm run start`. |
| [`Dockerfile`](../Dockerfile) | Local container build for `docker run` (not used by SSH deploy). |
| `/etc/exchange/frontend.env` | Real env file (NOT in git). |
| `/home/oceanroot/exchange_fe` | Working tree on the host. |

## Unresolved questions

- **Rollback** — Jenkinsfile has no auto-revert if health fails post-restart. Worth a `.next.previous` snapshot + swap-back?
- **CDN** — Static assets served from origin. Cloudflare or Bunny CDN cuts origin load.
- **Secrets in client bundles** — `NEXT_PUBLIC_*` is baked into the JS sent to browsers. Anything sensitive must NOT have that prefix.
- **`npm ci` on the host** — currently `npm install` lets the host self-heal node_modules drift. Tighten to `npm ci` once the lockfile workflow is stable.
