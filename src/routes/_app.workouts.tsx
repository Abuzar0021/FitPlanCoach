import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { useServerFn } from "@tanstack/react-start";
import { logWorkoutSession } from "@/lib/engagement.functions";
import { toast } from "sonner";
import { CheckCircle2, Flame, Dumbbell } from "lucide-react";
import { EmptyState, PlanScreenSkeleton } from "@/components/app-ui";

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

function Workouts() {
  const { user } = useAuth();
  const [days, setDays] = useState<Day[] | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeDay, setActiveDay] = useState(0);
  const [logging, setLogging] = useState(false);
  const [streak, setStreak] = useState<number>(0);
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

  async function markDone(focus?: string, items?: number) {
    setLogging(true);
    try {
      const res = await logFn({
        data: { focus, duration_min: items ? Math.max(20, items * 7) : undefined },
      });
      setStreak(res.streak_current);
      toast.success(
        res.unlocked.length
          ? `🏆 ${res.unlocked.length} achievement${res.unlocked.length === 1 ? "" : "s"} unlocked!`
          : `Logged · streak ${res.streak_current} 🔥`,
      );
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
              onClick={() => setActiveDay(i)}
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
        {day.items.map((it, i) => (
          <div key={i} className="p-4 flex items-center gap-3">
            <div className="size-9 rounded-lg bg-primary/10 border border-primary/20 inline-flex items-center justify-center text-xs font-display text-primary tabular-nums">
              {i + 1}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-semibold truncate">{it.name}</div>
              <div className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">
                {it.sets} × {it.reps} · rest {it.rest_seconds}s
              </div>
            </div>
          </div>
        ))}
      </div>
      {!day.focus?.toLowerCase().includes("rest") && (
        <Button
          onClick={() => markDone(day.focus, day.items.length)}
          disabled={logging}
          className="w-full mt-4 h-12 font-bold uppercase tracking-wider rounded-xl"
        >
          {logging ? (
            "Logging…"
          ) : (
            <>
              <CheckCircle2 className="size-4 mr-2" /> Mark workout complete
            </>
          )}
        </Button>
      )}
      {streak > 0 && (
        <p className="text-center text-xs text-muted-foreground mt-3 inline-flex items-center justify-center gap-1.5 w-full">
          <Flame className="size-3.5 text-orange-500" /> {streak}-day streak
        </p>
      )}
    </MobileShell>
  );
}
