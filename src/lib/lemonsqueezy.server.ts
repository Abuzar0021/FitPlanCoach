// Server-only Lemon Squeezy client + webhook signature verification.
// SECURITY: never import from client-reachable modules at module scope.

import { createHmac, timingSafeEqual } from "node:crypto";

const LS_API = "https://api.lemonsqueezy.com/v1";

export function getEnv() {
  return {
    apiKey: process.env.LEMONSQUEEZY_API_KEY ?? "",
    webhookSecret: process.env.LEMONSQUEEZY_WEBHOOK_SECRET ?? "",
    storeId: process.env.LEMONSQUEEZY_STORE_ID ?? "",
  };
}

/**
 * Verify a Lemon Squeezy webhook signature.
 * Lemon Squeezy signs the raw request body with the configured secret using
 * HMAC-SHA256 and sends the hex digest in the `X-Signature` header.
 */
export function verifyLemonSqueezySignature(
  rawBody: string,
  signatureHeader: string | null,
  secret: string,
): boolean {
  if (!signatureHeader || !secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest("hex");
  const sigBuf = Buffer.from(signatureHeader, "hex");
  const expBuf = Buffer.from(expected, "hex");
  if (sigBuf.length === 0 || sigBuf.length !== expBuf.length) return false;
  try {
    return timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

async function lsFetch(path: string, init: RequestInit = {}) {
  const { apiKey } = getEnv();
  if (!apiKey) throw new Error("LEMONSQUEEZY_API_KEY is not configured");
  const res = await fetch(`${LS_API}${path}`, {
    ...init,
    headers: {
      Accept: "application/vnd.api+json",
      "Content-Type": "application/vnd.api+json",
      Authorization: `Bearer ${apiKey}`,
      ...(init.headers ?? {}),
    },
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Lemon Squeezy ${path} failed (${res.status}): ${text.slice(0, 500)}`);
  }
  return res.json();
}

/**
 * Create a single-use checkout URL with prefilled customer info and
 * `custom.user_id` so webhooks can map back to the signed-in user even if
 * the customer pays from a different email.
 */
export async function createCheckoutUrl(args: {
  variantId: string;
  userId: string;
  email?: string | null;
  name?: string | null;
  successRedirect?: string;
}): Promise<string> {
  const { storeId } = getEnv();
  if (!storeId) throw new Error("LEMONSQUEEZY_STORE_ID is not configured");
  if (!args.variantId) throw new Error("Missing Lemon Squeezy variant id");
  const body = {
    data: {
      type: "checkouts",
      attributes: {
        checkout_options: { embed: false, dark: true },
        checkout_data: {
          email: args.email ?? undefined,
          name: args.name ?? undefined,
          custom: { user_id: args.userId },
        },
        product_options: args.successRedirect
          ? { redirect_url: args.successRedirect }
          : undefined,
      },
      relationships: {
        store: { data: { type: "stores", id: String(storeId) } },
        variant: { data: { type: "variants", id: String(args.variantId) } },
      },
    },
  };
  const json = await lsFetch("/checkouts", { method: "POST", body: JSON.stringify(body) });
  const url = json?.data?.attributes?.url;
  if (typeof url !== "string") throw new Error("Lemon Squeezy did not return a checkout URL");
  return url;
}

export type LSPlanResolution = {
  billing_interval: "monthly" | "annual" | null;
  matched: boolean;
};

/**
 * Map a Lemon Squeezy variant id to our internal billing interval using the
 * Owner-configured ids in `payment_settings`.
 */
export function resolvePlanFromVariant(
  variantId: string | null | undefined,
  settings: { ls_monthly_variant_id: string | null; ls_annual_variant_id: string | null },
): LSPlanResolution {
  const v = variantId ? String(variantId) : null;
  if (!v) return { billing_interval: null, matched: false };
  if (settings.ls_monthly_variant_id && v === String(settings.ls_monthly_variant_id))
    return { billing_interval: "monthly", matched: true };
  if (settings.ls_annual_variant_id && v === String(settings.ls_annual_variant_id))
    return { billing_interval: "annual", matched: true };
  return { billing_interval: null, matched: false };
}
