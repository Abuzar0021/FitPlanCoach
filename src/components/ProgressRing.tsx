type RingProps = {
  value: number;        // 0..1
  size?: number;        // px
  stroke?: number;      // px
  trackClassName?: string;
  progressClassName?: string;
  children?: React.ReactNode;
};

export function ProgressRing({
  value,
  size = 112,
  stroke = 8,
  trackClassName = "text-muted",
  progressClassName = "text-primary",
  children,
}: RingProps) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  const offset = c * (1 - v);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          fill="transparent"
          className={trackClassName}
        />
        <circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          stroke="currentColor"
          strokeWidth={stroke}
          strokeLinecap="round"
          fill="transparent"
          strokeDasharray={c}
          strokeDashoffset={offset}
          className={`${progressClassName} transition-[stroke-dashoffset] duration-700 ease-out`}
        />
      </svg>
      {children && (
        <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
          {children}
        </div>
      )}
    </div>
  );
}

export function StatBar({
  label,
  value,
  max,
  unit = "",
  className = "bg-primary",
}: {
  label: string;
  value: number;
  max: number;
  unit?: string;
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, max > 0 ? (value / max) * 100 : 0));
  return (
    <div>
      <div className="flex justify-between text-[10px] uppercase font-bold tracking-widest text-muted-foreground mb-1.5">
        <span>{label}</span>
        <span className="text-foreground tabular-nums">
          {Math.round(value)}{unit} <span className="text-muted-foreground">/ {Math.round(max)}{unit}</span>
        </span>
      </div>
      <div className="h-1.5 bg-muted rounded-full overflow-hidden">
        <div
          className={`h-full ${className} rounded-full transition-[width] duration-700 ease-out`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
