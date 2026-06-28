import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";

import { Button } from "@/components/ui/button";
import { ProgressRing, StatBar } from "@/components/ProgressRing";
import {
  Beef, Flame, Sparkles, ChevronRight, Settings, Dumbbell, Utensils, TrendingDown, TrendingUp, Minus, Crown, Zap, Trophy,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { calorieTargets, type CalorieRules, DEFAULT_RULES } from "@/lib/fitness-engine";
import { canGeneratePlan, type PlanContext, type PlanType } from "@/lib/access";
import { generateFitnessPlan } from "@/lib/plan-generation.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { WelcomeChecklist } from "@/components/WelcomeChecklist";
import { DashboardSkeleton } from "@/components/app-ui";
import { DailyTip } from "@/components/DailyTip";


export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — FitPlanCoach" },
      { name: "description", content: "Your daily macros, today's workout, recent weight trend, and current subscription status — all in one personalized FitPlanCoach dashboard." },
      { property: "og:title", content: "Your FitPlanCoach Dashboard" },
      { property: "og:description", content: "Daily targets, plan status, and progress at a glance." },
      { property: "og:url", content: "https://fitplancoach.com/dashboard" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/dashboard" }],
  }),
  component: Dashboard,
});

type Profile = {
  id: string; name: string | null; age: number | null; gender: "male"|"female"|"other"|null;
  height_cm: number | null; weight_kg: number | null; country: string | null;
  activity_level: "sedentary"|"light"|"moderate"|"active"|null;
  goal: "lose_fat"|"build_muscle"|"maintain"|null;
  budget_level: "low"|"medium"|"high"|null;
  onboarded: boolean;
  needs_plan_regeneration?: boolean;
  streak_current?: number | null;
  streak_longest?: number | null;
  avatar_url?: string | null;
};

type MealPlanRow = { calories_target: number; protein_target: number; meals: any };
type WorkoutDay = { day: string; focus: string; items: Array<{ name: string; sets: number; reps: string; rest_seconds: number }> };

function planBadgeStyle(plan: string) {
  switch (plan) {
    case "elite": return "from-amber-400 to-amber-600 text-black";
    case "premium": return "from-primary to-accent text-primary-foreground";
    case "pro": return "from-primary/80 to-primary text-primary-foreground";
    default: return "from-muted to-muted text-muted-foreground";
  }
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<{ plan_type: string; plan_count_used: number; status?: string; current_period_end?: string | null; billing_interval?: string | null } | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanRow | null>(null);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[] | null>(null);
  const [latestWeights, setLatestWeights] = useState<number[]>([]);
  const [rules, setRules] = useState<CalorieRules>(DEFAULT_RULES);
  const [freeLimit, setFreeLimit] = useState(1);
  const [busy, setBusy] = useState(false);
  const [adminCheck, setAdminCheck] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const [{ data: p }, { data: s }, { data: mp }, { data: wp }, { data: settings }, { data: roles }, { data: weights }] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase.from("subscriptions").select("plan_type,plan_count_used,status,current_period_end,billing_interval").eq("user_id", user.id).maybeSingle(),
        supabase.from("meal_plans").select("calories_target,protein_target,meals").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("workout_plans").select("schedule").eq("user_id", user.id).eq("is_active", true).order("created_at", { ascending: false }).limit(1).maybeSingle(),
        supabase.from("app_settings").select("key,value").in("key", ["calorie_rules","free_plan_limit"]),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase.from("progress_entries").select("weight_kg,recorded_at").eq("user_id", user.id).order("recorded_at", { ascending: false }).limit(7),
      ]);
      if (p && !p.onboarded) { navigate({ to: "/onboarding" }); return; }
      setProfile(p as Profile | null);
      setSub(s as any);
      setMealPlan((mp as any) ?? null);
      setWorkoutDays((wp?.schedule as WorkoutDay[] | null) ?? null);
      setLatestWeights(((weights ?? []) as any[]).map(w => Number(w.weight_kg)).reverse());
      const cr = settings?.find(s => s.key === "calorie_rules")?.value as CalorieRules | undefined;
      const fl = settings?.find(s => s.key === "free_plan_limit")?.value as number | undefined;
      if (cr) setRules(cr);
      if (typeof fl === "number") setFreeLimit(fl);
      setIsAdmin((roles ?? []).some((r: any) => r.role === "admin" || r.role === "owner"));
      setAdminCheck(true);
    })();
  }, [user, navigate]);

  const generateFn = useServerFn(generateFitnessPlan);

  async function generate() {
    if (!user || !profile) return;
    setBusy(true);
    try {
      const result = await generateFn({ data: {} as any });
      if (!result.ok) {
        if (result.reason === "needs_subscription") {
          toast.error(result.message);
          navigate({ to: "/subscription" });
          return;
        }
        toast.error(result.message);
        return;
      }
      try { localStorage.setItem("myfp:last_meal_plan", JSON.stringify(result.plan)); } catch {}
      toast.success("New plan generated");
      setMealPlan(result.plan as any);
      setSub(s => s ? { ...s, plan_count_used: result.plan_count_used } : s);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate plan");
    } finally { setBusy(false); }
  }

  useEffect(() => {
    if (!user || !profile?.needs_plan_regeneration || busy) return;
    (async () => {
      await supabase.from("profiles").update({ needs_plan_regeneration: false }).eq("id", user.id);
      setProfile(p => p ? { ...p, needs_plan_regeneration: false } : p);
      toast.info("Refreshing your plan for your new tier…");
      await generate();
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, profile?.needs_plan_regeneration]);

  const todayIndex = useMemo(() => {
    const d = new Date().getDay(); // 0..6
    return d === 0 ? 6 : d - 1; // Mon=0
  }, []);

  if (!profile) {
    return (
      <MobileShell>
        <DashboardSkeleton />
      </MobileShell>
    );
  }

  const stats = {
    age: profile.age ?? 30,
    gender: profile.gender ?? "other",
    height_cm: profile.height_cm ?? 170,
    weight_kg: profile.weight_kg ?? 70,
    activity_level: profile.activity_level ?? "moderate",
    goal: profile.goal ?? "maintain",
  };
  const targets = calorieTargets(stats, rules);
  const planType = sub?.plan_type ?? "free";
  const planCtx: PlanContext = {
    plan_type: planType as PlanType,
    status: sub?.status ?? null,
    current_period_end: sub?.current_period_end ?? null,
    billing_interval: (sub?.billing_interval as PlanContext["billing_interval"]) ?? null,
    plan_count_used: sub?.plan_count_used ?? 0,
    free_plan_limit: freeLimit,
  };
  const canGenerate = canGeneratePlan(planCtx);

  // Today's consumption (sum from meal plan if exists)
  const consumedCals = mealPlan
    ? Object.values(mealPlan.meals ?? {}).flat().reduce((a: number, m: any) => a + (m?.calories ?? 0), 0)
    : 0;
  const consumedProtein = mealPlan
    ? Object.values(mealPlan.meals ?? {}).flat().reduce((a: number, m: any) => a + (m?.protein ?? 0), 0)
    : 0;
  const remainingCals = Math.max(0, targets.calories - consumedCals);
  const calProgress = mealPlan ? Math.min(1, consumedCals / targets.calories) : 0;

  // Weight trend
  const weightTrend = latestWeights.length >= 2
    ? latestWeights[latestWeights.length - 1] - latestWeights[0]
    : 0;
  const TrendIcon = Math.abs(weightTrend) < 0.05 ? Minus : weightTrend < 0 ? TrendingDown : TrendingUp;
  const trendColor = Math.abs(weightTrend) < 0.05
    ? "text-muted-foreground"
    : (profile.goal === "lose_fat" ? (weightTrend < 0 ? "text-primary" : "text-warning") : (weightTrend > 0 ? "text-primary" : "text-warning"));

  const todayWorkout = workoutDays?.[todayIndex];
  const isRestDay = !todayWorkout || todayWorkout.focus?.toLowerCase().includes("rest");
  const estDuration = todayWorkout ? Math.max(20, todayWorkout.items.length * 7) : 0;

  const todayDate = new Date().toLocaleDateString(undefined, { weekday: "long", month: "short", day: "numeric" });

  return (
    <>
      
      <MobileShell>
        {/* Header */}
        <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 mb-6">
          <div className="min-w-0">
            <p className="label-overline">{todayDate}</p>
            <h1 className="text-2xl font-display uppercase truncate">
              Hi, {profile.name?.split(" ")[0] ?? "athlete"}
            </h1>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {adminCheck && isAdmin && (
              <Link to="/admin" className="size-10 rounded-xl bg-card border border-border inline-flex items-center justify-center hover:bg-muted transition" aria-label="Admin">
                <Sparkles className="size-4 text-primary" />
              </Link>
            )}
            <NotificationBell />
            <Link to="/profile" className="size-10 rounded-xl bg-card border border-border inline-flex items-center justify-center hover:bg-muted transition" aria-label="Profile">
              <Settings className="size-4" />
            </Link>
          </div>
        </header>

        {/* Streak strip */}
        {(profile.streak_current ?? 0) > 0 && (
          <div className="surface-card p-3 mb-4 flex items-center gap-3 animate-fade-in">
            <div className="size-10 rounded-xl bg-orange-500/10 border border-orange-500/30 inline-flex items-center justify-center">
              <Flame className="size-5 text-orange-500" />
            </div>
            <div className="flex-1 min-w-0">
              <p className="label-overline text-orange-500">Current streak</p>
              <p className="text-sm font-semibold">
                {profile.streak_current} day{profile.streak_current === 1 ? "" : "s"} in a row
                {(profile.streak_longest ?? 0) > (profile.streak_current ?? 0) && (
                  <span className="text-muted-foreground font-normal"> · best {profile.streak_longest}</span>
                )}
              </p>
            </div>
            <Trophy className="size-4 text-muted-foreground" />
          </div>
        )}

        <WelcomeChecklist
          hasProfile={!!(profile.weight_kg && profile.height_cm && profile.goal)}
          hasPlan={!!mealPlan}
          loggedWeight={latestWeights.length > 0}
          loggedWorkout={(profile.streak_longest ?? 0) > 0}
          isPro={planType !== "free"}
        />



        <DailyTip context={{ goal: profile.goal }} className="mb-4" />

        {/* Hero stats card */}
        <section className="surface-card p-5 mb-4 relative overflow-hidden">
          <div className="absolute -top-12 -right-12 size-40 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
          <div className="relative flex items-center gap-5">
            <ProgressRing value={calProgress} size={120} stroke={9} trackClassName="text-muted" progressClassName="text-primary">
              <span className="text-2xl font-display tabular-nums">{remainingCals.toLocaleString()}</span>
              <span className="label-overline mt-0.5">kcal left</span>
            </ProgressRing>
            <div className="flex-1 min-w-0 space-y-3.5">
              <StatBar label="Protein" value={consumedProtein} max={targets.protein} unit="g" className="bg-primary" />
              <StatBar
                label="Weight"
                value={profile.weight_kg ?? 0}
                max={Math.max(profile.weight_kg ?? 70, 100)}
                unit=" kg"
                className="bg-accent"
              />
              <div className="flex items-center gap-2 text-[11px] font-bold uppercase tracking-widest">
                <span className="label-overline">BMR</span>
                <span className="text-foreground tabular-nums">{targets.bmr}</span>
                <span className="text-muted-foreground">·</span>
                <span className="label-overline">Target</span>
                <span className="text-foreground tabular-nums">{targets.calories.toLocaleString()}</span>
              </div>
            </div>
          </div>
          <Button onClick={generate} disabled={busy} className="w-full mt-5 h-12 font-bold uppercase tracking-wider rounded-xl">
            {busy ? "Generating…" : mealPlan ? "Generate New Plan" : "Generate My First Plan"}
          </Button>
          {!canGenerate && (
            <p className="text-[11px] text-warning mt-2 text-center">
              Free limit reached — <Link to="/subscription" className="underline font-semibold">upgrade</Link> for unlimited plans.
            </p>
          )}
        </section>

        {/* Plan badge row */}
        <div className="flex items-center gap-2 mb-5">
          <Link
            to="/subscription"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${planBadgeStyle(planType)} text-[10px] font-bold uppercase tracking-widest shadow-sm`}
          >
            {planType === "elite" ? <Crown className="size-3" /> : <Zap className="size-3" fill="currentColor" />}
            {planType}
          </Link>
          {sub?.plan_count_used != null && planType === "free" && (
            <span className="text-[11px] text-muted-foreground">
              {sub.plan_count_used}/{freeLimit} free plans used
            </span>
          )}
        </div>

        {/* Today's session */}
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-display text-lg uppercase italic tracking-wide">Today's Session</h3>
          {!isRestDay && todayWorkout && (
            <span className="text-xs text-primary font-bold tabular-nums">{estDuration} MIN</span>
          )}
        </div>
        <Link
          to="/workouts"
          className="block surface-card p-5 mb-5 hover:border-border-strong transition-colors group"
        >
          <div className="flex items-start gap-4">
            <div className="size-12 shrink-0 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center">
              <Dumbbell className="size-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              {isRestDay ? (
                <>
                  <p className="label-overline text-primary">Recovery</p>
                  <h4 className="text-xl font-display uppercase italic mt-0.5">Rest day</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {workoutDays ? "Mobility, hydration, and sleep are gains too." : "Generate a plan to see today's workout."}
                  </p>
                </>
              ) : (
                <>
                  <p className="label-overline text-primary">{todayWorkout.focus}</p>
                  <h4 className="text-xl font-display uppercase italic mt-0.5 truncate">{todayWorkout.day}</h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {todayWorkout.items.length} exercises · ~{estDuration} min
                  </p>
                </>
              )}
            </div>
            <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition shrink-0 mt-1" />
          </div>
        </Link>

        {/* Today's meals summary */}
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-display text-lg uppercase italic tracking-wide">Meal Log</h3>
          <Link to="/meals" className="text-[11px] font-bold uppercase tracking-widest text-primary">View all</Link>
        </div>
        <div className="space-y-2.5 mb-5">
          {(["breakfast","lunch","dinner","snack"] as const).map(cat => {
            const items = (mealPlan?.meals?.[cat] ?? []) as Array<{ name: string; calories: number; protein: number }>;
            const totalCal = items.reduce((a, m) => a + m.calories, 0);
            const totalP = items.reduce((a, m) => a + m.protein, 0);
            const emoji = cat === "breakfast" ? "🍳" : cat === "lunch" ? "🥗" : cat === "dinner" ? "🍲" : "🍎";
            const empty = items.length === 0;
            return (
              <Link
                key={cat}
                to="/meals"
                className="flex items-center gap-3 bg-card/60 border border-border p-3 rounded-2xl hover:border-border-strong transition"
              >
                <div className="size-11 shrink-0 rounded-xl bg-muted inline-flex items-center justify-center text-xl">
                  {empty ? <Utensils className="size-4 text-muted-foreground" /> : emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize truncate">{cat}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {empty ? "—" : `${totalCal} kcal · ${totalP}g protein`}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {/* Weight progress mini */}
        <Link to="/progress" className="block surface-card p-5 mb-4 hover:border-border-strong transition">
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="label-overline">Current weight</p>
              <p className="text-2xl font-display tabular-nums mt-0.5">
                {profile.weight_kg?.toFixed(1) ?? "—"} <span className="text-sm text-muted-foreground font-sans">kg</span>
              </p>
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold ${trendColor}`}>
              <TrendIcon className="size-3.5" />
              <span className="tabular-nums">
                {weightTrend === 0 ? "0.0" : `${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)}`} kg
              </span>
            </div>
          </div>
          {latestWeights.length > 1 && (
            <div className="h-12 flex items-end gap-1.5">
              {latestWeights.map((w, i) => {
                const min = Math.min(...latestWeights);
                const max = Math.max(...latestWeights);
                const range = max - min || 1;
                const h = 20 + ((w - min) / range) * 60;
                const isLast = i === latestWeights.length - 1;
                return (
                  <div
                    key={i}
                    className={`flex-1 rounded-t ${isLast ? "bg-primary" : "bg-muted"}`}
                    style={{ height: `${h}%` }}
                  />
                );
              })}
            </div>
          )}
        </Link>

        <div className="grid grid-cols-2 gap-3 mb-2">
          <div className="metric-card">
            <Flame className="size-4 text-primary mb-1.5" />
            <p className="label-overline">Calorie target</p>
            <p className="text-lg font-display tabular-nums">{targets.calories.toLocaleString()}</p>
          </div>
          <div className="metric-card">
            <Beef className="size-4 text-primary mb-1.5" />
            <p className="label-overline">Protein target</p>
            <p className="text-lg font-display tabular-nums">{targets.protein}g</p>
          </div>
        </div>
      </MobileShell>
    </>
  );
}
