import { Link } from "@tanstack/react-router";
import { Logo } from "@/components/Logo";
import { GooglePlayButton } from "@/components/GooglePlayButton";
import { AnnouncementBar } from "@/components/AnnouncementBar";

/**
 * Shared marketing-site header. Keeps the Logo, primary nav, and a persistent
 * "Get it on Google Play" CTA consistent across every public page, and exposes
 * a keyboard/screen-reader skip link to the page's main content.
 */
export function PublicHeader() {
  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[60] focus:rounded-lg focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-bold focus:text-primary-foreground focus:shadow-lg"
      >
        Skip to content
      </a>
      <AnnouncementBar />
      <header className="border-b border-border sticky top-0 z-30 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-5 py-3.5 flex items-center justify-between gap-3">
          <Link to="/" aria-label="FitPlanCoach home">
            <Logo />
          </Link>
          <nav aria-label="Primary" className="flex items-center gap-3 sm:gap-4 text-sm">
            <Link to="/features" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Features
            </Link>
            <Link to="/pricing" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Pricing
            </Link>
            <Link to="/faq" className="text-muted-foreground hover:text-foreground transition hidden md:inline">
              FAQ
            </Link>
            <Link to="/blog" className="text-muted-foreground hover:text-foreground transition hidden md:inline">
              Blog
            </Link>
            <Link to="/auth" className="text-muted-foreground hover:text-foreground transition hidden sm:inline">
              Sign in
            </Link>
            <GooglePlayButton size="sm" />
          </nav>
        </div>
      </header>
    </>
  );
}
