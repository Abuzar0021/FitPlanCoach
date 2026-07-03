// Google AdSense configuration. The publisher/client id is the one fixed
// value every ad unit on the site shares (safe to hardcode — it identifies
// the AdSense *account*, not a specific ad). Individual ad *unit* slot ids
// are NOT hardcoded: each one is created later in the AdSense dashboard and
// wired in via an env var. Until an env var is set, that ad slot simply
// doesn't render anywhere — see src/components/ads/AdSlot.tsx.
export const ADSENSE_CLIENT_ID = "ca-pub-6853704869343091";

function slotEnv(name: string): string {
  return ((import.meta.env[name] as string | undefined) ?? "").trim();
}

/** Ad unit slot ids, one per placement. Set these in .env.production once
 * you've created the corresponding ad units in the AdSense dashboard:
 *   VITE_ADSENSE_SLOT_TOP_ARTICLE
 *   VITE_ADSENSE_SLOT_IN_CONTENT
 *   VITE_ADSENSE_SLOT_SIDEBAR
 *   VITE_ADSENSE_SLOT_BOTTOM_ARTICLE
 */
export const AD_SLOTS = {
  topArticle: slotEnv("VITE_ADSENSE_SLOT_TOP_ARTICLE"),
  inContent: slotEnv("VITE_ADSENSE_SLOT_IN_CONTENT"),
  sidebar: slotEnv("VITE_ADSENSE_SLOT_SIDEBAR"),
  bottomArticle: slotEnv("VITE_ADSENSE_SLOT_BOTTOM_ARTICLE"),
};

/** True once at least one ad unit id has been configured. */
export const isAdsenseConfigured = Object.values(AD_SLOTS).some((s) => s.length > 0);
