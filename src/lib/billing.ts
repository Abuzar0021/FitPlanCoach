// Google Play Billing integration.
//
// Premium is sold ONLY inside the Android app via Google Play Billing — never
// on the web. This module is the single client-side entry point for purchases.
//
// IMPORTANT (security): the backend (Supabase `subscriptions` table) is the
// source of truth for entitlements. The client NEVER grants premium itself —
// every purchase, restore, and renewal is re-verified server-side against the
// real Google Play Developer API (see verifyPlayPurchase in
// billing.functions.ts) before Pro is unlocked.
//
// Uses `capacitor-plugin-cdv-purchase`, a thin, direct bridge to Android's
// real Play Billing Library (no third-party purchase backend/account
// required) — it only reports native purchase events; all entitlement
// decisions still flow through our own server.
//
// Play Integrity (optional hardening): if VITE_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER
// is set, a fresh purchase attaches an integrity token the server can verify
// this is a genuine, unmodified app install — see requestIntegrityTokenFor()
// below and verifyPlayIntegrityToken() in billing.functions.ts. This is
// strictly best-effort and non-blocking: if the token can't be obtained (not
// configured, API unavailable, non-Play install), the purchase proceeds
// exactly as it would without it. It is a defense-in-depth signal on top of
// the purchase-token verification, never a replacement for it — that's the
// one check that must never be skipped.

import { verifyPlayPurchase } from "@/lib/billing.functions";

export type PlanInterval = "monthly" | "annual";

/** Play Console subscription product ids. */
export const PLAY_PRODUCTS: Record<PlanInterval, string> = {
  monthly: "fitplancoach_pro_monthly",
  annual: "fitplancoach_pro_annual",
};

/** Deep link to manage or cancel a subscription in Google Play. */
export const PLAY_MANAGE_URL = "https://play.google.com/store/account/subscriptions";

export type BillingResult =
  | { ok: true }
  | {
      ok: false;
      reason: "unavailable_on_web" | "cancelled" | "error";
      message?: string;
    };

/** True when running inside the native Android (Capacitor) shell. */
export function isAndroidApp(): boolean {
  if (typeof window === "undefined") return false;
  const cap = (window as { Capacitor?: { isNativePlatform?: () => boolean } }).Capacitor;
  return Boolean(cap?.isNativePlatform?.());
}

/**
 * Send a Play purchase token to the backend for server-side verification.
 * This is the only path that can unlock premium — the native purchase flow
 * calls it after a successful purchase or restore. `integrity` is optional
 * best-effort hardening (see module header); omit it and verification still
 * works exactly as before.
 */
export async function verifyAndroidPurchase(
  purchaseToken: string,
  productId: string,
  integrity?: { token: string; nonce: string },
): Promise<{ ok: boolean; reason?: string }> {
  const res = await verifyPlayPurchase({
    data: {
      purchaseToken,
      productId,
      integrityToken: integrity?.token,
      integrityNonce: integrity?.nonce,
    },
  });
  return res.ok ? { ok: true } : { ok: false, reason: "reason" in res ? res.reason : "error" };
}

/** Base64url, unpadded — the exact nonce shape Play Integrity requires. */
function randomNonce(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  let binary = "";
  for (const b of bytes) binary += String.fromCharCode(b);
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Best-effort: request a Play Integrity token for this purchase attempt.
 * Returns null (never throws) if unconfigured or unavailable — callers must
 * proceed with the purchase either way. Returns the nonce alongside the
 * token so the server can confirm the token wasn't replayed from elsewhere.
 */
async function requestIntegrityToken(): Promise<{ token: string; nonce: string } | null> {
  const projectNumber = Number(import.meta.env.VITE_GOOGLE_PLAY_CLOUD_PROJECT_NUMBER ?? "");
  if (!projectNumber) return null; // not configured — silently skip, purchase proceeds unaffected
  try {
    const { PlayIntegrity } = await import("@capacitor-community/play-integrity");
    const nonce = randomNonce();
    const { token } = await PlayIntegrity.requestIntegrityToken({
      nonce,
      googleCloudProjectNumber: projectNumber,
    });
    return token ? { token, nonce } : null;
  } catch (e) {
    console.warn("[billing] Play Integrity token unavailable, continuing without it:", e);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Native store wiring. Only ever touched inside the Android shell — the
// dynamic import keeps the plugin (and its native-bridge calls) out of the
// web bundle's execution path entirely.
// ---------------------------------------------------------------------------

type StoreModule = typeof import("capacitor-plugin-cdv-purchase");
let storeModulePromise: Promise<StoreModule> | null = null;
let initialized = false;

/** Resolvers for an in-flight purchase, keyed by product id. */
const pendingPurchases = new Map<string, (r: BillingResult) => void>();
/** Play Integrity token+nonce captured just before `order()`, consumed by the `approved` handler for the same product. */
const pendingIntegrityTokens = new Map<string, { token: string; nonce: string }>();

async function getInitializedStore(): Promise<StoreModule> {
  if (!storeModulePromise) {
    storeModulePromise = (async () => {
      const mod = await import("capacitor-plugin-cdv-purchase");
      return mod;
    })();
  }
  const mod = await storeModulePromise;

  if (!initialized) {
    initialized = true;
    const { store, ProductType, Platform } = mod;

    store.register(
      Object.values(PLAY_PRODUCTS).map((id) => ({
        id,
        platform: Platform.GOOGLE_PLAY,
        type: ProductType.PAID_SUBSCRIPTION,
      })),
    );

    store.when().approved(async (transaction) => {
      await handleApprovedTransaction(mod, transaction);
    });

    // No local receipt validator is configured — verification always goes
    // through our own server (verifyPlayPurchase), never a third party.
    await store.initialize([{ platform: Platform.GOOGLE_PLAY }]);
  }

  return mod;
}

/**
 * A transaction became "approved" by Google Play — either from a fresh
 * purchase (`order()`) or from `restorePurchases()` re-syncing ownership.
 * Extract the real purchase token, verify it against our own server, and
 * only `finish()` (acknowledge) the transaction once the server confirms it.
 * If verification fails, the transaction is deliberately left unfinished so
 * the plugin re-delivers it (next launch / restore) instead of the purchase
 * silently vanishing — Google auto-refunds anything never acknowledged
 * within 3 days, which is the correct fail-safe here.
 */
async function handleApprovedTransaction(
  mod: StoreModule,
  transaction: InstanceType<StoreModule["CdvPurchase"]["Transaction"]>,
): Promise<void> {
  const productId = transaction.products[0]?.id;
  const receipt = transaction.parentReceipt as { purchaseToken?: string } | undefined;
  const purchaseToken = receipt?.purchaseToken;
  const resolveWaiter = productId ? pendingPurchases.get(productId) : undefined;
  const integrity = productId ? pendingIntegrityTokens.get(productId) : undefined;
  if (productId) {
    pendingPurchases.delete(productId);
    pendingIntegrityTokens.delete(productId);
  }

  if (!productId || !purchaseToken) {
    resolveWaiter?.({
      ok: false,
      reason: "error",
      message: "Purchase data was incomplete — please try again.",
    });
    return;
  }

  const verified = await verifyAndroidPurchase(purchaseToken, productId, integrity);
  if (verified.ok) {
    await transaction.finish();
    resolveWaiter?.({ ok: true });
  } else {
    resolveWaiter?.({
      ok: false,
      reason: "error",
      message:
        "We couldn't verify that purchase yet — pull to refresh or try Restore Purchases in a moment.",
    });
  }
}

/**
 * Start a Pro purchase via Google Play Billing. Web users cannot buy here —
 * premium is purchased in the Android app only.
 */
export async function startProPurchase(interval: PlanInterval): Promise<BillingResult> {
  if (!isAndroidApp()) return { ok: false, reason: "unavailable_on_web" };

  try {
    const { store, ErrorCode } = await getInitializedStore();
    const productId = PLAY_PRODUCTS[interval];
    const product = store.get(productId);
    const offer = product?.getOffer();
    if (!offer) {
      return {
        ok: false,
        reason: "error",
        message: "This plan isn't available right now — please try again shortly.",
      };
    }

    // Best-effort — never blocks the purchase if unavailable (see module header).
    const integrity = await requestIntegrityToken();
    if (integrity) pendingIntegrityTokens.set(productId, integrity);

    return await new Promise<BillingResult>((resolve) => {
      pendingPurchases.set(productId, resolve);
      offer
        .order()
        .then((err) => {
          if (!err) return; // success resolves via the `approved` handler above
          pendingPurchases.delete(productId);
          resolve(
            err.code === ErrorCode.PAYMENT_CANCELLED
              ? { ok: false, reason: "cancelled" }
              : {
                  ok: false,
                  reason: "error",
                  message: err.message || "Purchase could not be completed.",
                },
          );
        })
        .catch((e: unknown) => {
          pendingPurchases.delete(productId);
          resolve({
            ok: false,
            reason: "error",
            message: e instanceof Error ? e.message : "Purchase could not be completed.",
          });
        });
    });
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Purchase could not be completed.",
    };
  }
}

/**
 * Restore previously purchased subscriptions (Android only). Re-verifies
 * every locally-known Google Play transaction for our products against the
 * server — not just ones that re-fire an `approved` event — so restore also
 * works after a reinstall or on a new device where the local plugin state
 * has no prior "approved" transaction to replay.
 */
export async function restorePurchases(): Promise<BillingResult> {
  if (!isAndroidApp()) return { ok: false, reason: "unavailable_on_web" };

  try {
    const mod = await getInitializedStore();
    const { store, Platform } = mod;
    const err = await store.restorePurchases();
    if (err) {
      return { ok: false, reason: "error", message: err.message || "Nothing to restore." };
    }

    const knownProductIds = new Set<string>(Object.values(PLAY_PRODUCTS));
    const ourTransactions = store.localTransactions.filter(
      (t) =>
        t.platform === Platform.GOOGLE_PLAY && t.products.some((p) => knownProductIds.has(p.id)),
    );

    if (ourTransactions.length === 0) {
      return {
        ok: false,
        reason: "error",
        message: "No previous purchase found for this account.",
      };
    }

    let anyVerified = false;
    for (const t of ourTransactions) {
      const receipt = t.parentReceipt as { purchaseToken?: string } | undefined;
      const productId = t.products[0]?.id;
      if (!receipt?.purchaseToken || !productId) continue;
      const verified = await verifyAndroidPurchase(receipt.purchaseToken, productId);
      if (verified.ok) {
        anyVerified = true;
        await t.finish();
      }
    }

    return anyVerified
      ? { ok: true }
      : {
          ok: false,
          reason: "error",
          message: "We couldn't verify a previous purchase for this account.",
        };
  } catch (e) {
    return {
      ok: false,
      reason: "error",
      message: e instanceof Error ? e.message : "Restore failed.",
    };
  }
}
