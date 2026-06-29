import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Link } from "@tanstack/react-router";
import { Crown, Lock } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Button } from "@/components/ui/button";

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

/** Loading placeholder for list/inbox screens (notifications, support tickets). */
export function ListSkeleton({ rows = 4 }: { rows?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-20 w-full rounded-2xl" />
      ))}
    </div>
  );
}

/* ---- Membership gating. A single visual language for "this lives behind Pro",
   driven entirely by `hasFeature` in src/lib/access.ts. Use these instead of
   ad-hoc plan checks so every locked surface looks and behaves the same. */

/** Small gradient "PRO" pill, e.g. next to a section heading a free user can't use. */
export function ProBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-primary to-accent text-primary-foreground text-[9px] font-bold uppercase tracking-widest align-middle ${className}`}
    >
      <Crown className="size-2.5" /> Pro
    </span>
  );
}

/** Full-width upgrade card. Use where a whole screen/section is Pro-only. */
export function UpgradeCallout({
  title = "Unlock with Pro",
  description,
  cta = "Go Pro",
  className = "",
}: {
  title?: string;
  description: string;
  cta?: string;
  className?: string;
}) {
  return (
    <div className={`surface-card p-5 text-center relative overflow-hidden ${className}`}>
      <div className="absolute -top-10 -right-10 size-32 rounded-full bg-primary/10 blur-3xl pointer-events-none" />
      <div className="relative">
        <div className="size-12 mx-auto mb-3 rounded-2xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center">
          <Crown className="size-5 text-primary" />
        </div>
        <h3 className="font-display text-lg uppercase italic">{title}</h3>
        <p className="text-sm text-muted-foreground mt-1 mb-4 max-w-xs mx-auto leading-relaxed">
          {description}
        </p>
        <Link to="/subscription">
          <Button className="font-bold uppercase tracking-wider h-11 px-6">{cta}</Button>
        </Link>
      </div>
    </div>
  );
}

/**
 * Wraps a real feature. When `locked`, renders a blurred, non-interactive
 * teaser of the content behind a glass overlay with an unlock CTA. When
 * unlocked, renders the content untouched. `className` always applies to the
 * outer wrapper so spacing stays identical in both states.
 */
export function LockedFeature({
  locked,
  title,
  description,
  className = "",
  children,
}: {
  locked: boolean;
  title: string;
  description: string;
  className?: string;
  children: ReactNode;
}) {
  if (!locked) return <div className={className}>{children}</div>;
  return (
    <div className={`relative rounded-2xl overflow-hidden ${className}`}>
      <div className="pointer-events-none select-none blur-[3px] opacity-40" aria-hidden>
        {children}
      </div>
      <div className="absolute inset-0 flex flex-col items-center justify-center text-center px-6 bg-background/40 backdrop-blur-[2px]">
        <div className="size-11 rounded-2xl bg-primary/10 border border-primary/20 inline-flex items-center justify-center mb-2">
          <Lock className="size-4 text-primary" />
        </div>
        <p className="font-display uppercase italic text-base">{title}</p>
        <p className="text-xs text-muted-foreground mt-1 mb-3 max-w-[16rem] leading-relaxed">
          {description}
        </p>
        <Link to="/subscription">
          <Button size="sm" className="font-bold uppercase tracking-wider h-9 px-4">
            <Crown className="size-3.5 mr-1.5" /> Unlock with Pro
          </Button>
        </Link>
      </div>
    </div>
  );
}
