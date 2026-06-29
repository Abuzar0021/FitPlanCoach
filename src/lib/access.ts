// Central feature-access system. Use everywhere instead of ad-hoc
// `plan_type !== 'free'` checks so plan changes update permissions in one place.
//
// Server-side enforcement is performed separately via the
// `has_active_subscription` Postgres RPC inside server functions.

export type PlanType = "free" | "pro" | "premium" | "elite";
export type BillingInterval = "monthly" | "annual" | null;

export type Feature =
  | "unlimited_plans"
  | "weekly_regen"
  | "full_customization"
  | "advanced_analytics"
  | "streaks"
  | "achievements"
  | "priority_support"
  | "annual_perks";

export interface PlanContext {
  plan_type: PlanType;
  billing_interval?: BillingInterval;
  status?: string | null; // 'active' | 'trialing' | 'past_due' | 'canceled' | 'expired'
  current_period_end?: string | null;
  plan_count_used?: number;
  free_plan_limit?: number;
}

function isActive(p: PlanContext): boolean {
  if (p.plan_type === "free") return false;
  const status = (p.status ?? "active").toLowerCase();
  const okStatus = ["active", "trialing", "past_due"].includes(status);
  if (!okStatus) {
    // canceled/expired but still within paid period
    if (p.current_period_end && new Date(p.current_period_end) > new Date()) return true;
    return false;
  }
  if (p.current_period_end && new Date(p.current_period_end) < new Date()) return false;
  return true;
}

export function hasFeature(p: PlanContext, feature: Feature): boolean {
  const active = isActive(p);
  const isPro =
    active && (p.plan_type === "pro" || p.plan_type === "premium" || p.plan_type === "elite");
  const isPremium = active && (p.plan_type === "premium" || p.plan_type === "elite");
  const isElite = active && p.plan_type === "elite";
  const isAnnual = active && p.billing_interval === "annual";

  switch (feature) {
    case "unlimited_plans":
      return isPro;
    case "weekly_regen":
      return isPro;
    case "full_customization":
      return isPro;
    case "advanced_analytics":
      return isPro;
    case "streaks":
    case "achievements":
      return true;
    case "priority_support":
      return isPro;
    case "annual_perks":
      return isAnnual || isPremium || isElite;
  }
}

export function canGeneratePlan(p: PlanContext): boolean {
  if (hasFeature(p, "unlimited_plans")) return true;
  const used = p.plan_count_used ?? 0;
  const limit = p.free_plan_limit ?? 1;
  return used < limit;
}

export function planLabel(p: PlanContext): string {
  if (!isActive(p)) return "Free";
  if (p.plan_type === "pro") return p.billing_interval === "annual" ? "Pro Annual" : "Pro Monthly";
  if (p.plan_type === "premium") return "Premium";
  if (p.plan_type === "elite") return "Elite";
  return "Free";
}

export function isPro(p: PlanContext): boolean {
  return isActive(p) && p.plan_type !== "free";
}
