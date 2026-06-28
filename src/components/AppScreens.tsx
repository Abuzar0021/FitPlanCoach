import type { ReactNode } from "react";
import { ProgressRing, StatBar } from "@/components/ProgressRing";
import { Flame, Check, Utensils, ChevronRight } from "lucide-react";

/**
 * Stylized previews of real app screens, built entirely from design tokens so
 * they stay on-brand without binary screenshot assets. Shared by the homepage
 * "Get the app" section and the /download page.
 */

function ScreenChrome({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="flex h-full flex-col">
      {/* status bar */}
      <div className="flex items-center justify-between px-4 pt-[7px] pb-1">
        <span className="text-[8px] font-bold tabular-nums text-foreground">9:41</span>
        <div className="flex items-center gap-[3px]">
          <span className="h-[6px] w-[6px] rounded-[1px] bg-foreground/70" />
          <span className="h-[6px] w-[9px] rounded-[1px] bg-foreground/45" />
          <span className="h-[7px] w-[12px] rounded-[2px] border border-foreground/45" />
        </div>
      </div>
      {/* app top bar */}
      <div className="px-4 pb-2 flex items-center justify-between">
        <span className="text-[11px] font-display uppercase italic tracking-wide">{title}</span>
        <span className="size-5 rounded-full bg-primary/15 border border-primary/30" />
      </div>
      <div className="flex-1 overflow-hidden px-3 pb-3">{children}</div>
    </div>
  );
}

export function DashboardScreen() {
  return (
    <ScreenChrome title="Today">
      <div className="surface-card p-3 flex flex-col items-center">
        <ProgressRing value={0.68} size={92} stroke={9}>
          <span className="text-lg font-display tabular-nums">1,420</span>
          <span className="text-[8px] uppercase tracking-widest text-muted-foreground">kcal left</span>
        </ProgressRing>
        <div className="mt-3 w-full space-y-2">
          <StatBar label="Protein" value={118} max={160} unit="g" />
          <StatBar label="Carbs" value={172} max={240} unit="g" className="bg-accent" />
          <StatBar label="Fat" value={48} max={70} unit="g" className="bg-warning" />
        </div>
      </div>
      <div className="mt-2.5 surface-card p-3 flex items-center gap-2.5">
        <div className="size-8 rounded-lg bg-orange-500/15 inline-flex items-center justify-center">
          <Flame className="size-4 text-orange-500" />
        </div>
        <div className="leading-tight">
          <div className="text-sm font-bold tabular-nums">12-day streak</div>
          <div className="text-[9px] text-muted-foreground">Longest yet — keep it going</div>
        </div>
      </div>
    </ScreenChrome>
  );
}

export function WorkoutScreen() {
  const sets = [
    { name: "Goblet squat", detail: "3 × 10" },
    { name: "Incline press", detail: "3 × 8" },
    { name: "Lat pulldown", detail: "3 × 12" },
    { name: "Plank", detail: "3 × 45s" },
  ];
  return (
    <ScreenChrome title="Workout">
      <div className="surface-card p-3">
        <div className="text-[9px] uppercase tracking-widest text-primary font-bold">Day 3 · Full body</div>
        <div className="mt-0.5 text-sm font-display uppercase italic">Push & pull</div>
        <div className="mt-3 space-y-2">
          {sets.map((s, i) => (
            <div key={s.name} className="flex items-center gap-2.5">
              <div className={`size-6 rounded-md inline-flex items-center justify-center text-[9px] font-bold ${i === 0 ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>
                {i === 0 ? <Check className="size-3.5" /> : i + 1}
              </div>
              <div className="flex-1 text-xs font-medium">{s.name}</div>
              <div className="text-[10px] text-muted-foreground tabular-nums">{s.detail}</div>
            </div>
          ))}
        </div>
      </div>
      <button className="mt-2.5 w-full h-9 rounded-xl bg-primary text-primary-foreground text-xs font-bold uppercase tracking-wide inline-flex items-center justify-center gap-1">
        Start session <ChevronRight className="size-3.5" />
      </button>
    </ScreenChrome>
  );
}

export function MealsScreen() {
  const meals = [
    { name: "Greek yogurt bowl", kcal: 380, tag: "Breakfast" },
    { name: "Chicken & rice", kcal: 540, tag: "Lunch" },
    { name: "Salmon, greens", kcal: 470, tag: "Dinner" },
  ];
  return (
    <ScreenChrome title="Meals">
      <div className="space-y-2">
        {meals.map((m) => (
          <div key={m.name} className="surface-card p-2.5 flex items-center gap-2.5">
            <div className="size-9 rounded-lg bg-accent/15 border border-accent/25 inline-flex items-center justify-center shrink-0">
              <Utensils className="size-4 text-accent" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-[9px] uppercase tracking-widest text-muted-foreground">{m.tag}</div>
              <div className="text-xs font-medium truncate">{m.name}</div>
            </div>
            <div className="text-[10px] font-bold tabular-nums shrink-0">{m.kcal} kcal</div>
          </div>
        ))}
      </div>
      <div className="mt-2.5 surface-card p-2.5 flex items-center justify-between">
        <span className="text-[10px] uppercase tracking-widest text-muted-foreground">Daily total</span>
        <span className="text-xs font-display tabular-nums">1,390 / 2,100 kcal</span>
      </div>
    </ScreenChrome>
  );
}
