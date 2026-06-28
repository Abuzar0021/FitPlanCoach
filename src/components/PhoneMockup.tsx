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
}: {
  children: ReactNode;
  className?: string;
  width?: number;
}) {
  return (
    <div className={cn("relative shrink-0", className)} style={{ width }}>
      <div className="relative rounded-[2.4rem] border border-border-strong bg-card-elevated p-2 shadow-[var(--shadow-card-lg)]">
        <div
          className="relative overflow-hidden rounded-[2rem] bg-background"
          style={{ aspectRatio: "9 / 19" }}
        >
          <div className="absolute left-1/2 top-2 z-20 h-1.5 w-14 -translate-x-1/2 rounded-full bg-white/15" />
          {children}
        </div>
      </div>
      <div className="absolute -left-[3px] top-20 h-10 w-[3px] rounded-full bg-border-strong" />
      <div className="absolute -right-[3px] top-16 h-7 w-[3px] rounded-full bg-border-strong" />
      <div className="absolute -right-[3px] top-28 h-10 w-[3px] rounded-full bg-border-strong" />
    </div>
  );
}
