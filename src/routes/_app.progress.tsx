import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  LineChart,
  Line,
  ResponsiveContainer,
  XAxis,
  YAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
} from "recharts";
import { chartTooltipProps } from "@/lib/chart";
import { toast } from "sonner";
import { Flame } from "lucide-react";
import { PlanScreenSkeleton, LockedFeature, ProBadge } from "@/components/app-ui";
import { usePlan } from "@/hooks/use-plan";
import { localDateKey } from "@/lib/date";

export const Route = createFileRoute("/_app/progress")({
  head: () => ({ meta: [{ title: "Progress — FitPlanCoach" }] }),
  component: Progress,
});

type Entry = { id: string; weight_kg: number; recorded_at: string };

function Progress() {
  const { user } = useAuth();
  const { has } = usePlan();
  const [entries, setEntries] = useState<Entry[]>([]);
  const [weight, setWeight] = useState("");
  const [sessions, setSessions] = useState<Array<{ performed_on: string }>>([]);
  const [streak, setStreak] = useState<{ current: number; longest: number }>({
    current: 0,
    longest: 0,
  });
  const [loading, setLoading] = useState(true);

  async function load() {
    if (!user) return;
    const db: any = supabase;
    const [{ data }, { data: ss }, { data: prof }] = await Promise.all([
      db
        .from("progress_entries")
        .select("id,weight_kg,recorded_at")
        .eq("user_id", user.id)
        .order("recorded_at"),
      db
        .from("workout_sessions")
        .select("performed_on")
        .eq("user_id", user.id)
        .gte("performed_on", localDateKey(new Date(Date.now() - 56 * 86400000))),
      db.from("profiles").select("streak_current,streak_longest").eq("id", user.id).maybeSingle(),
    ]);
    setEntries((data ?? []) as Entry[]);
    setSessions((ss ?? []) as any);
    setStreak({ current: prof?.streak_current ?? 0, longest: prof?.streak_longest ?? 0 });
    setLoading(false);
  }
  useEffect(() => {
    load();
  }, [user]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!user || !weight) return;
    const w = Number(weight);
    if (!w || w < 20 || w > 500) {
      toast.error("Enter a realistic weight");
      return;
    }
    const { error } = await supabase
      .from("progress_entries")
      // recorded_at defaults to the DB server's CURRENT_DATE (UTC in
      // production) — pass the user's actual local day explicitly so a late
      // evening entry doesn't land on tomorrow's date.
      .insert({ user_id: user.id, weight_kg: w, recorded_at: localDateKey() });
    if (error) {
      console.error(error);
      toast.error("We couldn't save that entry. Please try again.");
      return;
    }
    await supabase.from("profiles").update({ weight_kg: w }).eq("id", user.id);
    setWeight("");
    toast.success("Logged");
    load();
  }

  if (loading)
    return (
      <MobileShell>
        <PlanScreenSkeleton rows={4} />
      </MobileShell>
    );

  const latest = entries[entries.length - 1]?.weight_kg;
  const first = entries[0]?.weight_kg;
  const delta = latest && first ? Number(latest) - Number(first) : 0;
  return (
    <MobileShell>
      <p className="label-overline mb-1">Track</p>
      <h1 className="text-3xl font-display uppercase italic mb-4">Progress</h1>
      {entries.length > 0 && (
        <div className="grid grid-cols-3 gap-3 mb-4">
          <div className="metric-card">
            <p className="label-overline">Current</p>
            <p className="text-lg font-display tabular-nums mt-0.5">
              {Number(latest).toFixed(1)}{" "}
              <span className="text-[10px] text-muted-foreground">kg</span>
            </p>
          </div>
          <div className="metric-card">
            <p className="label-overline">Total Δ</p>
            <p
              className={`text-lg font-display tabular-nums mt-0.5 ${delta < 0 ? "text-primary" : delta > 0 ? "text-warning" : ""}`}
            >
              {delta > 0 ? "+" : ""}
              {delta.toFixed(1)} <span className="text-[10px] text-muted-foreground">kg</span>
            </p>
          </div>
          <div className="metric-card">
            <p className="label-overline">Logs</p>
            <p className="text-lg font-display tabular-nums mt-0.5">{entries.length}</p>
          </div>
        </div>
      )}
      <form onSubmit={add} className="metric-card flex gap-2 items-end mb-5">
        <div className="flex-1">
          <label htmlFor="weight-input" className="label-overline">
            Log weight (kg)
          </label>
          <Input
            id="weight-input"
            inputMode="decimal"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            placeholder="e.g. 72.5"
          />
        </div>
        <Button type="submit">Log</Button>
      </form>

      <h2 className="label-overline mb-2">Weight trend</h2>
      <div className="surface-card p-4 h-64 mb-5">
        {entries.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center gap-1">
            <p className="text-sm font-medium">No entries yet</p>
            <p className="text-xs text-muted-foreground">
              Log your weight above to see your trend.
            </p>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart
              data={entries.map((e) => ({ date: e.recorded_at.slice(5), kg: Number(e.weight_kg) }))}
            >
              <XAxis dataKey="date" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} domain={["auto", "auto"]} />
              <Tooltip {...chartTooltipProps} />
              <Line
                type="monotone"
                dataKey="kg"
                stroke="var(--color-primary)"
                strokeWidth={2.5}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Streak + workout frequency */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        <div className="metric-card">
          <p className="label-overline inline-flex items-center gap-1">
            <Flame className="size-3 text-orange-500" /> Current streak
          </p>
          <p className="text-2xl font-display tabular-nums mt-0.5 text-orange-500">
            {streak.current}
            <span className="text-[10px] text-muted-foreground ml-1">days</span>
          </p>
        </div>
        <div className="metric-card">
          <p className="label-overline">Longest streak</p>
          <p className="text-2xl font-display tabular-nums mt-0.5">
            {streak.longest}
            <span className="text-[10px] text-muted-foreground ml-1">days</span>
          </p>
        </div>
      </div>

      <h2 className="label-overline mb-2 flex items-center gap-2">
        Workouts · last 8 weeks {!has("advanced_analytics") && <ProBadge />}
      </h2>
      <LockedFeature
        locked={!has("advanced_analytics")}
        title="Advanced analytics"
        description="See your weekly training volume and trends over time. Unlock with Pro."
        className="mb-4"
      >
        <div className="surface-card p-4 h-48">
          {sessions.length === 0 ? (
            <div className="h-full flex items-center justify-center text-sm text-muted-foreground">
              No workouts logged yet
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={(() => {
                  const weeks: Record<string, number> = {};
                  for (let i = 7; i >= 0; i--) {
                    const d = new Date(Date.now() - i * 7 * 86400000);
                    const k = `W${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`;
                    weeks[k] = 0;
                  }
                  for (const s of sessions) {
                    const d = new Date(s.performed_on);
                    const k = `W${Math.ceil(((d.getTime() - new Date(d.getFullYear(), 0, 1).getTime()) / 86400000 + 1) / 7)}`;
                    if (k in weeks) weeks[k]++;
                  }
                  return Object.entries(weeks).map(([week, count]) => ({ week, count }));
                })()}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" />
                <XAxis dataKey="week" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                <Tooltip {...chartTooltipProps} />
                <Bar dataKey="count" fill="var(--color-primary)" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </LockedFeature>

      <h2 className="label-overline mb-2">History</h2>
      {entries.length === 0 ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground">
          Your logged weights will appear here.
        </div>
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden">
          {[...entries]
            .reverse()
            .slice(0, 20)
            .map((e) => (
              <div
                key={e.id}
                className="p-4 flex justify-between text-sm hover:bg-muted/30 transition-colors"
              >
                <span className="text-muted-foreground">{e.recorded_at}</span>
                <span className="font-semibold tabular-nums">
                  {Number(e.weight_kg).toFixed(1)} kg
                </span>
              </div>
            ))}
        </div>
      )}
    </MobileShell>
  );
}
