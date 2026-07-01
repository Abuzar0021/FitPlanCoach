import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/use-auth";
import { MobileShell } from "@/components/MobileShell";
import { Input } from "@/components/ui/input";
import { ListSkeleton, EmptyState } from "@/components/app-ui";
import { ArrowLeft, Search, Trophy, Calendar } from "lucide-react";

export const Route = createFileRoute("/_app/workout-history")({
  head: () => ({ meta: [{ title: "Workout History — FitPlanCoach" }] }),
  component: WorkoutHistory,
});

type SetLog = {
  id: string;
  session_id: string;
  exercise_name: string;
  set_number: number;
  reps: number | null;
  weight_kg: number | null;
  created_at: string;
};

type Session = {
  id: string;
  performed_on: string;
  focus: string | null;
  duration_min: number | null;
  planned_sets: number | null;
};

function WorkoutHistory() {
  const { user } = useAuth();
  const [sessions, setSessions] = useState<Session[] | null>(null);
  const [sets, setSets] = useState<SetLog[]>([]);
  const [query, setQuery] = useState("");

  useEffect(() => {
    if (!user) return;
    const db: any = supabase;
    Promise.all([
      db
        .from("workout_sessions")
        .select("id,performed_on,focus,duration_min,planned_sets")
        .eq("user_id", user.id)
        .order("performed_on", { ascending: false })
        .limit(60),
      db
        .from("workout_set_logs")
        .select("id,session_id,exercise_name,set_number,reps,weight_kg,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(1000),
    ]).then(([s, sl]) => {
      setSessions((s.data ?? []) as Session[]);
      setSets((sl.data ?? []) as SetLog[]);
    });
  }, [user]);

  const setsBySession = useMemo(() => {
    const byExercise = new Map<string, SetLog[]>();
    for (const s of sets) {
      const list = byExercise.get(s.exercise_name) ?? [];
      list.push(s);
      byExercise.set(s.exercise_name, list);
    }
    return byExercise;
  }, [sets]);

  const loggedSetCountBySession = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sets) {
      counts.set(s.session_id, (counts.get(s.session_id) ?? 0) + 1);
    }
    return counts;
  }, [sets]);

  const personalRecords = useMemo(() => {
    const records: Array<{ exercise: string; weight: number; reps: number | null; date: string }> =
      [];
    for (const [exercise, logs] of setsBySession.entries()) {
      const withWeight = logs.filter((l) => l.weight_kg != null);
      if (withWeight.length === 0) continue;
      const best = withWeight.reduce((a, b) => ((b.weight_kg ?? 0) > (a.weight_kg ?? 0) ? b : a));
      records.push({
        exercise,
        weight: best.weight_kg ?? 0,
        reps: best.reps,
        date: best.created_at,
      });
    }
    return records
      .filter((r) => !query.trim() || r.exercise.toLowerCase().includes(query.trim().toLowerCase()))
      .sort((a, b) => b.weight - a.weight);
  }, [setsBySession, query]);

  const filteredSessions = useMemo(() => {
    if (!sessions) return [];
    if (!query.trim()) return sessions;
    const q = query.trim().toLowerCase();
    return sessions.filter((s) => (s.focus ?? "").toLowerCase().includes(q));
  }, [sessions, query]);

  return (
    <MobileShell>
      <div className="flex items-center gap-3 mb-4">
        <Link
          to="/workouts"
          aria-label="Back to workouts"
          className="size-9 rounded-xl bg-card border border-border inline-flex items-center justify-center"
        >
          <ArrowLeft className="size-4" />
        </Link>
        <div>
          <p className="label-overline">Train</p>
          <h1 className="text-2xl font-display uppercase italic">History & PRs</h1>
        </div>
      </div>

      <div className="relative mb-5">
        <Search className="size-4 text-muted-foreground absolute left-3 top-1/2 -translate-y-1/2" />
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by exercise or focus…"
          className="pl-9"
          aria-label="Search workout history"
        />
      </div>

      <h2 className="label-overline mb-2 flex items-center gap-1.5 text-primary">
        <Trophy className="size-3.5" /> Personal records
      </h2>
      {sessions === null ? (
        <ListSkeleton rows={3} />
      ) : personalRecords.length === 0 ? (
        <div className="surface-card p-6 text-center text-sm text-muted-foreground mb-6">
          No weights logged yet — log sets from a workout to start tracking PRs.
        </div>
      ) : (
        <div className="surface-card divide-y divide-border overflow-hidden mb-6">
          {personalRecords.map((r) => (
            <div key={r.exercise} className="p-3.5 flex items-center justify-between gap-3">
              <span className="text-sm font-medium truncate">{r.exercise}</span>
              <span className="text-sm font-display tabular-nums text-primary shrink-0">
                {r.weight}kg{r.reps ? ` × ${r.reps}` : ""}
              </span>
            </div>
          ))}
        </div>
      )}

      <h2 className="label-overline mb-2 flex items-center gap-1.5">
        <Calendar className="size-3.5" /> Session history
      </h2>
      {sessions === null ? (
        <ListSkeleton rows={4} />
      ) : filteredSessions.length === 0 ? (
        <EmptyState
          icon={Calendar}
          title="No sessions yet"
          description="Complete a workout from the Train tab and it'll show up here."
        />
      ) : (
        <div className="space-y-2.5">
          {filteredSessions.map((s) => {
            const logged = loggedSetCountBySession.get(s.id) ?? 0;
            // Only show a completion badge for sessions where sets were
            // actually logged — otherwise a plain "mark complete" tap would
            // show a discouraging 0% for users who skip detailed tracking.
            const pct =
              logged > 0 && s.planned_sets && s.planned_sets > 0
                ? Math.min(100, Math.round((logged / s.planned_sets) * 100))
                : null;
            return (
              <div key={s.id} className="surface-card p-4">
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold truncate">{s.focus ?? "Workout"}</p>
                    <p className="text-[10px] uppercase tracking-widest font-bold text-muted-foreground mt-0.5">
                      {new Date(s.performed_on).toLocaleDateString(undefined, {
                        weekday: "short",
                        month: "short",
                        day: "numeric",
                      })}
                      {s.duration_min ? ` · ~${s.duration_min} min` : ""}
                    </p>
                  </div>
                  {pct !== null && (
                    <span className="text-[10px] font-bold uppercase tracking-widest text-primary tabular-nums shrink-0">
                      {pct}%
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </MobileShell>
  );
}
