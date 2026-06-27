import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function ensureStaff(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "owner"]);
  if (!data || data.length === 0) throw new Response("Forbidden", { status: 403 });
}

export const createSupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      subject: z.string().min(3).max(140),
      category: z.enum(["account", "billing", "payment", "technical", "feedback", "other"]),
      message: z.string().min(5).max(4000),
      priority: z.enum(["low", "normal", "high", "urgent"]).default("normal"),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: ticket, error } = await db
      .from("support_tickets")
      .insert({
        user_id: context.userId,
        subject: data.subject,
        category: data.category,
        priority: data.priority,
      })
      .select("id")
      .single();
    if (error || !ticket) throw new Response(error?.message ?? "Failed to create ticket", { status: 400 });
    await db.from("support_ticket_messages").insert({
      ticket_id: ticket.id,
      author_id: context.userId,
      author_role: "user",
      body: data.message,
    });
    return { ok: true, id: ticket.id };
  });

export const replySupportTicket = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      ticket_id: z.string().uuid(),
      body: z.string().min(1).max(4000),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const { data: ticket, error } = await db
      .from("support_tickets")
      .select("id, user_id")
      .eq("id", data.ticket_id)
      .maybeSingle();
    if (error || !ticket) throw new Response("Not found", { status: 404 });

    const { data: roles } = await db
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    const isStaff = (roles ?? []).some((r: any) => r.role === "admin" || r.role === "owner");
    if (ticket.user_id !== context.userId && !isStaff) throw new Response("Forbidden", { status: 403 });

    await db.from("support_ticket_messages").insert({
      ticket_id: data.ticket_id,
      author_id: context.userId,
      author_role: isStaff ? "staff" : "user",
      body: data.body,
    });
    if (isStaff && ticket.user_id !== context.userId) {
      await db.from("support_tickets").update({ status: "waiting_user" }).eq("id", data.ticket_id);
    } else if (!isStaff) {
      await db.from("support_tickets").update({ status: "open" }).eq("id", data.ticket_id);
    }
    return { ok: true };
  });

export const updateTicketStatus = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d) =>
    z.object({
      ticket_id: z.string().uuid(),
      status: z.enum(["open", "in_progress", "waiting_user", "resolved", "closed"]),
    }).parse(d),
  )
  .handler(async ({ context, data }) => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    await db.from("support_tickets").update({ status: data.status }).eq("id", data.ticket_id);
    return { ok: true };
  });
