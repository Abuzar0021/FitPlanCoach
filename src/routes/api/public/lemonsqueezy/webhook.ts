// Lemon Squeezy webhook endpoint.
// SECURITY: bypasses auth (under /api/public/*) — we verify the HMAC-SHA256
// signature ourselves before doing anything with the payload, and dedupe by
// event_id so replays are no-ops.

import { createFileRoute } from "@tanstack/react-router";
import {
  getEnv,
  resolvePlanFromVariant,
  verifyLemonSqueezySignature,
} from "@/lib/lemonsqueezy.server";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Signature, X-Event-Name",
} as const;

function intervalDays(i: "monthly" | "annual" | null | undefined): number {
  return i === "annual" ? 365 : 30;
}

export const Route = createFileRoute("/api/public/lemonsqueezy/webhook")({
  server: {
    handlers: {
      OPTIONS: async () => new Response(null, { status: 204, headers: CORS }),
      GET: async () =>
        // helpful for "is the endpoint live?" checks; never returns secrets.
        new Response(JSON.stringify({ ok: true, service: "lemonsqueezy-webhook" }), {
          status: 200,
          headers: { "content-type": "application/json", ...CORS },
        }),
      POST: async ({ request }) => {
        const { webhookSecret } = getEnv();
        const rawBody = await request.text();
        const signature = request.headers.get("x-signature");

        if (!webhookSecret) {
          console.error("[ls-webhook] LEMONSQUEEZY_WEBHOOK_SECRET not configured");
          return new Response("Webhook secret not configured", { status: 503, headers: CORS });
        }

        if (!verifyLemonSqueezySignature(rawBody, signature, webhookSecret)) {
          return new Response("Invalid signature", { status: 401, headers: CORS });
        }

        let payload: any;
        try {
          payload = JSON.parse(rawBody);
        } catch {
          return new Response("Invalid JSON", { status: 400, headers: CORS });
        }

        const meta = payload?.meta ?? {};
        const eventName: string = meta.event_name ?? "unknown";
        // LS sends event id in headers; fall back to body if absent.
        // Parenthesise to avoid `??`/`?:` precedence surprise.
        const headerEventId = request.headers.get("x-event-id");
        const dataId = payload?.data?.id;
        const eventId = headerEventId
          ?? (dataId ? `${dataId}:${eventName}:${meta.webhook_id ?? "0"}` : `${eventName}:${Date.now()}`);

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        // Idempotency: insert event row; if it already exists, return early.
        const { error: dedupeErr } = await supabaseAdmin.from("webhook_events").insert({
          provider: "lemonsqueezy",
          event_id: String(eventId),
          event_name: eventName,
          payload,
          status: "received",
        });
        if (dedupeErr && /duplicate/i.test(dedupeErr.message)) {
          return new Response(JSON.stringify({ ok: true, dedupe: true }), {
            status: 200,
            headers: { "content-type": "application/json", ...CORS },
          });
        }
        if (dedupeErr) {
          console.error("[ls-webhook] dedupe insert failed", dedupeErr);
        }

        try {
          await processEvent(eventName, payload, supabaseAdmin);
          await supabaseAdmin
            .from("webhook_events")
            .update({ status: "processed", processed_at: new Date().toISOString() })
            .eq("provider", "lemonsqueezy")
            .eq("event_id", String(eventId));
          return new Response(JSON.stringify({ ok: true }), {
            status: 200,
            headers: { "content-type": "application/json", ...CORS },
          });
        } catch (e: any) {
          console.error("[ls-webhook] processing failed", eventName, e);
          await supabaseAdmin
            .from("webhook_events")
            .update({
              status: "failed",
              error_message: String(e?.message ?? e).slice(0, 1000),
            })
            .eq("provider", "lemonsqueezy")
            .eq("event_id", String(eventId));
          // Return 200 so LS doesn't hammer us; we have the row for retry/audit.
          return new Response(JSON.stringify({ ok: false, error: "processing_failed" }), {
            status: 200,
            headers: { "content-type": "application/json", ...CORS },
          });
        }
      },
    },
  },
});

async function processEvent(eventName: string, payload: any, db: any) {
  const data = payload?.data ?? {};
  const attrs = data?.attributes ?? {};
  const customData = payload?.meta?.custom_data ?? attrs?.first_subscription_item?.custom_data ?? {};
  const userIdFromCustom: string | undefined = customData?.user_id;

  // Load owner-configured variant ids
  const { data: settingsRow } = await db
    .from("payment_settings")
    .select(
      "ls_monthly_variant_id, ls_annual_variant_id, monthly_price_cents, annual_price_cents, currency",
    )
    .eq("singleton", true)
    .maybeSingle();

  const variantId: string | null = attrs?.variant_id != null ? String(attrs.variant_id) : null;
  const resolved = resolvePlanFromVariant(variantId, {
    ls_monthly_variant_id: settingsRow?.ls_monthly_variant_id ?? null,
    ls_annual_variant_id: settingsRow?.ls_annual_variant_id ?? null,
  });
  const billingInterval = resolved.billing_interval;

  // Resolve target user: prefer custom.user_id, fall back to email match in profiles.
  let userId: string | null = userIdFromCustom ?? null;
  const email: string | null =
    attrs?.user_email ?? attrs?.customer_email ?? attrs?.email ?? null;
  if (!userId && email) {
    const { data: prof } = await db
      .from("profiles")
      .select("id")
      .eq("email", email.toLowerCase())
      .maybeSingle();
    userId = prof?.id ?? null;
  }

  // Log on event to webhook_events later; here just route by event name.
  switch (eventName) {
    case "order_created": {
      if (!userId) break;
      await db.from("billing_history").insert({
        user_id: userId,
        plan: "pro",
        billing_interval: billingInterval ?? "monthly",
        method: "lemon_squeezy",
        amount_cents: typeof attrs?.total === "number" ? attrs.total : (attrs?.total_usd ?? 0),
        currency: (attrs?.currency ?? settingsRow?.currency ?? "usd").toLowerCase(),
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + intervalDays(billingInterval) * 86_400_000).toISOString(),
      });
      // Tag user with LS order id for traceability; do not grant access here
      // (subscription_created/payment_success is the source of truth).
      await db
        .from("subscriptions")
        .update({
          lemonsqueezy_order_id: String(data?.id ?? ""),
          lemonsqueezy_customer_id: attrs?.customer_id ? String(attrs.customer_id) : null,
        })
        .eq("user_id", userId);
      break;
    }
    case "subscription_created":
    case "subscription_updated":
    case "subscription_resumed":
    case "subscription_unpaused": {
      if (!userId) break;
      const subId = String(data?.id ?? "");
      const renewsAt = attrs?.renews_at ?? null;
      const endsAt = attrs?.ends_at ?? null;
      const status = (attrs?.status ?? "active").toLowerCase();
      const periodEnd = renewsAt ?? endsAt ?? new Date(Date.now() + intervalDays(billingInterval) * 86_400_000).toISOString();
      await db
        .from("subscriptions")
        .update({
          plan_type: status === "expired" ? "free" : "pro",
          status:
            status === "expired" ? "expired"
            : status === "cancelled" ? "canceled"
            : status === "past_due" ? "past_due"
            : "active",
          billing_interval: billingInterval ?? "monthly",
          payment_method: "lemon_squeezy",
          provider: "lemon_squeezy",
          provider_ref: subId,
          environment: "live",
          lemonsqueezy_subscription_id: subId,
          lemonsqueezy_customer_id: attrs?.customer_id ? String(attrs.customer_id) : null,
          current_period_start: new Date().toISOString(),
          current_period_end: periodEnd,
          expiry_date: periodEnd,
          renews_at: renewsAt,
          ends_at: endsAt,
          cancel_at_period_end: !!attrs?.cancelled,
          cancelled_at: attrs?.cancelled ? new Date().toISOString() : null,
        })
        .eq("user_id", userId);
      await notify(db, userId, "payment", "Pro subscription active", "Your FitPlanCoach Pro is active. Welcome aboard!", "/subscription");
      await sendEmailSafe(db, userId, "payment-approved", `ls-${subId}`);
      break;
    }
    case "subscription_payment_success": {
      if (!userId) break;
      const subId = attrs?.subscription_id ? String(attrs.subscription_id) : null;
      await db.from("billing_history").insert({
        user_id: userId,
        plan: "pro",
        billing_interval: billingInterval ?? "monthly",
        method: "lemon_squeezy",
        amount_cents: typeof attrs?.total === "number" ? attrs.total : 0,
        currency: (attrs?.currency ?? settingsRow?.currency ?? "usd").toLowerCase(),
        period_start: new Date().toISOString(),
        period_end: new Date(Date.now() + intervalDays(billingInterval) * 86_400_000).toISOString(),
      });
      if (subId) {
        await db
          .from("subscriptions")
          .update({ status: "active" })
          .eq("lemonsqueezy_subscription_id", subId);
      }
      break;
    }
    case "subscription_cancelled": {
      if (!userId) break;
      await db
        .from("subscriptions")
        .update({
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
          ends_at: attrs?.ends_at ?? null,
        })
        .eq("user_id", userId);
      await notify(db, userId, "payment", "Subscription cancelled", "Your Pro access continues until the end of the current billing period.", "/subscription");
      break;
    }
    case "subscription_expired":
    case "subscription_paused": {
      if (!userId) break;
      await db
        .from("subscriptions")
        .update({
          plan_type: "free",
          status: "expired",
          current_period_end: new Date().toISOString(),
          expiry_date: new Date().toISOString(),
        })
        .eq("user_id", userId);
      await notify(db, userId, "payment", "Subscription expired", "Reactivate Pro any time from your subscription page.", "/subscription");
      break;
    }
    case "subscription_payment_refunded":
    case "order_refunded": {
      if (!userId) break;
      await db
        .from("subscriptions")
        .update({
          plan_type: "free",
          status: "canceled",
          cancel_at_period_end: true,
          cancelled_at: new Date().toISOString(),
        })
        .eq("user_id", userId);
      await notify(db, userId, "payment", "Refund processed", "Your subscription was refunded and Pro access has been removed.", "/subscription");
      break;
    }
    default:
      // Unhandled events are logged via webhook_events row and ignored.
      break;
  }
}

async function notify(
  db: any,
  userId: string,
  category: string,
  title: string,
  body: string,
  link: string,
) {
  try {
    await db.from("notifications").insert({ user_id: userId, category, title, body, link });
  } catch (e) {
    console.error("[ls-webhook] notify failed", e);
  }
}

async function sendEmailSafe(db: any, userId: string, templateName: string, idemKey: string) {
  try {
    const { data: prof } = await db
      .from("profiles")
      .select("email, name")
      .eq("id", userId)
      .maybeSingle();
    if (!prof?.email) return;
    const { sendAppEmail } = await import("@/lib/email-send.server");
    await sendAppEmail({
      templateName: templateName as any,
      recipientEmail: prof.email,
      templateData: { name: prof.name ?? "Athlete" },
      idempotencyKey: idemKey,
    });
  } catch (e) {
    console.error("[ls-webhook] email send failed", e);
  }
}
