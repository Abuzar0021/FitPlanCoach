import { Link } from "@tanstack/react-router";
import { GooglePlayButton } from "@/components/GooglePlayButton";

export function PublicFooter() {
  return (
    <footer className="border-t border-border bg-background">
      <div className="mx-auto max-w-6xl px-6 py-12 text-sm text-muted-foreground">
        <div className="grid gap-10 md:grid-cols-4">
          <div className="md:col-span-2">
            <div className="font-display uppercase italic text-lg text-foreground">FitPlanCoach</div>
            <p className="mt-2 text-xs leading-relaxed max-w-sm">
              Personalized fitness and nutrition guidance from{" "}
              <span className="text-foreground font-semibold">FitPlanCoach</span>. Premium is available
              through Google Play Billing inside the Android app. FitPlanCoach provides fitness and
              nutrition guidance and is not medical advice.
            </p>

            <div className="mt-3 text-xs">
              Support: <a href="mailto:abuzarelahi01@gmail.com" className="text-foreground hover:underline">abuzarelahi01@gmail.com</a>
            </div>

            <div className="mt-5">
              <GooglePlayButton size="md" />
            </div>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">Product</div>
            <nav className="flex flex-col gap-2">
              <Link to="/download" className="hover:text-foreground">Get the app</Link>
              <Link to="/features" className="hover:text-foreground">Features</Link>
              <Link to="/pricing" className="hover:text-foreground">Pricing</Link>
              <Link to="/faq" className="hover:text-foreground">FAQ</Link>
              <Link to="/auth" className="hover:text-foreground">Sign in</Link>
            </nav>
          </div>

          <div>
            <div className="text-xs font-bold uppercase tracking-widest text-foreground mb-3">Company & legal</div>
            <nav className="flex flex-col gap-2">
              <Link to="/about" className="hover:text-foreground">About</Link>
              <Link to="/contact" className="hover:text-foreground">Contact</Link>
              <Link to="/terms" className="hover:text-foreground">Terms of Service</Link>
              <Link to="/privacy" className="hover:text-foreground">Privacy Notice</Link>
              <Link to="/refunds" className="hover:text-foreground">Refund Policy</Link>
              <Link to="/delete-account" className="hover:text-foreground">Delete account</Link>
            </nav>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-border flex flex-col md:flex-row md:items-center md:justify-between gap-3 text-xs">
          <div>© {new Date().getFullYear()} FitPlanCoach. All rights reserved.</div>
          <div className="text-muted-foreground">Billed securely through Google Play · Cancel anytime</div>
        </div>
      </div>
    </footer>
  );
}
