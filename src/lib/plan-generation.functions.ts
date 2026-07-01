import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import {
  generateMealPlan,
  pickWorkoutTemplate,
  adaptScheduleForHome,
  pickFoods,
  portionFood,
  MEAL_CATEGORY_SPLIT,
  type Food,
  type WorkoutTemplate,
  type CalorieRules,
  DEFAULT_RULES,
  type UserStats,
  type Equipment,
} from "@/lib/fitness-engine";
import { hasFeature, DEFAULT_FREE_PLAN_LIMIT, type PlanContext } from "@/lib/access";

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
        | undefined) ?? DEFAULT_FREE_PLAN_LIMIT;

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

    // Fail honestly instead of silently reporting "ok: true" with an empty
    // plan — an empty foods/templates catalog previously produced a
    // "successful" plan with zero meals and no workout, which looked exactly
    // like generation was broken.
    if (!foods || foods.length === 0) {
      return {
        ok: false,
        reason: "error",
        message: "No foods are configured yet — an admin needs to add some in /admin/foods.",
      };
    }

    const mealPlan = generateMealPlan(
      stats,
      profile.country ?? "global",
      (profile.budget_level ?? "medium") as "low" | "medium" | "high",
      (foods ?? []) as unknown as Food[],
      rules,
    );
    const hasAnyMeal = Object.values(mealPlan.meals).some((items) => items.length > 0);
    if (!hasAnyMeal) {
      return {
        ok: false,
        reason: "error",
        message:
          "No foods match your country/budget combination yet — an admin needs to add some in /admin/foods.",
      };
    }
    const workout = pickWorkoutTemplate(
      stats.goal,
      stats.activity_level,
      (templates ?? []) as unknown as WorkoutTemplate[],
      (profile.experience_level ?? undefined) as
        | "beginner"
        | "intermediate"
        | "advanced"
        | undefined,
    );
    const workoutSchedule = workout
      ? adaptScheduleForHome(
          workout.schedule as Array<{ day: string; focus: string; items: Array<{ name: string }> }>,
          (profile.workout_location ?? "gym") as "gym" | "home",
          (profile.available_equipment ?? []) as Equipment[],
        )
      : null;

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
    if (workout && workoutSchedule) {
      await supabase
        .from("workout_plans")
        .insert({ user_id: userId, template_id: workout.id, schedule: workoutSchedule as any });
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

    // First-ever plan → send the one-time welcome email. Best-effort and
    // server-only: sendAppEmail skips silently if LOVABLE_API_KEY is unset and
    // never throws, so it can't break plan generation.
    if (freeUsed === 0 && profile.email) {
      const { sendAppEmail } = await import("@/lib/email-send.server");
      await sendAppEmail({
        templateName: "welcome",
        recipientEmail: profile.email,
        templateData: { name: profile.name ?? undefined },
        idempotencyKey: `welcome-${userId}`,
      });
    }

    return {
      ok: true,
      plan: mealPlan,
      workout: workout ? { id: workout.id, name: workout.name } : null,
      plan_type: planType,
      plan_count_used: freeUsed + 1,
    };
  });

type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";
type MealsShape = Record<MealCategory, Array<{ food_id: string }>>;

type SwapResult =
  | { ok: true; item: ReturnType<typeof portionFood> }
  | { ok: false; reason: "needs_subscription" | "no_alternatives" | "not_found"; message: string };

/**
 * Pro-only: swap a single meal item for a different food from the same
 * category/country/budget pool. Real "full customization" — the entitlement
 * check happens here, server-side, not just in the UI, so it can't be
 * bypassed by a free user calling this directly.
 */
export const swapMealItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        index: z.number().int().min(0).max(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<SwapResult> => {
    const { supabase, userId } = context;

    const [{ data: sub }, { data: profile }, { data: plan }] = await Promise.all([
      supabase.from("subscriptions").select("*").eq("user_id", userId).maybeSingle(),
      supabase.from("profiles").select("country,budget_level").eq("id", userId).maybeSingle(),
      supabase
        .from("meal_plans")
        .select("id,calories_target,meals")
        .eq("user_id", userId)
        .eq("is_active", true)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle(),
    ]);

    const planCtx = (sub ?? { plan_type: "free" }) as PlanContext;
    if (!hasFeature(planCtx, "full_customization")) {
      return {
        ok: false,
        reason: "needs_subscription",
        message: "Swapping meal items is a Pro feature.",
      };
    }
    if (!profile || !plan) {
      return { ok: false, reason: "not_found", message: "No active meal plan found." };
    }

    const meals = plan.meals as unknown as MealsShape;
    const items = meals[data.category] ?? [];
    const current = items[data.index];
    if (!current) {
      return { ok: false, reason: "not_found", message: "That meal item no longer exists." };
    }

    const { data: foods } = await supabase.from("foods").select("*").eq("enabled", true);
    const pool = pickFoods(
      (foods ?? []) as unknown as Food[],
      data.category,
      profile.country ?? "global",
      (profile.budget_level ?? "medium") as "low" | "medium" | "high",
    );
    const usedIds = new Set(items.map((i) => i.food_id));
    const alternatives = pool.filter((f) => !usedIds.has(f.id));
    if (alternatives.length === 0) {
      return {
        ok: false,
        reason: "no_alternatives",
        message: "No other options available for this meal right now.",
      };
    }

    const chosen = alternatives[Math.floor(Math.random() * alternatives.length)];
    const catCals = plan.calories_target * MEAL_CATEGORY_SPLIT[data.category];
    const perItemCals = catCals / items.length;
    const newItem = portionFood(chosen, perItemCals);

    const updatedMeals = { ...meals, [data.category]: [...items] };
    updatedMeals[data.category][data.index] = newItem;

    const { error } = await supabase
      .from("meal_plans")
      .update({ meals: updatedMeals as any })
      .eq("id", plan.id);
    if (error) {
      return { ok: false, reason: "not_found", message: "Could not save the swap." };
    }

    return { ok: true, item: newItem };
  });
