#!/usr/bin/env bash
###############################################################################
# caddy-setup.sh — deterministic reverse-proxy config for the running app.
#
#   bash deploy/caddy-setup.sh
#
# Detects: the app's real ports, and whether Caddy is a SYSTEM service or a
# DOCKER container. Prints the EXACT Caddy block + commands. It does NOT edit
# your Caddy automatically (safer for OmniStack) — you paste the printed block.
###############################################################################
set -uo pipefail

CONTAINER="fitplancoach"
DOMAIN="fitplancoach.com"

die() { echo "ERROR: $1"; exit 1; }

# --- App must be running + verified first ----------------------------------
docker inspect "$CONTAINER" >/dev/null 2>&1 || die "app container '$CONTAINER' not found. Run: bash deploy.sh && bash verify.sh"
[ "$(docker inspect -f '{{.State.Status}}' "$CONTAINER")" = "running" ] || die "app container is not running. Run: bash verify.sh"

INTERNAL_PORT="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" | grep -E '^PORT=' | head -1 | cut -d= -f2 | tr -d '[:space:]')"
HOST_PORT="$(docker inspect -f "{{(index (index .NetworkSettings.Ports \"${INTERNAL_PORT}/tcp\") 0).HostPort}}" "$CONTAINER" 2>/dev/null)"
[ -n "$INTERNAL_PORT" ] || die "could not detect internal port"
[ -n "$HOST_PORT" ] && [ "$HOST_PORT" != "<no value>" ] || die "could not detect host port"

echo "Detected: internal port = $INTERNAL_PORT, host port = $HOST_PORT"
echo

# --- Detect Caddy mode (deterministic, in priority order) ------------------
if systemctl is-active --quiet caddy 2>/dev/null; then
  MODE="system"
elif docker ps --format '{{.Names}} {{.Image}}' | grep -qiE 'caddy'; then
  MODE="docker"
else
  MODE="none"
fi

case "$MODE" in
  system)
    echo "=== CADDY MODE: SYSTEM (host service) ==="
    echo "1) Append this block to /etc/caddy/Caddyfile:"
    echo
    echo "    ${DOMAIN}, www.${DOMAIN} {"
    echo "        reverse_proxy 127.0.0.1:${HOST_PORT}"
    echo "    }"
    echo
    echo "2) Apply it (graceful — OmniStack stays up):"
    echo "    sudo systemctl reload caddy"
    ;;

  docker)
    CADDY_NAME="$(docker ps --format '{{.Names}} {{.Image}}' | grep -iE 'caddy' | head -1 | awk '{print $1}')"
    echo "=== CADDY MODE: DOCKER (container: ${CADDY_NAME}) ==="

    # Networks each container is on.
    app_nets="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$CONTAINER")"
    caddy_nets="$(docker inspect -f '{{range $k,$v := .NetworkSettings.Networks}}{{$k}} {{end}}' "$CADDY_NAME")"

    # Shared network?
    shared=""
    for n in $app_nets; do
      for c in $caddy_nets; do [ "$n" = "$c" ] && shared="$n"; done
    done

    if [ -z "$shared" ]; then
      target_net="$(echo "$caddy_nets" | awk '{print $1}')"
      echo "Containers are NOT on a shared network yet. Run this FIRST:"
      echo
      echo "    docker network connect ${target_net} ${CONTAINER}"
      echo
      echo "Then re-run:  bash deploy/caddy-setup.sh"
      exit 0
    fi

    echo "Shared network confirmed: ${shared}"
    echo
    echo "1) Add this block to the Caddyfile your Caddy container uses"
    echo "   (inside the container it's usually /etc/caddy/Caddyfile):"
    echo
    echo "    ${DOMAIN}, www.${DOMAIN} {"
    echo "        reverse_proxy ${CONTAINER}:${INTERNAL_PORT}"
    echo "    }"
    echo
    echo "   (container name '${CONTAINER}' + INTERNAL port ${INTERNAL_PORT} — never 127.0.0.1, never ${HOST_PORT})"
    echo
    echo "2) Reload Caddy (graceful):"
    echo "    docker exec ${CADDY_NAME} caddy reload --config /etc/caddy/Caddyfile"
    ;;

  none)
    echo "=== NO CADDY DETECTED ==="
    echo "No active 'caddy' service and no running container named like caddy."
    echo "If OmniStack uses a different proxy, tell me which and I'll give exact config."
    echo "The app itself is reachable on the host at: http://localhost:${HOST_PORT}"
    exit 1
    ;;
esac

echo
echo "After Caddy is reloaded AND DNS points the domain to this server,"
echo "Caddy will issue HTTPS automatically on the first request."
