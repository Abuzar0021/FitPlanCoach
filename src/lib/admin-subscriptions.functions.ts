import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { z } from "zod";

async function assertAdminOrOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: isAdmin } = await supabaseAdmin.rpc("has_role", {
    _user_id: userId,
    _role: "admin",
  });
  const { data: isOwner } = await supabaseAdmin.rpc("is_owner", { _user_id: userId });
  if (!isAdmin && !isOwner) throw new Response("Forbidden", { status: 403 });
  return { isOwner: !!isOwner, isAdmin: !!isAdmin };
}

async function assertOwner(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data: isOwner } = await supabaseAdmin.rpc("is_owner", { _user_id: userId });
  if (!isOwner) throw new Response("Forbidden — owner only", { status: 403 });
}

export const adminResetSubscription = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertAdminOrOwner(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin
      .from("subscriptions")
      .update({
        plan_type: "free",
        status: "active",
        expiry_date: null,
        plan_count_used: 0,
        billing_interval: null,
        current_period_start: null,
        current_period_end: null,
        renews_at: null,
        ends_at: null,
        cancel_at_period_end: false,
      })
      .eq("user_id", data.userId);
    if (error) throw error;
    return { ok: true };
  });

// `incrementPlanCountUsed` was removed: plan_count_used is incremented internally
// by `generateFitnessPlan` via the service-role client; exposing a user-callable
// setter let any account reset their counter to 0 and bypass the free plan limit.

// Owner-only: grant or revoke admin role on another user.
export const setAdminRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ userId: z.string().uuid(), grant: z.boolean() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    if (data.userId === context.userId)
      throw new Response("Cannot modify your own role", { status: 400 });
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    if (data.grant) {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .insert({ user_id: data.userId, role: "admin" });
      if (error && !String(error.message).includes("duplicate")) throw error;
    } else {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", data.userId)
        .eq("role", "admin");
      if (error) throw error;
    }
    return { ok: true };
  });

// Owner-only: securely transfer ownership to another verified user.
export const transferOwnership = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((data) => z.object({ newOwnerId: z.string().uuid() }).parse(data))
  .handler(async ({ context, data }) => {
    await assertOwner(context.userId);
    if (data.newOwnerId === context.userId) {
      throw new Response("Invalid target", { status: 400 });
    }
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    // Confirm target is a verified auth user
    const { data: target, error: targetErr } = await supabaseAdmin.auth.admin.getUserById(
      data.newOwnerId,
    );
    if (targetErr || !target?.user?.email_confirmed_at) {
      throw new Response("Target account must be a verified user", { status: 400 });
    }
    // Promote target to owner
    const { error: insErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: data.newOwnerId, role: "owner" });
    if (insErr && !String(insErr.message).toLowerCase().includes("duplicate")) {
      throw new Response(insErr.message, { status: 400 });
    }
    // Demote previous owner to admin and remove owner role
    await supabaseAdmin
      .from("user_roles")
      .delete()
      .eq("user_id", context.userId)
      .eq("role", "owner");
    const { error: adminErr } = await supabaseAdmin
      .from("user_roles")
      .insert({ user_id: context.userId, role: "admin" });
    if (adminErr && !String(adminErr.message).toLowerCase().includes("duplicate")) {
      throw new Response(adminErr.message, { status: 400 });
    }
    return { ok: true };
  });
