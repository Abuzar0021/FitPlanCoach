#!/usr/bin/env bash
# Read-only diagnostics — changes NOTHING. Run on your VPS and paste the output
# back so the exact reverse-proxy + domain steps can be tailored to your server.
#   bash deploy/diagnose.sh
echo "===== OS ====="; (. /etc/os-release 2>/dev/null; echo "${PRETTY_NAME:-unknown}")
echo "===== Public IP ====="; curl -fsS https://api.ipify.org 2>/dev/null || echo "(could not detect)"; echo
echo "===== Docker ====="; docker --version 2>/dev/null; docker compose version 2>/dev/null
echo "===== Running containers ====="; docker ps --format 'table {{.Names}}\t{{.Image}}\t{{.Ports}}\t{{.Status}}' 2>/dev/null
echo "===== Which reverse proxy is running? ====="
for p in caddy nginx traefik; do
  if pgrep -x "$p" >/dev/null 2>&1 || docker ps --format '{{.Image}} {{.Names}}' 2>/dev/null | grep -qi "$p"; then
    echo "FOUND: $p"
  fi
done
echo "===== What listens on 80/443/3000/8080? ====="; ss -tlnp 2>/dev/null | grep -E ':80 |:443 |:3000 |:8080 ' || echo "(need sudo for process names: sudo ss -tlnp)"
echo "===== Caddy config (if present) ====="; ls -la /etc/caddy/Caddyfile 2>/dev/null || echo "no /etc/caddy/Caddyfile"
echo "===== Nginx sites (if present) ====="; ls -la /etc/nginx/sites-enabled/ 2>/dev/null || echo "no /etc/nginx/sites-enabled"
echo "===== Done. Paste everything above. ====="
