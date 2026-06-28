import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/**
 * Lightweight CSS phone frame for marketing mockups. Renders any app screen
 * (built from real design tokens) inside a premium device bezel — no binary
 * screenshot assets required.
 */
export function PhoneMockup({
  children,
  className,
  width = 248,
  glow = false,
}: {
  children: ReactNode;
  className?: string;
  width?: number;
  glow?: boolean;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width }}>
      {glow && (
        <div
          aria-hidden
          className="absolute -inset-6 -z-10 rounded-[3rem] bg-primary/20 blur-3xl"
        />
      )}
      <div className="relative rounded-[2.6rem] border border-border-strong bg-gradient-to-b from-[oklch(0.26_0.014_160)] to-[oklch(0.18_0.012_160)] p-[6px] shadow-[var(--shadow-card-lg)]">
        <div className="rounded-[2.3rem] border border-black/40 p-[3px] bg-black">
          <div
            className="relative overflow-hidden rounded-[2.05rem] bg-background"
            style={{ aspectRatio: "9 / 19.3" }}
          >
            {/* notch */}
            <div className="absolute left-1/2 top-[7px] z-20 h-[18px] w-[34%] -translate-x-1/2 rounded-full bg-black" />
            {/* screen sheen */}
            <div
              aria-hidden
              className="pointer-events-none absolute inset-0 z-10 bg-gradient-to-br from-white/[0.06] via-transparent to-transparent"
            />
            {children}
          </div>
        </div>
      </div>
      {/* side buttons */}
      <div className="absolute -left-[3px] top-24 h-12 w-[3px] rounded-l-full bg-border-strong" />
      <div className="absolute -left-[3px] top-40 h-8 w-[3px] rounded-l-full bg-border-strong" />
      <div className="absolute -right-[3px] top-28 h-16 w-[3px] rounded-r-full bg-border-strong" />
    </div>
  );
}
