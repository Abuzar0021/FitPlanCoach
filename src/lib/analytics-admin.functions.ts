import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

// Owner/admin analytics. Reads the whole analytics_events table with the service
// role, so it is staff-gated and aggregates server-side before returning.

async function ensureStaff(userId: string) {
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", userId)
    .in("role", ["admin", "owner"]);
  if (!data || data.length === 0) throw new Response("Forbidden", { status: 403 });
}

export interface AnalyticsSummary {
  rangeDays: number;
  totalEvents: number;
  uniqueUsers: number;
  byEvent: { event: string; count: number }[];
  daily: { date: string; events: number }[];
  keyMetrics: {
    signups: number;
    onboarded: number;
    plansGenerated: number;
    subscriptions: number;
    pageViews: number;
    playStoreClicks: number;
  };
}

export const getAnalyticsSummary = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z.object({ days: z.coerce.number().int().min(1).max(365).default(30) }).parse(d ?? {}),
  )
  .handler(async ({ context, data }): Promise<AnalyticsSummary> => {
    await ensureStaff(context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const db: any = supabaseAdmin;
    const cutoff = new Date(Date.now() - data.days * 86400000).toISOString();
    const { data: rows } = await db
      .from("analytics_events")
      .select("event,created_at,user_id")
      .gte("created_at", cutoff)
      .order("created_at", { ascending: true })
      .limit(100000);
    const events = (rows ?? []) as Array<{
      event: string;
      created_at: string;
      user_id: string | null;
    }>;

    const byEventMap = new Map<string, number>();
    const userSet = new Set<string>();
    const dailyMap = new Map<string, number>();
    for (const e of events) {
      byEventMap.set(e.event, (byEventMap.get(e.event) ?? 0) + 1);
      if (e.user_id) userSet.add(e.user_id);
      const day = e.created_at.slice(0, 10);
      dailyMap.set(day, (dailyMap.get(day) ?? 0) + 1);
    }

    const daily: { date: string; events: number }[] = [];
    for (let i = data.days - 1; i >= 0; i--) {
      const d = new Date(Date.now() - i * 86400000).toISOString().slice(0, 10);
      daily.push({ date: d, events: dailyMap.get(d) ?? 0 });
    }

    const byEvent = [...byEventMap.entries()]
      .map(([event, count]) => ({ event, count }))
      .sort((a, b) => b.count - a.count);
    const get = (k: string) => byEventMap.get(k) ?? 0;

    return {
      rangeDays: data.days,
      totalEvents: events.length,
      uniqueUsers: userSet.size,
      byEvent,
      daily,
      keyMetrics: {
        signups: get("signup"),
        onboarded: get("onboarded"),
        plansGenerated: get("plan_generated"),
        subscriptions: get("subscription_purchased"),
        pageViews: get("page_view"),
        playStoreClicks: get("play_store_click"),
      },
    };
  });
