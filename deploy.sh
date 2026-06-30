#!/usr/bin/env bash
###############################################################################
# FitPlanCoach — one-command deploy for your Contabo VPS.
#
#   bash deploy.sh
#
# Safe to run next to OmniStack: this only builds + starts the FitPlanCoach
# container on a loopback port. It never touches other containers, your proxy,
# ports 80/443/3000, or any existing service.
###############################################################################
set -euo pipefail

green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
yellow() { printf "\033[0;33m%s\033[0m\n" "$1"; }
red() { printf "\033[0;31m%s\033[0m\n" "$1"; }

cd "$(dirname "$0")"

# 1) Docker present?
if ! command -v docker >/dev/null 2>&1; then
  red "Docker is not installed. Install Docker + Docker Compose v2 first."; exit 1
fi

# 2) Env file present?
if [ ! -f .env.docker ]; then
  yellow "No .env.docker found — creating one from the template."
  cp .env.docker.example .env.docker
  chmod 600 .env.docker
  red "ACTION NEEDED: open .env.docker, fill in your values, then re-run this script:"
  echo "    nano .env.docker"
  exit 1
fi

# 3) Read HOST_PORT (default 8080) and guard against reserved ports.
HOST_PORT="$(grep -E '^HOST_PORT=' .env.docker | tail -1 | cut -d= -f2 | tr -d '[:space:]')"
HOST_PORT="${HOST_PORT:-8080}"
if [ "$HOST_PORT" = "80" ] || [ "$HOST_PORT" = "443" ] || [ "$HOST_PORT" = "3000" ]; then
  red "HOST_PORT=$HOST_PORT is reserved (OmniStack/proxy). Pick another, e.g. 8080."; exit 1
fi

# 4) Is the port already used on the host?
if command -v ss >/dev/null 2>&1 && ss -tlnH "( sport = :$HOST_PORT )" 2>/dev/null | grep -q ":$HOST_PORT"; then
  red "Port $HOST_PORT is already in use on this server. Edit HOST_PORT in .env.docker."; exit 1
fi

green "==> Building and starting FitPlanCoach on 127.0.0.1:$HOST_PORT ..."
docker compose --env-file .env.docker up -d --build

# 5) Wait for health.
green "==> Waiting for the app to become healthy ..."
for i in $(seq 1 30); do
  if curl -fsS -o /dev/null "http://127.0.0.1:${HOST_PORT}/robots.txt" 2>/dev/null; then
    green "==> ✅ FitPlanCoach is UP at http://127.0.0.1:${HOST_PORT}"
    echo
    echo "Next: point your domain at this server via your existing reverse proxy."
    echo "  Caddy:  append deploy/Caddyfile.snippet to your Caddyfile, then: caddy reload"
    echo "  Nginx:  install deploy/nginx-fitplancoach.conf, then: nginx -t && systemctl reload nginx"
    echo
    echo "Logs:    docker compose --env-file .env.docker logs -f"
    echo "Status:  docker ps --filter name=fitplancoach"
    exit 0
  fi
  sleep 2
done

red "==> App did not become healthy in time. Showing the last 40 log lines:"
docker compose --env-file .env.docker logs --tail=40
exit 1
