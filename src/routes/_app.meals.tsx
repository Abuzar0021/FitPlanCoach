import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePlan } from "@/hooks/use-plan";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Utensils, RefreshCw, BookOpen } from "lucide-react";
import { EmptyState, PlanScreenSkeleton, ProBadge } from "@/components/app-ui";
import { MealAlternativesSheet } from "@/components/MealAlternativesSheet";
import { toast } from "sonner";

export const Route = createFileRoute("/_app/meals")({
  head: () => ({
    meta: [
      { title: "Your Meal Plan — FitPlanCoach" },
      {
        name: "description",
        content:
          "Today's personalized breakfast, lunch, dinner, and snack plan with macro targets — built around your goals, preferences, and budget.",
      },
      { property: "og:title", content: "Your FitPlanCoach Meal Plan" },
      {
        property: "og:description",
        content: "Personalized daily meals matched to your calorie and protein targets.",
      },
      { property: "og:url", content: "https://fitplancoach.com/meals" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/meals" }],
  }),
  component: Meals,
});

type MealItem = {
  food_id: string;
  name: string;
  grams: number;
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
};
type Meals = Record<"breakfast" | "lunch" | "dinner" | "snack", MealItem[]>;

type Category = "breakfast" | "lunch" | "dinner" | "snack";

function Meals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { has } = usePlan();
  const canCustomize = has("full_customization");
  const [plan, setPlan] = useState<{
    calories_target: number;
    protein_target: number;
    carbs_target: number | null;
    fat_target: number | null;
    meals: Meals;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [altFor, setAltFor] = useState<{ category: Category; index: number } | null>(null);

  function openAlternatives(category: Category, index: number) {
    if (!canCustomize) {
      toast.info("Meal alternatives are a Pro feature.");
      navigate({ to: "/subscription" });
      return;
    }
    setAltFor({ category, index });
  }

  function applySwap(item: MealItem) {
    if (!altFor) return;
    setPlan((p) => {
      if (!p) return p;
      const items = [...p.meals[altFor.category]];
      items[altFor.index] = item;
      return { ...p, meals: { ...p.meals, [altFor.category]: items } };
    });
  }

  useEffect(() => {
    if (!user) return;
    supabase
      .from("meal_plans")
      .select("calories_target,protein_target,carbs_target,fat_target,meals")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data) {
          setPlan(data as any);
          try {
            localStorage.setItem("myfp:last_meal_plan", JSON.stringify(data));
          } catch {
            /* localStorage unavailable (private mode/quota) — non-critical */
          }
        } else {
          try {
            const cached = localStorage.getItem("myfp:last_meal_plan");
            if (cached) setPlan(JSON.parse(cached));
          } catch {
            /* no cached plan / localStorage unavailable — non-critical */
          }
        }
        setLoading(false);
      });
  }, [user]);

  if (loading)
    return (
      <MobileShell>
        <PlanScreenSkeleton />
      </MobileShell>
    );
  if (!plan)
    return (
      <MobileShell>
        <EmptyState
          icon={Utensils}
          title="No meal plan yet"
          description="Generate your plan and your personalized breakfast, lunch, dinner, and snacks will appear here — built to hit your targets."
          action={
            <Link to="/dashboard">
              <Button className="font-bold uppercase tracking-wider h-11 px-6">
                Build my plan
              </Button>
            </Link>
          }
        />
      </MobileShell>
    );

  // Plans generated before macro tracking shipped won't have carbs/fat on
  // their stored items — fall back to 0 rather than propagating NaN through
  // every total and progress bar on this page.
  const totalCals = Object.values(plan.meals)
    .flat()
    .reduce((a, m) => a + m.calories, 0);
  const totalProt = Object.values(plan.meals)
    .flat()
    .reduce((a, m) => a + m.protein, 0);
  const totalCarbs = Object.values(plan.meals)
    .flat()
    .reduce((a, m) => a + (m.carbs ?? 0), 0);
  const totalFat = Object.values(plan.meals)
    .flat()
    .reduce((a, m) => a + (m.fat ?? 0), 0);

  const macroRows: Array<{
    label: string;
    total: number;
    target: number | null;
    unit: string;
    bar: string;
  }> = [
    {
      label: "Calories",
      total: totalCals,
      target: plan.calories_target,
      unit: "",
      bar: "bg-primary",
    },
    {
      label: "Protein",
      total: totalProt,
      target: plan.protein_target,
      unit: "g",
      bar: "bg-accent",
    },
    { label: "Carbs", total: totalCarbs, target: plan.carbs_target, unit: "g", bar: "bg-warning" },
    { label: "Fat", total: totalFat, target: plan.fat_target, unit: "g", bar: "bg-destructive" },
  ];

  return (
    <MobileShell>
      <p className="label-overline mb-1">Today</p>
      <h1 className="text-3xl font-display uppercase italic mb-4">Meal Plan</h1>
      <div className="surface-card mb-5 p-5 grid grid-cols-2 gap-4">
        {macroRows.map((r) => (
          <div key={r.label}>
            <p className="label-overline">{r.label}</p>
            <p className="text-2xl font-display tabular-nums mt-0.5">
              {r.total}
              {r.unit}{" "}
              {r.target != null && (
                <span className="text-xs text-muted-foreground font-sans">
                  / {r.target}
                  {r.unit}
                </span>
              )}
            </p>
            {r.target != null && (
              <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
                <div
                  className={`h-full ${r.bar} rounded-full`}
                  style={{ width: `${Math.min(100, (r.total / r.target) * 100)}%` }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
      <Link
        to="/food-diary"
        className="mb-5 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
      >
        <BookOpen className="size-3.5" /> Log what you actually ate
      </Link>
      {(["breakfast", "lunch", "dinner", "snack"] as const).map((cat) => {
        const emoji =
          cat === "breakfast" ? "🍳" : cat === "lunch" ? "🥗" : cat === "dinner" ? "🍲" : "🍎";
        const items = plan.meals[cat] ?? [];
        return (
          <section key={cat} className="mb-4">
            <div className="flex items-center gap-2 mb-2">
              <span className="text-base">{emoji}</span>
              <h2 className="font-display text-base uppercase italic tracking-wide">{cat}</h2>
            </div>
            <div className="surface-card divide-y divide-border overflow-hidden">
              {items.length === 0 && (
                <div className="p-4 text-sm text-muted-foreground">No items</div>
              )}
              {items.map((m, i) => (
                <div key={i} className="p-4 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-medium truncate">{m.name}</div>
                    <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                      {m.grams}g · {m.carbs ?? 0}c · {m.fat ?? 0}f
                    </div>
                  </div>
                  <div className="flex items-center gap-3 shrink-0">
                    <div className="text-right">
                      <div className="text-sm font-display tabular-nums">
                        {m.calories} <span className="text-[10px] text-muted-foreground">kcal</span>
                      </div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-primary tabular-nums">
                        {m.protein}g protein
                      </div>
                    </div>
                    <button
                      onClick={() => openAlternatives(cat, i)}
                      aria-label={`See alternatives for ${m.name}`}
                      title={canCustomize ? "See alternatives" : "See alternatives — Pro feature"}
                      className="size-9 rounded-xl bg-muted border border-border inline-flex items-center justify-center hover:bg-muted/70 transition relative shrink-0"
                    >
                      <RefreshCw className="size-4" />
                      {!canCustomize && <ProBadge className="absolute -top-2 -right-2 px-1 py-0" />}
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </section>
        );
      })}
      <MealAlternativesSheet
        open={altFor !== null}
        onOpenChange={(open) => !open && setAltFor(null)}
        category={altFor?.category ?? null}
        index={altFor?.index ?? null}
        currentName={altFor ? (plan.meals[altFor.category][altFor.index]?.name ?? "") : ""}
        onApplied={applySwap}
      />
    </MobileShell>
  );
}
