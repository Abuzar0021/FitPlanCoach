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
# Node 22 LTS, FULL image (not slim): @tanstack/react-start requires Node
# >=22.12 (Node 22 "Jod" is an LTS line), and the full image ships the toolchain
# (python3/make/g++) that dependency file-tracing needs — avoiding the
# @vercel/nft / native-build errors. The real stability fix is the lockfile +
# npm ci below; the Node version was never the cause of the build failure.
FROM node:22-bookworm AS builder
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

# Deterministic install from the committed lockfile (this is the fix for the
# "npm run build fails with @vercel/nft / ESM-CJS" loop: without a lock, npm
# pulled newer, incompatible transitive versions). `npm ci` installs the EXACT
# versions that are verified to build. We use npm (not bun) because the committed
# bun.lock targets Lovable's private registry, unreachable from a generic VPS;
# all deps (incl. @lovable.dev/*) are on the public npm registry.
COPY package.json package-lock.json ./
RUN npm ci --no-audit --no-fund

# Build the SSR app → .output (node-server preset).
COPY . .
RUN npm run build \
    && test -f .output/server/index.mjs \
    && echo "Build OK: .output/server/index.mjs present"

# ---------- Stage 2: runtime ----------
# Node 22 LTS slim — runs the self-contained .output (no build pipeline, no
# node_modules, no Nitro build step at runtime; just a plain Node HTTP server).
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
