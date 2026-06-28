import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

/**
 * Premium empty state — every blank screen should teach what lives here and
 * offer one clear next action. Reused across the authenticated app.
 */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center text-center px-6 py-16">
      <div className="size-16 rounded-2xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-5">
        <Icon className="size-7 text-primary" />
      </div>
      <h2 className="font-display text-xl uppercase italic">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground max-w-xs leading-relaxed">{description}</p>
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}

/* ---- Skeleton loaders. Match each screen's real layout to avoid layout
   shift, so loading feels instant rather than blank. Render inside MobileShell. */

function HeaderSkeleton() {
  return (
    <div className="mb-5">
      <Skeleton className="h-3 w-20 mb-2" />
      <Skeleton className="h-8 w-40" />
    </div>
  );
}

export function DashboardSkeleton() {
  return (
    <div className="animate-in fade-in duration-300">
      <div className="flex items-center justify-between mb-6">
        <div>
          <Skeleton className="h-3 w-24 mb-2" />
          <Skeleton className="h-7 w-32" />
        </div>
        <div className="flex gap-2">
          <Skeleton className="size-10 rounded-xl" />
          <Skeleton className="size-10 rounded-xl" />
        </div>
      </div>
      <Skeleton className="h-48 w-full rounded-2xl mb-4" />
      <Skeleton className="h-7 w-28 rounded-full mb-5" />
      <Skeleton className="h-5 w-36 mb-3" />
      <Skeleton className="h-24 w-full rounded-2xl mb-5" />
      <Skeleton className="h-5 w-28 mb-3" />
      <div className="space-y-2.5">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}

/** Generic loader for plan-style screens (workouts, meals, progress). */
export function PlanScreenSkeleton({ rows = 5 }: { rows?: number }) {
  return (
    <div className="animate-in fade-in duration-300">
      <HeaderSkeleton />
      <Skeleton className="h-24 w-full rounded-2xl mb-5" />
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_, i) => (
          <Skeleton key={i} className="h-16 w-full rounded-2xl" />
        ))}
      </div>
    </div>
  );
}
