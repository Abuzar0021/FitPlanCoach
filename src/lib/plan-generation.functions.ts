import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateMealPlan,
  pickWorkoutTemplate,
  type Food,
  type WorkoutTemplate,
  type CalorieRules,
  DEFAULT_RULES,
  type UserStats,
} from "@/lib/fitness-engine";

type GenerateResult =
  | {
      ok: true;
      plan: ReturnType<typeof generateMealPlan>;
      workout: { id: string; name: string } | null;
      plan_type: string;
      plan_count_used: number;
    }
  | { ok: false; reason: "needs_subscription" | "not_onboarded" | "error"; message: string };

export const generateFitnessPlan = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }): Promise<GenerateResult> => {
    const { supabase, userId } = context;

    const [{ data: profile }, { data: sub }, { data: settings }] = await Promise.all([
      supabase.from("profiles").select("*").eq("id", userId).maybeSingle(),
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      supabase
        .from("app_settings")
        .select("key,value")
        .in("key", ["calorie_rules", "free_plan_limit"]),
    ]);

    if (!profile || !profile.onboarded) {
      return { ok: false, reason: "not_onboarded", message: "Complete onboarding first." };
    }

    const rules =
      ((settings ?? []).find((s: any) => s.key === "calorie_rules")
        ?.value as unknown as CalorieRules) ?? DEFAULT_RULES;
    const freeLimit =
      ((settings ?? []).find((s: any) => s.key === "free_plan_limit")?.value as
        | number
        | undefined) ?? 1;

    // SERVER-SIDE ENTITLEMENT GATE — single source of truth.
    const planType = (sub?.plan_type ?? "free") as "free" | "pro" | "premium" | "elite";
    const status = sub?.status ?? "active";
    const periodEndMs = sub?.current_period_end ? new Date(sub.current_period_end).getTime() : null;
    const now = Date.now();

    const paidActive =
      planType !== "free" &&
      ((["active", "trialing", "past_due"].includes(status) &&
        (periodEndMs === null || periodEndMs > now)) ||
        (["canceled", "cancelled"].includes(status) && periodEndMs !== null && periodEndMs > now));

    const freeUsed = sub?.plan_count_used ?? 0;
    if (!paidActive && freeUsed >= freeLimit) {
      return {
        ok: false,
        reason: "needs_subscription",
        message: "Free plan limit reached — upgrade to generate more plans.",
      };
    }

    const stats: UserStats = {
      age: profile.age ?? 30,
      gender: (profile.gender ?? "other") as UserStats["gender"],
      height_cm: profile.height_cm ?? 170,
      weight_kg: profile.weight_kg ?? 70,
      activity_level: (profile.activity_level ?? "moderate") as UserStats["activity_level"],
      goal: (profile.goal ?? "maintain") as UserStats["goal"],
    };

    const [{ data: foods }, { data: templates }] = await Promise.all([
      supabase.from("foods").select("*").eq("enabled", true),
      supabase.from("workout_templates").select("*").eq("enabled", true),
    ]);

    const mealPlan = generateMealPlan(
      stats,
      profile.country ?? "global",
      (profile.budget_level ?? "medium") as "low" | "medium" | "high",
      (foods ?? []) as unknown as Food[],
      rules,
    );
    const workout = pickWorkoutTemplate(
      stats.goal,
      stats.activity_level,
      (templates ?? []) as unknown as WorkoutTemplate[],
    );

    await supabase
      .from("meal_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);
    await supabase
      .from("workout_plans")
      .update({ is_active: false })
      .eq("user_id", userId)
      .eq("is_active", true);

    await supabase.from("meal_plans").insert({
      user_id: userId,
      calories_target: mealPlan.calories_target,
      protein_target: mealPlan.protein_target,
      meals: mealPlan.meals as any,
    });
    if (workout) {
      await supabase
        .from("workout_plans")
        .insert({ user_id: userId, template_id: workout.id, schedule: workout.schedule as any });
    }

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin
      .from("subscriptions")
      .update({ plan_count_used: freeUsed + 1 })
      .eq("user_id", userId);

    await supabase.from("analytics_events").insert({
      user_id: userId,
      event: "plan_generated",
      meta: { goal: stats.goal, plan_type: planType },
    });

    return {
      ok: true,
      plan: mealPlan,
      workout: workout ? { id: workout.id, name: workout.name } : null,
      plan_type: planType,
      plan_count_used: freeUsed + 1,
    };
  });
