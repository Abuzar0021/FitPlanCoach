import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor configuration for the FitPlanCoach Android app.
//
// This is the active packaging path: a native Capacitor shell (Kotlin +
// WebView) that loads the deployed SSR site via `server.url` below. It ships
// real Google Play Billing using the official Play Billing Library, bridged
// via the `capacitor-plugin-cdv-purchase` native plugin (see src/lib/billing.ts)
// — the TWA/Digital-Goods-API alternative previously noted here does NOT
// support the native Play Billing Library the same way and was not used.
//
// @capacitor/core, @capacitor/cli, @capacitor/android, and
// capacitor-plugin-cdv-purchase are already in package.json. `webDir: dist`
// below must exist before syncing — `cap sync` copies whatever's there into
// android/app/src/main/assets/public. Its *contents* don't matter (the
// WebView always navigates to `server.url` at runtime, never local files),
// but the folder itself must exist or `cap sync` fails outright with
// "Web asset directory specified by webDir does not exist".
//
// IMPORTANT: outside the Lovable cloud sandbox, `npm run build` (vite/Nitro)
// does NOT create a `dist/` folder at all — it builds to `.output/` instead
// (Cloudflare-module format by default, or node-server format when
// NITRO_PRESET=node-server, as set by the VPS Dockerfile). So always run:
//   npm run cap:sync
// which does `npm run build` → `node scripts/prepare-cap-webdir.mjs` (creates
// a trivial placeholder `dist/index.html` if one isn't already there) →
// `npx cap sync android`. Don't run bare `npx cap sync android` after a bare
// `npm run build` — `dist/` won't exist and the sync step will fail. To
// (re)generate the native project from scratch: npx cap add android.
const config: CapacitorConfig = {
  appId: "com.fitplancoach.app",
  appName: "FitPlanCoach",
  webDir: "dist",
  android: {
    backgroundColor: "#0a0f0c",
  },
  // For the SSR app, load the deployed site in the native webview:
  server: {
    url: "https://fitplancoach.com",
    androidScheme: "https",
    cleartext: false,
  },
};

export default config;
