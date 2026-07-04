import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";

// Google Play subscription product ids -> billing interval.
const PRODUCT_INTERVALS: Record<string, "monthly" | "annual"> = {
  fitplancoach_pro_monthly: "monthly",
  fitplancoach_pro_annual: "annual",
};
const PACKAGE_NAME = "com.fitplancoach.app";

/** Shape of the `purchases.subscriptionsv2.get` response we actually read. */
type GooglePlaySubscriptionV2 = {
  subscriptionState?: string;
  acknowledgementState?: string;
  linkedPurchaseToken?: string;
  lineItems?: Array<{
    productId?: string;
    expiryTime?: string;
    autoRenewingPlan?: { autoRenewEnabled?: boolean };
  }>;
};

function readServiceAccount(): { client_email: string; private_key: string } | null {
  const raw = process.env.GOOGLE_PLAY_SERVICE_ACCOUNT_JSON;
  if (raw) {
    try {
      const j = JSON.parse(raw);
      if (j.client_email && j.private_key) {
        return { client_email: j.client_email, private_key: j.private_key };
      }
    } catch {
      /* fall through to discrete vars */
    }
  }
  const email = process.env.GOOGLE_PLAY_SA_EMAIL;
  const key = process.env.GOOGLE_PLAY_SA_PRIVATE_KEY;
  if (email && key) return { client_email: email, private_key: key.replace(/\\n/g, "\n") };
  return null;
}

/**
 * Mint a short-lived Google API access token from the service account for
 * the given OAuth scope. Returns null (never throws) if the service account
 * is unconfigured or the exchange fails — every caller must treat null as
 * "cannot verify right now".
 */
async function getGoogleAccessToken(scope: string): Promise<string | null> {
  const sa = readServiceAccount();
  if (!sa) {
    console.error(
      "[billing] Google Play service account not configured — refusing to grant premium",
    );
    return null;
  }
  const { createSign } = await import("node:crypto");
  const b64url = (i: Buffer | string) =>
    Buffer.from(i).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  const nowSec = Math.floor(Date.now() / 1000);
  const jwtHeader = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const jwtClaim = b64url(
    JSON.stringify({
      iss: sa.client_email,
      scope,
      aud: "https://oauth2.googleapis.com/token",
      iat: nowSec,
      exp: nowSec + 3600,
    }),
  );
  try {
    const signer = createSign("RSA-SHA256");
    signer.update(`${jwtHeader}.${jwtClaim}`);
    const sig = b64url(signer.sign(sa.private_key));
    const tokRes = await fetch("https://oauth2.googleapis.com/token", {
      method: "POST",
      headers: { "content-type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
        assertion: `${jwtHeader}.${jwtClaim}.${sig}`,
      }),
    });
    if (!tokRes.ok) throw new Error(`oauth ${tokRes.status}`);
    const json = (await tokRes.json()) as { access_token?: string };
    if (!json.access_token) throw new Error("no access_token in response");
    return json.access_token;
  } catch (e) {
    console.error("[billing] access-token error", e);
    return null;
  }
}

/**
 * Fetch the CURRENT, authoritative state of a subscription purchase from
 * Google — the single source of truth every code path (a fresh purchase, a
 * restore, or an RTDN webhook telling us "something changed, go check")
 * ultimately calls. Returns null on any failure.
 */
async function fetchGooglePlaySubscription(
  purchaseToken: string,
  accessToken: string,
): Promise<GooglePlaySubscriptionV2 | null> {
  try {
    const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
      purchaseToken,
    )}`;
    const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
    if (!res.ok) {
      console.error("[billing] Play verify failed", res.status);
      return null;
    }
    return (await res.json()) as GooglePlaySubscriptionV2;
  } catch (e) {
    console.error("[billing] Play verify error", e);
    return null;
  }
}

async function acknowledgeIfPending(
  purchase: GooglePlaySubscriptionV2,
  purchaseToken: string,
  productId: string,
  accessToken: string,
): Promise<void> {
  if (purchase.acknowledgementState !== "ACKNOWLEDGEMENT_STATE_PENDING") return;
  try {
    const ackUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(
      productId,
    )}/tokens/${encodeURIComponent(purchaseToken)}:acknowledge`;
    await fetch(ackUrl, {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
      body: "{}",
    });
  } catch (e) {
    console.error("[billing] acknowledge failed", e);
  }
}

type SubscriptionPatch = Database["public"]["Tables"]["subscriptions"]["Update"];

/**
 * Interpret a verified Play subscription into the DB patch we should apply.
 * ACTIVE and IN_GRACE_PERIOD are the only states Google considers currently
 * entitled — everything else (canceled-and-lapsed, on-hold, paused, expired,
 * revoked) means access ends now, matching what the client's isActive()
 * already assumes. Cancellation-but-still-within-the-paid-period is
 * represented by cancel_at_period_end, not by ending access early.
 */
function buildSubscriptionPatch(
  purchase: GooglePlaySubscriptionV2,
  purchaseToken: string,
): { patch: SubscriptionPatch; productId: string | null; state: string } {
  const state = purchase.subscriptionState ?? "";
  const item = purchase.lineItems?.[0];
  const productId = item?.productId ?? null;
  const expiry = item?.expiryTime ?? null;
  const interval = productId ? (PRODUCT_INTERVALS[productId] ?? null) : null;
  const autoRenewing = item?.autoRenewingPlan?.autoRenewEnabled ?? null;

  const isActive =
    state === "SUBSCRIPTION_STATE_ACTIVE" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";

  if (!isActive) {
    const canceled = state === "SUBSCRIPTION_STATE_CANCELED";
    return {
      patch: {
        plan_type: "free",
        status: canceled ? "cancelled" : "expired",
        ends_at: expiry,
      },
      productId,
      state,
    };
  }

  return {
    patch: {
      plan_type: "pro",
      status: "active",
      billing_interval: interval,
      provider: "google_play",
      provider_ref: purchaseToken,
      current_period_start: new Date().toISOString(),
      current_period_end: expiry,
      expiry_date: expiry,
      renews_at: expiry,
      // autoRenewingPlan.autoRenewEnabled === false is exactly Google Play's
      // "user turned off auto-renew but is still entitled until expiry" state.
      cancel_at_period_end: autoRenewing === false,
      ends_at: null,
    },
    productId,
    state,
  };
}

/**
 * Re-verify a purchase token against Google and write the resulting
 * entitlement to whichever user's subscriptions row matches it. Used by
 * both the authenticated client-verification path (which already knows the
 * user) and the RTDN webhook (which has to look the user up by token).
 * Never throws — every failure mode is logged and treated as "try again
 * later" rather than crashing the caller.
 */
async function verifyAndApply(
  purchaseToken: string,
  userId: string,
): Promise<
  | { ok: true; productId: string | null; state: string; isActive: boolean }
  | { ok: false; reason: string }
> {
  const accessToken = await getGoogleAccessToken(
    "https://www.googleapis.com/auth/androidpublisher",
  );
  if (!accessToken) return { ok: false, reason: "verification_unavailable" };

  const purchase = await fetchGooglePlaySubscription(purchaseToken, accessToken);
  if (!purchase) return { ok: false, reason: "verify_failed" };

  const { patch, productId, state } = buildSubscriptionPatch(purchase, purchaseToken);

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  // Upsert, not update: this path knows the user id directly (unlike the RTDN
  // handler below, which can only look an owner up via an *existing* row), so
  // it's the one path that can recover a subscriptions row that's missing for
  // any reason — a signup whose handle_new_user() insert raced this call, or
  // an operator having reset/re-seeded the table. An update-only write would
  // silently affect zero rows and leave the purchase verified with Google but
  // never reflected as Pro in the app.
  const { error } = await supabaseAdmin
    .from("subscriptions")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });
  if (error) {
    console.error("[billing] failed to write subscription patch", error);
    return { ok: false, reason: "db_write_failed" };
  }

  if (patch.status === "active" && productId) {
    await acknowledgeIfPending(purchase, purchaseToken, productId, accessToken);
  }

  return { ok: true, productId, state, isActive: patch.status === "active" };
}

/**
 * Decode + verify a Play Integrity token against Google's own decode
 * endpoint. Optional defense-in-depth on top of purchase-token verification
 * (which alone is already sufficient to trust a purchase — it's Google's own
 * record of a processed payment). This never blocks or fails a purchase: it
 * only logs a warning when a token is present but the verdict looks wrong
 * (tampered APK, non-Play install, failed device attestation, unlicensed
 * account), so misconfiguration or a false positive can never lock a
 * genuine paying customer out of what they already paid for. Silently
 * returns if unconfigured (no GOOGLE_CLOUD_PROJECT_NUMBER / no token sent) —
 * this whole feature is opt-in.
 */
async function checkPlayIntegrity(
  integrityToken: string | undefined,
  expectedNonce: string | undefined,
  userId: string,
): Promise<void> {
  if (!integrityToken || !expectedNonce) return;
  try {
    const accessToken = await getGoogleAccessToken("https://www.googleapis.com/auth/playintegrity");
    if (!accessToken) return;

    const res = await fetch(
      `https://playintegrity.googleapis.com/v1/${PACKAGE_NAME}:decodeIntegrityToken`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
        body: JSON.stringify({ integrity_token: integrityToken }),
      },
    );
    if (!res.ok) {
      console.warn("[billing] Play Integrity decode request failed", res.status);
      return;
    }
    const json = (await res.json()) as {
      tokenPayloadExternal?: {
        requestDetails?: { nonce?: string };
        appIntegrity?: { appRecognitionVerdict?: string };
        deviceIntegrity?: { deviceRecognitionVerdict?: string[] };
        accountDetails?: { appLicensingVerdict?: string };
      };
    };
    const payload = json.tokenPayloadExternal;
    if (!payload) return;

    if (payload.requestDetails?.nonce !== expectedNonce) {
      console.warn("[billing] Play Integrity nonce mismatch — possible token replay", { userId });
      return;
    }
    const appOk = payload.appIntegrity?.appRecognitionVerdict === "PLAY_RECOGNIZED";
    const deviceOk = (payload.deviceIntegrity?.deviceRecognitionVerdict ?? []).includes(
      "MEETS_DEVICE_INTEGRITY",
    );
    const licensedOk = payload.accountDetails?.appLicensingVerdict === "LICENSED";
    if (!appOk || !deviceOk || !licensedOk) {
      console.warn("[billing] Play Integrity verdict looks suspicious (logged, not blocked)", {
        userId,
        appRecognitionVerdict: payload.appIntegrity?.appRecognitionVerdict,
        deviceRecognitionVerdict: payload.deviceIntegrity?.deviceRecognitionVerdict,
        appLicensingVerdict: payload.accountDetails?.appLicensingVerdict,
      });
    }
  } catch (e) {
    console.warn("[billing] Play Integrity check errored (non-blocking)", e);
  }
}

/**
 * Server-side verification of a Google Play subscription purchase.
 *
 * Security model: the client sends ONLY the Play `purchaseToken` + `productId`.
 * This function verifies that token directly against the Google Play Developer
 * API using a service account, then writes the entitlement to `subscriptions`.
 * It NEVER trusts the client, and it FAILS CLOSED — if the service account is
 * not configured, premium is not granted.
 *
 * Required server env (one of):
 *   GOOGLE_PLAY_SERVICE_ACCOUNT_JSON   — the full service-account JSON string, or
 *   GOOGLE_PLAY_SA_EMAIL + GOOGLE_PLAY_SA_PRIVATE_KEY
 *
 * `integrityToken`/`integrityNonce` are optional (see checkPlayIntegrity) —
 * purely additive hardening, never required for a purchase to succeed.
 *
 * Returns a discriminated result; callers must treat anything other than
 * `{ ok: true }` as "not premium".
 */
export const verifyPlayPurchase = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({
        purchaseToken: z.string().min(10).max(4000),
        productId: z.string().min(1).max(160),
        integrityToken: z.string().max(8000).optional(),
        integrityNonce: z.string().max(200).optional(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    if (!(data.productId in PRODUCT_INTERVALS)) {
      return { ok: false as const, reason: "unknown_product" };
    }

    // Fire-and-forget-adjacent: awaited so logs land before the response,
    // but its outcome never affects what we return below.
    await checkPlayIntegrity(data.integrityToken, data.integrityNonce, context.userId);

    const result = await verifyAndApply(data.purchaseToken, context.userId);
    if (!result.ok) return { ok: false as const, reason: result.reason };
    if (!result.isActive) {
      return { ok: false as const, reason: "not_active", state: result.state };
    }

    const interval = result.productId ? (PRODUCT_INTERVALS[result.productId] ?? null) : null;
    return { ok: true as const, plan: "pro" as const, interval };
  });

/**
 * Re-verify a purchase token from a Google Play Real-Time Developer
 * Notification (renewal, cancellation, grace period, revocation, etc.) —
 * see src/routes/api/public/google-play/rtdn.ts, the only caller. Looks the
 * owning user up by provider_ref, with a fallback through linkedPurchaseToken
 * for the token-rotation cases Play's subscriptions v2 API can produce.
 * No-ops (logs and returns) if no local subscription matches yet — the
 * client's own post-purchase verification call normally wins that race.
 */
export async function processPlayRtdnNotification(purchaseToken: string): Promise<void> {
  const accessToken = await getGoogleAccessToken(
    "https://www.googleapis.com/auth/androidpublisher",
  );
  if (!accessToken) return;

  const purchase = await fetchGooglePlaySubscription(purchaseToken, accessToken);
  if (!purchase) return;

  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

  const { data: direct } = await supabaseAdmin
    .from("subscriptions")
    .select("user_id")
    .eq("provider", "google_play")
    .eq("provider_ref", purchaseToken)
    .maybeSingle();
  let ownerId = direct?.user_id ?? null;

  if (!ownerId && purchase.linkedPurchaseToken) {
    const { data: linked } = await supabaseAdmin
      .from("subscriptions")
      .select("user_id")
      .eq("provider", "google_play")
      .eq("provider_ref", purchase.linkedPurchaseToken)
      .maybeSingle();
    ownerId = linked?.user_id ?? null;
  }

  if (!ownerId) {
    console.warn(
      "[rtdn] no local subscription matches this purchase token yet — skipping (the client's own post-purchase verification normally wins this race)",
    );
    return;
  }

  const { patch, productId } = buildSubscriptionPatch(purchase, purchaseToken);
  const { error } = await supabaseAdmin.from("subscriptions").update(patch).eq("user_id", ownerId);
  if (error) {
    console.error("[rtdn] failed to write subscription patch", error);
    return;
  }
  if (patch.status === "active" && productId) {
    await acknowledgeIfPending(purchase, purchaseToken, productId, accessToken);
  }
}
