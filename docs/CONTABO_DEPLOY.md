# FitPlanCoach — Contabo VPS Production Deployment (Ubuntu 22/24)

End-to-end, zero → live. Runs safely beside OmniStack (Caddy + app on 80/443/3000).
The container binds only to `127.0.0.1:8080` → container `3000`, exposed via your
existing reverse proxy. No theory.

---

## 1. Server setup

```bash
ssh root@SERVER_IP
apt update && apt -y upgrade
timedatectl set-timezone UTC          # optional
apt -y install git curl ca-certificates
```

## 2. Install Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | sh
docker --version && docker compose version
systemctl enable --now docker          # start on boot (survives reboot)
```

## 3. Firewall (UFW)

Open only SSH + web. Port 8080 stays CLOSED to the internet (the app is bound to
loopback, so it is never publicly reachable — only your proxy reaches it).

```bash
apt -y install ufw
ufw allow OpenSSH
ufw allow 80/tcp
ufw allow 443/tcp
ufw --force enable
ufw status
```

## 4. Clone repo + environment

```bash
# Production deploys from main, the repository's default branch.
git clone https://github.com/Abuzar0021/FitPlanCoach.git
cd FitPlanCoach

cp .env.docker.example .env.docker
chmod 600 .env.docker
nano .env.docker
```

Fill `.env.docker` (Supabase → Project Settings → API):

```
HOST_PORT=8080
VITE_SUPABASE_URL=https://YOURPROJECT.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_URL=https://YOURPROJECT.supabase.co
SUPABASE_PUBLISHABLE_KEY=<anon/publishable key>
SUPABASE_SERVICE_ROLE_KEY=<service_role key>
```

> `VITE_*` are baked into the build; the rest are read at runtime. Leave Google
> Play / email vars blank until needed.

## 5. Production compose (already in repo)

`docker-compose.yml` already sets `restart: unless-stopped`, a healthcheck, log
rotation, an isolated bridge network, and:

```yaml
ports:
  - "127.0.0.1:${HOST_PORT:-8080}:3000"   # loopback only — no host network, no public port
```

## 6. Deploy (zero → live)

```bash
docker compose --env-file .env.docker build --no-cache
docker compose --env-file .env.docker up -d
```

Or one command with built-in checks:

```bash
bash deploy.sh
```

## 7. Health check verification

```bash
bash verify.sh
# expect: DEPLOYMENT READY / URL: http://localhost:8080
```

Manual equivalents:

```bash
docker ps --filter name=fitplancoach                       # Up + healthy
docker inspect -f '{{.State.Health.Status}}' fitplancoach  # healthy
curl -I http://localhost:8080/robots.txt                   # HTTP/1.1 200
docker compose --env-file .env.docker logs --tail=30       # "Listening on ..."
```

Do **not** continue to DNS/SSL until `curl` returns 200.

## 8. Reverse proxy + SSL (Caddy — your existing proxy)

Caddy auto-issues Let's Encrypt certificates. Detect mode + get the exact block:

```bash
bash deploy/caddy-setup.sh
```

**System Caddy** — append to `/etc/caddy/Caddyfile`, then `sudo systemctl reload caddy`:

```
fitplancoach.com, www.fitplancoach.com {
    reverse_proxy 127.0.0.1:8080
}
```

**Docker Caddy** — put both on one network, then reload the Caddy container:

```bash
docker network connect <caddy_network> fitplancoach
```
```
fitplancoach.com, www.fitplancoach.com {
    reverse_proxy fitplancoach:3000
}
```

<details><summary>Alternative: Nginx + Certbot</summary>

```bash
sudo apt -y install nginx certbot python3-certbot-nginx
sudo cp deploy/nginx-fitplancoach.conf /etc/nginx/sites-available/fitplancoach.conf
sudo ln -s /etc/nginx/sites-available/fitplancoach.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d fitplancoach.com -d www.fitplancoach.com
```
(The provided conf proxies to `http://127.0.0.1:8080`.)
</details>

## 9. Domain — point the A record

In your DNS panel set both records to the Contabo server IP (`curl -4 ifconfig.me`):

| Type | Host | Value |
|------|------|-------|
| A | `@`   | `SERVER_IP` |
| A | `www` | `SERVER_IP` |

Leave MX/TXT (email) untouched. Verify propagation, then SSL issues automatically:

```bash
dig +short fitplancoach.com      # -> SERVER_IP
curl -I https://fitplancoach.com # -> HTTP/2 200
```

## 10. Update procedure

```bash
cd FitPlanCoach
git pull
docker compose --env-file .env.docker up -d --build
docker image prune -f
bash verify.sh
```

## 11. Rollback strategy (if a container fails)

`restart: unless-stopped` auto-restarts crashes. If a new build is bad:

```bash
# A) revert code + rebuild
git checkout <previous-good-commit>
docker compose --env-file .env.docker up -d --build

# B) instant image rollback (tag before each deploy)
docker tag fitplancoach:latest fitplancoach:prev      # run BEFORE updating
# ...if the new one is broken:
docker tag fitplancoach:prev fitplancoach:latest
docker compose --env-file .env.docker up -d           # no --build = reuse old image
```

Stop only this app (never touches OmniStack):

```bash
docker compose --env-file .env.docker down
```

---

## Safety summary

- Binds `127.0.0.1:8080` only — never a public port, never host networking.
- Never uses 80/443/3000; OmniStack's Caddy/containers are untouched (you only
  *add* a site block + *reload*).
- Isolated bridge network `fitplancoach_net`; stateless container (data in
  Supabase) → safe rollbacks.
