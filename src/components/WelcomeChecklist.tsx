import { Link } from "@tanstack/react-router";
import { Check, Circle, Sparkles } from "lucide-react";
import { useMemo, useState } from "react";

type Props = {
  hasProfile: boolean;
  hasPlan: boolean;
  loggedWeight: boolean;
  loggedWorkout: boolean;
  isPro: boolean;
};

type Step = { id: string; label: string; to: string; done: boolean };

export function WelcomeChecklist({
  hasProfile,
  hasPlan,
  loggedWeight,
  loggedWorkout,
  isPro,
}: Props) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return (
        typeof window !== "undefined" && localStorage.getItem("myfp:checklist_dismissed") === "1"
      );
    } catch {
      return false;
    }
  });

  const steps: Step[] = useMemo(
    () => [
      { id: "profile", label: "Complete your profile", to: "/onboarding", done: hasProfile },
      { id: "plan", label: "Generate your first plan", to: "/dashboard", done: hasPlan },
      { id: "weight", label: "Log your weight", to: "/progress", done: loggedWeight },
      { id: "workout", label: "Mark a workout complete", to: "/workouts", done: loggedWorkout },
      { id: "pro", label: "Unlock Pro for unlimited plans", to: "/subscription", done: isPro },
    ],
    [hasProfile, hasPlan, loggedWeight, loggedWorkout, isPro],
  );

  const done = steps.filter((s) => s.done).length;
  const total = steps.length;
  const pct = Math.round((done / total) * 100);

  if (dismissed || done === total) return null;

  return (
    <section className="surface-card p-4 mb-4 animate-fade-in">
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center shrink-0">
            <Sparkles className="size-4 text-primary" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate">Welcome to FitPlanCoach</p>
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
              {done}/{total} complete · {pct}%
            </p>
          </div>
        </div>
        <button
          onClick={() => {
            try {
              localStorage.setItem("myfp:checklist_dismissed", "1");
            } catch {
              /* localStorage unavailable (private mode/quota) — non-critical */
            }
            setDismissed(true);
          }}
          className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground hover:text-foreground shrink-0"
        >
          Hide
        </button>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden mb-3">
        <div className="h-full bg-primary transition-all" style={{ width: `${pct}%` }} />
      </div>
      <ul className="space-y-1.5">
        {steps.map((s) => (
          <li key={s.id}>
            <Link
              to={s.to as any}
              className={`flex items-center gap-2.5 p-2 rounded-xl text-sm transition ${s.done ? "text-muted-foreground line-through" : "hover:bg-muted/50"}`}
            >
              {s.done ? (
                <div className="size-5 rounded-full bg-primary inline-flex items-center justify-center shrink-0">
                  <Check className="size-3 text-primary-foreground" strokeWidth={3} />
                </div>
              ) : (
                <Circle className="size-5 text-muted-foreground shrink-0" />
              )}
              <span className="flex-1">{s.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}
