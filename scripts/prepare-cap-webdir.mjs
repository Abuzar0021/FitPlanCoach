// Capacitor's `cap sync` requires the `webDir` folder (`dist`, per
// capacitor.config.ts) to exist, or the sync step fails with
// "Web asset directory specified by webDir does not exist" — even though its
// *contents* are never actually shown to the user, since capacitor.config.ts
// sets `server.url` and the Android WebView always navigates to the live
// site instead of loading local files.
//
// `npm run build` (Nitro/vite) does NOT produce a `dist/` folder outside the
// Lovable cloud sandbox — it builds to `.output/` instead (Cloudflare-module
// format locally, node-server format when NITRO_PRESET=node-server, as set by
// the VPS Dockerfile). So this script just guarantees `dist/index.html`
// exists as an inert placeholder before `cap sync` runs. It never overwrites
// real content if some already exists there.
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const distDir = join(process.cwd(), "dist");
const indexHtml = join(distDir, "index.html");

if (!existsSync(distDir)) {
  mkdirSync(distDir, { recursive: true });
}

if (!existsSync(indexHtml)) {
  writeFileSync(
    indexHtml,
    "<!doctype html>\n<title>FitPlanCoach</title>\n<p>Placeholder only — the Android app loads the live site via server.url in capacitor.config.ts, this file is never shown.</p>\n",
  );
}
