import { X } from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { useState } from "react";

const KEY_PREFIX = "myfp:onb_tip:";

/**
 * A small, dismissible "here's how this works" card shown the first time a
 * user reaches a feature. Dismissal is permanent (per browser/device) and
 * keyed by `id`, so each tip only ever shows once — same localStorage
 * pattern as WelcomeChecklist's "Hide" button, just one tip at a time
 * instead of a combined checklist.
 */
export function FeatureTip({
  id,
  icon: Icon,
  title,
  body,
  className = "",
}: {
  id: string;
  icon: LucideIcon;
  title: string;
  body: string;
  className?: string;
}) {
  const [dismissed, setDismissed] = useState<boolean>(() => {
    try {
      return typeof window !== "undefined" && localStorage.getItem(KEY_PREFIX + id) === "1";
    } catch {
      return false;
    }
  });

  if (dismissed) return null;

  function dismiss() {
    try {
      localStorage.setItem(KEY_PREFIX + id, "1");
    } catch {
      /* localStorage unavailable (private mode/quota) — tip just won't stay dismissed */
    }
    setDismissed(true);
  }

  return (
    <div
      className={`surface-card p-3.5 mb-4 flex items-start gap-3 border-primary/20 bg-primary/5 animate-fade-in ${className}`}
    >
      <div className="size-8 rounded-xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center shrink-0">
        <Icon className="size-4 text-primary" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold">{title}</p>
        <p className="text-xs text-muted-foreground mt-0.5">{body}</p>
      </div>
      <button
        onClick={dismiss}
        aria-label="Dismiss tip"
        className="size-6 rounded-lg text-muted-foreground hover:bg-muted inline-flex items-center justify-center shrink-0"
      >
        <X className="size-3.5" />
      </button>
    </div>
  );
}
