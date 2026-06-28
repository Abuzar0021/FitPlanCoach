import { Link } from "@tanstack/react-router";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { Button } from "@/components/ui/button";

/**
 * Reusable end-of-page conversion band. Keeps the Google Play install as the
 * primary action across every marketing page with consistent, non-intrusive
 * styling. Headline/sub can be tailored per page for relevance.
 */
export function AppCtaBand({
  heading = "Train smarter, starting today",
  sub = "Download FitPlanCoach free on Android and build your first personalized plan in minutes.",
}: {
  heading?: string;
  sub?: string;
}) {
  return (
    <section className="border-t border-border bg-card/30">
      <div className="mx-auto max-w-4xl px-6 py-16 text-center reveal">
        <h2 className="text-3xl md:text-4xl font-display uppercase italic tracking-tight text-balance">
          {heading}
        </h2>
        <p className="mt-3 text-muted-foreground max-w-xl mx-auto">{sub}</p>
        <div className="mt-7 flex items-center justify-center gap-3 flex-wrap">
          <GooglePlayButton size="lg" />
          <Link to="/auth">
            <Button size="lg" variant="outline" className="font-bold uppercase tracking-wider px-7 h-14 border-border-strong">
              Start free on web
            </Button>
          </Link>
        </div>
        <p className="mt-4 text-[11px] font-bold uppercase tracking-widest text-muted-foreground">
          Free to start · No credit card · Cancel anytime
        </p>
      </div>
    </section>
  );
}
