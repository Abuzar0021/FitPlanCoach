// Client-callable server fns for Lemon Squeezy.
// SECURITY: any privileged server-only module is imported inside `.handler()`.

import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

const checkoutInput = z.object({
  billing_interval: z.enum(["monthly", "annual"]),
  success_redirect: z.string().url().max(500).optional(),
});

export const createLemonSqueezyCheckout = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => checkoutInput.parse(d))
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: s } = await supabaseAdmin
      .from("payment_settings")
      .select(
        "ls_enabled, ls_monthly_variant_id, ls_annual_variant_id, ls_monthly_checkout_url, ls_annual_checkout_url",
      )
      .eq("singleton", true)
      .maybeSingle();

    if (!s || !s.ls_enabled) {
      throw new Response("International checkout is not enabled yet", { status: 503 });
    }

    // Static checkout URL is allowed as a fallback (Owner pastes a long-lived URL).
    const staticUrl =
      data.billing_interval === "annual" ? s.ls_annual_checkout_url : s.ls_monthly_checkout_url;

    const variantId =
      data.billing_interval === "annual" ? s.ls_annual_variant_id : s.ls_monthly_variant_id;

    // Prefer a freshly-minted, single-use checkout when API key + variant are set.
    if (process.env.LEMONSQUEEZY_API_KEY && variantId) {
      const { createCheckoutUrl } = await import("@/lib/lemonsqueezy.server");
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email, name")
        .eq("id", context.userId)
        .maybeSingle();
      try {
        const url = await createCheckoutUrl({
          variantId,
          userId: context.userId,
          email: prof?.email ?? null,
          name: prof?.name ?? null,
          successRedirect: data.success_redirect,
        });
        return { url, kind: "dynamic" as const };
      } catch (e) {
        console.error("[ls] createCheckoutUrl failed, falling back to static", e);
      }
    }

    if (staticUrl) {
      // Append checkout[email] hint so LS prefills the field; user_id mapping
      // happens via webhook email fallback.
      const sep = staticUrl.includes("?") ? "&" : "?";
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email")
        .eq("id", context.userId)
        .maybeSingle();
      const url = prof?.email
        ? `${staticUrl}${sep}checkout[email]=${encodeURIComponent(prof.email)}&checkout[custom][user_id]=${encodeURIComponent(context.userId)}`
        : `${staticUrl}${sep}checkout[custom][user_id]=${encodeURIComponent(context.userId)}`;
      return { url, kind: "static" as const };
    }

    throw new Response("Lemon Squeezy checkout is not configured", { status: 503 });
  });
