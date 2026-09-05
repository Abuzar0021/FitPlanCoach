import { Link } from "@tanstack/react-router";
import { cn } from "@/lib/utils";
import { PLAY_STORE_URL, isPlayStoreLive } from "@/lib/app-config";
import { track } from "@/lib/analytics";

/** The recognizable Google Play triangle, drawn as four colored facets. */
function PlayGlyph({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} aria-hidden="true" focusable="false">
      <polygon points="4,3 4,12 11,12" fill="#00D95F" />
      <polygon points="4,12 4,21 11,12" fill="#00C3FF" />
      <polygon points="4,3 11,12 20,12" fill="#FFCD00" />
      <polygon points="4,21 11,12 20,12" fill="#FF3D47" />
    </svg>
  );
}

type Size = "sm" | "md" | "lg";

const DIMS: Record<
  Size,
  { h: string; px: string; gap: string; glyph: string; eyebrow: string; word: string }
> = {
  sm: {
    h: "h-10",
    px: "px-3",
    gap: "gap-2.5",
    glyph: "size-5",
    eyebrow: "text-[8px]",
    word: "text-sm",
  },
  md: {
    h: "h-12",
    px: "px-4",
    gap: "gap-3",
    glyph: "size-6",
    eyebrow: "text-[9px]",
    word: "text-base",
  },
  lg: {
    h: "h-14",
    px: "px-5",
    gap: "gap-3",
    glyph: "size-7",
    eyebrow: "text-[10px]",
    word: "text-lg",
  },
};

/**
 * "Get it on Google Play" badge.
 * - Live (the default, since the app is published — see app-config.ts): links
 *   to the Play Store listing.
 * - Not live: shows a "Coming soon" badge. Only reachable if VITE_PLAY_STORE_URL
 *   is explicitly overridden to an empty value. By default it links to /download
 *   so it is never a dead end; pass `staticBadge` (used on /download itself) to
 *   render a non-interactive badge instead.
 */
export function GooglePlayButton({
  size = "md",
  className,
  staticBadge = false,
}: {
  size?: Size;
  className?: string;
  staticBadge?: boolean;
}) {
  const d = DIMS[size];
  const live = isPlayStoreLive;

  const badge = (
    <span
      className={cn(
        "inline-flex items-center rounded-xl border bg-[#0b0b0c] text-white transition-colors",
        d.h,
        d.px,
        d.gap,
        live ? "border-white/15 hover:border-white/40 hover:bg-black" : "border-white/10",
      )}
    >
      <PlayGlyph className={d.glyph} />
      <span className="flex flex-col items-start leading-tight">
        <span className={cn("font-medium uppercase tracking-[0.14em] text-white/60", d.eyebrow)}>
          {live ? "Get it on" : "Coming soon to"}
        </span>
        <span className={cn("font-display font-semibold tracking-wide", d.word)}>Google Play</span>
      </span>
    </span>
  );

  const label = live
    ? "Download FitPlanCoach on Google Play"
    : "FitPlanCoach is coming soon to Google Play";

  if (live) {
    return (
      <a
        href={PLAY_STORE_URL}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={label}
        onClick={() => track("play_store_click", { live: true, size })}
        className={cn("inline-flex active:scale-[0.98] transition-transform", className)}
      >
        {badge}
      </a>
    );
  }

  if (staticBadge) {
    return (
      <span role="img" aria-label={label} className={cn("inline-flex cursor-default", className)}>
        {badge}
      </span>
    );
  }

  return (
    <Link
      to="/download"
      aria-label={label}
      onClick={() => track("play_store_click", { live: false, size })}
      className={cn("inline-flex active:scale-[0.98] transition-transform", className)}
    >
      {badge}
    </Link>
  );
}
