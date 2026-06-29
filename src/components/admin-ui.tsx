import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

/**
 * Shared admin design language. Brings the admin area up to the same premium
 * visual identity as the rest of the product (display headers, surface cards,
 * motion-aware hover) and removes the per-screen re-implementations of these
 * patterns.
 */

export function AdminHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex items-end justify-between gap-4 mb-6">
      <div className="min-w-0">
        <p className="label-overline">Admin</p>
        <h1 className="text-3xl font-display uppercase italic leading-none mt-0.5">{title}</h1>
        {subtitle && <p className="text-sm text-muted-foreground mt-2 max-w-xl">{subtitle}</p>}
      </div>
      {actions && <div className="shrink-0">{actions}</div>}
    </div>
  );
}

export function StatCard({
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

/** Section label used to group cards on admin dashboards. */
export function AdminSectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="label-overline mb-2">{children}</h2>;
}
