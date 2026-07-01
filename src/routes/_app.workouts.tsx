import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useServerFn } from "@tanstack/react-start";
import { logWorkoutSession } from "@/lib/engagement.functions";
import { localDateKey } from "@/lib/date";
import { toast } from "sonner";
import { CheckCircle2, Flame, Dumbbell, Info, ChevronDown, Trophy } from "lucide-react";
import { EmptyState, PlanScreenSkeleton } from "@/components/app-ui";
import { ExerciseDetailSheet } from "@/components/ExerciseDetailSheet";

export const Route = createFileRoute("/_app/workouts")({
  head: () => ({
    meta: [
      { title: "Your Workouts — FitPlanCoach" },
      {
        name: "description",
        content:
          "Your weekly workout schedule with sets, reps, and rest — matched to your equipment, experience, and availability. Log sessions and grow your streak.",
      },
      { property: "og:title", content: "Your FitPlanCoach Workouts" },
      {
        property: "og:description",
        content: "Personalized weekly training plan with built-in progression.",
      },
      { property: "og:url", content: "https://fitplancoach.com/workouts" },
      { name: "robots", content: "noindex,follow" },
    ],
    links: [{ rel: "canonical", href: "https://fitplancoach.com/workouts" }],
  }),
  component: Workouts,
});

type Item = { name: string; sets: number; reps: string; rest_seconds: number };
type Day = { day: string; focus: string; items: Item[] };
type SetRow = { reps: string; weight: string };

function Workouts() {
  const { user } = useAuth();
  const [days, setDays] = useState<Day[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [logging, setLogging] = useState(false);
  const [streak, setStreak] = useState<number>(0);
  const [detailFor, setDetailFor] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<number | null>(null);
  const [setLogs, setSetLogs] = useState<Record<number, SetRow[]>>({});
  const logFn = useServerFn(logWorkoutSession);

  useEffect(() => {
    if (!user) return;
    supabase
      .from("workout_plans")
      .select("schedule")
      .eq("user_id", user.id)
      .eq("is_active", true)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle()
      .then(({ data }) => {
        if (data?.schedule) setDays(data.schedule as Day[]);
        setLoading(false);
      });
    (supabase as any)
      .from("profiles")
      .select("streak_current")
      .eq("id", user.id)
      .maybeSingle()
      .then(({ data }: any) => setStreak(data?.streak_current ?? 0));
  }, [user]);

  // A fresh set of blank rows for an item, or the ones already in progress.
  function rowsFor(itemIndex: number, targetSets: number): SetRow[] {
    return (
      setLogs[itemIndex] ?? Array.from({ length: targetSets }, () => ({ reps: "", weight: "" }))
    );
  }

  function toggleExpand(itemIndex: number, targetSets: number) {
    setExpanded((cur) => (cur === itemIndex ? null : itemIndex));
    setSetLogs((cur) =>
      cur[itemIndex] ? cur : { ...cur, [itemIndex]: rowsFor(itemIndex, targetSets) },
    );
  }

  function updateSet(itemIndex: number, setIndex: number, field: "reps" | "weight", value: string) {
    setSetLogs((cur) => {
      const rows = [...(cur[itemIndex] ?? [])];
      rows[setIndex] = { ...rows[setIndex], [field]: value };
      return { ...cur, [itemIndex]: rows };
    });
  }

  async function markDone(day: Day) {
    setLogging(true);
    try {
      const sets = day.items.flatMap((it, i) =>
        (setLogs[i] ?? [])
          .map((row, si) => ({
            exercise_name: it.name,
            set_number: si + 1,
            reps: row.reps.trim() ? Number(row.reps) : undefined,
            weight_kg: row.weight.trim() ? Number(row.weight) : undefined,
          }))
          .filter((r) => r.reps !== undefined || r.weight_kg !== undefined),
      );
      const plannedSets = day.items.reduce((a, it) => a + it.sets, 0);
      const res = await logFn({
        data: {
          focus: day.focus,
          duration_min: Math.max(20, day.items.length * 7),
          localDate: localDateKey(),
          sets,
          planned_sets: plannedSets,
        },
      });
      setStreak(res.streak_current);
      setSetLogs({});
      setExpanded(null);
      if (res.prs.length) {
        toast.success(`🏆 New PR: ${res.prs.join(", ")}!`);
      } else if (res.unlocked.length) {
        toast.success(
          `🏆 ${res.unlocked.length} achievement${res.unlocked.length === 1 ? "" : "s"} unlocked!`,
        );
      } else {
        toast.success(`Logged · streak ${res.streak_current} 🔥`);
      }
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Could not log workout");
    } finally {
      setLogging(false);
    }
  }

  if (loading)
    return (
      <MobileShell>
        <PlanScreenSkeleton />
      </MobileShell>
    );
  if (!days)
    return (
      <MobileShell>
        <EmptyState
          icon={Dumbbell}
          title="No workout plan yet"
          description="Generate your personalized weekly training plan and your first session will appear right here."
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

  const day = days[activeDay];

  const estDuration = Math.max(20, day.items.length * 7);
  const loggedSetCount = Object.values(setLogs).reduce(
    (a, rows) => a + rows.filter((r) => r.reps.trim() || r.weight.trim()).length,
    0,
  );
  return (
    <MobileShell>
      <p className="label-overline mb-1">This week</p>
      <h1 className="text-3xl font-display uppercase italic mb-4">Train</h1>
      <div className="flex gap-2 overflow-x-auto pb-3 -mx-5 px-5 mb-5 no-scrollbar">
        {days.map((d, i) => {
          const active = activeDay === i;
          return (
            <button
              key={i}
              onClick={() => {
                setActiveDay(i);
                setSetLogs({});
                setExpanded(null);
              }}
              className={`shrink-0 px-4 py-3 rounded-2xl border text-sm transition ${
                active
                  ? "bg-primary text-primary-foreground border-primary shadow-[var(--shadow-lime)]"
                  : "border-border bg-card hover:border-border-strong"
              }`}
            >
              <div className="font-bold uppercase text-xs tracking-wider">{d.day}</div>
              <div
                className={`text-[10px] mt-0.5 ${active ? "opacity-80" : "text-muted-foreground"} truncate max-w-[80px]`}
              >
                {d.focus}
              </div>
            </button>
          );
        })}
      </div>
      <div className="flex items-center justify-between mb-3">
        <div>
          <p className="label-overline text-primary">{day.focus}</p>
          <h2 className="font-display text-xl uppercase italic">{day.day}</h2>
        </div>
        <span className="text-xs font-bold text-primary tabular-nums">~{estDuration} MIN</span>
      </div>
      <div className="surface-card divide-y divide-border overflow-hidden">
        {day.items.map((it, i) => {
          const isOpen = expanded === i;
          const rows = setLogs[i];
          const filledCount = rows
            ? rows.filter((r) => r.reps.trim() || r.weight.trim()).length
            : 0;
          return (
            <div key={i}>
              <div className="w-full p-4 flex items-center gap-3">
                <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 inline-flex items-center justify-center text-xs font-display text-primary tabular-nums shrink-0">
                  {i + 1}
                </div>
                <button
                  onClick={() => setDetailFor(it.name)}
                  className="flex-1 min-w-0 text-left"
                  aria-label={`View instructions for ${it.name}`}
                >
                  <div className="font-semibold truncate inline-flex items-center gap-1.5">
                    {it.name}
                    <Info className="size-3 text-muted-foreground shrink-0" />
                  </div>
                  <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">
                    {it.sets} × {it.reps} · rest {it.rest_seconds}s
                    {filledCount > 0 && (
                      <span className="text-primary"> · {filledCount} logged</span>
                    )}
                  </div>
                </button>
                <button
                  onClick={() => toggleExpand(i, it.sets)}
                  aria-label={isOpen ? `Collapse ${it.name}` : `Log sets for ${it.name}`}
                  aria-expanded={isOpen}
                  className="size-8 rounded-lg bg-muted inline-flex items-center justify-center shrink-0 hover:bg-muted/70 transition"
                >
                  <ChevronDown
                    className={`size-4 transition-transform ${isOpen ? "rotate-180" : ""}`}
                  />
                </button>
              </div>
              {isOpen && (
                <div className="px-4 pb-4 space-y-2 bg-muted/20 animate-in fade-in slide-in-from-top-1 duration-150">
                  {rowsFor(i, it.sets).map((row, si) => (
                    <div key={si} className="flex items-center gap-2">
                      <span className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground w-10 shrink-0">
                        Set {si + 1}
                      </span>
                      <Input
                        inputMode="numeric"
                        placeholder={`reps (${it.reps})`}
                        value={row.reps}
                        onChange={(e) => updateSet(i, si, "reps", e.target.value)}
                        className="h-9 text-sm"
                      />
                      <Input
                        inputMode="decimal"
                        placeholder="kg"
                        value={row.weight}
                        onChange={(e) => updateSet(i, si, "weight", e.target.value)}
                        className="h-9 text-sm"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
      {!day.focus?.toLowerCase().includes("rest") && (
        <Button
          onClick={() => markDone(day)}
          disabled={logging}
          className="w-full mt-4 h-12 font-bold uppercase tracking-wider rounded-xl"
        >
          {logging ? (
            "Logging…"
          ) : (
            <>
              <CheckCircle2 className="size-4 mr-2" />
              {loggedSetCount > 0
                ? `Complete · ${loggedSetCount} sets logged`
                : "Mark workout complete"}
            </>
          )}
        </Button>
      )}
      {streak > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-3 inline-flex items-center justify-center gap-1.5 w-full">
          <Flame className="size-3.5 text-orange-500" /> {streak}-day streak
        </p>
      )}
      <Link
        to="/workout-history"
        className="mt-4 flex items-center justify-center gap-1.5 text-xs font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground transition"
      >
        <Trophy className="size-3.5" /> View history & personal records
      </Link>
      <ExerciseDetailSheet
        name={detailFor}
        open={detailFor !== null}
        onOpenChange={(open) => !open && setDetailFor(null)}
      />
    </MobileShell>
  );
}
