import type { CapacitorConfig } from "@capacitor/cli";

// Capacitor configuration for the FitPlanCoach Android app.
//
// NOTE: FitPlanCoach is a TanStack Start (SSR) PWA. Two delivery options:
//   1. TWA / Bubblewrap (recommended for this PWA) — supports Google Play
//      Billing via the Digital Goods API. See ANDROID release runbook.
//   2. Capacitor (this file) — wraps the site in a native shell. Because the
//      app is server-rendered, point `server.url` at the deployed site, or run
//      a static client build into `webDir`. Add a Play Billing plugin for IAP.
//
// To use Capacitor:
//   npm i @capacitor/core @capacitor/cli @capacitor/android
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
