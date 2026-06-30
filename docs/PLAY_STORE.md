# FitPlanCoach — Google Play Publishing Guide (TWA)

Publish the live PWA (`https://fitplancoach.com`) to Google Play as a Trusted Web
Activity (TWA). The Android app is a thin wrapper around the website, so it
auto-updates when you update the site.

- **Package name:** `com.fitplancoach.app` (must match `capacitor.config.ts`)
- **Prereqs:** a Google Play Developer account ($25 one-time), the live HTTPS
  site (done), a PNG icon ≥512×512 (you have `public/icon-512.png`).

There are two ways to build the Android app. **Path A (PWABuilder) is the
easiest — no local tools.** Path B (Bubblewrap CLI) is for terminal users.

---

## Phase 1 — Create the Google Play Developer account
1. Go to https://play.google.com/console → sign in with the Google account you
   want to own the app.
2. Pay the **$25 one-time** registration fee.
3. Choose account type **Personal** (or Organization if you have a company).
4. Complete identity verification (Google may take a few hours to approve).

---

## Phase 2 — Build the Android app (.aab)

### Path A — PWABuilder (recommended, web-based)
1. Go to **https://www.pwabuilder.com**.
2. Enter `https://fitplancoach.com` → **Start**.
3. It analyzes your manifest. Click **Package For Stores → Android**.
4. Choose **"Google Play"** package type. Confirm:
   - Package ID: `com.fitplancoach.app`
   - App name: `FitPlanCoach`
   - Launcher name: `FitPlanCoach`
   - Signing key: **"Create new"** (PWABuilder generates one) — **download and
     keep the signing key .zip safe**; you need it for every future update.
5. Click **Generate** → download the `.zip`. It contains:
   - `app-release-bundle.aab`  ← upload this to Play
   - `assetlinks.json`         ← host this on your domain (Phase 3)
   - `signing-key-info` (key + passwords) ← store securely (offline backup)

### Path B — Bubblewrap (CLI, on your computer)
```bash
npm install -g @bubblewrap/cli
bubblewrap init --manifest https://fitplancoach.com/manifest.webmanifest
# accept package com.fitplancoach.app; it pulls name/icon/colors from the manifest.
# It offers to install the JDK + Android SDK automatically — say yes.
bubblewrap build
# Produces app-release-signed.aab and tells you the SHA-256 fingerprint.
bubblewrap fingerprint list   # prints the fingerprint for assetlinks.json
```

---

## Phase 3 — Verify domain ownership (assetlinks.json)
This removes the browser URL bar so it looks like a real app. You host a file at
`https://fitplancoach.com/.well-known/assetlinks.json` containing your app's
signing-key SHA-256 fingerprint.

1. Get the fingerprint:
   - **PWABuilder:** it's inside the generated `assetlinks.json`.
   - **Play App Signing (after first upload):** Play Console → your app →
     **Setup → App integrity → App signing** → copy the **SHA-256 certificate
     fingerprint**. (Use THIS one if you enable Play App Signing — it differs
     from your local key.)
2. The file looks like:
   ```json
   [{
     "relation": ["delegate_permission/common.handle_all_urls"],
     "target": {
       "namespace": "android_app",
       "package_name": "com.fitplancoach.app",
       "sha256_cert_fingerprints": ["AB:CD:...:EF"]
     }
   }]
   ```
3. Host it on the server. Easiest: add it to the repo and redeploy:
   - put the file at `public/.well-known/assetlinks.json`
   - `git pull` on the VPS → `docker compose --env-file .env.docker up -d --build`
   - verify: `curl https://fitplancoach.com/.well-known/assetlinks.json`
   (Ask Claude to add the file to the repo once you have the fingerprint.)

---

## Phase 4 — Create the app in Play Console
1. Play Console → **Create app**. Name `FitPlanCoach`, language, **App**, **Free**.
2. Accept declarations → **Create app**.
3. Complete **Dashboard → Set up your app**:
   - **App access:** if login is required to see content, provide a test
     login (create a demo Supabase user) so Google can review.
   - **Ads:** declare whether the app shows ads (No, unless you add them).
   - **Content rating:** fill the questionnaire (fitness app → likely Everyone).
   - **Target audience:** 18+ (or 13+); **not** designed for children.
   - **Data safety:** declare what you collect — email (account), app activity/
     analytics, and that data is encrypted in transit. Privacy policy:
     `https://fitplancoach.com/privacy`.
   - **Government apps / Health:** answer No to government; for health, declare
     it's a general fitness app (no medical claims).
   - **Privacy policy:** `https://fitplancoach.com/privacy`
   - **Account deletion:** provide `https://fitplancoach.com/delete-account`
     (Google requires this for apps with accounts — you already have the page).

---

## Phase 5 — Store listing
**Main store listing** (left menu):
- **App name:** FitPlanCoach
- **Short description** (≤80 chars): e.g. "Personalized meal plans, workouts &
  progress tracking — tuned to you."
- **Full description** (≤4000 chars): what the app does.
- **App icon:** 512×512 PNG (from `public/icon-512.png`).
- **Feature graphic:** 1024×500 PNG (make one in Canva).
- **Phone screenshots:** 2–8, min 320px side. Take them from the live app on a
  phone (or Chrome DevTools device mode).
- **Category:** Health & Fitness. **Contact email:** abuzarelahi01@gmail.com.

---

## Phase 6 — Upload + test + release
1. **Testing → Internal testing → Create new release.**
2. Upload the `.aab`. When prompted, **enable Google Play App Signing** (let
   Google hold the key — recommended).
3. Release name = version (e.g. `1 (1.0.0)`). Add release notes → **Save → Review
   → Start rollout to Internal testing.**
4. Add your own Google account as a tester → install via the opt-in link → verify
   the app opens `fitplancoach.com` full-screen (no URL bar = assetlinks worked).
   - If you see a URL bar, fix Phase 3 (the fingerprint must be the **Play App
     Signing** one once App Signing is enabled), then re-host assetlinks.json.
5. When happy: **Production → Create new release** → reuse the same AAB → roll
   out. Google review typically takes a few hours to a few days.

---

## Phase 7 — After it's published
- Set `VITE_PLAY_STORE_URL` in `.env.docker` to your listing
  (`https://play.google.com/store/apps/details?id=com.fitplancoach.app`), then
  `git pull` + rebuild — the website's "Get it on Google Play" buttons go live.
- Bump `ANDROID_VERSION_CODE` in `src/lib/app-config.ts` for each future Play
  update (the website auto-updates inside the app without a new AAB, but native
  changes need a version bump).

---

## About paid subscriptions (important)
Google requires **Play Billing** for in-app digital purchases. Your app does not
complete purchases yet (the native trigger is a stub; the web pricing page is
informational only), so **launch v1 as a free app** — that's compliant and gets
you on the store fast. Adding real in-app Pro later requires Play Billing via the
Digital Goods API (TWA) or a Capacitor Play Billing plugin; the **server-side
verification is already built** (`src/lib/billing.functions.ts`).
