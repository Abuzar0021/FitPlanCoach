import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import type { SupabaseClient } from "@supabase/supabase-js";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import type { Database } from "@/integrations/supabase/types";
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

/**
 * Return a consumed generation credit when generation aborts for a reason
 * that isn't the user's fault (empty catalog, failed save). Tries the atomic
 * DB function; if it isn't deployed yet, falls back to a plain decrement
 * using the known post-consumption count. Best-effort — never throws, so a
 * refund failure can't mask the real error being returned to the user.
 */
async function refundGenerationCredit(
  admin: SupabaseClient<Database>,
  userId: string,
  currentCount: number,
): Promise<void> {
  try {
    const { error } = await admin.rpc("refund_plan_generation_credit", { p_user_id: userId });
    if (error) {
      await admin
        .from("subscriptions")
        .update({ plan_count_used: Math.max(0, currentCount - 1) })
        .eq("user_id", userId);
    }
  } catch (err) {
    console.error("[generateFitnessPlan] credit refund failed", err);
  }
}

type GenerateResult =
  | {
      ok: true;
      plan: ReturnType<typeof generateMealPlan>;
      workout: { id: string; name: string };
      // The actual per-day schedule just saved to workout_plans — returned
      // so the dashboard can update its "Today's Session" preview
      // immediately instead of showing the previous plan's workout until
      // the next full page load.
      workout_schedule: Array<{ day: string; focus: string; items: Array<{ name: string }> }>;
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

    // Fast, non-authoritative pre-check using the value already fetched
    // above — lets an obviously-over-limit user fail immediately without
    // paying for the foods/templates queries below. This is NOT the real
    // gate: consume_plan_generation_credit (further down) re-checks the
    // limit atomically in the database and is what actually prevents a
    // free user from exceeding it under concurrent requests.
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
    if (!templates || templates.length === 0) {
      return {
        ok: false,
        reason: "error",
        message:
          "No workout templates are configured yet — an admin needs to add some in /admin/workouts.",
      };
    }

    // Consume a generation credit BEFORE doing any of the (slower) generation
    // work, so a missing/misconfigured SUPABASE_SERVICE_ROLE_KEY fails here,
    // before any plan rows are written — not after.
    //
    // Primary path: the atomic consume_plan_generation_credit DB function,
    // which does the free-limit check-and-increment as one conditional UPDATE
    // so two concurrent requests (a double-click, two open tabs) can't both
    // slip past the limit. Fallback path: this app's schema is applied by
    // hand and can lag the code, so if that function isn't present in the
    // database yet — or errors for any reason — we fall back to the plain
    // read-check-increment that shipped before the atomic function existed.
    // Generation must not be held hostage to a migration the operator hasn't
    // pasted yet; the generated plan is 100% real either way, only the
    // race-hardening of the counter differs.
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    let planCountUsed: number;
    try {
      const { data: credit, error: creditError } = await supabaseAdmin
        .rpc("consume_plan_generation_credit", {
          p_user_id: userId,
          p_unlimited: paidActive,
          p_free_limit: freeLimit,
        })
        .single();

      if (creditError) {
        // Function not deployed / not yet migrated / any RPC-level failure →
        // fall back to the pre-RPC approach rather than failing generation.
        console.warn(
          "[generateFitnessPlan] consume_plan_generation_credit unavailable, falling back to direct increment:",
          creditError.message,
        );
        if (!paidActive && freeUsed >= freeLimit) {
          return {
            ok: false,
            reason: "needs_subscription",
            message: "Free plan limit reached — upgrade to generate more plans.",
          };
        }
        const { error: incError } = await supabaseAdmin
          .from("subscriptions")
          .update({ plan_count_used: freeUsed + 1 })
          .eq("user_id", userId);
        if (incError) {
          console.error("[generateFitnessPlan] fallback credit increment failed", incError);
          return {
            ok: false,
            reason: "error",
            message: "Could not start plan generation — please try again in a moment.",
          };
        }
        planCountUsed = freeUsed + 1;
      } else if (!credit.allowed) {
        return {
          ok: false,
          reason: "needs_subscription",
          message: "Free plan limit reached — upgrade to generate more plans.",
        };
      } else {
        planCountUsed = credit.plan_count_used;
      }
    } catch (err) {
      console.error("[generateFitnessPlan] plan generation credit check threw", err);
      return {
        ok: false,
        reason: "error",
        message: "Plan generation is temporarily unavailable — please try again in a moment.",
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
      await refundGenerationCredit(supabaseAdmin, userId, planCountUsed);
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
    if (!workout) {
      // Unreachable given the templates.length guard above, but keep the
      // failure path honest (and the credit refunded) rather than silently
      // returning a workout-less plan if pickWorkoutTemplate's logic ever
      // changes.
      await refundGenerationCredit(supabaseAdmin, userId, planCountUsed);
      return {
        ok: false,
        reason: "error",
        message:
          "No workout templates match your goal yet — an admin needs to add some in /admin/workouts.",
      };
    }
    const workoutSchedule = adaptScheduleForHome(
      workout.schedule as Array<{ day: string; focus: string; items: Array<{ name: string }> }>,
      (profile.workout_location ?? "gym") as "gym" | "home",
      (profile.available_equipment ?? []) as Equipment[],
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

    const { error: mealInsertError } = await supabase.from("meal_plans").insert({
      user_id: userId,
      calories_target: mealPlan.calories_target,
      protein_target: mealPlan.protein_target,
      carbs_target: mealPlan.carbs_target,
      fat_target: mealPlan.fat_target,
      meals: mealPlan.meals as any,
    });
    const { error: workoutInsertError } = await supabase
      .from("workout_plans")
      .insert({ user_id: userId, template_id: workout.id, schedule: workoutSchedule as any });

    // Persistence must actually succeed — returning "ok: true" for a plan
    // that failed to save is exactly the "generation succeeds but nothing
    // shows up" symptom this function used to be able to produce silently.
    if (mealInsertError || workoutInsertError) {
      console.error("[generateFitnessPlan] failed to save generated plan", {
        mealInsertError,
        workoutInsertError,
      });
      await refundGenerationCredit(supabaseAdmin, userId, planCountUsed);
      return {
        ok: false,
        reason: "error",
        message: "Could not save your new plan — please try again.",
      };
    }

    // Best-effort analytics — never blocks or fails the user-facing result.
    await supabase.from("analytics_events").insert({
      user_id: userId,
      event: "plan_generated",
      meta: { goal: stats.goal, plan_type: planType },
    });

    // First-ever plan → send the one-time welcome email. Best-effort and
    // server-only: sendAppEmail skips silently if LOVABLE_API_KEY is unset and
    // never throws, so it can't break plan generation.
    if (planCountUsed === 1 && profile.email) {
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
      workout: { id: workout.id, name: workout.name },
      workout_schedule: workoutSchedule,
      plan_type: planType,
      plan_count_used: planCountUsed,
    };
  });

type MealCategory = "breakfast" | "lunch" | "dinner" | "snack";
type MealsShape = Record<MealCategory, Array<{ food_id: string }>>;

/** Shared setup for both alternatives-lookup and swap: entitlement + active plan + item lookup. */
async function loadSwapContext(
  supabase: SupabaseClient<Database>,
  userId: string,
  category: MealCategory,
  index: number,
) {
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
      ok: false as const,
      reason: "needs_subscription" as const,
      message: "Swapping meal items is a Pro feature.",
    };
  }
  if (!profile || !plan) {
    return {
      ok: false as const,
      reason: "not_found" as const,
      message: "No active meal plan found.",
    };
  }

  const meals = plan.meals as unknown as MealsShape;
  const items = meals[category] ?? [];
  const current = items[index];
  if (!current) {
    return {
      ok: false as const,
      reason: "not_found" as const,
      message: "That meal item no longer exists.",
    };
  }

  const { data: foods } = await supabase.from("foods").select("*").eq("enabled", true);
  const pool = pickFoods(
    (foods ?? []) as unknown as Food[],
    category,
    profile.country ?? "global",
    (profile.budget_level ?? "medium") as "low" | "medium" | "high",
  );
  const usedIds = new Set(items.map((i) => i.food_id));
  const alternatives = pool.filter((f) => !usedIds.has(f.id));

  return { ok: true as const, plan, meals, items, alternatives };
}

type AlternativesResult =
  | { ok: true; options: Array<ReturnType<typeof portionFood>> }
  | { ok: false; reason: "needs_subscription" | "no_alternatives" | "not_found"; message: string };

/**
 * Pro-only: list up to 3 real alternative foods for a meal slot (same
 * category/country/budget pool), each portioned to the same calorie target
 * as the slot, so the user can compare and pick one instead of an opaque
 * random swap.
 */
export const getMealAlternatives = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        index: z.number().int().min(0).max(1),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<AlternativesResult> => {
    const ctx = await loadSwapContext(context.supabase, context.userId, data.category, data.index);
    if (!ctx.ok) return ctx;
    if (ctx.alternatives.length === 0) {
      return {
        ok: false,
        reason: "no_alternatives",
        message: "No other options available for this meal right now.",
      };
    }
    const catCals = ctx.plan.calories_target * MEAL_CATEGORY_SPLIT[data.category];
    const perItemCals = catCals / ctx.items.length;
    // Stable, varied order (not just catalog order) without being random on
    // every call — callers may re-request the same slot and expect the same
    // three options back.
    const sorted = [...ctx.alternatives].sort((a, b) => a.name.localeCompare(b.name));
    const options = sorted.slice(0, 3).map((f) => portionFood(f, perItemCals));
    return { ok: true, options };
  });

type SwapResult =
  | { ok: true; item: ReturnType<typeof portionFood> }
  | { ok: false; reason: "needs_subscription" | "no_alternatives" | "not_found"; message: string };

/**
 * Pro-only: apply a chosen alternative (from getMealAlternatives) to a meal
 * slot. Real "full customization" — the entitlement check happens here,
 * server-side, not just in the UI, so it can't be bypassed by a free user
 * calling this directly.
 */
export const swapMealItem = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((d: unknown) =>
    z
      .object({
        category: z.enum(["breakfast", "lunch", "dinner", "snack"]),
        index: z.number().int().min(0).max(1),
        food_id: z.string().uuid(),
      })
      .parse(d),
  )
  .handler(async ({ context, data }): Promise<SwapResult> => {
    const { supabase } = context;
    const ctx = await loadSwapContext(context.supabase, context.userId, data.category, data.index);
    if (!ctx.ok) return ctx;

    const chosen = ctx.alternatives.find((f) => f.id === data.food_id);
    if (!chosen) {
      return {
        ok: false,
        reason: "not_found",
        message: "That option is no longer available — pick another.",
      };
    }

    const catCals = ctx.plan.calories_target * MEAL_CATEGORY_SPLIT[data.category];
    const perItemCals = catCals / ctx.items.length;
    const newItem = portionFood(chosen, perItemCals);

    const updatedMeals = { ...ctx.meals, [data.category]: [...ctx.items] };
    updatedMeals[data.category][data.index] = newItem;

    const { error } = await supabase
      .from("meal_plans")
      .update({ meals: updatedMeals as any })
      .eq("id", ctx.plan.id);
    if (error) {
      return { ok: false, reason: "not_found", message: "Could not save the swap." };
    }

    return { ok: true, item: newItem };
  });
