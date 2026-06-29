import { Zap } from "lucide-react";

export function Logo({ size = "md" }: { size?: "sm" | "md" | "lg" }) {
  const text = size === "lg" ? "text-3xl" : size === "sm" ? "text-base" : "text-xl";
  const box = size === "lg" ? "size-11" : size === "sm" ? "size-8" : "size-9";
  const ic = size === "lg" ? "size-6" : size === "sm" ? "size-4" : "size-5";
  return (
    <div className="inline-flex items-center gap-2.5 font-bold tracking-tight">
      <span
        className={`inline-flex items-center justify-center rounded-2xl primary-gradient ${box} shadow-[var(--shadow-glow)]`}
      >
        <Zap className={`${ic} text-primary-foreground`} strokeWidth={2.8} fill="currentColor" />
      </span>
      <span className={`${text} font-display uppercase`}>FitPlanCoach</span>
    </div>
  );
}
