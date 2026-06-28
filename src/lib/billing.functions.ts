import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Google Play subscription product ids -> billing interval.
const PRODUCT_INTERVALS: Record<string, "monthly" | "annual"> = {
  fitplancoach_pro_monthly: "monthly",
  fitplancoach_pro_annual: "annual",
};
const PACKAGE_NAME = "com.fitplancoach.app";

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
      })
      .parse(d),
  )
  .handler(async ({ context, data }) => {
    const interval = PRODUCT_INTERVALS[data.productId];
    if (!interval) return { ok: false as const, reason: "unknown_product" };

    // 1) Load the service account — fail closed if absent.
    const readServiceAccount = (): { client_email: string; private_key: string } | null => {
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
    };
    const sa = readServiceAccount();
    if (!sa) {
      console.error("[billing] Google Play service account not configured — refusing to grant premium");
      return { ok: false as const, reason: "verification_unavailable" };
    }

    // 2) Mint a Google access token via a service-account JWT (RS256).
    const { createSign } = await import("node:crypto");
    const b64url = (i: Buffer | string) =>
      Buffer.from(i).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    const nowSec = Math.floor(Date.now() / 1000);
    const jwtHeader = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
    const jwtClaim = b64url(
      JSON.stringify({
        iss: sa.client_email,
        scope: "https://www.googleapis.com/auth/androidpublisher",
        aud: "https://oauth2.googleapis.com/token",
        iat: nowSec,
        exp: nowSec + 3600,
      }),
    );
    let accessToken: string;
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
      accessToken = (await tokRes.json()).access_token;
      if (!accessToken) throw new Error("no access_token in response");
    } catch (e) {
      console.error("[billing] access-token error", e);
      return { ok: false as const, reason: "verification_error" };
    }

    // 3) Verify the subscription purchase with the Play Developer API.
    let purchase: Record<string, unknown>;
    try {
      const url = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptionsv2/tokens/${encodeURIComponent(
        data.purchaseToken,
      )}`;
      const res = await fetch(url, { headers: { Authorization: `Bearer ${accessToken}` } });
      if (!res.ok) {
        console.error("[billing] Play verify failed", res.status);
        return { ok: false as const, reason: "verify_failed" };
      }
      purchase = (await res.json()) as Record<string, unknown>;
    } catch (e) {
      console.error("[billing] Play verify error", e);
      return { ok: false as const, reason: "verification_error" };
    }

    const state = String((purchase as { subscriptionState?: string }).subscriptionState ?? "");
    const isActive =
      state === "SUBSCRIPTION_STATE_ACTIVE" || state === "SUBSCRIPTION_STATE_IN_GRACE_PERIOD";
    const lineItems = (purchase as { lineItems?: Array<{ expiryTime?: string }> }).lineItems;
    const expiry = Array.isArray(lineItems) ? (lineItems[0]?.expiryTime ?? null) : null;

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db = supabaseAdmin as unknown as {
      from: (t: string) => {
        update: (v: Record<string, unknown>) => { eq: (c: string, v: string) => Promise<unknown> };
      };
    };

    if (!isActive) {
      const canceled = state === "SUBSCRIPTION_STATE_CANCELED";
      await db
        .from("subscriptions")
        .update({ status: canceled ? "canceled" : "expired", plan_type: canceled ? "pro" : "free" })
        .eq("user_id", context.userId);
      return { ok: false as const, reason: "not_active", state };
    }

    await db
      .from("subscriptions")
      .update({
        plan_type: "pro",
        status: "active",
        billing_interval: interval,
        provider: "google_play",
        provider_ref: data.purchaseToken,
        current_period_start: new Date().toISOString(),
        current_period_end: expiry,
        expiry_date: expiry,
        renews_at: expiry,
        cancel_at_period_end: false,
      })
      .eq("user_id", context.userId);

    // 4) Acknowledge the purchase if Google flagged it pending (required <3 days).
    if ((purchase as { acknowledgementState?: string }).acknowledgementState === "ACKNOWLEDGEMENT_STATE_PENDING") {
      try {
        const ackUrl = `https://androidpublisher.googleapis.com/androidpublisher/v3/applications/${PACKAGE_NAME}/purchases/subscriptions/${encodeURIComponent(
          data.productId,
        )}/tokens/${encodeURIComponent(data.purchaseToken)}:acknowledge`;
        await fetch(ackUrl, {
          method: "POST",
          headers: { Authorization: `Bearer ${accessToken}`, "content-type": "application/json" },
          body: "{}",
        });
      } catch (e) {
        console.error("[billing] acknowledge failed", e);
      }
    }

    return { ok: true as const, plan: "pro" as const, interval, expiry };
  });
