import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

// ---- helpers (server-only, called inside handlers) ----
async function getActorRole(userId: string): Promise<"owner" | "admin" | "user"> {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: rows } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId);
  const roles = (rows ?? []).map((r) => r.role as string);
  if (roles.includes("owner")) return "owner";
  if (roles.includes("admin")) return "admin";
  return "user";
}

async function assertStaff(userId: string) {
  const role = await getActorRole(userId);
  if (role === "user") throw new Response("Forbidden", { status: 403 });
  return role;
}

async function assertOwner(userId: string) {
  const role = await getActorRole(userId);
  if (role !== "owner") throw new Response("Forbidden — owner only", { status: 403 });
  return role;
}

// ---- Authenticated read: return only fields needed to display the payment page ----
// Uses the admin client because the underlying table's RLS is restricted to
// owner/admin. Sensitive admin metadata (e.g. updated_by, audit columns) is
// intentionally never projected. paypal_email and qris are required for users
// to actually submit payment, so they are returned here.
export const getPaymentSettings = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async () => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data, error } = await supabaseAdmin
      .from("payment_settings")
      .select(
        "monthly_price_cents, annual_price_cents, currency, qris_image_path, paypal_email, payment_instructions, qris_instructions, paypal_instructions, ls_enabled, ls_store_id, ls_monthly_variant_id, ls_annual_variant_id, ls_monthly_checkout_url, ls_annual_checkout_url, bank_enabled, bank_name, bank_account_holder, bank_account_number, bank_va_number, bank_instructions, updated_at",
      )
      .limit(1)
      .maybeSingle();
    if (error) throw new Response(error.message, { status: 500 });
    let qris_signed_url: string | null = null;
    if (data?.qris_image_path) {
      const { data: signed } = await supabaseAdmin.storage
        .from("payment-assets")
        .createSignedUrl(data.qris_image_path, 60 * 60);
      qris_signed_url = signed?.signedUrl ?? null;
    }
    return { settings: data, qris_signed_url };
  });

// ---- Owner-only: update payment settings ----
const settingsInput = z.object({
  monthly_price_cents: z.number().int().min(0).optional(),
  annual_price_cents: z.number().int().min(0).optional(),
  currency: z.string().min(2).max(8).optional(),
  qris_image_path: z.string().max(500).nullable().optional(),
  paypal_email: z.string().email().max(200).nullable().optional(),
  payment_instructions: z.string().max(4000).nullable().optional(),
  qris_instructions: z.string().max(4000).nullable().optional(),
  paypal_instructions: z.string().max(4000).nullable().optional(),
  // Lemon Squeezy
  ls_enabled: z.boolean().optional(),
  ls_store_id: z.string().max(60).nullable().optional(),
  ls_monthly_variant_id: z.string().max(60).nullable().optional(),
  ls_annual_variant_id: z.string().max(60).nullable().optional(),
  ls_monthly_checkout_url: z.string().url().max(500).nullable().optional(),
  ls_annual_checkout_url: z.string().url().max(500).nullable().optional(),
  // Bank transfer
  bank_enabled: z.boolean().optional(),
  bank_name: z.string().max(120).nullable().optional(),
  bank_account_holder: z.string().max(160).nullable().optional(),
  bank_account_number: z.string().max(60).nullable().optional(),
  bank_va_number: z.string().max(60).nullable().optional(),
  bank_instructions: z.string().max(4000).nullable().optional(),
});

export const updatePaymentSettings = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => settingsInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: row } = await supabaseAdmin
      .from("payment_settings")
      .select("id")
      .eq("singleton", true)
      .maybeSingle();
    if (!row) throw new Response("Settings row missing", { status: 500 });
    const { error } = await supabaseAdmin
      .from("payment_settings")
      .update({ ...data, updated_by: context.userId })
      .eq("id", row.id);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

// ---- Owner-only: upload QRIS image (path is provided after client upload) ----
// (Image upload itself happens via storage RLS to "payment-assets"; this server fn
// records the path on the settings row and verifies the caller is owner.)
export const setQrisImagePath = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => z.object({ path: z.string().min(1).max(500) }).parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // upload happens server-side from the client base64? Simpler: client uploads to
    // "payment-assets" via service-role-proxied path. We just record the file path.
    const { error } = await supabaseAdmin
      .from("payment_settings")
      .update({ qris_image_path: data.path, updated_by: context.userId })
      .eq("singleton", true);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true };
  });

// ---- Owner-only: upload an asset to payment-assets via base64 (since bucket is private) ----
const uploadInput = z.object({
  filename: z.string().min(1).max(200),
  content_type: z.string().min(1).max(120),
  base64: z.string().min(1).max(8_000_000), // ~6 MB
});
export const uploadQrisImage = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => uploadInput.parse(d))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const buf = Buffer.from(data.base64, "base64");
    const safeName = data.filename.replace(/[^a-zA-Z0-9._-]/g, "_");
    const path = `qris/${Date.now()}-${safeName}`;
    const { error: upErr } = await supabaseAdmin.storage
      .from("payment-assets")
      .upload(path, buf, { contentType: data.content_type, upsert: true });
    if (upErr) throw new Response(upErr.message, { status: 400 });
    const { error } = await supabaseAdmin
      .from("payment_settings")
      .update({ qris_image_path: path, updated_by: context.userId })
      .eq("singleton", true);
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true, path };
  });

// ---- User: submit a payment ----
const submitInput = z.object({
  billing_interval: z.enum(["monthly", "annual"]),
  method: z.enum(["qris", "paypal", "bank_transfer"]),
  amount_cents: z.number().int().min(50),
  currency: z.string().min(2).max(8).default("usd"),
  transaction_ref: z.string().max(200).optional(),
  payer_email: z.string().email().max(200).optional(),
  paypal_transaction_id: z.string().max(200).optional(),
  proof_path: z.string().max(500).optional(),
  user_notes: z.string().max(2000).optional(),
});

export const submitPayment = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => submitInput.parse(d))
  .handler(async ({ context, data }) => {
    // QRIS requires proof; PayPal requires a transaction id; bank_transfer requires either proof or a reference
    if (data.method === "qris" && !data.proof_path) {
      throw new Response("QRIS submissions require a payment proof image", { status: 400 });
    }
    if (data.method === "paypal" && !data.paypal_transaction_id) {
      throw new Response("PayPal submissions require a transaction ID", { status: 400 });
    }
    if (data.method === "bank_transfer" && !data.proof_path && !data.transaction_ref) {
      throw new Response(
        "Bank transfer submissions require a transfer reference or a payment proof image",
        { status: 400 },
      );
    }
    // Reject if a pending submission already exists for this user
    const { data: existing } = await context.supabase
      .from("payment_submissions")
      .select("id")
      .eq("user_id", context.userId)
      .eq("status", "pending")
      .limit(1);
    if (existing && existing.length > 0) {
      throw new Response(
        "You already have a pending payment under review. Please wait for it to be processed.",
        { status: 409 },
      );
    }
    const { data: ins, error } = await context.supabase
      .from("payment_submissions")
      .insert({
        user_id: context.userId,
        plan: "pro",
        billing_interval: data.billing_interval,
        method: data.method,
        amount_cents: data.amount_cents,
        currency: data.currency,
        transaction_ref: data.transaction_ref ?? null,
        payer_email: data.payer_email ?? null,
        paypal_transaction_id: data.paypal_transaction_id ?? null,
        proof_path: data.proof_path ?? null,
        user_notes: data.user_notes ?? null,
        status: "pending",
      })
      .select("id")
      .single();
    if (error) throw new Response(error.message, { status: 400 });
    return { ok: true, id: ins.id };
  });

// ---- Staff: list submissions ----
export const listPaymentSubmissions = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z
      .object({ status: z.enum(["pending", "approved", "rejected", "expired", "all"]).optional() })
      .parse(d ?? {}),
  )
  .handler(async ({ context, data }) => {
    await assertStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let q = supabaseAdmin
      .from("payment_submissions")
      .select(
        "id, user_id, plan, billing_interval, method, amount_cents, currency, transaction_ref, payer_email, paypal_transaction_id, proof_path, user_notes, status, submitted_at, reviewed_at, reviewed_by, review_notes",
      )
      .order("submitted_at", { ascending: false })
      .limit(200);
    if (data.status && data.status !== "all") q = q.eq("status", data.status);
    const { data: rows, error } = await q;
    if (error) throw new Response(error.message, { status: 500 });
    // Join user emails
    const ids = Array.from(new Set((rows ?? []).map((r) => r.user_id)));
    let profiles: Array<{ id: string; email: string | null; name: string | null }> = [];
    if (ids.length > 0) {
      const { data: ps } = await supabaseAdmin
        .from("profiles")
        .select("id, email, name")
        .in("id", ids);
      profiles = ps ?? [];
    }
    const pmap = new Map(profiles.map((p) => [p.id, p]));
    // Sign proof URLs
    const enriched = await Promise.all(
      (rows ?? []).map(async (r) => {
        let proof_url: string | null = null;
        if (r.proof_path) {
          const { data: signed } = await supabaseAdmin.storage
            .from("payment-proofs")
            .createSignedUrl(r.proof_path, 60 * 60);
          proof_url = signed?.signedUrl ?? null;
        }
        return { ...r, user: pmap.get(r.user_id) ?? null, proof_url };
      }),
    );
    return { submissions: enriched };
  });

// ---- Staff: approve / reject ----
const reviewInput = z.object({
  submission_id: z.string().uuid(),
  action: z.enum(["approve", "reject"]),
  notes: z.string().max(2000).optional(),
});

function intervalToDays(i: "monthly" | "annual"): number {
  return i === "annual" ? 365 : 30;
}

export const reviewPaymentSubmission = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) => reviewInput.parse(d))
  .handler(async ({ context, data }) => {
    const role = await assertStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { data: sub, error: sErr } = await supabaseAdmin
      .from("payment_submissions")
      .select("*")
      .eq("id", data.submission_id)
      .maybeSingle();
    if (sErr) throw new Response(sErr.message, { status: 500 });
    if (!sub) throw new Response("Submission not found", { status: 404 });
    if (sub.status !== "pending") {
      throw new Response(`Submission is already ${sub.status}`, { status: 409 });
    }

    const reviewedAt = new Date().toISOString();
    const newStatus = data.action === "approve" ? "approved" : "rejected";

    // 1. update submission
    const { error: upErr } = await supabaseAdmin
      .from("payment_submissions")
      .update({
        status: newStatus,
        reviewed_at: reviewedAt,
        reviewed_by: context.userId,
        review_notes: data.notes ?? null,
      })
      .eq("id", sub.id);
    if (upErr) throw new Response(upErr.message, { status: 400 });

    // 2. audit log
    await supabaseAdmin.from("payment_approvals").insert({
      submission_id: sub.id,
      action: data.action,
      actor_id: context.userId,
      actor_role: role,
      notes: data.notes ?? null,
    });

    // 3. on approval: activate subscription + billing history
    if (data.action === "approve") {
      const periodStart = new Date();
      const periodEnd = new Date(periodStart);
      periodEnd.setDate(periodEnd.getDate() + intervalToDays(sub.billing_interval));

      // Extend if there's already an active future end
      const { data: curSub } = await supabaseAdmin
        .from("subscriptions")
        .select("current_period_end, plan_type")
        .eq("user_id", sub.user_id)
        .maybeSingle();
      let effectiveStart = periodStart;
      if (curSub?.current_period_end && new Date(curSub.current_period_end) > periodStart) {
        effectiveStart = new Date(curSub.current_period_end);
        periodEnd.setTime(
          effectiveStart.getTime() + intervalToDays(sub.billing_interval) * 86_400_000,
        );
      }

      const { error: subErr } = await supabaseAdmin
        .from("subscriptions")
        .update({
          plan_type: "pro",
          status: "active",
          billing_interval: sub.billing_interval,
          payment_method: sub.method,
          current_period_start: effectiveStart.toISOString(),
          current_period_end: periodEnd.toISOString(),
          expiry_date: periodEnd.toISOString(),
          cancel_at_period_end: false,
          provider: sub.method,
          provider_ref: sub.transaction_ref ?? sub.paypal_transaction_id ?? null,
          environment: "live",
        })
        .eq("user_id", sub.user_id);
      if (subErr) throw new Response(subErr.message, { status: 400 });

      await supabaseAdmin.from("billing_history").insert({
        user_id: sub.user_id,
        submission_id: sub.id,
        plan: "pro",
        billing_interval: sub.billing_interval,
        method: sub.method,
        amount_cents: sub.amount_cents,
        currency: sub.currency,
        period_start: effectiveStart.toISOString(),
        period_end: periodEnd.toISOString(),
      });
    }

    // 4. Send branded email (best-effort; never blocks the response)
    try {
      const { data: prof } = await supabaseAdmin
        .from("profiles")
        .select("email, name")
        .eq("id", sub.user_id)
        .maybeSingle();
      if (prof?.email) {
        const { sendAppEmail } = await import("@/lib/email-send.server");
        if (data.action === "approve") {
          await sendAppEmail({
            templateName: "payment-approved",
            recipientEmail: prof.email,
            templateData: { name: prof.name ?? "Athlete" },
            idempotencyKey: `payment-approved-${sub.id}`,
          });
        } else {
          await sendAppEmail({
            templateName: "payment-rejected",
            recipientEmail: prof.email,
            templateData: { name: prof.name ?? "Athlete", reason: data.notes ?? "" },
            idempotencyKey: `payment-rejected-${sub.id}`,
          });
        }
      }
    } catch (e) {
      console.error("[review] email send failed", e);
    }

    return { ok: true, status: newStatus };
  });
