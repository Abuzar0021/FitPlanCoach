// Central membership hook. One place that loads the signed-in user's plan and
// exposes the access.ts helpers, so screens never re-implement plan logic or
// re-query `subscriptions`. Server-side enforcement still lives in the
// `has_active_subscription` RPC inside server functions — this is UI gating.
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import {
  hasFeature,
  canGeneratePlan,
  planLabel,
  isPro as isProPlan,
  DEFAULT_FREE_PLAN_LIMIT,
  type PlanContext,
  type Feature,
} from "@/lib/access";

const FREE: PlanContext = { plan_type: "free" };

export interface UsePlan {
  loading: boolean;
  plan: PlanContext;
  label: string;
  isPro: boolean;
  /** True when the plan grants the given feature. */
  has: (feature: Feature) => boolean;
  /** True when the user may generate another plan (limit- and tier-aware). */
  canGenerate: boolean;
  refresh: () => Promise<void>;
}

export function usePlan(): UsePlan {
  const { user } = useAuth();
  const [plan, setPlan] = useState<PlanContext>(FREE);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setPlan(FREE);
      setLoading(false);
      return;
    }
    const db: any = supabase;
    const [{ data: s }, { data: settings }] = await Promise.all([
      db
        .from("subscriptions")
        .select("plan_type,status,current_period_end,billing_interval,plan_count_used")
        .eq("user_id", user.id)
        .maybeSingle(),
      db.from("app_settings").select("value").eq("key", "free_plan_limit").maybeSingle(),
    ]);
    const limit = typeof settings?.value === "number" ? settings.value : DEFAULT_FREE_PLAN_LIMIT;
    setPlan({ ...(s ?? FREE), free_plan_limit: limit } as PlanContext);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  return {
    loading,
    plan,
    label: planLabel(plan),
    isPro: isProPlan(plan),
    has: (feature: Feature) => hasFeature(plan, feature),
    canGenerate: canGeneratePlan(plan),
    refresh,
  };
}
