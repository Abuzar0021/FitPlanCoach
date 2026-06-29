# syntax=docker/dockerfile:1.7
###############################################################################
# FitPlanCoach — production image for a Node VPS (Contabo Ubuntu 24)
#
# The app is a TanStack Start + Nitro SSR application. By default the Lovable
# Vite preset builds Nitro for Cloudflare (a Worker that does NOT run under
# Node). For a VPS we force Nitro's `node-server` preset, which emits a
# self-contained `.output/` whose entry `node .output/server/index.mjs` starts a
# real Node HTTP server. Nitro bundles all server deps into `.output/server/_libs`,
# so the runtime image needs only Node + `.output` (no node_modules).
#
# IMPORTANT — build-time vs runtime env:
#   * VITE_* vars are INLINED INTO THE CLIENT BUNDLE AT BUILD TIME → passed as
#     build ARGs below. Changing them requires a rebuild.
#   * Server secrets (SUPABASE_SERVICE_ROLE_KEY, GOOGLE_PLAY_*, LOVABLE_*) are
#     read from process.env AT RUNTIME → injected by docker-compose `env_file`.
###############################################################################

# ---------- Stage 1: build ----------
FROM node:22-bookworm-slim AS builder
WORKDIR /app

# Force the Node server preset (overrides the default Cloudflare preset).
ENV NITRO_PRESET=node-server
ENV NODE_ENV=production

# Public-facing, build-time-inlined config. Provide real values via compose
# build args (docker-compose passes them from your --env-file). Empty defaults
# keep the build from failing, but the app cannot reach Supabase until rebuilt
# with real values.
ARG VITE_SUPABASE_URL=""
ARG VITE_SUPABASE_PUBLISHABLE_KEY=""
ARG VITE_SUPABASE_PROJECT_ID=""
ARG VITE_PLAY_STORE_URL=""
ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL \
    VITE_SUPABASE_PUBLISHABLE_KEY=$VITE_SUPABASE_PUBLISHABLE_KEY \
    VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID \
    VITE_PLAY_STORE_URL=$VITE_PLAY_STORE_URL

# Install dependencies first (better layer caching). We use npm against the
# public registry: the committed bun.lock points at Lovable's private registry,
# which is not reachable from a generic VPS. All deps (incl. @lovable.dev/*) are
# published on the public npm registry.
COPY package.json ./
RUN npm install --no-audit --no-fund

# Build the SSR app → .output (node-server preset).
COPY . .
RUN npm run build \
    && test -f .output/server/index.mjs \
    && echo "Build OK: .output/server/index.mjs present"

# ---------- Stage 2: runtime ----------
FROM node:22-bookworm-slim AS runtime
WORKDIR /app

ENV NODE_ENV=production \
    # Nitro node-server reads these. Container-internal port; the host port is
    # mapped in docker-compose (bound to 127.0.0.1 for safe reverse-proxying).
    PORT=3000 \
    HOST=0.0.0.0 \
    NITRO_PORT=3000 \
    NITRO_HOST=0.0.0.0

# Self-contained Nitro output — no node_modules needed at runtime.
COPY --from=builder --chown=node:node /app/.output ./.output

# Drop privileges.
USER node

EXPOSE 3000

# Liveness: the Node server serves /robots.txt statically; a 200 proves the HTTP
# server is up. Uses Node's global fetch (no curl/wget needed in the slim image).
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:'+(process.env.PORT||3000)+'/robots.txt').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["node", ".output/server/index.mjs"]
