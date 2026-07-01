import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";

import { Button } from "@/components/ui/button";
import { ProgressRing, StatBar } from "@/components/ProgressRing";
import {
  Beef,
  Flame,
  Sparkles,
  ChevronRight,
  Settings,
  Dumbbell,
  Utensils,
  TrendingDown,
  TrendingUp,
  Minus,
  Crown,
  Zap,
  Trophy,
  Scale,
  RefreshCw,
  CalendarCheck,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { calorieTargets, type CalorieRules, DEFAULT_RULES } from "@/lib/fitness-engine";
import { canGeneratePlan, hasFeature, type PlanContext, type PlanType } from "@/lib/access";
import { generateFitnessPlan } from "@/lib/plan-generation.functions";
import { useServerFn } from "@tanstack/react-start";
import { toast } from "sonner";
import { WelcomeChecklist } from "@/components/WelcomeChecklist";
import { DashboardSkeleton } from "@/components/app-ui";
import { DailyTip } from "@/components/DailyTip";
import { WaterTracker } from "@/components/WaterTracker";
import { localDateKey } from "@/lib/date";

export const Route = createFileRoute("/_app/dashboard")({
  head: () => ({
    meta: [
      { title: "Your Dashboard — FitPlanCoach" },
      {
        name: "description",
        content:
          "Your daily macros, today's workout, recent weight trend, and current subscription status — all in one personalized FitPlanCoach dashboard.",
      },
      { property: "og:title", content: "Your FitPlanCoach Dashboard" },
      {
        property: "og:description",
        content: "Daily targets, plan status, and progress at a glance.",
      },
      { property: "og:url", content: "https://fitplancoach.com/dashboard" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/dashboard" }],
  }),
  component: Dashboard,
});

type Profile = {
  id: string;
  name: string | null;
  age: number | null;
  gender: "male" | "female" | "other" | null;
  height_cm: number | null;
  weight_kg: number | null;
  country: string | null;
  activity_level: "sedentary" | "light" | "moderate" | "active" | null;
  goal: "lose_fat" | "build_muscle" | "maintain" | null;
  budget_level: "low" | "medium" | "high" | null;
  onboarded: boolean;
  needs_plan_regeneration?: boolean;
  streak_current?: number | null;
  streak_longest?: number | null;
  avatar_url?: string | null;
};

type MealPlanRow = {
  calories_target: number;
  protein_target: number;
  meals: any;
  created_at: string;
};
type WorkoutDay = {
  day: string;
  focus: string;
  items: Array<{ name: string; sets: number; reps: string; rest_seconds: number }>;
};

function planBadgeStyle(plan: string) {
  switch (plan) {
    case "elite":
      return "from-amber-400 to-amber-600 text-black";
    case "premium":
      return "from-primary to-accent text-primary-foreground";
    case "pro":
      return "from-primary/80 to-primary text-primary-foreground";
    default:
      return "from-muted to-muted text-muted-foreground";
  }
}

function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState<Profile | null>(null);
  const [sub, setSub] = useState<{
    plan_type: string;
    plan_count_used: number;
    status?: string;
    current_period_end?: string | null;
    billing_interval?: string | null;
  } | null>(null);
  const [mealPlan, setMealPlan] = useState<MealPlanRow | null>(null);
  const [workoutDays, setWorkoutDays] = useState<WorkoutDay[] | null>(null);
  const [latestWeights, setLatestWeights] = useState<number[]>([]);
  const [rules, setRules] = useState<CalorieRules>(DEFAULT_RULES);
  const [freeLimit, setFreeLimit] = useState(1);
  const [busy, setBusy] = useState(false);
  const [adminCheck, setAdminCheck] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loggedToday, setLoggedToday] = useState<
    Record<"breakfast" | "lunch" | "dinner" | "snack", { calories: number; protein: number }>
  >({
    breakfast: { calories: 0, protein: 0 },
    lunch: { calories: 0, protein: 0 },
    dinner: { calories: 0, protein: 0 },
    snack: { calories: 0, protein: 0 },
  });
  const [weekWorkoutCount, setWeekWorkoutCount] = useState(0);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const today = localDateKey();
      const weekAgo = localDateKey(new Date(Date.now() - 6 * 86400000));
      const [
        { data: p },
        { data: s },
        { data: mp },
        { data: wp },
        { data: settings },
        { data: roles },
        { data: weights },
        { data: foodLog },
        { data: weekSessions },
      ] = await Promise.all([
        supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
        supabase
          .from("subscriptions")
          .select("plan_type,plan_count_used,status,current_period_end,billing_interval")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("meal_plans")
          .select("calories_target,protein_target,meals,created_at")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("workout_plans")
          .select("schedule")
          .eq("user_id", user.id)
          .eq("is_active", true)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle(),
        supabase
          .from("app_settings")
          .select("key,value")
          .in("key", ["calorie_rules", "free_plan_limit"]),
        supabase.from("user_roles").select("role").eq("user_id", user.id),
        supabase
          .from("progress_entries")
          .select("weight_kg,recorded_at")
          .eq("user_id", user.id)
          .order("recorded_at", { ascending: false })
          .limit(7),
        supabase
          .from("food_log_entries")
          .select("meal_category,calories,protein")
          .eq("user_id", user.id)
          .eq("logged_date", today),
        supabase
          .from("workout_sessions")
          .select("performed_on")
          .eq("user_id", user.id)
          .gte("performed_on", weekAgo),
      ]);
      if (!p || !p.onboarded) {
        // No row at all (e.g. the signup trigger's row was lost) or genuinely
        // not onboarded yet — either way, onboarding is what creates/repairs
        // it. Without this, a missing row left `profile` state null forever
        // with no redirect, so the dashboard just spun on its skeleton.
        navigate({ to: "/onboarding" });
        return;
      }
      setProfile(p as Profile | null);
      setSub(s as any);
      setMealPlan((mp as any) ?? null);
      setWorkoutDays((wp?.schedule as WorkoutDay[] | null) ?? null);
      setLatestWeights(((weights ?? []) as any[]).map((w) => Number(w.weight_kg)).reverse());
      const cr = settings?.find((s) => s.key === "calorie_rules")?.value as
        | CalorieRules
        | undefined;
      const fl = settings?.find((s) => s.key === "free_plan_limit")?.value as number | undefined;
      if (cr) setRules(cr);
      if (typeof fl === "number") setFreeLimit(fl);
      setIsAdmin((roles ?? []).some((r: any) => r.role === "admin" || r.role === "owner"));
      setAdminCheck(true);
      const byCat = {
        breakfast: { calories: 0, protein: 0 },
        lunch: { calories: 0, protein: 0 },
        dinner: { calories: 0, protein: 0 },
        snack: { calories: 0, protein: 0 },
      };
      for (const row of (foodLog ?? []) as Array<{
        meal_category: keyof typeof byCat;
        calories: number;
        protein: number;
      }>) {
        byCat[row.meal_category].calories += row.calories;
        byCat[row.meal_category].protein += row.protein;
      }
      setLoggedToday(byCat);
      setWeekWorkoutCount(new Set((weekSessions ?? []).map((s: any) => s.performed_on)).size);
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
      try {
        localStorage.setItem("myfp:last_meal_plan", JSON.stringify(result.plan));
      } catch {
        /* localStorage unavailable (private mode/quota) — non-critical */
      }
      toast.success("New plan generated");
      setMealPlan(result.plan as any);
      setSub((s) => (s ? { ...s, plan_count_used: result.plan_count_used } : s));
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not generate plan");
    } finally {
      setBusy(false);
    }
  }

  useEffect(() => {
    if (!user || !profile?.needs_plan_regeneration || busy) return;
    (async () => {
      await supabase.from("profiles").update({ needs_plan_regeneration: false }).eq("id", user.id);
      setProfile((p) => (p ? { ...p, needs_plan_regeneration: false } : p));
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
  const planAgeDays = mealPlan
    ? Math.floor((Date.now() - new Date(mealPlan.created_at).getTime()) / 86400000)
    : null;
  const weeklyRefreshReady =
    hasFeature(planCtx, "weekly_regen") && planAgeDays !== null && planAgeDays >= 7;

  // Today's real consumption — from what the user actually logged in the
  // food diary, not the static generated plan (which never changes through
  // the day regardless of what was actually eaten).
  const loggedTotals = Object.values(loggedToday).reduce(
    (a, m) => ({ calories: a.calories + m.calories, protein: a.protein + m.protein }),
    { calories: 0, protein: 0 },
  );
  const consumedCals = loggedTotals.calories;
  const consumedProtein = loggedTotals.protein;
  const hasLoggedAnything = consumedCals > 0;
  const remainingCals = Math.max(0, targets.calories - consumedCals);
  const calProgress = Math.min(1, consumedCals / targets.calories);

  // Weight trend
  const weightTrend =
    latestWeights.length >= 2 ? latestWeights[latestWeights.length - 1] - latestWeights[0] : 0;
  const TrendIcon =
    Math.abs(weightTrend) < 0.05 ? Minus : weightTrend < 0 ? TrendingDown : TrendingUp;
  const trendColor =
    Math.abs(weightTrend) < 0.05
      ? "text-muted-foreground"
      : profile.goal === "lose_fat"
        ? weightTrend < 0
          ? "text-primary"
          : "text-warning"
        : weightTrend > 0
          ? "text-primary"
          : "text-warning";

  const todayWorkout = workoutDays?.[todayIndex];
  const isRestDay = !todayWorkout || todayWorkout.focus?.toLowerCase().includes("rest");
  const estDuration = todayWorkout ? Math.max(20, todayWorkout.items.length * 7) : 0;

  const todayDate = new Date().toLocaleDateString(undefined, {
    weekday: "long",
    month: "short",
    day: "numeric",
  });

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
              <Link
                to="/admin"
                className="size-10 rounded-xl bg-card border border-border inline-flex items-center justify-center hover:bg-muted transition"
                aria-label="Admin"
              >
                <Sparkles className="size-4 text-primary" />
              </Link>
            )}
            <NotificationBell />
            <Link
              to="/profile"
              className="size-10 rounded-xl bg-card border border-border inline-flex items-center justify-center hover:bg-muted transition"
              aria-label="Profile"
            >
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
                  <span className="text-muted-foreground font-normal">
                    {" "}
                    · best {profile.streak_longest}
                  </span>
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
            <ProgressRing
              value={calProgress}
              size={120}
              stroke={9}
              trackClassName="text-muted"
              progressClassName="text-primary"
            >
              <span className="text-2xl font-display tabular-nums">
                {hasLoggedAnything
                  ? remainingCals.toLocaleString()
                  : targets.calories.toLocaleString()}
              </span>
              <span className="label-overline mt-0.5">
                {hasLoggedAnything ? "kcal left" : "kcal target"}
              </span>
            </ProgressRing>
            <div className="flex-1 min-w-0 space-y-3.5">
              <StatBar
                label="Protein"
                value={consumedProtein}
                max={targets.protein}
                unit="g"
                className="bg-primary"
              />
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
                <span className="text-foreground tabular-nums">
                  {targets.calories.toLocaleString()}
                </span>
              </div>
            </div>
          </div>
          {weeklyRefreshReady && (
            <div className="mt-5 rounded-xl bg-primary/10 border border-primary/30 px-4 py-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-primary">
                  Weekly refresh ready
                </p>
                <p className="text-[11px] text-muted-foreground mt-0.5">
                  It's been {planAgeDays} days — a Pro perk, refresh your plan for the week ahead.
                </p>
              </div>
              <Crown className="size-5 text-primary shrink-0" />
            </div>
          )}
          {canGenerate ? (
            <>
              <Button
                onClick={generate}
                disabled={busy}
                className="w-full mt-5 h-12 font-bold uppercase tracking-wider rounded-xl"
              >
                {busy
                  ? "Generating…"
                  : weeklyRefreshReady
                    ? "Refresh My Plan For This Week"
                    : mealPlan
                      ? "Generate New Plan"
                      : "Generate My First Plan"}
              </Button>
              {planType === "free" && (
                <p className="text-[11px] text-muted-foreground mt-2 text-center">
                  You have {Math.max(0, freeLimit - (sub?.plan_count_used ?? 0))} of {freeLimit} AI
                  generations remaining.
                </p>
              )}
            </>
          ) : (
            <Link to="/subscription" className="block mt-5">
              <div className="w-full rounded-2xl bg-gradient-to-r from-primary to-accent p-4 text-primary-foreground shadow-[var(--shadow-lime)]">
                <div className="flex items-center gap-2 mb-1">
                  <Crown className="size-4" />
                  <span className="text-xs font-bold uppercase tracking-widest">
                    Free generations used up
                  </span>
                </div>
                <p className="text-sm font-semibold">
                  You've used all {freeLimit} free AI plans. Go Pro for unlimited generations,
                  weekly refreshes, and full customization.
                </p>
                <div className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold uppercase tracking-widest bg-background/20 rounded-full px-3 py-1.5">
                  Upgrade to Pro <ChevronRight className="size-3.5" />
                </div>
              </div>
            </Link>
          )}
        </section>

        {/* Plan badge row */}
        <div className="flex items-center gap-2 mb-5">
          <Link
            to="/subscription"
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-gradient-to-r ${planBadgeStyle(planType)} text-[10px] font-bold uppercase tracking-widest shadow-sm`}
          >
            {planType === "elite" ? (
              <Crown className="size-3" />
            ) : (
              <Zap className="size-3" fill="currentColor" />
            )}
            {planType}
          </Link>
          {sub?.plan_count_used != null && planType === "free" && (
            <span className="text-[11px] text-muted-foreground">
              {sub.plan_count_used}/{freeLimit} free plans used
            </span>
          )}
        </div>

        {/* Quick actions */}
        <div className="grid grid-cols-4 gap-2.5 mb-5">
          <Link
            to="/food-diary"
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border hover:border-border-strong transition"
          >
            <Utensils className="size-4 text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Log food
            </span>
          </Link>
          <Link
            to="/workouts"
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border hover:border-border-strong transition"
          >
            <Dumbbell className="size-4 text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Train
            </span>
          </Link>
          <Link
            to="/progress"
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border hover:border-border-strong transition"
          >
            <Scale className="size-4 text-primary" />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Weigh in
            </span>
          </Link>
          <button
            onClick={generate}
            disabled={busy || !canGenerate}
            className="flex flex-col items-center gap-1.5 py-3 rounded-2xl bg-card border border-border hover:border-border-strong transition disabled:opacity-40"
          >
            <RefreshCw className={`size-4 text-primary ${busy ? "animate-spin" : ""}`} />
            <span className="text-[9px] font-bold uppercase tracking-wider text-muted-foreground">
              Refresh plan
            </span>
          </button>
        </div>

        {/* Water + this week */}
        <div className="grid grid-cols-2 gap-3 mb-5">
          {user && <WaterTracker userId={user.id} weightKg={profile.weight_kg ?? null} />}
          <div className="metric-card">
            <p className="label-overline inline-flex items-center gap-1">
              <CalendarCheck className="size-3 text-primary" /> This week
            </p>
            <p className="text-lg font-display tabular-nums mt-0.5">
              {weekWorkoutCount}
              <span className="text-[10px] text-muted-foreground ml-1">/ 7 days trained</span>
            </p>
            <div className="h-1.5 bg-muted rounded-full mt-2 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full"
                style={{ width: `${Math.min(100, (weekWorkoutCount / 7) * 100)}%` }}
              />
            </div>
          </div>
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
                    {workoutDays
                      ? "Mobility, hydration, and sleep are gains too."
                      : "Generate a plan to see today's workout."}
                  </p>
                </>
              ) : (
                <>
                  <p className="label-overline text-primary">{todayWorkout.focus}</p>
                  <h4 className="text-xl font-display uppercase italic mt-0.5 truncate">
                    {todayWorkout.day}
                  </h4>
                  <p className="text-xs text-muted-foreground mt-1">
                    {todayWorkout.items.length} exercises · ~{estDuration} min
                  </p>
                </>
              )}
            </div>
            <ChevronRight className="size-5 text-muted-foreground group-hover:text-foreground transition shrink-0 mt-1" />
          </div>
        </Link>

        {/* Today's real food diary summary — what was actually logged, not
            what the generated plan assumes. */}
        <div className="flex justify-between items-end mb-3">
          <h3 className="font-display text-lg uppercase italic tracking-wide">Logged Today</h3>
          <Link
            to="/food-diary"
            className="text-[11px] font-bold uppercase tracking-widest text-primary"
          >
            Open diary
          </Link>
        </div>
        <div className="space-y-2.5 mb-5">
          {(["breakfast", "lunch", "dinner", "snack"] as const).map((cat) => {
            const totals = loggedToday[cat];
            const emoji =
              cat === "breakfast" ? "🍳" : cat === "lunch" ? "🥗" : cat === "dinner" ? "🍲" : "🍎";
            const empty = totals.calories === 0;
            return (
              <Link
                key={cat}
                to="/food-diary"
                className="flex items-center gap-3 bg-card/60 border border-border p-3 rounded-2xl hover:border-border-strong transition"
              >
                <div className="size-11 shrink-0 rounded-xl bg-muted inline-flex items-center justify-center text-xl">
                  {empty ? <Utensils className="size-4 text-muted-foreground" /> : emoji}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold capitalize truncate">{cat}</p>
                  <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                    {empty
                      ? "Nothing logged yet"
                      : `${totals.calories} kcal · ${totals.protein}g protein`}
                  </p>
                </div>
                <ChevronRight className="size-4 text-muted-foreground" />
              </Link>
            );
          })}
        </div>

        {/* Weight progress mini */}
        <Link
          to="/progress"
          className="block surface-card p-5 mb-4 hover:border-border-strong transition"
        >
          <div className="flex items-center justify-between mb-3">
            <div>
              <p className="label-overline">Current weight</p>
              <p className="text-2xl font-display tabular-nums mt-0.5">
                {profile.weight_kg?.toFixed(1) ?? "—"}{" "}
                <span className="text-sm text-muted-foreground font-sans">kg</span>
              </p>
            </div>
            <div className={`inline-flex items-center gap-1 text-xs font-bold ${trendColor}`}>
              <TrendIcon className="size-3.5" />
              <span className="tabular-nums">
                {weightTrend === 0
                  ? "0.0"
                  : `${weightTrend > 0 ? "+" : ""}${weightTrend.toFixed(1)}`}{" "}
                kg
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
