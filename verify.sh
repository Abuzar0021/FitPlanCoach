#!/usr/bin/env bash
###############################################################################
# verify.sh — deterministic deployment check. Assumes NOTHING.
#
#   bash verify.sh
#
# Detects the real ports from the running container, confirms the container is
# up, curls the app on localhost, and prints DEPLOYMENT READY / NOT READY.
# Exit code 0 = READY, 1 = NOT READY.
###############################################################################
set -uo pipefail

CONTAINER="fitplancoach"

notready() {
  echo
  echo "RESULT: NOT READY"
  echo "Reason: $1"
  exit 1
}

# --- 1) Container must exist and be running --------------------------------
docker inspect "$CONTAINER" >/dev/null 2>&1 \
  || notready "container '$CONTAINER' does not exist. Run: bash deploy.sh"

STATE="$(docker inspect -f '{{.State.Status}}' "$CONTAINER" 2>/dev/null)"
[ "$STATE" = "running" ] \
  || notready "container '$CONTAINER' state is '$STATE' (expected 'running'). Logs: docker logs $CONTAINER"

HEALTH="$(docker inspect -f '{{if .State.Health}}{{.State.Health.Status}}{{else}}no-healthcheck{{end}}' "$CONTAINER" 2>/dev/null)"

# --- 2) Detect the INTERNAL port (from the container env, not a guess) ------
INTERNAL_PORT="$(docker inspect -f '{{range .Config.Env}}{{println .}}{{end}}' "$CONTAINER" 2>/dev/null | grep -E '^PORT=' | head -1 | cut -d= -f2 | tr -d '[:space:]')"
[ -n "$INTERNAL_PORT" ] || notready "could not detect the container's internal PORT from its env"

# --- 3) Detect the HOST published port (from the real port map) ------------
HOST_PORT="$(docker inspect -f "{{(index (index .NetworkSettings.Ports \"${INTERNAL_PORT}/tcp\") 0).HostPort}}" "$CONTAINER" 2>/dev/null)"
[ -n "$HOST_PORT" ] && [ "$HOST_PORT" != "<no value>" ] \
  || notready "container is not publishing ${INTERNAL_PORT}/tcp to the host"

# --- 4) Evidence from logs (actual listening line) -------------------------
LISTEN_LINE="$(docker logs "$CONTAINER" 2>&1 | grep -i "Listening on" | tail -1)"

echo "===== Detected (not assumed) ====="
echo "container:        $CONTAINER"
echo "docker status:    $STATE   (health: $HEALTH)"
echo "internal port:    $INTERNAL_PORT   (inside the container)"
echo "host port:        $HOST_PORT   (published on the server, loopback)"
[ -n "$LISTEN_LINE" ] && echo "server log:        ${LISTEN_LINE#*] }"

# --- 5) HARD CHECK: the app must actually answer on localhost --------------
if ! command -v curl >/dev/null 2>&1; then
  notready "curl is not installed on this host. Install it: sudo apt-get install -y curl"
fi

echo
echo "Testing local server..."
echo "\$ curl -I http://localhost:${HOST_PORT}/robots.txt"
CODE="$(curl -s -o /dev/null -w '%{http_code}' "http://localhost:${HOST_PORT}/robots.txt" 2>/dev/null)"
echo "HTTP ${CODE}"

[ "$CODE" = "200" ] \
  || notready "local HTTP check returned '${CODE}' (expected 200). The app is not serving. Logs: docker logs $CONTAINER"

echo
echo "DEPLOYMENT READY"
echo "URL: http://localhost:${HOST_PORT}"
exit 0
