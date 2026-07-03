import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Website CMS design language — visually matches the rest of the site (same
 * card/typography primitives as the app's shared design system) but is its
 * own small component set, kept separate from src/components/admin-ui.tsx
 * (the mobile-app admin's UI kit) so the two surfaces don't share code.
 */

export function CmsHeader({
  title,
  subtitle,
  actions,
}: {
  title: ReactNode;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="label-overline">Website CMS</p>
        <h1 className="text-3xl font-display uppercase italic leading-none mt-0.5">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function CmsStatCard({
  icon: Icon,
  label,
  value,
  sub,
  accent,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
  accent?: string;
}) {
  return (
    <div className="surface-card card-lift p-4">
      <div className="flex items-center justify-between mb-2">
        <p className="label-overline">{label}</p>
        <Icon className={`size-4 ${accent ?? "text-muted-foreground"}`} />
      </div>
      <p className="text-2xl font-display tabular-nums">{value}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>}
    </div>
  );
}
