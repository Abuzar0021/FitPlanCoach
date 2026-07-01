import { useEffect, useState } from "react";
import type { LucideIcon } from "lucide-react";
import { Dumbbell, Apple, Droplets, HeartPulse, Moon, Sparkles, Brain, X } from "lucide-react";
import { pickDailyTip, markTipSeen, type Tip, type TipCategory, type TipContext } from "@/lib/tips";
import { cn } from "@/lib/utils";
import { localDateKey } from "@/lib/date";

const ICONS: Record<TipCategory, LucideIcon> = {
  workout: Dumbbell,
  nutrition: Apple,
  hydration: Droplets,
  recovery: HeartPulse,
  sleep: Moon,
  motivation: Sparkles,
  mindset: Brain,
};

const LABELS: Record<TipCategory, string> = {
  workout: "Training tip",
  nutrition: "Nutrition tip",
  hydration: "Hydration",
  recovery: "Recovery",
  sleep: "Sleep",
  motivation: "Motivation",
  mindset: "Mindset",
};

/**
 * One contextual, dismissible tip per day. Renders nothing if dismissed today
 * or if no tip matches — so it never nags. Mounting records the tip as seen so
 * it doesn't recur soon.
 */
export function DailyTip({ context, className }: { context?: TipContext; className?: string }) {
  const [tip, setTip] = useState<Tip | null>(null);
  const today = localDateKey();
  const dismissKey = `myfp:tip_dismissed:${today}`;

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      if (localStorage.getItem(dismissKey)) return;
    } catch {
      /* ignore */
    }
    const t = pickDailyTip(context);
    if (t) {
      setTip(t);
      markTipSeen(t.id);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!tip) return null;
  const Icon = ICONS[tip.category];

  function dismiss() {
    try {
      localStorage.setItem(dismissKey, "1");
    } catch {
      /* ignore */
    }
    setTip(null);
  }

  return (
    <div
      className={cn(
        "surface-card p-4 flex items-start gap-3 animate-in fade-in slide-in-from-top-2 duration-500",
        className,
      )}
    >
      <span className="size-9 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </span>
      <div className="flex-1 min-w-0">
        <p className="label-overline text-primary">{LABELS[tip.category]}</p>
        <p className="text-sm text-foreground mt-0.5 leading-relaxed">{tip.text}</p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="text-muted-foreground hover:text-foreground transition shrink-0 -mr-1 -mt-1 p-1 rounded-md"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
