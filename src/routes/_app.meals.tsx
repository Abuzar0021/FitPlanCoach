import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { usePlan } from "@/hooks/use-plan";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Utensils, RefreshCw, Loader2 } from "lucide-react";
import { EmptyState, PlanScreenSkeleton, ProBadge } from "@/components/app-ui";
import { swapMealItem } from "@/lib/plan-generation.functions";

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

type Meals = Record<
  "breakfast" | "lunch" | "dinner" | "snack",
  Array<{ food_id: string; name: string; grams: number; calories: number; protein: number }>
>;

type Category = "breakfast" | "lunch" | "dinner" | "snack";

function Meals() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { has } = usePlan();
  const canCustomize = has("full_customization");
  const doSwap = useServerFn(swapMealItem);
  const [plan, setPlan] = useState<{
    calories_target: number;
    protein_target: number;
    meals: Meals;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [swapping, setSwapping] = useState<string | null>(null);

  async function swap(category: Category, index: number) {
    if (!canCustomize) {
      toast.info("Swapping meal items is a Pro feature.");
      navigate({ to: "/subscription" });
      return;
    }
    const key = `${category}:${index}`;
    setSwapping(key);
    try {
      const res = await doSwap({ data: { category, index } });
      if (!res.ok) {
        toast.error(res.message);
        return;
      }
      setPlan((p) => {
        if (!p) return p;
        const items = [...p.meals[category]];
        items[index] = res.item;
        return { ...p, meals: { ...p.meals, [category]: items } };
      });
      toast.success(`Swapped to ${res.item.name}`);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not swap this item");
    } finally {
      setSwapping(null);
    }
  }

  useEffect(() => {
    if (!user) return;
    supabase
      .from("meal_plans")
      .select("calories_target,protein_target,meals")
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

  const totalCals = Object.values(plan.meals)
    .flat()
    .reduce((a, m) => a + m.calories, 0);
  const totalProt = Object.values(plan.meals)
    .flat()
    .reduce((a, m) => a + m.protein, 0);

  return (
    <MobileShell>
      <p className="label-overline mb-1">Today</p>
      <h1 className="text-3xl font-display uppercase italic mb-4">Meal Plan</h1>
      <div className="surface-card mb-5 p-5 grid grid-cols-2 gap-4">
        <div>
          <p className="label-overline">Calories</p>
          <p className="text-2xl font-display tabular-nums mt-0.5">
            {totalCals}{" "}
            <span className="text-xs text-muted-foreground font-sans">
              / {plan.calories_target}
            </span>
          </p>
          <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-primary rounded-full"
              style={{ width: `${Math.min(100, (totalCals / plan.calories_target) * 100)}%` }}
            />
          </div>
        </div>
        <div>
          <p className="label-overline">Protein</p>
          <p className="text-2xl font-display tabular-nums mt-0.5">
            {totalProt}g{" "}
            <span className="text-xs text-muted-foreground font-sans">
              / {plan.protein_target}g
            </span>
          </p>
          <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
            <div
              className="h-full bg-accent rounded-full"
              style={{ width: `${Math.min(100, (totalProt / plan.protein_target) * 100)}%` }}
            />
          </div>
        </div>
      </div>
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
              {items.map((m, i) => {
                const key = `${cat}:${i}`;
                const isSwapping = swapping === key;
                return (
                  <div key={i} className="p-4 flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{m.name}</div>
                      <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground">
                        {m.grams}g
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      <div className="text-right">
                        <div className="text-sm font-display tabular-nums">
                          {m.calories}{" "}
                          <span className="text-[10px] text-muted-foreground">kcal</span>
                        </div>
                        <div className="text-[10px] uppercase tracking-widest font-bold text-primary tabular-nums">
                          {m.protein}g protein
                        </div>
                      </div>
                      <button
                        onClick={() => swap(cat, i)}
                        disabled={isSwapping}
                        aria-label={`Swap ${m.name}`}
                        title={canCustomize ? "Swap this item" : "Swap this item — Pro feature"}
                        className="size-9 rounded-xl bg-muted border border-border inline-flex items-center justify-center hover:bg-muted/70 transition disabled:opacity-50 relative shrink-0"
                      >
                        {isSwapping ? (
                          <Loader2 className="size-4 animate-spin" />
                        ) : (
                          <RefreshCw className="size-4" />
                        )}
                        {!canCustomize && (
                          <ProBadge className="absolute -top-2 -right-2 px-1 py-0" />
                        )}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </section>
        );
      })}
    </MobileShell>
  );
}
