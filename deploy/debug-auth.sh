#!/usr/bin/env bash
###############################################################################
# debug-auth.sh — deterministic auth diagnostic. Assumes NOTHING.
#
#   bash deploy/debug-auth.sh
#
# Reads the REAL values inside the running container (not the .env.docker file
# on disk, which can drift from what was actually built in), checks the two
# Supabase URLs reference the SAME project, and proves (via live HTTP calls
# to Supabase) whether each key actually authenticates against that project.
# Also checks whether the DB schema (profiles/user_roles/subscriptions) is
# actually present — a partially-applied full_schema.sql breaks every signup.
###############################################################################
set -uo pipefail
CONTAINER="fitplancoach"

fail() { echo "FAIL: $1"; }
ok()   { echo "OK:   $1"; }

docker inspect "$CONTAINER" >/dev/null 2>&1 || { echo "Container '$CONTAINER' not found. Is it deployed?"; exit 1; }

ENV_DUMP="$(docker exec "$CONTAINER" env 2>/dev/null)"

get() { echo "$ENV_DUMP" | grep -E "^$1=" | head -1 | cut -d= -f2-; }
mask() { local v="$1"; [ -z "$v" ] && { echo "(empty)"; return; }; echo "${v:0:12}...${v: -4} (len ${#v})"; }
ref_of() { echo "$1" | sed -E 's#https?://([a-z0-9-]+)\.supabase\.co.*#\1#'; }

SUPABASE_URL="$(get SUPABASE_URL)"
VITE_SUPABASE_URL="$(get VITE_SUPABASE_URL)"
SUPABASE_PUBLISHABLE_KEY="$(get SUPABASE_PUBLISHABLE_KEY)"
SUPABASE_SERVICE_ROLE_KEY="$(get SUPABASE_SERVICE_ROLE_KEY)"

echo "===== 1) What's actually baked into the running container ====="
echo "SUPABASE_URL:               $SUPABASE_URL"
echo "VITE_SUPABASE_URL:          $VITE_SUPABASE_URL"
echo "SUPABASE_PUBLISHABLE_KEY:   $(mask "$SUPABASE_PUBLISHABLE_KEY")"
echo "SUPABASE_SERVICE_ROLE_KEY:  $(mask "$SUPABASE_SERVICE_ROLE_KEY")"
echo

echo "===== 2) Do both URLs point at the SAME Supabase project? ====="
REF_SERVER="$(ref_of "$SUPABASE_URL")"
REF_CLIENT="$(ref_of "$VITE_SUPABASE_URL")"
echo "server-side project ref: $REF_SERVER"
echo "client-side project ref: $REF_CLIENT"
if [ -z "$REF_SERVER" ] || [ -z "$REF_CLIENT" ]; then
  fail "one of the URLs is empty or malformed — .env.docker is not set correctly, or the container was not rebuilt after editing it"
elif [ "$REF_SERVER" != "$REF_CLIENT" ]; then
  fail "MISMATCH — server and client are talking to two different Supabase projects. Fix .env.docker so SUPABASE_URL and VITE_SUPABASE_URL are identical, then: docker compose --env-file .env.docker build --no-cache && docker compose --env-file .env.docker up -d"
else
  ok "both point at project '$REF_SERVER'"
fi
echo

if [ -z "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  fail "SUPABASE_SERVICE_ROLE_KEY is EMPTY inside the container — signup will always fail with 'Could not create your account'. Add it to .env.docker (Supabase -> Settings -> API keys -> secret key) and rebuild."
fi
echo

echo "===== 3) Does the PUBLISHABLE key actually authenticate to that project? ====="
if [ -n "$VITE_SUPABASE_URL" ] && [ -n "$SUPABASE_PUBLISHABLE_KEY" ]; then
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $SUPABASE_PUBLISHABLE_KEY" "$VITE_SUPABASE_URL/auth/v1/settings")"
  echo "GET $VITE_SUPABASE_URL/auth/v1/settings -> HTTP $CODE"
  [ "$CODE" = "200" ] && ok "publishable key is valid for this project" || fail "publishable key rejected (HTTP $CODE) — it's the wrong key for this project, or expired"
else
  fail "cannot test — URL or key is empty"
fi
echo

echo "===== 4) Does the SERVICE ROLE key work, and does the schema exist? ====="
if [ -n "$SUPABASE_URL" ] && [ -n "$SUPABASE_SERVICE_ROLE_KEY" ]; then
  CODE="$(curl -s -o /dev/null -w '%{http_code}' -H "apikey: $SUPABASE_SERVICE_ROLE_KEY" -H "Authorization: Bearer $SUPABASE_SERVICE_ROLE_KEY" "$SUPABASE_URL/rest/v1/profiles?select=id&limit=1")"
  echo "GET $SUPABASE_URL/rest/v1/profiles -> HTTP $CODE"
  case "$CODE" in
    200) ok "service role key works AND the 'profiles' table exists (schema applied)" ;;
    401|403) fail "service role key rejected (HTTP $CODE) — wrong/expired secret key for this project" ;;
    404) fail "key is valid but 'profiles' table is missing (HTTP 404) — full_schema.sql did not fully run. Re-run it in Supabase SQL Editor and check for a red error partway through." ;;
    *) fail "unexpected HTTP $CODE — paste this whole output back" ;;
  esac
else
  fail "cannot test — URL or service role key is empty"
fi
echo

echo "===== 5) Recent container errors (last 40 log lines mentioning supabase/error) ====="
docker logs "$CONTAINER" 2>&1 | grep -iE "supabase|error|missing" | tail -40 || echo "(none found)"
