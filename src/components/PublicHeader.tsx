import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { GooglePlayButton } from "@/components/GooglePlayButton";

/**
 * Shared marketing-site header. Keeps the Logo, primary nav, and a persistent
 * "Get it on Google Play" CTA consistent across every public page.
 */
export function PublicHeader() {
  return (
    <header className="border-b border-border sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between gap-3">
        <Link to="/" aria-label="FitPlanCoach home">
          <Logo />
        </Link>
        <nav className="flex items-center gap-3 sm:gap-4 text-sm">
          <Link to="/features" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
            Features
          </Link>
          <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
            Pricing
          </Link>
          <Link to="/faq" className="text-muted-foreground hover:text-foreground transition hidden md:inline">
            FAQ
          </Link>
          <Link to="/auth" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
            Sign in
          </Link>
          <GooglePlayButton size="sm" />
        </nav>
      </div>
    </header>
  );
}
