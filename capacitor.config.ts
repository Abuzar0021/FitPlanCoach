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
// capacitor-plugin-cdv-purchase are already in package.json. To (re)generate
// the native Android project from this config:
//   npx cap add android && npx cap sync android
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
