# FitPlanCoach — Google Play Publishing Guide (Capacitor)

The Android app is a native Capacitor shell that loads the live site
(`https://fitplancoach.com`, via `server.url` in `capacitor.config.ts`) in a
WebView, with two native plugins for things a WebView can't do on its own:
real Google Play Billing (`capacitor-plugin-cdv-purchase`) and, optionally,
Play Integrity (`@capacitor-community/play-integrity`). It auto-updates web
content when you update the site; only native changes (a new plugin, a
permission, an SDK bump) need a new Play upload.

- **Package name:** `com.fitplancoach.app` (`capacitor.config.ts`,
  `android/app/build.gradle`)
- **Prereqs:** a Google Play Developer account ($25 one-time), the live HTTPS
  site (done), a PNG icon ≥512×512 (`public/icon-512.png`), Android Studio
  (or the Android SDK + a JDK) to actually build the AAB — that step can't be
  done from this sandbox, see "What's already done in code" below.

---

## What's already done in code

- **`android/`** — the real native project (`npx cap add android` /
  `npx cap sync android`), with both plugins registered and their Gradle
  dependencies wired (confirmed in the generated Gradle files, not assumed):
  `com.android.billingclient:billing:9.0.0` and
  `com.google.android.play:integrity:1.6.0`.
- **Google Play Billing** — real purchase flow (`src/lib/billing.ts`),
  real server-side verification against the Play Developer API
  (`src/lib/billing.functions.ts`), restore purchases, and a Real-Time
  Developer Notifications webhook (`src/routes/api/public/google-play/rtdn.ts`)
  that keeps entitlements in sync on renewal/cancellation without the user
  needing to reopen the app. This is NOT a stub — see "Billing setup" below
  for the manual Play Console side.
- **Release signing config** (`android/app/build.gradle`) — reads a local
  upload keystore from `android/keystore.properties` (gitignored; template at
  `android/keystore.properties.example`). Play App Signing re-signs with the
  key it manages after upload; you still sign the AAB with an upload key
  first.
- **Digital Asset Links** — `public/.well-known/assetlinks.json`, served
  statically at `https://fitplancoach.com/.well-known/assetlinks.json`, plus
  the `autoVerify` App Links `intent-filter` in `AndroidManifest.xml` for the
  whole `fitplancoach.com` domain (so e.g. the password-reset email link
  opens directly in the app).

---

## Phase 1 — Create the Google Play Developer account
1. Go to https://play.google.com/console → sign in with the Google account you
   want to own the app.
2. Pay the **$25 one-time** registration fee.
3. Choose account type **Personal** (or Organization if you have a company).
4. Complete identity verification (Google may take a few hours to approve).

---

## Phase 2 — Build the signed AAB (Android Studio)
This is the one step that genuinely requires a real machine with the Android
SDK — it cannot be done from a sandboxed CLI environment.

1. From the project root, **build the web app and sync Capacitor before
   opening Android Studio**:
   ```bash
   npm install
   npm run cap:sync   # build -> ensure dist/ exists -> npx cap sync android
   ```
   Always use `npm run cap:sync`, never a bare `npx cap sync android`. Here's
   why: `npm run build` (vite/Nitro) does **not** produce a `dist/` folder on
   a normal machine — it builds to `.output/` instead (Cloudflare-module
   format by default, or node-server format when `NITRO_PRESET=node-server`,
   as the VPS Dockerfile sets). Only inside Lovable's cloud sandbox does the
   build get redirected into `dist/`. Since `cap sync` requires `webDir`
   (`dist/`) to merely *exist* — its contents are irrelevant, because the
   WebView always navigates to `server.url` at runtime, never local files —
   `npm run cap:sync` runs `scripts/prepare-cap-webdir.mjs` after the build to
   create a trivial placeholder `dist/index.html` if one isn't already
   there. Skipping this (e.g. running `vite build` then `npx cap sync
   android` directly) fails with "Web asset directory specified by webDir
   does not exist".
2. Open the `android/` folder in Android Studio (**File → Open**).
3. Let it finish Gradle sync (first run downloads the SDK/AGP — takes a few
   minutes).
4. Create your upload keystore, if you don't have one yet:
   ```bash
   keytool -genkeypair -v -keystore fitplancoach-upload.jks \
     -alias fitplancoach -keyalg RSA -keysize 2048 -validity 9125
   ```
   Put it somewhere durable (not inside `android/`, though it can be — either
   way it's gitignored) and back it up. Losing it means you can't sign
   updates the same way again (Play App Signing's key-reset flow can recover
   from this, but it's a hassle — keep a copy somewhere safe).
5. Copy `android/keystore.properties.example` to `android/keystore.properties`
   and fill in `storeFile` (path to the .jks above), `storePassword`,
   `keyAlias`, `keyPassword`. This file is gitignored — never commit it.
6. **Build → Generate Signed App Bundle / APK → Android App Bundle**, or from
   the command line: `./gradlew bundleRelease` (uses the signing config from
   step 4 automatically). The AAB lands in
   `android/app/build/outputs/bundle/release/app-release.aab`.

---

## Phase 3 — Verify domain ownership (assetlinks.json)
Already scaffolded at `public/.well-known/assetlinks.json`:
```json
[
  {
    "relation": ["delegate_permission/common.handle_all_urls"],
    "target": {
      "namespace": "android_app",
      "package_name": "com.fitplancoach.app",
      "sha256_cert_fingerprints": ["REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT"]
    }
  }
]
```
1. After your first upload with Play App Signing enabled (Phase 6), get the
   real fingerprint: **Play Console → your app → Setup → App integrity → App
   signing → SHA-256 certificate fingerprint**.
2. Replace `REPLACE_WITH_YOUR_APP_SIGNING_SHA256_FINGERPRINT` in
   `public/.well-known/assetlinks.json` with that value.
3. Redeploy (`git pull` on the VPS → `docker compose --env-file .env.docker up -d --build`).
4. Verify: `curl https://fitplancoach.com/.well-known/assetlinks.json`.

---

## Phase 4 — Billing setup (Play Console)
The code is complete and already server-verifies every purchase against the
real Play Developer API — these are the Play Console/Cloud steps needed to
turn it on:

1. **Create the two subscription products** — Play Console → your app →
   Monetize → Products → Subscriptions → Create subscription, with exactly
   these IDs (already hardcoded in `src/lib/billing.ts`):
   - `fitplancoach_pro_monthly`
   - `fitplancoach_pro_annual`
2. **Service account for server-side verification** — Play Console → Setup →
   API access → link/create a Google Cloud project → create a service
   account with the **"Financial data, subscriptions, orders"** Play
   Console permission. Download its JSON key and set
   `GOOGLE_PLAY_SERVICE_ACCOUNT_JSON` (or the split `GOOGLE_PLAY_SA_EMAIL` +
   `GOOGLE_PLAY_SA_PRIVATE_KEY`) in `.env.docker` on the VPS.
3. **Real-Time Developer Notifications** (keeps renewals/cancellations in
   sync without the user reopening the app):
   - Create a Pub/Sub topic in the same Cloud project, grant Publish rights
     to `google-play-developer-notifications@system.gserviceaccount.com`.
   - Play Console → Monetize setup → Real-time developer notifications → set
     that topic.
   - Create a **push** subscription on the topic targeting
     `https://fitplancoach.com/api/public/google-play/rtdn?token=<secret>`,
     where `<secret>` is a random string you generate
     (`openssl rand -hex 32`) — set the same value as
     `GOOGLE_PLAY_RTDN_SECRET` in `.env.docker`. This is a webhook secret you
     create yourself, not a Google credential.
4. **(Optional) Play Integrity hardening** — Play Console → your app → App
   integrity → note the Cloud project number, set
   `VITE_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER` in `.env.docker` (this is a
   **build-time** var — requires `--build` to take effect). Purchases work
   identically with or without this; it only adds an extra, non-blocking
   verification signal.

---

## Phase 5 — Create the app in Play Console
1. Play Console → **Create app**. Name `FitPlanCoach`, language, **App**, **Free**.
2. Accept declarations → **Create app**.
3. Complete **Dashboard → Set up your app**:
   - **App access:** provide a test login (a demo Supabase user) so Google can review.
   - **Ads:** No, unless you add them.
   - **Content rating:** fitness app → likely Everyone.
   - **Target audience:** 18+ (or 13+); not designed for children.
   - **Data safety:** declare email (account), app activity/analytics,
     encrypted in transit. Privacy policy: `https://fitplancoach.com/privacy`.
   - **Government apps / Health:** No to government; general fitness app, no
     medical claims.
   - **Account deletion:** `https://fitplancoach.com/delete-account`.

---

## Phase 6 — Store listing
- **App name:** FitPlanCoach
- **Short description** (≤80 chars): e.g. "Personalized meal plans, workouts &
  progress tracking — tuned to you."
- **Full description** (≤4000 chars): what the app does.
- **App icon:** 512×512 PNG (`public/icon-512.png`).
- **Feature graphic:** 1024×500 PNG.
- **Phone screenshots:** 2–8, min 320px side, from the live app.
- **Category:** Health & Fitness. **Contact email:** abuzarelahi01@gmail.com.

---

## Phase 7 — Upload + test + release
1. **Testing → Internal testing → Create new release.**
2. Upload the AAB from Phase 2. When prompted, **enable Google Play App
   Signing** (recommended — Google holds the real distribution key, your
   local keystore only signs the upload).
3. Release name = version (e.g. `1 (1.0.0)`). Add release notes → **Save →
   Review → Start rollout to Internal testing.**
4. Add your own Google account as a tester → install via the opt-in link →
   verify:
   - The app opens `fitplancoach.com` full-screen (no URL bar).
   - Generate/purchase a Pro subscription with a **license test account**
     (Play Console → Setup → License testing) so you're not charged real
     money, and confirm it unlocks Pro in the app and the `subscriptions`
     row updates in Supabase.
   - Tap **Restore purchases** on a fresh install/second device and confirm
     it restores correctly.
5. When happy: **Production → Create new release** → reuse the same AAB →
   roll out. Google review typically takes a few hours to a few days.

---

## Phase 8 — After it's published
- The website's "Get it on Google Play" buttons are already live: the listing
  URL is the built-in default in `src/lib/app-config.ts`, derived from
  `ANDROID_PACKAGE_ID`. `VITE_PLAY_STORE_URL` only overrides it, for a preview
  build pointed at a different listing.
- Bump `versionCode`/`versionName` in `android/app/build.gradle` (and mirror
  them in `src/lib/app-config.ts`'s `ANDROID_VERSION_CODE`/`APP_VERSION`,
  which are display-only but should stay in sync) for each future native
  update — Play rejects an upload whose versionCode was already used.
