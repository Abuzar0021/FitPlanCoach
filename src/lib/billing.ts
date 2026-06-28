// Google Play Billing integration seam.
//
// Premium is sold ONLY inside the Android app via Google Play Billing — never
// on the web. This module is the single client-side entry point for purchases.
//
// IMPORTANT (security): the backend (Supabase `subscriptions` table) is the
// source of truth for entitlements. The client NEVER grants premium itself.
// After a purchase, the Play purchase token must be sent to the backend, which
// verifies it against the Google Play Developer API before unlocking Pro.
//
// In the Capacitor Android build, wire the two TODO blocks below to your
// in-app-purchase plugin (e.g. @capacitor-community/in-app-purchases or
// RevenueCat). On the web there is no purchase flow by design.

export type PlanInterval = "monthly" | "annual";

/** Play Console subscription product / base-plan ids. */
export const PLAY_PRODUCTS: Record<PlanInterval, string> = {
  monthly: "fitplancoach_pro_monthly",
  annual: "fitplancoach_pro_annual",
};

/** Deep link to manage or cancel a subscription in Google Play. */
export const PLAY_MANAGE_URL = "https://play.google.com/store/account/subscriptions";

export type BillingResult =
  | { ok: true }
  | { ok: false; reason: "unavailable_on_web" | "not_implemented" | "cancelled" | "error"; message?: string };

/** True when running inside the native Android (Capacitor) shell. */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Start a Pro purchase. Web users cannot buy here — premium is purchased in the
 * Android app, so callers should surface a "get the app" path for web.
 */
export async function startProPurchase(_interval: PlanInterval): Promise<BillingResult> {
  if (!isAndroidApp()) return { ok: false, reason: "unavailable_on_web" };
  // TODO (Android build): launch the Play Billing flow for PLAY_PRODUCTS[_interval],
  // then POST the resulting purchase token to the backend verifier, which calls
  // the Google Play Developer API and updates the `subscriptions` table.
  return { ok: false, reason: "not_implemented", message: "Please update to the latest app version." };
}

/** Restore previously purchased subscriptions (Android only). */
export async function restorePurchases(): Promise<BillingResult> {
  if (!isAndroidApp()) return { ok: false, reason: "unavailable_on_web" };
  // TODO (Android build): query the plugin for active purchases and re-verify
  // each token with the backend so entitlements are restored from the server.
  return { ok: false, reason: "not_implemented", message: "Please update to the latest app version." };
}
