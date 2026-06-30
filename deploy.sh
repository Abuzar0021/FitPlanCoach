#!/usr/bin/env bash
###############################################################################
# deploy.sh — deterministic build + start + HARD verification.
#
#   bash deploy.sh
#
# Builds and starts the FitPlanCoach container, then STOPS unless the app is
# actually running AND answering on localhost. No assumptions: the port is taken
# from .env.docker (build) and re-detected from the live container (verify.sh).
# Safe next to OmniStack — publishes only to 127.0.0.1:<HOST_PORT>.
###############################################################################
set -euo pipefail

green() { printf "\033[0;32m%s\033[0m\n" "$1"; }
red() { printf "\033[0;31m%s\033[0m\n" "$1"; }

cd "$(dirname "$0")"
COMPOSE=(docker compose --env-file .env.docker)

# --- Preconditions ---------------------------------------------------------
command -v docker >/dev/null 2>&1 || { red "Docker is not installed."; exit 1; }
command -v curl   >/dev/null 2>&1 || { red "curl is not installed. Run: sudo apt-get install -y curl"; exit 1; }

if [ ! -f .env.docker ]; then
  cp .env.docker.example .env.docker
  chmod 600 .env.docker
  red "Created .env.docker from the template. Fill it in, then re-run:"
  echo "    nano .env.docker"
  exit 1
fi

HOST_PORT="$(grep -E '^HOST_PORT=' .env.docker | tail -1 | cut -d= -f2 | tr -d '[:space:]')"
HOST_PORT="${HOST_PORT:-8080}"
case "$HOST_PORT" in
  80|443|3000) red "HOST_PORT=$HOST_PORT is reserved (OmniStack/proxy). Choose another in .env.docker."; exit 1;;
esac
if command -v ss >/dev/null 2>&1 && ss -tlnH "( sport = :$HOST_PORT )" 2>/dev/null | grep -q ":$HOST_PORT"; then
  red "Port $HOST_PORT is already in use on this server. Change HOST_PORT in .env.docker."; exit 1
fi

# --- Build + start ---------------------------------------------------------
green "==> Building and starting (host port $HOST_PORT -> container 3000) ..."
"${COMPOSE[@]}" up -d --build

# --- Wait for the container to be RUNNING (deterministic) ------------------
green "==> Waiting for container to run ..."
STATE="missing"
for _ in $(seq 1 15); do
  STATE="$(docker inspect -f '{{.State.Status}}' fitplancoach 2>/dev/null || echo missing)"
  [ "$STATE" = "running" ] && break
  sleep 2
done
if [ "$STATE" != "running" ]; then
  red "==> Container did not reach 'running' (state: $STATE). Last 40 log lines:"
  "${COMPOSE[@]}" logs --tail=40
  exit 1
fi

# --- Wait until the app actually answers on localhost ----------------------
green "==> Waiting for HTTP 200 on http://localhost:${HOST_PORT} ..."
OK=""
for _ in $(seq 1 30); do
  CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT}/robots.txt" 2>/dev/null || true)"
  [ "$CODE" = "200" ] && { OK="1"; break; }
  sleep 2
done
if [ -z "$OK" ]; then
  red "==> App is NOT reachable on http://localhost:${HOST_PORT} (last code: ${CODE:-none}). Last 40 log lines:"
  "${COMPOSE[@]}" logs --tail=40
  exit 1
fi

# --- Canonical verification (prints detected ports + the curl test) --------
echo
bash verify.sh || { "${COMPOSE[@]}" logs --tail=40; exit 1; }

echo
echo "Final step: point A record to server IP AFTER local curl test passes"
echo "(reverse proxy: run  bash deploy/caddy-setup.sh  to get the exact Caddy block)"
