# FitPlanCoach — VPS Deployment Guide (Contabo Ubuntu 24, Docker)

Production deployment of the existing TanStack Start + Nitro app onto a shared
Ubuntu 24 VPS **without touching the OmniStack site** already running on
ports 80 / 443 / 3000.

> Nothing about the app (UI, business logic, Supabase) changes. This adds only
> deployment infrastructure + forces Nitro's Node-server output (see
> "Architecture decisions").

---

## 0. TL;DR (deterministic — nothing is assumed)

```bash
# on the VPS, in the project directory
cp .env.docker.example .env.docker      # then edit with real values
nano .env.docker

bash deploy.sh        # builds, starts, and HARD-STOPS unless the app answers curl
bash verify.sh        # re-checks; prints "DEPLOYMENT READY / URL: http://localhost:<port>"
bash deploy/caddy-setup.sh   # detects your Caddy mode + real port, prints the exact block
```

Each script DETECTS the real port from the running container — no 3000-vs-8080
guessing. Only after `verify.sh` says READY do you touch DNS (§7).

---

## 1. What was added (no app code changed)

| File | Purpose |
|---|---|
| `Dockerfile` | Multi-stage build → tiny Node runtime image |
| `docker-compose.yml` | One-command build/run; loopback port; healthcheck; restart; logs |
| `.dockerignore` | Small context; **keeps `.env*` out of the image** |
| `.env.docker.example` | Env template (build-time vs runtime split) |
| `deploy/Caddyfile.snippet` | Reverse-proxy block for your existing Caddy |
| `deploy/nginx-fitplancoach.conf` | Reverse-proxy server block for Nginx |
| `DEPLOYMENT.md` | This guide |
| `.gitignore` | Now ignores `.env.docker` (secrets) |

**Folder tree (added parts):**

```
FitPlanCoach/
├── Dockerfile
├── docker-compose.yml
├── .dockerignore
├── .env.docker.example          # copy → .env.docker (gitignored)
├── DEPLOYMENT.md
└── deploy/
    ├── Caddyfile.snippet
    └── nginx-fitplancoach.conf
```

---

## 2. How the build/run actually works

- `npm run build` (inside the image, with `NITRO_PRESET=node-server`) emits a
  **self-contained `.output/`**. Its entry `node .output/server/index.mjs` starts
  a real Node HTTP server (Nitro bundles every server dependency into
  `.output/server/_libs`, so the runtime image carries **no `node_modules`**).
- The server listens on `PORT` (default `3000`) / `HOST` (`0.0.0.0`) **inside the
  container**.
- Compose publishes that to **`127.0.0.1:${HOST_PORT}`** on the host (default
  `8080`) — loopback only, so it is never exposed publicly and never collides
  with 80/443/3000.

Verified locally before shipping: the node-server boots
(`➜ Listening on: http://127.0.0.1:8080/`) and returns **200** for `/`,
`/robots.txt`, and static assets — even before Supabase env is set.

---

## 3. Prerequisites (already true on your VPS)

- Docker + Docker Compose v2 installed.
- Docker enabled on boot (so the app restarts after a reboot):
  ```bash
  sudo systemctl enable docker
  ```

---

## 4. Deploy — step by step

```bash
# 1) Get the code onto the VPS (clone or pull this branch)
git clone <your-repo-url> fitplancoach && cd fitplancoach
#   (or: cd fitplancoach && git pull)

# 2) Create the env file from the template and fill in real values
cp .env.docker.example .env.docker
chmod 600 .env.docker
nano .env.docker
#   - HOST_PORT: pick a FREE port, not 80/443/3000 (default 8080)
#   - VITE_*  : Supabase URL/keys + Play URL  (BUILD-time, inlined)
#   - SUPABASE_* / GOOGLE_PLAY_* / LOVABLE_* : server secrets (RUNTIME)

# 3) Confirm the host port is free (avoid clashing with OmniStack)
ss -tlnp | grep -E ':8080' || echo "8080 is free"

# 4) Build + start (detached)
docker compose --env-file .env.docker up -d --build
```

That single command builds the image and starts the container. `restart:
unless-stopped` means it comes back automatically after a crash or VPS reboot.

---

## 5. Put it behind your existing reverse proxy (HTTPS + domain)

You already run a proxy on 80/443. **Do not start a new one.** Add a site to the
one you have; a reload is graceful and does not interrupt OmniStack.

**Caddy** (auto-HTTPS) — let the script detect your setup and print exact lines:
```bash
bash deploy/caddy-setup.sh
```
It detects whether Caddy is a **system service** or a **Docker container**, reads
the app's **real port**, and for Docker Caddy verifies (or tells you how to make)
a shared network — then prints the precise `reverse_proxy` block and reload
command. It does not edit your Caddy for you (safer for OmniStack); you paste the
block it prints.

**Nginx** (+ certbot):
```bash
sudo cp deploy/nginx-fitplancoach.conf /etc/nginx/sites-available/fitplancoach.conf
sudo ln -s /etc/nginx/sites-available/fitplancoach.conf /etc/nginx/sites-enabled/
sudo nginx -t && sudo systemctl reload nginx
sudo certbot --nginx -d fitplancoach.com -d www.fitplancoach.com
```

Point the domain's DNS A/AAAA records at the VPS IP beforehand.

---

## 6. Verify (one command, deterministic)

```bash
bash verify.sh
```
It detects the container's internal port + the published host port from the live
container, curls `http://localhost:<host-port>`, and prints either
`DEPLOYMENT READY / URL: http://localhost:<port>` (exit 0) or `NOT READY` with the
reason (exit 1). `deploy.sh` runs this same gate automatically and refuses to
finish unless it passes.

Checklist this satisfies: Docker build succeeds · container starts · Nitro
server starts · server listens · env loads · no missing deps/runtime files/assets
· no broken imports · no runtime crash. (Supabase connectivity is exercised the
moment a signed-in user hits a server function; the values come from your
`.env.docker`.)

---

## 7. Update procedure (deploy a new version)

```bash
cd fitplancoach
git pull
docker compose --env-file .env.docker up -d --build   # rebuild + rolling replace
docker image prune -f                                 # reclaim old layers
```

Because `VITE_*` are build-time, a content/config change to those **requires
this rebuild** (the `--build` flag handles it).

---

## 8. Rollback procedure

The image is tagged `fitplancoach:latest`. Two reliable options:

**A) Roll back the code, rebuild:**
```bash
git log --oneline -5
git checkout <previous-good-commit>
docker compose --env-file .env.docker up -d --build
```

**B) Keep versioned image tags (recommended for fast rollback):**
```bash
# before each deploy, tag the current image with the git sha
docker tag fitplancoach:latest fitplancoach:$(git rev-parse --short HEAD)
# ...deploy new version... if it misbehaves, revert instantly:
docker tag fitplancoach:<previous-sha> fitplancoach:latest
docker compose --env-file .env.docker up -d            # no --build = reuse image
```

Roll back the proxy/domain? Nothing to undo — the proxy points at a fixed
loopback port; only the container behind it changes.

---

## 9. Backup procedure

The container is **stateless** — all persistent data lives in Supabase, so
backups are a Supabase concern:

- Enable **Supabase automated backups / PITR** in the Supabase dashboard.
- Ad-hoc DB dump (if you have direct Postgres access):
  ```bash
  pg_dump "$SUPABASE_DB_URL" -Fc -f fitplancoach_$(date +%F).dump
  ```
- Back up your deploy secrets safely (offline): `.env.docker`.

There are no container volumes to snapshot.

---

## 10. Operations

- **Logs:** `docker compose --env-file .env.docker logs -f`
  (JSON-file driver, rotated at 10 MB × 5 files so it can't fill the disk).
- **Restart policy:** `unless-stopped` — auto-restarts on crash and on VPS
  reboot (with `systemctl enable docker`).
- **Health:** Docker HEALTHCHECK polls `/robots.txt` every 30 s; an unhealthy
  container is visible in `docker ps` and can be auto-restarted by your tooling.
- **Stop only this app (never touches OmniStack):**
  `docker compose --env-file .env.docker down`
- **Resource caps (optional):** add under the service in compose:
  ```yaml
  deploy:
    resources:
      limits: { cpus: "1.0", memory: 512M }
  ```

---

## 11. Architecture decisions (why each choice)

1. **Forced `NITRO_PRESET=node-server` (build-time only).** The repo's default
   build targets **Cloudflare** (`cloudflare-module` → a Worker that needs the
   workerd runtime, not Node). Setting the preset *in the Dockerfile* produces a
   Node HTTP server **without changing any committed config** — so Lovable's own
   Cloudflare deploys are unaffected.
2. **Multi-stage image.** The builder installs deps + builds; the runtime copies
   only the self-contained `.output`. Result: a small image with no `node_modules`,
   no build tools, smaller attack surface.
3. **`npm install`, not bun.** The committed `bun.lock` points at Lovable's
   private registry (unreachable from a generic VPS). All deps (incl.
   `@lovable.dev/*`) exist on the public npm registry, so npm builds cleanly.
4. **Build-time vs runtime env split.** `VITE_*` must be inlined into the client
   bundle at build time → passed as build args. Server secrets are read from
   `process.env` at runtime → injected via `env_file`. Conflating them would
   either leak secrets into the bundle or leave the client unconfigured.
5. **Loopback publish `127.0.0.1:${HOST_PORT}:3000`.** Guarantees coexistence:
   not on 80/443/3000, not on a public interface, reverse-proxied by the existing
   proxy. The container's *internal* 3000 cannot clash with the host's 3000.
6. **Dedicated bridge network `fitplancoach_net`.** Isolated from existing Docker
   networks/volumes/containers — nothing shared, nothing overwritten.
7. **`restart: unless-stopped` + `init: true`.** Survives reboots/crashes; tini
   reaps zombies and forwards signals for clean shutdown.
8. **Healthcheck via Node `fetch` (no curl).** The slim image ships no curl/wget;
   Node 22's global `fetch` hits `/robots.txt` (a static 200) to prove liveness.
9. **Log rotation.** Bounded json-file logs prevent a chatty app from filling the
   VPS disk and affecting OmniStack.
10. **Stateless container.** No volumes; state is in Supabase — simpler, safer
    rollbacks and backups.

---

## 12. VPS safety summary

This deployment **cannot** affect OmniStack: it never binds 80/443/3000, never
touches existing containers, networks, volumes, certificates, or the existing
Caddy/Nginx config (you add one site block and *reload*, never restart-from-
scratch). `docker compose ... down` only removes the FitPlanCoach container and
its own network.
